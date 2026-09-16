/* ============================================================
   城市旅行印象插畫（City Travel Impression）
   風格：modern folk illustration / editorial travel poster /
        naive art / contemporary picture-book
   ── 大面積平面色塊、幾何化景物、手繪不完美邊緣、紙張顆粒質感
   ── 每座城市 3–5 個被簡化重構的印象元素，不是地標拼貼
   ── 前中後景分層、明確視覺焦點、刻意留白
   ── 顏色全部走 CSS 變數（--sky / --far / --mid / --near / --pop / --pale）
      由 app.css 依 data-reg 給不同城市配色，並自動跟著深淺色主題走
   畫布 400 × 132（旅遊海報橫幅比例）。焦點請放在 x 140–260，
   因為指南分頁的小圖章會裁切成中央的正方形。
   ============================================================ */
(function () {
var ART = window.ART = {};

/* ---------- 濾鏡：手繪抖動邊緣 + 紙張顆粒 ---------- */
ART.defs =
  /* 大色塊用：邊緣像剪紙／蠟筆塗出來的，不平滑 */
  '<filter id="hz-hand" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="6" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>' +
  '</filter>' +
  /* 細節用：抖動幅度小一點，免得小東西糊掉 */
  '<filter id="hz-hand2" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="19" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>' +
  '</filter>' +
  /* 顆粒本體：做成 pattern，瀏覽器只算一次再平鋪，手機也不卡 */
  '<filter id="hz-noise" x="0" y="0" width="100%" height="100%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="3" seed="11" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/>' +
  '</filter>' +
  '<pattern id="hz-grain" width="72" height="72" patternUnits="userSpaceOnUse">' +
    '<rect width="72" height="72" filter="url(#hz-noise)" opacity=".5"/>' +
  '</pattern>';

/* ---------- 畫圖小工具 ---------- */
function P(d, fill, op) {
  return '<path d="' + d + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
}
function S(d, col, w, op, dash) {
  return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w +
    '" stroke-linecap="round" stroke-linejoin="round"' +
    (dash ? ' stroke-dasharray="' + dash + '"' : '') + (op ? ' opacity="' + op + '"' : '') + '/>';
}
function R(x, y, w, h, fill, r, op) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' +
    (r ? ' rx="' + r + '"' : '') + (op ? ' opacity="' + op + '"' : '') + '/>';
}
function C(cx, cy, r, fill, op) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' +
    (op ? ' opacity="' + op + '"' : '') + '/>';
}
function E(cx, cy, rx, ry, fill, op) {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
    (op ? ' opacity="' + op + '"' : '') + '/>';
}
function G(t, inner) { return '<g transform="' + t + '">' + inner + '</g>'; }

/* 手繪抖動群組 */
function hand(inner) { return '<g filter="url(#hz-hand)">' + inner + '</g>'; }
function hand2(inner) { return '<g filter="url(#hz-hand2)">' + inner + '</g>'; }

/* 一張畫的外框：底色紙 + 內容 + 顆粒。isolation 讓 multiply 只作用在畫面內 */
function frame(inner) {
  return '<g style="isolation:isolate">' +
    R(-4, -4, 408, 140, 'var(--sky)') +
    inner +
    '<rect class="gr" x="-4" y="-4" width="408" height="140" fill="url(#hz-grain)"/>' +
    '</g>';
}

/* 湯氣／煙：一條上升的 S 形 */
function steam(x, y, h, sw, col, op) {
  var b = h * 0.34;
  return S('M' + x + ' ' + y +
    ' c ' + b + ' ' + (-h * 0.28) + ' ' + (-b) + ' ' + (-h * 0.5) + ' 0 ' + (-h * 0.72) +
    ' c ' + b * 0.7 + ' ' + (-h * 0.16) + ' ' + (-b * 0.5) + ' ' + (-h * 0.24) + ' ' + (b * 0.2) + ' ' + (-h * 0.28),
    col, sw, op);
}

/* 杉木／針葉樹 */
function cedar(x, base, h, w, fill, op) {
  var o = '';
  o += P('M' + x + ' ' + (base - h) + ' L' + (x + w * 0.5) + ' ' + (base - h * 0.42) +
    ' L' + (x - w * 0.5) + ' ' + (base - h * 0.42) + ' Z', fill, op);
  o += P('M' + x + ' ' + (base - h * 0.62) + ' L' + (x + w * 0.66) + ' ' + base +
    ' L' + (x - w * 0.66) + ' ' + base + ' Z', fill, op);
  return o;
}

/* 山坡上的小房子 */
function house(x, y, w, h, body, roof) {
  return P('M' + (x - 3) + ' ' + y + ' L' + (x + w / 2) + ' ' + (y - h * 0.62) + ' L' + (x + w + 3) + ' ' + y + ' Z', roof) +
    R(x, y, w, h, body);
}

