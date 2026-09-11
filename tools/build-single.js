#!/usr/bin/env node
/* 把 index.html + app.css + app.js + data/*.js + 圖示全部 inline 成一個檔案。
   產出 dist/kyushu.html，可直接用瀏覽器開，也可發布成 Artifact。 */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
var R = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };

var css = R('app.css');
var js = ['data/config.js', 'data/art.js', 'data/trip.js', 'data/guide.js', 'data/places.js', 'data/packing.js', 'app.js', 'admin.js'].map(R).join('\n');
var icon = fs.readFileSync(path.join(root, 'icons/icon-192.png')).toString('base64');

/* 取 index.html 的 <body> 內容，去掉 <script src> 標籤 */
var html = R('index.html');
var body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/\s*<script src="[^"]*"><\/script>/g, '')
  .trim();

/* Artifact 平台會自行包 <!doctype>/<head>/<body>，所以這裡只輸出頁面內容。
   直接用瀏覽器開檔時，瀏覽器也會自動補齊，一樣能跑。 */
var out = '<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  + '<title>九州旅遊助手</title>\n'
  + '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n'
  + '<meta name="theme-color" content="#cf4229">\n'
  + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-title" content="九州行程">\n'
  + '<link rel="apple-touch-icon" href="data:image/png;base64,' + icon + '">\n'
  + '<style>\n' + css + '\n</style>\n\n'
  + body + '\n\n'
  + '<script>\n' + js + '\n</script>\n';

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
var dest = path.join(root, 'dist/kyushu.html');
fs.writeFileSync(dest, out);
console.log('wrote ' + dest + '  (' + (fs.statSync(dest).size / 1024).toFixed(1) + ' KB)');
