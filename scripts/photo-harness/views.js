// Prints what each view of a product sheet looks like to the engine: its box, symmetry, three-quarter reading
// (yaw, pitch, width and depth over height), space under it, and the role the splitter gives it.
// usage: node scripts/photo-harness/views.js <png> [more.png ...]
import path from 'node:path';
import { decodePng } from './png.js';
import { shrinkTo } from '../../src/engine/photoTestKit.js';
import { sheetSlots, sheetLooks } from '../../src/engine/photoPipeline.js';

for (const file of process.argv.slice(2)) {
  const big = shrinkTo(decodePng(file), 1800);
  const { detection, slots } = sheetSlots(big.rgba, big.width, big.height);
  const looks = sheetLooks(big.rgba, big.width, big.height, detection);
  console.log(path.basename(file), `${big.width}x${big.height}`, detection.views.length, 'views');
  detection.views.forEach((v, i) => {
    const l = looks[i];
    const q = l.oblique;
    console.log(
      `  #${i} ${v.box.w}x${v.box.h} role ${(slots[i] || '-').padEnd(5)} sym ${l.sym.toFixed(2)} legs ${l.legs.toFixed(2)}`,
      q
        ? `3/4 yaw ${q.yaw.toFixed(0)} pitch ${q.pitch.toFixed(0)} long ${q.longer.toFixed(2)} short ${q.shorter.toFixed(2)} front ${q.frontOn}`
        : 'straight'
    );
  });
}