/* 梅花：五瓣 */
function plum(x, y, s, petal, core) {
  var o = '', i;
  for (i = 0; i < 5; i++) {
    o += '<ellipse cx="0" cy="-9.5" rx="6.4" ry="8.2" fill="' + petal + '" transform="rotate(' + (i * 72) + ')"/>';
  }
  o += C(0, 0, 3.6, core);
  return G('translate(' + x + ',' + y + ') scale(' + s + ')', o);
}

/* 銀杏葉：扇形、中央有裂口、看得到葉脈 */
function ginkgo(x, y, s, rot, fill) {
  return G('translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + s + ')',
    P('M0 0 C-9 -9 -19 -15 -25 -25 C-19 -34 -9 -37 -2 -35 L0 -23 L2 -35 C9 -37 19 -34 25 -25 C19 -15 9 -9 0 0 Z', fill) +
    S('M0 -2 L-17 -27 M0 -2 L-9 -31 M0 -2 L9 -31 M0 -2 L17 -27', 'var(--sky)', 1.1, '.28') +
    S('M0 0 L0 8', fill, 2.2));
}

/* 稻穗／芒草：莖是彎的、穗會垂頭，還帶顆粒 */
function ear(x, base, h, dir, col, op) {
  var tx = x + dir * 12, ty = base - h, o, i, t;
  o = S('M' + x + ' ' + base + ' C ' + (x + dir * 3) + ' ' + (base - h * 0.62) +
    ' ' + (x + dir * 7) + ' ' + (base - h * 0.9) + ' ' + tx + ' ' + ty, col, 2.6, op);
  /* 穗：沿著往下垂的弧線排一串顆粒 */
  for (i = 0; i < 7; i++) {
    t = i / 6;
    o += E(tx + dir * (3 + t * 15), ty - 1 + t * t * 21,
      3.3 - 1 * t, 4.8 - 1.4 * t, col, op);
  }
  return o;
}

/* 圖示化的雲 */
function cloud(x, y, s, fill, op) {
  return G('translate(' + x + ',' + y + ') scale(' + s + ')',
    C(0, 0, 13, fill, op) + C(16, -5, 10, fill, op) + C(30, 2, 11, fill, op) +
    R(-1, -3, 32, 14, fill, 7, op));
}
/* ---------- 插畫包登錄 ----------
   場景 key 一律 '<包名>/<地點>'，例如 'jp-kyushu/fukuoka'。
   同一座城市之後再去一次，指回同一張就好，不用重畫。 */
ART.scenes = {};
ART.k = {
  P: P, S: S, R: R, C: C, E: E, G: G,
  hand: hand, hand2: hand2, frame: frame,
  steam: steam, cedar: cedar, house: house,
  plum: plum, ginkgo: ginkgo, ear: ear, cloud: cloud
};
ART.pack = function (name, scenes) {
  Object.keys(scenes).forEach(function (k) { ART.scenes[name + '/' + k] = scenes[k]; });
};
ART.fallback = 'core/journey';
ART.has = function (key) { return !!(key && ART.scenes[key]); };

/* 沒有專屬插畫的行程也要能看 —— 一律退回這張 */
ART.pack('core', {

  /* ── 行前・移動中 ──────────────────────────────────────
     取用：一架小飛機拉出的虛線 ＋ 九州的層層山影 ＋ 站在海裡的鳥居 ＋ 圖示化的太陽 */
  journey: frame(
    C(332, 48, 22, 'var(--pop)', '.4') +
    cloud(58, 40, 0.85, 'var(--pale)', '.8') +
    cloud(238, 30, 0.6, 'var(--pale)', '.6') +
    S('M6 92 C 70 52 170 32 262 44', 'var(--near)', 2, '.4', '3 8') +
    hand(
      P('M-4 94 L44 74 L96 90 L150 68 L206 88 L262 70 L320 90 L404 76 L404 108 L-4 108 Z', 'var(--far)') +
      P('M40 106 L120 62 L200 106 Z', 'var(--mid)', '.9') +
      P('M-4 104 C 90 100 160 108 250 102 C 320 97 360 105 404 100 L404 140 L-4 140 Z', 'var(--mid)')
    ) +
    P('M120 62 L106 78 L134 78 Z', 'var(--pale)', '.7') +
    S('M22 116 q10 -5 20 0 t20 0', 'var(--pale)', 2.4, '.4') +
    S('M250 120 q10 -5 20 0 t20 0', 'var(--pale)', 2.4, '.35') +
    S('M310 112 q10 -5 20 0 t20 0', 'var(--pale)', 2.4, '.3') +
    /* 海裡的鳥居 */
    hand2(
      P('M164 76 L246 76 L240 68 L170 68 Z', 'var(--pop)') +
      R(170, 70, 70, 4.5, 'var(--pop)') +
      R(176, 76, 8, 46, 'var(--pop)') + R(226, 76, 8, 46, 'var(--pop)') +
      R(172, 88, 66, 5, 'var(--pop)')
    ) +
    /* 飛機 */
    G('translate(262,44) rotate(-14) scale(.62)',
      E(0, 0, 58, 7, 'var(--near)') +
      P('M4 0 L-26 -32 L-10 -32 L32 -3 Z', 'var(--near)') +
      P('M4 0 L-26 32 L-10 32 L32 3 Z', 'var(--near)', '.75') +
      P('M-48 0 L-60 -18 L-50 -18 L-32 -2 Z', 'var(--near)') +
      P('M-48 0 L-60 18 L-50 18 L-32 2 Z', 'var(--near)', '.75')
    )
  )
});

