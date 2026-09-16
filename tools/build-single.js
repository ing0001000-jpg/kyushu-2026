#!/usr/bin/env node
/* 把 index.html + app.css + app.js + data/*.js + 圖示全部 inline 成一個檔案。
   用法：node tools/build-single.js [tripId]　產出 dist/<tripId>.html，可直接用瀏覽器開，也可發布成 Artifact。 */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
var R = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };

var css = R('app.css');
/* 單檔版只裝一趟行程：資料全部 inline，並告訴 app.js 不用再去抓 trips/ 底下的檔案 */
var TRIP_ID = process.argv[2] || 'kyushu-2026';
var meta = JSON.parse(R('data/site.js').slice(R('data/site.js').indexOf('{')).replace(/;\s*$/, ''));
var entry = (meta.trips || []).filter(function (t) { return t.id === TRIP_ID; })[0] || { artPacks: [] };
var files = ['data/site.js', 'data/art/_core.js']
  .concat((entry.artPacks || []).map(function (p) { return 'data/art/' + p + '.js'; }))
  .concat(['trip', 'guide', 'places', 'packing'].map(function (n) { return 'trips/' + TRIP_ID + '/' + n + '.js'; }))
  .concat(['app.js', 'admin.js']);
var js = "window.__BUNDLED_TRIP = '" + TRIP_ID + "';\n" + files.map(R).join('\n');
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
var dest = path.join(root, 'dist/' + TRIP_ID + '.html');
fs.writeFileSync(dest, out);
console.log('wrote ' + dest + '  (' + (fs.statSync(dest).size / 1024).toFixed(1) + ' KB)');
