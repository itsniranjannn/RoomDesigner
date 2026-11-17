// Tiles the sweep's screenshots into contact sheets, so a whole run can be looked at in a few pictures.
//   node scripts/photo-harness/contact.js <shotsDir> <outDir> [plan|3d] [perSheet]
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
import { writePng } from './pngout.js';

const [dir, outDir, kind = '3d', per = '4'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(`-${kind}.png`))
  .sort();
const perSheet = Number(per);
// the room, without the app's bars down the sides
const CROP = { x: 260, y: 55, w: 1240, h: 870 };

const crop = (img) => {
  const w = Math.min(CROP.w, img.width - CROP.x);
  const h = Math.min(CROP.h, img.height - CROP.y);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((y + CROP.y) * img.width + x + CROP.x) * 4;
      const d = (y * w + x) * 4;
      out[d] = img.rgba[s];
      out[d + 1] = img.rgba[s + 1];
      out[d + 2] = img.rgba[s + 2];
      out[d + 3] = 255;
    }
  return { rgba: out, width: w, height: h };
};

let sheet = 0;
for (let i = 0; i < files.length; i += perSheet) {
  const group = files.slice(i, i + perSheet);
  const tiles = group.map((f) => shrink(crop(decodePng(path.join(dir, f))), 620));
  const cw = Math.max(...tiles.map((t) => t.width));
  const ch = Math.max(...tiles.map((t) => t.height));
  const cols = Math.min(2, tiles.length);
  const rows = Math.ceil(tiles.length / cols);
  const W = cols * cw;
  const H = rows * ch;
  const out = new Uint8ClampedArray(W * H * 4).fill(235);
  tiles.forEach((t, k) => {
    const ox = (k % cols) * cw;
    const oy = Math.floor(k / cols) * ch;
    for (let y = 0; y < t.height; y++)
      for (let x = 0; x < t.width; x++) {
        const s = (y * t.width + x) * 4;
        const d = ((y + oy) * W + x + ox) * 4;
        out[d] = t.rgba[s];
        out[d + 1] = t.rgba[s + 1];
        out[d + 2] = t.rgba[s + 2];
        out[d + 3] = 255;
      }
  });
  sheet++;
  const name = `sheet-${kind}-${String(sheet).padStart(2, '0')}.png`;
  writePng(path.join(outDir, name), out, W, H);
  console.log(`${name}  ${group.map((f) => f.replace(`-${kind}.png`, '')).join('  ')}`);
}
