const fs = require('fs');
const path = require('path');

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
const availableNavigation = navigation.filter((item) => !item.source || fs.existsSync(path.join(contentRoot, item.source)));

// GoatCounter's pageview script. It is what makes the visitor count real: the
// footer pill only reads the total, this records the visit. GoatCounter identifies
// unique visits with a salted hash of IP + User-Agent and sets no cookies.
const GOATCOUNTER_SITE = (process.env.GOATCOUNTER_SITE || 'amnshk').trim().replace(/\.goatcounter\.com\/?$/i, '');

function goatcounterScript() {
  return `<script data-goatcounter="https://${GOATCOUNTER_SITE}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`;
}

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
  <style>
    :root { color-scheme: light; --page-bg: #f4f1e8; --surface: #f4f1e8; --text: #111; --link: blue; --exec: green; --hover: yellow; --border: transparent; --muted: #444; }
    /* One column width shared by the masthead, the rule and the ticker, so nothing
       can drift outside the site's content edge. */
    /* One column width shared by masthead, rules and ticker. A fixed rem length,
       not ch: ch resolves against each element's own font-size, so the header and
       footer rules came out at different widths. */
    :root { --content-w: 52rem; }
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, Georgia, serif; font-size: 17px; line-height: 1.45; color: var(--text); background: var(--surface); margin: 0; padding: 0; }
    .site-shell { width: auto; max-width: 1100px; min-height: 100dvh; margin: 0 auto; background: var(--surface); }
    @media (min-width: 1101px) { .site-shell { border-left: 1px solid #d9d3c4; border-right: 1px solid #d9d3c4; } }
    header, footer { text-align: center; padding: 1.25rem 1.5rem; }
    /* Header and footer share the same horizontal padding, so a full-width rule
       inside either ends at the same x on both sides. */
    header, footer { padding-left: 1rem; padding-right: 1rem; }
    header { padding-top: .5rem; padding-bottom: .35rem; }
    main { padding: 0 1.5rem 1rem; }
    header h1 { margin: 0; font-family: "Times New Roman", Times, Georgia, serif; font-size: clamp(1.7rem, 5vw, 2.5rem); font-weight: bold; line-height: 1.1; }
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
      animation: ticker-scroll var(--ticker-duration, 60s) linear infinite;
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
    .journal-ticker-static { display: none; }
    nav a { font-size: 1rem; }
    nav ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 1.1rem; padding: .15rem 0; margin: 0 auto; list-style: none; max-width: var(--content-w); }
    nav li::after { content: none; }
    nav a[aria-current="page"] { font-weight: bold; }
    hr { display: none; }
    /* Trail centred, Back pinned to the left edge of the content column. */
    .breadcrumbs { position: relative; margin: 1.25rem auto; max-width: var(--content-w); text-align: center; font-size: .85rem;
      letter-spacing: .04em; }
    .back-link { position: absolute; left: 0; top: 0; white-space: nowrap; color: var(--exec) !important; }
    .back-link:hover { color: black !important; }
    a:link, a:visited { color: var(--link); text-decoration: none; }
    a:hover { color: black !important; text-decoration-line: underline; text-decoration-style: dotted; background-color: var(--hover); }
    .DIR { color: var(--link) !important; }
    .EXEC { color: var(--exec) !important; }
    main { min-height: 0; text-align: center; }
    main h2 { font-size: clamp(1.3rem, 3.5vw, 1.75rem); line-height: 1.2; margin: 0 0 .6rem; }
    main > p { max-width: 88ch; margin: 1rem auto; text-align: left; }
    /* On archive pages the folder's own prose aligns to the section column, so the
       page has one left edge instead of two competing ones. */
    /* Same column as the section below it, so the page has one left edge. */
    main > .folder-intro { max-width: var(--content-w); margin: 0 auto 1rem; text-align: left; }
    main > .folder-intro p { margin: 0 0 .7rem; text-align: left; }
    /* Lists live inside the centred text column, so they must not add a second
       indent on top of it - that pushed markers outside the measure. */
    main ul, main ol { max-width: 88ch; margin: 1rem auto; padding-left: 1.5rem; text-align: left; }
    main li { padding-left: .15rem; }
    main li > p { margin: .35rem 0; }
    pre { max-width: 100%; overflow-x: auto; margin: 1rem auto; text-align: left; width: max-content; }
    .text-viewer { max-width: 88ch; margin: 1rem auto; padding: 0; font-family: inherit; font-size: clamp(1.05rem, 2.5vw, 1.22rem); line-height: 1.8; overflow-wrap: anywhere; text-align: left; }
    .text-viewer p, .text-viewer ul, .text-viewer ol, .text-viewer blockquote { margin: 1rem 0; }
    /* Plain old-school lists: no numbers, no rules, no described rows. */
    .plain-list { width: 100%; max-width: var(--content-w); margin: .4rem auto 1rem; padding: 0 0 0 1.4rem; list-style: disc; text-align: left; }
    .plain-list li { margin: 0; line-height: 1.5; }
    .tag-list { width: 100%; max-width: var(--content-w); margin: .4rem auto 1rem; padding: 0 0 0 1.4rem; list-style: disc; text-align: left; columns: 2 16rem; column-gap: 2.5rem; }
    .tag-list li { margin: 0; line-height: 1.5; break-inside: avoid; }
    .journal-list { width: 100%; max-width: var(--content-w); margin: .4rem auto 1rem; padding: 0; list-style: none; text-align: left; }
    .journal-entry { padding: .3rem 0; }
    .journal-entry-link { display: block; }
    .journal-entry-title { display: block; font-size: 1rem; }
    /* Date centred under each entry title, as on a hand-kept diary page. */
    .journal-entry-date { display: block; margin-top: 0; font-size: .88rem; color: var(--text); text-align: center; }
    .category-links { display: inline-flex; max-width: 100%; box-sizing: border-box; flex-wrap: wrap; align-items: center; justify-content: center; gap: .35rem; padding: .75rem 1rem; border: 1px solid var(--text); }
    .category-link { color: black; font-size: clamp(1rem, 2.5vw, 1.1rem); }
    .bad-about-links { max-width: 100%; margin: 1rem auto 2rem; text-align: center; font-size: clamp(1rem, 2.4vw, 1.15rem); font-style: italic; font-weight: bold; }
    .bad-about-label { color: var(--text); }
    .bad-about-separator { color: var(--text); }
    .table-scroll { max-width: 88ch; margin: 1rem auto; overflow-x: auto; }
    table { width: 100%; max-width: 100%; margin: 1rem auto; border-collapse: collapse; text-align: left; table-layout: auto; }
    th, td { padding: .35rem .75rem; vertical-align: top; border-bottom: 1px dotted var(--text); overflow-wrap: anywhere; }
    th { border-bottom: 1px solid var(--text); white-space: normal; }
    td { white-space: normal; }
    @media (max-width: 40rem) {
      table, thead, tbody, tr, td { display: block; width: 100%; }
      thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      tr { padding: .6rem 0; border-bottom: 1px dotted var(--text); }
      td { padding: .15rem 0; border: 0; }
      td::before { content: attr(data-label); display: block; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
      td:empty { display: none; }
    }
    .books-list { max-width: 60ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .books-list li { padding: .75rem 0; }
    .book-entry { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .book-info { min-width: 0; }
    .books-list a { font-size: 1.05rem; }
    .read-button { flex: 0 0 auto; padding: .35rem .65rem; color: var(--text) !important; }
    .read-button:hover { color: black !important; text-decoration-line: underline; text-decoration-style: dotted; background-color: var(--hover); }
    .book-entry:hover .book-title { text-decoration-line: underline; text-decoration-style: dotted; }
    .books-list .DIR:hover { background-color: var(--hover); }
    .book-title, .book-author { display: block; }
    .book-author { margin-top: .25rem; font-size: .9rem; }
    .article-categories { max-width: 60ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .article-category { padding: .8rem 0; }
    .article-category-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .article-category-title { font-size: 1.05rem; }
    .article-category-count { white-space: nowrap; font-size: .9rem; }
    .folder-list { max-width: 68ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .folder-entry { padding: .8rem 0; }
    .folder-entry-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .folder-entry-title { font-size: 1.05rem; }
    .folder-entry-kind { white-space: nowrap; font-size: .9rem; color: var(--text); }
    .tags-page { max-width: 68ch; margin: 1rem auto; text-align: left; }
    .tag-list { margin: 1rem auto; padding-left: 1.25rem; list-style: disc; text-align: left; }
    .tagged-notes { margin: 1rem 0; padding: 0; list-style: none; }
    .tag-entry, .tagged-note { padding: .8rem 0; }
    .tag-link, .tagged-note-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .tag-name, .tagged-note-title { font-size: 1.05rem; }
    .tagged-note-path { white-space: nowrap; font-size: .9rem; }
    .note-tags { max-width: 88ch; margin: 1rem auto; text-align: left; font-size: .95rem; }
    .music-page { max-width: 62ch; margin: 1rem auto; text-align: left; }
    .album-list { display: grid; gap: .75rem; margin: 1rem 0; padding: 0; list-style: none; }
    .album-card { padding: .25rem 0; }
    .album-link { display: grid; grid-template-columns: 1fr auto; gap: .25rem 1rem; align-items: center; padding: .85rem 1rem; }
    .album-name { font-size: 1.1rem; }
    .album-artist { grid-column: 1; font-size: .9rem; color: var(--text); }
    .album-action { grid-column: 2; grid-row: 1 / span 2; }
    .category-link { color: var(--text); }
    .category-separator { margin: 0 .25rem; }
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
    .footer-meta { display: flex; justify-content: center; align-items: baseline; flex-wrap: wrap; gap: 1rem; }
    .footer-meta p { margin: 0; }
    .visit-counter { display: flex; align-items: center; justify-content: center; gap: .35rem; min-height: 22px; margin-top: .75rem; font-size: .85rem; line-height: 1; color: var(--muted); }
    .visit-counter img { display: block; height: 22px; width: auto; image-rendering: pixelated; }

    /* =======================================================================
       SECTION LAYOUTS
       Archive pages share a small typographic vocabulary rather than a common
       template: a left-aligned column, a small caps-ish label, an index of
       numbered rows and a muted meta line. Each section then composes those
       pieces in its own arrangement so no two pages read the same.
       ====================================================================== */
    .section { max-width: var(--content-w); margin: 0 auto 1rem; text-align: left; }
    /* main is centred by default; archive content is always flush left. */
    .section *, .collection * { text-align: left; }
    .section-intro { max-width: 62ch; margin: 0 0 2rem; }
    .section-intro p { margin: 0 0 .6rem; }
    .section-label { display: block; margin: 0 0 .5rem; font-size: .68rem; letter-spacing: .22em; text-transform: uppercase; color: var(--exec); }
    .section-title { margin: 0 0 .35rem; font-size: 1.55rem; font-weight: bold; line-height: 1.15; text-align: left; }
    .section-dek { margin: 0; max-width: 58ch; font-size: .9rem; color: var(--muted); }
    .section-count { display: block; margin-top: .55rem; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--exec); }
    .rule { border: 0; border-top: 1px dotted var(--text); margin: 0 0 .2rem; display: block; }

    /* Index rows: number | title | meta. Used by tags, articles, readings. */
    .index { margin: 0; padding: 0; list-style: none; counter-reset: idx; }
    .index > li { display: grid; grid-template-columns: 2.6rem minmax(0, 1fr) auto;
      align-items: baseline; gap: 0 .9rem; padding: .55rem 0; border-bottom: 1px dotted var(--text); }
    .index > li:first-child { border-top: 1px solid var(--text); }
    .index-num { font-size: .74rem; color: var(--exec); letter-spacing: .08em; text-align: right; font-variant-numeric: tabular-nums; }
    .index-title { font-size: 1rem; line-height: 1.35; }
    .index-title a { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .18em; }
    .index-desc { display: block; margin-top: .1rem; font-size: .82rem; color: var(--muted); }
    .index-meta { font-size: .74rem; color: var(--exec); white-space: nowrap; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
    .index-foot { margin: .9rem 0 0; font-size: .74rem; letter-spacing: .1em; text-transform: uppercase; color: var(--exec); }

    /* Tags: a dense subject index, two columns on wide screens. */
    .tag-index { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2.5rem; margin: 0; padding: 0; list-style: none;
      border-top: 1px solid var(--text); }
    .tag-index > li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: .75rem;
      padding: .6rem 0; border-bottom: 1px dotted var(--text); }
    .tag-index .tag-name { font-size: 1rem; }
    .tag-index .tag-count { font-size: .74rem; color: var(--exec); white-space: nowrap; font-variant-numeric: tabular-nums; letter-spacing: .04em; }

    /* Articles: a featured slot above a numbered archive. */
    .feature { margin: 0 0 2.4rem; padding: 0 0 1.4rem; border-bottom: 1px solid var(--text); }
    .feature-label { display: block; margin-bottom: .45rem; font-size: .66rem; letter-spacing: .24em; text-transform: uppercase; color: var(--exec); }
    .feature-title { margin: 0 0 .4rem; font-size: clamp(1.5rem, 3.2vw, 2.05rem); line-height: 1.15; text-align: left; }
    .feature-title a { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .16em; }
    .feature-desc { margin: 0 0 .55rem; max-width: 56ch; font-size: .92rem; color: var(--muted); }
    .feature-meta { font-size: .74rem; color: var(--exec); letter-spacing: .06em; text-transform: uppercase; }
    .archive-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
      padding-bottom: .35rem; margin-bottom: 0; border-bottom: 1px solid var(--text); }
    .archive-head span { font-size: .68rem; letter-spacing: .2em; text-transform: uppercase; color: var(--exec); }

    /* Journal: year index, month grid, and a monochrome activity calendar. */
    .year-head { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.6rem; padding-bottom: .5rem; border-bottom: 1px solid var(--text); }
    .year-num { font-size: 2rem; line-height: 1; font-weight: bold; letter-spacing: .02em; }
    .year-meta { font-size: .74rem; letter-spacing: .12em; text-transform: uppercase; color: var(--exec); }
    .month-index { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2.5rem; margin: 0 0 2.4rem; padding: 0; list-style: none; }
    .month-index > li { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr) auto; align-items: baseline; gap: .6rem;
      padding: .5rem 0; border-bottom: 1px dotted var(--text); }
    .month-name { font-size: .95rem; }
    .month-bar { height: 6px; align-self: center; background: repeating-linear-gradient(to right, var(--text) 0 2px, transparent 2px 4px); opacity: .35; }
    .month-count { font-size: .74rem; color: var(--exec); white-space: nowrap; font-variant-numeric: tabular-nums; }

    /* Writing-activity calendar: one cell per day, filled where an entry exists. */
    .activity { margin: 0 0 .6rem; }
    .activity-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: .6rem; }
    .activity-head span { font-size: .68rem; letter-spacing: .2em; text-transform: uppercase; color: var(--exec); }
    /* 6 months per row on desktop so each day cell stays large enough to see. */
    .activity-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1rem 1.6rem; }
    .activity-month { display: grid; gap: .3rem; }
    .activity-month-label { font-size: .64rem; letter-spacing: .12em; color: var(--exec); text-transform: uppercase; }
    .activity-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; max-width: 12rem; }
    .activity-day { aspect-ratio: 1; min-width: 8px; border: 1px solid rgba(17,17,17,.22); }
    .activity-day.is-empty { border-style: dotted; }
    .activity-day.is-written { background: var(--text); border-color: var(--text); }
    .activity-legend { margin: .5rem 0 0; font-size: .66rem; letter-spacing: .08em; text-transform: uppercase; color: var(--exec); }

    /* Journal entries in a month: date as an understated gutter, text prominent. */
    .entry-list { margin: 0; padding: 0; list-style: none; }
    .entry { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 1.5rem;
      padding: 1.1rem 0; border-bottom: 1px dotted var(--text); }
    .entry:first-child { border-top: 1px solid var(--text); }
    .entry-date { font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--exec); white-space: nowrap; }
    .entry-weekday { display: block; margin-top: .15rem; font-size: .66rem; color: var(--muted); text-transform: none; letter-spacing: .02em; }
    .entry-body { min-width: 0; font-size: 1rem; line-height: 1.65; }
    .entry-body p { margin: 0 0 .6rem; }
    .entry-body p:last-child { margin-bottom: 0; }
    .entry-body h1, .entry-body h2, .entry-body h3 { margin: 0 0 .4rem; font-size: 1rem; text-align: left; }
    .entry-body ul, .entry-body ol { margin: .4rem 0 .6rem; padding-left: 1.35rem; }
    .entry-body li { margin: .2rem 0; }
    .entry-body li::marker { color: var(--exec); }
    .entry-heading { margin: 0 0 .35rem; font-weight: bold; }
    .entry-empty { margin: 0; font-size: .85rem; color: var(--muted); }

    /* Readings: a research catalogue, recent additions first. */
    .catalogue { margin: 0 0 2.6rem; }
    .recent-list { margin: 0; padding: 0; list-style: none; }
    .recent-list > li { padding: .6rem 0; border-bottom: 1px dotted var(--text); display: grid; grid-template-columns: minmax(0,1fr) auto; gap: .75rem; align-items: baseline; }
    .recent-list > li:first-child { border-top: 1px solid var(--text); }
    .subject-list { margin: 0; padding: 0; list-style: none; }
    .subject-list > li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 1rem;
      padding: .65rem 0; border-bottom: 1px dotted var(--text); }
    .subject-list > li:first-child { border-top: 1px solid var(--text); }
    .subject-title { font-size: 1rem; }
    .subject-count { font-size: .74rem; color: var(--exec); white-space: nowrap; font-variant-numeric: tabular-nums; letter-spacing: .04em; }

    /* What's Bad About: an editorial collection with its own masthead. */
    .collection { max-width: 68ch; margin: 0 auto 3rem; text-align: left; }
    .collection-mast { margin: 0 0 2rem; padding: 1.1rem 0 1.2rem; border-top: 3px double var(--text); border-bottom: 1px solid var(--text); }
    .collection-kicker { display: block; font-size: .66rem; letter-spacing: .26em; text-transform: uppercase; color: var(--exec); margin-bottom: .45rem; }
    .collection-title { margin: 0; font-size: clamp(1.6rem, 3.6vw, 2.2rem); line-height: 1.1; text-align: left; }
    .collection-dek { margin: .55rem 0 0; max-width: 54ch; font-size: .9rem; color: var(--muted); }
    .collection-list { margin: 0; padding: 0; list-style: none; counter-reset: coll; }
    .collection-list > li { counter-increment: coll; display: grid; grid-template-columns: 2.2rem minmax(0,1fr); gap: 1rem;
      padding: .85rem 0; border-bottom: 1px dotted var(--text); }
    .collection-list > li:first-child { border-top: 1px solid var(--text); }
    .collection-list > li::before { content: counter(coll, upper-roman); font-size: .72rem; color: var(--exec); letter-spacing: .08em; }
    .collection-entry-title { font-size: 1.02rem; }

    /* Section rules collapse to one column on narrow screens. */
    @media (max-width: 54rem) {
      .tag-index, .month-index { grid-template-columns: minmax(0, 1fr); }
      .activity-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem 1rem; }
    }
    @media (max-width: 40rem) {
      /* Phone: three months per row keeps the day squares about 6px, readable
         without turning the calendar into a wall of squares. */
      .activity-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem .8rem; }
      .activity-month-label { font-size: .58rem; letter-spacing: .06em; }
      .entry { grid-template-columns: 1fr; gap: .3rem; }
      .entry-date { display: flex; gap: .4rem; align-items: baseline; }
      .entry-weekday { display: inline; margin-top: 0; }
    }

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
      .journal-ticker-track { animation-duration: 40s; }
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
      .books-list, .journal-list, .article-categories, .folder-list, .tag-list { max-width: none; }

      /* List rows: keep title and action on one line with room to breathe. */
      .book-entry, .article-category-link, .folder-entry-link, .tag-link, .tagged-note-link { gap: .6rem; }
      .read-button { padding: .45rem .8rem; }

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
  </style>
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
        ${availableNavigation.map(navLink).join('\n        ')}
      </ul>
    </nav>
    <div class="header-rule" aria-hidden="true"></div>
  </header>
  <main id="main-content">${breadcrumbs}${renderTagLinks(tags)}${body}</main>
  <hr>
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
    <div class="visit-counter"><img src="/api/visitors" alt="You are visitor number" width="114" height="22" loading="lazy" decoding="async" fetchpriority="low"></div>
  </footer>
  </div>
  <script>
    // The masthead clock is printed at build time; keep it honest in the reader's
    // own timezone. Without JS the build-time IST stamp above remains readable.
    (function () {
      var dayEl = document.querySelector('[data-clock="day"]');
      var dateEl = document.querySelector('[data-clock="date"]');
      var timeEl = document.querySelector('[data-clock="time"]');
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
      var DURATION = 60; // seconds; keep in step with --ticker-duration
      var KEY = 'ticker-anchor';
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
  ${goatcounterScript()}
</body>
</html>
`;
}

function displayName(fileName) {
  return fileName.replace(/\.(md|txt|html)$/i, '').replace(/\.html$/i, '');
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

function latestJournalTicker() {
  const journalRoot = path.join(contentRoot, 'journal');
  if (!fs.existsSync(journalRoot)) return '';
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filePath);
      else if (/^\d{2}-\d{2}-\d{4}\.md$/i.test(entry.name)) files.push(filePath);
    }
  };
  walk(journalRoot);
  const journalDateKey = (filePath) => {
    const match = path.basename(filePath).match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  };
  files.sort((a, b) => journalDateKey(b).localeCompare(journalDateKey(a)));
  if (!files.length) return '';
  const source = parseProperties(fs.readFileSync(files[0], 'utf8')).body;
  const preview = source
    .split(/\r?\n/)
    .map((value) => value.replace(/^\s*[-*+]\s+/, '').replace(/^\s*#{1,6}\s+/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
  if (!preview) return '';
  return `<div class="journal-ticker" aria-label="Latest journal entry"><div class="journal-ticker-track"><span>Latest journal: ${escapeHtml(preview)}</span><span aria-hidden="true">Latest journal: ${escapeHtml(preview)}</span></div></div>`;
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
  return ['journal', 'journalish'].includes(firstSegment(relativePath));
}

function isArticlesPath(relativePath) {
  return firstSegment(relativePath) === 'articles';
}



function isBadAboutPath(relativePath) {
  const name = relativePath.replace(/\\/g, '/').toLowerCase();
  return name === "what's bad about" || name === 'whats bad about';
}

function isBooksPath(relativePath) {
  return relativePath === 'books' || relativePath.startsWith(`books${path.sep}`);
}

function isMusicFile(fileName, relativePath) {
  return relativePath === 'music.md' || fileName.toLowerCase() === 'music.md' && relativePath === 'music.md';
}

function journalEntrySort(a, b) {
  if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
  const aDate = a.name.match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
  const bDate = b.name.match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
  if (aDate && bDate) {
    return `${aDate[3]}-${aDate[2]}-${aDate[1]}`.localeCompare(`${bDate[3]}-${bDate[2]}-${bDate[1]}`);
  }
  if (/^\d{4}$/.test(a.name) && /^\d{4}$/.test(b.name)) return a.name.localeCompare(b.name);
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const aMonth = months.indexOf(a.name.toLowerCase());
  const bMonth = months.indexOf(b.name.toLowerCase());
  if (aMonth !== -1 && bMonth !== -1) return aMonth - bMonth;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function journalFileLabel(fileName) {
  const date = fileName.match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
  if (!date) return publicLabel(displayName(fileName));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(date[3]), Number(date[2]) - 1, Number(date[1]))));
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
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))))
    .sort(journalEntrySort);
  if (!entries.length) return '<p>No journal entries yet.</p>';
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return `<li><a class="DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a></li>`;
    const destinationName = outputName(entry.name, relativePath);
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    return `<li class="journal-entry"><a class="journal-entry-link EXEC" href="${urlPath(path.join(relativeDir, `${destinationName}.html`))}"><span class="journal-entry-title">${escapeHtml(fixedJournalTitle(sourceText, journalFileLabel(entry.name)))}</span><span class="journal-entry-date">${escapeHtml(journalFileLabel(entry.name))}</span></a></li>`;
  });
  return `<ul class="journal-list">${items.join('')}</ul>`;
}

