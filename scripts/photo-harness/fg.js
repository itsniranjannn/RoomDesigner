// Cuts a picture out with the scene cut-out and writes an overlay PNG (piece tinted, others dimmed) to look at.
// usage: node scripts/photo-harness/fg.js <repoRoot> <png> <out.png> [plain|scene|auto]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
import { writePng } from './pngout.js';
const [root, file, out, mode = 'auto'] = process.argv.slice(2);
const { extractForeground } = await import(pathToFileURL(path.join(root, 'src/engine/foreground.js')).href);
const img = shrink(decodePng(file), 1000);
const t = Date.now();
const r = extractForeground(img.rgba, img.width, img.height, { mode });
console.log(JSON.stringify({ ms: Date.now() - t, mode: r.mode, quality: +r.quality.toFixed(2), coverage: +r.coverage.toFixed(2), pieces: r.pieces.map((p) => ({ area: p.area, box: p.box })) }));
const o = new Uint8ClampedArray(img.rgba);
const palette = [[255, 60, 60], [60, 200, 60], [60, 120, 255], [255, 200, 0]];
for (let p = 0; p < r.mask.length; p++) {
  if (r.mask[p]) {
    const c = palette[Math.max(0, (r.pieceLabels[p] - 1)) % 4];
    for (let k = 0; k < 3; k++) o[p * 4 + k] = o[p * 4 + k] * 0.65 + c[k] * 0.35;
  } else for (let k = 0; k < 3; k++) o[p * 4 + k] *= 0.35;
}
writePng(out, o, img.width, img.height);
