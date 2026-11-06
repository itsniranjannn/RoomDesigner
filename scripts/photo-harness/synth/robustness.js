// Robustness harness: runs the procedural corpus through the pipeline and prints the confusion matrix and accuracy tables.
// usage: node scripts/photo-harness/synth/robustness.js [--single N] [--sheet N] [--lifestyle N] [--stacked N]
//          [--only type] [--kind kind] [--dump dir] [--json file] [--fails]
//   --dump dir   writes each failing case's photo as a PNG there (named kind-type-got.png)
import fs from 'node:fs';
import path from 'node:path';
import { corpusSpecs, ALL_TYPES } from './corpus.js';
import { runParallel, runFixtures } from './evaluate.js';
import { decodePng, shrink } from '../png.js';
import { writePng } from '../pngout.js';
import { setRuleTrust } from '../../../src/engine/design.js';
if (process.env.RULE_TRUST) setRuleTrust(Number(process.env.RULE_TRUST));

const args = process.argv.slice(2);
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const counts = {
  single: Number(opt('single', 6)),
  sheet: Number(opt('sheet', 2)),
  lifestyle: Number(opt('lifestyle', 3)),
  stacked: Number(opt('stacked', 0)),
};
let specs = corpusSpecs(counts);
if (opt('only')) specs = specs.filter((s) => s.type === opt('only'));
if (opt('kind')) specs = specs.filter((s) => s.kind === opt('kind'));
if (opt('view')) specs = specs.filter((s) => s.kind !== 'single' || s.view === opt('view'));
if (opt('level'))
  specs = specs.map((s) => ({
    ...s,
    level: opt('level'),
    bg: opt('level') === 'clean' && s.kind === 'single' ? 'white' : undefined,
  }));
const dump = opt('dump');
if (dump) fs.mkdirSync(dump, { recursive: true });

