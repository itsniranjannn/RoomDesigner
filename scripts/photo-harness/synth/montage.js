// Writes a contact sheet of corpus cases: node montage.js out.png kind view|- seed type1,type2,... [cut]
import { buildCase } from './corpus.js';
import { writePng } from '../pngout.js';
const [out, kind, view, seed, types] = process.argv.slice(2);
const list = types.split(',');
const cases = list.map((type) =>
  buildCase({ kind, type, seed: Number(seed), view: view === '-' ? undefined : view })
);
const cw = Math.max(...cases.map((c) => c.img.width));
const ch = Math.max(...cases.map((c) => c.img.height));
const cols = Math.min(4, cases.length);
const rows = Math.ceil(cases.length / cols);
const W = cols * cw;
const H = rows * ch;
const o = new Uint8ClampedArray(W * H * 4).fill(255);
cases.forEach((c, i) => {
  const ox = (i % cols) * cw;
  const oy = Math.floor(i / cols) * ch;
  for (let y = 0; y < c.img.height; y++)
    for (let x = 0; x < c.img.width; x++)
      o.set(
        c.img.rgba.subarray((y * c.img.width + x) * 4, (y * c.img.width + x) * 4 + 4),
        ((oy + y) * W + ox + x) * 4
      );
});
writePng(out, o, W, H);
