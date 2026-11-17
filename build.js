const fs = require('fs');
const path = require('path');

const root = __dirname;
const contentRoot = path.join(root, 'Content');
const outputRoot = path.join(root, 'public');
const builtAt = `${new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
}).format(new Date())} IST`;

// Add future header buttons here. Each item becomes one link in the header.
const navigation = [
  { label: 'Home', href: '/', path: '/' },
  { label: 'Journal', href: '/journal/', path: '/journal/' },
  { label: 'File Tree', href: '/file-tree/', path: '/file-tree/' },
  { label: 'Search', href: '/search/', path: '/search/' },
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

function layout(title, body, currentPath = '/') {
  const description = 'Amaan Shaik\'s personal site, journals, lists, and books.';
  const navLink = ({ label, href, path }) => `<li><a href="${href}"${currentPath === path || (path !== '/' && currentPath.startsWith(path)) ? ' aria-current="page"' : ''}>${label}</a></li>`;
  const breadcrumbs = currentPath === '/' ? '' : `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>${currentPath.split('/').filter(Boolean).map((part, index, parts) => {
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta property="og:title" content="${escapeHtml(title)} · Amaan Shaik">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)} · Amaan Shaik</title>
  <style>
    :root { color-scheme: light; --page-bg: white; --text: black; --link: blue; --exec: green; --hover: yellow; --border: black; }
    :root[data-theme="dark"] { color-scheme: dark; --page-bg: #111; --text: #f5f5f5; --link: #79b8ff; --exec: #75d66f; --hover: #62bd58; --border: #f5f5f5; }
    body { max-width: 1100px; font-family: monospace, sans-serif; font-size: 16px; line-height: 1.55; color: var(--text); background: var(--page-bg); margin: 0 auto; padding: 1rem; }
    header, footer { text-align: center; }
    header h1 { margin: 0 0 .75rem; font-size: clamp(1.5rem, 5vw, 2.25rem); line-height: 1.2; }
    header h1 a { color: inherit; text-decoration: none; }
    nav a { font-size: 1rem; }
    nav ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 0; padding: 0; list-style: none; }
    nav li:not(:last-child)::after { content: ' · '; }
    nav a[aria-current="page"] { font-weight: bold; }
    .theme-toggle { border: 0; padding: 0; color: var(--text); background: transparent; font: inherit; cursor: pointer; }
    .breadcrumbs { margin: 1.25rem 0; text-align: center; font-size: .98rem; }
    a:link, a:visited { color: var(--link); text-decoration: none; }
    a:hover, .theme-toggle:hover { color: black !important; text-decoration: underline; background-color: var(--hover); }
    .DIR { color: var(--link) !important; }
    .EXEC { color: var(--exec) !important; }
    main { min-height: 45vh; text-align: center; }
    main h2 { font-size: clamp(1.3rem, 3.5vw, 1.75rem); line-height: 1.25; }
    main > p { max-width: 88ch; margin: 1rem auto; text-align: left; }
    main ul, main ol { padding-left: 1.25rem; }
    pre { max-width: 100%; overflow-x: auto; margin: 1rem auto; text-align: left; width: max-content; }
    .text-viewer { max-width: 88ch; margin: 1rem auto; font-family: inherit; font-size: clamp(1.05rem, 2.5vw, 1.22rem); line-height: 1.8; overflow-wrap: anywhere; text-align: left; }
    .text-viewer p, .text-viewer ul, .text-viewer ol, .text-viewer blockquote { margin: 1rem 0; }
    .journal-list { max-width: 60ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .journal-entry { border-bottom: 1px solid var(--border); padding: .8rem 0; }
    .journal-entry-link { display: block; }
    .journal-entry-title { display: block; min-height: 3.1em; font-size: 1.05rem; }
    .journal-entry-date { display: block; margin-top: .25rem; font-size: .9rem; color: var(--text); }
    .category-links { display: inline-flex; max-width: 100%; box-sizing: border-box; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; border: 1px solid var(--border); padding: .75rem 1rem; }
    .category-link { color: black; font-size: clamp(1rem, 2.5vw, 1.1rem); }
    .books-list { max-width: 60ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .books-list li { border-bottom: 1px solid var(--border); padding: .75rem 0; }
    .book-entry { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .book-info { min-width: 0; }
    .books-list a { font-size: 1.05rem; }
    .read-button { flex: 0 0 auto; border: 1px solid var(--border); padding: .35rem .65rem; color: var(--text) !important; }
    .read-button:hover { color: black !important; }
    .book-title, .book-author { display: block; }
    .book-author { margin-top: .25rem; font-size: .9rem; }
    .article-categories { max-width: 60ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .article-category { border-bottom: 1px solid var(--border); padding: .8rem 0; }
    .article-category-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .article-category-title { font-size: 1.05rem; }
    .article-category-count { white-space: nowrap; font-size: .9rem; }
    .folder-list { max-width: 68ch; margin: 1rem auto; padding: 0; list-style: none; text-align: left; }
    .folder-entry { border-bottom: 1px solid var(--border); padding: .8rem 0; }
    .folder-entry-link { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .folder-entry-title { font-size: 1.05rem; }
    .folder-entry-kind { white-space: nowrap; font-size: .9rem; color: var(--text); }
    .search-page { max-width: 72ch; margin: 1rem auto; text-align: left; }
    .search-form { display: flex; gap: .5rem; margin: 1rem 0 1.5rem; }
    .search-input { flex: 1; min-width: 0; box-sizing: border-box; border: 1px solid var(--border); padding: .65rem; color: var(--text); background: var(--page-bg); font: inherit; }
    .search-submit { border: 1px solid var(--border); padding: .65rem .9rem; color: var(--text); background: var(--page-bg); font: inherit; cursor: pointer; }
    .search-submit:hover { color: black; background: var(--hover); }
    .search-results { margin: 0; padding: 0; list-style: none; }
    .search-result { border-bottom: 1px solid var(--border); padding: .8rem 0; }
    .search-result-title { display: block; font-size: 1.05rem; }
    .search-result-preview { display: block; margin-top: .25rem; color: var(--text); }
    .music-page { max-width: 62ch; margin: 1rem auto; text-align: left; }
    .album-list { display: grid; gap: .75rem; margin: 1rem 0; padding: 0; list-style: none; }
    .album-card { border: 1px solid var(--border); }
    .album-link { display: grid; grid-template-columns: 1fr auto; gap: .25rem 1rem; align-items: center; padding: .85rem 1rem; }
    .album-name { font-size: 1.1rem; }
    .album-artist { grid-column: 1; font-size: .9rem; color: var(--text); }
    .album-action { grid-column: 2; grid-row: 1 / span 2; }
    .category-link { color: var(--text); }
    .category-separator { margin: 0 .25rem; }
    .skip-link { position: absolute; left: -9999px; }
    .skip-link:focus { left: 1rem; top: 1rem; }
    footer { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-size: .95rem; }
    .badges { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: min(100%, 328px); margin: .5rem auto 0; gap: .5rem; }
    .badge { min-height: 36px; display: flex; align-items: center; justify-content: center; }
    .badge img { display: block; max-width: 100%; height: auto; image-rendering: pixelated; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header>
    <h1><a href="/">Amaan Shaik's Personal Site</a></h1>
    <nav aria-label="Primary navigation">
      <ul>
        ${navigation.map(navLink).join('\n        ')}
        <li><button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">dark mode</button></li>
      </ul>
    </nav>
    <hr>
  </header>
  <main id="main-content">${breadcrumbs}${body}</main>
  <hr>
  <footer>
    <p>Email: <a href="mailto:amaanshaik.work@gmail.com">amaanshaik.work@gmail.com</a></p>
    <p>Last updated: ${builtAt}</p>
    <div class="badges" aria-label="Web badges">
      <span class="badge"><img src="/badges/free-speech.png" width="80" height="15" alt="Free speech"></span>
      <span class="badge"><img src="/badges/cookie-free.png" width="88" height="31" alt="This site is certified 100% cookie free"></span>
      <span class="badge"><a href="https://en.wikipedia.org/wiki/Year_2000_problem" target="_blank" rel="noopener noreferrer"><img src="/badges/y2k-compliant.png" width="160" height="36" alt="Y2K compliant"></a></span>
      <span class="badge"><img src="/badges/no-ai-human-content.png" width="160" height="36" alt="No AI human content"></span>
    </div>
  </footer>
  <script>
    (() => {
      const root = document.documentElement;
      const button = document.getElementById('theme-toggle');
      const savedTheme = localStorage.getItem('theme');
      const applyTheme = (theme) => {
        root.dataset.theme = theme;
        button.textContent = theme === 'dark' ? 'light mode' : 'dark mode';
        button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      };
      applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
      button.addEventListener('click', () => {
        const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
      });
    })();
  </script>
</body>
</html>
`;
}

function displayName(fileName) {
  return fileName.replace(/\.(md|txt|html)$/i, '').replace(/\.html$/i, '');
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

function isJournalPath(relativePath) {
  return relativePath === 'journal' || relativePath.startsWith(`journal${path.sep}`) || relativePath === 'journalish' || relativePath.startsWith(`journalish${path.sep}`);
}

function isArticlesPath(relativePath) {
  return relativePath === 'articles' || relativePath.startsWith(`articles${path.sep}`);
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
    return `${bDate[3]}-${bDate[2]}-${bDate[1]}`.localeCompare(`${aDate[3]}-${aDate[2]}-${aDate[1]}`);
  }
  if (/^\d{4}$/.test(a.name) && /^\d{4}$/.test(b.name)) return b.name.localeCompare(a.name);
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const aMonth = months.indexOf(a.name.toLowerCase());
  const bMonth = months.indexOf(b.name.toLowerCase());
  if (aMonth !== -1 && bMonth !== -1) return bMonth - aMonth;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function journalFileLabel(fileName) {
  const date = fileName.match(/^(\d{2})-(\d{2})-(\d{4})\.md$/i);
  if (!date) return publicLabel(displayName(fileName));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(date[3]), Number(date[2]) - 1, Number(date[1]))));
}