const t0 = Date.now();
const rows = await runParallel(specs, { keepPhotos: Boolean(dump) });
if (dump)
  for (const { run, sc } of rows)
    if (!sc.ok) {
      const c = run.photo;
      writePng(
        path.join(
          dump,
          `${run.spec.kind}-${run.spec.type}-${run.spec.seed}-as-${sc.got || 'error'}.png`
        ),
        new Uint8ClampedArray(c.rgba),
        c.width,
        c.height
      );
    }
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const group = (key) => {
  const m = new Map();
  for (const { sc } of rows) {
    const k = typeof key === 'function' ? key(sc) : sc[key];
    const g = m.get(k) || { n: 0, ok: 0, top3: 0 };
    g.n++;
    g.ok += sc.ok ? 1 : 0;
    g.top3 += sc.top3 ? 1 : 0;
    m.set(k, g);
  }
  return m;
};
console.log(`\n${rows.length} cases in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
const total = rows.filter((r) => r.sc.ok).length;
console.log(
  `overall: top-1 ${pct(total, rows.length)}  top-3 ${pct(rows.filter((r) => r.sc.top3).length, rows.length)}  errors ${rows.filter((r) => r.sc.error).length}`
);
for (const [k, g] of group('kind'))
  console.log(`  ${k.padEnd(10)} n=${g.n} top-1 ${pct(g.ok, g.n)} top-3 ${pct(g.top3, g.n)}`);
console.log('\nby view (single photos)');
for (const [k, g] of group((s) => (s.kind === 'single' ? s.view : null)))
  if (k) console.log(`  ${String(k).padEnd(8)} n=${g.n} top-1 ${pct(g.ok, g.n)}`);
console.log('\nper type (single / sheet / lifestyle / stacked top-1)');
for (const type of ALL_TYPES) {
  const cell = (kind) => {
    const list = rows.filter((r) => r.sc.type === type && r.sc.kind === kind);
    return list.length
      ? `${pct(list.filter((r) => r.sc.ok).length, list.length)}`.padStart(5)
      : '    -';
  };
  console.log(
    `  ${type.padEnd(12)} ${cell('single')} ${cell('sheet')} ${cell('lifestyle')} ${cell('stacked')}`
  );
}
console.log('\nconfusion (rows = truth, cols = detected; only mistakes)');
const conf = new Map();
for (const { sc } of rows)
  if (!sc.ok)
    conf.set(
      `${sc.type} -> ${sc.got || 'error'}`,
      (conf.get(`${sc.type} -> ${sc.got || 'error'}`) || 0) + 1
    );
for (const [k, v] of [...conf].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log('\ntraits');
const tr = {};
for (const { sc } of rows)
  for (const [k, v] of Object.entries(sc.traits || {})) {
    tr[k] ||= [0, 0];
    tr[k][1]++;
    tr[k][0] += v ? 1 : 0;
  }
for (const [k, [a, b]] of Object.entries(tr)) console.log(`  ${k.padEnd(10)} ${pct(a, b)} (${b})`);
const col = rows.filter((r) => r.sc.colour != null);
console.log(
  `  colour     ${pct(col.filter((r) => r.sc.colour).length, col.length)} (${col.length})`
);
const sheets = rows.filter((r) => r.run.kind === 'sheet' && r.run.views != null);
console.log(
  `\nsheets: views found exactly ${pct(sheets.filter((r) => r.run.views === r.run.expectedViews).length, sheets.length)}`
);
const singles = rows.filter((r) => r.run.falseSplit != null);
console.log(
  `false stacked splits: ${singles.filter((r) => r.run.falseSplit).length}/${singles.length}`
);
const life = rows.filter((r) => r.run.kind === 'lifestyle' && r.run.matches);
if (life.length) {
  const m = life.flatMap((r) => r.run.matches).filter((x) => x.iou >= 0.5);
  console.log(
    `lifestyle pieces matched: ${m.length}, type right ${pct(m.filter((x) => x.truth && x.type === x.truth.type).length, m.length)}`
  );
}
const lens = rows.map((r) => r.run.recordLen).filter(Boolean);
console.log(
  `record length max ${Math.max(...lens)} | round-trip ok ${pct(rows.filter((r) => r.run.roundTrip).length, rows.length)}`
);
if (args.includes('--fails'))
  for (const { run, sc } of rows)
    if (!sc.ok)
      console.log(
        `  FAIL ${run.spec.id} truth ${sc.type} got ${sc.got || sc.error} cands ${run.candidates?.list}`
      );
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(rows.map((r) => r.sc)));
{
  const life = rows.filter((r) => r.run.kind === 'lifestyle' && r.run.matches);
  const mainIou = life.map((r) => {
    const m = r.run.matches.find((x) => x.truth?.main);
    return {
      r,
      iou: m ? m.iou : 0,
      first: r.run.matches[0]?.truth?.main ? r.run.matches[0].iou : 0,
    };
  });
  const good = mainIou.filter((x) => x.first >= 0.7);
  console.log(
    `lifestyle cut: largest piece is the main one with IoU>=0.7 in ${pct(good.length, life.length)}; ` +
      `main piece found by any piece (IoU>=0.7) ${pct(mainIou.filter((x) => x.iou >= 0.7).length, life.length)}; ` +
      `type right when the cut is good ${pct(good.filter((x) => x.r.sc.ok).length, good.length)} (${good.length})`
  );
}

if (process.env.PHOTO_FIXTURES) {
  const dirIn = process.env.PHOTO_FIXTURES;
  console.log('real fixtures (PHOTO_FIXTURES)');
  for (const f of runFixtures(dirIn, {
    decodePng,
    shrink,
    exists: (n) => fs.existsSync(path.join(dirIn, n)),
  }))
    console.log(
      `  ${f.ok ? 'ok  ' : f.info ? 'info' : 'FAIL'} ${f.name.padEnd(22)} expect ${f.expect.padEnd(8)} got ${f.got} ${f.note || ''}`
    );
}

{
  // How honest is the dialog's "Looks like / not sure" signal? Accuracy by the agreement the dialog sees.
  const buckets = [0, 0.3, 0.45, 0.6, 0.75, 1.01];
  console.log('accuracy by the dialog confidence (agreement) for single photos and room photos');
  for (let i = 0; i + 1 < buckets.length; i++) {
    const list = rows.filter(
      (r) =>
        ['single', 'lifestyle'].includes(r.sc.kind) &&
        r.run.candidates &&
        r.run.candidates.agreement >= buckets[i] &&
        r.run.candidates.agreement < buckets[i + 1]
    );
    console.log(
      `  ${buckets[i].toFixed(2)}-${Math.min(1, buckets[i + 1]).toFixed(2)}  n=${String(list.length).padStart(3)}  right ${pct(list.filter((r) => r.sc.ok).length, list.length)}  in choices ${pct(list.filter((r) => r.sc.top3).length, list.length)}`
    );
  }
}
