// Unique-visitor counter. Serves an SVG readout ("YOU ARE VISITOR NUMBER 000142")
// that the footer loads as an image.
//
// A visitor is counted once per IP when the browser carries no visitor cookie, so
// reloads, navigation between pages and multiple tabs do not inflate the number.
//
// STORAGE: serverless instances are recycled at any time and requests are spread
// across several of them, so an in-process Map cannot keep a total — every cold
// start would answer "1" again. A shared store is therefore required in production.
// Set either pair of env vars and Redis is used automatically:
//   KV_REST_API_URL + KV_REST_API_TOKEN            (Vercel KV)
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (Upstash directly)
// Without them the counter falls back to memory, which only behaves on a single
// long-lived process (`npm run serve`), and stamps X-Counter-Store: memory so the
// misconfiguration is visible instead of looking like a frozen count.

const COUNT_KEY = 'unique-visitors';
const SEEN_PREFIX = 'unique-visitor:';
const SEEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const COOKIE_NAME = 'visitor';

const memory = new Map();

function memoryIncrement(ip) {
  const now = Date.now();
  const last = memory.get(SEEN_PREFIX + ip);
  if (last !== undefined && now - last < SEEN_TTL_SECONDS * 1000) {
    return memory.get(COUNT_KEY) || 0;
  }
  const count = (memory.get(COUNT_KEY) || 0) + 1;
  memory.set(COUNT_KEY, count);
  memory.set(SEEN_PREFIX + ip, now);
  if (memory.size > 50000) {
    for (const [key, seenAt] of memory) {
      if (key.startsWith(SEEN_PREFIX) && now - seenAt >= SEEN_TTL_SECONDS * 1000) memory.delete(key);
    }
  }
  return count;
}

function redisConfig(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redisCommand(config, command) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Redis responded ${response.status}`);
  const payload = await response.json();
  return payload.result;
}

async function redisIncrement(config, ip) {
  const seen = await redisCommand(config, ['SET', SEEN_PREFIX + ip, '1', 'NX', 'EX', String(SEEN_TTL_SECONDS)]);
  if (seen === 'OK') return Number(await redisCommand(config, ['INCR', COUNT_KEY])) || 1;
  return Number(await redisCommand(config, ['GET', COUNT_KEY])) || 0;
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim() || req.socket?.remoteAddress || 'unknown';
}

function hasVisitorCookie(req) {
  return new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=1(?:;|$)`).test(String(req.headers.cookie || ''));
}

function digits(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

// Pill geometry. Width is computed from glyph counts so the capsule always hugs
// its content instead of guessing a fixed size.
const PILL_HEIGHT = 22;
const PILL_PAD_X = 9;
const PILL_GAP = 8;
const PILL_DIVIDER = 1;
const LABEL_SIZE = 10;
const NUMBER_SIZE = 13;
const LABEL_CHAR_WIDTH = LABEL_SIZE * 0.62; // Courier advance width, uppercase
const NUMBER_CHAR_WIDTH = NUMBER_SIZE * 0.6;
const BLUE = '#1d3fbf';
const BLUE_DARK = '#16329c';

// White label on a blue capsule, then the number on cream: one self-contained
// image the footer can drop in regardless of page styles.
function counterSvg(count) {
  const label = 'VISITORS';
  const number = digits(count);
  const labelWidth = label.length * LABEL_CHAR_WIDTH;
  const numberWidth = number.length * NUMBER_CHAR_WIDTH;
  const labelBlock = PILL_PAD_X + labelWidth + PILL_GAP;
  const width = Math.ceil(labelBlock + PILL_DIVIDER + PILL_GAP + numberWidth + PILL_PAD_X);
  const midY = PILL_HEIGHT / 2;
  const radius = midY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${PILL_HEIGHT}" viewBox="0 0 ${width} ${PILL_HEIGHT}" role="img" aria-label="Visitors: ${number}">
  <defs>
    <clipPath id="pill"><rect x="0" y="0" width="${width}" height="${PILL_HEIGHT}" rx="${radius}" ry="${radius}"/></clipPath>
  </defs>
  <g clip-path="url(#pill)">
    <rect x="0" y="0" width="${width}" height="${PILL_HEIGHT}" fill="#f4f1e8"/>
    <rect x="0" y="0" width="${Math.round(labelBlock + PILL_DIVIDER)}" height="${PILL_HEIGHT}" fill="${BLUE}"/>
    <rect x="${Math.round(labelBlock)}" y="0" width="${PILL_DIVIDER}" height="${PILL_HEIGHT}" fill="${BLUE_DARK}"/>
  </g>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${PILL_HEIGHT - 1}" rx="${radius - 0.5}" ry="${radius - 0.5}" fill="none" stroke="${BLUE}"/>
  <text x="${PILL_PAD_X}" y="${midY + 3.5}" font-family="'Courier New', Courier, monospace" font-size="${LABEL_SIZE}" font-weight="bold" letter-spacing="1.1" fill="#ffffff">${label}</text>
  <text x="${Math.round(labelBlock + PILL_DIVIDER + PILL_GAP)}" y="${midY + 4.5}" font-family="'Courier New', Courier, monospace" font-size="${NUMBER_SIZE}" font-weight="bold" letter-spacing=".5" fill="#111">${number}</text>
</svg>`;
}

async function countVisitor(req, env = process.env) {
  if (hasVisitorCookie(req)) return null;
  const ip = clientIp(req);
  const config = redisConfig(env);
  if (config) {
    try {
      return await redisIncrement(config, ip);
    } catch (error) {
      console.error('visitor counter: redis unavailable, falling back to memory', error.message);
    }
  }
  return memoryIncrement(ip);
}

async function currentCount(req, env = process.env) {
  const config = redisConfig(env);
  if (config) {
    try {
      return Number(await redisCommand(config, ['GET', COUNT_KEY])) || 0;
    } catch (error) {
      console.error('visitor counter: redis unavailable, reading memory', error.message);
    }
  }
  return memory.get(COUNT_KEY) || 0;
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  const persistent = Boolean(redisConfig(process.env));
  res.setHeader('X-Counter-Store', persistent ? 'redis' : 'memory');
  let count = 0;
  try {
    // A repeat visit still gets the number back, it just is not counted again.
    count = (await countVisitor(req)) ?? (await currentCount(req));
  } catch (error) {
    console.error('visitor counter failed', error);
  }
  if (!hasVisitorCookie(req)) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=1; Max-Age=31536000; Path=/; SameSite=Lax; HttpOnly`);
  }
  res.send(counterSvg(count));
}

module.exports = handler;
module.exports.counterSvg = counterSvg;
module.exports.countVisitor = countVisitor;
module.exports.memoryIncrement = memoryIncrement;
module.exports.memory = memory;
module.exports.COUNT_KEY = COUNT_KEY;
module.exports.SEEN_PREFIX = SEEN_PREFIX;