function fixedJournalTitle(sourceText, fallback) {
  const line = sourceText.split(/\r?\n/)
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
  const albums = [...sourceText.matchAll(/(?:^|\n)\s*[-*+]\s*\[([^\]]+)\]\(([^)]+)\)/g)]
    .map((match) => {
      const separator = match[1].lastIndexOf(' - ');
      return {
        name: separator === -1 ? match[1].trim() : match[1].slice(0, separator).trim(),
        artist: separator === -1 ? '' : match[1].slice(separator + 3).trim(),
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
    const sourceLines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = markdownTitle(sourceText, publicLabel(displayName(entry.name)));
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

function renderArticlesListing(sourceDir, relativeDir) {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))));
  if (!entries.length) return '<p>No article categories yet.</p>';
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    const title = publicLabel(folderDisplayName(entry.name.replace(/\.md$/i, '')));
    if (entry.isDirectory()) {
      return `<li class="article-category"><a class="article-category-link DIR" href="${urlPath(relativePath)}/"><span class="article-category-title">${escapeHtml(title)}</span><span class="article-category-count">Browse category</span></a></li>`;
    }
    const sourceText = fs.readFileSync(path.join(sourceDir, entry.name), 'utf8');
    const count = countArticleLinks(sourceText);
    const destinationName = outputName(entry.name, relativePath);
    return `<li class="article-category"><a class="article-category-link EXEC" href="${urlPath(path.join(relativeDir, destinationName))}"><span class="article-category-title">${escapeHtml(title)}</span><span class="article-category-count">${count} ${count === 1 ? 'article' : 'articles'}</span></a></li>`;
  });
  return `<ul class="article-categories">${items.join('')}</ul>`;
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
    const title = markdownTitle(sourceText, publicLabel(displayName(entry.name)));
    const kind = isTextOutput(entry.name, relativePath) ? 'plain text' : 'page';
    return `<li class="folder-entry"><a class="folder-entry-link EXEC" href="${urlPath(linkPath)}"><span class="folder-entry-title">${escapeHtml(title)}</span><span class="folder-entry-kind">${kind}</span></a></li>`;
  });
  return `<ul class="folder-list">${items.join('')}</ul>`;
}

