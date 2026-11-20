// Visitor counter. Serves a small SVG pill that the footer loads as an image.
//
// NO COOKIES. Nothing is written to the visitor's device, which is what lets the
// site carry a "100% cookie free" badge honestly.
//
// How a visit is counted:
//   1. Read the client IP from the request headers.
//   2. Hash it with a secret salt (SHA-256). The raw IP is never stored.
//   3. Look the hash up in a store keyed by today's date.
//   4. New hash -> increment the total; seen hash -> leave it alone.
//   5. Hashes expire after the day rolls over, so the same person is counted
//      once per day and yesterday's data is gone.
//
// Storage: a single JSON document held in Vercel Blob, read and written with its
// ETag as a concurrency check. If no Blob token is configured the counter keeps
// working in memory, which is correct on a single long-lived process but resets
// when a serverless instance is recycled.
//
// Env:
//   IP_HASH_SALT        secret used to hash IPs (any long random string)
//   BLOB_READ_WRITE_TOKEN  Vercel Blob token (created by linking a Blob store)

const crypto = require('crypto');

const DEFAULT_SITE = 'amnshk';
const TOTAL_PATH = 'TOTAL';
const CACHE_SECONDS = 120;
const UPSTREAM_TIMEOUT_MS = 2500;

const STATE_KEY = 'visits/state.json';
const PRESENCE_PREFIX = 'visited';
const PRESENCE_TTL_SECONDS = 60 * 60 * 30; // a day plus slack

// ---------------------------------------------------------------------------
// Pill drawing. Unchanged look; only the number comes from another source.
// ---------------------------------------------------------------------------

const PILL_HEIGHT = 22;
const PILL_PAD_X = 9;
const PILL_GAP = 8;
const PILL_DIVIDER = 1;
const LABEL = 'VISITORS';
const LABEL_SIZE = 10;
const NUMBER_SIZE = 13;
const LABEL_CHAR_WIDTH = LABEL_SIZE * 0.62;
const NUMBER_CHAR_WIDTH = NUMBER_SIZE * 0.6;
const BLUE = '#1d3fbf';
const BLUE_DARK = '#16329c';

function digits(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

function counterSvg(count) {
  const number = digits(count);
  const labelWidth = LABEL.length * LABEL_CHAR_WIDTH;
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
  <text x="${PILL_PAD_X}" y="${midY + 3.5}" font-family="'Courier New', Courier, monospace" font-size="${LABEL_SIZE}" font-weight="bold" letter-spacing="1.1" fill="#ffffff">${LABEL}</text>
  <text x="${Math.round(labelBlock + PILL_DIVIDER + PILL_GAP)}" y="${midY + 4.5}" font-family="'Courier New', Courier, monospace" font-size="${NUMBER_SIZE}" font-weight="bold" letter-spacing=".5" fill="#111">${number}</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// IP hashing
// ---------------------------------------------------------------------------

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// A salted SHA-256 of the IP. The salt makes the digest useless to anyone who
// gets hold of it: they cannot reverse it or compare against a list of known IPs.
function hashIp(ip, env = process.env) {
  const salt = env.IP_HASH_SALT || 'amnshk-default-salt-change-me';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Storage backends
// ---------------------------------------------------------------------------

const memory = { day: todayKey(), seen: new Set(), total: 0 };

function blobConfig(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN;
  return token ? { token } : null;
}

async function blobRead(config) {
  const response = await fetch(`https://blob.vercel-storage.com/${STATE_KEY}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  if (response.status === 404) return { state: { day: todayKey(), total: 0, seen: [] }, etag: null };
  if (!response.ok) throw new Error(`Blob read ${response.status}`);
  const etag = response.headers.get('etag');
  const state = await response.json();
  return { state, etag };
}

async function blobWrite(config, state, etag) {
  const response = await fetch(`https://blob.vercel-storage.com/${STATE_KEY}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'x-add-random-suffix': '0',
      ...(etag ? { 'If-Match': etag } : {})
    },
    body: JSON.stringify(state),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Blob write ${response.status}`);
}

// Counts a visit and returns the new total. Every backend follows the same shape:
// check the daily presence set, increment only when the hash is new.
async function countVisit(ip, env = process.env) {
  const hash = hashIp(ip, env);
  const day = todayKey();

  const config = blobConfig(env);
  if (config) {
    try {
      const { state, etag } = await blobRead(config);
      // A new day starts a fresh presence set; yesterday's hashes are dropped.
      const fresh = state.day === day ? state : { day, total: state.total, seen: [] };
      if (fresh.seen.includes(hash)) return Number(state.total) || 0;
      fresh.seen.push(hash);
      fresh.total = (Number(fresh.total) || 0) + 1;
      await blobWrite(config, fresh, etag);
      return fresh.total;
    } catch (error) {
      console.error('visitor counter: blob unavailable, using memory', error.message);
    }
  }

  if (memory.day !== day) {
    memory.day = day;
    memory.seen.clear();
  }
  if (memory.seen.has(hash)) return memory.total;
  memory.seen.add(hash);
  memory.total += 1;
  return memory.total;
}

// Current total without counting anyone.
async function currentTotal(env = process.env) {
  const config = blobConfig(env);
  if (config) {
    try {
      const { state } = await blobRead(config);
      return Number(state.total) || 0;
    } catch (error) {
      console.error('visitor counter: blob read failed', error.message);
    }
  }
  return memory.total;
}

// ---------------------------------------------------------------------------
// Legacy GoatCounter read, kept only so the page can show a historical figure.
// ---------------------------------------------------------------------------

function siteCode(env = process.env) {
  return String(env.GOATCOUNTER_SITE || DEFAULT_SITE).trim().replace(/\.goatcounter\.com\/?$/i, '');
}

function parseCount(payload) {
  if (payload === null || payload === undefined) return null;
  const raw = typeof payload === 'object' ? (payload.count_unique ?? payload.count) : payload;
  if (raw === null || raw === undefined) return null;
  const digitsOnly = String(raw).replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : null;
}

async function fetchGoatCounter(env = process.env) {
  const site = siteCode(env);
  const url = `https://${encodeURIComponent(site)}.goatcounter.com/counter/${encodeURIComponent(TOTAL_PATH)}.json`;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`GoatCounter responded ${response.status}`);
  return parseCount(await response.json());
}

// ---------------------------------------------------------------------------

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // Never identify the visitor: this is the whole point of the hashed-IP design.
  res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`);
  res.setHeader('X-Counter-Source', blobConfig() ? 'blob:ip-hash' : 'memory:ip-hash');
  let total = 0;
  try {
    total = await countVisit(clientIp(req));
  } catch (error) {
    console.error('visitor counter failed', error.message);
    total = await currentTotal();
  }
  res.send(counterSvg(total));
}

module.exports = handler;
module.exports.counterSvg = counterSvg;
module.exports.hashIp = hashIp;
module.exports.countVisit = countVisit;
module.exports.fetchGoatCounter = fetchGoatCounter;
module.exports.parseCount = parseCount;
module.exports.siteCode = siteCode;
module.exports._memory = memory;
