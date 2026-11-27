const fs = require('fs');
const path = require('path');
const { dayFromName, formatDay } = require('./lib/daycount');

const root = __dirname;
const contentRoot = path.join(root, 'Content');
const outputRoot = path.join(root, 'public');
const failures = [];

function outputName(fileName, relativePath) {
  const baseName = fileName.replace(/\.md$/i, '');
  if (fileName.toLowerCase() === 'index.md') return 'index.html';
  if (/\.(txt|html)$/i.test(baseName)) return slugify(baseName);
  if (isJournalPath(relativePath)) {
    // Must match build.js: journal entries are addressed by day number.
    const day = dayFromName(fileName);
    return day === null ? `${slugify(baseName)}.html` : `${formatDay(day)}.html`;
  }
  return `${slugify(baseName)}.html`;
}

// Must match build.js isJournalPath(): journal, journalish, "journal entries"
// and any other spacing of the same folder name.
function isJournalPath(relativePath) {
  const first = relativePath.split(/[\\/]/).filter(Boolean)[0]?.toLowerCase() || '';
  const compact = first.replace(/[\s_-]+/g, '');
  return compact === 'journal' || compact === 'journalish' || compact === 'journalentries';
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'page';
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

for (const sourcePath of walk(contentRoot).filter((filePath) => filePath.endsWith('.md'))) {
  const relativePath = path.relative(contentRoot, sourcePath);
  if (relativePath.toLowerCase() === 'about-me.md') continue;
  const outputPath = path.join(outputRoot, path.dirname(relativePath), outputName(path.basename(relativePath), relativePath));
  if (!fs.existsSync(outputPath)) failures.push(`Missing output: ${relativePath}`);
  if (isJournalPath(relativePath) && !fs.existsSync(outputPath.replace(/\.html$/i, '.txt'))) {
    failures.push(`Missing journal text file: ${relativePath}`);
  }
  if (outputPath.endsWith('.txt') && fs.existsSync(outputPath) && /[^\x00-\x7F]/.test(fs.readFileSync(outputPath, 'ascii'))) {
    failures.push(`Not US-ASCII: ${relativePath}`);
  }
}

if (!fs.existsSync(path.join(outputRoot, 'index.html'))) failures.push('Missing public/index.html');
if (!fs.existsSync(path.join(outputRoot, '404.html'))) failures.push('Missing public/404.html');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Build validation passed.');
