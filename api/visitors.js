// Unique-visitor counter. Serves an SVG readout ("YOU ARE VISITOR NUMBER 000142")
// that the footer loads as an image.
//
// A visitor is counted once per IP when the browser carries no visitor cookie, so
// reloads, navigation between pages and multiple tabs do not inflate the number.
// The in-memory store resets when the serverless function cold-starts; for a
// persistent total set Upstash Redis env vars (KV_REST_API_URL + KV_REST_API_TOKEN
// or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) and it is used instead.

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

// Courier glyph widths per font-size, so the SVG is exactly as wide as its digits.
const NUMBER_CHAR_WIDTH = 15.6;
const NUMBER_SIZE = 13;
const LABEL_START = 10;

// Plain SVG in the site's own typewriter palette, so it needs no webfont and
// cannot be styled by the page it is embedded in.
function counterSvg(count) {
  const number = digits(count);
  const numberWidth = number.length * NUMBER_CHAR_WIDTH;
  const width = Math.ceil(LABEL_START + numberWidth + LABEL_START);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" viewBox="0 0 ${width} 22" role="img" aria-label="Visitor number ${number}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="21" fill="#f4f1e8" stroke="#111"/>
  <text x="${LABEL_START}" y="15.5" font-family="'Courier New', Courier, monospace" font-size="${NUMBER_SIZE}" font-weight="bold" letter-spacing="1" fill="#111">${number}</text>
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
