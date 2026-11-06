// Shows the cut-out of corpus cases: node cutview.js out.png kind seed type1,type2,... [view]
// Each cell: the photo with everything outside the chosen piece greyed out, pieces outlined by tint.
import { buildCase } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { writePng } from '../pngout.js';
const [out, kind, seed, types, view] = process.argv.slice(2);
const cells = [];
for (const type of types.split(',')) {
  const c = buildCase({ kind, type, seed: Number(seed), view });
  const photo = { rgba: c.img.rgba, width: c.img.width, height: c.img.height };
  const a = analysePhoto(photo, { allPieces: true });
  const rgba = new Uint8ClampedArray(photo.rgba);
  const tints = [
    [0, 0, 0],
    [255, 60, 60],
    [60, 160, 255],
    [60, 220, 90],
    [255, 200, 40],
  ];
  for (let p = 0; p < photo.width * photo.height; p++) {
    let k = -1;
    a.pieces.forEach((pc, i) => {
      if (pc.mask[p]) k = i;
    });
    if (k < 0) for (let q = 0; q < 3; q++) rgba[p * 4 + q] = rgba[p * 4 + q] * 0.25 + 160 * 0.75;
    else if (k > 0)
      for (let q = 0; q < 3; q++)
        rgba[p * 4 + q] = rgba[p * 4 + q] * 0.6 + tints[Math.min(k, 4)][q] * 0.4;
  }
  console.log(
    type,
    a.scene ? 'scene' : 'plain',
    a.pieces.map((p) => p.design?.type || p.error).join(','),
    'truth',
    c.pieces.map((p) => p.type).join(',')
  );
  cells.push({ rgba, w: photo.width, h: photo.height });
}
const cw = Math.max(...cells.map((c) => c.w));
const ch = Math.max(...cells.map((c) => c.h));
const cols = Math.min(4, cells.length);
const rows = Math.ceil(cells.length / cols);
const W = cols * cw;
const H = rows * ch;
const o = new Uint8ClampedArray(W * H * 4).fill(255);
cells.forEach((c, i) => {
  const ox = (i % cols) * cw;
  const oy = Math.floor(i / cols) * ch;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++)
      o.set(c.rgba.subarray((y * c.w + x) * 4, (y * c.w + x) * 4 + 4), ((oy + y) * W + ox + x) * 4);
});
writePng(out, o, W, H);
