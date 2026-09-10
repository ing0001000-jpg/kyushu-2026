#!/usr/bin/env node
/* 把 Google 地圖匯出的收藏地點轉成 data/places.js。
   支援：已儲存清單匯出的 CSV、Takeout 的 GeoJSON/JSON、我的地圖的 KML。
   用法：node tools/import-places.js <檔案...> [--resolve]
        --resolve 會連網把 maps.app.goo.gl 短網址展開成座標（沒帶就跳過，不連網）。 */
var fs = require('fs'), path = require('path'), https = require('https');
var root = path.join(__dirname, '..');

/* 各區錨點（可多個）。座標只用來判斷「這個點屬於哪一區」，不寫進資料。 */
var ANCHORS = [
  { id: 'fukuoka',  pts: [[33.5902, 130.4017], [33.5896, 130.3958]] },
  { id: 'dazaifu',  pts: [[33.5213, 130.5350]] },
  { id: 'nagasaki', pts: [[32.7503, 129.8779], [33.1795, 129.7156]] },
  { id: 'kumamoto', pts: [[32.8032, 130.7079]] },
  { id: 'aso',      pts: [[32.8846, 131.0729], [32.7115, 131.3080]] },
  { id: 'kurokawa', pts: [[33.0806, 131.1436]] },
  { id: 'yufuin',   pts: [[33.2647, 131.3573]] },
  { id: 'beppu',    pts: [[33.2794, 131.5008]] }
];
var MAX_KM = 40;

/* 沒有座標時的備援：靠名稱關鍵字猜區域。 */
var KEYWORDS = {
  fukuoka:  ['福岡', '博多', '天神', '中洲', '大濠', '糸島', '門司', '小倉', '北九州', '柳川', 'キャナル', '運河城'],
  dazaifu:  ['太宰府', '大宰府'],
  nagasaki: ['長崎', '佐世保', 'ハウステンボス', '豪斯登堡', '九十九島', '雲仙', '島原', '軍艦島', 'グラバー', '哥拉巴'],
  kumamoto: ['熊本', '阿蘇熊本', '天草', '人吉', '菊池'],
  aso:      ['阿蘇', '高千穂', '高千穗', '草千里', '大観峰', '大觀峰', '南阿蘇', '白川水源'],
  kurokawa: ['黒川', '黑川', '南小国', '南小國', 'わいた'],
  yufuin:   ['湯布院', '由布院', '由布', '金鱗湖'],
  beppu:    ['別府', '地獄', '鉄輪', '鐵輪', '明礬', '九重', 'くじゅう']
};

/* ---------- 小工具 ---------- */
function km(a, b) {
  var R = 6371, p = Math.PI / 180;
  var dLat = (b[0] - a[0]) * p, dLng = (b[1] - a[1]) * p;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}
