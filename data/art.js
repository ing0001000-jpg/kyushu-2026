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

ART.scenes = {

  /* ── 福岡・博多 ─────────────────────────────────────────
     印象採集：中洲屋台的暖光與布簾／那珂川的夜與倒影／天神的都市天際線／
              紅提燈／豚骨拉麵的白湯與蒸氣／博多祇園山笠／福岡塔的三角形
     取用：屋台（焦點）＋ 河與倒影 ＋ 壓低的都市剪影 ＋ 放大到不合理的紅燈籠
     氣質：夜、暖橘、河水藍、市井的熱鬧藏在小小的人影裡              */
  fukuoka: frame(
    /* 後景：月亮與被暮色壓扁的城市 */
    C(52, 44, 14, 'var(--pale)', '.9') +
    C(88, 30, 2.6, 'var(--pale)', '.55') + C(30, 66, 2.2, 'var(--pale)', '.45') +
    hand(
      R(6, 66, 26, 28, 'var(--far)') + R(36, 74, 18, 20, 'var(--far)') +
      R(58, 56, 22, 38, 'var(--far)') + R(86, 70, 28, 24, 'var(--far)') +
      R(118, 78, 15, 16, 'var(--far)') +
      R(284, 76, 22, 18, 'var(--far)') + R(310, 62, 20, 32, 'var(--far)') +
      P('M362 94 L370 44 L380 94 Z', 'var(--far)') +
      /* 河 */
      P('M-4 92 C 90 88 150 96 220 92 C 300 88 350 95 404 91 L404 116 L-4 116 Z', 'var(--mid)') +
      /* 前岸 */
      P('M-4 110 C 70 106 160 114 240 110 C 320 106 360 113 404 109 L404 140 L-4 140 Z', 'var(--near)')
    ) +
    /* 窗光 */
    R(64, 62, 4, 5, 'var(--pale)', 0, '.5') + R(72, 62, 4, 5, 'var(--pale)', 0, '.5') +
    R(64, 74, 4, 5, 'var(--pale)', 0, '.4') + R(14, 72, 5, 6, 'var(--pale)', 0, '.4') +
    R(24, 84, 5, 6, 'var(--pale)', 0, '.35') + R(94, 78, 5, 6, 'var(--pale)', 0, '.4') +
    R(316, 70, 5, 6, 'var(--pale)', 0, '.45') + R(316, 82, 5, 6, 'var(--pale)', 0, '.35') +
    C(370, 42, 3, 'var(--pop)', '.9') +
    /* 水面倒影 */
    R(150, 100, 46, 4, 'var(--pop)', 2, '.5') + R(206, 108, 36, 3, 'var(--pop)', 1.5, '.38') +
    R(324, 102, 34, 4, 'var(--pop)', 2, '.4') + R(52, 104, 26, 3, 'var(--pale)', 1.5, '.3') +

    /* 焦點：屋台 */
    E(200, 92, 74, 22, 'var(--pop)', '.14') +
    hand2(
      R(136, 76, 5, 36, 'var(--near)') + R(259, 76, 5, 36, 'var(--near)') +
      P('M126 76 L146 56 L254 56 L274 76 Z', 'var(--pop)') +
      R(126, 74, 148, 5, 'var(--near)', 2) +
      R(146, 96, 108, 16, 'var(--pale)', 0, '.85') +
      R(146, 79, 50, 17, 'var(--pale)', 0, '.95') + R(204, 79, 50, 17, 'var(--pale)', 0, '.95') +
      R(158, 79, 5, 17, 'var(--pop)', 0, '.75') + R(180, 79, 5, 17, 'var(--pop)', 0, '.75') +
      R(216, 79, 5, 17, 'var(--pop)', 0, '.75') + R(238, 79, 5, 17, 'var(--pop)', 0, '.75') +
      /* 兩個坐著的人影 */
      C(170, 100, 5.4, 'var(--near)') + P('M162 112 C 162 104 178 104 178 112 Z', 'var(--near)') +
      C(232, 100, 5.4, 'var(--near)') + P('M224 112 C 224 104 240 104 240 112 Z', 'var(--near)')
    ) +
    steam(200, 54, 20, 3.2, 'var(--pale)', '.5') +

    /* 放大的紅燈籠 */
    S('M344 6 L344 44', 'var(--near)', 2, '.7') +
    hand2(
      E(344, 76, 26, 32, 'var(--pop)') +
      R(329, 42, 30, 7, 'var(--near)', 2) + R(329, 103, 30, 7, 'var(--near)', 2) +
      S('M320 62 L368 62', 'var(--near)', 1.4, '.22') + S('M318 76 L370 76', 'var(--near)', 1.4, '.22') +
      S('M320 90 L368 90', 'var(--near)', 1.4, '.22') +
      R(340, 60, 8, 14, 'var(--pale)', 1, '.4') + R(340, 80, 8, 8, 'var(--pale)', 1, '.4')
    )
  ),

  /* ── 長崎・佐世保 ───────────────────────────────────────
     印象採集：坡道與階梯之城／層層疊上山的房子／黃色路面電車與架空線／
              大浦天主堂的尖塔／九十九島夕陽下的層疊剪影／港與造船起重機／
              中華街的燈籠／卡斯特拉的黃
     取用：山坡房屋（中景）＋ 放大的路面電車（前景焦點）＋ 海與九十九島 ＋ 教堂尖塔
     氣質：海霧藍、夕陽金、白牆聚落的顆粒感                        */
  nagasaki: frame(
    C(318, 46, 26, 'var(--pop)', '.5') +
    hand(
      /* 九十九島 */
      P('M214 82 C 236 62 268 60 292 82 Z', 'var(--near)', '.5') +
      P('M282 82 C 302 66 332 64 356 82 Z', 'var(--near)', '.38') +
      P('M346 82 C 362 70 386 68 404 82 Z', 'var(--near)', '.28') +
      /* 海 */
      P('M-4 78 C 100 74 200 82 300 78 C 350 76 380 80 404 78 L404 104 L-4 104 Z', 'var(--mid)') +
      /* 山坡 */
      P('M-4 140 L-4 98 C 34 94 64 82 92 68 C 118 55 150 48 178 56 C 206 64 230 80 256 94 C 286 110 330 116 404 114 L404 140 Z', 'var(--far)')
    ) +
    S('M14 88 q9 -5 18 0 t18 0', 'var(--pale)', 2.4, '.45') +
    S('M296 86 q9 -5 18 0 t18 0', 'var(--pale)', 2.4, '.42') +
    S('M338 94 q9 -5 18 0 t18 0', 'var(--pale)', 2.4, '.32') +

    hand2(
      /* 坡上的家 */
      house(26, 104, 17, 12, 'var(--pale)', 'var(--near)') +
      house(50, 94, 16, 12, 'var(--pale)', 'var(--pop)') +
      house(72, 84, 18, 13, 'var(--pale)', 'var(--near)') +
      house(98, 74, 16, 12, 'var(--pale)', 'var(--near)') +
      house(122, 65, 17, 12, 'var(--pale)', 'var(--pop)') +
      house(148, 60, 16, 11, 'var(--pale)', 'var(--near)') +
      house(238, 88, 17, 12, 'var(--pale)', 'var(--near)') +
      house(266, 98, 16, 12, 'var(--pale)', 'var(--pop)') +
      house(300, 106, 18, 12, 'var(--pale)', 'var(--near)') +
      /* 大浦天主堂：白牆 × 尖塔 */
      P('M186 60 L200 34 L214 60 Z', 'var(--near)') +
      R(190, 60, 20, 22, 'var(--pale)') +
      C(200, 68, 4, 'var(--pop)') +
      S('M200 26 L200 34 M196 30 L204 30', 'var(--near)', 2) +
      R(212, 70, 16, 12, 'var(--pale)') + P('M209 70 L220 62 L231 70 Z', 'var(--near)')
    ) +

    /* 焦點：放大的路面電車 */
    S('M56 73 L344 70', 'var(--near)', 1.3, '.22') +
    S('M212 74 L212 92', 'var(--near)', 2, '.6') +
    hand2(
      R(96, 94, 190, 28, 'var(--pop)', 7) +
      R(102, 88, 178, 7, 'var(--pale)', 3.5) +
      R(110, 99, 34, 14, 'var(--sky)', 3) + R(152, 99, 34, 14, 'var(--sky)', 3) +
      R(194, 99, 34, 14, 'var(--sky)', 3) + R(236, 99, 34, 14, 'var(--sky)', 3) +
      R(96, 116, 190, 6, 'var(--near)', 2) +
      R(160, 82, 40, 8, 'var(--near)', 3)
    ) +
    C(134, 124, 7, 'var(--near)') + C(250, 124, 7, 'var(--near)') +
    C(134, 124, 2.6, 'var(--far)') + C(250, 124, 2.6, 'var(--far)')
  ),

  /* ── 熊本 ──────────────────────────────────────────────
     印象採集：黑漆天守與白漆喰／武者返し那道往上翹的石垣曲線／銀杏城的黃／
              金色的鯱／城下町的水與湧水／馬刺し／阿蘇伏流水的清澈
     取用：誇張到像滑梯的石垣曲線（骨架）＋ 幾何化天守（焦點）＋ 放大的銀杏葉 ＋ 遠山
     氣質：墨黑、漆喰白、銀杏金，秋天剛開始的乾爽                  */
  kumamoto: frame(
    C(322, 44, 21, 'var(--pop)', '.3') +
    hand(
      P('M-4 104 C 46 84 96 80 140 90 C 180 99 214 96 252 88 C 302 77 352 82 404 98 L404 140 L-4 140 Z', 'var(--far)') +
      /* 石垣：兩側凹曲線 */
      P('M20 140 C 84 128 146 110 166 82 L234 82 C 254 110 316 128 380 140 Z', 'var(--mid)')
    ) +
    R(164, 80, 72, 4, 'var(--near)', 2, '.55') +
    S('M44 134 C 130 124 270 124 356 134', 'var(--near)', 1.6, '.17') +
    S('M74 120 C 146 112 254 112 326 120', 'var(--near)', 1.6, '.15') +
    S('M104 106 C 158 100 242 100 296 106', 'var(--near)', 1.6, '.13') +
    S('M134 92 C 168 88 232 88 266 92', 'var(--near)', 1.6, '.11') +
    S('M96 127 v6 M148 122 v6 M200 121 v6 M252 122 v6 M304 127 v6', 'var(--near)', 1.4, '.13') +
    S('M122 113 v6 M174 108 v6 M226 108 v6 M278 113 v6', 'var(--near)', 1.4, '.11') +

    /* 焦點：天守 */
    hand2(
      P('M150 84 L163 74 L237 74 L250 84 Z', 'var(--near)') +
      R(163, 64, 74, 10, 'var(--pale)') +
      P('M158 64 L169 56 L231 56 L242 64 Z', 'var(--near)') +
      R(171, 48, 58, 8, 'var(--pale)') +
      P('M167 48 L177 42 L223 42 L233 48 Z', 'var(--near)') +
      R(181, 36, 38, 6, 'var(--pale)')
    ) +
    R(172, 66, 5, 6, 'var(--near)', 1, '.75') + R(184, 66, 5, 6, 'var(--near)', 1, '.75') +
    R(196, 66, 5, 6, 'var(--near)', 1, '.75') + R(208, 66, 5, 6, 'var(--near)', 1, '.75') +
    R(220, 66, 5, 6, 'var(--near)', 1, '.75') +
    R(180, 50, 5, 5, 'var(--near)', 1, '.7') + R(197, 50, 5, 5, 'var(--near)', 1, '.7') +
    R(214, 50, 5, 5, 'var(--near)', 1, '.7') +
    P('M180 36 L184 30 L188 36 Z', 'var(--pop)') + P('M212 36 L216 30 L220 36 Z', 'var(--pop)') +

    /* 放大的銀杏葉飄下來 */
    hand2(
      ginkgo(48, 124, 1.35, -14, 'var(--pop)') +
      ginkgo(336, 104, 0.95, 26, 'var(--pop)') +
      ginkgo(298, 130, 0.62, -44, 'var(--pop)') +
      ginkgo(96, 74, 0.5, 16, 'var(--pop)')
    )
  ),

  /* ── 阿蘇・高千穗 ───────────────────────────────────────
     印象採集：中岳火口不斷冒的白煙／世界最大級的破火山口稜線／
              草千里的圓弧草坡／赤牛與馬／米塚那個像布丁又缺一角的小山／
              高千穗峽的柱狀岩與小船／秋天的芒草
     取用：誇張的破火山口稜線（後景）＋ 米塚（焦點）＋ 白煙 ＋ 赤牛 ＋ 放大的芒草
     氣質：高原的藍、草綠、火山口的灰白、赤牛的橘                   */
  aso: frame(
    cloud(58, 40, 0.9, 'var(--pale)', '.85') +
    cloud(320, 32, 0.7, 'var(--pale)', '.7') +
    /* 中岳的煙 */
    C(312, 58, 9, 'var(--pale)', '.7') + C(326, 46, 12, 'var(--pale)', '.6') +
    C(342, 34, 8, 'var(--pale)', '.45') +
    hand(
      P('M-4 86 L38 66 L86 80 L130 60 L176 78 L220 58 L266 76 L312 62 L358 80 L404 68 L404 140 L-4 140 Z', 'var(--far)') +
      /* 米塚 */
      P('M134 108 C 146 88 168 60 181 50 L190 62 L199 50 C 212 60 234 88 246 108 Z', 'var(--mid)') +
      /* 草千里 */
      P('M-4 108 C 80 100 148 112 230 106 C 300 101 352 110 404 104 L404 140 L-4 140 Z', 'var(--near)')
    ) +
    P('M181 50 L190 62 L199 50 L196 46 L190 54 L184 46 Z', 'var(--far)', '.75') +
    S('M158 94 C 178 88 204 88 224 94', 'var(--near)', 2, '.14') +

    /* 赤牛 */
    hand2(
      R(280, 98, 46, 22, 'var(--pop)', 9) +
      R(262, 100, 22, 15, 'var(--pop)', 6) +
      R(270, 116, 6, 13, 'var(--pop)', 2) + R(284, 116, 6, 13, 'var(--pop)', 2) +
      R(308, 116, 6, 13, 'var(--pop)', 2) + R(320, 116, 6, 13, 'var(--pop)', 2) +
      S('M326 100 C 336 100 334 112 330 116', 'var(--pop)', 3) +
      S('M264 99 L260 94 M276 98 L278 92', 'var(--pale)', 2.4) +
      C(268, 106, 2, 'var(--near)')
    ) +
    /* 放大的芒草 */
    hand2(
      ear(30, 140, 52, 1, 'var(--pale)', '.9') +
      ear(62, 140, 40, 1, 'var(--pale)', '.72') +
      ear(92, 140, 30, 1, 'var(--pale)', '.55')
    )
  ),

  /* ── 黑川溫泉 ──────────────────────────────────────────
     印象採集：整條溪谷藏在杉木林裡／入湯手形那塊圓木牌／露天風呂與湯氣／
              川端的石橋／冬天溪邊的毬あかり圓燈／浴衣木屐的聲音／苔與濕氣
     取用：暮色杉林（後景）＋ 露天風呂（焦點）＋ 大量湯氣 ＋ 漂在暗處的圓燈
     氣質：紫灰的暮色、杉木的深綠、湯與燈的琥珀暖光                */
  kurokawa: frame(
    C(330, 40, 13, 'var(--pale)', '.8') +
    C(300, 28, 2.4, 'var(--pale)', '.5') + C(356, 60, 2, 'var(--pale)', '.4') +
    hand(
      cedar(24, 96, 52, 26, 'var(--far)') + cedar(60, 96, 38, 21, 'var(--far)') +
      cedar(96, 96, 58, 27, 'var(--far)') + cedar(138, 96, 42, 22, 'var(--far)') +
      cedar(186, 96, 34, 19, 'var(--far)') + cedar(238, 96, 46, 24, 'var(--far)') +
      cedar(288, 96, 36, 20, 'var(--far)') + cedar(330, 96, 54, 26, 'var(--far)') +
      cedar(376, 96, 40, 22, 'var(--far)') +
      cedar(8, 108, 40, 24, 'var(--mid)') + cedar(48, 108, 30, 19, 'var(--mid)') +
      cedar(114, 108, 34, 21, 'var(--mid)') + cedar(304, 108, 32, 20, 'var(--mid)') +
      cedar(352, 108, 44, 25, 'var(--mid)') +
      P('M-4 106 C 80 100 150 112 230 106 C 300 101 352 110 404 104 L404 140 L-4 140 Z', 'var(--near)')
    ) +
    /* 焦點：露天風呂 */
    hand2(
      E(200, 112, 88, 25, 'var(--mid)') +
      E(200, 112, 73, 18, 'var(--pop)') +
      E(184, 107, 30, 6, 'var(--pale)', '.32') +
      E(126, 108, 11, 6, 'var(--far)', '.8') + E(150, 100, 8, 5, 'var(--far)', '.7') +
      E(252, 101, 9, 5, 'var(--far)', '.7') + E(276, 108, 12, 6, 'var(--far)', '.8')
    ) +
    steam(168, 98, 44, 6, 'var(--pale)', '.6') +
    steam(202, 94, 56, 7, 'var(--pale)', '.66') +
    steam(236, 98, 40, 5.5, 'var(--pale)', '.5') +
    /* 溪邊的圓燈 */
    hand2(
      C(52, 108, 12, 'var(--pop)', '.92') + C(52, 108, 6, 'var(--pale)', '.7') +
      C(88, 120, 9, 'var(--pop)', '.8') + C(88, 120, 4.4, 'var(--pale)', '.6') +
      C(340, 116, 10, 'var(--pop)', '.85') + C(340, 116, 5, 'var(--pale)', '.6')
    )
  ),

  /* ── 由布院 ───────────────────────────────────────────
     印象採集：由布岳兩座尖峰／金鱗湖清晨浮起的霧／湯之坪街道／
              噠噠走過的辻馬車／由布院之森的綠色列車／秋天金黃的稻穗與芒草／
              盆地被山圍住的安靜
     取用：由布岳雙峰（骨架）＋ 橫著切開山腰的晨霧 ＋ 金鱗湖 ＋ 小得像玩具的辻馬車
          ＋ 放大到比山還高的稻穗
     氣質：清晨的薄荷藍灰、稻穗金、山的深青                        */
  yufuin: frame(
    C(92, 44, 19, 'var(--pop)', '.34') +
    hand(
      P('M-4 94 L56 68 L118 86 L180 58 L240 82 L300 62 L360 86 L404 74 L404 100 L-4 100 Z', 'var(--far)') +
      P('M60 96 L150 42 L177 60 L204 38 L296 96 Z', 'var(--mid)') +
      P('M-4 116 C 90 110 160 120 250 114 C 320 109 360 117 404 112 L404 140 L-4 140 Z', 'var(--near)')
    ) +
    P('M150 42 L136 58 L166 58 Z', 'var(--pale)', '.75') +
    P('M204 38 L190 54 L220 54 Z', 'var(--pale)', '.75') +
    /* 晨霧：橫著把山切成兩半 */
    R(24, 74, 128, 9, 'var(--pale)', 4.5, '.8') +
    R(168, 82, 148, 9, 'var(--pale)', 4.5, '.72') +
    R(74, 92, 168, 8, 'var(--pale)', 4, '.62') +
    R(258, 70, 74, 7, 'var(--pale)', 3.5, '.5') +
    /* 金鱗湖 */
    hand2(
      E(198, 112, 128, 17, 'var(--far)') +
      S('M74 108 C 120 96 276 96 322 108', 'var(--mid)', 1.6, '.28') +
      P('M150 112 L162 100 L174 112 Z', 'var(--mid)', '.3') +
      P('M198 112 L210 98 L222 112 Z', 'var(--mid)', '.3') +
      R(108, 116, 54, 3.4, 'var(--pale)', 2, '.65') + R(196, 121, 66, 3.4, 'var(--pale)', 2, '.5') +
      R(240, 110, 42, 3, 'var(--pale)', 2, '.45')
    ) +
    /* 小小的辻馬車 */
    hand2(
      R(66, 96, 36, 19, 'var(--pale)') +
      R(62, 90, 44, 7, 'var(--pop)', 3) +
      R(72, 100, 11, 10, 'var(--far)', 2) + R(87, 100, 11, 10, 'var(--far)', 2) +
      R(38, 98, 24, 11, 'var(--near)', 4) +
      P('M40 100 L30 88 L36 88 L44 98 Z', 'var(--near)') +
      R(40, 109, 3.6, 9, 'var(--near)', 1.8) + R(48, 109, 3.6, 9, 'var(--near)', 1.8) +
      R(56, 109, 3.6, 9, 'var(--near)', 1.8) +
      S('M62 100 L68 96', 'var(--near)', 2.4) +
      C(74, 116, 5.5, 'var(--near)') + C(96, 116, 5.5, 'var(--near)')
    ) +
    /* 放大的稻穗 */
    hand2(
      ear(334, 140, 68, 1, 'var(--pop)', '.92') +
      ear(364, 140, 54, 1, 'var(--pop)', '.76') +
      ear(310, 140, 42, 1, 'var(--pop)', '.6')
    )
  ),

  /* ── 別府 ──────────────────────────────────────────────
     印象採集：整座城市的屋瓦之間到處在冒湯煙／血の池地獄的朱紅／
              海地獄的鈷藍／鶴見岳／竹細工／砂湯／地獄蒸的蒸籠
     取用：屋瓦聚落（中景）＋ 從瓦片縫裡升起的八道湯煙（焦點）＋ 朱紅與鈷藍的兩池
     氣質：蒸氣白、瓦的灰藍、地獄的朱紅，濕熱                       */
  beppu: frame(
    hand(
      P('M150 88 L242 40 L334 88 Z', 'var(--far)', '.85') +
      P('M-4 88 L58 58 L120 88 Z', 'var(--far)', '.6')
    ) +
    /* 湯煙 */
    steam(46, 96, 46, 9, 'var(--pale)', '.72') +
    steam(96, 92, 58, 11, 'var(--pale)', '.85') +
    steam(146, 96, 48, 9, 'var(--pale)', '.75') +
    steam(196, 88, 66, 12, 'var(--pale)', '.92') +
    steam(248, 94, 52, 10, 'var(--pale)', '.8') +
    steam(300, 96, 44, 9, 'var(--pale)', '.7') +
    steam(350, 92, 54, 10, 'var(--pale)', '.74') +
    /* 屋瓦 */
    hand2(
      P('M4 112 L18 96 L74 96 L88 112 Z', 'var(--mid)') + R(16, 93, 60, 4, 'var(--near)', 2) +
      P('M70 104 L84 88 L142 88 L156 104 Z', 'var(--mid)') + R(82, 85, 62, 4, 'var(--near)', 2) +
      P('M140 116 L154 100 L214 100 L228 116 Z', 'var(--mid)') + R(152, 97, 64, 4, 'var(--near)', 2) +
      P('M214 106 L228 90 L288 90 L302 106 Z', 'var(--mid)') + R(226, 87, 64, 4, 'var(--near)', 2) +
      P('M292 114 L306 98 L364 98 L378 114 Z', 'var(--mid)') + R(304, 95, 62, 4, 'var(--near)', 2) +
      R(104, 78, 7, 12, 'var(--near)', 2) + R(250, 80, 7, 12, 'var(--near)', 2)
    ) +
    /* 地面與兩池 */
    hand(
      P('M-4 114 C 80 108 160 118 250 112 C 320 107 360 115 404 110 L404 140 L-4 140 Z', 'var(--near)')
    ) +
    hand2(
      E(132, 128, 112, 19, 'var(--pop)') +
      E(120, 123, 74, 8, 'var(--pale)', '.26') +
      E(336, 124, 62, 13, 'var(--far)') +
      E(330, 121, 38, 5, 'var(--pale)', '.3')
    ) +
    steam(120, 112, 26, 4.4, 'var(--pale)', '.45') +
    steam(340, 112, 20, 4, 'var(--pale)', '.4')
  ),

  /* ── 太宰府 ───────────────────────────────────────────
     印象採集：朱紅的太鼓橋跨過心字池／飛梅與整片梅林／參道的梅ヶ枝餅／
              巨大的楠木樹蔭／御神牛／一列朱紅鳥居／九博的曲線
     取用：太鼓橋（焦點）＋ 心字池與倒影 ＋ 放大到比橋還大的梅花 ＋ 縮小成模型的鳥居
          ＋ 楠木樹冠當作畫框
     氣質：朱紅、梅粉、池水深綠、參道的暖米色                       */
  dazaifu: frame(
    hand(
      P('M-6 -6 C 44 -10 86 12 78 42 C 70 70 20 66 -6 50 Z', 'var(--far)') +
      P('M406 -6 C 356 -10 322 14 332 40 C 340 62 380 60 406 46 Z', 'var(--far)') +
      P('M-4 96 C 80 90 170 100 250 94 C 320 89 360 97 404 92 L404 140 L-4 140 Z', 'var(--mid)')
    ) +
    /* 縮小成模型的鳥居 */
    hand2(
      P('M300 86 L342 86 L338 80 L304 80 Z', 'var(--far)') +
      R(304, 82, 34, 3.5, 'var(--far)') +
      R(308, 86, 4.5, 20, 'var(--far)') + R(329, 86, 4.5, 20, 'var(--far)')
    ) +
    /* 焦點：太鼓橋 */
    P('M118 118 C 132 168 268 168 282 118 L268 118 C 258 152 142 152 132 118 Z', 'var(--pop)', '.22') +
    hand2(
      P('M118 116 C 130 62 270 62 282 116 L267 116 C 257 76 143 76 133 116 Z', 'var(--pop)') +
      S('M126 100 C 142 66 258 66 274 100', 'var(--pop)', 3, '.9') +
      S('M148 88 L148 78 M176 78 L176 69 M224 78 L224 69 M252 88 L252 78', 'var(--pop)', 3, '.9') +
      R(114, 112, 14, 22, 'var(--near)', 3) + R(272, 112, 14, 22, 'var(--near)', 3)
    ) +
    S('M150 108 q10 -5 20 0 t20 0', 'var(--pale)', 2.2, '.35') +
    S('M220 118 q10 -5 20 0 t20 0', 'var(--pale)', 2.2, '.3') +
    /* 放大的梅花 */
    hand2(
      S('M-4 138 C 22 128 34 118 44 106', 'var(--near)', 3, '.8') +
      plum(52, 100, 2.2, 'var(--pale)', 'var(--pop)') +
      plum(96, 124, 1.25, 'var(--pale)', 'var(--pop)') +
      plum(22, 118, 0.85, 'var(--pale)', 'var(--pop)') +
      plum(354, 74, 0.95, 'var(--pale)', 'var(--pop)') +
      plum(316, 50, 0.6, 'var(--pale)', 'var(--pop)')
    )
  ),

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
};

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

