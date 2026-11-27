const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dayFromName, formatDay } = require('./lib/daycount');

const root = __dirname;
const contentRoot = path.join(root, 'Content');
const outputRoot = path.join(root, 'public');
const builtAtDate = new Date();
const builtAt = `${new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
}).format(builtAtDate)} IST`;

// Masthead stamp: rendered at build time like everything else on this static site.
const builtDay = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(builtAtDate);
const builtDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(builtAtDate);
const builtClock = `${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(builtAtDate)} IST`;

// External links open in a new tab; internal ones stay in place. Applied to every
// <a> that leaves the site (markdown links, bare URLs, catalogue rows), so the
// reader never loses their place mid-archive.
const EXTERNAL_ATTRS = ' target="_blank" rel="noopener noreferrer"';
function isExternalHref(href) {
  return /^(?:https?:)?\/\//i.test(String(href || '').trim());
}
function anchor(href, inner, attrs = '') {
  const extra = isExternalHref(href) ? EXTERNAL_ATTRS : '';
  return `<a href="${escapeAttr(href)}"${attrs}${extra}>${inner}</a>`;
}
function escapeAttr(value) {
  return escapeHtml(String(value)).replaceAll('`', '&#96;');
}

// Add future header buttons here. Each item becomes one link in the header.
const navigation = [
  { label: 'Home', href: '/', path: '/' },
  { label: 'File Tree', href: '/file-tree/', path: '/file-tree/' },
  { label: 'Tags', href: '/tags/', path: '/tags/' },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function urlPath(relativePath) {
  return '/' + relativePath.split(path.sep).map(encodeURIComponent).join('/');
}

const SITE_CSS = `/* Charter, self-hosted. Four faces, ~60KB total; preloaded in <head> so text
   paints in the final typeface rather than swapping after first render. */
@font-face { font-family: 'Charter'; src: url('/fonts/charter_regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'Charter'; src: url('/fonts/charter_italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: 'Charter'; src: url('/fonts/charter_bold.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
@font-face { font-family: 'Charter'; src: url('/fonts/charter_bold_italic.woff2') format('woff2'); font-weight: 700; font-style: italic; font-display: swap; }
:root { color-scheme: light; --surface: #fbf9f3; --text: #111; --link: blue; --exec: #111; --hover: yellow; --muted: #333; --font-serif: Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif; }
/* One column width shared by masthead, rules and ticker. A fixed rem length,
   not ch: ch resolves against each element's own font-size, so the header and
   footer rules came out at different widths. */
:root { --content-w: 52rem; }
*, *::before, *::after { box-sizing: border-box; }
body { font-family: var(--font-serif); font-size: 18px; line-height: 1.5; color: var(--text); background: var(--surface); margin: 0; padding: 0; }
/* Faint paper grain: hairlines of slightly darker cream, no image file. */
body { background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.012) 0 1px, transparent 1px 3px); }
.site-shell { width: auto; max-width: 1100px; min-height: 100dvh; margin: 0 auto; background: var(--surface); }
@media (min-width: 1101px) { .site-shell { border-left: 1px solid #d9d3c4; border-right: 1px solid #d9d3c4; } }
/* Header and footer share the same horizontal padding, so a full-width rule
   inside either ends at the same x on both sides. */
header, footer { text-align: center; padding: 1.25rem 1rem; }
header { padding-top: .5rem; padding-bottom: .35rem; }
main { padding: 0 1.5rem 1rem; text-align: left; }
header h1 { margin: 0; font-family: var(--font-serif); font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 700; line-height: 1.1; letter-spacing: .01em; }
header h1 a { color: #111 !important; text-decoration: none !important; background: none !important; }
.masthead { display: grid; grid-template-columns: 1fr auto 1fr; grid-template-areas: "clock clock badge" "brand brand brand" "est est est"; align-items: center; row-gap: .45rem; width: 100%; max-width: var(--content-w); margin: 0 auto .15rem; }
.masthead-brand { grid-area: brand; justify-self: center; }
.mast-time { grid-area: clock; justify-self: start; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 .5rem; margin: 0; font-size: .68rem; line-height: 1.35; letter-spacing: .1em; text-transform: uppercase; color: var(--text); }
.mast-time .mast-day { font-weight: bold; }
.mast-time .mast-sep { opacity: .5; }
.est-mark { grid-area: est; justify-self: center; text-align: center; font-size: .7rem; line-height: 1; letter-spacing: .26em; text-transform: uppercase; white-space: nowrap; color: var(--text); }
.header-badge { grid-area: badge; justify-self: end; margin: 0; line-height: 0; }
.header-badge img { display: block; width: 80px; height: 15px; }
.header-rule { width: 100%; max-width: var(--content-w); margin: .35rem auto 0; border-top: 1px dotted var(--text); }
/* Edge fade so text dissolves at the boundaries instead of being hard-cut mid-glyph. */
.journal-ticker { max-width: var(--content-w); margin: .5rem auto .35rem; overflow: hidden; text-align: left;
  position: relative;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 2.5rem, #000 calc(100% - 2.5rem), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 2.5rem, #000 calc(100% - 2.5rem), transparent 100%);
  /* Reserve the line height so the header never jumps while the ticker runs. */
  min-height: 1.6em; display: flex; align-items: center; }
/* Two identical copies side by side; sliding the track by exactly one copy
   (-50% of the track) loops seamlessly, in track-width units rather than
   viewport units, so it is already moving on the first frame. */
.journal-ticker-track { display: flex; width: max-content;
  animation: ticker-scroll var(--ticker-duration, 180s) linear infinite;
  animation-delay: var(--ticker-delay, 0s); will-change: transform; }
.journal-ticker-track > span { white-space: nowrap; padding-right: 3rem; }
.journal-ticker:hover .journal-ticker-track { animation-play-state: paused; }
/* Start just past the right edge of the *container*, then travel one copy. */
@keyframes ticker-scroll {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .journal-ticker-track { animation: none; }
  /* Without motion, show the line statically but keep it readable. */
  .journal-ticker { -webkit-mask-image: none; mask-image: none; }
}
nav a { font-size: 1rem; }
nav ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 1.1rem; padding: .15rem 0; margin: 0 auto; list-style: none; max-width: var(--content-w); }
nav li::after { content: none; }
nav a[aria-current="page"] { font-weight: bold; }
/* Trail centred, Back pinned to the left edge of the content column. */
.breadcrumbs { position: relative; margin: 1.25rem auto; max-width: var(--content-w); text-align: center; font-size: .85rem;
  letter-spacing: .04em; }
.back-link { position: absolute; left: 0; top: 0; white-space: nowrap; color: var(--link) !important; }
/* Every link is hypertext blue: internal, external, back, nav, lists. */
main a, main a:link, main a:visited, nav a, .breadcrumbs a, .footer-meta a,
.journal-list a, .plain-list a, .tag-list a, .folder-list a,
.back-link { color: var(--link); }
main a:hover, nav a:hover, .breadcrumbs a:hover, .journal-list a:hover,
.plain-list a:hover, .tag-list a:hover, .folder-list a:hover,
.back-link:hover { color: black !important; }
a:link, a:visited { color: var(--link); text-decoration: none; }
/* The highlight should sit tight around the words. Charter's tall line box makes a
   plain background on <a> extend well past the glyphs, so the vertical spread is
   trimmed with an inline background sized to the text. */
a:hover { color: black !important; text-decoration-line: underline; text-decoration-style: dotted;
  background-color: var(--hover); box-shadow: 0 -0.12em 0 0 var(--hover) inset, 0 0.12em 0 0 var(--hover) inset;
  padding: 0 .06em; margin: 0 -.06em; }
.DIR { color: var(--link) !important; }
.EXEC { color: var(--exec) !important; }
main { min-height: 0; text-align: left; }
main h1, main h2, main h3, main h4, main h5, main h6 { text-align: left; font-family: var(--font-serif); font-weight: 700; line-height: 1.2; }
/* A single modular scale (1.333) keeps every heading step consistent and grid
   aligned, instead of the ad-hoc sizes that accumulated per section. */
main h1 { font-size: 2.2rem; }
main h2 { font-size: clamp(1.4rem, 3.2vw, 1.78rem); margin: 0 0 .6rem; }
main h3 { font-size: 1.33rem; margin: 1.4rem 0 .4rem; }
main h4 { font-size: 1.1rem; margin: 1.2rem 0 .3rem; }
main h5 { font-size: 1rem; margin: 1rem 0 .3rem; }
main h6 { font-size: .92rem; margin: 1rem 0 .3rem; letter-spacing: .04em; text-transform: uppercase; }
main > p { width: 100%; max-width: var(--content-w); margin: 1rem auto; text-align: left; }
/* On archive pages the folder's own prose aligns to the section column, so the
   page has one left edge instead of two competing ones. */
/* Same column as the section below it, so the page has one left edge. */
main > .folder-intro { max-width: var(--content-w); margin: 0 auto 1rem; text-align: left; }
main > .folder-intro p { margin: 0 0 .7rem; text-align: left; }
pre { max-width: 100%; overflow-x: auto; margin: 1rem auto; text-align: left; width: max-content; }
.text-viewer { width: 100%; max-width: var(--content-w); margin: 1rem auto; padding: 0; font-family: inherit; font-size: clamp(1.05rem, 2.5vw, 1.22rem); line-height: 1.8; overflow-wrap: anywhere; text-align: left; }
.text-viewer p, .text-viewer ul, .text-viewer ol, .text-viewer blockquote { margin: 1rem 0; }
/* Book pages: a long-form reading column. Wider lines, generous leading and a
   real paragraph gap, so a book reads like a printed page instead of a list
   of short left-aligned lines. */
.book-viewer { width: 100%; max-width: var(--content-w); margin: 1rem auto 2rem; padding: 0;
  text-align: left; font-size: clamp(1.05rem, 1.4vw, 1.2rem); line-height: 1.85; }
.book-viewer p { margin: 0 0 1rem; text-align: left; text-indent: 0; }
/* Short standalone lines (contents, chapter titles) sit tight together, the way
   a printed contents page reads, instead of one per spaced paragraph. */
.book-viewer p.short { margin: 0; line-height: 1.6; }
.book-viewer p.short + p.prose { margin-top: 1rem; }
/* Prose paragraphs get the printed-page indent; a first line after a heading,
   a rule or another paragraph does not. */
.book-viewer p.prose { text-indent: 1.6rem; }
.book-viewer p.prose:first-of-type, .book-viewer hr + p.prose, .book-viewer h1 + p.prose,
.book-viewer h2 + p.prose, .book-viewer h3 + p.prose { text-indent: 0; }
/* A section break (===== or ---) gets breathing room on both sides. */
.book-viewer hr { width: 30%; margin: 1.8rem auto; border: 0; border-top: 1px solid var(--text); }
.book-viewer h1, .book-viewer h2, .book-viewer h3 { text-indent: 0; margin: 2rem 0 .8rem; text-align: center; font-weight: bold; }
.book-viewer blockquote { font-style: italic; }
/* Plain old-school lists: no numbers, no rules, no described rows. */
.plain-list { width: 100%; max-width: var(--content-w); margin: .4rem auto 1rem; padding: 0 0 0 1.4rem; list-style: disc; text-align: left; }
.plain-list li { margin: 0; line-height: 1.5; }
.tag-list { width: 100%; max-width: var(--content-w); margin: .4rem auto 1rem; padding: 0 0 0 1.4rem; list-style: disc; text-align: left; columns: 2 16rem; column-gap: 2.5rem; }
.tag-list li { margin: 0; line-height: 1.5; break-inside: avoid; }
/* Journal: one flowing run of entry links, descending, spaced by whitespace
   rather than separators. Wraps naturally at the column edge. */
.journal-list { width: 100%; max-width: var(--content-w); margin: .5rem auto 1rem; padding: 0 0 0 1.4rem; list-style: none;
  /* Day numbers line up with the header/footer rule edge: the same 1.4rem left
     inset as the plain lists, so the first column starts on the content edge
     rather than centring a grid narrower than --content-w. */
  display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: .3rem 1.2rem; text-align: left; }
/* A long section name in the breadcrumb widens the grid column past the viewport.
   Let the wrapped list shrink to fit instead of pushing the numbers out of view. */
.journal-list, .journal-list li { min-width: 0; }
.journal-list li { padding: 0; line-height: 1.6; text-align: left; }
.journal-list a { font-size: 1rem; }

/* Readings: category index in two columns; each category page keeps the
   author's letter groups as small headings. */
.readings-index { width: 100%; max-width: var(--content-w); margin: .6rem auto 1rem; padding: 0; list-style: none;
  columns: 2; column-gap: 2.5rem; text-align: left; }
.readings-index li { display: flex; align-items: baseline; justify-content: space-between; gap: .6rem;
  padding: .15rem 0; break-inside: avoid; }
.readings-index a { font-size: 1.02rem; }
.readings-count { font-size: .8rem; color: var(--muted); font-variant-numeric: tabular-nums; }

.readings-category { width: 100%; max-width: var(--content-w); margin: .6rem auto 1rem; text-align: left;
  columns: 2; column-gap: 2.5rem; }
.readings-letter { margin: .9rem 0 .2rem; font-size: .95rem; font-weight: bold; text-align: left; break-after: avoid; }
.readings-letter:first-child { margin-top: 0; }
.readings-list { margin: 0 0 .4rem; padding: 0 0 0 1.1rem; list-style: disc; }
.readings-list li { margin: .05rem 0; line-height: 1.45; break-inside: avoid; }
/* A bullet only appears where the author wrote one. */
.readings-list li.no-bullet { list-style: none; }
.readings-list li.no-bullet { margin-left: -1.1rem; }

/* Letter index: one continuous list flowing in two columns. Each entry carries
   its letter as a small marker, so single-item letters do not waste a row. */
.letter-index { width: 100%; max-width: var(--content-w); margin: .8rem auto 1.2rem; padding: 0; list-style: none; text-align: left;
  columns: 2; column-gap: 2.8rem; }
.letter-index > li { break-inside: avoid; padding: .3rem 0; line-height: 1.5; font-size: .98rem; }
.letter-index .letter-mark { display: inline-block; min-width: 1.35rem; margin-right: .45rem; color: var(--muted); font-size: .78rem; font-weight: bold; }

@media (max-width: 46rem) {
  .readings-index, .readings-category { columns: 1; }
  .letter-index { columns: 1; }
}
/* Browse box: padding is set in the same rhythm as the text, and the links
   inherit the body face and scale instead of carrying their own clamp(), which
   left them visually off-centre inside the border after the font change. */
.category-links { display: flex; width: 100%; max-width: var(--content-w); margin: 0 auto; box-sizing: border-box;
  flex-wrap: wrap; align-items: center; justify-content: center; gap: 0; padding: .6rem .9rem; border: 1px solid var(--text); }
.category-link { color: var(--link); font-size: 1.05rem; line-height: 1.4; padding: .1rem 0; }
.category-separator { margin: 0 .5rem; opacity: .4; }
/* Text layout is one column sitewide: paragraphs fill the measure, headings
   sit on its left edge, and alignment is opt-in per paragraph. */
.text-viewer, main > p, main h1, main h2, main h3, main h4, main h5, main h6,
.text-viewer h1, .text-viewer h2, .text-viewer h3, .text-viewer h4, .text-viewer h5, .text-viewer h6 {
  width: 100%; max-width: var(--content-w); margin-left: auto; margin-right: auto; text-align: left; }
main > p, .text-viewer p { text-align: left; }
p.align-justify, .align-justify p { text-align: justify; }
p.align-center, .align-center p { text-align: center; }
p.align-right, .align-right p { text-align: right; }
p.align-justify, p.align-center, p.align-right { margin-left: auto; margin-right: auto; }

/* Rendered markdown */
code { font-family: 'Courier New', Courier, monospace; font-size: .92em; }
pre { width: 100%; max-width: var(--content-w); margin: 1rem auto; padding: .75rem 1rem; overflow-x: auto; text-align: left;
  border: 1px solid var(--text); background: #efeade; }
pre code { font-size: .88em; line-height: 1.5; }
mark { background: #ffe97a; color: inherit; }
del { text-decoration: line-through; }
hr { border: 0; border-top: 1px dotted var(--text); width: 100%; max-width: var(--content-w); margin: 1.2rem auto; display: block; }
blockquote { width: 100%; max-width: var(--content-w); box-sizing: border-box; margin: 1rem auto; padding: .2rem 0 .2rem 1rem;
  border-left: 3px solid var(--text); text-align: left; font-style: italic; }
blockquote.quote-2 { margin-left: auto; padding-left: 2rem; border-left: 1px dotted var(--text); }
blockquote.quote-3 { margin-left: auto; padding-left: 3rem; border-left: 1px dotted var(--text); }
.math { font-family: var(--font-serif); font-style: italic; white-space: nowrap; }
.math-block { display: block; text-align: center; font-family: var(--font-serif); font-style: italic; margin: .8rem 0; }
main img, .text-viewer img { max-width: 100%; height: auto; }
.task { list-style: none; margin-left: -1.2rem; }
.task input { margin-right: .4rem; }

main ul, main ol { width: 100%; max-width: var(--content-w); margin: .5rem auto 1rem; padding-left: 1.5rem; text-align: left; }
main li { margin: .15rem 0; }
main li > ul, main li > ol { margin: .2rem 0 .2rem 0; }

/* Tables size to their content and sit on the left edge of the column, the
   way a printed table does - not stretched across the full measure. */
table { width: auto; max-width: var(--content-w); margin: 1rem auto 1rem 0; border-collapse: collapse; text-align: left; table-layout: auto; }
th, td { padding: .3rem .9rem .3rem 0; border-bottom: 1px dotted var(--text); vertical-align: top; text-align: left; }
th { border-bottom: 1px solid var(--text); font-weight: bold; }
.ta-center { text-align: center; }
.ta-right { text-align: right; padding-right: 0; }
@media (max-width: 40rem) {
  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  tr { padding: .6rem 0; border-bottom: 1px dotted var(--text); }
  td { padding: .15rem 0; border: 0; }
  td::before { content: attr(data-label); display: block; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  td:empty { display: none; }
}
/* Books and the What's Bad About collection use the same two-column shape as
   readings and music: links only, secondary text muted and inline. */
.two-col-list { width: 100%; max-width: var(--content-w); margin: .5rem auto 1rem; padding: 0 0 0 1.1rem; list-style: disc;
  columns: 2; column-gap: 2.5rem; text-align: left; }
.two-col-list li { margin: .1rem 0; line-height: 1.5; break-inside: avoid; }
.two-col-list .item-note { font-size: .88rem; color: var(--muted); }
@media (max-width: 46rem) { .two-col-list { columns: 1; } }
.folder-list { width: 100%; max-width: var(--content-w); margin: .5rem auto 1rem; padding: 0; list-style: none; text-align: left; }
.folder-entry { padding: .8rem 0; }
.folder-entry-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.folder-entry-title { font-size: 1.05rem; }
.folder-entry-kind { white-space: nowrap; font-size: .9rem; color: var(--text); }
.tags-page { width: 100%; max-width: var(--content-w); margin: 1rem auto; text-align: left; }
.tag-list { margin: 1rem auto; padding-left: 1.25rem; list-style: disc; text-align: left; }
.tagged-notes { margin: 1rem 0; padding: 0; list-style: none; }
.tag-entry, .tagged-note { padding: .8rem 0; }
.tag-link, .tagged-note-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.tag-name, .tagged-note-title { font-size: 1.05rem; }
.tagged-note-path { white-space: nowrap; font-size: .9rem; }
.note-tags { width: 100%; max-width: var(--content-w); margin: 1rem auto; text-align: left; font-size: .95rem; }
/* Music: same column, same rhythm as the rest of the site. Two columns of
   album links with the artist in muted type, no per-row action label. */
.music-page { width: 100%; max-width: var(--content-w); margin: .6rem auto 1rem; text-align: left; }
.music-page > p { margin: 0 0 1rem; }
.music-intro p { margin: 0 0 .9rem; text-align: left; }

/* Album catalogue: one unbreakable block per letter, balanced into two columns. */
/* Album catalogue: two explicit columns, split for balance. Each letter block
   stays whole, so its albums never break across the column edge. */
.album-index { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 2.6rem; margin: 1.4rem auto 0; align-items: start; }
.album-column { min-width: 0; }
.album-group { break-inside: avoid; margin: 0; padding: .55rem 0 .1rem; }
/* The letter heads its group; no rule beneath it. */
.album-letter { margin: 0 0 .25rem; font-size: .7rem; font-weight: bold;
  letter-spacing: .18em; color: var(--muted); }
/* One rule between one letter's albums and the next letter's. Nothing separates
   individual albums, so the only lines on the page are these group breaks. */
.album-rule { width: 100%; margin: .15rem 0 .5rem; border: 0; border-top: 1px solid var(--text); }
.album-list { margin: 0; padding: 0; list-style: none; }
.album-list > li { padding: .38rem 0; }

.album-name { display: block; font-size: 1rem; line-height: 1.3; }
.album-artist { display: block; font-size: .85rem; line-height: 1.3; color: var(--muted); }
.album-note { display: block; margin-top: .12rem; font-size: .85rem; line-height: 1.45; color: var(--muted); }

@media (max-width: 46rem) { .album-index { grid-template-columns: minmax(0, 1fr); } }
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 1rem; top: 1rem; }
footer { padding: .75rem 1rem 1.1rem; font-size: .9rem; }
/* Same dotted rule as the header, at the same width, so the page closes the
   way it opens. */
.footer-rule { width: 100%; max-width: var(--content-w); margin: 0 auto .9rem; border-top: 1px dotted var(--text); }
/* Two equal columns sized to the widest badge (160px), so every row lines up. */
/* Each badge sits in its own equal cell and keeps its natural size, so the two
   rows share the same outer edges instead of one row looking narrower. */
/* One centred row per pair: 88px badges on top, 160px below, so both rows
   share the same axis instead of each being left-packed. */
.badges { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .5rem 1.1rem; max-width: 22rem; margin: .6rem auto 0; }
.badges .badge { flex: 0 0 auto; }
.badge { display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
/* Badges are fixed-size pixel art: never scale or stretch them. */
.badge img { display: block; width: auto; height: auto; max-width: none; image-rendering: pixelated; }
/* The 160px pair are visually heavier than the 88px pair; scale them to 128px
   so both rows carry similar weight. Pixel art stays crisp. */
.badge img[width="160"] { width: 128px; height: 29px; }
.footer-meta { display: flex; justify-content: center; align-items: baseline; flex-wrap: wrap; gap: 1rem; }
.footer-meta p { margin: 0; }
.visit-counter { display: flex; align-items: center; justify-content: center; gap: .35rem; min-height: 22px; margin-top: .75rem; font-size: .85rem; line-height: 1; color: var(--muted); }
.visit-counter img { display: block; height: 22px; width: auto; image-rendering: pixelated; }

/* -----------------------------------------------------------------------
   Mobile: same paper, monospace and dotted rules, laid out for a phone.
   Grouped at the end so every rule here is easy to see and adjust.
   ---------------------------------------------------------------------- */
@media (max-width: 40rem) {
  body { padding: 0; font-size: 16px; }
  .site-shell { max-width: none; min-height: 100dvh; }

  /* Header: clock and badge share the top line, wordmark fills the next. */
  header { padding: .6rem .9rem .1rem; }
  .masthead { grid-template-columns: 1fr auto; grid-template-areas: "clock badge" "brand brand" "est est";
    column-gap: .5rem; row-gap: .2rem; }
  .mast-time { font-size: .6rem; letter-spacing: .04em; gap: 0 .3rem; }
  .mast-time .mast-sep { opacity: .4; }
  .header-badge img { width: 66px; height: 12px; }
  header h1 { font-size: 1.85rem; letter-spacing: .02em; }
  .est-mark { font-size: .6rem; letter-spacing: .2em; }
  .header-rule { margin-top: .4rem; }

  /* Ticker: scroll it on mobile too, just smaller and faster so a short line
     reads comfortably in a narrow window. */
  .journal-ticker { margin: .4rem 0 .1rem; min-height: 1.3em; font-size: .78rem;
    -webkit-mask-image: linear-gradient(to right, transparent 0, #000 1.2rem, #000 calc(100% - 1.2rem), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, #000 1.2rem, #000 calc(100% - 1.2rem), transparent 100%); }
  .journal-ticker-track { animation-duration: 200s; }
  .journal-ticker-track > span { padding-right: 2rem; }

  /* Nav: big enough to tap, spread across the width. */
  nav ul { justify-content: center; gap: .15rem .1rem; padding: .35rem 0 .15rem; }
  nav a { font-size: .92rem; padding: .3rem .25rem; display: inline-block; }

  /* Content: comfortable measure and gutters. */
  main { padding: 0 .9rem 1rem; }
  main h2 { font-size: 1.25rem; }
  .breadcrumbs { margin: .8rem 0; font-size: .8rem; text-align: left; }
  .back-link { position: static; display: block; margin-bottom: .25rem; }
  .text-viewer { font-size: 1rem; line-height: 1.7; }
  .journal-list, .folder-list, .tag-list { max-width: none; }

  /* List rows: keep title and action on one line with room to breathe. */
  .folder-entry-link { gap: .6rem; }

  /* Footer: two badges per row still fit, meta stacks neatly. */
  footer { padding: .9rem .9rem 1.2rem; font-size: .85rem; }
  .footer-meta { flex-direction: column; gap: .25rem; }
  .badges { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem .3rem; width: auto; max-width: 21rem; }
  .badge img { max-width: 100%; height: auto; }
  .visit-counter { margin-top: .6rem; }
}

/* Very narrow phones: drop the badge beside the clock, let the wordmark lead. */
@media (max-width: 22rem) {
  .masthead { grid-template-columns: 1fr; grid-template-areas: "brand" "clock" "est" "badge"; justify-items: center; }
  .mast-time { justify-self: center; text-align: center; }
  .header-badge { justify-self: center; }
  .badges { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;

// The stylesheet name carries a hash of its contents. When the CSS changes the URL
// changes, so browsers fetch the new file immediately instead of serving a cached
// copy - while an unchanged stylesheet still caches forever.
const CSS_HASH = crypto.createHash('sha256').update(SITE_CSS).digest('hex').slice(0, 10);

function layout(title, body, currentPath = '/', tags = []) {
  const description = 'AMNSHK, Amaan Shaik\'s personal site, journals, lists, and books.';
  const navLink = ({ label, href, path }) => `<li><a href="${href}"${currentPath === path || (path !== '/' && currentPath.startsWith(path)) ? ' aria-current="page"' : ''}>${label}</a></li>`;
  const trailParts = currentPath.split('/').filter(Boolean);
  // A real link to the parent page, not history.back(): history is unreliable on a
  // fresh tab and misleading when the reader arrived from an external site.
  const parentHref = trailParts.length > 1
    ? `/${trailParts.slice(0, -1).join('/')}/`
    : '/';
  const backLink = currentPath === '/'
    ? ''
    : `<a class="back-link" href="${parentHref}" rel="prev">&lt;&lt; Back</a>`;
  const breadcrumbs = currentPath === '/' ? '' : `<nav class="breadcrumbs" aria-label="Breadcrumb">${backLink}<a href="/">Home</a>${trailParts.map((part, index, parts) => {
    const isLast = index === parts.length - 1;
    const cleanName = decodeURIComponent(part).replace(/\.(txt|html)$/i, '').replaceAll('-', ' ');
    const label = publicLabel(cleanName);
    const href = `/${parts.slice(0, index + 1).join('/')}${isLast && !currentPath.endsWith('/') ? '' : '/'}`;
    return isLast ? ` <span aria-hidden="true">/</span> ${escapeHtml(label)}` : ` <span aria-hidden="true">/</span> <a href="${href}">${escapeHtml(label)}</a>`;
  }).join('')}</nav>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="description" content="${description}">
  <meta property="og:title" content="${escapeHtml(title)} · AMNSHK">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)} · AMNSHK</title>
  <link rel="preload" href="/fonts/charter_regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/charter_italic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/style.${CSS_HASH}.css">
  <style>/* Critical: paint text in the right face and colour before style.css lands. */
    html{background:#fbf9f3}body{margin:0;background:#fbf9f3;color:#111;font-family:Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif;font-size:18px;line-height:1.5}a{color:blue}</style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-shell">
  <header>
    <div class="masthead">
      <p class="mast-time" aria-label="Local time">
        <span class="mast-day" data-clock="day">${builtDay}</span><span class="mast-sep" aria-hidden="true">·</span><span data-clock="date">${builtDate}</span><span class="mast-sep" aria-hidden="true">·</span><span data-clock="time">${builtClock}</span>
      </p>
      <h1 class="masthead-brand"><a href="/">AMNSHK</a></h1>
      <span class="est-mark">Est. 2005</span>
      <div class="header-badge"><img src="/badges/free-speech.png" width="80" height="15" alt="Free speech"></div>
    </div>
    ${latestJournalTicker()}
    <nav aria-label="Primary navigation">
      <ul>
        ${navigation.map(navLink).join('\n        ')}
      </ul>
    </nav>
    <div class="header-rule" aria-hidden="true"></div>
  </header>
  <main id="main-content">${breadcrumbs}${renderTagLinks(tags)}${body}</main>
  <footer>
    <div class="footer-rule" aria-hidden="true"></div>
    <div class="footer-meta">
      <p>Email: <a href="mailto:amaanshaik.work@gmail.com">amaanshaik.work@gmail.com</a></p>
      <p>Last updated: ${builtAt}</p>
    </div>
    <div class="badges" aria-label="Web badges">
      <span class="badge"><img src="/badges/bestvieweddesktop.gif" width="88" height="31" alt="Best viewed on desktop"></span>
      <span class="badge"><img src="/badges/cookie-free.png" width="88" height="31" alt="This site is certified 100% cookie free"></span>
      <span class="badge"><img src="/badges/y2k-compliant.png" width="160" height="36" alt="Y2K compliant"></span>
      <span class="badge"><img src="/badges/no-ai-human-content.png" width="160" height="36" alt="No AI human content"></span>
    </div>
    <div class="visit-counter"><img src="/api/visitors" alt="Visitor count" width="114" height="22" decoding="async" fetchpriority="low"></div>
  </footer>
  </div>
  <script>
    // The masthead clock is printed at build time; keep it honest in the reader's
    // own timezone. Without JS the build-time IST stamp above remains readable.
    (function () {
      var dayEl = document.querySelector('[data-clock="day"]');
      var dateEl = document.querySelector('[data-clock="date"]');
      var timeEl = document.querySelector('[data-clock="time"]');
      // The counter is a cached SVG; refresh it once so the total is current.
      var visitImg = document.querySelector('.visit-counter img');
      if (visitImg) {
        var refreshVisit = function () { visitImg.src = '/api/visitors?v=' + Date.now(); };
        if (document.readyState === 'complete') refreshVisit();
        else window.addEventListener('load', refreshVisit, { once: true });
      }
      if (!dayEl || !dateEl || !timeEl) return;
      var pad = function (n) { return String(n).padStart(2, '0'); };
      function tick() {
        var now = new Date();
        dayEl.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
        dateEl.textContent = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(now);
        var offset = -now.getTimezoneOffset();
        var sign = offset >= 0 ? '+' : '-';
        var hours = Math.floor(Math.abs(offset) / 60);
        var zone = 'UTC' + sign + pad(hours) + (Math.abs(offset) % 60 ? ':' + pad(Math.abs(offset) % 60) : '');
        timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' ' + zone;
        dayEl.dateTime = now.toISOString();
      }
      tick();
      setInterval(tick, 20000);
    })();

    // Keep the journal ticker running across page loads: the CSS animation restarts
    // at 0 on every navigation, so resume from where the last page left off.
    // This must not wait on anything else - it runs inline right after the markup.
    (function () {
      var track = document.querySelector('.journal-ticker-track');
      if (!track) return;
      var KEY = 'ticker-anchor';
      var DURATION = 180; // seconds; keep in step with --ticker-duration
      var anchor = 0;
      try { anchor = Number(sessionStorage.getItem(KEY)) || 0; } catch (e) { anchor = 0; }
      var elapsed;
      if (anchor) {
        elapsed = ((Date.now() - anchor) / 1000) % DURATION;
      } else {
        // First visit: jump a little way in so the line is already travelling.
        elapsed = DURATION * 0.15;
        try { sessionStorage.setItem(KEY, String(Date.now() - elapsed * 1000)); } catch (e) { /* private mode */ }
      }
      // A negative delay seeks forward into the loop, so it is moving immediately
      // instead of sitting still for the first fraction of a cycle.
      track.style.animationDelay = '-' + elapsed.toFixed(2) + 's';
    })();
  </script>
</body>
</html>
`;
}

function displayName(fileName) {
  return fileName.replace(/\.(md|txt|html)$/i, '');
}

function parseProperties(sourceText) {
  const match = sourceText.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { body: sourceText, tags: [] };
  const properties = match[1].split(/\r?\n/);
  const tags = [];
  let readingTags = false;
  for (const line of properties) {
    const tagsLine = line.match(/^tags\s*:\s*(.*)$/i);
    if (tagsLine) {
      readingTags = true;
      const value = tagsLine[1].trim();
      if (value) tags.push(...value.replace(/^\[|\]$/g, '').split(',').map((tag) => tag.trim()));
      continue;
    }
    if (readingTags) {
      const listItem = line.match(/^\s*-\s+(.+)$/);
      if (listItem) tags.push(listItem[1].trim());
      else if (line.trim()) readingTags = false;
    }
  }
  const normalizedTags = [...new Set(tags.map((tag) => tag.replace(/^['"]|['"]$/g, '').replace(/^#/, '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { body: sourceText.slice(match[0].length), tags: normalizedTags };
}

function tagSlug(tag) {
  return slugify(tag);
}

function renderTagLinks(tags) {
  if (!tags.length) return '';
  const links = tags.map((tag) => `<a href="${urlPath(path.join('tags', tagSlug(tag)) + path.sep)}">#${escapeHtml(tag)}</a>`).join(' ');
  return `<p class="note-tags" aria-label="Tags">Tags: ${links}</p>`;
}

