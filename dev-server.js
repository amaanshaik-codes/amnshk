// Local preview for `npm run serve`: serves public/ and runs api/*.js the way
// Vercel would, so the visitor counter works without deploying.

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const publicRoot = path.join(root, 'public');
const port = Number(process.env.PORT) || 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function apiHandler(routeName) {
  const file = path.join(root, 'api', `${routeName}.js`);
  return fs.existsSync(file) ? require(file) : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname.startsWith('/api/')) {
    const handler = apiHandler(url.pathname.replace(/^\/api\//, '').replace(/\/$/, ''));
    if (!handler) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.status = (code) => { res.statusCode = code; return res; };
    res.send = (body) => res.end(body);
    res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    // Same shape of request Vercel hands a function: headers already flattened.
    handler(req, res);
    return;
  }

  let filePath = path.join(publicRoot, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath)) {
    const notFound = path.join(publicRoot, '404.html');
    res.writeHead(404, { 'Content-Type': types['.html'] });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
});

server.listen(port, () => console.log(`Preview on http://localhost:${port}`));
