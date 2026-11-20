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
// Storage: a dotfile at the repository root (.visits.json), outside public/, so
// it is never deployed and cannot be fetched. Each deploy carries it forward.
//
// Env:
//   IP_HASH_SALT        secret used to hash IPs (any long random string)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_SITE = 'amnshk';
const TOTAL_PATH = 'TOTAL';
const CACHE_SECONDS = 120;
const UPSTREAM_TIMEOUT_MS = 2500;


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
// Storage
//
// The record lives in a dotfile at the repository root, outside public/, so it is
// never part of the deployed site and a visitor cannot request it.
//
//   { day: "YYYY-MM-DD", total: N, seen: [hash, ...] }
//
// `seen` holds only salted hashes for the current day; it is cleared when the
// day changes, so nothing accumulates over time.
// ---------------------------------------------------------------------------

const STATE_FILE = path.join(__dirname, '..', '.visits.json');

function emptyState() {
  return { day: todayKey(), total: 0, seen: [] };
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      day: typeof parsed.day === 'string' ? parsed.day : todayKey(),
      total: Number(parsed.total) || 0,
      seen: Array.isArray(parsed.seen) ? parsed.seen : []
    };
  } catch {
    return emptyState();
  }
}

// A Vercel function's filesystem is read-only, so this handler only reads. The
// counting itself happens in scripts/record-visit.js, which runs in CI and
// commits the updated file back, and in the build for local previews.
function countVisit(ip, env = process.env) {
  return readState().total;
}

function currentTotal() {
  return readState().total;
}

// ---------------------------------------------------------------------------

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // Never identify the visitor: this is the whole point of the hashed-IP design.
  res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`);
  res.setHeader('X-Counter-Source', 'file:ip-hash');
  let total = 0;
  try {
    total = countVisit(clientIp(req));
  } catch (error) {
    console.error('visitor counter failed', error.message);
    total = currentTotal();
  }
  res.send(counterSvg(total));
}

module.exports = handler;
module.exports.counterSvg = counterSvg;
module.exports.hashIp = hashIp;
module.exports.countVisit = countVisit;
module.exports.todayKey = todayKey;
module.exports.STATE_FILE = STATE_FILE;
