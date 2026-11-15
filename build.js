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
  { label: 'Journal', href: '/journalish/', path: '/journalish/' },
  { label: 'File Tree', href: '/file-tree/', path: '/file-tree/' },
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
  const description = 'Amaan Shaik\'s personal site, journals, lists, and reading notes.';
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
    :root { color-scheme: light; }
    body { max-width: 1100px; font-family: monospace, sans-serif; font-size: 16px; line-height: 1.55; color: black; margin: 0 auto; padding: 1rem; }
    header, footer { text-align: center; }
    header h1 { margin: 0 0 .75rem; font-size: clamp(1.5rem, 5vw, 2.25rem); line-height: 1.2; }
    header h1 a { color: inherit; text-decoration: none; }
    nav a { font-size: 1rem; }
    nav ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 0; padding: 0; list-style: none; }
    nav li:not(:last-child)::after { content: ' · '; }
    nav a[aria-current="page"] { font-weight: bold; }
    .breadcrumbs { margin: 1.25rem 0; text-align: center; font-size: .98rem; }
    a:link, a:visited { text-decoration: none; }
    a:hover { text-decoration: underline; background-color: yellow; }
    .DIR { color: blue; }
    .EXEC { color: green; }
    main { min-height: 45vh; text-align: center; }
    main h2 { font-size: clamp(1.3rem, 3.5vw, 1.75rem); line-height: 1.25; }
    main > p { max-width: 72ch; margin: 1rem auto; text-align: left; }
    main ul, main ol { padding-left: 1.25rem; }
    pre { max-width: 100%; overflow-x: auto; margin: 1rem auto; text-align: left; width: max-content; }
    .text-viewer { max-width: 72ch; margin: 1rem auto; font-family: inherit; font-size: clamp(1.05rem, 2.5vw, 1.22rem); line-height: 1.8; overflow-wrap: anywhere; text-align: left; }
    .text-viewer p, .text-viewer ul, .text-viewer ol, .text-viewer blockquote { margin: 1rem 0; }
    .journal-list { max-width: 45ch; margin: 1rem auto; padding-left: 1.5rem; text-align: left; }
    .journal-list li { margin: .6rem 0; }
    .category-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; }
    .category-link { display: inline-block; border: 1px solid black; padding: .65rem 1rem; font-size: clamp(1rem, 2.5vw, 1.1rem); }
    .category-separator { margin: 0 .25rem; }
    .skip-link { position: absolute; left: -9999px; }
    .skip-link:focus { left: 1rem; top: 1rem; }
    footer { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-size: .95rem; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header>
    <h1><a href="/">Amaan Shaik's Personal Site</a></h1>
    <nav aria-label="Primary navigation">
      <ul>
        ${navigation.map(navLink).join('\n        ')}
      </ul>
    </nav>
    <hr>
  </header>
  <main id="main-content">${breadcrumbs}${body}</main>
  <hr>
  <footer>
    <p>Email: <a href="mailto:amaanshaik.work@gmail.com">amaanshaik.work@gmail.com</a></p>
    <p>Last updated: ${builtAt}</p>
  </footer>
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
  return value.toLowerCase() === 'journalish'
    ? 'Journal'
    : value.charAt(0).toUpperCase() + value.slice(1);
}

function isJournalishPath(relativePath) {
  return relativePath === 'journalish' || relativePath.startsWith(`journalish${path.sep}`);
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

function renderJournalListing(sourceDir, relativeDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(path.join(relativeDir, entry.name))))
    .sort(journalEntrySort);
  if (!entries.length) return '<p>No journal entries yet.</p>';
  const items = entries.map((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return `<li><a class="DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a></li>`;
    const destinationName = outputName(entry.name, relativePath);
    return `<li><a class="EXEC" href="${urlPath(path.join(relativeDir, `${destinationName}.html`))}">${escapeHtml(journalFileLabel(entry.name))}</a></li>`;
  });
  return `<ul class="journal-list">${items.join('')}</ul>`;
}

