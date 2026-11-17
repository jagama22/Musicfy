// Genera los iconos de Musicfy (barras de ecualizador sobre verde) sin dependencias externas.
// Uso: node dev/make-icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Barras en coordenadas normalizadas (0..1): x centro, alto.
const bars = [
  { x: 0.29, h: 0.26 },
  { x: 0.395, h: 0.46 },
  { x: 0.5, h: 0.62 },
  { x: 0.605, h: 0.4 },
  { x: 0.71, h: 0.52 },
];
const BAR_W = 0.07;

function inBars(u, v, scale = 1) {
  const cx = 0.5, cy = 0.5;
  u = cx + (u - cx) / scale;
  v = cy + (v - cy) / scale;
  for (const b of bars) {
    const x0 = b.x - BAR_W / 2, x1 = b.x + BAR_W / 2;
    const y0 = 0.5 - b.h / 2, y1 = 0.5 + b.h / 2;
    const r = BAR_W / 2;
    if (u < x0 || u > x1 || v < y0 || v > y1) continue;
    const ccy = Math.min(Math.max(v, y0 + r), y1 - r);
    if ((u - b.x) ** 2 + (v - ccy) ** 2 <= r * r) return true;
  }
  return false;
}

function render(size, { bg, fg, scale = 1, transparent = false }) {
  const SS = 3;
  return png(size, (x, y) => {
    let hits = 0;
    for (let i = 0; i < SS; i++)
      for (let j = 0; j < SS; j++) if (inBars((x + (i + 0.5) / SS) / size, (y + (j + 0.5) / SS) / size, scale)) hits++;
    const t = hits / (SS * SS);
    const base = transparent ? [fg[0], fg[1], fg[2], 0] : [...bg(x / size, y / size), 255];
    if (transparent) return [fg[0], fg[1], fg[2], Math.round(255 * t)];
    return [0, 1, 2].map((k) => Math.round(base[k] * (1 - t) + fg[k] * t)).concat(255);
  });
}

// Degradado verde (arriba claro → abajo algo más oscuro).
const green = (_u, v) => [Math.round(30 - 8 * v), Math.round(215 - 40 * v), Math.round(96 - 20 * v)];
const black = [12, 12, 12];

fs.writeFileSync(path.join(root, 'icon.png'), render(1024, { bg: green, fg: black }));
fs.writeFileSync(path.join(root, 'favicon.png'), render(48, { bg: green, fg: black }));
fs.writeFileSync(path.join(root, 'splash-icon.png'), render(512, { fg: [30, 215, 96], transparent: true }));
fs.writeFileSync(path.join(root, 'android-icon-foreground.png'), render(512, { fg: black, transparent: true, scale: 0.6 }));
fs.writeFileSync(path.join(root, 'android-icon-monochrome.png'), render(512, { fg: [255, 255, 255], transparent: true, scale: 0.6 }));
fs.writeFileSync(path.join(root, 'android-icon-background.png'), render(512, { bg: green, fg: green(0, 0), scale: 0.0001 }));
console.log('Iconos generados en', root);
