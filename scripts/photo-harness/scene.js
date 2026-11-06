// Runs a lifestyle photo through the scene cut-out and prints the design read from each separate piece.
// usage: node scripts/photo-harness/scene.js <repoRoot> <png> [maxDim]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, maxDim = '1000'] = process.argv.slice(2);
const kit = await import(pathToFileURL(path.join(root, 'src/engine/photoTestKit.js')).href);
const st = await import(pathToFileURL(path.join(root, 'src/engine/stacked.js')).href);
let img = shrink(decodePng(file), Number(maxDim));
const part = process.argv[5] === '' ? undefined : process.argv[5];
if (part !== undefined) {
  const det = st.detectStackedPhotos(img.rgba, img.width, img.height);
  img = st.cropRegion(img.rgba, img.width, det.parts[Number(part)]);
}
const crop = process.env.CROP
  ? (([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }))(process.env.CROP.split(',').map(Number))
  : null;
const strokes = process.env.STROKES ? JSON.parse(process.env.STROKES) : {};
const { cut, pieces } = kit.buildScene(img, { crop, keep: strokes.keep, remove: strokes.remove });
import { writePng } from './pngout.js';
if (process.argv[6]) {
  const o = new Uint8ClampedArray(img.rgba);
  for (let p = 0; p < cut.mask.length; p++) {
    if (cut.mask[p]) {
      const c = [
        [255, 60, 60],
        [60, 200, 60],
        [60, 120, 255],
        [255, 200, 0],
      ][Math.max(0, cut.pieceLabels[p] - 1) % 4];
      for (let k = 0; k < 3; k++) o[p * 4 + k] = o[p * 4 + k] * 0.65 + c[k] * 0.35;
    } else for (let k = 0; k < 3; k++) o[p * 4 + k] *= 0.35;
  }
  writePng(process.argv[6], o, img.width, img.height);
}
console.log('quality', cut.quality.toFixed(2), 'pieces', cut.pieces.length);
pieces.forEach((p, i) =>
  console.log(
    i,
    cut.pieces[i].box.width + 'x' + cut.pieces[i].box.height,
    p.design.type,
    JSON.stringify(p.design.traits),
    JSON.stringify(p.design.palette),
    'cands',
    JSON.stringify(p.candidates)
  )
);
