/* 離線快取。改版時把 CACHE 的版本號 +1，舊快取會自動清掉。 */
var CACHE = 'hz-v9';
/* 只預先快取「引擎殼」。各趟行程的 trips/<id>/*.js 與插畫包走下面的
   cache-first，第一次瀏覽時自動收進來，所以新增行程不必改這份清單。 */
var ASSETS = [
  './', './index.html', './app.css', './app.js', './admin.js',
  './data/site.js', './data/art/_core.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        /* 清自己的舊快取，順便清掉改版前的 kyushu2026-vN */
        if (k === CACHE) return null;
        return (k.indexOf('hz-v') === 0 || k.indexOf('kyushu2026-') === 0) ? caches.delete(k) : null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* cache-first：離線時直接用快取；有網路時背景更新。只處理自家 GET。 */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    /* ignoreSearch：?t=、?now= 這類查詢字串不影響檔案內容，離線時照樣命中 */
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
