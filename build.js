const fs = require('fs');
const path = require('path');

const root = __dirname;
const contentRoot = path.join(root, 'Content');
const outputRoot = path.join(root, 'public');
const builtAt = new Date().toISOString();

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

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Amaan Shaik</title>
</head>
<body>
  <header>
    <h1>Amaan Shaik's Personal Site</h1>
    <nav aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/journalish/">Journalish</a>
      <a href="/about-me.txt">About Me</a>
    </nav>
    <hr>
  </header>
  <main>${body}</main>
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

function sortEntries(entries) {
  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

function buildFolder(sourceDir, relativeDir = '') {
  const outputDir = path.join(outputRoot, relativeDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const links = [];

  for (const entry of sortEntries(fs.readdirSync(sourceDir, { withFileTypes: true }))) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      buildFolder(sourcePath, relativePath);
      links.push(`<li><a href="${urlPath(relativePath)}/">${escapeHtml(entry.name)}/</a></li>`);
      continue;
    }

    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const destinationName = displayName(entry.name);
    const destinationPath = path.join(outputDir, destinationName);
    fs.copyFileSync(sourcePath, destinationPath);
    const publicPath = path.join(relativeDir, destinationName);
    links.push(`<li><a href="${urlPath(publicPath)}">${escapeHtml(destinationName)}</a></li>`);
  }

  const title = relativeDir ? path.basename(relativeDir) : 'Home';
  const parentLink = relativeDir ? '<p><a href="/">← Home</a></p>' : '';
  const listing = links.length ? `<ul>${links.join('')}</ul>` : '<p>No entries yet.</p>';
  fs.writeFileSync(path.join(outputDir, 'index.html'), layout(title, `${parentLink}<h2>${escapeHtml(title)}</h2>${listing}`));
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
buildFolder(contentRoot);

const homeTree = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf8')
  .replace('<h2>Home</h2>', '<p>Welcome. This is the living index of my notes, journals, lists, and reading.</p><h2>File tree</h2>');
fs.writeFileSync(path.join(outputRoot, 'index.html'), homeTree);

console.log(`Built ${outputRoot}`);