/* ============================================================
   路線地圖。資料在 data/geo.js（地點是真實經緯度）。
   day 給 1–9 會highlight那天的移動；不給就是 9 天總覽。
   ============================================================ */
ART.map = function (day) {
  var V = GEO.view, PL = GEO.places, LAND = GEO.land;
  var stops = (day && GEO.route[day]) ? GEO.route[day] : GEO.loop;
  var on = {}, seen = [], o = '', i, k, q, a, b, mx, my, ang, d, pts = [];

  function n(v) { return Math.round(v * 10) / 10; }
  function xy(key) { q = PL[key]; return [n((q.lon - V.lon0) * V.sx), n((V.lat0 - q.lat) * V.sy)]; }
  function pt(lon, lat) { return [n((lon - V.lon0) * V.sx), n((V.lat0 - lat) * V.sy)]; }

  function label(key, hot) {
    var t = PL[key], p = xy(key);
    return '<text x="' + n(p[0] + t.lx) + '" y="' + n(p[1] + t.ly) + '" text-anchor="' + t.la +
      '" font-size="' + (hot ? 12.5 : 11) + '" font-weight="' + (hot ? 800 : 600) +
      '" fill="var(--map-ink)"' + (hot ? '' : ' opacity=".45"') +
      ' stroke="var(--map-land)" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">' +
      t.n + '</text>';
  }
  /* 一座手繪的小山：左面亮、右面暗 */
  function hill(x, y, w, h) {
    return P('M' + n(x - w / 2) + ' ' + n(y) + ' L' + n(x) + ' ' + n(y - h) +
             ' L' + n(x + w / 2) + ' ' + n(y) + ' Z', 'var(--map-hill)') +
           P('M' + n(x) + ' ' + n(y - h) + ' L' + n(x + w / 2) + ' ' + n(y) +
             ' L' + n(x + w * 0.12) + ' ' + n(y) + ' Z', 'var(--map-hill2)');
  }
  function range(x, y, s) {
    return hill(x - 9 * s, y, 15 * s, 7 * s) + hill(x + 9.5 * s, y, 14 * s, 6.4 * s) +
           hill(x, y - 0.5, 20 * s, 11.5 * s);
  }
  /* 羅盤 */
  function compass(x, y, s) {
    return G('translate(' + x + ',' + y + ') scale(' + s + ')',
      C(0, 0, 14, 'var(--map-land)', '.6') +
      P('M0 -14 L3.6 -3.6 L14 0 L3.6 3.6 L0 14 L-3.6 3.6 L-14 0 L-3.6 -3.6 Z', 'var(--map-ink)', '.42') +
      P('M0 -14 L3.6 -3.6 L0 0 L-3.6 -3.6 Z', 'var(--pop)') +
      '<text x="0" y="-17.5" text-anchor="middle" font-size="9" font-weight="800"' +
      ' fill="var(--map-ink)" opacity=".55">N</text>');
  }
  /* 比例尺：25 公里 */
  function scalebar(x, y) {
    var L = n(25 / 111.195 * V.sy), h = 3.6;
    return R(x, y, L, h, 'var(--map-ink)', 0, '.5') +
      R(x + L / 2, y, L / 2, h, 'var(--map-land)', 0, '.85') +
      '<rect x="' + x + '" y="' + y + '" width="' + L + '" height="' + h +
      '" fill="none" stroke="var(--map-ink)" stroke-width=".9" opacity=".5"/>' +
      '<text x="' + n(x + L + 5) + '" y="' + (y + h) + '" font-size="9" font-weight="700"' +
      ' fill="var(--map-ink)" opacity=".5">25 km</text>';
  }

  for (i = 0; i < stops.length; i++) on[stops[i]] = 1;

  o += '<g style="isolation:isolate">';
  o += R(-4, -4, V.w + 8, V.h + 8, 'var(--map-sea)');

  /* 陸地。先沿著海岸描三層越來越寬的淡邊，被陸地蓋掉內側之後
     只剩外側，就成了古地圖那種一圈一圈的等深線暈染。 */
  var echo = '', shade = '', land = '', line = '';
  for (i = 0; i < LAND.length; i++) {
    echo += S(LAND[i].d, 'var(--map-echo)', 15, '.16') ;
    shade += S(LAND[i].d, 'var(--map-echo)', 8, '.2');
    land += P(LAND[i].d, 'var(--map-land)');
    line += S(LAND[i].d, 'var(--map-ink)', 0.9, '.3');
  }
  o += hand2(echo + shade +
    G('translate(0,3.5)', (function () {
      var t = '', j; for (j = 0; j < LAND.length; j++) t += P(LAND[j].d, 'var(--map-edge)'); return t;
    })()) +
    land + line);

  /* 縣界 */
  for (i = 0; i < LAND.length; i++) o += S(LAND[i].d, 'var(--map-ink)', 0.9, '.13', '3 3');

  /* 山 */
  o += hand2((function () {
    var t = '', j, p;
    for (j = 0; j < GEO.hills.length; j++) {
      p = pt(GEO.hills[j][0], GEO.hills[j][1]);
      t += range(p[0], p[1], GEO.hills[j][2]);
    }
    return t;
  })());

  /* 海上的小浪紋 */
  for (i = 0; i < GEO.waves.length; i++) {
    a = GEO.waves[i];
    o += G('translate(' + a[0] + ',' + a[1] + ') scale(' + a[2] + ')',
      S('M-11 0 q5.5 -4 11 0 t11 0', 'var(--map-ink)', 1.7, '.3') +
      S('M-8 5.5 q5.5 -4 11 0 t8 0', 'var(--map-ink)', 1.7, '.22'));
  }

  /* 海域名 */
  for (i = 0; i < GEO.seas.length; i++) {
    a = GEO.seas[i];
    o += '<text x="' + a[0] + '" y="' + a[1] + '" text-anchor="' + a[3] +
      '" font-size="9.5" font-weight="600" fill="var(--map-ink)" opacity=".32">' + a[2] + '</text>';
  }

  o += compass(30, 28, 0.85) + scalebar(18, 224);

  /* 9 天整體路線走一遍（淡虛線），讓人知道今天在整趟裡的哪一段 */
  d = '';
  for (i = 0; i < GEO.loop.length; i++) {
    a = xy(GEO.loop[i]); d += (i ? 'L' : 'M') + a[0] + ' ' + a[1] + ' ';
  }
  o += S(d, 'var(--map-ink)', 1.7, '.3', '2 6');

  /* 沒去的地點：小點 */
  for (k in PL) if (!on[k]) {
    a = xy(k);
    o += C(a[0], a[1], 3.4, 'var(--map-land)', '.8') + C(a[0], a[1], 2.2, 'var(--map-ink)', '.45');
  }

  /* 今天的路線 */
  d = '';
  for (i = 0; i < stops.length; i++) {
    a = xy(stops[i]); pts.push(a); d += (i ? 'L' : 'M') + a[0] + ' ' + a[1] + ' ';
  }
  if (pts.length > 1) {
    o += S(d, 'var(--map-land)', 7.5, '.85');
    o += hand2(S(d, 'var(--pop)', 3.2, '1', '11 5.5'));
    for (i = 1; i < pts.length; i++) {
      a = pts[i - 1]; b = pts[i];
      mx = (a[0] + b[0]) / 2; my = (a[1] + b[1]) / 2;
      ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      o += G('translate(' + n(mx) + ',' + n(my) + ') rotate(' + n(ang) + ')',
        P('M-4.4 -5 L5.8 0 L-4.4 5 Z', 'var(--pop)') +
        P('M-4.4 -5 L-1.6 0 L-4.4 5 Z', 'var(--map-land)', '.55'));
    }
  } else {
    a = pts[0];
    o += C(a[0], a[1], 14, 'var(--pop)', '.16') + C(a[0], a[1], 9.5, 'var(--pop)', '.2');
  }

  /* 停留點：外白內色，加一圈細環 */
  for (i = 0; i < stops.length; i++) {
    k = stops[i]; if (seen.indexOf(k) >= 0) continue; seen.push(k);
    a = xy(k);
    o += C(a[0], a[1], 7, 'var(--map-land)') +
      '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="6.1" fill="none" stroke="var(--pop)" stroke-width="1.3" opacity=".55"/>' +
      C(a[0], a[1], 4.2, 'var(--pop)');
  }

  /* 標籤：今天的粗體，其他的淡淡放著當定位參考 */
  for (k in PL) if (!on[k]) o += label(k, false);
  for (i = 0; i < seen.length; i++) o += label(seen[i], true);

  o += '<rect class="gr" x="-4" y="-4" width="' + (V.w + 8) + '" height="' + (V.h + 8) + '" fill="url(#hz-grain)"/>';
  o += '</g>';

  return '<svg class="kmap" viewBox="0 0 ' + V.w + ' ' + V.h + '" preserveAspectRatio="xMidYMid meet" ' +
    'role="img" aria-label="' + (day ? ('第 ' + day + ' 天路線圖') : '九天路線總覽圖') + '">' + o + '</svg>';
};

/* 一張畫的 <svg> 外殼。variant: 'wide'（預設，完整構圖）／'band'（裁掉上方天空）／'stamp'（中央方形） */
ART.svg = function (reg, cls, par) {
  return '<svg class="' + (cls || 'scene') + '" viewBox="0 0 400 132" preserveAspectRatio="'
    + (par || 'xMidYMax slice') + '" aria-hidden="true">'
    + (ART.scenes[reg] || ART.scenes.journey) + '</svg>';
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
