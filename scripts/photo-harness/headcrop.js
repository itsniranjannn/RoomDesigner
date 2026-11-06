import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, crop] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const d = await imp('design.js'),
  hull = await imp('hull.js'),
  pp = await imp('photoPipeline.js'),
  fg = await imp('foreground.js');
const img = shrink(decodePng(file), 480);
const [x0, y0, x1, y1] = crop.split(',').map(Number);
const cut = fg.extractForeground(img.rgba, img.width, img.height, {
  mode: 'scene',
  crop: { x0, y0, x1, y1 },
});
const b = cut.pieces[0].box;
const mask = pp.pieceMask(cut, 0);
const v = hull.normalizeView(img.rgba, mask, img.width, img.height, 96);
console.log('asp', (b.width / b.height).toFixed(2), JSON.stringify(d.bedHead(v)));
console.log(JSON.stringify(d.crestOf(v)));
const sz = v.size;
const lines = [];
for (let y = 0; y < sz; y += 8) {
  let r = '';
  for (let x = 0; x < sz; x += 3) r += v.mask[y * sz + x] ? '#' : '.';
  lines.push(r);
}
console.log(lines.join(String.fromCharCode(10)));
