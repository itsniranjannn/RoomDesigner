import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const kit = await imp('photoTestKit.js'), d = await imp('design.js'), hull = await imp('hull.js'), pp = await imp('photoPipeline.js'), fg = await imp('foreground.js');
const img = shrink(decodePng(file), 1800);
const { photos } = kit.fromSheet(img);
for (const [slot, p] of Object.entries(photos)) {
  const q = shrink(p, 480);
  const mask = hull.segmentObject(q.rgba, q.width, q.height, 16);
  const v = hull.normalizeView(q.rgba, mask, q.width, q.height, 96);
  console.log(slot, JSON.stringify(d.crestOf(v)), JSON.stringify(d.bedHead(v)), 'asp', (hull.maskBounds(mask,q.width,q.height).width/hull.maskBounds(mask,q.width,q.height).height).toFixed(2));
}