function renderMusicPage(sourceText) {
  sourceText = parseProperties(sourceText).body;
  const albumPattern = /^\s*[-*+]\s*\[([^\]]+)\]\(([^)]+)\)(?:\s+-\s+(.+))?\s*$/gm;
  const albums = [...sourceText.matchAll(albumPattern)]
    .map((match) => {
      const separator = match[1].lastIndexOf(' - ');
      return {
        name: separator === -1 ? match[1].trim() : match[1].slice(0, separator).trim(),
        artist: match[3]?.trim() || (separator === -1 ? '' : match[1].slice(separator + 3).trim()),
        href: match[2]
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const description = sourceText.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[-*+]\s*$/.test(line) && !/^[-*+]\s*\[[^\]]+\]\([^)]+\)/.test(line))
    .join(' ');
  if (!albums.length) return `<section class="music-page">${description ? `<p>${inlineMarkdown(description)}</p>` : '<p>No albums yet.</p>'}</section>`;
  const items = albums.map((album) => `<li class="album-card"><a class="album-link" href="${escapeHtml(album.href)}" target="_blank" rel="noopener noreferrer"><span class="album-name">${escapeHtml(album.name)}</span>${album.artist ? `<span class="album-artist">${escapeHtml(album.artist)}</span>` : ''}<span class="album-action">Open album ↗</span></a></li>`).join('');
  return `<section class="music-page">${description ? `<p>${inlineMarkdown(description)}</p>` : ''}<ul class="album-list">${items}</ul></section>`;
}

