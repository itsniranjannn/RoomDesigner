// Writes the scene cut's intermediate maps (saliency, background probability) as grey PNGs next to an output prefix.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
import { writePng } from './pngout.js';
const [root, file, prefix] = process.argv.slice(2);
const fg = await import(pathToFileURL(path.join(root, 'src/engine/foreground.js')).href);
const img = shrink(decodePng(file), 1000);
const small = fg.shrinkRgba(img.rgba, img.width, img.height, 300);
const r = fg.sceneCut(small);
const grey = (arr) => {
  const o = new Uint8ClampedArray(arr.length * 4);
  arr.forEach((v, i) => o.set([v * 255, v * 255, v * 255, 255], i * 4));
  return o;
};
writePng(prefix + '-sal.png', grey(r.saliency), small.width, small.height);
writePng(prefix + '-bg.png', grey(r.background), small.width, small.height);
writePng(prefix + '-wide.png', grey(r.wide), small.width, small.height);
