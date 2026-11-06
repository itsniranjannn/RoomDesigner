import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
import { writePng } from './pngout.js';
const [root, file, out] = process.argv.slice(2);
const fg = await import(pathToFileURL(path.join(root, 'src/engine/foreground.js')).href);
const img = shrink(decodePng(file), 1000);
const small = fg.shrinkRgba(img.rgba, img.width, img.height, 300);
for (const wallRule of [true, false]) {
  const c = fg.sceneCut(small, {}, { wallRule });
  const q = fg.cutQuality(small.rgba, c.mask, small.width, small.height);
  let a = 0; c.mask.forEach((v) => (a += v));
  console.log(wallRule, 'q', q.toFixed(2), 'cov', (a / c.mask.length).toFixed(2));
  const o = new Uint8ClampedArray(small.rgba);
  for (let p = 0; p < c.mask.length; p++) if (!c.mask[p]) for (let k = 0; k < 3; k++) o[p * 4 + k] *= 0.3;
  writePng(out + (wallRule ? '-A' : '-B') + '.png', o, small.width, small.height);
}
