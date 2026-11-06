import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file] = process.argv.slice(2);
const fg = await import(pathToFileURL(path.join(root, 'src/engine/foreground.js')).href);
const pp = await import(pathToFileURL(path.join(root, 'src/engine/photoPipeline.js')).href);
const img = shrink(decodePng(file), 480);
const cut = fg.extractForeground(img.rgba, img.width, img.height, {
  mode: 'scene',
  crop: { x0: 0.255, y0: 0.47, x1: 0.72, y1: 0.8 },
});
const m = pp.pieceMask(cut, 0);
let s = [0, 0, 0],
  n = 0;
for (let p = 0; p < m.length; p++)
  if (m[p]) {
    for (let k = 0; k < 3; k++) s[k] += img.rgba[p * 4 + k];
    n++;
  }
console.log(
  s.map((v) => Math.round(v / n)),
  n,
  img.width,
  img.height
);
// sample at sofa centre-top
const cx = Math.round(img.width * 0.4),
  cy = Math.round(img.height * 0.55);
const i = (cy * img.width + cx) * 4;
console.log([img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]]);