function journalContentDir() {
  // Find the journal folder by name, whatever its spacing or capitalisation.
  for (const entry of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && isJournalPath(entry.name)) return path.join(contentRoot, entry.name);
  }
  return null;
}

function latestJournalTicker() {
  const journalRoot = journalContentDir();
  if (!journalRoot) return '';
  // Entries are named by day-of-life, so the highest number is the newest.
  const files = fs.readdirSync(journalRoot, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory() && entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md')
    .map((entry) => ({ entry, day: dayFromName(entry.name) }))
    .filter((item) => item.day !== null && fs.readFileSync(path.join(journalRoot, item.entry.name), 'utf8').trim())
    .sort((a, b) => b.day - a.day);
  if (!files.length) return '';
  const source = parseProperties(fs.readFileSync(path.join(journalRoot, files[0].entry.name), 'utf8')).body;
  const preview = source
    .split(/\r?\n/)
    .map((value) => value.replace(/^\s*[-*+]\s+/, '').replace(/^\s*#{1,6}\s+/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>#=~]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
  if (!preview) return '';
  return `<div class="journal-ticker" aria-label="Latest journal entry"><div class="journal-ticker-track"><span>${escapeHtml(preview)}</span><span aria-hidden="true">${escapeHtml(preview)}</span></div></div>`;
}

function folderDisplayName(folderName) {
  return folderName.replace(/\.html$/i, '');
}

function publicLabel(value) {
  const readable = value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ['journal', 'journalish'].includes(readable.toLowerCase())
    ? 'Journal'
    : readable.toLowerCase() === 'books'
      ? 'Books'
    : readable.charAt(0).toUpperCase() + readable.slice(1);
}

// Vault folders are capitalised differently (Articles, readings, journal), so every
// section test compares the first path segment case-insensitively.
function firstSegment(relativePath) {
  return relativePath.split(/[\\/]/).filter(Boolean)[0]?.toLowerCase() || '';
}

function isJournalPath(relativePath) {
  // Matches journal, journalish, "journal entries", "journal-entries" and any
  // other spacing of the same name, so renaming the vault folder does not drop
  // the section back to a plain file listing.
  const name = firstSegment(relativePath);
  const compact = name.replace(/[\s_-]+/g, '');
  return compact === 'journal' || compact === 'journalish' || compact === 'journalentries';
}

function isArticlesPath(relativePath) {
  return firstSegment(relativePath) === 'articles';
}

function isReadingsPath(relativePath) {
  return firstSegment(relativePath) === 'readings';
}



function isBadAboutPath(relativePath) {
  const name = relativePath.replace(/\\/g, '/').toLowerCase();
  return name === "what's bad about" || name === 'whats bad about';
}

function isBooksPath(relativePath) {
  const first = firstSegment(relativePath);
  return first === 'books' || first === 'book';
}

function isMusicFile(fileName, relativePath) {
  return relativePath === 'music.md' || fileName.toLowerCase() === 'music.md' && relativePath === 'music.md';
}



function fixedJournalTitle(sourceText, fallback) {
  const line = parseProperties(sourceText).body.split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value && !/^#{1,6}\s+/.test(value));
  if (!line) return fallback;
  const plain = line
    .replace(/^[-*+]\s+/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 72 ? `${plain.slice(0, 69).trimEnd()}...` : plain;
}

function renderJournalListing(sourceDir, relativeDir) {
  // The label is always the day-of-life number, derived from the entry's date.
  // A filename that is already a bare number carries no other date, so its number
  // is used as-is; dated filenames are converted. Nothing is read from the body.
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory() && entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md')
    .map((entry) => ({ entry, day: dayFromName(entry.name) }))
    .filter((item) => item.day !== null)
    .sort((a, b) => b.day - a.day);
  if (!entries.length) return '<p>No journal entries yet.</p>';
  const items = entries
    .map(({ entry, day }) => {
      const href = urlPath(path.join(relativeDir, outputName(entry.name, path.join(relativeDir, entry.name))));
      return `<li><a href="${href}">${formatDay(day)}</a></li>`;
    })
    .join('');
  return `<ul class="journal-list">${items}</ul>`;
}

// Music: an album catalogue.
//
// The note is written as loose groups: `# A` / `---` letter headings, then lines
// of the shape `[Album](link) - Artist  optional note`. Albums are collected into
// one alphabetical run and each carries its letter as a small marker, the same
// shape the games page uses. Prose before the first heading is the intro.
function renderMusicPage(sourceText) {
  const lines = parseProperties(sourceText).body.split(/\r?\n/);
  const intro = [];
  const albums = [];
  let letter = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // `---` lines carry the author's own grouping; the catalogue draws one divider
    // between letter groups regardless, so they are dropped here.
    if (/^-{3,}$/.test(line)) continue;

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const text = heading[1].trim();
      if (/^[A-Z0-9]$/i.test(text)) {
        letter = text.toUpperCase();
        continue;
      }
      // Anything else is a full heading inside the prose: keep it as an album-name
      // boundary but not as catalogue structure.
      continue;
    }

    const isAlbum = line.match(/^\[([^\]]+)\]\(([^)\s]+)[^)]*\)\s*(?:-\s*(.+))?$/);
    if (isAlbum) {
      const name = isAlbum[1].trim();
      const href = isAlbum[2];
      // "Artist  note" - the artist runs to a double space or the first sentence
      // break; whatever follows is the author's note.
      let artist = '';
      let note = '';
      const tail = (isAlbum[3] || '').trim();
      if (tail) {
        const split = tail.split(/\s{2,}/);
        artist = split[0].trim();
        note = split.slice(1).join(' ').trim();
      }
      albums.push({
        name,
        href,
        artist,
        note,
        letter: letter || name.charAt(0).toUpperCase()
      });
      continue;
    }

    // Prose only counts before the catalogue starts.
    if (!albums.length) intro.push(line);
  }

  // Alphabetical by album, with the letter taken from the title itself so the
  // grouping always matches what is displayed (a note's heading may be stale).
  albums.forEach((album) => { album.letter = album.name.charAt(0).toUpperCase(); });
  albums.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const introHtml = intro.length
    ? `<div class="music-intro">${intro.map((para) => `<p>${inlineMarkdown(para, '')}</p>`).join('')}</div>`
    : '';
  if (!albums.length) return `<section class="music-page">${introHtml}<p>No albums yet.</p></section>`;

  // Two columns, split at whichever letter boundary gives the closest balance.
  // Letters stay in alphabetical order down the left column and continue down the
  // right, so the sequence still reads 2, A, B, C, D, F, G ...
  const letterGroups = [];
  for (const album of albums) {
    const last = letterGroups[letterGroups.length - 1];
    if (last && last.letter === album.letter) last.albums.push(album);
    else letterGroups.push({ letter: album.letter, albums: [album] });
  }

  // Let CSS balance the columns: it measures the real rendered heights rather than
  // my estimate. Each group is unbreakable, so a letter never splits across
  // columns, and the browser keeps the alphabetical order intact.
  // Split the letters into two columns at the boundary that balances them best.
  // Weights are in pixels, calibrated against the rendered heights of this layout
  // (letter heading + one line per album + artist/note lines). Order stays
  // alphabetical down the left column and continues down the right.
  const weightOf = (groups) => groups.reduce((sum, group) => {
    const lines = group.albums.reduce((inner, album) => {
      let px = 62;                                   // title line + row padding
      if (album.artist) px += 20;                    // artist line
      if (album.note) px += 20 * Math.max(1, Math.ceil(album.note.length / 46)); // wrapped note
      return inner + px;
    }, 0);
    return sum + lines + 21;                         // letter heading + group gap
  }, 0);

  let split = letterGroups.length;
  let best = Infinity;
  for (let k = 1; k <= letterGroups.length; k += 1) {
    const delta = Math.abs(weightOf(letterGroups.slice(0, k)) - weightOf(letterGroups.slice(k)));
    if (delta < best) { best = delta; split = k; }
  }

  const renderGroup = (group) => {
    const items = group.albums.map((album) => {
      const artist = album.artist ? `<span class="album-artist">${escapeHtml(album.artist)}</span>` : '';
      const note = album.note ? `<span class="album-note">${escapeHtml(album.note)}</span>` : '';
      return `<li><a class="album-name" href="${escapeAttr(album.href)}">${escapeHtml(album.name)}</a>${artist}${note}</li>`;
    }).join('');
    return `<div class="album-group"><h3 class="album-letter">${escapeHtml(group.letter)}</h3><ul class="album-list">${items}</ul></div>`;
  };

  // A rule between one letter's albums and the next letter's, never under the
  // last group in a column where it would have nothing to separate.
  const renderColumn = (groups) => groups
    .map((group, index) => (index ? '<hr class="album-rule">' : '') + renderGroup(group))
    .join('');

  return `<section class="music-page">${introHtml}<div class="album-index"><div class="album-column">${renderColumn(letterGroups.slice(0, split))}</div><div class="album-column">${renderColumn(letterGroups.slice(split))}</div></div></section>`;
}

