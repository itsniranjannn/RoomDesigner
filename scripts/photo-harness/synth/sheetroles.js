// Prints, for corpus sheets, the roles the splitter gives each view next to the truth, with the looks it used.
// usage: node scripts/photo-harness/synth/sheetroles.js [type,type] [perType] [--dump dir]
import fs from 'node:fs';
import path from 'node:path';
import { corpusSpecs, buildCase } from './corpus.js';
import { sheetSlots, sheetLooks } from '../../../src/engine/photoPipeline.js';
import { writePng } from '../pngout.js';

const types =
  process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : null;
const per = Number(process.argv[3]) || 2;
const di = process.argv.indexOf('--dump');
const dump = di >= 0 ? process.argv[di + 1] : null;
if (dump) fs.mkdirSync(dump, { recursive: true });
let right = 0;
let total = 0;
for (const spec of corpusSpecs({ single: 0, sheet: per, lifestyle: 0 })) {
  if (types && !types.includes(spec.type)) continue;
  const c = buildCase(spec);
  const { rgba, width, height } = c.img;
  const { detection, slots } = sheetSlots(rgba, width, height, {
    looks: !process.argv.includes('--old'),
  });
  const looks = sheetLooks(rgba, width, height, detection);
  // the truth in reading order is c.expected when every view was found
  const truth = detection.views.length === c.nViews ? c.expected : null;
  const ok =
    truth &&
    truth.every((t, i) => {
      const s = slots[i];
      if (t === 'front') return s === 'front';
      if (t === 'top') return s === 'top';
      if (t === 'side') return s === 'right' || s === 'left';
      return !s || s === 'back';
    });
  total++;
  if (ok) right++;
  console.log(
    `${ok ? 'ok  ' : 'BAD '}${spec.id.padEnd(22)} truth ${truth ? truth.join(',') : `(${detection.views.length}/${c.nViews} views)`}  got ${slots.map((s) => s || '-').join(',')}  `,
    looks
      .map((l) => `[sym ${l.sym.toFixed(2)} legs ${l.legs.toFixed(2)}${l.oblique ? ' 3/4' : ''}]`)
      .join(' ')
  );
  if (dump && !ok) writePng(path.join(dump, `${spec.id}.png`), rgba, width, height);
}
console.log(`roles right ${right}/${total}`);