function renderHomeCategories() {
  const entries = sortEntries(fs.readdirSync(contentRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' && !isHiddenContent(entry.name)));
  if (!entries.length) return '';
  const links = entries.flatMap((entry, index) => {
    const relativePath = entry.name;
    const separator = index ? '<span class="category-separator" aria-hidden="true">|</span>' : '';
    if (entry.isDirectory()) {
      return [separator, `<a class="category-link DIR" href="${urlPath(relativePath)}/">${escapeHtml(publicLabel(folderDisplayName(entry.name)))}</a>`];
    }
    const destinationName = outputName(entry.name, relativePath);
    const linkPath = isTextOutput(entry.name, relativePath) ? `${destinationName}.html` : destinationName;
    return [separator, `<a class="category-link EXEC" href="${urlPath(linkPath)}">${escapeHtml(publicLabel(displayName(destinationName)))}</a>`];
  }).join('');
  return `<h2>Browse</h2><div class="category-links">${links}</div>`;
}

function outputName(fileName, relativePath) {
  if (fileName.toLowerCase() === 'index.md') return 'index.html';
  if (/\.(txt|html)\.md$/i.test(fileName)) return displayName(fileName);
  return /(^|[\\/])journalish([\\/]|$)/i.test(relativePath) ? `${displayName(fileName)}.txt` : `${displayName(fileName)}.html`;
}

function isTextOutput(fileName, relativePath) {
  return outputName(fileName, relativePath).toLowerCase().endsWith('.txt');
}

function markdownTitle(value, fallback) {
  const heading = value.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function markdownToHtml(value) {
  const lines = value.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
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
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (listItem || orderedItem) {
      flushParagraph();
      const nextListType = orderedItem ? 'ol' : 'ul';
      if (listType !== nextListType) {
        closeList();
        output.push(`<${nextListType}>`);
        listType = nextListType;
      }
      output.push(`<li>${inlineMarkdown((listItem || orderedItem)[1])}</li>`);
    } else if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  return output.join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
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
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
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
      const readerTitle = markdownTitle(sourceText, displayName(entry.name));
      const readerBody = `<article class="text-viewer">${markdownToHtml(text)}</article>`;
      fs.writeFileSync(readerPath, layout(readerTitle, readerBody, urlPath(path.join(relativeDir, destinationName))));
    } else {
      const title = markdownTitle(sourceText, displayName(entry.name));
      const body = markdownToHtml(sourceText);
      fs.writeFileSync(destinationPath, layout(title, body, urlPath(path.join(relativeDir, destinationName))));
    }
  }

  const title = relativeDir ? path.basename(relativeDir) : 'Home';
  const folderIndexPath = path.join(sourceDir, 'index.md');
  const folderDescription = fs.existsSync(folderIndexPath)
    ? markdownToHtml(fs.readFileSync(folderIndexPath, 'utf8'))
    : '';
  const tree = renderTree(sourceDir, relativeDir);
  const listing = isJournalishPath(relativeDir)
    ? renderJournalListing(sourceDir, relativeDir)
    : (tree.length ? `<pre>${tree.join('\n')}</pre>` : '<p>No entries yet.</p>');
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  const report = isJournalishPath(relativeDir)
    ? `<p>${countFiles(sourceDir)} journal entries</p>`
    : `<p>${countDirectories(sourceDir)} directories, ${countFiles(sourceDir)} files</p>`;
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
buildFolder(contentRoot);

const homeBody = `<h2>Welcome</h2><p>This site is primarily a collection of plain text files that I have either written or collected or converted.</p><p>While this site is mainly for my personal use, I am happy to share it. Please feel free to read and/or download anything you find interesting.</p><p>Any file with my email address at the bottom is something I have written. Therefore, if you have questions or comments, you can reach out to me by my email.</p>${renderHomeCategories()}`;
fs.writeFileSync(path.join(outputRoot, 'index.html'), layout('Home', homeBody, '/'));

const fileTreeDir = path.join(outputRoot, 'file-tree');
fs.mkdirSync(fileTreeDir, { recursive: true });
const rootTree = renderTree(contentRoot);
const rootListing = rootTree.length ? `<pre>${rootTree.join('\n')}</pre>` : '<p>No entries yet.</p>';
fs.writeFileSync(path.join(fileTreeDir, 'index.html'), layout('File Tree', `<h2>File Tree</h2>${rootListing}<p>${countDirectories(contentRoot)} directories, ${countFiles(contentRoot)} files</p>`, '/file-tree/'));
fs.writeFileSync(path.join(outputRoot, '404.html'), layout('Page not found', '<h2>Page not found</h2><p><a href="/">Return home</a> or <a href="/file-tree/">browse the File Tree</a>.</p>', ''));

console.log(`Built ${outputRoot}`);