function renderBooksListing(sourceDir, relativeDir) {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
  if (!entries.length) return '<p>No books yet.</p>';
  // Same shape as the readings and music pages: a two-column list of links, with
  // secondary information kept in muted type on the same line.
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return `<li><a href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a></li>`;
    }
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${path.join(relativeDir, `${destinationName}.html`)}` : path.join(relativeDir, destinationName);
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const note = parseProperties(sourceText);
    const sourceLines = note.body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = markdownTitle(note.body, publicLabel(displayName(entry.name)));
    const authorLine = sourceLines.find((line) => /^by\s+/i.test(line));
    const author = authorLine ? authorLine.replace(/^by\s+/i, '') : '';
    return `<li><a href="${urlPath(linkPath)}">${escapeHtml(title)}</a>${author ? ` <span class="item-note">${escapeHtml(author)}</span>` : ''}</li>`;
  }).join('');
  return `<ul class="two-col-list">${items}</ul>`;
}

function sortArticleLinks(sourceText) {
  const lines = sourceText.split(/\r?\n/);
  const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);
  const linkLines = nonEmptyLines.filter((line) => /^\[[^\]]+\]\([^)]+\)$/.test(line));
  if (linkLines.length < 2 || linkLines.length !== nonEmptyLines.length) return sourceText;
  return [...linkLines].sort((a, b) => {
    const aLabel = a.match(/^\[([^\]]+)\]/)[1];
    const bLabel = b.match(/^\[([^\]]+)\]/)[1];
    return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
  }).join('\n\n');
}

// Articles are stored either as folders or as link collections. Both flatten to
// the same shape here so the page reads as one editorial archive.
function collectArticles(sourceDir, relativeDir) {
  const articles = [];
  for (const entry of sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))) {
    const relativePath = path.join(relativeDir, entry.name);
    if (isHiddenContent(relativePath) || entry.name.toLowerCase() === 'index.md') continue;
    if (entry.isDirectory()) {
      articles.push({
        title: publicLabel(folderDisplayName(entry.name)),
        href: `${urlPath(relativePath)}/`,
      });
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const note = parseProperties(fs.readFileSync(path.join(sourceDir, entry.name), 'utf8'));
    const destinationName = outputName(entry.name, relativePath);
    // isTextOutput() and this branch both resolve to the same destination, so no
    // separate .html variant is needed here.
    const linkPath = path.join(relativeDir, destinationName);
    articles.push({
      title: publicLabel(displayName(entry.name)),
      href: urlPath(linkPath),
    });
  }
  return articles;
}

function renderArticlesListing(sourceDir, relativeDir) {
  const articles = collectArticles(sourceDir, relativeDir);
  if (!articles.length) return '<p>No articles yet.</p>';
  const items = articles.map((article) => `<li><a href="${article.href}">${escapeHtml(article.title)}</a></li>`).join('');
  return `<ul class="plain-list">${items}</ul>`;
}

// Readings: a category index laid out in two columns.
//
// Each category is one note in Content/Readings/ (People, Psychology, ...). Every
// category page shows its readings grouped by the letter headings the author
// already uses (`# A`, `# B`), in the order they wrote them, so manual sorting is
// preserved rather than re-sorted by the build.
// A readings category page: the author's own letter groups (`# A`, `# B`, ...)
// kept as small headings, with each reading under its letter in their order.
function renderReadingCategory(body, relativeDir) {
  const lines = parseProperties(body).body.split(/\r?\n/);
  const groups = [];
  let current = { letter: '', items: [], prose: [] };
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    // Track whether the author actually wrote a bullet: only then print one.
    const bullet = line.match(/^\s*[-*+]\s+\[([^\]]+)\]\(([^)\s]+)[^)]*\)\s*$/);
    const bare = line.match(/^\s*\[([^\]]+)\]\(([^)\s]+)[^)]*\)\s*$/);
    if (heading) {
      if (current.items.length || current.prose.length) groups.push(current);
      current = { letter: heading[1].trim(), items: [], prose: [] };
    } else if (bullet) {
      current.items.push({ title: bullet[1], href: bullet[2], bulleted: true });
    } else if (bare) {
      current.items.push({ title: bare[1], href: bare[2], bulleted: false });
    } else if (line.trim() && !/^-{3,}$/.test(line.trim())) {
      current.prose.push(line);
    }
    // A `---` divider separates letters and carries no meaning of its own.
  }
  if (current.items.length || current.prose.length || current.letter) groups.push(current);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const rendered = groups.map((group) => {
    const prose = group.prose.length ? `<p>${inlineMarkdown(group.prose.join(' '), relativeDir)}</p>` : '';
    if (!group.items.length) return prose;
    const letter = group.letter && group.letter.length <= 2 ? `<h3 class="readings-letter">${escapeHtml(group.letter)}</h3>` : '';
    const items = group.items.map((item) => `<li class="${item.bulleted ? 'has-bullet' : 'no-bullet'}"><a href="${escapeAttr(item.href)}">${escapeHtml(item.title)}</a></li>`).join('');
    return `${prose}${letter}<ul class="readings-list">${items}</ul>`;
  }).join('');

  return `<div class="readings-category" data-count="${total}">${rendered}</div>`;
}

