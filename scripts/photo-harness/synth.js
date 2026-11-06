import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writePng } from './pngout.js';
const [root, layout = 'sofaAndChairs', out] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const tp = await imp('testPhotos.js'),
  fg = await imp('foreground.js');
const s = tp.lifestyleScene(layout);
const cut = fg.extractForeground(s.rgba, s.width, s.height, { mode: 'scene' });
console.log(
  'pieces',
  cut.pieces.map((p) => p.area + '@' + Math.round(p.cx)),
  'q',
  cut.quality.toFixed(2)
);
const o = new Uint8ClampedArray(s.rgba);
for (let p = 0; p < cut.mask.length; p++)
  if (cut.mask[p]) {
    const c = [
      [255, 60, 60],
      [60, 200, 60],
      [60, 120, 255],
      [255, 200, 0],
    ][Math.max(0, cut.pieceLabels[p] - 1) % 4];
    for (let k = 0; k < 3; k++) o[p * 4 + k] = o[p * 4 + k] * 0.5 + c[k] * 0.5;
  } else for (let k = 0; k < 3; k++) o[p * 4 + k] *= 0.4;
writePng(out, o, s.width, s.height);
