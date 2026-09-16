/* 旅遊助手 — vanilla JS，無外部依賴（Google Fonts 失效時自動退回系統字型）。
   引擎與行程資料分離：這支只認 data/site.js 的行程索引，內容在 trips/<id>/ 底下。 */
(function () {
  'use strict';

  /* ---------- 儲存命名空間 ----------
     全域（跨行程共用）：hz:theme / hz:gate / hz:lastTrip / hz:ghtoken / hz:site
     每趟行程：hz:<tripId>:state（打包勾選、匯率）、hz:<tripId>:data（後台草稿）
     舊版的 kyushu2026:* 開機時自動搬過來，搬完保留舊 key 當回退保險。 */
  var NS = 'hz:';
  var SITE = window.SITE || { gate: {}, repo: {}, trips: [] };
  var TRIP_KEYS = ['TRIP', 'GUIDE', 'PLACES', 'PACKING', 'TODOS'];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function jGet(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }

  (function migrateLegacy() {
    if (lsGet(NS + 'migrated')) return;
    var old = jGet('kyushu2026:v1');
    if (old && !lsGet(NS + 'kyushu-2026:state')) {
      lsSet(NS + 'kyushu-2026:state', JSON.stringify({ checks: old.checks || {}, rate: old.rate, mine: old.mine || [] }));
      if (old.theme) lsSet(NS + 'theme', old.theme);
    }
    [['kyushu2026:data', 'kyushu-2026:data'], ['kyushu2026:gate', 'gate'], ['kyushu2026:ghtoken', 'ghtoken']]
      .forEach(function (p) { var v = lsGet(p[0]); if (v && !lsGet(NS + p[1])) lsSet(NS + p[1], v); });
    lsSet(NS + 'migrated', '1');
  })();

  /* ---------- 資料覆寫層（每趟一份） ----------
     後台改過的資料存在 localStorage，載入該趟時蓋回原始資料上。
     用「就地取代」而不是換掉物件，下面各處抓到的參照才不會失效。 */
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
  function replaceInPlace(t, s) {
    if (Array.isArray(t) && Array.isArray(s)) {
      t.length = 0;
      for (var i = 0; i < s.length; i++) t.push(s[i]);
      return t;
    }
    Object.keys(t).forEach(function (k) { if (!(k in s)) delete t[k]; });
    Object.keys(s).forEach(function (k) { t[k] = s[k]; });
    return t;
  }

  /* 站台設定草稿（gate / repo / trips），跨行程共用 */
  (function () { var s = jGet(NS + 'site'); if (s && typeof s === 'object') replaceInPlace(SITE, s); })();
  window.SITE = SITE;
  window.__saveSite = function () { return lsSet(NS + 'site', JSON.stringify(SITE)); };
  window.__resetSite = function () { lsDel(NS + 'site'); };

  var TRIP = null, GUIDE = null, PACKING = null, TODOS = null, PLACES = null;
  var ART = window.ART;
  var tripId = null;

  window.__ORIG = {};
  function bindTrip(id) {
    tripId = id;
    window.__ORIG = {};
    TRIP_KEYS.forEach(function (k) { if (window[k]) window.__ORIG[k] = deepCopy(window[k]); });
    /* 草稿蓋回線上資料；剛開的新行程線上還沒有檔案，就整份用草稿的 */
    var ov = jGet(NS + id + ':data');
    if (ov && typeof ov === 'object') {
      TRIP_KEYS.forEach(function (k) {
        if (!ov[k]) return;
        if (window[k]) replaceInPlace(window[k], ov[k]); else window[k] = deepCopy(ov[k]);
      });
    }
    if (!window.TRIP) throw new Error('這趟行程還沒有資料');
    TRIP = window.TRIP;
    GUIDE = window.GUIDE || { regions: [], practical: [], phrases: [] };
    PACKING = window.PACKING || [];
    TODOS = window.TODOS || [];
    PLACES = window.PLACES || { updated: '', regions: {}, unassigned: [] };
    window.GUIDE = GUIDE; window.PACKING = PACKING; window.TODOS = TODOS; window.PLACES = PLACES;
    if (!TRIP.regions) TRIP.regions = [];
    if (!TRIP.days) TRIP.days = [];
    loadState();
    injectPalette();
    lsSet(NS + 'lastTrip', id);
  }
  window.__tripId = function () { return tripId; };

  window.__saveData = function () {
    if (!tripId) return false;
    var out = { savedAt: new Date().toISOString() };
    TRIP_KEYS.forEach(function (k) { if (window[k]) out[k] = window[k]; });
    return lsSet(NS + tripId + ':data', JSON.stringify(out));
  };
  window.__hasDraft = function () { return !!(tripId && lsGet(NS + tripId + ':data')); };
  /* 後台「新增行程」用：線上還沒有檔案，先把骨架寫成該趟的草稿 */
  window.__seedTrip = function (id, data) { return lsSet(NS + id + ':data', JSON.stringify(data)); };
  window.__resetData = function () {
    if (tripId) lsDel(NS + tripId + ':data');
    TRIP_KEYS.forEach(function (k) {
      if (window[k] && window.__ORIG[k]) replaceInPlace(window[k], deepCopy(window.__ORIG[k]));
    });
  };

  /* ---------- state（打包勾選／匯率：每趟一份；主題：全站一份） ---------- */
  var theme = lsGet(NS + 'theme') || null;
  var state = { checks: {}, rate: 0.215, mine: [] };
  function loadState() {
    state = { checks: {}, rate: 0.215, mine: [] };
    var p = jGet(NS + tripId + ':state');
    if (p && typeof p === 'object') {
      state.checks = p.checks || {};
      if (typeof p.rate === 'number' && p.rate > 0) state.rate = p.rate;
      if (Array.isArray(p.mine)) state.mine = p.mine.filter(function (x) { return x && x.id && x.t; });
    }
  }
  function save() { if (tripId) lsSet(NS + tripId + ':state', JSON.stringify(state)); }

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function mapUrl(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function yen(n) { return 'JPY ' + Number(n).toLocaleString('en-US'); }
  function dateObj(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  /* 預覽用：網址加 ?now=2026-09-28T07:30 就能看到那個時間點的「今天」 */
  (function () {
    var m = /[?&]now=([0-9T:\-]+)/.exec(location.search);
    if (m) window.__mockNow = m[1];
  })();
  function nowDate() {
    if (window.__mockNow) {
      var a = window.__mockNow.split(/[-T:]/);
      return new Date(+a[0], +a[1] - 1, +a[2], +(a[3] || 0), +(a[4] || 0));
    }
    return new Date();
  }
  function nowMins() { var n = nowDate(); return n.getHours() * 60 + n.getMinutes(); }
  function today() {
    if (window.__mockDate) return dateObj(window.__mockDate);
    var n = nowDate(); return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
  function fmtMD(s) { var a = s.split('-'); return (+a[1]) + '/' + (+a[2]); }
  function I(name) { return ART.icons[name] || ''; }
  function regOf(n) { return (TRIP.dayRegion && TRIP.dayRegion[n]) || defaultReg(); }

  /* ---------- 地區：色盤與插畫都從 TRIP.regions 來 ----------
     以前同一組地區 id 散在 app.css、art.js、admin.js 各一份，改成只有這裡一份。 */
  function regionOf(id) {
    var rs = (TRIP && TRIP.regions) || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i];
    return null;
  }
  function defaultReg() {
    var rs = (TRIP && TRIP.regions) || [];
    return regionOf('journey') ? 'journey' : (rs[0] ? rs[0].id : 'journey');
  }
  function artKey(id) { var r = regionOf(id); return (r && r.art) || ART.fallback; }
  function scene(reg) { return ART.svg(artKey(reg)); }
  function stamp(reg) {
    return '<span class="stamp" data-reg="' + esc(reg) + '">'
      + ART.svg(artKey(reg), 'scene', 'xMidYMid slice') + '</span>';
  }
  var PAL_KEYS = ['rb', 'sky', 'far', 'mid', 'near', 'pop', 'pale'];
  function injectPalette() {
    var el = document.getElementById('hz-palette');
    if (!el) { el = document.createElement('style'); el.id = 'hz-palette'; document.head.appendChild(el); }
    el.textContent = ((TRIP && TRIP.regions) || []).map(function (r) {
      var p = r.palette || {};
      return '[data-reg="' + r.id + '"]{' + PAL_KEYS.map(function (k) {
        return (k === 'rb' ? '--rb:' : '--c-' + k + ':') + (p[k] || '#8a8a8a');
      }).join(';') + '}';
    }).join('\n');
  }

  var PART = { am: ['上午', 'sun'], pm: ['下午', 'cloud'], night: ['晚上', 'moon'] };

  /* ---------- theme ---------- */
  function applyTheme() {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme();
  document.getElementById('theme-btn').addEventListener('click', function () {
    var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    if (!theme) theme = sysDark ? 'light' : 'dark';
    else theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(); lsSet(NS + 'theme', theme);
  });

  /* ---------- 現在進行到哪 ----------
     把當天每一項排上時間軸：有寫時間的照寫的，沒寫的平均塞進前後兩個有寫的時間之間
     （上午從 9:00、下午從 12:00、晚上從 18:00 算起，晚上排到 22:00）。
     每一項的結束時間＝寫明的結束時間，沒寫就算到下一項開始。 */
  var PART_WIN = { am: [540, 720], pm: [720, 1080], night: [1080, 1320] };
  var PART_ORD = ['am', 'pm', 'night'];
  function hmOf(s) { var m = /(\d{1,2}):(\d{2})/.exec(s); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function hhmm(m) { m = Math.round(m); return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function clip(s, n) { s = s || ''; return s.length > n ? s.slice(0, n) + '…' : s; }
  function spanOf(t) {
    t = (t || '').trim();
    var all = t.match(/\d{1,2}:\d{2}/g) || [];
    if (all.length >= 2) return [hmOf(all[0]), hmOf(all[1])];
    if (all.length === 1) return /^[～~]/.test(t) ? [null, hmOf(all[0])] : [hmOf(all[0]), null];
    if (/午餐/.test(t)) return [720, null];
    if (/晚餐/.test(t)) return [1080, null];
    return [null, null];
  }
  function dayTimeline(day) {
    var tl = [];
    day.blocks.forEach(function (b) {
      var w = PART_WIN[b.part] || [0, 1440];
      var its = b.items.map(function (it) { var sp = spanOf(it.time); return { it: it, part: b.part, s: sp[0], e: sp[1], est: sp[0] == null, w: w }; });
      var i = 0, j, k, cnt, from, to, step;
      while (i < its.length) {
        if (its[i].s != null) { i++; continue; }
        j = i; while (j < its.length && its[j].s == null) j++;
        cnt = j - i;
        to = j < its.length ? its[j].s : w[1];
        if (i === 0) { from = w[0]; step = (to - from) / cnt; for (k = 0; k < cnt; k++) its[i + k].s = from + step * k; }
        else if (its[i - 1].e != null) { from = its[i - 1].e; step = (to - from) / cnt; for (k = 0; k < cnt; k++) its[i + k].s = from + step * k; }
        else { from = its[i - 1].s; step = (to - from) / (cnt + 1); for (k = 0; k < cnt; k++) its[i + k].s = from + step * (k + 1); }
        i = j;
      }
      its.forEach(function (x) { if (x.est) x.s = Math.round(x.s / 5) * 5; tl.push(x); });
    });
    tl.forEach(function (x, i) {
      var nx = tl[i + 1];
      x.end = x.e != null ? x.e : (nx && nx.s > x.s ? nx.s : x.w[1]);
      if (x.end <= x.s) x.end = x.s + 30;
    });
    return tl;
  }
  function nowStatus(day, mins) {
    var tl = dayTimeline(day), cur = [], next = null;
    tl.forEach(function (x) {
      if (x.s <= mins && mins < x.end) cur.push(x);
      else if (x.s > mins && !next) next = x;
    });
    cur.sort(function (a, b) { return b.s - a.s; });
    return { tl: tl, mins: mins, cur: cur[0] || null, also: cur.slice(1), next: next };
  }
  function isTodayDay(day) {
    var t = today(), s = dateObj(TRIP.start);
    return t >= s && t <= dateObj(TRIP.end) && dayDiff(s, t) === day.n - 1;
  }
  /* 航班：從標籤裡抓航班號與是哪一團，例如「虎航 IT240・小阿姨團 4 人」 */
  function flightOf(it) {
    var m = /\b(BR|IT|CI|JX|MM|GK)\s?\d{2,4}\b/.exec((it.tag || '') + ' ' + (it.title || ''));
    if (!m) return null;
    var parts = (it.tag || '').split('・');
    return { code: m[0], air: (parts[0] || '').replace(m[0], '').trim(), who: (parts[1] || '').trim() };
  }
  function partNow(st) { return st.cur ? st.cur.part : st.next ? st.next.part : 'night'; }

  function whereHtml(day, part) {
    var bs = day.blocks.filter(function (b) { return b.items.length && b.where; });
    if (!bs.length) return '';
    var pi = PART_ORD.indexOf(part), curB = null, line = '', i;
    for (i = 0; i < bs.length; i++) if (bs[i].part === part) curB = bs[i];
    if (curB) {
      if (bs.every(function (b) { return b.where === curB.where; })) line = '今天都在' + curB.where;
      else {
        /* 「A → B」這種是一段移動，不一定此刻就在路上，所以不說「現在在」 */
        var moving = /→/.test(curB.where), dest = curB.where.split('→').pop().trim();
        line = moving ? PART[curB.part][0] + '這段：' + curB.where : '現在在' + curB.where;
        for (i = 0; i < bs.length; i++) {
          var b = bs[i];
          if (PART_ORD.indexOf(b.part) <= pi || b.where === curB.where) continue;
          /* 下一段就是剛才的目的地（例如「長崎 → 熊本」之後的「熊本」），不用再講一次 */
          if (!/→/.test(b.where) && b.where.indexOf(dest) === 0) break;
          line += /→/.test(b.where) ? '，' + PART[b.part][0] + '移動：' + b.where
                                     : '，' + PART[b.part][0] + '往' + b.where + '出發';
          break;
        }
      }
    }
    /* 動線小籤：連續同一個地方就合併 */
    var groups = [];
    bs.forEach(function (b) {
      var g = groups[groups.length - 1];
      if (g && g.where === b.where) g.parts.push(b.part); else groups.push({ where: b.where, parts: [b.part] });
    });
    var strip = groups.length < 2 ? '' : '<div class="now-strip">' + groups.map(function (g) {
      var idx = g.parts.map(function (p) { return PART_ORD.indexOf(p); });
      var cls = idx.indexOf(pi) >= 0 ? 'cur' : (Math.max.apply(null, idx) < pi ? 'past' : '');
      var lb = g.parts.length === 3 ? '全天' : g.parts.map(function (p) { return PART[p][0]; }).join('・');
      return '<span' + (cls ? ' class="' + cls + '"' : '') + '><b>' + lb + '</b>' + esc(g.where) + '</span>';
    }).join('') + '</div>';
    return (line ? '<div class="now-where">' + esc(line) + '</div>' : '') + strip;
  }

  function nowHeroHtml(day, st, hotel) {
    var k, h2, sub = '', f;
    if (st.cur) {
      k = '現在';
      f = flightOf(st.cur.it);
      if (f) {
        h2 = (f.who ? f.who + ' ' : '') + '搭機中 ✈';
        sub = st.cur.it.title + '　' + (f.air ? f.air + ' ' : '') + f.code + (st.cur.e != null ? '，' + hhmm(st.cur.e) + ' 抵達' : '');
      } else {
        h2 = st.cur.it.title;
        sub = st.cur.it.time || '';
        if (st.cur.it.desc) sub += (sub ? '　' : '') + clip(st.cur.it.desc, 40);
      }
    } else if (st.next) {
      k = st.next === st.tl[0] ? '今天第一站' : '下一站';
      f = flightOf(st.next.it);
      if (f) {
        h2 = (f.who ? f.who + ' ' : '') + '準備搭機 ✈';
        sub = st.next.it.title + '　' + (f.air ? f.air + ' ' : '') + f.code + '，' + hhmm(st.next.s) + ' 起飛';
      } else {
        h2 = st.next.it.title;
        sub = (st.next.est ? '大約 ' : '') + hhmm(st.next.s) + ' 開始';
      }
    } else {
      k = '今天行程結束';
      h2 = hotel ? '回 ' + hotel.name + ' 休息' : '一路平安，歡迎回家';
      sub = hotel ? (hotel.access || hotel.addr || '') : '';
    }
    var also = st.also.length ? '<div class="now-also">同一時間：' + st.also.map(function (x) {
      var g = flightOf(x.it); return esc(g && g.who ? g.who + '　' + x.it.title : x.it.title);
    }).join('、') + '</div>' : '';
    return '<div class="now-k"><i></i>' + esc(k) + '</div>'
      + '<h2 class="now-h">' + esc(h2) + '</h2>'
      + (sub ? '<div class="meta">' + esc(sub) + '</div>' : '')
      + also
      + whereHtml(day, partNow(st));
  }

  function nextCardHtml(st) {
    var up = st.tl.filter(function (x) { return x.s > st.mins; });
    if (!st.cur) up = up.slice(1);          /* 沒有進行中的時候，第一項已經在上面大字顯示了 */
    up = up.slice(0, 3);
    if (!up.length) return '';
    return '<div class="sec-title">接下來</div><div class="card card-p nxlist">' + up.map(function (x) {
      var f = flightOf(x.it);
      return '<div class="nx"><div class="nx-t">' + (x.est ? '約 ' : '') + hhmm(x.s) + '</div>'
        + '<div class="nx-b">' + esc(x.it.title)
        + '<small>' + esc(f && f.who ? f.who + '・' + f.code : PART[x.part][0] + (x.it.desc ? '・' + clip(x.it.desc, 22) : '')) + '</small></div>'
        + (x.it.map ? '<a class="nx-go" target="_blank" rel="noopener" href="' + esc(mapUrl(x.it.map)) + '" aria-label="導航到 ' + esc(x.it.title) + '">' + I('nav') + '</a>' : '')
        + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- fragments ---------- */
  function hotelOf(key) {
    if (!key) return null;
    for (var i = 0; i < TRIP.hotels.length; i++) if (TRIP.hotels[i].key === key) return TRIP.hotels[i];
    return null;
  }
  function alertsHtml(list) {
    if (!list || !list.length) return '';
    var LB = { warn: '注意', danger: '重要', info: '提醒' };
    return list.map(function (a) {
      return '<div class="alert ' + a.level + '">' + I('alert')
        + '<div><b>' + esc(LB[a.level] || '提醒') + '</b>' + md(a.text) + '</div></div>';
    }).join('');
  }
  function navBtn(q, label) {
    return '<a class="btn" target="_blank" rel="noopener" href="' + esc(mapUrl(q)) + '">'
      + I('nav') + (label || '導航 · ' + esc(q)) + '</a>';
  }
  function eventHtml(it, cls) {
    var h = '<div class="ev' + (cls ? ' ' + cls : '') + '">';
    if (cls === 'now') h += '<span class="ev-now">進行中</span>';
    if (it.time) h += '<div class="ev-time">' + esc(it.time) + '</div>';
    h += '<div class="ev-title">' + esc(it.title) + '</div>';
    if (it.desc) h += '<div class="ev-desc">' + esc(it.desc) + '</div>';
    if (it.tag) h += '<div><span class="ev-tag">' + I('plane') + esc(it.tag) + '</span></div>';
    if (it.map) h += navBtn(it.map);
    return h + '</div>';
  }
  function blocksHtml(day) {
    /* 今天的話，標出「進行中」和已經過去的項目 */
    var st = isTodayDay(day) ? nowStatus(day, nowMins()) : null;
    function cls(it) {
      if (!st) return '';
      if ((st.cur && st.cur.it === it) || st.also.some(function (x) { return x.it === it; })) return 'now';
      for (var i = 0; i < st.tl.length; i++) if (st.tl[i].it === it) return st.tl[i].end <= st.mins ? 'past' : '';
      return '';
    }
    return day.blocks.map(function (b) {
      if (!b.items.length) return '';
      var pt = PART[b.part];
      return '<div class="part"><div class="part-h">' + I(pt[1]) + '<b>' + pt[0] + '</b>'
        + (b.where ? '<span class="part-w">' + esc(b.where) + '</span>' : '')
        + '<span class="pill">' + b.items.length + '</span></div>'
        + '<div class="tl">' + b.items.map(function (it) { return eventHtml(it, cls(it)); }).join('') + '</div></div>';
    }).join('');
  }
  function hotelCard(h, heading) {
    if (!h) return '';
    var reg = h.art || 'journey';
    var body = '<dl>';
    body += '<div class="kv"><dt>房型</dt><dd>' + esc(h.rooms || '—') + '</dd></div>';
    if (h.access) body += '<div class="kv"><dt>位置</dt><dd>' + esc(h.access) + '</dd></div>';
    if (h.addr) body += '<div class="kv"><dt>地址</dt><dd>' + esc(h.addr) + '</dd></div>';
    if (h.tel) body += '<div class="kv"><dt>電話</dt><dd><a class="tel" href="tel:' + esc(h.tel.replace(/-/g, '')) + '">' + esc(h.tel) + '</a></dd></div>';
    body += '</dl>';
    return (heading ? '<div class="sec-title">' + esc(heading) + '</div>' : '')
      + '<div class="hotel" data-reg="' + esc(reg) + '">'
      + '<div class="hotel-art">' + scene(reg) + '</div>'
      + '<div class="hotel-b">'
      + '<div class="nights">' + esc(h.nights) + '</div>'
      + '<h3>' + esc(h.name) + '</h3>'
      + (h.en ? '<div class="en">' + esc(h.en) + '</div>' : '')
      + body
      + (h.warn ? '<div class="warnpill">⚠︎ ' + esc(h.warn) + '</div>' : '')
      + navBtn(h.map, '地圖・照片')
      + (h.site ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(h.site) + '">' + I('photo') + '官方網站</a>' : '')
      + '</div></div>';
  }

  function allPackIds() {
    var ids = [];
    PACKING.forEach(function (g) { g.items.forEach(function (i) { ids.push('p:' + g.id + ':' + i.id); }); });
    state.mine.forEach(function (x) { ids.push('m:' + x.id); });
    return ids;
  }
  function doneCount(ids) { var n = 0; ids.forEach(function (i) { if (state.checks[i]) n++; }); return n; }

  function regionForDay(n) {
    var id = regOf(n);
    for (var i = 0; i < GUIDE.regions.length; i++) if (GUIDE.regions[i].id === id) return GUIDE.regions[i];
    return null;
  }
  /* 從 Google 地圖收藏匯入的地點（tools/import-places.js 產生）。沒匯入就整段不顯示。 */
  function placesOf(id) { return (PLACES.regions && PLACES.regions[id]) || []; }
  function placeListHtml(list) {
    return '<ul class="ilist">' + list.map(function (x) {
      return '<li><div class="n">' + esc(x.n) + '</div>'
        + (x.d ? '<div class="d">' + esc(x.d) + '</div>' : '')
        + (x.map ? navBtn(x.map, '導航 · ' + esc(x.label || x.n)) : '')
        + '</li>';
    }).join('') + '</ul>';
  }
  function myPlacesHtml(id) {
    var list = placesOf(id);
    if (!list.length) return '';
    return '<div class="sub-h">我的收藏　<span class="pill">' + list.length + '</span></div>' + placeListHtml(list);
  }

  function regionEatHtml(n) {
    var r = regionForDay(n);
    if (!r) return '';
    return '<div class="sec-title">' + esc(r.name) + ' 吃什麼</div>'
      + '<div class="card card-p" data-reg="' + esc(r.id) + '"><ul class="ilist">'
      + r.eat.map(function (x) { return '<li><div class="n">' + esc(x.n) + '</div><div class="d">' + esc(x.d) + '</div></li>'; }).join('')
      + '</ul><div class="muted" style="margin-top:10px">一般建議，不是已排定的行程。</div></div>';
  }

  function dayCard(d, allowNow) {
    var t = today(), s = dateObj(TRIP.start);
    var isNow = allowNow !== false && dayDiff(s, t) === d.n - 1 && t >= s && t <= dateObj(TRIP.end);
    var hotel = hotelOf(d.hotel), reg = regOf(d.n);
    return '<a class="daycard' + (isNow ? ' now' : '') + '" data-reg="' + esc(reg) + '" href="' + hashFor('plan', d.n) + '">'
      + '<div class="dc-art">' + scene(reg)
      + '<div class="dc-badge">' + d.n + '</div>'
      + (isNow ? '<div class="dc-flag">今天</div>' : '') + '</div>'
      + '<div class="dc-body">'
      + '<div class="dc-date">' + fmtMD(d.date) + '　' + esc(d.dow) + '</div>'
      + '<div class="dc-title">' + esc(d.title) + '</div>'
      + '<div class="dc-region">' + esc(d.region) + '</div>'
      + '<div class="dc-foot">' + (hotel ? I('bed') + '<span>' + esc(hotel.name) + '</span>'
                                         : I('plane') + '<span>當晚搭機返台，無住宿</span>') + '</div>'
      + '</div></a>';
  }

  /* ---------- views ---------- */
  function viewToday() {
    var t = today(), s = dateObj(TRIP.start), e = dateObj(TRIP.end), h = '';

    if (t < s) {
      var left = dayDiff(t, s);
      var pIds = allPackIds(), pDone = doneCount(pIds);
      var tIds = TODOS.map(function (x) { return 't:' + x.id; }), tDone = doneCount(tIds);

      h += '<div class="hero" data-reg="journey"><div class="hero-art">' + scene('journey') + '</div>'
        + '<div class="hero-body"><div class="eyebrow">出發倒數</div>'
        + '<div class="big">' + left + '<small>天</small></div>'
        + '<h2>' + esc(TRIP.title) + '</h2>'
        + '<div class="meta">' + esc(TRIP.party) + '</div></div></div>';

      h += '<div class="sec-title">準備進度</div><div class="card card-p stack">'
        + '<div><div class="prog-row"><b>行前待辦</b><span>' + tDone + ' / ' + tIds.length + '</span></div>'
        + '<div class="prog"><i style="width:' + (tIds.length ? tDone / tIds.length * 100 : 0) + '%"></i></div></div>'
        + '<div><div class="prog-row"><b>行李打包</b><span>' + pDone + ' / ' + pIds.length + '</span></div>'
        + '<div class="prog"><i style="width:' + (pIds.length ? pDone / pIds.length * 100 : 0) + '%"></i></div></div>'
        + '</div>';

      h += '<div class="sec-title">行前待辦</div><div class="grp">'
        + TODOS.map(function (x) {
            var id = 't:' + x.id;
            return '<label class="chk"><input type="checkbox" data-k="' + esc(id) + '"' + (state.checks[id] ? ' checked' : '') + '>'
              + '<span class="chk-b"><span class="chk-t">' + esc(x.t) + '</span>'
              + '<span class="chk-d">' + esc(x.d) + '　<span class="chk-by">' + esc(x.by) + '</span></span></span></label>';
          }).join('')
        + '</div>';

      h += '<div class="sec-title">第一天</div>' + dayCard(TRIP.days[0], false);

    } else if (t > e) {
      h += '<div class="hero" data-reg="journey"><div class="hero-art">' + scene('journey') + '</div>'
        + '<div class="hero-body"><div class="eyebrow">旅程已結束</div>'
        + '<div class="big">' + TRIP.days.length + '<small>天</small></div>'
        + '<h2>' + esc(TRIP.title) + '</h2>'
        + '<div class="meta">' + esc(fmtRange(TRIP.start, TRIP.end)) + ' · 歡迎回家</div></div></div>'
        + '<div class="sec-title">全部行程</div><div class="stack">'
        + TRIP.days.map(function (d) { return dayCard(d, false); }).join('') + '</div>';

    } else {
      var idx = dayDiff(s, t), day = TRIP.days[idx], reg = regOf(day.n), hotel = hotelOf(day.hotel);

      var st = nowStatus(day, nowMins());

      /* 最上面跟著行程走：現在在做什麼、在哪裡、接下來往哪 */
      h += '<div class="hero" data-reg="' + esc(reg) + '"><div class="hero-art">' + scene(reg) + '</div>'
        + '<div class="hero-body"><div class="eyebrow">Day ' + day.n + ' · ' + fmtMD(day.date) + ' ' + esc(day.dow)
        + ' · ' + PART[partNow(st)][0] + ' ' + hhmm(st.mins) + '</div>'
        + nowHeroHtml(day, st, hotel)
        + '</div></div>';

      h += '<div data-reg="' + esc(reg) + '">';
      h += nextCardHtml(st);
      if (day.alerts) h += '<div class="stack" style="margin-top:12px">' + alertsHtml(day.alerts) + '</div>';
      if (day.drive) h += '<div class="drive" style="margin-top:12px">' + I('car') + '<span>' + esc(day.drive) + '</span></div>';
      h += blocksHtml(day) + '</div>';

      h += hotel ? hotelCard(hotel, '今晚住宿')
                 : '<div class="sec-title">住宿</div><div class="card card-p"><div class="muted">當晚搭機返台，無住宿。</div></div>';
      h += regionEatHtml(day.n);
      h += '<div class="day-nav" data-reg="' + esc(reg) + '"><a class="wide" href="' + hashFor('plan', day.n) + '">看今天完整行程 →</a></div>';
    }
    return h;
  }

  function viewPlan() {
    return '<div class="sec-title">9 天行程</div><div class="stack">'
      + TRIP.days.map(function (d) { return dayCard(d); }).join('') + '</div>'
      + (TRIP.planNote ? '<div class="card card-p" style="margin-top:18px"><div class="muted">'
        + esc(TRIP.planNote) + '</div></div>' : '');
  }

  /* 住宿概況：筆數由 hotels 算，晚數從 nights 字串裡的「N 晚」加總 */
  function hotelSummary() {
    var hs = TRIP.hotels || [];
    var nights = hs.reduce(function (sum, h) {
      var m = /(\d+)\s*晚/.exec(h.nights || '');
      return sum + (m ? Number(m[1]) : 0);
    }, 0);
    return hs.length + ' 筆訂房' + (nights ? '・' + nights + ' 晚' : '');
  }

  function viewDay(n) {
    var d = null, i;
    for (i = 0; i < TRIP.days.length; i++) if (TRIP.days[i].n === n) d = TRIP.days[i];
    if (!d) return '<p>找不到這一天。</p>';
    var hotel = hotelOf(d.hotel), reg = regOf(d.n);

    var h = '<a class="back" href="' + hashFor('plan') + '">‹ 全部行程</a>'
      + '<div class="hero" data-reg="' + esc(reg) + '"><div class="hero-art">' + scene(reg) + '</div>'
      + '<div class="hero-body"><div class="eyebrow">Day ' + d.n + ' · ' + esc(d.date.replace(/-/g, '/')) + ' ' + esc(d.dow) + '</div>'
      + '<h2 style="font-size:21px;margin-top:6px">' + esc(d.title) + '</h2>'
      + '<div class="meta">' + esc(d.region) + '</div></div></div>';

    h += '<div data-reg="' + esc(reg) + '">';
    if (d.alerts) h += '<div class="stack" style="margin-top:12px">' + alertsHtml(d.alerts) + '</div>';
    if (d.drive) h += '<div class="drive" style="margin-top:12px">' + I('car') + '<span>' + esc(d.drive) + '</span></div>';
    h += blocksHtml(d) + '</div>';

    h += hotel ? hotelCard(hotel, d.n === TRIP.days.length ? '住宿' : '今晚住宿')
               : '<div class="sec-title">住宿</div><div class="card card-p"><div class="muted">當晚搭機返台，無住宿。</div></div>';
    h += regionEatHtml(d.n);

    var prev = d.n > 1 ? hashFor('plan', d.n - 1) : null,
        next = d.n < TRIP.days.length ? hashFor('plan', d.n + 1) : null;
    h += '<div class="day-nav">'
      + '<a class="' + (prev ? '' : 'dis') + '" href="' + (prev || '#') + '">‹ Day ' + (d.n - 1) + '</a>'
      + '<a class="' + (next ? '' : 'dis') + '" href="' + (next || '#') + '">Day ' + (d.n + 1) + ' ›</a></div>';
    return h;
  }

  function viewPack() {
    var ids = allPackIds(), done = doneCount(ids);
    var h = '<div class="card card-p">'
      + '<div class="prog-row"><b>打包進度</b><span>' + done + ' / ' + ids.length + '</span></div>'
      + '<div class="prog"><i style="width:' + (ids.length ? done / ids.length * 100 : 0) + '%"></i></div>'
      + '<div class="muted" style="margin-top:10px">勾選狀態和自己加的項目都只存在這支手機的瀏覽器裡，不會同步給其他人。</div></div>';

    /* 自己要帶的：每個人各自輸入，存在自己手機 */
    var mi = state.mine.map(function (x) { return 'm:' + x.id; }), md = doneCount(mi);
    h += '<div class="grp mine" style="margin-top:12px">'
      + '<div class="grp-h"><span class="gi">🎒</span><b>我自己要帶的</b>'
      + '<span class="cnt">' + md + '/' + mi.length + '</span></div>'
      + state.mine.map(function (x) {
          var id = 'm:' + x.id;
          return '<div class="mine-row"><label class="chk"><input type="checkbox" data-k="' + esc(id) + '"' + (state.checks[id] ? ' checked' : '') + '>'
            + '<span class="chk-b"><span class="chk-t">' + esc(x.t) + '</span></span></label>'
            + '<button type="button" class="mine-del" data-del="' + esc(x.id) + '" aria-label="刪除「' + esc(x.t) + '」">×</button></div>';
        }).join('')
      + '<form class="mine-add" data-form="mine" autocomplete="off">'
      + '<input name="t" maxlength="60" enterkeyhint="done" placeholder="' + (state.mine.length ? '再加一項…' : '例如：隱形眼鏡藥水、行動電源') + '" aria-label="新增自己要帶的項目">'
      + '<button type="submit">新增</button></form></div>';

    h += '<div class="stack" style="margin-top:12px">' + PACKING.map(function (g) {
      var gi = g.items.map(function (i) { return 'p:' + g.id + ':' + i.id; }), gd = doneCount(gi);
      return '<div class="grp">'
        + '<div class="grp-h"><span class="gi">' + g.icon + '</span><b>' + esc(g.name) + '</b>'
        + '<span class="cnt">' + gd + '/' + gi.length + '</span></div>'
        + (g.note ? '<div class="grp-note">' + esc(g.note) + '</div>' : '')
        + g.items.map(function (i) {
            var id = 'p:' + g.id + ':' + i.id;
            return '<label class="chk"><input type="checkbox" data-k="' + esc(id) + '"' + (state.checks[id] ? ' checked' : '') + '>'
              + '<span class="chk-b"><span class="chk-t">' + (i.critical ? '<span class="star">★ </span>' : '') + esc(i.t) + '</span>'
              + (i.d ? '<span class="chk-d">' + esc(i.d) + '</span>' : '') + '</span></label>';
          }).join('')
        + '</div>';
    }).join('') + '</div>';
    return h;
  }

  var PRACT_IC = { drive: 'car', onsen: 'onsen', money: 'yen', weather: 'sun', emergency: 'alert' };

  function viewGuide() {
    var gr = (GUIDE && GUIDE.regions) || [], gp = (GUIDE && GUIDE.practical) || [], gf = (GUIDE && GUIDE.phrases) || [];
    var h = gr.length ? '<div class="sec-title">各區美食與景點</div><div class="stack">' : '';
    h += gr.map(function (r) {
      return '<details class="acc" data-reg="' + esc(r.id) + '"><summary>'
        + stamp(r.id)
        + '<span class="acc-t"><b>' + esc(r.name) + '</b><span>' + esc(r.days) + '</span></span>'
        + '<span class="caret">⌄</span></summary><div class="acc-body">'
        + '<div class="sub-h">吃什麼</div><ul class="ilist">'
        + (r.eat || []).map(function (x) { return '<li><div class="n">' + esc(x.n) + '</div><div class="d">' + esc(x.d) + '</div></li>'; }).join('')
        + '</ul><div class="sub-h">看什麼</div><ul class="ilist">'
        + (r.see || []).map(function (x) { return '<li><div class="n">' + esc(x.n) + '</div><div class="d">' + esc(x.d) + '</div></li>'; }).join('')
        + '</ul>'
        + myPlacesHtml(r.id)
        + (r.tips && r.tips.length ? '<div class="sub-h">小提醒</div><ul class="ilist">'
            + r.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
        + '</div></details>';
    }).join('') + (gr.length ? '</div>' : '');

    /* 匯入時判斷不出區域的收藏，獨立列出，避免資料靜靜消失 */
    if (PLACES.unassigned && PLACES.unassigned.length) {
      h += '<div class="sec-title">我的收藏・未分區</div><div class="card card-p">'
        + placeListHtml(PLACES.unassigned)
        + '<div class="muted" style="margin-top:10px">這些地點離各區錨點較遠或缺座標，沒有自動歸區。</div></div>';
    }
    if (PLACES.updated) {
      h += '<div class="muted" style="margin-top:10px">收藏地點匯入日期：' + esc(PLACES.updated) + '</div>';
    }

    if (gp.length) h += '<div class="sec-title">實用資訊</div><div class="stack">';
    h += gp.map(function (pr) {
      return '<details class="acc"><summary>'
        + '<span class="acc-ic">' + I(PRACT_IC[pr.id] || 'info') + '</span>'
        + '<span class="acc-t"><b>' + esc(pr.title) + '</b></span>'
        + '<span class="caret">⌄</span></summary>'
        + '<div class="acc-body"><ul class="ilist">'
        + pr.items.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('')
        + '</ul></div></details>';
    }).join('') + (gp.length ? '</div>' : '');

    if (gf.length) h += '<div class="sec-title">' + esc(GUIDE.phrasesTitle || '常用會話') + '</div><div class="stack">';
    h += gf.map(function (g) {
      return '<details class="acc"><summary>'
        + '<span class="acc-ic">' + I('guide') + '</span>'
        + '<span class="acc-t"><b>' + esc(g.g) + '</b></span>'
        + '<span class="caret">⌄</span></summary><div class="acc-body">'
        + g.list.map(function (x) {
            return '<div class="ph"><div class="jp">' + esc(x.local != null ? x.local : x.jp) + '</div>'
              + '<div class="tw">' + esc(x.tw) + '</div><div class="rm">' + esc(x.rm) + '</div></div>';
          }).join('')
        + '</div></details>';
    }).join('') + (gf.length ? '</div>' : '');

    if (!gr.length && !gp.length && !gf.length) {
      h += '<div class="card card-p"><div class="muted">這趟還沒有指南內容。到後台的「指南」分頁加吧。</div></div>';
    }

    h += '<div class="card card-p" style="margin-top:18px"><div class="muted">'
      + '本頁的景點與美食為一般旅遊建議，不是已排定的行程；營業時間、價格與活動舉辦與否請以官方即時公告為準。</div></div>';
    return h;
  }

  function viewInfo() {
    var h = '', flights = TRIP.flights || [], hotels = TRIP.hotels || [];
    if (flights.length) h += '<div class="sec-title">航班</div><div class="card card-p">';
    h += flights.map(function (f) {
      return '<div class="fl"><div class="fl-code"><b>' + esc(f.code) + '</b><span>' + esc(f.air) + '</span></div>'
        + '<div style="flex:1;min-width:0">'
        + '<div class="fl-rt"><div><div class="t">' + esc(f.dep) + '</div><div class="a">' + esc(f.from) + '</div></div>'
        + '<div class="arrow">' + I('plane') + '</div>'
        + '<div style="text-align:right"><div class="t">' + esc(f.arr) + '</div><div class="a">' + esc(f.to) + '</div></div></div>'
        + '<div class="fl-when">' + esc(f.date.replace(/-/g, '/')) + '<span class="whopill">' + esc(f.who) + '</span></div>'
        + '</div></div>';
    }).join('') + (flights.length ? '</div>' : '');

    /* 這段提醒以前寫死在程式碼裡，改成資料，後台就能改 */
    if (TRIP.infoAlerts && TRIP.infoAlerts.length) {
      h += '<div style="margin-top:11px">' + alertsHtml(TRIP.infoAlerts) + '</div>';
    }

    if (TRIP.car && TRIP.car.pickup) h += '<div class="sec-title">租車</div><div class="card card-p" data-reg="' + esc(regOf(1)) + '"><dl>'
      + '<div class="kv"><dt>取車</dt><dd>' + esc(TRIP.car.pickup.date.replace(/-/g, '/')) + ' ' + esc(TRIP.car.pickup.time) + '<br>' + esc(TRIP.car.pickup.place) + '</dd></div>'
      + '<div class="kv"><dt>還車</dt><dd>' + esc(TRIP.car.dropoff.date.replace(/-/g, '/')) + ' ' + esc(TRIP.car.dropoff.time) + '<br>' + esc(TRIP.car.dropoff.place) + '</dd></div>'
      + '</dl><ul class="ilist" style="margin-top:10px">'
      + TRIP.car.notes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
      + navBtn(TRIP.car.pickup.map, '取車地點') + navBtn(TRIP.car.dropoff.map, '還車地點') + '</div>';

    if (hotels.length) {
      h += '<div class="sec-title">住宿　' + hotelSummary() + '</div><div class="stack">'
        + hotels.map(function (ht) { return hotelCard(ht, null); }).join('') + '</div>';
    }

    var budget = TRIP.budget || {};
    if (hotels.length || budget.jpyTotal) {
    h += '<div class="sec-title">費用</div><div class="card card-p">';
    h += hotels.map(function (ht) {
      return '<div class="total-row"><span>' + esc(ht.name) + '</span><span class="money">' + yen(ht.price) + '</span></div>';
    }).join('');
    h += '<div class="total-row grand"><span>住宿合計（日幣）</span><span class="money">' + yen(budget.jpyTotal || 0) + '</span></div>';
    h += '<div style="margin-top:14px">' + (budget.extra || []).map(function (x) {
      return '<div class="total-row"><span>' + esc(x.label) + '</span><span class="money">' + esc(x.amount) + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="muted" style="margin-top:12px">' + esc(budget.note || '') + '</div></div>';
    }

    h += '<div class="sec-title">日幣換算</div><div class="card card-p">'
      + '<div class="conv"><input id="jpy-in" type="number" inputmode="decimal" value="10000" aria-label="日圓金額">'
      + '<span class="eq">≈</span><div class="out" id="twd-out">—</div></div>'
      + '<div class="rate-row"><span>匯率　1 JPY =</span><input id="rate-in" type="number" inputmode="decimal" step="0.001" value="' + state.rate + '" aria-label="匯率"><span>TWD</span></div>'
      + '<div class="muted" style="margin-top:10px">匯率是離線手動設定值，出發前請自行更新為當日匯率。</div></div>';

    if (TRIP.party) h += '<div class="sec-title">同行成員</div><div class="card card-p"><div style="font-size:13.5px">' + esc(TRIP.party) + '</div></div>';

    if (TRIP.source) h += '<div class="card card-p" style="margin-top:18px"><div class="muted">' + esc(TRIP.source) + '</div></div>';

    var who = gateSession();
    h += '<div class="owner-row">'
      + (who && who.name ? '<span>' + esc(who.name) + '，行程有變動請在後台改。</span>' : '<span></span>')
      + ((SITE.trips || []).length > 1 ? '<a href="#/trips">切換行程</a>' : '')
      + '<a href="#/admin">後台管理</a></div>';
    return h;
  }

  /* ---------- 密碼門檻 ----------
     說明：這是「擋一下」用的，不是資安機制。資料本身是明文，
     會看網頁原始碼的人可以繞過。詳見 README。 */
  var GATE_KEY = NS + 'gate';
  function hashPw(pw, salt) {
    var text = (salt || '') + ' ' + pw;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        var a = new Uint8Array(buf), out = '';
        for (var i = 0; i < a.length; i++) out += ('0' + a[i].toString(16)).slice(-2);
        return out;
      });
    }
    /* file:// 或舊瀏覽器沒有 crypto.subtle 時的退路 */
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var j = 0; j < text.length; j++) {
      h1 = ((h1 ^ text.charCodeAt(j)) * 16777619) >>> 0;
      h2 = ((h2 + text.charCodeAt(j) * (j + 7)) * 2654435761) >>> 0;
    }
    return Promise.resolve('fnv' + ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8));
  }
  window.__hashPw = hashPw;

  function gateSession() { try { return JSON.parse(localStorage.getItem(GATE_KEY) || 'null'); } catch (e) { return null; } }
  function gateNeeded() {
    var g = SITE.gate || {};
    if (!g.enabled || !g.entry) return false;
    var s = gateSession();
    return !(s && s.entry === g.entry);
  }
  window.__gateSession = gateSession;

  function showGate() {
    var g = SITE.gate || {};
    var n = (SITE.trips || []).length;
    var wrap = document.createElement('div');
    wrap.id = 'gate';
    wrap.innerHTML =
      '<div class="gate-card">'
      + '<div class="gate-mark">' + I('today') + '</div>'
      + '<h2>旅遊助手</h2>'
      + '<p class="gate-sub">' + (n > 1 ? n + ' 趟行程' : '家人朋友的行程小抄') + '</p>'
      + '<label>你的名字<input id="gate-name" type="text" autocomplete="nickname" placeholder="例：澤右"></label>'
      + '<label>密碼<input id="gate-pw" type="password" autocomplete="current-password"></label>'
      + '<button id="gate-go" class="btn-primary" type="button">進入</button>'
      + '<div id="gate-msg" class="gate-msg"></div>'
      + '</div>';
    document.body.appendChild(wrap);
    var nameEl = wrap.querySelector('#gate-name');
    var pwEl = wrap.querySelector('#gate-pw');
    var msg = wrap.querySelector('#gate-msg');
    function tryEnter() {
      var nm = nameEl.value.trim();
      if (!nm) { msg.textContent = '請先填你的名字'; nameEl.focus(); return; }
      msg.textContent = '檢查中…';
      hashPw(pwEl.value, g.salt).then(function (h) {
        if (h !== g.entry) { msg.textContent = '密碼不對'; pwEl.select(); return; }
        try { localStorage.setItem(GATE_KEY, JSON.stringify({ name: nm, entry: h, at: Date.now() })); } catch (e) {}
        wrap.remove();
        go();
      });
    }
    wrap.querySelector('#gate-go').addEventListener('click', tryEnter);
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryEnter(); });
    setTimeout(function () { nameEl.focus(); }, 50);
  }

  /* ---------- 行程載入 ----------
     引擎只認 SITE.trips 的索引，內容在 trips/<id>/ 底下，進到那趟才載入。 */
  function tripMeta(id) {
    var ts = SITE.trips || [];
    for (var i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i];
    return null;
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var el = document.createElement('script');
      el.src = src; el.async = false;
      el.onload = function () { res(); };
      el.onerror = function () { rej(new Error(src + ' 載入失敗')); };
      document.head.appendChild(el);
    });
  }
  var artLoaded = {}, activeTrip = null;
  function ensureTrip(id) {
    if (activeTrip === id) return Promise.resolve();
    var meta = tripMeta(id);
    if (!meta) return Promise.reject(new Error('找不到這趟行程'));
    /* 單檔版（tools/build-single.js）已經把資料 inline 進來了，不用再抓 */
    if (window.__BUNDLED_TRIP === id) { bindTrip(id); activeTrip = id; return Promise.resolve(); }
    var base = 'trips/' + id + '/', chain = Promise.resolve();
    /* 先清空，免得某支載不到時還留著上一趟的資料 */
    TRIP_KEYS.forEach(function (k) { window[k] = null; });
    /* 每支都是選配：線上還沒發布的新行程靠本機草稿也要能開 */
    ['trip.js', 'guide.js', 'packing.js', 'places.js'].forEach(function (f) {
      chain = chain.then(function () { return loadScript(base + f).catch(function () {}); });
    });
    (meta.artPacks || []).forEach(function (pk) {
      if (artLoaded[pk]) return;
      chain = chain.then(function () {
        return loadScript('data/art/' + pk + '.js').then(function () { artLoaded[pk] = 1; }, function () {});
      });
    });
    return chain.then(function () { bindTrip(id); activeTrip = id; });
  }

  /* 沒指定要看哪趟時：優先進行中的，其次最近要出發的，再其次最近結束的 */
  function pickTrip() {
    var ts = (SITE.trips || []).slice();
    if (!ts.length) return null;
    var t = today(), live = null, next = null, past = null;
    ts.forEach(function (x) {
      var s0 = x.start ? dateObj(x.start) : null, e0 = x.end ? dateObj(x.end) : null;
      if (s0 && e0 && t >= s0 && t <= e0) live = live || x;
      else if (s0 && t < s0) { if (!next || dateObj(x.start) < dateObj(next.start)) next = x; }
      else if (e0) { if (!past || dateObj(x.end) > dateObj(past.end)) past = x; }
    });
    return (live || next || past || ts[0]).id;
  }
  function currentTripId() {
    var last = lsGet(NS + 'lastTrip');
    return (last && tripMeta(last)) ? last : pickTrip();
  }

  /* ---------- router ----------
     行程網址：#/<tripId>/today、#/<tripId>/day/3
     舊書籤 #/today、#/day/3 會自動導到上次看的那趟。 */
  var TAB_T = { today: '今天', plan: '行程總覽', pack: '行李打包', guide: '旅遊指南', info: '旅遊資訊' };
  function tabSub(tab) {
    if (tab === 'today') return fmtRange(TRIP.start, TRIP.end);
    if (tab === 'plan') return TRIP.days.length + ' 天行程';
    if (tab === 'pack') return '出發前逐項確認';
    if (tab === 'guide') return '離線可用';
    return '航班・住宿・費用';
  }
  function fmtRange(a, b) {
    if (!a || !b) return '';
    return a.replace(/-/g, '/') + ' – ' + b.slice(5).replace(/-/g, '/');
  }
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var seg = h ? h.split('/') : [];
    if (!seg.length || !seg[0]) return { kind: 'home' };
    if (seg[0] === 'trips') return { kind: 'picker' };
    if (seg[0] === 'admin') return { kind: 'admin' };
    if (tripMeta(seg[0])) {
      var rest = seg.slice(1);
      if (rest[0] === 'admin') return { kind: 'admin', id: seg[0] };
      if (rest[0] === 'day') return { kind: 'trip', id: seg[0], tab: 'plan', day: +rest[1] };
      return { kind: 'trip', id: seg[0], tab: TAB_T[rest[0]] ? rest[0] : 'today' };
    }
    return { kind: 'legacy', tab: TAB_T[seg[0]] ? seg[0] : 'today', day: seg[0] === 'day' ? +seg[1] : null };
  }
  function hashFor(tab, day) {
    return '#/' + tripId + '/' + (day ? 'day/' + day : tab);
  }
  window.__hashFor = hashFor;

  function setBar(title, sub) {
    document.getElementById('tb-title').textContent = title;
    var el = document.getElementById('tb-sub');
    var multi = (SITE.trips || []).length > 1;
    if (multi && TRIP) {
      el.innerHTML = '<a class="tripsw" href="#/trips">' + esc(TRIP.title) + ' ▾</a>'
        + (sub ? '<span class="tb-dot">·</span>' + esc(sub) : '');
    } else {
      el.textContent = sub || '';
    }
  }
  function markTab(tab) {
    var links = document.querySelectorAll('#tabbar a');
    for (var i = 0; i < links.length; i++) {
      var t = links[i].dataset.tab;
      links[i].classList.toggle('on', t === tab);
      if (tripId) links[i].setAttribute('href', hashFor(t));
    }
  }
  function paint(html) {
    document.getElementById('view').innerHTML = html;
    window.scrollTo(0, 0);
  }

  /* ---------- 行程選單 ---------- */
  function tripStatus(x) {
    var t = today();
    if (!x.start || !x.end) return { cls: '', txt: '' };
    var s0 = dateObj(x.start), e0 = dateObj(x.end), d = dayDiff(t, s0);
    if (t > e0) return { cls: 'past', txt: '已結束' };
    if (t >= s0) return { cls: 'live', txt: '進行中・Day ' + (dayDiff(s0, t) + 1) };
    return { cls: 'soon', txt: d === 1 ? '明天出發' : '還有 ' + d + ' 天' };
  }
  function renderPicker() {
    var ts = (SITE.trips || []).slice().sort(function (a, b) {
      return String(b.start || '').localeCompare(String(a.start || ''));
    });
    document.getElementById('tb-title').textContent = '我的行程';
    document.getElementById('tb-sub').textContent = ts.length + ' 趟';
    var h = ts.length ? '<div class="stack triplist">' + ts.map(function (x) {
      var st = tripStatus(x);
      return '<a class="tripcard ' + st.cls + '" href="#/' + esc(x.id) + '/today"'
        + ' style="--rb:' + esc(x.color || '#cf4229') + '">'
        + '<div class="tc-bar"></div><div class="tc-b">'
        + (st.txt ? '<div class="tc-k">' + esc(st.txt) + '</div>' : '')
        + '<h3>' + esc(x.title || x.id) + '</h3>'
        + '<div class="meta">' + esc(fmtRange(x.start, x.end)) + '</div>'
        + '</div></a>';
    }).join('') + '</div>'
      : '<div class="card card-p"><div class="muted">還沒有任何行程。到後台新增一趟吧。</div></div>';
    h += '<div class="owner-row"><span></span><a href="#/admin">後台管理</a></div>';
    paint(h);
    markTab(null);
  }

  function showError(msg) {
    document.getElementById('tb-title').textContent = '載不到行程';
    document.getElementById('tb-sub').textContent = '';
    paint('<div class="card card-p"><div class="alert warn">' + I('alert')
      + '<div><b>提醒</b>' + esc(msg) + '</div></div>'
      + '<p class="muted" style="margin-top:10px">離線時只看得到之前開過的行程。</p>'
      + '<a class="btn" href="#/trips">回行程選單</a></div>');
    markTab(null);
  }

  function renderAdmin() {
    if (!window.KYUSHU_ADMIN) { location.replace(tripId ? hashFor('today') : '#/trips'); return; }
    document.getElementById('tb-title').textContent = '後台管理';
    document.getElementById('tb-sub').textContent = TRIP ? TRIP.title : '編輯行程與發布';
    document.getElementById('view').innerHTML = window.KYUSHU_ADMIN.view();
    window.scrollTo(0, 0);
    markTab(null);
    window.KYUSHU_ADMIN.wire();
  }

  function render(r) {
    r = r || parseHash();
    if (r.kind !== 'trip') { go(); return; }
    if (r.day) {
      var dd = null;
      for (var i = 0; i < TRIP.days.length; i++) if (TRIP.days[i].n === r.day) dd = TRIP.days[i];
      paint(viewDay(r.day));
      setBar('Day ' + r.day, dd ? dd.date.replace(/-/g, '/') + '　' + dd.dow : '');
      markTab('plan');
      return;
    }
    var tab = r.tab || 'today';
    paint(tab === 'today' ? viewToday() : tab === 'plan' ? viewPlan()
      : tab === 'pack' ? viewPack() : tab === 'guide' ? viewGuide() : viewInfo());
    setBar(TAB_T[tab], tabSub(tab));
    markTab(tab);
    if (tab === 'info') wireConverter();
  }

  function go() {
    if (gateNeeded()) return;
    var r = parseHash(), id;
    if (r.kind === 'picker') { renderPicker(); return; }
    if (r.kind === 'home') {
      id = currentTripId();
      location.replace(id ? '#/' + id + '/today' : '#/trips');
      return;
    }
    if (r.kind === 'legacy') {
      id = currentTripId();
      if (!id) { location.replace('#/trips'); return; }
      location.replace('#/' + id + '/' + (r.day ? 'day/' + r.day : r.tab));
      return;
    }
    if (r.kind === 'admin') {
      id = r.id || currentTripId();
      if (!id) { location.replace('#/trips'); return; }
      ensureTrip(id).then(renderAdmin, function (e) { showError(e.message); });
      return;
    }
    ensureTrip(r.id).then(function () { render(r); }, function (e) { showError(e.message); });
  }

  function wireConverter() {
    var a = document.getElementById('jpy-in'), r = document.getElementById('rate-in'), o = document.getElementById('twd-out');
    if (!a) return;
    function calc() {
      var v = parseFloat(a.value), rate = parseFloat(r.value);
      o.textContent = (isFinite(v) && isFinite(rate))
        ? 'TWD ' + (v * rate).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
    }
    a.addEventListener('input', calc);
    r.addEventListener('input', function () {
      var rate = parseFloat(r.value);
      if (isFinite(rate) && rate > 0) { state.rate = rate; save(); }
      calc();
    });
    calc();
  }

  document.getElementById('view').addEventListener('change', function (e) {
    var el = e.target;
    if (!el || el.type !== 'checkbox' || !el.dataset.k) return;
    if (el.checked) state.checks[el.dataset.k] = 1; else delete state.checks[el.dataset.k];
    save();
    var y = window.pageYOffset;
    render();
    window.scrollTo(0, y);
  });

  /* 今天頁跟著時間走：每分鐘、以及從背景切回來時重畫一次（正在打字時不打擾） */
  function refreshNow() {
    if (document.visibilityState === 'hidden' || gateNeeded()) return;
    var rr = parseHash();
    if (rr.kind !== 'trip' || (rr.tab !== 'today' && !rr.day)) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    var y = window.pageYOffset;
    render();
    window.scrollTo(0, y);
  }
  setInterval(refreshNow, 60000);
  document.addEventListener('visibilitychange', refreshNow);

  /* 自己要帶的項目：新增／刪除 */
  document.getElementById('view').addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.dataset.form !== 'mine') return;
    e.preventDefault();
    var t = (f.elements.t.value || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    state.mine.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: t.slice(0, 60) });
    save();
    var y = window.pageYOffset;
    render();
    window.scrollTo(0, y);
    var inp = document.querySelector('form[data-form="mine"] input');
    if (inp) inp.focus({ preventScroll: true });
  });
  document.getElementById('view').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-del]');
    if (!b) return;
    var id = b.dataset.del;
    state.mine = state.mine.filter(function (x) { return x.id !== id; });
    delete state.checks['m:' + id];
    save();
    var y = window.pageYOffset;
    render();
    window.scrollTo(0, y);
  });

  /* 分頁圖示：在啟動時注入，讓 index.html 保持乾淨 */
  (function () {
    var links = document.querySelectorAll('#tabbar a');
    for (var i = 0; i < links.length; i++) {
      var slot = links[i].querySelector('.ti');
      if (slot) slot.innerHTML = I(links[i].dataset.tab);
    }
    document.getElementById('theme-btn').innerHTML = I('moon');
  })();

  ART.mount();

  window.addEventListener('hashchange', function () { if (!gateNeeded()) go(); });
  if (gateNeeded()) showGate(); else go();
  window.__render = function () { go(); };

  /* 開發時網址加 ?nosw=1 可以不裝 Service Worker，免得改檔案還被舊快取蓋住 */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !/[?&]nosw=/.test(location.search)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
