import { buildCase } from './corpus.js';
import { detectSheetViews } from '../../../src/engine/sheet.js';
import { fitBackground } from '../../../src/engine/hull.js';
const [type, seed] = process.argv.slice(2);
const c = buildCase({ kind: 'sheet', type, seed: Number(seed) });
console.log(c.fx, c.bg);
console.log(fitBackground(c.img.rgba, c.img.width, c.img.height).noise);
const d = detectSheetViews(c.img.rgba, c.img.width, c.img.height);
console.log(d.views.map((v) => JSON.stringify(v.box) + ' ' + v.area));
