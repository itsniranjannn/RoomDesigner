// Prints shape cues of single corpus photos per type (for calibrating rules): the aspect, the 3/4 reading, the
// flat-top cue and the space under the piece.
// usage: node scripts/photo-harness/synth/cues.js <type,type> [perType]
import { corpusSpecs, buildCase } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { threeQuarter } from '../../../src/engine/oblique.js';
import { slabOver, measureTraits } from '../../../src/engine/design.js';

const types = (process.argv[2] || '').split(',');
const per = Number(process.argv[3]) || 7;
for (const spec of corpusSpecs({ single: per, sheet: 0, lifestyle: 0 })) {
  if (!types.includes(spec.type)) continue;
  const c = buildCase(spec);
  let p;
  try {
    p = analysePhoto({ rgba: c.img.rgba, width: c.img.width, height: c.img.height }).pieces[0];
  } catch {
    continue;
  }
  if (!p || p.error) continue;
  const f = p.views.front;
  const wh = p.partial.widthPerHeight;
  const q = threeQuarter(f, wh);
  const sl = slabOver(f);
  const t = measureTraits({ front: f });
  console.log(
    spec.id.padEnd(30),
    `got ${p.design.type.padEnd(12)} wh ${wh.toFixed(2)} gap ${t.gapFrac.toFixed(2)} slab ${sl.slab.toFixed(2)} first ${sl.first.toFixed(2)} top ${sl.top ? 1 : 0} open ${sl.open.toFixed(2)} ped ${sl.pedestal}`,
    q ? `3/4 ${q.wph.toFixed(2)}/${q.dph.toFixed(2)}` : ''
  );
}
