// Visitor counter. Serves a small SVG pill that the footer loads as an image.
//
// COUNTING is delegated to GoatCounter (https://www.goatcounter.com), which
// identifies unique visits without cookies and without storing personal data:
// it hashes IP + User-Agent + a daily salt, which cannot be reversed and changes
// every 24h. Nothing is set on the visitor's device, so this site stays cookie
// free and needs no consent banner.
//
// This function only reads the number and renders it; it writes no state of its
// own. That is deliberate — serverless instances are recycled constantly, so any
// in-process total would reset on cold start.
//
// SETUP (one time):
//   1. Create a free GoatCounter account: https://www.goatcounter.com/signup
//      The subdomain you pick is GC_SITE below.
//   2. In GoatCounter settings enable "Allow adding visitor counts on your website"
//      (off by default; the counter 404s without it).
//   3. Point the site at it with either:
//        - env var GOATCOUNTER_SITE=yourcode  (no .goatcounter.com suffix), or
//        - GC_SITE below directly.
//   4. For views to be recorded at all, the site must send pageviews: add the
//      GoatCounter script tag (see renderFooter in build.js).
//
// Without a configured site the endpoint still answers with a valid SVG showing
// zeros, so the footer never shows a broken image.

const DEFAULT_SITE = 'amnshk';
const TOTAL_PATH = 'TOTAL'; // GoatCounter's site-wide total, case-sensitive, no slash
const CACHE_SECONDS = 300;

const PILL_HEIGHT = 22;
const PILL_PAD_X = 9;
const PILL_GAP = 8;
const PILL_DIVIDER = 1;
const LABEL = 'VISITORS';
const LABEL_SIZE = 10;
const NUMBER_SIZE = 13;
const LABEL_CHAR_WIDTH = LABEL_SIZE * 0.62; // Courier advance width, uppercase
const NUMBER_CHAR_WIDTH = NUMBER_SIZE * 0.6;
const BLUE = '#1d3fbf';
const BLUE_DARK = '#16329c';

function siteCode(env = process.env) {
  return String(env.GOATCOUNTER_SITE || DEFAULT_SITE).trim().replace(/\.goatcounter\.com\/?$/i, '');
}

// GoatCounter reports a formatted string ("1,234"), so strip separators and any
// non-digit before using it as a number.
function parseCount(payload) {
  if (payload === null || payload === undefined) return null;
  const raw = typeof payload === 'object' ? payload.count : payload;
  if (raw === null || raw === undefined) return null;
  const digitsOnly = String(raw).replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : null;
}

async function fetchCount(env = process.env) {
  const site = siteCode(env);
  const url = `https://${encodeURIComponent(site)}.goatcounter.com/counter/${encodeURIComponent(TOTAL_PATH)}.json`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  // A 404 means the site has no hits yet, or counts are not enabled in settings:
  // both are legitimately "zero", not an error worth failing the image over.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GoatCounter responded ${response.status}`);
  return parseCount(await response.json());
}

function digits(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

// White label on a blue capsule, then the number on cream: one self-contained
// image the footer can drop in regardless of page styles.
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

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // No Set-Cookie anywhere in this handler: the counter must not identify anyone.
  // Short shared cache keeps the upstream service from being hit on every view.
  res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`);
  res.setHeader('X-Counter-Source', `goatcounter:${siteCode()}`);
  let count = 0;
  try {
    count = (await fetchCount()) ?? 0;
  } catch (error) {
    console.error('visitor counter failed', error.message);
  }
  res.send(counterSvg(count));
}

module.exports = handler;
module.exports.counterSvg = counterSvg;
module.exports.fetchCount = fetchCount;
module.exports.parseCount = parseCount;
module.exports.siteCode = siteCode;