function renderReadingsListing(sourceDir, relativeDir) {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => !entry.isDirectory() && entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md');
  if (!entries.length) return '<p>No categories yet.</p>';
  const categories = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const note = parseProperties(sourceText);
    const readingCount = [...note.body.matchAll(/^\s*(?:[-*+]\s*)?\[([^\]]+)\]\(([^)\s]+)[^)]*\)\s*$/gm)].length;
    return {
      title: publicLabel(displayName(entry.name)),
      href: urlPath(path.join(relativeDir, outputName(entry.name, relativePath))),
      count: readingCount,
    };
  });
  const items = categories
    .map((category) => `<li><a href="${category.href}">${escapeHtml(category.title)}</a><span class="readings-count">${category.count}</span></li>`)
    .join('');
  return `<ul class="readings-index">${items}</ul>`;
}

function renderFolderListing(sourceDir, relativeDir) {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
  if (!entries.length) return '<p>No entries yet.</p>';
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return `<li class="folder-entry"><a class="folder-entry-link DIR" href="${urlPath(relativePath)}/"><span class="folder-entry-title">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</span><span class="folder-entry-kind">folder</span></a></li>`;
    }
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const destinationName = outputName(entry.name, relativePath);
    const destinationPath = path.join(relativeDir, destinationName);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationPath}.html` : destinationPath;
    const title = markdownTitle(parseProperties(sourceText).body, publicLabel(displayName(entry.name)));
    const kind = isTextOutput(entry.name, relativePath) ? 'plain text' : 'page';
    return `<li class="folder-entry"><a class="folder-entry-link EXEC" href="${urlPath(linkPath)}"><span class="folder-entry-title">${escapeHtml(title)}</span><span class="folder-entry-kind">${kind}</span></a></li>`;
  });
  return `<ul class="folder-list">${items.join('')}</ul>`;
}

function badAboutEntries(sourceDir, relativeDir) {
  return sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name)))
    .map((entry) => ({
      label: publicLabel(displayName(entry.name)),
      href: urlPath(path.join(relativeDir, outputName(entry.name, path.join(relativeDir, entry.name)))),
    }));
}

// Homepage: a single inline strip, unchanged in spirit.
function renderBadAboutLinks(sourceDir, relativeDir) {
  const entries = badAboutEntries(sourceDir, relativeDir);
  if (!entries.length) return '<p>No entries yet.</p>';
  const links = entries.map((entry, index) => `${index ? '<span class="bad-about-separator" aria-hidden="true"> | </span>' : ''}<a href="${entry.href}">${escapeHtml(entry.label)}</a>`).join('');
  return `<div class="bad-about-links"><span class="bad-about-label">What's bad about:</span> ${links}</div>`;
}

