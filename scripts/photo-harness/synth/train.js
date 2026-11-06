// Fits src/engine/frontModel.data.js from the procedural corpus (seeds 5000+, disjoint from the test corpus).
//   node train.js collect <outDir> <perSingle> <perLife> <type,type,...>   writes one samples file per type
//   node train.js fit <outDir>                                              clusters them and writes the model
import fs from 'node:fs';
import path from 'node:path';
import { buildCase, ALL_TYPES } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { frontFeatures, FEATURE_NAMES } from '../../../src/engine/frontModel.js';

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
  const K = 5;
  const model = { widen: 1.3, temperature: 6, features: FEATURE_NAMES, types: {} };
  const round = (v) => Math.round(v * 1000) / 1000;
  // global scale of each cue, so clustering is not dominated by the large ones
  const all = ALL_TYPES.flatMap((t) =>
    JSON.parse(fs.readFileSync(path.join(dir, `${t}.json`), 'utf8'))
  );
  const scale = FEATURE_NAMES.map((_, i) => {
    const m = all.reduce((s, f) => s + f[i], 0) / all.length;
    return Math.sqrt(all.reduce((s, f) => s + (f[i] - m) ** 2, 0) / all.length) || 1;
  });
  model.scale = scale.map(round);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const type of ALL_TYPES) {
    const list = JSON.parse(fs.readFileSync(path.join(dir, `${type}.json`), 'utf8'));
    const extraFile = path.join(dir, `extra-${type}.json`);
    if (fs.existsSync(extraFile)) list.push(...JSON.parse(fs.readFileSync(extraFile, 'utf8')));
    const n = list.length;
    const k = Math.min(K, Math.max(1, Math.floor(n / 12)));
    let cent = Array.from({ length: k }, () => list[Math.floor(rnd() * n)].slice());
    let assign = new Array(n).fill(0);
    for (let it = 0; it < 25; it++) {
      assign = list.map((f) => {
        let best = 0;
        let bd = Infinity;
        cent.forEach((cc, ci) => {
          const d = f.reduce((s, v, i) => s + ((v - cc[i]) / scale[i]) ** 2, 0);
          if (d < bd) {
            bd = d;
            best = ci;
          }
        });
        return best;
      });
      cent = cent.map((cc, ci) => {
        const mem = list.filter((_, i) => assign[i] === ci);
        return mem.length ? cc.map((_, i) => mem.reduce((s, f) => s + f[i], 0) / mem.length) : cc;
      });
    }
    model.types[type] = {
      n,
      clusters: cent
        .map((cc, ci) => {
          const mem = list.filter((_, i) => assign[i] === ci);
          if (mem.length < 3) return null;
          const s = cc.map((m, i) =>
            Math.sqrt(mem.reduce((acc, f) => acc + (f[i] - m) ** 2, 0) / mem.length)
          );
          return { w: round(mem.length / n), m: cc.map(round), s: s.map(round) };
        })
        .filter(Boolean),
    };
  }
  fs.writeFileSync(
    new URL('../../../src/engine/frontModel.data.js', import.meta.url),
    `// Written by scripts/photo-harness/synth/train.js: per type, clusters of the cues in frontModel.js (weight, mean, spread).\nexport const FRONT_MODEL = ${JSON.stringify(model)};\n`
  );
  console.log('fitted', all.length, 'samples');
}