/* ---------- 線性圖示。用 currentColor，尺寸由 CSS 控制 ---------- */
function ic(d, extra) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + (extra || '') + '</svg>';
}

ART.icons = {
  today: ic('<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  plan:  ic('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14.5h3M13.5 14.5h3M7.5 18h3"/>'),
  pack:  ic('<rect x="3.5" y="7.5" width="17" height="13" rx="3"/><path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5"/><path d="M3.5 13h17"/>'),
  guide: ic('<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M6 19.5h12"/><path d="M13 8.5c0-2 3-2 3-4"/><path d="M9 8.5c0-1.6 2.2-1.8 2.2-3.5"/>'),
  info:  ic('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 3.5h6v3H9z"/><path d="M9 11h6M9 15h4"/>'),

  sun:   ic('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>'),
  cloud: ic('<circle cx="8.5" cy="8" r="3"/><path d="M8.5 2.6v1.4M4.2 8H2.8M5.2 4.7 4.2 3.7M11.8 4.7l1-1"/><path d="M7 19h10.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.6 3.6 0 0 0 7 19z"/>'),
  moon:  ic('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),

  car:   ic('<path d="M4 16.5V19a1 1 0 0 1-1 1H2.5"/><path d="M20 16.5V19a1 1 0 0 0 1 1h.5"/><path d="M2.8 16.5h18.4v-4l-2-.6-2-4.4H8.8l-2 4.4-2 .6z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>'),
  bed:   ic('<path d="M3 19v-9M3 14h18v5M21 14v-3.5a2.5 2.5 0 0 0-2.5-2.5H10v6"/><circle cx="6.6" cy="11" r="2"/>'),
  nav:   ic('<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4 13.8 14 8.4 15.6l1.8-5.6z"/>'),
  photo: ic('<rect x="2.8" y="6" width="18.4" height="14" rx="2.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/><circle cx="12" cy="13" r="3.4"/>'),
  plane: ic('<path d="M2.5 13.2 21 5l-3.2 8.8L11 15.6l-2.4 4.6-1.4-4.2z"/>'),
  onsen: ic('<path d="M4 20h16"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/><path d="M8.5 9.5c1.4-1.6-1.4-3 0-4.6"/><path d="M12 9c1.4-1.6-1.4-3 0-4.6"/><path d="M15.5 9.5c1.4-1.6-1.4-3 0-4.6"/>'),
  yen:   ic('<path d="M7 5l5 6.5L17 5M12 11.5V19M8 13.5h8M8 16.5h8"/>'),
  alert: ic('<path d="M12 3.5 21 19H3z"/><path d="M12 9.5v4M12 16.4v.2"/>'),
  check: ic('<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>')
};

/* 一張畫的 <svg> 外殼。variant: 'wide'（預設，完整構圖）／'band'（裁掉上方天空）／'stamp'（中央方形） */
ART.svg = function (reg, cls, par) {
  return '<svg class="' + (cls || 'scene') + '" viewBox="0 0 400 132" preserveAspectRatio="'
    + (par || 'xMidYMax slice') + '" aria-hidden="true">'
    + (ART.scenes[reg] || ART.scenes[ART.fallback] || '') + '</svg>';
};

/* 指南分頁的小圖章 */
ART.stamp = function (reg) {
  return '<span class="stamp" data-reg="' + reg + '">' + ART.svg(reg, 'scene', 'xMidYMid slice') + '</span>';
};

/* 把濾鏡定義塞進文件裡（整份文件共用一次就好） */
ART.mount = function () {
  if (document.getElementById('hz-art-defs')) return;
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('id', 'hz-art-defs');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
  s.innerHTML = '<defs>' + ART.defs + '</defs>';
  document.body.insertBefore(s, document.body.firstChild);
};

})();