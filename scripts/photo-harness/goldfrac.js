import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, crop] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const hull = await imp('hull.js'),
  pp = await imp('photoPipeline.js'),
  fg = await imp('foreground.js');
const img = shrink(decodePng(file), 480);
const [x0, y0, x1, y1] = crop.split(',').map(Number);
const cut = fg.extractForeground(img.rgba, img.width, img.height, {
  mode: 'scene',
  crop: { x0, y0, x1, y1 },
});
const v = hull.normalizeView(img.rgba, pp.pieceMask(cut, 0), img.width, img.height, 96);
const hsv = ([r, g, b]) => {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
};
for (const [name, y0b, y1b] of [
  ['band', 0.66, 0.95],
  ['all', 0, 1],
]) {
  let n = 0,
    dark = 0,
    bright = 0;
  for (let y = Math.floor(y0b * 96); y < Math.floor(y1b * 96); y++)
    for (let x = 0; x < 96; x++) {
      const p = y * 96 + x;
      if (!v.mask[p]) continue;
      n++;
      const [h, s2, vv] = hsv([v.rgb[p * 3], v.rgb[p * 3 + 1], v.rgb[p * 3 + 2]]);
      if (vv < 0.4 && h >= 5 && h <= 40) dark++;
      if (h >= 28 && h <= 52 && s2 >= 0.45 && vv >= 0.62) bright++;
    }
  console.log(name, 'dark', (dark / n).toFixed(2), 'bright', (bright / n).toFixed(3));
}
