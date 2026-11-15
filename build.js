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
  const navLink = (label, href, path) => `<li><a href="${href}"${currentPath === path ? ' aria-current="page"' : ''}>${label}</a></li>`;
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
    body { max-width: 880px; margin: 0 auto; padding: 1.25rem; line-height: 1.55; }
    header h1 { margin-bottom: .5rem; }
    header h1 a { color: inherit; text-decoration: none; }
    nav ul { display: flex; flex-wrap: wrap; gap: 1.25rem; padding: 0; list-style: none; }
    nav a[aria-current="page"] { font-weight: bold; }
    main { min-height: 45vh; }
    pre { overflow-x: auto; padding: 1rem; border: 1px solid #bbb; }
    .skip-link { position: absolute; left: -9999px; }
    .skip-link:focus { left: 1rem; top: 1rem; }
    footer { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header>
    <h1><a href="/">Amaan Shaik's Personal Site</a></h1>
    <nav aria-label="Primary navigation">
      <ul>
        ${navLink('Home', '/', '/')}
        ${navLink('Journalish', '/journalish/', '/journalish/')}
        ${navLink('About Me', '/about-me.txt', '/about-me.txt')}
      </ul>
    </nav>
    <hr>
  </header>
  <main id="main-content">${body}</main>
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
  return fileName.replace(/\.md$/i, '.txt');
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

// ASCII tree branches match tree 1.8.0's -A output style.
function renderTree(sourceDir, relativeDir = '', indent = '') {
  const entries = sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() || entry.name.toLowerCase().endsWith('.md'));
  const lines = [];

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? '`-- ' : '|-- ';
    const childIndent = indent + (isLast ? '    ' : '|   ');
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      lines.push(`${indent}${branch}<a href="${urlPath(relativePath)}/">${escapeHtml(entry.name)}/</a>`);
      lines.push(...renderTree(sourcePath, relativePath, childIndent));
      return;
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      const destinationName = displayName(entry.name);
      const publicPath = path.join(relativeDir, destinationName);
      lines.push(`${indent}${branch}<a href="${urlPath(publicPath)}">${escapeHtml(destinationName)}</a>`);
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

    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const destinationName = displayName(entry.name);
    const destinationPath = path.join(outputDir, destinationName);
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, toUsAscii(sourceText), 'ascii');
  }

  const title = relativeDir ? path.basename(relativeDir) : 'Home';
  const parentDirectory = relativeDir ? path.dirname(relativeDir) : '';
  const parentHref = parentDirectory && parentDirectory !== '.' ? `${urlPath(parentDirectory)}/` : '/';
  const parentLabel = parentDirectory && parentDirectory !== '.' ? path.basename(parentDirectory) : 'Home';
  const parentLink = relativeDir ? `<p><a href="${parentHref}">← Back to ${escapeHtml(parentLabel)}</a></p>` : '';
  const tree = renderTree(sourceDir, relativeDir);
  const listing = tree.length ? `<pre>${tree.join('\n')}</pre>` : '<p>No entries yet.</p>';
  const itemCount = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.name.toLowerCase().endsWith('.md')).length;
  const itemLabel = itemCount === 1 ? 'item' : 'items';
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  fs.writeFileSync(path.join(outputDir, 'index.html'), layout(title, `${parentLink}<h2>${escapeHtml(title)}</h2><p>${itemCount} ${itemLabel}</p>${listing}`, currentPath));
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
buildFolder(contentRoot);

const homeTree = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8')
  .replace('<h2>Home</h2>', '<p>Welcome. This is the living index of my notes, journals, lists, and reading.</p><h2>File tree</h2>');
fs.writeFileSync(path.join(outputRoot, 'index.html'), homeTree);
fs.writeFileSync(path.join(outputRoot, '404.html'), layout('Page not found', '<h2>Page not found</h2><p><a href="/">Return home</a> or <a href="/journalish/">browse Journalish</a>.</p>', ''));

console.log(`Built ${outputRoot}`);
