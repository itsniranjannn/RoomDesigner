import { runCase } from './evaluate.js';
import { buildCase } from './corpus.js';
import { writePng } from '../pngout.js';
const [kind, type, seed, out] = process.argv.slice(2);
const spec = { kind, type, seed: Number(seed) };
const r = runCase(spec);
console.log(r.error, r.views, r.expectedViews, r.type);
const c = buildCase(spec);
if (out) writePng(out, c.img.rgba, c.img.width, c.img.height);
