#!/usr/bin/env node
/* 開發用靜態伺服器：一律 no-store，避免瀏覽器拿到舊檔。正式站由 GitHub Pages 提供。 */
var http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
var root = path.join(__dirname, '..');
var TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8'
};
http.createServer(function (req, res) {
  var p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/') p = '/index.html';
  var file = path.join(root, p);
  if (file.indexOf(root) !== 0) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(file, function (err, buf) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Service-Worker-Allowed': '/'
    });
    res.end(buf);
  });
}).listen(4173, function () { console.log('dev server on http://localhost:4173'); });
