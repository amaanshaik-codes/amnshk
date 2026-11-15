const fs = require('fs');
const path = require('path');

const root = __dirname;
const contentRoot = path.join(root, 'Content');
const outputRoot = path.join(root, 'public');
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

for (const sourcePath of walk(contentRoot).filter((filePath) => filePath.endsWith('.md'))) {
  const relativePath = path.relative(contentRoot, sourcePath);
  const outputPath = path.join(outputRoot, relativePath.replace(/\.md$/, '.txt'));
  if (!fs.existsSync(outputPath)) failures.push(`Missing output: ${relativePath}`);
  if (fs.existsSync(outputPath) && /[^\x00-\x7F]/.test(fs.readFileSync(outputPath, 'ascii'))) {
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