// Collection page: its own masthead, numbered archive, still part of the site.
function renderBadAboutCollection(sourceDir, relativeDir) {
  const entries = badAboutEntries(sourceDir, relativeDir);
  if (!entries.length) return '<p>No entries yet.</p>';
  const rows = entries.map((entry) => `<li><a href="${entry.href}">${escapeHtml(entry.label)}</a></li>`).join('');
  return `<ul class="two-col-list">${rows}</ul>`;
}

function collectTaggedEntries(directory = contentRoot, relativeDir = '') {
  const entries = [];
  for (const entry of sortEntries(fs.readdirSync(directory, { withFileTypes: true }))) {
    const sourcePath = path.join(directory, entry.name);
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...collectTaggedEntries(sourcePath, relativePath));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase() === 'index.md' || isHiddenContent(relativePath)) continue;
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    const note = parseProperties(sourceText);
    if (!note.tags.length) continue;
    const destinationName = outputName(entry.name, relativePath);
    const destinationPath = path.join(path.dirname(relativePath), destinationName);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationPath}.html` : destinationPath;
    entries.push({
      title: isJournalPath(path.dirname(relativePath)) ? fixedJournalTitle(sourceText, publicLabel(displayName(entry.name))) : markdownTitle(note.body, publicLabel(displayName(entry.name))),
      path: relativePath,
      href: urlPath(linkPath),
      tags: note.tags,
      date: entryDate(relativePath, entry.name),
    });
  }
  return entries;
}

// A sortable YYYY-MM-DD date for an entry, or '' when it has none. Journal files
// carry the day in their name; other notes fall back to a date in the text.
function entryDate(relativePath, fileName) {
  const fromName = fileName.match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
  if (fromName) return `${fromName[3]}-${fromName[2]}-${fromName[1]}`;
  const yearDir = relativePath.split(path.sep).find((part) => /^\d{4}$/.test(part));
  return yearDir ? `${yearDir}-01-01` : '';
}

function renderTagIndex(entries) {
  const tags = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!tags.has(tag)) tags.set(tag, []);
      tags.get(tag).push(entry);
    }
  }
  const sortedTags = [...tags.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  if (!sortedTags.length) return '<p>No tags yet.</p>';
  const items = sortedTags
    .map((tag) => `<li><a href="${urlPath(path.join('tags', tagSlug(tag)))}/">${escapeHtml(tag)}</a>(${tags.get(tag).length})</li>`)
    .join('');
  return `<ul class="tag-list">${items}</ul>`;
}

function renderTaggedNotes(entries, tag) {
  const matching = entries
    .filter((entry) => entry.tags.some((entryTag) => entryTag.toLowerCase() === tag.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  const items = matching.map((entry) => `<li><a href="${entry.href}">${escapeHtml(entry.title)}</a></li>`).join('');
  const empty = matching.length ? '' : '<p>No notes with this tag.</p>';
  return `<h2>#${escapeHtml(tag)}</h2><ul class="plain-list">${items}</ul>${empty}`;
}