function searchPreview(sourceText) {
  const text = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !/^#{1,6}\s+/.test(line));
  if (!text) return '';
  const plain = text.replace(/^[-*+]\s+/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > 120 ? `${plain.slice(0, 117).trimEnd()}...` : plain;
}

function collectSearchEntries(directory = contentRoot, relativeDir = '') {
  const entries = [];
  for (const entry of sortEntries(fs.readdirSync(directory, { withFileTypes: true }))) {
    const sourcePath = path.join(directory, entry.name);
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...collectSearchEntries(sourcePath, relativePath));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase() === 'index.md' || isHiddenContent(relativePath)) continue;
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    const destinationName = outputName(entry.name, relativePath);
    const destinationPath = path.join(path.dirname(relativePath), destinationName);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationPath}.html` : destinationPath;
    entries.push({
      title: isJournalPath(path.dirname(relativePath)) ? fixedJournalTitle(sourceText, publicLabel(displayName(entry.name))) : markdownTitle(sourceText, publicLabel(displayName(entry.name))),
      preview: searchPreview(sourceText),
      href: urlPath(linkPath),
    });
  }
  return entries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

function renderSearchPage() {
  const searchData = JSON.stringify(collectSearchEntries()).replace(/</g, '\\u003c');
  return `<section class="search-page"><form class="search-form" id="search-form"><label class="skip-link" for="search-input">Search the site</label><input class="search-input" id="search-input" type="search" placeholder="Search pages and notes" autocomplete="off"><button class="search-submit" type="submit">Search</button></form><p id="search-status">Search your pages, notes, books, and articles.</p><ul class="search-results" id="search-results"></ul></section><script>
