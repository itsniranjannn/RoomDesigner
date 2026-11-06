// Explains the ranking for one case: per-cue z-scores against the best cluster of the two chosen types.
// node explain.js kind type seed view|- typeA typeB
import { buildCase } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { frontFeatures, FEATURE_NAMES, scoreFront } from '../../../src/engine/frontModel.js';
import { FRONT_MODEL } from '../../../src/engine/frontModel.data.js';
const [kind, type, seed, view, a, b] = process.argv.slice(2);
const c = buildCase({ kind, type, seed: Number(seed), view: view === '-' ? undefined : view });
const an = analysePhoto({ rgba: c.img.rgba, width: c.img.width, height: c.img.height });
const p = an.pieces[0];
const f = frontFeatures(p.views.front, p.partial.widthPerHeight || 1);
const sc = scoreFront(f);
console.log(
  'ranked',
  sc.ranked
    .slice(0, 5)
    .map((t) => `${t}:${sc.prob[t].toFixed(2)}`)
    .join(' ')
);
for (const t of [a, b]) {
  const cl = FRONT_MODEL.types[t].clusters;
  let best = null;
  for (const c2 of cl) {
    const d = f.reduce(
      (s, v, i) => s + ((v - c2.m[i]) / Math.max(c2.s[i], 0.14 * FRONT_MODEL.scale[i])) ** 2,
      0
    );
    if (!best || d < best.d) best = { d, c2 };
  }
  console.log(t, 'nearest cluster dist', best.d.toFixed(1));
  console.log(
    FEATURE_NAMES.map(
      (n, i) => `${n}=${f[i].toFixed(2)}(${best.c2.m[i].toFixed(2)}±${best.c2.s[i].toFixed(2)})`
    ).join(' ')
  );
}
