// Visitor totals, stored in Upstash Redis.
//
// NO COOKIES and no stored identity. Nothing is written to the visitor's device,
// which is what lets the site carry a "100% cookie free" badge honestly.
//
// What is stored:
//
//   visitor:total   a counter, incremented once per new visitor
//   visitor:<hash>  one key per visitor, salted SHA-256 of their IP, 400-day TTL
//
// A visitor is a unique address: the same person opening the site again is not
// counted again, because `SET visitor:<hash> ... NX` only succeeds the first
// time. The raw IP is never stored and the salt lives in IP_HASH_SALT, so the
// hashes cannot be reversed or matched against a list of known addresses.
//
// The whole read-modify-write runs as one Lua script, so it is atomic: two
// visitors arriving at the same instant cannot overwrite each other's increment.
//
// Access is server-side only, over Upstash's REST API. The URL and token come
// from the environment (KV_REST_API_URL / KV_REST_API_TOKEN), never from a
// request. Visitor input reaches the store only as a fixed-length hash passed as
// an EVAL argument, never spliced into a command, so nothing can be injected.

const crypto = require('crypto');

const TOTAL_KEY = 'visitor:total';
const VISITOR_PREFIX = 'visitor:';
// A visitor key survives long enough to still be "the same visitor" years later;
// expired keys are what keep the store from growing without bound.
const VISITOR_TTL_SECONDS = 400 * 24 * 60 * 60;
const REQUEST_TIMEOUT_MS = 5000;
const FALLBACK_SALT = 'amnskh-visitor-hash';

// Counts the visitor if this is the first time their key has been seen, and
// returns the total regardless. Redis stores Lua numbers as floats, so the
// result is stringified before it leaves the script.
const COUNT_SCRIPT = `
local first = redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1])
if first then
  return tostring(redis.call('INCR', KEYS[2]))
end
local total = redis.call('GET', KEYS[2])
return total or '0'
`;

// The REST endpoint and read-write token. Upstash sets these on the project;
// Vercel's KV integration uses the KV_* names.
function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function hasStore() {
  return config() !== null;
}

// Runs one command from a fixed allowlist. The command name is chosen here in
// code, never from a request, so a visitor cannot inject anything.
async function command(args) {
  const settings = config();
  if (!settings) throw new Error('Redis is not configured');
  const response = await fetch(settings.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`Redis request failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
  const payload = await response.json();
  if (payload.error) throw new Error(`Redis error: ${payload.error}`);
  return payload.result;
}

// The salted hash of an IP address. A plain SHA-256 of an IP is not private (the
// whole IPv4 space is small enough to enumerate), so the salt is what makes the
// digest useless on its own. Hex output cannot contain ':' so it never collides
// with the "visitor:" prefix.
function visitorKey(ip, salt = process.env.IP_HASH_SALT || FALLBACK_SALT) {
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

// The client address as Vercel reports it: the first hop in x-forwarded-for.
function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Records a visit and returns the running total.
async function recordVisit(ip) {
  const key = `${VISITOR_PREFIX}${visitorKey(ip)}`;
  const total = await command(['EVAL', COUNT_SCRIPT, '2', key, TOTAL_KEY, String(VISITOR_TTL_SECONDS)]);
  return Number(total) || 0;
}

// The current total without counting anything.
async function currentTotal() {
  return Number(await command(['GET', TOTAL_KEY])) || 0;
}

module.exports = { hasStore, clientIp, recordVisit, currentTotal };
