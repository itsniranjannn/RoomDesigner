// Runs a picture through the Create from photos pipeline in node and prints the detected design as JSON.
// usage: node scripts/photo-harness/run.js <repoRoot> <png> [sheet | single:<viewIndex>:<slot>]
//   repoRoot  a checkout to test (this one, or a git worktree of an older commit, to compare)
//   sheet     split the picture into its views and use them all (default)
//   single    use one view of the sheet alone, as one photo in the given slot (front, right, top, ...)
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file, mode = 'sheet'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, 'src/engine', p)).href);
const sheet = await imp('sheet.js');
const hull = await imp('hull.js');
const design = await imp('design.js');
const img = shrink(decodePng(file), 1800);
const detection = sheet.detectSheetViews(img.rgba, img.width, img.height);
const out = { file: path.basename(file), views: detection.views.length };
if (detection.views.length < 1) {
  console.log(JSON.stringify(out));
  process.exit(0);
}
const crops = detection.views.map((v) =>
  sheet.cropSheetView(img.rgba, img.width, img.height, detection, v)
);
const slots = sheet.assignSheetViews(detection.views);
const prepared = (s) => {
  const i = slots.indexOf(s);
  return i >= 0 ? sheet.prepareCrop(crops[i]) : null;
};
const si = slots.indexOf('right');
if (si >= 0) {
  const side = sheet.prepareCrop(crops[si]);
  if (side)
    slots[si] = sheet.chooseSideSlot({ front: prepared('front'), top: prepared('top'), side });
}
let use = {};
if (mode === 'sheet')
  detection.views.forEach((v, i) => {
    if (slots[i] && !use[slots[i]]) use[slots[i]] = i;
  });
else {
  const [, i, s] = mode.split(':');
  use[s] = Number(i);
}
out.slots = slots;
out.use = use;
out.boxes = detection.views.map((v) => `${v.box.w}x${v.box.h}`);
let photos = {};
for (const [slot, i] of Object.entries(use))
  photos[slot] = { ...shrink(crops[i], 480), fromSheet: true };
if (design.withMirroredSides && Object.keys(photos).length === 1 && (photos.left || photos.right))
  photos = design.withMirroredSides(photos);
const noisy = Object.values(photos).some(
  (p) => hull.fitBackground(p.rgba, p.width, p.height).noise > 1.5
);
const tolerance = mode === 'sheet' ? (noisy ? 35 : 16) : noisy ? 60 : 16;
const seg = {},
  views = {},
  cut = {};
for (const [slot, p] of Object.entries(photos)) {
  seg[slot] = hull.segmentObject(p.rgba, p.width, p.height, tolerance);
  cut[slot] = { mask: seg[slot], width: p.width, height: p.height };
  const norm = hull.normalizeView(p.rgba, seg[slot], p.width, p.height, 96);
  if (!norm) {
    out.error = 'no object in ' + slot;
    console.log(JSON.stringify(out));
    process.exit(0);
  }
  const open = hull.normalizeView(
    p.rgba,
    hull.segmentObject(p.rgba, p.width, p.height, tolerance, { keepGaps: true }),
    p.width,
    p.height,
    96
  );
  if (open) norm.open = open.mask;
  views[slot] = norm;
}
const ratios = sheet.estimateProportions(cut);
const partial = sheet.estimatePartialProportions ? sheet.estimatePartialProportions(cut) : {};
let dims = { widthCm: 80, depthCm: 50, heightCm: 80 };
if (ratios) dims = sheet.dimensionsFromProportions(ratios, 'widthCm', dims.widthCm);
const hints = { ...partial };
let result = design.buildDesign(views, dims, undefined, false, hints);
if (design.TYPICAL_WIDTH_CM[result.type]) {
  const fit = (w) =>
    ratios
      ? sheet.dimensionsFromProportions(ratios, 'widthCm', w)
      : design.inferDimensions(result.type, partial, w);
  let next = fit(design.TYPICAL_WIDTH_CM[result.type]);
  if (result.type === 'sofa') {
    const seats = design.buildDesign(views, next, 'sofa', true, hints).traits.seats;
    if (seats <= 2) next = fit(80 + seats * 35);
  }
  dims = next;
  result = design.buildDesign(views, next, result.type, true, hints);
}
out.dims = dims;
out.tolerance = tolerance;
out.design = result;
out.proportions = ratios;
if (design.typeCandidates)
  out.candidates = design.typeCandidates(views, dims, false, hints, result.type);
console.log(JSON.stringify(out));
