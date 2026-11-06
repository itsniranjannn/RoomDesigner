import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, crop, part] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const kit = await imp('photoTestKit.js'),
  d = await imp('design.js'),
  st = await imp('stacked.js');
let img = shrink(decodePng(file), 1000);
if (part)
  img = st.cropRegion(
    img.rgba,
    img.width,
    st.detectStackedPhotos(img.rgba, img.width, img.height).parts[+part]
  );
const [x0, y0, x1, y1] = (crop || '0,0,1,1').split(',').map(Number);
const { pieces } = kit.buildScene(img, { crop: { x0, y0, x1, y1 } });
const rec = d.sanitizeDesign(pieces[0].design);
console.log(rec.type, JSON.stringify(rec).length, JSON.stringify(rec));