(() => {
  const data = ${searchData};
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const status = document.getElementById('search-status');
  const results = document.getElementById('search-results');
  const render = () => {
    const query = input.value.trim().toLowerCase();
    const matches = query ? data.filter((item) => (item.title + ' ' + item.preview).toLowerCase().includes(query)) : [];
    results.replaceChildren(...matches.map((item) => {
      const li = document.createElement('li');
      li.className = 'search-result';
      const link = document.createElement('a');
      link.className = 'search-result-title';
      link.href = item.href;
      link.textContent = item.title;
      li.append(link);
      if (item.preview) {
        const preview = document.createElement('span');
        preview.className = 'search-result-preview';
        preview.textContent = item.preview;
        li.append(preview);
      }
      return li;
    }));
    status.textContent = query ? matches.length + ' result' + (matches.length === 1 ? '' : 's') : 'Search your pages, notes, books, and articles.';
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); render(); });
  input.addEventListener('input', render);
})();
</script>`;
}

function renderHomeCategories() {
  const entries = sortEntries(fs.readdirSync(contentRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && !['index.md', 'welcome.md'].includes(entry.name.toLowerCase()) && !isHiddenContent(entry.name)));
  if (!entries.length) return '';
  const links = entries.flatMap((entry, index) => {
    const relativePath = entry.name;
    const separator = index ? '<span class="category-separator" aria-hidden="true">|</span>' : '';
    if (entry.isDirectory()) {
      return [separator, `<a class="category-link DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a>`];
    }
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationName}.html` : destinationName;
    return [separator, `<a class="category-link" href="${urlPath(linkPath)}">${escapeHtml(publicLabel(displayName(destinationName)))}</a>`];
  }).join('');
  return `<h2>Browse</h2><div class="category-links">${links}</div>`;
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

function markdownToHtml(value, relativeDir = '') {
  const lines = value.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(' '), relativeDir)}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  for (const line of lines) {
    if (!line.trim()) {
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
      output.push(`<li>${inlineMarkdown((listItem || orderedItem)[1], relativeDir)}</li>`);
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
  return output.join('\n');
}

function inlineMarkdown(value, relativeDir = '') {
  return escapeHtml(value)
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => `<a href="${escapeHtml(resolveContentLink(target.trim(), relativeDir))}">${label ? escapeHtml(label.trim()) : escapeHtml(target.trim())}</a>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${escapeHtml(resolveMarkdownLink(href, relativeDir))}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
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
    if (isTextOutput(entry.name, relativePath)) {
      const text = toUsAscii(sourceText);
      fs.writeFileSync(destinationPath, text, 'ascii');
      const readerPath = `${destinationPath}.html`;
      const readerTitle = markdownTitle(sourceText, publicLabel(displayName(entry.name)));
      const readerBody = `<article class="text-viewer">${markdownToHtml(text, relativeDir)}</article>`;
      fs.writeFileSync(readerPath, layout(readerTitle, readerBody, urlPath(path.join(relativeDir, destinationName))));
    } else {
      const title = markdownTitle(sourceText, publicLabel(displayName(entry.name)));
      const body = isMusicFile(entry.name, relativePath)
        ? renderMusicPage(sourceText)
        : markdownToHtml(isArticlesPath(relativeDir) ? sortArticleLinks(sourceText) : sourceText, relativeDir);
      fs.writeFileSync(destinationPath, layout(title, body, urlPath(path.join(relativeDir, destinationName))));
    }
  }

  const title = relativeDir ? path.basename(relativeDir) : 'Home';
  const folderIndexPath = path.join(sourceDir, 'index.md');
  const folderDescription = fs.existsSync(folderIndexPath)
    ? markdownToHtml(fs.readFileSync(folderIndexPath, 'utf8'), relativeDir)
    : '';
  const listing = isJournalPath(relativeDir)
    ? renderJournalListing(sourceDir, relativeDir)
    : isArticlesPath(relativeDir)
      ? renderArticlesListing(sourceDir, relativeDir)
    : isBooksPath(relativeDir)
      ? renderBooksListing(sourceDir, relativeDir)
    : renderFolderListing(sourceDir, relativeDir);
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  const report = isJournalPath(relativeDir)
    ? `<p>${countFiles(sourceDir)} journal entries</p>`
    : '';
  fs.writeFileSync(path.join(outputDir, 'index.html'), layout(publicLabel(title), `${folderDescription}<h2>${escapeHtml(publicLabel(folderDisplayName(title)))}</h2>${listing}${report}`, currentPath));
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
buildFolder(contentRoot);