function renderBooksListing(sourceDir, relativeDir) {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
  if (!entries.length) return '<p>No books yet.</p>';
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return `<li><a class="DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a></li>`;
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${path.join(relativeDir, `${destinationName}.html`)}` : path.join(relativeDir, destinationName);
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const note = parseProperties(sourceText);
    const sourceLines = note.body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = markdownTitle(note.body, publicLabel(displayName(entry.name)));
    const authorLine = sourceLines.find((line) => /^by\s+/i.test(line));
    const author = authorLine ? authorLine.replace(/^by\s+/i, '') : '';
    return `<li class="book-entry"><div class="book-info"><span class="book-title">${escapeHtml(title)}</span>${author ? `<span class="book-author">${escapeHtml(author)}</span>` : ''}</div><a class="read-button" href="${urlPath(linkPath)}">Read</a></li>`;
  });
  return `<ul class="books-list">${items.join('')}</ul>`;
}

function countArticleLinks(sourceText) {
  return (sourceText.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
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
      const inner = fs.readdirSync(path.join(sourceDir, entry.name), { withFileTypes: true })
        .filter((child) => child.name.toLowerCase().endsWith('.md') && child.name.toLowerCase() !== 'index.md');
      const categoryText = inner.map((child) => fs.readFileSync(path.join(sourceDir, entry.name, child.name), 'utf8')).join('\n');
      articles.push({
        title: publicLabel(folderDisplayName(entry.name)),
        category: 'Collection',
        description: `${inner.length} ${inner.length === 1 ? 'article' : 'articles'}`,
        href: `${urlPath(relativePath)}/`,
        words: categoryText.split(/\s+/).filter(Boolean).length,
      });
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const note = parseProperties(sourceText);
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${path.join(relativeDir, destinationName)}` : path.join(relativeDir, destinationName);
    const linkCount = countArticleLinks(note.body);
    const bodyText = note.body.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
    articles.push({
      title: publicLabel(displayName(entry.name)),
      category: 'Reading list',
      description: linkCount ? `${linkCount} linked ${linkCount === 1 ? 'reading' : 'readings'}` : (bodyText.slice(0, 90) || 'No description'),
      href: urlPath(linkPath),
      words: note.body.split(/\s+/).filter(Boolean).length,
    });
  }
  return articles;
}

