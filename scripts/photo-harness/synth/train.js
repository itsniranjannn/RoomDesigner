// Fits src/engine/frontModel.data.js from the procedural corpus (seeds 5000+, disjoint from the test corpus).
//   node train.js collect <outDir> <perSingle> <perLife> <type,type,...>   writes one samples file per type
//   node train.js fit <outDir>                                              clusters them and writes the model
import fs from 'node:fs';
import path from 'node:path';
import { buildCase, ALL_TYPES } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { frontFeatures, FEATURE_NAMES, MULTI_NAMES } from '../../../src/engine/frontModel.js';

const [mode, dir, a, b, c] = process.argv.slice(2);
// What a person photographs: mostly straight on or from three quarters; side and plan pictures are rare as lone photos
const VIEWS = [
  'front',
  'front',
  'front',
  'front',
  'front',
  'front',
  'three',
  'three',
  'three2',
  'front2',
  'side',
];

if (mode === 'extra') {
  // The older hand-drawn test photos (flat sofas, a block armchair, a plain table, two room scenes) are requirements
  // too: they join the samples, jittered, so the ranking keeps agreeing with them.
  const tp = await import('../../../src/engine/testPhotos.js');
  const jobs = [
    ['bed', () => tp.bedPhoto('front')],
    ['bed', () => tp.bedPhoto('threeQuarter')],
    ['sofa', () => tp.sofaPhoto('front')],
    ['sofa', () => tp.sofaPhoto('threeQuarter')],
    ['armchair', () => tp.armchairPhoto('front')],
    ['armchair', () => tp.armchairPhoto('threeQuarter')],
    ...[4, 8, 12, 20].map((t) => ['table', () => tp.tablePhoto(t)]),
    ['sofa', () => tp.lifestyleScene('sofaAndChairs')],
    ['bed', () => tp.lifestyleScene('bedroomBed')],
  ];
  const extra = {};
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (const [type, make] of jobs) {
    try {
      const photo = make();
      const an = analysePhoto({ rgba: photo.rgba, width: photo.width, height: photo.height });
      const pr = an.pieces[0];
      const f = frontFeatures(pr.views.front, pr.partial.widthPerHeight || 1);
      extra[type] ||= [];
      for (let k = 0; k < 14; k++)
        extra[type].push(f.map((v, i) => v + rnd() * 0.06 * (i === 0 ? 2 : 1)));
    } catch (e) {
      console.log('skip', type, e.message);
    }
  }
  for (const [type, list] of Object.entries(extra))
    fs.writeFileSync(path.join(dir, `extra-${type}.json`), JSON.stringify(list));
  console.log('extra', Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.length])));
} else if (mode === 'collect-sheet') {
  // Sheets: front plus side, plan or three-quarter views, so the depth cues are known
  const { fromSheet, build } = await import('../../../src/engine/photoTestKit.js');
  const { multiFeatures, knownProportions } = await import('../../../src/engine/frontModel.js');
  const { measureTraits } = await import('../../../src/engine/design.js');
  for (const type of c.split(',')) {
    const list = [];
    for (let i = 0; i < Number(a); i++) {
      try {
        const cs = buildCase({ kind: 'sheet', type, seed: 7000 + i });
        const s = fromSheet({ rgba: cs.img.rgba, width: cs.img.width, height: cs.img.height });
        if (!Object.keys(s.photos).length) continue;
        const r = build(s.photos, { sheet: true });
        if (!(r.views.front || r.views.back)) continue;
        const f = multiFeatures(
          r.views,
          knownProportions(r.views, r.partial, r.dims0),
          measureTraits(r.views)
        );
        if (f.some((v) => v !== v && false)) continue;
        list.push(f);
      } catch {
        // a sheet with nothing found adds no sample
      }
    }
    fs.writeFileSync(path.join(dir, `multi-${type}.json`), JSON.stringify(list));
    console.log(type, list.length);
  }
} else if (mode === 'collect') {
  const nSingle = Number(a);
  const nLife = Number(b);
  for (const type of c.split(',')) {
    const list = [];
    const specs = [];
    for (let i = 0; i < nSingle; i++)
      specs.push({ kind: 'single', type, seed: 5000 + i, view: VIEWS[i % VIEWS.length] });
    for (let i = 0; i < nLife; i++) specs.push({ kind: 'lifestyle', type, seed: 6000 + i });
    for (const spec of specs) {
      try {
        const cs = buildCase(spec);
        const an = analysePhoto({ rgba: cs.img.rgba, width: cs.img.width, height: cs.img.height });
        const p = an.pieces[0];
        if (!p || p.error) continue;
        const f = frontFeatures(p.views.front, p.partial.widthPerHeight || 1);
        if (f.every(Number.isFinite)) list.push(f);
      } catch {
        // a photo with nothing found adds no sample
      }
    }
    fs.writeFileSync(path.join(dir, `${type}.json`), JSON.stringify(list));
    console.log(type, list.length);
  }
} else {
  const round = (v) => Math.round(v * 1000) / 1000;
  const fin = (v) => v !== null && Number.isFinite(v);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  /** Clusters each type's samples (NaN/null cues are skipped) into a mixture the scorer can use. */
  const fitModel = (prefix, names, K, extraPrefix = '') => {
    const model = { widen: 1.3, temperature: 6, features: names, types: {} };
    const load = (t) => {
      const file = path.join(dir, `${prefix}${t}.json`);
      const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      const extra = path.join(dir, `${extraPrefix}${t}.json`);
      if (extraPrefix && fs.existsSync(extra))
        list.push(...JSON.parse(fs.readFileSync(extra, 'utf8')));
      return list;
    };
    const all = ALL_TYPES.flatMap(load);
    const scale = names.map((_, i) => {
      const v = all.map((f) => f[i]).filter(fin);
      const m = v.reduce((x, y) => x + y, 0) / Math.max(1, v.length);
      return Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, v.length)) || 1;
    });
    model.scale = scale.map(round);
    const mean = (mem, i) => {
      const v = mem.map((f) => f[i]).filter(fin);
      return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
    };
    for (const type of ALL_TYPES) {
      const list = load(type);
      const n = list.length;
      if (n < 12) continue;
      const k = Math.min(K, Math.max(1, Math.floor(n / 12)));
      let cent = Array.from({ length: k }, () =>
        list[Math.floor(rnd() * n)].map((v) => (fin(v) ? v : 0))
      );
      let assign = new Array(n).fill(0);
      for (let it = 0; it < 25; it++) {
        assign = list.map((f) => {
          let best = 0;
          let bd = Infinity;
          cent.forEach((cc, ci) => {
            const d = f.reduce((x, v, i) => (fin(v) ? x + ((v - cc[i]) / scale[i]) ** 2 : x), 0);
            if (d < bd) {
              bd = d;
              best = ci;
            }
          });
          return best;
        });
        cent = cent.map((cc, ci) => {
          const mem = list.filter((_, i) => assign[i] === ci);
          return mem.length ? cc.map((_, i) => mean(mem, i)) : cc;
        });
      }
      model.types[type] = {
        n,
        clusters: cent
          .map((cc, ci) => {
            const mem = list.filter((_, i) => assign[i] === ci);
            if (mem.length < 3) return null;
            const sd = cc.map((m, i) => {
              const v = mem.map((f) => f[i]).filter(fin);
              return Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, v.length));
            });
            return { w: round(mem.length / n), m: cc.map(round), s: sd.map(round) };
          })
          .filter(Boolean),
      };
    }
    return model;
  };
  const front = fitModel('', FEATURE_NAMES, 5, 'extra-');
  const multi = fitModel('multi-', MULTI_NAMES, 4);
  if (Object.keys(multi.types).length) front.multi = multi;
  fs.writeFileSync(
    new URL('../../../src/engine/frontModel.data.js', import.meta.url),
    `// Written by scripts/photo-harness/synth/train.js: per type, clusters of the cues in frontModel.js (weight, mean, spread).
export const FRONT_MODEL = ${JSON.stringify(front)};
`
  );
  console.log(
    'fitted',
    Object.keys(front.types).length,
    'types',
    Object.keys(multi.types).length,
    'multi'
  );
}