const welcomeSource = fs.existsSync(path.join(contentRoot, 'Welcome.md'))
  ? fs.readFileSync(path.join(contentRoot, 'Welcome.md'), 'utf8')
  : '';
const welcomeHeading = markdownTitle(welcomeSource, '');
const homeBody = `${welcomeHeading ? '' : '<h2>Welcome</h2>'}${markdownToHtml(welcomeSource, '')}${renderHomeCategories()}`;
fs.writeFileSync(path.join(outputRoot, 'index.html'), layout('Home', homeBody, '/'));

const searchDir = path.join(outputRoot, 'search');
fs.mkdirSync(searchDir, { recursive: true });
fs.writeFileSync(path.join(searchDir, 'index.html'), layout('Search', `<h2>Search</h2>${renderSearchPage()}`, '/search/'));

const fileTreeDir = path.join(outputRoot, 'file-tree');
fs.mkdirSync(fileTreeDir, { recursive: true });
const rootTree = renderTree(contentRoot);
const rootListing = rootTree.length ? `<pre>${rootTree.join('\n')}</pre>` : '<p>No entries yet.</p>';
fs.writeFileSync(path.join(fileTreeDir, 'index.html'), layout('File Tree', `<h2>File Tree</h2>${rootListing}<p>${countDirectories(contentRoot)} directories, ${countFiles(contentRoot)} files</p>`, '/file-tree/'));
fs.writeFileSync(path.join(outputRoot, '404.html'), layout('Page not found', '<h2>Page not found</h2><p><a href="/">Return home</a> or <a href="/file-tree/">browse the File Tree</a>.</p>', ''));

console.log(`Built ${outputRoot}`);
