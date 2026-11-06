import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [root] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const tp = await imp('testPhotos.js'),
  kit = await imp('photoTestKit.js');
for (const layout of ['sofaAndChairs', 'bedroomBed']) {
  const { cut, pieces } = kit.buildScene(tp.lifestyleScene(layout));
  console.log(
    layout,
    cut.pieces.map((p, i) => `${p.area}@${Math.round(p.cx)}:${pieces[i].design.type}`).join(' ')
  );
}
