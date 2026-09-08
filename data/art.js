/* 手繪 SVG 插畫。全部用 CSS 變數上色（--reg / --reg-shade / --reg-tint），
   所以同一組圖形會自動套用該地區的色相，也會跟著深淺色主題走。
   完全內嵌，零外部請求，離線可用，無版權問題。 */
window.ART = {};

ART.scenes = {

  /* 福岡・博多 ── 都市天際線與抵達的飛機 */
  fukuoka:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<circle cx="330" cy="32" r="24" fill="var(--reg)" opacity=".32"/>' +
    '<path d="M14 16 C58 22 74 34 70 52" fill="none" stroke="var(--reg)" stroke-width="2.5" stroke-dasharray="4 7" opacity=".5" stroke-linecap="round"/>' +
    '<g transform="translate(56,24) rotate(-16) scale(.86)">' +
      '<ellipse cx="62" cy="18" rx="62" ry="7" fill="var(--reg)"/>' +
      '<path d="M64 18 L32 -14 L48 -14 L92 14 Z" fill="var(--reg)"/>' +
      '<path d="M64 18 L32 50 L48 50 L92 22 Z" fill="var(--reg-shade)"/>' +
      '<path d="M12 18 L0 0 L10 0 L28 16 Z" fill="var(--reg)"/>' +
      '<path d="M12 18 L0 36 L10 36 L28 20 Z" fill="var(--reg-shade)"/>' +
    '</g>' +
    '<g fill="var(--reg-shade)">' +
      '<rect x="10" y="84" width="38" height="48"/><rect x="54" y="66" width="26" height="66"/>' +
      '<rect x="86" y="94" width="32" height="38"/><rect x="126" y="58" width="22" height="74"/>' +
      '<rect x="156" y="78" width="42" height="54"/><rect x="206" y="90" width="28" height="42"/>' +
      '<rect x="242" y="70" width="24" height="62"/><rect x="274" y="96" width="44" height="36"/>' +
      '<rect x="326" y="80" width="38" height="52"/><rect x="372" y="98" width="28" height="34"/>' +
    '</g>' +
    '<g fill="var(--reg-tint)" opacity=".75">' +
      '<rect x="60" y="74" width="6" height="8"/><rect x="70" y="74" width="6" height="8"/>' +
      '<rect x="60" y="88" width="6" height="8"/><rect x="70" y="88" width="6" height="8"/>' +
      '<rect x="132" y="66" width="6" height="8"/><rect x="132" y="80" width="6" height="8"/>' +
      '<rect x="132" y="94" width="6" height="8"/>' +
      '<rect x="166" y="88" width="7" height="9"/><rect x="180" y="88" width="7" height="9"/>' +
      '<rect x="166" y="104" width="7" height="9"/><rect x="180" y="104" width="7" height="9"/>' +
      '<rect x="248" y="80" width="6" height="8"/><rect x="248" y="94" width="6" height="8"/>' +
      '<rect x="334" y="90" width="7" height="9"/><rect x="348" y="90" width="7" height="9"/>' +
    '</g>' +
    '<rect y="126" width="400" height="6" fill="var(--reg)"/>',

  /* 長崎・佐世保 ── 九十九島與遊覽船 */
  nagasaki:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<circle cx="76" cy="30" r="19" fill="var(--reg)" opacity=".38"/>' +
    '<g fill="var(--reg)" opacity=".45">' +
      '<path d="M-10 82 C 16 56 56 56 84 82 Z"/>' +
      '<path d="M186 84 C 214 60 254 60 286 84 Z"/>' +
    '</g>' +
    '<g fill="var(--reg-shade)">' +
      '<path d="M64 86 C 104 50 156 50 198 86 Z"/>' +
      '<path d="M272 86 C 302 62 348 62 388 86 Z"/>' +
    '</g>' +
    '<rect y="86" width="400" height="46" fill="var(--reg)"/>' +
    '<g fill="none" stroke="var(--reg-tint)" stroke-width="3" stroke-linecap="round" opacity=".7">' +
      '<path d="M24 104 q10-6 20 0 t20 0"/><path d="M300 100 q10-6 20 0 t20 0"/>' +
      '<path d="M60 122 q10-6 20 0 t20 0"/><path d="M244 120 q10-6 20 0 t20 0"/>' +
    '</g>' +
    '<g>' +
      '<path d="M154 92 h10 v-16 h5 v16 h9 l-2 6 h-22 z" fill="var(--reg-tint)"/>' +
      '<path d="M138 96 h84 l-14 18 h-56 z" fill="var(--reg-tint)"/>' +
      '<rect x="152" y="86" width="26" height="8" fill="var(--reg-shade)"/>' +
    '</g>',

  /* 熊本 ── 熊本城天守閣 */
  kumamoto:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<circle cx="322" cy="34" r="22" fill="var(--reg)" opacity=".3"/>' +
    '<g fill="var(--reg)">' +
      '<rect x="192" y="8" width="6" height="8"/>' +
      '<path d="M158 30 h84 l-12-14 h-60 z"/>' +
      '<rect x="170" y="30" width="60" height="13"/>' +
      '<path d="M144 58 h112 l-16-15 h-80 z"/>' +
      '<rect x="158" y="58" width="84" height="15"/>' +
      '<path d="M124 90 h152 l-20-17 h-112 z"/>' +
      '<rect x="140" y="90" width="120" height="14"/>' +
    '</g>' +
    '<g fill="var(--reg-tint)" opacity=".8">' +
      '<rect x="180" y="33" width="7" height="8"/><rect x="196" y="33" width="7" height="8"/>' +
      '<rect x="213" y="33" width="7" height="8"/>' +
      '<rect x="168" y="61" width="8" height="10"/><rect x="186" y="61" width="8" height="10"/>' +
      '<rect x="204" y="61" width="8" height="10"/><rect x="222" y="61" width="8" height="10"/>' +
      '<rect x="152" y="93" width="9" height="10"/><rect x="174" y="93" width="9" height="10"/>' +
      '<rect x="196" y="93" width="9" height="10"/><rect x="218" y="93" width="9" height="10"/>' +
      '<rect x="240" y="93" width="9" height="10"/>' +
    '</g>' +
    '<path d="M78 132 L128 104 h144 l50 28 z" fill="var(--reg-shade)"/>' +
    '<g fill="none" stroke="var(--reg-tint)" stroke-width="2" opacity=".45">' +
      '<path d="M104 118 h192"/><path d="M148 104 v28"/><path d="M200 104 v28"/><path d="M252 104 v28"/>' +
    '</g>',

  /* 阿蘇・高千穗 ── 火山、噴煙與草千里 */
  aso:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<g fill="var(--reg)" opacity=".28">' +
      '<circle cx="196" cy="20" r="17"/><circle cx="224" cy="12" r="12"/><circle cx="170" cy="14" r="11"/>' +
      '<circle cx="212" cy="30" r="10"/>' +
    '</g>' +
    '<path d="M-20 116 L96 52 L200 116 Z" fill="var(--reg-shade)" opacity=".55"/>' +
    '<path d="M214 116 L318 48 L420 116 Z" fill="var(--reg-shade)" opacity=".55"/>' +
    '<path d="M52 116 L200 40 L348 116 Z" fill="var(--reg)"/>' +
    '<path d="M166 62 L234 62 L200 40 Z" fill="var(--reg-shade)"/>' +
    '<rect y="110" width="400" height="22" fill="var(--reg-shade)"/>' +
    '<g fill="none" stroke="var(--reg-tint)" stroke-width="2.5" stroke-linecap="round" opacity=".55">' +
      '<path d="M22 126 v-8"/><path d="M40 128 v-10"/><path d="M58 125 v-7"/>' +
      '<path d="M300 127 v-9"/><path d="M318 124 v-7"/><path d="M336 128 v-10"/><path d="M354 125 v-8"/>' +
    '</g>',

  /* 黑川溫泉 ── 露天風呂與湯氣 */
  kurokawa:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<g fill="var(--reg-shade)" opacity=".5">' +
      '<path d="M22 96 L48 40 L74 96 Z"/><path d="M62 96 L84 52 L106 96 Z"/>' +
      '<path d="M300 96 L326 44 L352 96 Z"/><path d="M344 96 L368 56 L392 96 Z"/>' +
    '</g>' +
    '<g fill="none" stroke="var(--reg)" stroke-width="4" stroke-linecap="round" opacity=".55">' +
      '<path d="M158 66 c9-11 -9-20 0-31"/><path d="M200 58 c9-11 -9-20 0-31"/>' +
      '<path d="M242 66 c9-11 -9-20 0-31"/>' +
    '</g>' +
    '<rect x="112" y="80" width="176" height="42" rx="15" fill="var(--reg)"/>' +
    '<rect x="126" y="88" width="148" height="15" rx="7" fill="var(--reg-tint)"/>' +
    '<g fill="var(--reg-shade)"><circle cx="164" cy="95" r="6"/><circle cx="200" cy="95" r="6"/><circle cx="236" cy="95" r="6"/></g>' +
    '<g>' +
      '<rect x="52" y="30" width="4" height="14" fill="var(--reg-shade)"/>' +
      '<rect x="40" y="44" width="28" height="34" rx="6" fill="var(--reg)"/>' +
      '<rect x="46" y="52" width="16" height="18" rx="3" fill="var(--reg-tint)"/>' +
    '</g>' +
    '<rect y="122" width="400" height="10" fill="var(--reg-shade)"/>',

  /* 由布院 ── 由布岳雙峰與金鱗湖 */
  yufuin:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<circle cx="60" cy="28" r="18" fill="var(--reg)" opacity=".35"/>' +
    '<path d="M-10 94 L84 40 L146 78 L206 30 L300 94 Z" fill="var(--reg-shade)" opacity=".55"/>' +
    '<path d="M40 94 L142 26 L200 68 L258 22 L400 94 Z" fill="var(--reg)"/>' +
    '<path d="M142 26 L116 44 L168 44 Z" fill="var(--reg-tint)"/>' +
    '<path d="M258 22 L232 42 L284 42 Z" fill="var(--reg-tint)"/>' +
    '<g fill="var(--reg-tint)" opacity=".75">' +
      '<rect x="30" y="76" width="90" height="7" rx="3.5"/><rect x="250" y="70" width="110" height="7" rx="3.5"/>' +
      '<rect x="150" y="86" width="120" height="7" rx="3.5"/>' +
    '</g>' +
    '<ellipse cx="200" cy="114" rx="150" ry="18" fill="var(--reg)" opacity=".55"/>' +
    '<g fill="none" stroke="var(--reg-tint)" stroke-width="3" stroke-linecap="round" opacity=".8">' +
      '<path d="M132 110 h44"/><path d="M164 120 h56"/><path d="M240 112 h40"/>' +
    '</g>',

  /* 別府 ── 地獄溫泉的湯池與蒸氣 */
  beppu:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<g fill="none" stroke="var(--reg)" stroke-width="4" stroke-linecap="round" opacity=".5">' +
      '<path d="M84 60 c9-11 -9-20 0-31"/><path d="M126 52 c9-11 -9-20 0-31"/>' +
      '<path d="M262 56 c9-11 -9-20 0-31"/><path d="M304 64 c9-11 -9-20 0-31"/>' +
    '</g>' +
    '<g fill="var(--reg-shade)" opacity=".55">' +
      '<path d="M156 74 h88 l-6-10h-14v-12h-6v12h-36v-12h-6v12h-14z"/>' +
      '<rect x="168" y="74" width="8" height="26"/><rect x="224" y="74" width="8" height="26"/>' +
    '</g>' +
    '<ellipse cx="104" cy="98" rx="66" ry="22" fill="var(--reg)"/>' +
    '<ellipse cx="104" cy="95" rx="52" ry="15" fill="var(--reg-tint)" opacity=".85"/>' +
    '<ellipse cx="292" cy="104" rx="72" ry="24" fill="var(--reg)"/>' +
    '<ellipse cx="292" cy="101" rx="56" ry="16" fill="var(--reg-tint)" opacity=".85"/>' +
    '<ellipse cx="200" cy="120" rx="58" ry="16" fill="var(--reg-shade)"/>' +
    '<rect y="126" width="400" height="6" fill="var(--reg)"/>',

  /* 太宰府 ── 鳥居參道與梅花 */
  dazaifu:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<g fill="var(--reg-shade)" opacity=".45">' +
      '<path d="M96 108 h56 l-5-9h-8v-9h-5v9h-20v-9h-5v9h-8z"/>' +
      '<rect x="105" y="108" width="6" height="24"/><rect x="137" y="108" width="6" height="24"/>' +
      '<path d="M248 108 h56 l-5-9h-8v-9h-5v9h-20v-9h-5v9h-8z"/>' +
      '<rect x="257" y="108" width="6" height="24"/><rect x="289" y="108" width="6" height="24"/>' +
    '</g>' +
    '<g fill="var(--reg)">' +
      '<path d="M144 62 h112 l-9-14h-16v-14h-9v14h-44v-14h-9v14h-16z"/>' +
      '<rect x="160" y="62" width="12" height="70"/><rect x="228" y="62" width="12" height="70"/>' +
      '<rect x="152" y="126" width="28" height="6"/><rect x="220" y="126" width="28" height="6"/>' +
    '</g>' +
    '<g fill="var(--reg)" opacity=".8">' +
      '<g transform="translate(56,40)"><circle r="6"/><circle cx="11" cy="-6" r="6"/><circle cx="22" cy="0" r="6"/><circle cx="18" cy="12" r="6"/><circle cx="4" cy="12" r="6"/></g>' +
      '<g transform="translate(310,26) scale(.8)"><circle r="6"/><circle cx="11" cy="-6" r="6"/><circle cx="22" cy="0" r="6"/><circle cx="18" cy="12" r="6"/><circle cx="4" cy="12" r="6"/></g>' +
      '<g transform="translate(340,74) scale(.62)"><circle r="6"/><circle cx="11" cy="-6" r="6"/><circle cx="22" cy="0" r="6"/><circle cx="18" cy="12" r="6"/><circle cx="4" cy="12" r="6"/></g>' +
      '<g transform="translate(30,92) scale(.7)"><circle r="6"/><circle cx="11" cy="-6" r="6"/><circle cx="22" cy="0" r="6"/><circle cx="18" cy="12" r="6"/><circle cx="4" cy="12" r="6"/></g>' +
    '</g>',

  /* 行前倒數用 ── 山、鳥居、飛機的綜合景 */
  journey:
    '<rect width="400" height="132" fill="var(--reg-tint)"/>' +
    '<circle cx="336" cy="30" r="21" fill="var(--reg)" opacity=".32"/>' +
    '<path d="M12 20 C64 26 84 40 78 60" fill="none" stroke="var(--reg)" stroke-width="2.5" stroke-dasharray="4 7" opacity=".5" stroke-linecap="round"/>' +
    '<g transform="translate(52,30) rotate(-16) scale(.72)">' +
      '<ellipse cx="62" cy="18" rx="62" ry="7" fill="var(--reg)"/>' +
      '<path d="M64 18 L32 -14 L48 -14 L92 14 Z" fill="var(--reg)"/>' +
      '<path d="M64 18 L32 50 L48 50 L92 22 Z" fill="var(--reg-shade)"/>' +
      '<path d="M12 18 L0 0 L10 0 L28 16 Z" fill="var(--reg)"/>' +
      '<path d="M12 18 L0 36 L10 36 L28 20 Z" fill="var(--reg-shade)"/>' +
    '</g>' +
    '<path d="M150 118 L246 56 L342 118 Z" fill="var(--reg-shade)" opacity=".55"/>' +
    '<path d="M226 118 L316 62 L406 118 Z" fill="var(--reg)" opacity=".7"/>' +
    '<g fill="var(--reg)">' +
      '<path d="M28 92 h88 l-7-11h-13v-11h-7v11h-34v-11h-7v11h-13z"/>' +
      '<rect x="40" y="92" width="9" height="40"/><rect x="95" y="92" width="9" height="40"/>' +
    '</g>' +
    '<rect y="126" width="400" height="6" fill="var(--reg)"/>'
};

/* 線性圖示。用 currentColor，尺寸由 CSS 控制。 */
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

/* 8 個地區的代表圖示（指南分頁用小圖章） */
ART.stamp = function (reg) {
  return '<span class="stamp" data-reg="' + reg + '"><svg viewBox="0 0 400 132" preserveAspectRatio="xMidYMid slice">'
    + (ART.scenes[reg] || ART.scenes.journey) + '</svg></span>';
};
