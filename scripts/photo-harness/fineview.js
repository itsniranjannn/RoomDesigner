// Writes the front view the detail readers see (the fine normalized grid) as a PNG, scaled up, and prints the
// lines found in a few bands. usage: node scripts/photo-harness/fineview.js <png> <out.png> [sheet|photo]
import { decodePng } from './png.js';
import { writePng } from './pngout.js';
import { dialogPhoto, dialogSheet, shrinkTo } from '../../src/engine/photoTestKit.js';
import { findLines } from '../../src/engine/design.js';
import { wardrobeDetails } from '../../src/engine/details.js';

wardrobeDetails.debug = (d) => console.log('wardrobe', JSON.stringify(d));

const [file, outFile, mode = 'sheet'] = process.argv.slice(2);
const big = shrinkTo(decodePng(file), 1800);
const r = mode === 'photo' ? dialogPhoto(big) : dialogSheet(big);
const v = (r.views.front || r.views.back).fine;
const s = v.size;
const k = 3;
const out = new Uint8ClampedArray(s * k * s * k * 4);
for (let y = 0; y < s * k; y++)
  for (let x = 0; x < s * k; x++) {
    const p = Math.floor(y / k) * s + Math.floor(x / k);
    const o = (y * s * k + x) * 4;
    const on = v.mask[p];
    out[o] = on ? v.rgb[p * 3] : 255;
    out[o + 1] = on ? v.rgb[p * 3 + 1] : 0;
    out[o + 2] = on ? v.rgb[p * 3 + 2] : 255;
    out[o + 3] = 255;
  }
writePng(outFile, out, s * k, s * k);
const fmt = (a) => a.map((x) => x.toFixed(2)).join(' ');
for (const [name, axis, region, w] of [
  ['vertical, upper band', 'x', [0.04, 0.08, 0.96, 0.4], 2],
  ['vertical, back', 'x', [0.06, 0.1, 0.94, 0.4], 4],
  ['level, left lower', 'y', [0.06, 0.42, 0.46, 0.97], 4],
  ['level, right lower', 'y', [0.54, 0.42, 0.94, 0.97], 4],
  ['level, left end', 'y', [0.02, 0.12, 0.22, 0.62], 4],
  ['level, right end', 'y', [0.78, 0.12, 0.98, 0.62], 4],
])
  console.log(name.padEnd(22), fmt(findLines(v, axis, region, w)));
console.log(JSON.stringify(r.design));
