// Runs the real photos through the dialog's own steps (photoTestKit.dialogPhoto / dialogSheet: the cut-out the
// dialog shows, the views, the design record) and prints the type, the key traits and the colours of each.
// usage: node scripts/photo-harness/r2.js <dir> [name-filter] [--dump outDir] [--path photo|sheet|both]
//   --dump outDir  writes each slot's cut-out (photo with the background greyed) as a PNG there
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from './png.js';
import { writePng } from './pngout.js';
import { dialogPhoto, dialogSheet, shrinkTo } from '../../src/engine/photoTestKit.js';
import { threeQuarter } from '../../src/engine/oblique.js';
import { slabOver, measureTraits } from '../../src/engine/design.js';

const args = process.argv.slice(2);
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const [dir, filter = ''] = args.filter(
  (a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')
);
const dump = opt('dump');
const which = opt('path', 'both');
if (dump) fs.mkdirSync(dump, { recursive: true });

const FILES = [
  'r2-pink-channel-sofa.png',
  'r2-mustard-tub-chair-sheet.png',
  'r2-carved-sofa-three.png',
  'r2-office-desk-sheet.png',
  'r2-metal-bed-sheet.png',
  'r2-mirror-wardrobe-drawers.png',
  'r2-room-built-in-wardrobe.png',
  'r2-room-white-wardrobe.png',
  '5.png',
  '8.png',
  '10.png',
  'new-bed.png',
  'new-teal.png',
  'new-sofa.png',
];

const KEYS = {
  sofa: ['seats', 'longSeat', 'chan', 'step', 'roll', 'frame', 'cab', 'scat', 'trim', 'taper'],
  armchair: ['chan', 'roll', 'frame', 'cane'],
  'tub-chair': ['plan', 'base', 'wrap', 'tufted'],
  bed: ['head', 'metal', 'rails', 'casters', 'foot', 'pillows', 'legs', 'store', 'crest'],
  wardrobe: ['doors', 'mirror', 'drawers', 'dside', 'handle', 'upper', 'niche', 'fluted'],
  desk: ['ped', 'drawers', 'base', 'modesty'],
  cabinet: ['front', 'n', 'legs'],
};

const describe = (r) => {
  const d = r.design;
  const keys = KEYS[d.type] || Object.keys(d.traits);
  const traits = keys
    .filter((k) => d.traits[k] !== undefined)
    .map((k) => `${k}=${d.traits[k]}`)
    .join(' ');
  const pal = Object.entries(d.palette)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  const len = JSON.stringify(d).length;
  return `${d.type.padEnd(11)} ${traits} | ${pal} | ${len}ch | cands ${r.candidates?.list?.join(',')} agr ${r.candidates?.agreement?.toFixed(2)}`;
};

const grey = (photo, mask) => {
  const out = new Uint8ClampedArray(photo.width * photo.height * 4);
  for (let p = 0; p < mask.length; p++) {
    const keep = mask[p];
    for (let c = 0; c < 3; c++) out[p * 4 + c] = keep ? photo.rgba[p * 4 + c] : [214, 208, 196][c];
    out[p * 4 + 3] = 255;
  }
  return out;
};

for (const name of FILES) {
  if (filter && !name.includes(filter)) continue;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) continue;
  const big = shrinkTo(decodePng(file), 1800);
  for (const kind of which === 'both' ? ['photo', 'sheet'] : [which]) {
    let r;
    try {
      r = kind === 'photo' ? dialogPhoto(big) : dialogSheet(big);
    } catch (err) {
      console.log(`${name.padEnd(32)} ${kind.padEnd(5)} ERROR ${err.message}`);
      continue;
    }
    const extra =
      kind === 'sheet'
        ? ` views ${r.detection.views.length} slots ${r.slots.map((s) => s || '-').join(',')}`
        : ` route ${r.route} pieces ${r.segmented.front?.cut.pieces.length ?? '-'} mode ${r.segmented.front?.cut.mode ?? '-'}`;
    console.log(`${name.padEnd(32)} ${kind.padEnd(5)} ${describe(r)}${extra}`);
    if (args.includes('--cues')) {
      const f = r.views.front || r.views.back;
      if (f) {
        const wh = r.partial.widthPerHeight;
        const q = threeQuarter(f, wh);
        const sl = slabOver(f);
        console.log(
          `    cues wh ${wh?.toFixed(2)} gap ${measureTraits({ front: f }).gapFrac.toFixed(2)} slab ${sl.slab.toFixed(2)} first ${sl.first.toFixed(2)} top ${sl.top ? 1 : 0} open ${sl.open.toFixed(2)} ped ${sl.pedestal}`,
          q
            ? `3/4 yaw ${q.yaw.toFixed(0)} pitch ${q.pitch.toFixed(0)} ${q.wph.toFixed(2)}/${q.dph.toFixed(2)}`
            : ''
        );
      }
    }
    if (dump)
      for (const [slot, seg] of Object.entries(r.segmented)) {
        const photo = r.photos[slot];
        writePng(
          path.join(dump, `${name.replace(/\.png$/, '')}-${kind}-${slot}.png`),
          grey(photo, seg.mask),
          photo.width,
          photo.height
        );
      }
  }
}