function renderHomeCategories() {
  // Everything at the top level of Content/ appears in the Browse box: pages and
  // folders alike, so anything added to the vault shows up here without a code
  // change. Welcome.md is the home page itself and is excluded.
  const entries = sortEntries(fs.readdirSync(contentRoot, { withFileTypes: true }))
    .filter((entry) => !['index.md', 'welcome.md'].includes(entry.name.toLowerCase()) && !isHiddenContent(entry.name))
    .filter((entry) => entry.isDirectory() || entry.name.toLowerCase().endsWith('.md'));
  if (!entries.length) return '';
  const links = entries.map((entry, index) => {
    const separator = index ? '<span class="category-separator" aria-hidden="true"> | </span>' : '';
    if (entry.isDirectory()) {
      return `${separator}<a class="category-link" href="${urlPath(entry.name)}/">${escapeHtml(publicLabel(entry.name))}</a>`;
    }
    const relativePath = entry.name;
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationName}.html` : destinationName;
    return `${separator}<a class="category-link" href="${urlPath(linkPath)}">${escapeHtml(publicLabel(displayName(destinationName)))}</a>`;
  }).join('');
    return links ? `<h2>Browse</h2><div class="category-links">${links}</div>` : '';
}

function outputName(fileName, relativePath) {
  if (fileName.toLowerCase() === 'index.md') return 'index.html';
  const baseName = fileName.replace(/\.md$/i, '');
  if (/\.(txt|html)$/i.test(baseName)) return slugify(baseName);
  // Journal entries are addressed by day number, not by the author's date, so the
  // URL matches the label on the page: 07768, not 17-11-2026.
  if (isJournalPath(relativePath)) {
    const day = dayFromName(fileName);
    return day === null ? `${slugify(baseName)}.html` : `${formatDay(day)}.html`;
  }
  return `${slugify(baseName)}.html`;
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'page';
}

function isTextOutput(fileName, relativePath) {
  return outputName(fileName, relativePath).toLowerCase().endsWith('.txt');
}

function markdownTitle(value, fallback) {
  // A single letter or digit is a grouping heading (`# A` in a readings list), not
  // a document title, so it is skipped in favour of the fallback.
  const heading = value.match(/^#\s+(.+)$/m);
  if (!heading) return fallback;
  const title = heading[1].trim();
  if (/^[A-Za-z0-9]$/.test(title)) return fallback;
  return title;
}

function listSortText(value) {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function sortListItems(items, listType) {
  // Ordered lists keep the author's numbering; bullets are always A-Z.
  if (listType === 'ol') return items.sort((a, b) => a.number - b.number);
  return items.sort((a, b) => listSortText(a.text).localeCompare(listSortText(b.text), undefined, { sensitivity: 'base' }));
}

// ---------------------------------------------------------------------------
// Markdown engine
//
// A block parser (headings, lists, checklists, quotes, rules, code fences,
// tables, alignment markers, paragraphs) driving an inline parser (emphasis,
// strikethrough, code, highlight, links, images, autolinks, math, escapes).
//
// Everything is escaped up front, so raw HTML in a note is inert except for the
// small allowlist of tags handled here (<u>, <br>, and the alignment wrappers).
// ---------------------------------------------------------------------------

// Opening and closing alignment wrappers, each on its own line. A closing tag
// simply resets alignment; it is never emitted as text.
const ALIGN_OPEN = /^<(justify|center|centre|right)>\s*$/i;
const ALIGN_CLOSE = /^<\/(justify|center|centre|right)>\s*$/i;

function isTableRow(line) {
  return /^\s*\|?.+\|.+\|?\s*$/.test(line);
}

function isTableDivider(line) {
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

// Alignment for each column, from the :--- / :---: / ---: divider row.
function tableAlignments(divider) {
  return tableCells(divider).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

// Header text as it should appear in a data-label: no markdown syntax, no tags.
function plainCell(cell) {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~=]/g, '')
    .trim();
}

// Splits a fenced code block opening (``` or ~~~) into language and fence.
function codeFence(line) {
  const match = line.match(/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/);
  if (!match) return null;
  return { fence: match[1], lang: match[2] || '' };
}

function indentWidth(line) {
  const match = line.match(/^[ \t]*/)[0];
  return match.replace(/\t/g, '    ').length;
}

// List item: bullet or ordered, with nesting depth from leading spaces.
function listItemMatch(line) {
  const match = line.match(/^([ \t]*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
  if (!match) return null;
  const depth = Math.floor(match[1].replace(/\t/g, '    ').length / 2);
  const ordered = /\d/.test(match[2]);
  let text = match[3];
  let checked = null;
  const task = text.match(/^\[([ xX])\]\s+(.*)$/);
  if (task) {
    checked = task[1].toLowerCase() === 'x';
    text = task[2];
  }
  return { depth, ordered, text, checked };
}

// Renders a flat item list (each with a depth) into properly nested HTML.
// A stack keeps one <li> open at each level; a deeper item opens a new list
// inside the current <li>, a shallower one closes back up to its level.
function renderListTree(items, relativeDir) {
  if (!items.length) return '';
  let html = '';
  const open = []; // { tag } for each currently open list

  const closeToList = (depth) => {
    while (open.length > depth) html += `</li></${open.pop().tag}>`;
  };

  for (const item of items) {
    const tag = item.ordered ? 'ol' : 'ul';
    if (open.length === 0) {
      html += `<${tag}>`;
      open.push({ tag });
    } else if (item.depth > open.length - 1) {
      // Nest inside the still-open parent <li>.
      while (open.length - 1 < item.depth) {
        html += `<${tag}>`;
        open.push({ tag });
      }
    } else {
      closeToList(item.depth + 1);
      if (open.length === 0) {
        html += `<${tag}>`;
        open.push({ tag });
      } else if (open[open.length - 1].tag !== tag) {
        html += `</li></${open.pop().tag}><${tag}>`;
        open.push({ tag });
      } else {
        html += '</li>';
      }
    }
    const box = item.checked === null ? '' : `<input type="checkbox" disabled${item.checked ? ' checked' : ''}> `;
    const cls = item.checked === null ? '' : ' class="task"';
    html += `<li${cls}>${box}${inlineMarkdown(item.text, relativeDir)}`;
  }
  while (open.length) html += `</li></${open.pop().tag}>`;
  return html;
}

function markdownToHtml(value, relativeDir = '', options = {}) {
  // preserveLines: treat every line break as a hard break. Plain-text books are
  // written that way - a chapter list, a dedication, an author line on its own
  // row - and joining those lines into one paragraph destroys the layout.
  const preserveLines = options.preserveLines === true;
  const lines = value.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let alignment = null;
  let listBuffer = [];
  let inList = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = preserveLines ? paragraph.join('\n') : paragraph.join(' ');
    const classes = [];
    if (alignment) classes.push(`align-${alignment}`);
    if (text.length > 120) classes.push('prose');
    if (preserveLines && text.length <= 40 && !text.includes('\n')) classes.push('short');
    const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
    output.push(`<p${cls}>${inlineMarkdown(text, relativeDir, preserveLines)}</p>`);
    paragraph = [];
    alignment = null;
  };

  const flushList = () => {
    if (!inList) return;
    output.push(renderListTree(listBuffer, relativeDir));
    listBuffer = [];
    inList = false;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  // Letter index: consecutive `# A`-style headings, each followed by entries, are
  // collected into ONE list so the whole run flows in two columns instead of every
  // letter opening its own narrow block.
  let letterRun = null; // [{ letter, items: [text] }]
  const emitLetterRun = () => {
    if (!letterRun) return;
    const items = letterRun
      .map((group) => group.items.map((text) => `<li><span class="letter-mark">${escapeHtml(group.letter)}</span>${inlineMarkdown(text, relativeDir)}</li>`).join('\n'))
      .join('\n');
    output.push(`<ul class="letter-index">${items}</ul>`);
    letterRun = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] || '';

    // Fenced code block: consume verbatim until the matching fence.
    const fence = codeFence(line);
    if (fence) {
      flushAll();
      emitLetterRun();
      const body = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^\\s*${fence.fence[0]}{${fence.fence.length},}\\s*$`).test(lines[j])) {
        body.push(lines[j]);
        j += 1;
      }
      const langAttr = fence.lang ? ` class="language-${escapeAttr(fence.lang)}"` : '';
      output.push(`<pre><code${langAttr}>${escapeHtml(body.join('\n'))}</code></pre>`);
      i = j;
      continue;
    }

    // Alignment wrapper: either on its own line (applies to the next block) or
    // wrapping a paragraph inline, as in <justify>text</justify>.
    const inlineWrap = line.match(/^\s*<(justify|center|centre|right)>([\s\S]*?)<\/\1>\s*$/i);
    if (inlineWrap) {
      flushAll();
      emitLetterRun();
      const kind = inlineWrap[1].toLowerCase() === 'centre' ? 'center' : inlineWrap[1].toLowerCase();
      output.push(`<p class="align-${kind}">${inlineMarkdown(inlineWrap[2].trim(), relativeDir)}</p>`);
      continue;
    }
    const alignMatch = line.trim().match(ALIGN_OPEN);
    if (alignMatch) {
      flushAll();
      emitLetterRun();
      const kind = alignMatch[1].toLowerCase();
      alignment = kind === 'centre' ? 'center' : kind;
      continue;
    }
    if (ALIGN_CLOSE.test(line.trim())) {
      flushAll();
      emitLetterRun();
      alignment = null;
      continue;
    }

    // Thematic break (and a plain-text rule of ===, which books use as a divider).
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line) || /^\s*=+\s*$/.test(line)) {
      flushAll();
      // Directly under a letter heading this rule is the heading's underline, not
      // a section break: keep the letter run open so its entries stay in the list.
      if (!letterRun) output.push('<hr>');
      continue;
    }

    // Table: a row followed by a divider row.
    if (isTableRow(line) && isTableDivider(next)) {
      flushAll();
      emitLetterRun();
      alignment = null;
      const header = tableCells(line);
      const aligns = tableAlignments(next);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(tableCells(lines[j]));
        j += 1;
      }
      const cellAlign = (index) => aligns[index] && aligns[index] !== 'left' ? ` class="ta-${aligns[index]}"` : '';
      const head = header.map((cell, index) => `<th${cellAlign(index)}>${inlineMarkdown(cell, relativeDir)}</th>`).join('');
      const body = rows.map((row) => `<tr>${row.map((cell, index) => `<td${cellAlign(index)} data-label="${escapeAttr(plainCell(header[index] ?? ''))}">${inlineMarkdown(cell, relativeDir)}</td>`).join('')}</tr>`).join('');
      output.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      i = j - 1;
      continue;
    }

    // Blank line closes a paragraph or list.
    if (!line.trim()) {
      // Inside a letter run a blank line separates entries; the list stays open
      // until the next non-letter heading, so the whole run flows as one list.
      if (letterRun) continue;
      // A blank line inside a list followed by another item keeps the list open.
      if (inList && listItemMatch(next)) continue;
      flushAll();
      continue;
    }

    // Heading.
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const text = heading[2].trim();
      const html = `<h${level}>${inlineMarkdown(text, relativeDir)}</h${level}>`;
      // A single-letter heading starts or continues a letter run.
      if (level <= 2 && /^[A-Z]$/i.test(text)) {
        if (!letterRun) letterRun = [];
        letterRun.push({ letter: text, items: [] });
      } else {
        emitLetterRun();
        output.push(html);
      }
      continue;
    }

    // Blockquote (nested: >> and >>>).
    const quote = line.match(/^\s*(>{1,})\s?(.*)$/);
    if (quote) {
      flushAll();
      emitLetterRun();
      const depth = quote[1].length;
      output.push(`<blockquote${depth > 1 ? ` class="quote-${Math.min(depth, 3)}"` : ''}>${inlineMarkdown(quote[2], relativeDir)}</blockquote>`);
      continue;
    }

    // List item (bullet, ordered, or task).
    const item = listItemMatch(line);
    if (item) {
      flushParagraph();
      inList = true;
      listBuffer.push(item);
      continue;
    }

    // Inside a letter run, a non-blank line is an entry. A line directly after a
    // link is that entry's note, folded into the same item.
    if (letterRun) {
      flushParagraph();
      const group = letterRun[letterRun.length - 1];
      const isLinkLine = /^\s*\[[^\]]+\]\([^)\s]+[^)]*\)/.test(line);
      const last = group.items[group.items.length - 1];
      if (last !== undefined && !isLinkLine && /^\s*\[[^\]]+\]\([^)\s]+[^)]*\)/.test(last)) {
        group.items[group.items.length - 1] = `${last} — ${line.trim()}`;
      } else {
        group.items.push(line.trim());
      }
      continue;
    }

    // Continuation of the previous paragraph.
    if (inList && indentWidth(line) > 0) {
      listBuffer[listBuffer.length - 1].text += ` ${line.trim()}`;
      continue;
    }

    // Plain paragraph text.
    flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  emitLetterRun();
  return output.join('\n');
}

// Inline formatting. Escapes first; placeholders protect code spans so their
// contents are never treated as markdown.
function inlineMarkdown(value, relativeDir = '', preserveLines = false) {
  const codeSpans = [];
  let text = escapeHtml(value);

  // Escaped punctuation first: swap \* for a placeholder that no formatting
  // rule can match, so it survives emphasis parsing and is restored at the end.
  const escaped = [];
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!|~=$>])/g, (_, char) => {
    escaped.push(char);
    return `\u0001${escaped.length - 1}\u0001`;
  });

  // Inline code: capture with a sentinel so emphasis inside it is left alone.
  text = text.replace(/(`+)([\s\S]*?)\1/g, (_, _ticks, code) => {
    codeSpans.push(`<code>${code.trim()}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // Images before links (they share bracket syntax).
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) => {
    const t = title ? ` title="${title}"` : '';
    return `<img src="${src}" alt="${alt}"${t} loading="lazy" decoding="async">`;
  });

  // Wikilinks, then standard links.
  text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const href = resolveContentLink(target.trim(), relativeDir);
    return anchor(href, label ? escapeHtml(label.trim()) : escapeHtml(target.trim()));
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, label, href, title) => {
    const hrefAttr = resolveMarkdownLink(href, relativeDir);
    const extra = title ? ` title="${title}"` : '';
    return anchor(hrefAttr, label, extra);
  });

  // Emphasis. Order matters: bold-italic, bold, italic, strike, highlight.
  text = text
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(?=\S)([\s\S]*?\S)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/(?<![\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, '<em>$1</em>')
    .replace(/(?<![\w_])_(?=\S)([^_\n]*?\S)_(?![\w_])/g, '<em>$1</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>');

  // Math: block markers inline become display spans, then inline math.
  text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, '<span class="math-block">$1</span>')
    .replace(/(?<![\\$])\$([^$\n]+?)\$(?!\d)/g, '<span class="math">$1</span>');

  // Subscript and superscript, after math so H_2O and x^2 read correctly.
  text = text
    .replace(/(?<![\\\w])_\{([^}]{1,20})\}/g, '<sub>$1</sub>')
    .replace(/(?<![\\\w])_([A-Za-z0-9]{1,3})(?![\w{])/g, '<sub>$1</sub>')
    .replace(/\^\{([^}]{1,20})\}/g, '<sup>$1</sup>')
    .replace(/\^([A-Za-z0-9]{1,3})(?![\w{])/g, '<sup>$1</sup>');

  // LaTeX-ish commands inside math spans become readable text.
  text = text
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, '\u221a($1)');

  // Escaped punctuation: restore the literal character.
  text = text.replace(/\u0001(\d+)\u0001/g, (_, index) => escapeHtml(escaped[Number(index)]));

  // Allowlisted raw HTML: <u>, <br> (already escaped, so they arrive as entities).
  text = text
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;u&gt;/gi, '<u>')
    .replace(/&lt;\/u&gt;/gi, '</u>');

  text = linkifyBareUrls(text);

  // In a plain-text book every source line is a deliberate line break.
  if (preserveLines) text = text.replace(/\n/g, '<br>');

  // Put code spans back last so nothing above could have altered them.
  text = text.replace(/\u0000(\d+)\u0000/g, (_, index) => codeSpans[Number(index)]);
  return text;
}

// Turns plain http(s):// URLs into links. Runs on already-escaped HTML, so URLs
// inside existing anchors or attributes are untouched and links never nest.
function linkifyBareUrls(html) {
  return html
    .split(/(<a\b[^>]*>[\s\S]*?<\/a>|<code>[\s\S]*?<\/code>)/g)
    .map((part) => (part.startsWith('<a') || part.startsWith('<code>') ? part : part.replace(/https?:\/\/[^\s<]+/g, (url) => {
      const trimmed = url.replace(/[.,;:!?)\]}]+$/, '');
      const trailing = url.slice(trimmed.length);
      return `<a href="${trimmed}" target="_blank" rel="noopener noreferrer">${trimmed}</a>${trailing}`;
    })))
    .join('');
}

function resolveMarkdownLink(href, relativeDir) {
  if (/^(?:[a-z]+:|\/|#)/i.test(href)) return href;
  return resolveContentLink(href, relativeDir);
}

function findContentFile(target) {
  const normalized = target.replace(/^\.\//, '').replace(/\.(md|txt|html)$/i, '');
  const directCandidates = [normalized, `${normalized}.md`, `${normalized}.txt`, `${normalized}.html`];
  for (const candidate of directCandidates) {
    const filePath = path.join(contentRoot, candidate);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  }
  const targetName = path.basename(normalized).toLowerCase();
  const matches = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filePath);
      else if (entry.name.replace(/\.(md|txt|html)$/i, '').toLowerCase() === targetName) matches.push(filePath);
    }
  };
  walk(contentRoot);
  return matches[0] || null;
}

function resolveContentLink(target, relativeDir) {
  const cleanTarget = target.split('#')[0].trim();
  const candidate = cleanTarget.startsWith('/')
    ? findContentFile(cleanTarget.slice(1))
    : findContentFile(path.join(relativeDir, cleanTarget));
  if (!candidate) return target;
  const relativePath = path.relative(contentRoot, candidate);
  const fileName = path.basename(relativePath);
  const destinationName = outputName(fileName, relativePath);
  const destinationPath = path.join(path.dirname(relativePath), destinationName);
  return urlPath(isTextOutput(fileName, relativePath) ? `${destinationPath}.html` : destinationPath);
}

function toUsAscii(value) {
  const replacements = {
    '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '--',
    '…': '...', '•': '*', '→': '->', '←': '<-', '©': '(c)', '™': '(tm)'
  };
  const normalized = value.replace(/[“”‘’–—…•→←©™]/g, (character) => replacements[character]);
  return normalized.normalize('NFKD').replace(/[^\x00-\x7F]/g, '?');
}

function sortEntries(entries) {
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function isHiddenContent(relativePath) {
  return relativePath.toLowerCase() === 'about-me.md';
}

function formatSize(bytes) {
  if (bytes >= 1024) {
    const value = bytes >= 10240 ? `${Math.round(bytes / 1024)}` : `${(bytes / 1024).toFixed(1)}`;
    return `[${value.padStart(4, ' ')}K]`;
  }
  return `[${String(bytes).padStart(4, ' ')}]`;
}

// ASCII tree branches match tree 1.8.0's -A output style.
function renderTree(sourceDir, relativeDir = '', indent = '') {
  const inJournal = isJournalPath(relativeDir);
  let entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
  // Journal entries are named by day number, not by date, so plain A-Z puts 0955
  // before 412 and reads as random. Newest-first is the only useful order.
  if (inJournal) {
    // Files are named DD-MM-YYYY, so sort by the day number they resolve to, not
    // by the filename text. Newest first.
    entries = entries.slice().sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      const an = dayFromName(a.name);
      const bn = dayFromName(b.name);
      if (an !== null && bn !== null) return bn - an;
      if (an !== null) return -1;
      if (bn !== null) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
  const lines = [];

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      lines.push(`${indent}${branch}<a class="DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a>`);
      lines.push(...renderTree(sourcePath, relativePath, childIndent));
      return;
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      const destinationName = outputName(entry.name, relativePath);
      const publicPath = path.join(relativeDir, destinationName);
      const outputPath = path.join(outputRoot, publicPath);
      const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
      // The tree is a source listing: journal entries link to their plain-text
      // file, everything else to its page.
      const linkPath = isJournalPath(relativeDir)
        ? publicPath.replace(/\.html$/i, '.txt')
        : publicPath;
      lines.push(`${indent}${branch}<a class="EXEC" href="${urlPath(linkPath)}">${escapeHtml(publicLabel(displayName(destinationName)))}</a>`);
    }
  });

  return lines;
}

function buildFolder(sourceDir, relativeDir = '') {
  const outputDir = path.join(outputRoot, relativeDir);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const entry of sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      buildFolder(sourcePath, relativePath);
      continue;
    }

    if (!entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase() === 'index.md' || isHiddenContent(relativePath)) continue;
    const destinationName = outputName(entry.name, relativePath);
    const destinationPath = path.join(outputDir, destinationName);
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    const note = parseProperties(sourceText);
    if (isTextOutput(entry.name, relativePath)) {
      const text = toUsAscii(note.body);
      fs.writeFileSync(destinationPath, text, 'ascii');
      const readerPath = `${destinationPath}.html`;
      const readerTitle = markdownTitle(note.body, publicLabel(displayName(entry.name)));
      const readerBody = `<article class="text-viewer">${markdownToHtml(text, relativeDir)}</article>`;
      fs.writeFileSync(readerPath, layout(readerTitle, readerBody, urlPath(path.join(relativeDir, destinationName)), note.tags));
    } else {
      const title = markdownTitle(note.body, publicLabel(displayName(entry.name)));
      const isBookFile = isBooksPath(relativeDir) && !entry.isDirectory();
      const body = isMusicFile(entry.name, relativePath)
        ? renderMusicPage(sourceText)
        : isReadingsPath(relativeDir)
          ? renderReadingCategory(note.body, relativeDir)
          : isBookFile
            ? `<article class="book-viewer">${markdownToHtml(note.body, relativeDir, { preserveLines: true })}</article>`
            // Journal entries open as pages, in the same reading column the old
            // text reader used.
            : isJournalPath(relativeDir)
              ? `<article class="text-viewer">${markdownToHtml(note.body, relativeDir)}</article>`
              : markdownToHtml(isArticlesPath(relativeDir) ? sortArticleLinks(note.body) : note.body, relativeDir);
      fs.writeFileSync(destinationPath, layout(title, body, urlPath(path.join(relativeDir, destinationName)), note.tags));
      // The plain-text file is still published, and is what the file tree links to.
      if (isJournalPath(relativeDir)) {
        fs.writeFileSync(path.join(outputDir, `${formatDay(dayFromName(entry.name))}.txt`), toUsAscii(note.body), 'ascii');
      }
    }
  }

  const title = relativeDir ? path.basename(relativeDir) : 'Home';
  const folderIndexPath = path.join(sourceDir, 'index.md');
  const folderDescription = fs.existsSync(folderIndexPath)
    ? `<div class="folder-intro">${markdownToHtml(parseProperties(fs.readFileSync(folderIndexPath, 'utf8')).body, relativeDir)}</div>`
    : '';
  const listing = isJournalPath(relativeDir)
    ? renderJournalListing(sourceDir, relativeDir)
    : isArticlesPath(relativeDir)
      ? renderArticlesListing(sourceDir, relativeDir)
    : isReadingsPath(relativeDir)
      ? renderReadingsListing(sourceDir, relativeDir)
    : isBooksPath(relativeDir)
      ? renderBooksListing(sourceDir, relativeDir)
    : isBadAboutPath(relativeDir)
      ? renderBadAboutCollection(sourceDir, relativeDir)
    : renderFolderListing(sourceDir, relativeDir);
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  // Section renderers supply their own header and intro, so no outer heading is
  // added for them. Generic folders still get the plain title.
  // No folder-name heading on any page: the breadcrumb already names it, and a
  // generated <h2> would be a label the author never wrote. index.md content
  // comes first, then the listing.
  const pageBody = `${folderDescription}${listing}`;
  fs.writeFileSync(path.join(outputDir, 'index.html'), layout(publicLabel(title), pageBody, currentPath));
}

function countDirectories(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .reduce((total, entry) => total + 1 + countDirectories(path.join(directory, entry.name)), 0);
}

function countFiles(directory, relativeDir = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .reduce((total, entry) => {
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return total + countFiles(path.join(directory, entry.name), relativePath);
      return total + (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(relativePath) ? 1 : 0);
    }, 0);
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
const badgesSourceDir = path.join(root, 'assets', 'badges');
const badgesOutputDir = path.join(outputRoot, 'badges');
fs.mkdirSync(badgesOutputDir, { recursive: true });
for (const badge of fs.readdirSync(badgesSourceDir)) {
  fs.copyFileSync(path.join(badgesSourceDir, badge), path.join(badgesOutputDir, badge));
}
const faviconSource = path.join(root, 'assets', 'favicon.svg');
if (fs.existsSync(faviconSource)) fs.copyFileSync(faviconSource, path.join(outputRoot, 'favicon.svg'));
// Charter, self-hosted so every device gets the same face. Bitstream's grant
// permits redistribution provided the notice travels with the files.
const fontsSourceDir = path.join(root, 'assets', 'fonts');
const fontsOutputDir = path.join(outputRoot, 'fonts');
if (fs.existsSync(fontsSourceDir)) {
  fs.mkdirSync(fontsOutputDir, { recursive: true });
  for (const file of fs.readdirSync(fontsSourceDir)) {
    fs.copyFileSync(path.join(fontsSourceDir, file), path.join(fontsOutputDir, file));
  }
}
// The stylesheet is one file for the whole site instead of 23KB of inline CSS on
// every page, so it downloads once and is reused for every later navigation.
fs.writeFileSync(path.join(outputRoot, `style.${CSS_HASH}.css`), SITE_CSS);
// Keep the old plain name working so anything that bookmarked it does not 404.
fs.writeFileSync(path.join(outputRoot, 'style.css'), SITE_CSS);
buildFolder(contentRoot);

const welcomeSource = fs.existsSync(path.join(contentRoot, 'Welcome.md'))
  ? fs.readFileSync(path.join(contentRoot, 'Welcome.md'), 'utf8')
  : '';
const welcomeNote = parseProperties(welcomeSource);
const welcomeHeading = markdownTitle(welcomeNote.body, '');
const homeBody = `${welcomeHeading ? '' : '<h2>Welcome</h2>'}${markdownToHtml(welcomeNote.body, '')}${renderHomeCategories()}`;
fs.writeFileSync(path.join(outputRoot, 'index.html'), layout('Home', homeBody, '/', welcomeNote.tags));

const taggedEntries = collectTaggedEntries();
const tagsDir = path.join(outputRoot, 'tags');
fs.mkdirSync(tagsDir, { recursive: true });
fs.writeFileSync(path.join(tagsDir, 'index.html'), layout('Tags', renderTagIndex(taggedEntries), '/tags/'));
const tagNames = [...new Set(taggedEntries.flatMap((entry) => entry.tags))]
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
for (const tag of tagNames) {
  const tagPath = path.join('tags', tagSlug(tag));
  const tagDir = path.join(outputRoot, tagPath);
  fs.mkdirSync(tagDir, { recursive: true });
  fs.writeFileSync(path.join(tagDir, 'index.html'), layout(`#${tag}`, renderTaggedNotes(taggedEntries, tag), `${urlPath(tagPath)}/`));
}

const fileTreeDir = path.join(outputRoot, 'file-tree');
fs.mkdirSync(fileTreeDir, { recursive: true });
const rootTree = renderTree(contentRoot);
const rootListing = rootTree.length ? `<pre>${rootTree.join('\n')}</pre>` : '<p>No entries yet.</p>';
fs.writeFileSync(path.join(fileTreeDir, 'index.html'), layout('File Tree', `<h2>File Tree</h2>${rootListing}<p>${countDirectories(contentRoot)} directories, ${countFiles(contentRoot)} files</p>`, '/file-tree/'));
fs.writeFileSync(path.join(outputRoot, '404.html'), layout('Page not found', '<h2>Page not found</h2><p><a href="/">Return home</a> or <a href="/file-tree/">browse the File Tree</a>.</p>', ''));

console.log(`Built ${outputRoot}`);

// Exported so the markdown engine can be unit-tested without running a build.
if (require.main !== module) module.exports = { markdownToHtml, inlineMarkdown };
