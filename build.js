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
    body { font-family: monospace, sans-serif; color: black; margin: 8px; }
    header h1 { margin-bottom: .5rem; }
    header h1 a { color: inherit; text-decoration: none; }
    nav ul { display: flex; flex-wrap: wrap; gap: 0; padding: 0; list-style: none; }
    nav li:not(:last-child)::after { content: ' · '; }
    nav a[aria-current="page"] { font-weight: bold; }
    a:link, a:visited { text-decoration: none; }
    a:hover { text-decoration: underline; background-color: yellow; }
    .DIR { color: blue; }
    .EXEC { color: green; }
    main { min-height: 45vh; }
    pre { overflow-x: auto; }
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
        ${navLink('About Me', '/about-me.html', '/about-me.html')}
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
  return fileName.replace(/\.md$/i, '');
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
  let listOpen = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listOpen) return;
    output.push('</ul>');
    listOpen = false;
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const listItem = line.match(/^[-*+]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (listItem) {
      flushParagraph();
      if (!listOpen) {
        output.push('<ul>');
        listOpen = true;
      }
      output.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
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
    .filter((entry) => entry.isDirectory() || (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md'));
  const lines = [];

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      lines.push(`${indent}${branch}${formatSize(4096)}    <a class="DIR" href="${urlPath(relativePath)}/">${escapeHtml(entry.name)}</a>`);
      lines.push(...renderTree(sourcePath, relativePath, childIndent));
      return;
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      const destinationName = outputName(entry.name, relativePath);
      const publicPath = path.join(relativeDir, destinationName);
      const outputPath = path.join(outputRoot, publicPath);
      const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
      lines.push(`${indent}${branch}${formatSize(size)}    <a class="EXEC" href="${urlPath(publicPath)}">${escapeHtml(destinationName)}</a>`);
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

    if (!entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase() === 'index.md') continue;
    const destinationName = outputName(entry.name, relativePath);
    const destinationPath = path.join(outputDir, destinationName);
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    if (isTextOutput(entry.name, relativePath)) {
      fs.writeFileSync(destinationPath, toUsAscii(sourceText), 'ascii');
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
  const listing = tree.length ? `<pre>${tree.join('\n')}</pre>` : '<p>No entries yet.</p>';
  const currentPath = relativeDir ? `${urlPath(relativeDir)}/` : '/';
  const report = `<p>${countDirectories(sourceDir)} directories, ${countFiles(sourceDir)} files</p>`;
  fs.writeFileSync(path.join(outputDir, 'index.html'), layout(title, `${folderDescription}<h2>${escapeHtml(title)}</h2>${listing}${report}`, currentPath));
}

function countDirectories(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .reduce((total, entry) => total + 1 + countDirectories(path.join(directory, entry.name)), 0);
}

function countFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .reduce((total, entry) => {
      if (entry.isDirectory()) return total + countFiles(path.join(directory, entry.name));
      return total + (entry.name.toLowerCase().endsWith('.md') && entry.name.toLowerCase() !== 'index.md' ? 1 : 0);
    }, 0);
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
buildFolder(contentRoot);

const homeTree = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8')
  .replace('<h2>Home</h2>', '<p>Welcome. This is the living index of my notes, journals, lists, and reading.</p><h2>File tree</h2>');
fs.writeFileSync(path.join(outputRoot, 'index.html'), homeTree);
fs.writeFileSync(path.join(outputRoot, '404.html'), layout('Page not found', '<h2>Page not found</h2><p><a href="/">Return home</a> or <a href="/journalish/">browse Journalish</a>.</p>', ''));

console.log(`Built ${outputRoot}`);
