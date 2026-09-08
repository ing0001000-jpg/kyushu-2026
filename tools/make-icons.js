#!/usr/bin/env node
/* 用 Node 內建 zlib 產生 PNG 圖示，不需要 npm install。
   圖案：暖橘底 + 白色鳥居剪影。 */
var zlib = require('zlib'), fs = require('fs'), path = require('path');

function crc32(buf) {
  var t = crc32.t || (crc32.t = (function () {
    var tb = [];
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
    return tb;
  })());
  var c = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  var td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  var raw = Buffer.alloc(h * (1 + w * 4));
  for (var y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

function draw(S) {
  var buf = Buffer.alloc(S * S * 4);
  function px(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    var i = (y * S + x) * 4;
    var sa = a / 255, da = buf[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa);
    buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
    buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
    buf[i + 3] = Math.round(oa * 255);
  }
  function rect(x0, y0, x1, y1, r, g, b) {
    for (var y = Math.round(y0); y < Math.round(y1); y++)
      for (var x = Math.round(x0); x < Math.round(x1); x++) px(x, y, r, g, b, 255);
  }
  /* 背景：垂直漸層 #cf4229 -> #8a2716 */
  for (var y = 0; y < S; y++) {
    var t = y / (S - 1);
    var r = Math.round(0xcf + (0x8a - 0xcf) * t),
        g = Math.round(0x42 + (0x27 - 0x42) * t),
        b = Math.round(0x29 + (0x16 - 0x29) * t);
    for (var x = 0; x < S; x++) px(x, y, r, g, b, 255);
  }
  /* 鳥居（白） */
  var u = S / 32, W = 255;
  rect(4.5 * u, 8 * u, 27.5 * u, 10 * u, W, W, W);       // 上笠木
  rect(6 * u, 11.2 * u, 26 * u, 12.8 * u, W, W, W);      // 島木/貫
  rect(8.5 * u, 8 * u, 11.5 * u, 26 * u, W, W, W);       // 左柱
  rect(20.5 * u, 8 * u, 23.5 * u, 26 * u, W, W, W);      // 右柱
  rect(14.8 * u, 9.5 * u, 17.2 * u, 12 * u, W, W, W);    // 中央額束
  return buf;
}

var dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
[192, 512].forEach(function (S) {
  var f = path.join(dir, 'icon-' + S + '.png');
  fs.writeFileSync(f, png(S, S, draw(S)));
  console.log('wrote ' + f + '  (' + fs.statSync(f).size + ' bytes)');
});
