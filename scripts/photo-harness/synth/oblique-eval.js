// How well single photos are read as three-quarter views: per corpus view, how often the ground-line V is found
// and how far the width and depth it reads are from the truth (log ratio).
// usage: node scripts/photo-harness/synth/oblique-eval.js [perType] [--list]
import { corpusSpecs, buildCase } from './corpus.js';
import { analysePhoto } from './evaluate.js';
import { threeQuarter } from '../../../src/engine/oblique.js';

const per = Number(process.argv[2]) || 7;
const list = process.argv.includes('--list');
const stats = {};
for (const spec of corpusSpecs({ single: per, sheet: 0, lifestyle: 0 })) {
  const c = buildCase(spec);
  let p;
  try {
    p = analysePhoto({ rgba: c.img.rgba, width: c.img.width, height: c.img.height }).pieces[0];
  } catch {
    continue;
  }
  if (!p || p.error) continue;
  let dbg = null;
  threeQuarter.debug = (x) => (dbg = x);
  const q = threeQuarter(p.views.front, p.partial.widthPerHeight);
  const { w, d, h } = c.dims;
  if (process.argv.includes('--sag') && dbg)
    console.log(
      spec.view.startsWith('three') ? 'TRUE ' : 'FALSE',
      spec.id.padEnd(30),
      'sags',
      dbg.sags.map((v) => v.toFixed(2)).join(' '),
      q ? 'kept' : 'dropped'
    );
  const st = (stats[spec.view] ||= { n: 0, hit: 0, ew: [], ed: [] });
  st.n++;
  if (!q) continue;
  st.hit++;
  st.ew.push(Math.log(q.longer / (Math.max(w, d) / h)));
  st.ed.push(Math.log(q.shorter / (Math.min(w, d) / h)));
  if (list)
    console.log(
      spec.view.startsWith('three') ? 'TRUE ' : 'FALSE',
      spec.id.padEnd(30),
      `yaw ${q.yaw.toFixed(0)} pitch ${q.pitch.toFixed(0)} long ${Math.log(q.longer / (Math.max(w, d) / h)).toFixed(2)} short ${Math.log(q.shorter / (Math.min(w, d) / h)).toFixed(2)}`
    );
}
const med = (a) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b[Math.floor(b.length / 2)].toFixed(2) : '-';
};
const mad = (a) =>
  a.length ? (a.reduce((x, y) => x + Math.abs(y), 0) / a.length).toFixed(2) : '-';
for (const [v, st] of Object.entries(stats))
  console.log(
    `${v.padEnd(7)} n ${st.n} read as 3/4 ${st.hit}  width err median ${med(st.ew)} mean|${mad(st.ew)}|  depth err median ${med(st.ed)} mean|${mad(st.ed)}|`
  );
