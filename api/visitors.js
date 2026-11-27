// Visitor counter. Serves a small SVG pill that the footer loads as an image.
//
// Each request that reaches this handler counts as one visit from the address
// that made it, and only the first visit from an address is counted - see
// lib/visits.js for the storage and the privacy rules (no cookies, no stored IP).
//
// The response is never cached, by us or by the browser, so the number a reader
// sees is the total including their own visit, effectively the moment they load
// the page.

const { hasStore, clientIp, recordVisit } = require('../lib/visits');

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

async function handler(req, res) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // No shared or browser cache: one visitor's request must never hand its total
  // to everyone else, and a reload has to reflect the live number.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  let total = 0;
  if (hasStore()) {
    try {
      total = await recordVisit(clientIp(req));
    } catch (error) {
      console.error('visitor counter failed', error.message);
      total = 0;
    }
  } else {
    // No store (local preview, a fork): the badge still renders.
    console.warn('visitor counter has no store configured');
  }
  res.setHeader('X-Counter-Source', 'redis:visitor-total');
  res.send(counterSvg(total));
}

module.exports = handler;
