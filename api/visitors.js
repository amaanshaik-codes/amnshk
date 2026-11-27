// Visitor counter. Serves a small SVG pill that the footer loads as an image.
//
// NO COOKIES. Nothing is written to the visitor's device, which is what lets the
// site carry a "100% cookie free" badge honestly.
//
// Every view of the badge counts. There is no deduplication and no visitor
// identity of any kind is read, derived or stored - the handler never looks at
// the IP address, so it cannot.
//
// Storage: a dotfile at the repository root (.visits.json) holding the running
// total. It sits outside public/, so it is never deployed and cannot be fetched.

const fs = require('fs');
const path = require('path');

const CACHE_SECONDS = 30;


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
// Storage
//
// The record lives in a dotfile at the repository root, outside public/, so it is
// never part of the deployed site and a visitor cannot request it.
//
//   { total: N }
//
// A Vercel function's filesystem is read-only, so the handler below only reads.
// The increment happens in scripts/record-visit.js, which the local preview calls
// for each badge request and which is committed back into the repo.
// ---------------------------------------------------------------------------

const STATE_FILE = path.join(__dirname, '..', '.visits.json');

function currentTotal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return Number(parsed.total) || 0;
  } catch {
    return 0;
  }
}

function countVisit() {
  const total = currentTotal() + 1;
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ total }, null, 1)}\n`);
  return total;
}

// ---------------------------------------------------------------------------

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // Cache for well under a minute so a push shows the new number almost at once.
  res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`);
  res.setHeader('X-Counter-Source', 'file:total');
  let total = 0;
  try {
    total = currentTotal();
  } catch (error) {
    console.error('visitor counter failed', error.message);
    total = 0;
  }
  res.send(counterSvg(total));
}

module.exports = handler;
module.exports.countVisit = countVisit;
