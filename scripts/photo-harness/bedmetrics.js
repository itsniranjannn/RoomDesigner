import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, part] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const st = await imp('stacked.js'),
  fg = await imp('foreground.js'),
  d = await imp('design.js'),
  hull = await imp('hull.js'),
  pp = await imp('photoPipeline.js');
let img = shrink(decodePng(file), 1000);
if (part !== undefined)
  img = st.cropRegion(
    img.rgba,
    img.width,
    st.detectStackedPhotos(img.rgba, img.width, img.height).parts[+part]
  );
const cut = fg.extractForeground(img.rgba, img.width, img.height, { mode: 'scene' });
const mask = pp.pieceMask(cut, 0);
const v = hull.normalizeView(img.rgba, mask, img.width, img.height, 96);
const t = d.measureTraits({ front: v });
console.log({
  narrow: d.narrowTopFraction(v),
  gap: t.gapFrac,
  rise: t.rise,
  aspect: cut.pieces[0].box.width / cut.pieces[0].box.height,
  oblique: d.isObliqueView(v),
});
const s = v.size;
const rows = [];
for (let y = 0; y < s; y += 6) {
  let n = 0;
  for (let x = 0; x < s; x++) n += v.mask[y * s + x];
  rows.push(n);
}
console.log(rows.join(' '));
console.log(
  d.looksLikeBed(
    { front: v },
    { widthPerHeight: cut.pieces[0].box.width / cut.pieces[0].box.height }
  )
);
console.log('crest', JSON.stringify(d.crestOf(v)), 'head', JSON.stringify(d.bedHead(v)));
