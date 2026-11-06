// Prints front-view features per type for clean singles: node feat.js [view]
import { corpusSpecs } from './corpus.js';
import { buildCase } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { measureTraits } from '../../../src/engine/design.js';
import { buildViews } from '../../../src/engine/photoPipeline.js';
import { estimatePartialProportions } from '../../../src/engine/sheet.js';
const view = process.argv[2] || 'front';
for (const s of corpusSpecs({ single: 5 }).filter(
  (s) => s.view === view || (view === 'front' && false)
)) {
}
const specs = corpusSpecs({ single: 12 }).filter((s) => s.view === view);
for (const s of specs) {
  const c = buildCase({ ...s, level: 'clean', bg: 'white', noShadow: !!process.env.NOSH });
  const photo = { rgba: c.img.rgba, width: c.img.width, height: c.img.height };
  const a = analysePhoto(photo);
  const p = a.pieces[0];
  const views = buildViews({ front: photo }, { front: { mask: p.mask } }, 16);
  const t = measureTraits(views);
  const part = estimatePartialProportions({
    front: { mask: p.mask, width: photo.width, height: photo.height },
  });
  console.log(
    s.type.padEnd(12),
    'wh',
    (part.widthPerHeight || 0).toFixed(2),
    'true',
    (c.dims.w / c.dims.h).toFixed(2),
    'gap',
    t.gapFrac.toFixed(2),
    'slab',
    t.slabFrac.toFixed(2),
    'got',
    p.design.type
  );
}
