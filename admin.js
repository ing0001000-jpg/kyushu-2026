/* 後台管理 — #/admin
   編輯後先存成「草稿」（只在這台裝置生效），按「發布」才會推到 GitHub、全團看得到。
   密碼由使用者自己設定，這支程式只存 SHA-256 雜湊，不存密碼原文。 */
(function () {
  'use strict';

  var TOKEN_KEY = 'kyushu2026:ghtoken';
  var SESSION_KEY = 'kyushu2026:adminok';
  var API = 'https://api.github.com';

  var tab = 'trip';      /* trip | book | places | pack | guide | setup */
  var dayIdx = 0;
  var unlocked = false;
  var busy = false;
  var flash = '';

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cfg() { return window.CONFIG || (window.CONFIG = { gate: {}, repo: {} }); }
  function saveDraft() { window.__saveData(); }
  function rerender() { window.__render(); }
  function say(msg) { flash = msg; }

  /* 依路徑字串讀寫資料，例如 "TRIP.days.0.title" */
  function walk(path) {
    var parts = path.split('.'), o = window[parts[0]];
    for (var i = 1; i < parts.length - 1 && o != null; i++) o = o[parts[i]];
    return { obj: o, key: parts[parts.length - 1] };
  }
  function setPath(path, val) {
    var w = walk(path);
    if (w.obj) w.obj[w.key] = val;
  }
  function getPath(path) {
    var w = walk(path);
    return w.obj ? w.obj[w.key] : undefined;
  }

  /* ---------- 表單元件 ---------- */
  function field(label, path, opts) {
    opts = opts || {};
    var v = getPath(path);
    var attrs = 'data-p="' + esc(path) + '"';
    if (opts.placeholder) attrs += ' placeholder="' + esc(opts.placeholder) + '"';
    var input = opts.multiline
      ? '<textarea ' + attrs + ' rows="' + (opts.rows || 2) + '">' + esc(v) + '</textarea>'
      : '<input type="' + (opts.type || 'text') + '" ' + attrs + ' value="' + esc(v) + '">';
    return '<label class="af"><span>' + esc(label) + '</span>' + input + '</label>';
  }
  function selectField(label, path, options) {
    var v = getPath(path);
    return '<label class="af"><span>' + esc(label) + '</span><select data-p="' + esc(path) + '">'
      + options.map(function (o) {
          var val = o.v == null ? o : o.v, txt = o.t == null ? o : o.t;
          return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(txt) + '</option>';
        }).join('')
      + '</select></label>';
  }
  function rowTools(path, i, len, label) {
    return '<div class="arow-tools">'
      + '<button type="button" data-act="up" data-arr="' + esc(path) + '" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="上移">↑</button>'
      + '<button type="button" data-act="down" data-arr="' + esc(path) + '" data-i="' + i + '"' + (i === len - 1 ? ' disabled' : '') + ' aria-label="下移">↓</button>'
      + '<button type="button" class="danger" data-act="del" data-arr="' + esc(path) + '" data-i="' + i + '" data-label="' + esc(label || '') + '">刪除</button>'
      + '</div>';
  }
  function addBtn(path, kind, text) {
    return '<button type="button" class="a-add" data-act="add" data-arr="' + esc(path) + '" data-kind="' + esc(kind) + '">＋ ' + esc(text) + '</button>';
  }

  /* ---------- 各分頁 ---------- */
  var REGION_OPTS = [
    { v: 'fukuoka', t: '福岡' }, { v: 'dazaifu', t: '太宰府' }, { v: 'nagasaki', t: '長崎' },
    { v: 'kumamoto', t: '熊本' }, { v: 'aso', t: '阿蘇' }, { v: 'kurokawa', t: '黑川' },
    { v: 'yufuin', t: '由布院' }, { v: 'beppu', t: '別府' }, { v: 'journey', t: '移動中' }
  ];
  var PART_LABEL = { am: '上午', pm: '下午', night: '晚上' };

  function tabTrip() {
    var days = window.TRIP.days;
    if (dayIdx >= days.length) dayIdx = days.length - 1;
    var d = days[dayIdx], base = 'TRIP.days.' + dayIdx;

    var h = '<div class="a-daypick">' + days.map(function (x, i) {
      return '<button type="button" class="a-chip' + (i === dayIdx ? ' on' : '') + '" data-act="day" data-i="' + i + '">'
        + 'Day ' + x.n + '</button>';
    }).join('') + '</div>';

    h += '<div class="a-card">'
      + field('日期', base + '.date', { placeholder: '2026-09-27' })
      + field('星期', base + '.dow', { placeholder: '週日' })
      + field('地區標題', base + '.region')
      + field('當天標題', base + '.title')
      + selectField('住宿', base + '.hotel', [{ v: '', t: '（無）' }].concat(
          window.TRIP.hotels.map(function (ht) { return { v: ht.key, t: ht.name }; })))
      + '</div>';

    (d.blocks || []).forEach(function (b, bi) {
      var bp = base + '.blocks.' + bi + '.items';
      h += '<div class="a-sec"><h3>' + esc(PART_LABEL[b.part] || b.part) + '</h3>';
      h += (b.items || []).map(function (it, i) {
        var ip = bp + '.' + i;
        return '<div class="a-row">' + rowTools(bp, i, b.items.length, it.title)
          + field('時間', ip + '.time', { placeholder: '10:00' })
          + field('標題', ip + '.title')
          + field('說明', ip + '.desc', { multiline: true, rows: 3 })
          + field('標籤', ip + '.tag', { placeholder: '例：長榮 BR106' })
          + field('導航關鍵字', ip + '.map', { placeholder: '日文地名或 緯度,經度' })
          + '</div>';
      }).join('');
      h += addBtn(bp, 'event', '新增一個項目') + '</div>';
    });
    return h;
  }

  function tabBook() {
    var h = '<div class="a-sec"><h3>航班</h3>';
    h += window.TRIP.flights.map(function (f, i) {
      var p = 'TRIP.flights.' + i;
      return '<div class="a-row">' + rowTools('TRIP.flights', i, window.TRIP.flights.length, f.code)
        + field('航班代號', p + '.code') + field('航空公司', p + '.air') + field('誰', p + '.who')
        + field('日期', p + '.date') + field('起點', p + '.from') + field('終點', p + '.to')
        + field('起飛', p + '.dep') + field('抵達', p + '.arr') + '</div>';
    }).join('') + addBtn('TRIP.flights', 'flight', '新增航班') + '</div>';

    h += '<div class="a-sec"><h3>租車</h3><div class="a-card">'
      + field('取車日期', 'TRIP.car.pickup.date') + field('取車時間', 'TRIP.car.pickup.time')
      + field('取車地點', 'TRIP.car.pickup.place') + field('取車導航', 'TRIP.car.pickup.map')
      + field('還車日期', 'TRIP.car.dropoff.date') + field('還車時間', 'TRIP.car.dropoff.time')
      + field('還車地點', 'TRIP.car.dropoff.place') + field('還車導航', 'TRIP.car.dropoff.map')
      + '</div>';
    h += window.TRIP.car.notes.map(function (n, i) {
      return '<div class="a-row">' + rowTools('TRIP.car.notes', i, window.TRIP.car.notes.length, n)
        + field('提醒 ' + (i + 1), 'TRIP.car.notes.' + i, { multiline: true }) + '</div>';
    }).join('') + addBtn('TRIP.car.notes', 'text', '新增租車提醒') + '</div>';

    h += '<div class="a-sec"><h3>住宿</h3>';
    h += window.TRIP.hotels.map(function (ht, i) {
      var p = 'TRIP.hotels.' + i;
      return '<div class="a-row">' + rowTools('TRIP.hotels', i, window.TRIP.hotels.length, ht.name)
        + field('代號（勿隨意改）', p + '.key') + field('名稱', p + '.name') + field('英文名', p + '.en')
        + field('入住', p + '.nights') + field('地址', p + '.addr') + field('電話', p + '.tel')
        + field('導航關鍵字', p + '.map') + field('官網', p + '.site')
        + field('金額（日幣）', p + '.price', { type: 'number' })
        + field('房型／人數', p + '.rooms', { multiline: true })
        + '</div>';
    }).join('') + addBtn('TRIP.hotels', 'hotel', '新增住宿') + '</div>';

    h += '<div class="a-sec"><h3>費用</h3><div class="a-card">'
      + field('住宿合計（日幣）', 'TRIP.budget.jpyTotal', { type: 'number' })
      + field('備註', 'TRIP.budget.note', { multiline: true, rows: 4 }) + '</div></div>';
    return h;
  }

  function tabPlaces() {
    var P = window.PLACES;
    if (!P) return '<div class="a-empty">還沒有匯入收藏地點。</div>';
    var groups = REGION_OPTS.filter(function (r) { return r.v !== 'journey'; })
      .map(function (r) { return { id: r.v, name: r.t, arr: 'PLACES.regions.' + r.v, list: (P.regions && P.regions[r.v]) || [] }; });
    groups.push({ id: '', name: '未分區', arr: 'PLACES.unassigned', list: P.unassigned || [] });

    return groups.map(function (g) {
      return '<div class="a-sec"><h3>' + esc(g.name) + '　<span class="a-count">' + g.list.length + '</span></h3>'
        + g.list.map(function (x, i) {
            var p = g.arr + '.' + i;
            return '<div class="a-row">'
              + '<div class="arow-tools">'
              + '<button type="button" class="danger" data-act="del" data-arr="' + esc(g.arr) + '" data-i="' + i + '" data-label="' + esc(x.n) + '">刪除</button>'
              + '</div>'
              + field('名稱', p + '.n')
              + field('備註', p + '.d', { multiline: true })
              + field('導航（緯度,經度）', p + '.map')
              + '<label class="af"><span>改分到</span><select data-act="move" data-arr="' + esc(g.arr) + '" data-i="' + i + '">'
              + '<option value="">（不動）</option>'
              + REGION_OPTS.filter(function (r) { return r.v !== 'journey'; })
                  .map(function (r) { return '<option value="' + r.v + '">' + esc(r.t) + '</option>'; }).join('')
              + '<option value="__un">未分區</option>'
              + '</select></label>'
              + '</div>';
          }).join('')
        + (g.list.length ? '' : '<div class="a-empty">（空）</div>')
        + '</div>';
    }).join('');
  }

  function tabPack() {
    var h = '<div class="a-sec"><h3>行前待辦</h3>'
      + window.TODOS.map(function (t, i) {
          var p = 'TODOS.' + i;
          return '<div class="a-row">' + rowTools('TODOS', i, window.TODOS.length, t.t)
            + field('待辦', p + '.t') + field('說明', p + '.d', { multiline: true })
            + field('期限', p + '.by', { placeholder: '出發前 1 週' }) + '</div>';
        }).join('')
      + addBtn('TODOS', 'todo', '新增待辦') + '</div>';
    return h + window.PACKING.map(function (cat, ci) {
      var cp = 'PACKING.' + ci;
      return '<div class="a-sec"><h3>' + esc(cat.icon || '') + ' ' + esc(cat.name) + '</h3>'
        + '<div class="a-card">' + field('分類名稱', cp + '.name') + field('分類說明', cp + '.note', { multiline: true }) + '</div>'
        + cat.items.map(function (it, i) {
            var p = cp + '.items.' + i;
            return '<div class="a-row">' + rowTools(cp + '.items', i, cat.items.length, it.t)
              + field('項目', p + '.t') + field('說明', p + '.d', { multiline: true }) + '</div>';
          }).join('')
        + addBtn(cp + '.items', 'packitem', '新增項目') + '</div>';
    }).join('');
  }

  function tabGuide() {
    return window.GUIDE.regions.map(function (r, ri) {
      var rp = 'GUIDE.regions.' + ri;
      function block(kind, label) {
        var arr = rp + '.' + kind, list = r[kind] || [];
        return '<h4>' + esc(label) + '</h4>'
          + list.map(function (x, i) {
              var p = arr + '.' + i;
              return '<div class="a-row">' + rowTools(arr, i, list.length, x.n)
                + field('名稱', p + '.n') + field('說明', p + '.d', { multiline: true }) + '</div>';
            }).join('')
          + addBtn(arr, 'nd', '新增' + label);
      }
      var tipsArr = rp + '.tips', tips = r.tips || [];
      return '<div class="a-sec"><h3>' + esc(r.name) + '</h3>'
        + block('eat', '吃什麼') + block('see', '看什麼')
        + '<h4>小提醒</h4>'
        + tips.map(function (t, i) {
            return '<div class="a-row">' + rowTools(tipsArr, i, tips.length, t)
              + field('提醒 ' + (i + 1), tipsArr + '.' + i, { multiline: true }) + '</div>';
          }).join('')
        + addBtn(tipsArr, 'text', '新增提醒')
        + '</div>';
    }).join('');
  }

  function tabSetup() {
    var g = cfg().gate || {}, repo = cfg().repo || {};
    var hasToken = !!getToken();
    var h = '';

    h += '<div class="a-sec"><h3>密碼</h3><div class="a-card">'
      + '<p class="a-note">兩組密碼請設不一樣的：<b>進入密碼</b>全團都會知道，<b>後台密碼</b>只有你知道。留空＝不改。</p>'
      + '<label class="af"><span>進入密碼（給全團）</span><input type="password" id="pw-entry" autocomplete="new-password"></label>'
      + '<label class="af"><span>後台密碼（只有你）</span><input type="password" id="pw-admin" autocomplete="new-password"></label>'
      + '<label class="af a-check"><input type="checkbox" id="pw-enabled"' + (g.enabled ? ' checked' : '') + '><span>開啟進入密碼</span></label>'
      + '<button type="button" class="btn-primary" data-act="savepw">儲存密碼</button>'
      + '<p class="a-note">目前狀態：進入密碼 ' + (g.entry ? '已設定' : '未設定')
      + '、後台密碼 ' + (g.admin ? '已設定' : '未設定') + '。</p>'
      + '</div></div>';

    h += '<div class="a-sec"><h3>發布到 GitHub</h3><div class="a-card">'
      + '<p class="a-note">草稿只存在這台裝置。要讓其他 5 個人看到，按下面的「發布」。</p>'
      + field('帳號', 'CONFIG.repo.owner') + field('儲存庫', 'CONFIG.repo.name') + field('分支', 'CONFIG.repo.branch')
      + '<label class="af"><span>GitHub 存取權杖（Token）</span><input type="password" id="gh-token" autocomplete="off" placeholder="' + (hasToken ? '已存在這台裝置，留空＝不改' : 'ghp_… 或 github_pat_…') + '"></label>'
      + '<div class="a-btnrow">'
      + '<button type="button" data-act="savetoken">儲存權杖</button>'
      + (hasToken ? '<button type="button" class="danger" data-act="cleartoken">刪除權杖</button>' : '')
      + '</div>'
      + '<p class="a-note">建議用 <b>Fine-grained token</b>，只授權這一個 repo、權限只給 <b>Contents: Read and write</b>，並設一個到期日。權杖存在這台瀏覽器裡，等於這個 repo 的鑰匙 — 手機借人或遺失時記得到 GitHub 撤銷。</p>'
      + '<div class="a-btnrow">'
      + '<button type="button" class="btn-primary" data-act="publish"' + (busy ? ' disabled' : '') + '>發布到 GitHub</button>'
      + '</div>'
      + '<div id="pub-log" class="a-log"></div>'
      + '</div></div>';

    h += '<div class="a-sec"><h3>草稿</h3><div class="a-card">'
      + '<p class="a-note">' + (window.__hasDraft() ? '這台裝置有未發布的草稿。' : '目前沒有草稿，畫面顯示的是線上版內容。') + '</p>'
      + '<div class="a-btnrow">'
      + '<button type="button" data-act="export">匯出草稿 JSON</button>'
      + '<button type="button" class="danger" data-act="discard">丟棄草稿，還原線上版</button>'
      + '</div></div></div>';

    return h;
  }

  /* ---------- 主畫面 ---------- */
  var TABS = [
    { id: 'trip', t: '行程' }, { id: 'book', t: '航班住宿' }, { id: 'places', t: '收藏地點' },
    { id: 'pack', t: '打包' }, { id: 'guide', t: '指南' }, { id: 'setup', t: '設定與發布' }
  ];

  function lockScreen() {
    var g = cfg().gate || {};
    var first = !g.admin;
    return '<div class="a-lock">'
      + '<h2>' + (first ? '第一次進後台' : '後台管理') + '</h2>'
      + (first
          ? '<p>還沒設定後台密碼。先設一組，之後每次進來都要輸入。</p>'
            + '<label class="af"><span>設定後台密碼</span><input type="password" id="lock-pw" autocomplete="new-password"></label>'
            + '<label class="af"><span>再輸入一次</span><input type="password" id="lock-pw2" autocomplete="new-password"></label>'
            + '<button type="button" class="btn-primary" data-act="setadmin">設定並進入</button>'
          : '<label class="af"><span>後台密碼</span><input type="password" id="lock-pw" autocomplete="current-password"></label>'
            + '<button type="button" class="btn-primary" data-act="unlock">進入</button>')
      + '<div id="lock-msg" class="gate-msg"></div>'
      + '<p class="a-note">忘記密碼的話，把瀏覽器這個網站的資料清掉，或直接改 <code>data/config.js</code>。</p>'
      + '</div>';
  }

  function view() {
    try { unlocked = unlocked || sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}
    if (!unlocked) return lockScreen();

    var h = '';
    if (flash) { h += '<div class="a-flash">' + esc(flash) + '</div>'; flash = ''; }
    h += '<div class="a-tabs">' + TABS.map(function (t) {
      return '<button type="button" class="a-chip' + (t.id === tab ? ' on' : '') + '" data-act="tab" data-tab="' + t.id + '">' + esc(t.t) + '</button>';
    }).join('') + '</div>';
    h += '<div class="a-body">'
      + (tab === 'trip' ? tabTrip() : tab === 'book' ? tabBook() : tab === 'places' ? tabPlaces()
        : tab === 'pack' ? tabPack() : tab === 'guide' ? tabGuide() : tabSetup())
      + '</div>';
    h += '<div class="a-foot"><a href="#/today">← 回 App</a>'
      + '<span>' + (window.__hasDraft() ? '有未發布的草稿' : '與線上版一致') + '</span></div>';
    return h;
  }

  /* ---------- 新增項目的樣板 ---------- */
  function blank(kind) {
    switch (kind) {
      case 'event': return { time: '', title: '新項目', desc: '', map: '' };
      case 'flight': return { code: '', air: '', who: '', date: '', from: '', to: '', dep: '', arr: '' };
      case 'hotel': return { key: 'new' + Date.now().toString(36).slice(-4), nights: '', name: '新住宿', addr: '', tel: '', map: '', price: 0, rooms: '' };
      case 'packitem': return { id: 'p' + Date.now().toString(36), t: '新項目', d: '' };
      case 'todo': return { id: 't' + Date.now().toString(36), t: '新待辦', d: '', by: '' };
      case 'nd': return { n: '新項目', d: '' };
      case 'text': return '';
      default: return {};
    }
  }

  /* ---------- 事件 ---------- */
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }

  function wire() {
    var root = document.getElementById('view');
    /* #view 這個元素本身不會被換掉，innerHTML 換內容時監聽器會留著。
       每次重繪都重掛的話會累積，一次點擊被執行好幾遍，所以只掛一次。 */
    if (root.dataset.adminWired) return;
    root.dataset.adminWired = '1';

    /* 輸入即存 */
    root.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.dataset || !el.dataset.p) return;
      var v = el.value;
      if (el.type === 'number') v = v === '' ? 0 : Number(v);
      setPath(el.dataset.p, v);
      saveDraft();
    });

    root.addEventListener('change', function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.p && el.tagName === 'SELECT') {
        setPath(el.dataset.p, el.value); saveDraft(); rerender(); return;
      }
      if (el.dataset && el.dataset.act === 'move' && el.value) {
        var arr = getPath(el.dataset.arr), i = +el.dataset.i;
        if (!arr || !arr[i]) return;
        var item = arr.splice(i, 1)[0];
        var dest = el.value === '__un' ? window.PLACES.unassigned : window.PLACES.regions[el.value];
        dest.push(item);
        saveDraft(); say('已移動「' + item.n + '」'); rerender();
      }
    });

    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !b.dataset.act) return;
      var act = b.dataset.act;

      if (act === 'tab') { tab = b.dataset.tab; rerender(); return; }
      if (act === 'day') { dayIdx = +b.dataset.i; rerender(); return; }

      if (act === 'add') {
        var arr = getPath(b.dataset.arr);
        if (Array.isArray(arr)) { arr.push(blank(b.dataset.kind)); saveDraft(); rerender(); }
        return;
      }
      if (act === 'del') {
        var a2 = getPath(b.dataset.arr), i2 = +b.dataset.i;
        if (!Array.isArray(a2)) return;
        if (!window.confirm('確定刪除「' + (b.dataset.label || a2[i2]) + '」？')) return;
        a2.splice(i2, 1); saveDraft(); rerender();
        return;
      }
      if (act === 'up' || act === 'down') {
        var a3 = getPath(b.dataset.arr), i3 = +b.dataset.i, j = act === 'up' ? i3 - 1 : i3 + 1;
        if (!Array.isArray(a3) || j < 0 || j >= a3.length) return;
        var tmp = a3[i3]; a3[i3] = a3[j]; a3[j] = tmp;
        saveDraft(); rerender();
        return;
      }

      if (act === 'setadmin') return doSetAdmin(b);
      if (act === 'unlock') return doUnlock(b);
      if (act === 'savepw') return doSavePw();
      if (act === 'savetoken') return doSaveToken();
      if (act === 'cleartoken') return doClearToken();
      if (act === 'publish') return doPublish();
      if (act === 'export') return doExport();
      if (act === 'discard') return doDiscard();
    });
  }

  function doSetAdmin() {
    var pw = document.getElementById('lock-pw').value;
    var pw2 = document.getElementById('lock-pw2').value;
    var msg = document.getElementById('lock-msg');
    if (pw.length < 4) { msg.textContent = '密碼至少 4 個字'; return; }
    if (pw !== pw2) { msg.textContent = '兩次輸入不一樣'; return; }
    var g = cfg().gate;
    if (!g.salt) g.salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.__hashPw(pw, g.salt).then(function (h) {
      g.admin = h;
      saveDraft();
      unlocked = true;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
      tab = 'setup';
      say('後台密碼已設定。記得到「設定與發布」按發布，其他裝置才會生效。');
      rerender();
    });
  }

  function doUnlock() {
    var pw = document.getElementById('lock-pw').value;
    var msg = document.getElementById('lock-msg');
    var g = cfg().gate;
    msg.textContent = '檢查中…';
    window.__hashPw(pw, g.salt).then(function (h) {
      if (h !== g.admin) { msg.textContent = '密碼不對'; return; }
      unlocked = true;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
      rerender();
    });
  }

  function doSavePw() {
    var g = cfg().gate;
    var e1 = document.getElementById('pw-entry').value;
    var a1 = document.getElementById('pw-admin').value;
    var on = document.getElementById('pw-enabled').checked;
    if (!g.salt) g.salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var jobs = [];
    if (e1) jobs.push(window.__hashPw(e1, g.salt).then(function (h) { g.entry = h; }));
    if (a1) jobs.push(window.__hashPw(a1, g.salt).then(function (h) { g.admin = h; }));
    Promise.all(jobs).then(function () {
      if (on && !g.entry) { say('要開啟進入密碼，得先設一組進入密碼。'); rerender(); return; }
      g.enabled = on;
      saveDraft();
      say('密碼已存成草稿。按「發布到 GitHub」之後，其他人才會被擋。');
      rerender();
    });
  }

  function doSaveToken() {
    var v = document.getElementById('gh-token').value.trim();
    if (!v) { say('沒有輸入權杖，維持原樣。'); rerender(); return; }
    try { localStorage.setItem(TOKEN_KEY, v); } catch (e) {}
    say('權杖已存在這台裝置。');
    rerender();
  }
  function doClearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    say('權杖已刪除。');
    rerender();
  }

  function doExport() {
    var data = {};
    ['TRIP', 'GUIDE', 'PLACES', 'PACKING', 'TODOS', 'CONFIG'].forEach(function (k) { data[k] = window[k]; });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kyushu-draft-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function doDiscard() {
    if (!window.confirm('丟棄這台裝置上所有未發布的修改，還原成線上版？')) return;
    window.__resetData();
    unlocked = true;
    say('已還原成線上版。');
    rerender();
  }

  /* ---------- 發布 ---------- */
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function jsFile(header, pairs) {
    return header + '\n' + pairs.map(function (p) {
      return 'window.' + p[0] + ' = ' + JSON.stringify(p[1], null, 2) + ';';
    }).join('\n') + '\n';
  }

  function gh(path, opts) {
    var r = cfg().repo;
    opts = opts || {};
    opts.headers = Object.assign({
      'Authorization': 'Bearer ' + getToken(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, opts.headers || {});
    return fetch(API + '/repos/' + r.owner + '/' + r.name + path, opts).then(function (res) {
      return res.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!res.ok) {
          var m = (j && j.message) || res.statusText;
          throw new Error(res.status + ' ' + m);
        }
        return j;
      });
    });
  }

  function putFile(path, content, log) {
    var r = cfg().repo;
    return gh('/contents/' + path + '?ref=' + encodeURIComponent(r.branch))
      .then(function (j) { return j && j.sha; })
      .catch(function (e) {
        if (String(e.message).indexOf('404') === 0) return null;   /* 新檔 */
        throw e;
      })
      .then(function (sha) {
        var body = {
          message: '後台更新 ' + path + '（' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '）',
          content: b64(content),
          branch: r.branch
        };
        if (sha) body.sha = sha;
        return gh('/contents/' + path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      })
      .then(function () { log('✓ ' + path); });
  }

  function doPublish() {
    if (busy) return;
    var logEl = document.getElementById('pub-log');
    function log(s) { logEl.innerHTML += esc(s) + '<br>'; }
    logEl.innerHTML = '';

    if (!getToken()) { log('✗ 還沒設定 GitHub 權杖'); return; }
    var r = cfg().repo;
    if (!r.owner || !r.name) { log('✗ 帳號或儲存庫沒填'); return; }

    busy = true;
    var btn = document.querySelector('[data-act="publish"]');
    if (btn) { btn.disabled = true; btn.textContent = '發布中…'; }

    /* 每次發布把快取版本 +1，團員手機才會拿到新內容 */
    var ver = (Number(cfg().cacheVersion) || 1) + 1;
    cfg().cacheVersion = ver;

    var files = [
      ['data/trip.js', jsFile('/* 行程資料 — 由後台發布，手改會被下次發布覆蓋。 */', [['TRIP', window.TRIP]])],
      ['data/guide.js', jsFile('/* 離線指南 — 由後台發布。景點／美食屬一般旅遊建議，非既定行程。 */', [['GUIDE', window.GUIDE]])],
      ['data/packing.js', jsFile('/* 打包清單與待辦 — 由後台發布。改 id 會弄丟已勾選狀態。 */', [['PACKING', window.PACKING], ['TODOS', window.TODOS]])],
      ['data/config.js', jsFile('/* 站台設定 — 由後台發布。存的是密碼雜湊，不是密碼本身。 */', [['CONFIG', cfg()]])],
      ['sw.js', null]   /* 稍後用讀回來的內容改版本號 */
    ];
    if (window.PLACES) {
      files.splice(3, 0, ['data/places.js', jsFile('/* 收藏地點 — 由後台發布或 tools/import-places.js 產生。 */', [['PLACES', window.PLACES]])]);
    }

    log('快取版本 → v' + ver);

    /* 先把 sw.js 抓下來改版本號 */
    gh('/contents/sw.js?ref=' + encodeURIComponent(r.branch))
      .then(function (j) {
        var cur = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), function (c) { return c.charCodeAt(0); }));
        var next = cur.replace(/kyushu2026-v\d+/, 'kyushu2026-v' + ver);
        files[files.length - 1][1] = next;
      })
      .then(function () {
        return files.reduce(function (chain, f) {
          return chain.then(function () { return f[1] == null ? null : putFile(f[0], f[1], log); });
        }, Promise.resolve());
      })
      .then(function () {
        log('');
        log('發布完成。GitHub Pages 約 1 分鐘後生效，團員重開 App 就會更新。');
        saveDraft();
      })
      .catch(function (e) {
        log('✗ 失敗：' + e.message);
        if (String(e.message).indexOf('401') === 0) log('  權杖無效或已過期，到設定重存一次。');
        if (String(e.message).indexOf('403') === 0) log('  權杖權限不足，需要 Contents: Read and write。');
        if (String(e.message).indexOf('409') === 0) log('  版本衝突，可能有人同時改了，重新整理後再試。');
      })
      .then(function () {
        busy = false;
        var b2 = document.querySelector('[data-act="publish"]');
        if (b2) { b2.disabled = false; b2.textContent = '發布到 GitHub'; }
      });
  }

  window.KYUSHU_ADMIN = { view: view, wire: wire };

  /* app.js 先跑完才載入這支，若一開啟就是 #/admin，補畫一次 */
  if (location.hash.indexOf('#/admin') === 0 && window.__render) window.__render();
})();