function regionOf(item) {
  if (item.lat != null) {
    var best = null;
    ANCHORS.forEach(function (a) {
      a.pts.forEach(function (p) {
        var d = km([item.lat, item.lng], p);
        if (!best || d < best.d) best = { id: a.id, d: d };
      });
    });
    if (best && best.d <= MAX_KM) return best.id;
  }
  var hay = (item.n || '') + ' ' + (item.d || '') + ' ' + (item.addr || '');
  for (var id in KEYWORDS) {
    for (var i = 0; i < KEYWORDS[id].length; i++) if (hay.indexOf(KEYWORDS[id][i]) >= 0) return id;
  }
  return null;
}
/* 從 Google 地圖網址挖座標 */
function coordsFromUrl(u) {
  if (!u) return null;
  var m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    || u.match(/[?&](?:query|ll|q|center|daddr|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
/* 從網址挖地名（/place/名稱/） */
function nameFromUrl(u) {
  var m = u && u.match(/\/maps\/place\/([^\/@?]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]).replace(/\+/g, ' '); } catch (e) { return ''; }
}

/* ---------- 各種格式的解析 ---------- */
function parseCsv(text) {
  var rows = [], row = [], cur = '', q = false;
  text = text.replace(/^﻿/, '');
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return [];

  var head = rows.shift().map(function (h) { return h.trim().toLowerCase(); });
  var col = function (names) {
    for (var i = 0; i < head.length; i++) if (names.indexOf(head[i]) >= 0) return i;
    return -1;
  };
  var iT = col(['title', '標題', '名稱', 'name']);
  var iN = col(['note', '備註', 'comment', 'notes']);
  var iU = col(['url', '網址', 'link', 'urls']);
  return rows.filter(function (r) { return r.join('').trim(); }).map(function (r) {
    var url = iU >= 0 ? (r[iU] || '').trim() : '';
    var it = { n: (iT >= 0 ? r[iT] : '').trim(), d: (iN >= 0 ? r[iN] : '').trim(), url: url };
    if (!it.n) it.n = nameFromUrl(url);
    var c = coordsFromUrl(url);
    if (c) { it.lat = c[0]; it.lng = c[1]; }
    return it;
  }).filter(function (it) { return it.n; });
}

function parseGeoJson(obj) {
  var feats = obj.features || [];
  return feats.map(function (f) {
    var p = f.properties || {}, loc = p.location || {};
    var g = f.geometry || {}, c = g.coordinates || [];
    var it = {
      n: loc.name || p.name || p.Title || nameFromUrl(p.google_maps_url || '') || '',
      d: p.comment || p.note || p.description || '',
      addr: loc.address || p.address || '',
      url: p.google_maps_url || p.url || ''
    };
    if (typeof c[0] === 'number' && typeof c[1] === 'number') { it.lat = c[1]; it.lng = c[0]; }
    if (it.lat == null) { var cc = coordsFromUrl(it.url); if (cc) { it.lat = cc[0]; it.lng = cc[1]; } }
    return it;
  }).filter(function (it) { return it.n; });
}

function parseKml(text) {
  var out = [], re = /<Placemark[\s\S]*?<\/Placemark>/g, m;
  var pick = function (s, tag) {
    var r = new RegExp('<' + tag + '(?:[^>]*)>([\\s\\S]*?)<\\/' + tag + '>').exec(s);
    if (!r) return '';
    return r[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();
  };
  while ((m = re.exec(text))) {
    var p = m[0], it = { n: pick(p, 'name'), d: pick(p, 'description'), url: '' };
    var c = pick(p, 'coordinates').split(',');
    if (c.length >= 2) { it.lng = parseFloat(c[0]); it.lat = parseFloat(c[1]); }
    if (it.n) out.push(it);
  }
  return out;
}

/* ---------- 短網址展開（僅 --resolve 時連網） ---------- */
function expand(url, depth) {
  return new Promise(function (res) {
    if (depth > 5) return res(null);
    https.get(url, { headers: { 'user-agent': 'Mozilla/5.0' } }, function (r) {
      var loc = r.headers.location;
      r.resume();
      if (loc && r.statusCode >= 300 && r.statusCode < 400) return res(expand(loc, depth + 1));
      res(url);
    }).on('error', function () { res(null); });
  });
}

/* ---------- 主流程 ---------- */
var args = process.argv.slice(2);
var doResolve = args.indexOf('--resolve') >= 0;
var files = args.filter(function (a) { return a.indexOf('--') !== 0; });
if (!files.length) {
  console.error('用法：node tools/import-places.js <匯出檔.csv|.json|.geojson|.kml> [--resolve]');
  process.exit(1);
}

var items = [];
files.forEach(function (f) {
  var text = fs.readFileSync(f, 'utf8'), ext = path.extname(f).toLowerCase();
  var list = ext === '.csv' ? parseCsv(text)
    : (ext === '.json' || ext === '.geojson') ? parseGeoJson(JSON.parse(text))
    : (ext === '.kml') ? parseKml(text)
    : [];
  if (!list.length) console.warn('! ' + path.basename(f) + ' 沒有解析到任何地點');
  var listName = path.basename(f).replace(/\.[^.]+$/, '');
  list.forEach(function (it) { it.list = listName; });
  items = items.concat(list);
});

/* 去重：只認同名。日本商店街同一棟樓裡就有好幾家不同店，
   用距離去重會把它們誤判成同一筆，所以不比座標。 */
var seen = Object.create(null);
items = items.filter(function (it) {
  var k = it.n.trim();
  if (seen[k]) return false;
  seen[k] = 1; return true;
});

(async function () {
  if (doResolve) {
    var short = items.filter(function (it) { return it.lat == null && /goo\.gl|maps\.app/.test(it.url || ''); });
    for (var i = 0; i < short.length; i++) {
      process.stdout.write('\r展開短網址 ' + (i + 1) + '/' + short.length + ' ');
      var full = await expand(short[i].url, 0);
      var c = full && coordsFromUrl(full);
      if (c) { short[i].lat = c[0]; short[i].lng = c[1]; }
      if (full && !short[i].n) short[i].n = nameFromUrl(full);
    }
    if (short.length) process.stdout.write('\n');
  }

  var byRegion = {}, unassigned = [];
  ANCHORS.forEach(function (a) { byRegion[a.id] = []; });
  items.forEach(function (it) {
    var rec = { n: it.n };
    if (it.d) rec.d = it.d;
    /* map 欄位＝導航用的搜尋字串，有座標就用座標，最準 */
    rec.map = it.lat != null ? (it.lat.toFixed(6) + ',' + it.lng.toFixed(6)) : it.n;
    if (it.lat != null) rec.label = it.n;
    if (it.list) rec.list = it.list;
    var r = regionOf(it);
    if (r) byRegion[r].push(rec); else unassigned.push(rec);
  });

  var J = function (v) { return JSON.stringify(v); };
  var out = '/* 由 tools/import-places.js 產生，請勿手改；重新匯入會整個覆蓋。\n'
    + '   來源：Google 地圖收藏（' + files.map(function (f) { return path.basename(f); }).join('、') + '）\n'
    + '   產生時間：' + new Date().toISOString().slice(0, 10) + ' */\n'
    + 'window.PLACES = {\n'
    + '  updated: ' + J(new Date().toISOString().slice(0, 10)) + ',\n'
    + '  regions: {\n'
    + ANCHORS.map(function (a) {
        return '    ' + a.id + ': [\n'
          + byRegion[a.id].map(function (x) { return '      ' + J(x); }).join(',\n')
          + (byRegion[a.id].length ? '\n' : '') + '    ]';
      }).join(',\n') + '\n  },\n'
    + '  unassigned: [\n'
    + unassigned.map(function (x) { return '    ' + J(x); }).join(',\n')
    + (unassigned.length ? '\n' : '') + '  ]\n};\n';

  fs.writeFileSync(path.join(root, 'data/places.js'), out);
  console.log('寫入 data/places.js');
  ANCHORS.forEach(function (a) {
    if (byRegion[a.id].length) console.log('  ' + a.id + '：' + byRegion[a.id].length + ' 筆');
  });
  var noGeo = items.filter(function (it) { return it.lat == null; }).length;
  console.log('  未分區：' + unassigned.length + ' 筆　（總計 ' + items.length + ' 筆，其中 ' + noGeo + ' 筆沒有座標）');
  if (noGeo && !doResolve) console.log('  ↳ 沒座標的多半是短網址，可加 --resolve 重跑，會連網展開後再判斷。');
})();
