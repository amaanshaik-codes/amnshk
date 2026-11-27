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
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

// Only /api/<name>.js is addressable. Rejecting anything else here keeps a
// crafted URL like /api/../build from escaping into the rest of the repo.
function apiHandler(routeName) {
  if (!/^[a-z0-9_-]+$/i.test(routeName)) return null;
  const file = path.join(root, 'api', `${routeName}.js`);
  return fs.existsSync(file) ? require(file) : null;
}

function sendFile(req, res, filePath) {
  const stats = fs.statSync(filePath);
  const etag = `W/"${stats.size}-${Math.floor(stats.mtimeMs)}"`;
  const headers = {
    'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    ETag: etag,
    'Cache-Control': 'no-cache'
  };
  // Revalidation matters here: without it the browser reuses a stale page
  // between builds and edits appear not to apply.
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  headers['Content-Length'] = stats.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://localhost:${port}`);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const handler = apiHandler(url.pathname.replace(/^\/api\//, '').replace(/\/$/, ''));
    if (!handler) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.status = (code) => { res.statusCode = code; return res; };
    res.send = (body) => res.end(body);
    // Same shape of request Vercel hands a function: headers already flattened.
    // A rejection here would otherwise crash the process and kill the preview.
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((error) => {
        console.error(`api/${url.pathname} failed:`, error);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal error');
      });
    return;
  }

  let filePath;
  try {
    filePath = path.join(publicRoot, decodeURIComponent(url.pathname));
  } catch {
    // decodeURIComponent throws on malformed escapes such as /%zz
    res.writeHead(400).end('Bad request');
    return;
  }

  // Confine to public/ even if the resolved path tries to climb out.
  const resolved = path.resolve(filePath);
  if (resolved !== publicRoot && !resolved.startsWith(publicRoot + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) filePath = path.join(resolved, 'index.html');
  else filePath = resolved;

  if (!fs.existsSync(filePath)) {
    const notFound = path.join(publicRoot, '404.html');
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': types['.html'] });
      res.end(fs.readFileSync(notFound));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
    return;
  }

  sendFile(req, res, filePath);
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use - try PORT=4174 npm run serve` : error);
  process.exit(1);
});

server.listen(port, () => console.log(`Preview on http://localhost:${port}`));
