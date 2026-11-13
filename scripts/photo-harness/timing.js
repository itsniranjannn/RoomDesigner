// How long the dialog's own steps take on each photo, stage by stage (route/split, cut-out, views, design).
// Each photo is read a few times and the fastest run is kept, so another busy program on the machine does not
// decide the numbers. usage: node scripts/photo-harness/timing.js <dir> [filter] [--runs 3] [--json file]
import fs from 'node:fs';
import path from 'node:path';
import { readLikeDialog } from './png.js';
import { dialogPhoto } from '../../src/engine/photoTestKit.js';
import { FIXTURE_FILES } from './fixtures.js';

const args = process.argv.slice(2);
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const [dir, filter = ''] = args.filter(
  (a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')
);
const runs = Number(opt('runs', 3));
const files = FIXTURE_FILES.filter((f) => f.includes(filter) && fs.existsSync(path.join(dir, f)));
const out = [];
for (const name of files) {
  const big = readLikeDialog(path.join(dir, name));
  let best = null;
  for (let r = 0; r < runs; r++) {
    const stages = {};
    let last = performance.now();
    let stage = 'start';
    const mark = (next) => {
      const now = performance.now();
      stages[stage] = (stages[stage] || 0) + (now - last);
      last = now;
      stage = next;
    };
    let type = '-';
    try {
      type = dialogPhoto(big, { onStage: mark }).design.type;
    } catch (err) {
      type = `ERR ${err.message.slice(0, 20)}`;
    }
    mark('end');
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    if (!best || total < best.total) best = { total, stages, type };
  }
  const s = best.stages;
  const show = (k) => `${k} ${(s[k] || 0).toFixed(0)}`;
  console.log(
    `${name.padEnd(32)} ${best.total.toFixed(0).padStart(6)} ms  ${['route', 'split', 'cut', 'views', 'design'].map(show).join('  ')}  ${best.type}`
  );
  out.push({ name, ms: Math.round(best.total), stages: s, type: best.type });
}
console.log(`total ${out.reduce((a, r) => a + r.ms, 0)} ms over ${out.length} photos`);
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(out, null, 1));