function renderArticlesListing(sourceDir, relativeDir) {
  const articles = collectArticles(sourceDir, relativeDir);
  if (!articles.length) return '<h2>Articles</h2><p>No articles yet.</p>';
  const items = articles.map((article) => `<li><a href="${article.href}">${escapeHtml(article.title)}</a></li>`).join('');
  return `<h2>Articles</h2><ul class="plain-list">${items}</ul>`;
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
  if (!entries.length) return `<h2>What&rsquo;s Bad About</h2><p>No entries yet.</p>`;
  const rows = entries.map((entry) => `<li><a href="${entry.href}">${escapeHtml(entry.label)}</a></li>`).join('');
  return `<h2>What&rsquo;s Bad About</h2><ul class="plain-list">${rows}</ul>`;
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
      section: topSection(relativePath),
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

// The top-level folder a note lives in, used as the section label on tag pages.
function topSection(relativePath) {
  const parts = relativePath.split(path.sep);
  if (parts.length < 2) return 'Page';
  return publicLabel(parts[0]);
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
  if (!sortedTags.length) return '<h2>Tags</h2><p>No tags yet.</p>';
  const items = sortedTags
    .map((tag) => `<li><a href="${urlPath(path.join('tags', tagSlug(tag)))}/">${escapeHtml(tag)}</a>(${tags.get(tag).length})</li>`)
    .join('');
  return `<h2>Tags</h2><ul class="tag-list">${items}</ul>`;
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
  const entries = sortEntries(fs.readdirSync(contentRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && !['index.md', 'welcome.md'].includes(entry.name.toLowerCase()) && !isHiddenContent(entry.name)));
  if (!entries.length) return '';
  const badAboutEntry = entries.find((entry) => entry.isDirectory() && isBadAboutPath(entry.name));
  const normalEntries = entries.filter((entry) => entry !== badAboutEntry);
  const links = normalEntries.map((entry, index) => {
    const relativePath = entry.name;
    const separator = index ? '<span class="category-separator" aria-hidden="true">|</span>' : '';
    if (entry.isDirectory()) return `${separator}<a class="category-link DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a>`;
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationName}.html` : destinationName;
    return `${separator}<a class="category-link" href="${urlPath(linkPath)}">${escapeHtml(publicLabel(displayName(destinationName)))}</a>`;
  }).join('');
  const badAbout = badAboutEntry ? renderBadAboutLinks(path.join(contentRoot, badAboutEntry.name), badAboutEntry.name) : '';
  return `${links ? `<h2>Browse</h2><div class="category-links">${links}</div>` : ''}${badAbout}`;
}

function outputName(fileName, relativePath) {
  if (fileName.toLowerCase() === 'index.md') return 'index.html';
  const baseName = fileName.replace(/\.md$/i, '');
  if (/\.(txt|html)$/i.test(baseName)) return slugify(baseName);
  return /(^|[\\/])journal(?:ish)?([\\/]|$)/i.test(relativePath) ? `${slugify(baseName)}.txt` : `${slugify(baseName)}.html`;
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
  const heading = value.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function listSortText(value) {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function listDateValue(value) {
  const match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b|^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (!match) return null;
  return match[1] ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : `${match[6]}-${match[5].padStart(2, '0')}-${match[4].padStart(2, '0')}`;
}

function sortListItems(items, listType) {
  if (listType === 'ol') return items.sort((a, b) => a.number - b.number);
  const dates = items.map((item) => listDateValue(item.text));
  if (dates.every(Boolean)) return items.sort((a, b) => listDateValue(a.text).localeCompare(listDateValue(b.text)));
  return items.sort((a, b) => listSortText(a.text).localeCompare(listSortText(b.text), undefined, { sensitivity: 'base' }));
}

function isTableRow(line) {
  return /^\s*\|?.+\|.+\|?\s*$/.test(line);
}

function isTableDivider(line) {
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

// Header text as it should appear in a data-label: no markdown syntax, no tags.
function plainCell(cell) {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}

function markdownToHtml(value, relativeDir = '') {
  const lines = value.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let tableRows = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(' '), relativeDir)}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    for (const item of sortListItems(listItems, listType)) output.push(`<li>${inlineMarkdown(item.text, relativeDir)}</li>`);
    output.push(`</${listType}>`);
    listType = null;
    listItems = [];
  };
  const closeTable = () => {
    if (!tableRows) return;
    const [header, ...rows] = tableRows;
    output.push(`<table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell, relativeDir)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td data-label="${escapeHtml(plainCell(header[index] ?? ''))}">${inlineMarkdown(cell, relativeDir)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    tableRows = null;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (tableRows && isTableRow(line)) {
      tableRows.push(tableCells(line));
      continue;
    }
    if (!tableRows && isTableRow(line) && isTableDivider(lines[lineIndex + 1] || '')) {
      flushParagraph();
      closeList();
      tableRows = [tableCells(line)];
      lineIndex += 1;
      continue;
    }
    if (tableRows) closeTable();
    if (!line.trim()) {
      const nextLine = lines[lineIndex + 1] || '';
      if (listType && /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(nextLine)) continue;
      flushParagraph();
      closeList();
      continue;
    }
    if (/^[-*+]\s*$/.test(line)) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const listItem = line.match(/^[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2], relativeDir)}</h${level}>`);
    } else if (listItem || orderedItem) {
      flushParagraph();
      const nextListType = orderedItem ? 'ol' : 'ul';
      if (listType !== nextListType) {
        closeList();
        output.push(`<${nextListType}>`);
        listType = nextListType;
      }
      listItems.push({
        text: (listItem || orderedItem)[1],
        number: orderedItem ? Number(orderedItem[0].match(/^\d+/)[0]) : 0,
      });
    } else if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inlineMarkdown(quote[1], relativeDir)}</blockquote>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  closeTable();
  return output.join('\n');
}

function inlineMarkdown(value, relativeDir = '') {
  const html = escapeHtml(value)
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const href = resolveContentLink(target.trim(), relativeDir);
      return anchor(href, label ? escapeHtml(label.trim()) : escapeHtml(target.trim()));
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => anchor(resolveMarkdownLink(href, relativeDir), label))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return linkifyBareUrls(html);
}

// Turns plain http(s):// URLs into links. Runs last, on already-escaped HTML, so
// URLs inside existing anchor text or href attributes are left untouched and
// markdown links are never nested inside a second anchor.
function linkifyBareUrls(html) {
  return html
    .split(/(<a\b[^>]*>.*?<\/a>)/g)
    .map((part) => (part.startsWith('<a') ? part : part.replace(/https?:\/\/[^\s<]+/g, (url) => {
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
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
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
      const linkPath = isTextOutput(entry.name, relativePath) ? `${publicPath}.html` : publicPath;
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
      const body = isMusicFile(entry.name, relativePath)
        ? renderMusicPage(sourceText)
        : markdownToHtml(isArticlesPath(relativeDir) ? sortArticleLinks(note.body) : note.body, relativeDir);
      fs.writeFileSync(destinationPath, layout(title, body, urlPath(path.join(relativeDir, destinationName)), note.tags));
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
    : isBooksPath(relativeDir)
      ? renderBooksListing(sourceDir, relativeDir)
    : isBadAboutPath(relativeDir)
      ? renderBadAboutCollection(sourceDir, relativeDir)
    : renderFolderListing(sourceDir, relativeDir);
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  // Section renderers supply their own header and intro, so no outer heading is
  // added for them. Generic folders still get the plain title.
  const sectionOwnsHeader = isArticlesPath(relativeDir) || isBadAboutPath(relativeDir);
  const pageBody = sectionOwnsHeader
    ? `${folderDescription}${listing}`
    : `${folderDescription}<h2>${escapeHtml(publicLabel(folderDisplayName(title)))}</h2>${listing}`;
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
