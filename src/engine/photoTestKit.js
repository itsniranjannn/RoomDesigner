/**
 * Test kit: the dialog's steps for photos already in memory (cut-out, mirrored side, views, design record) and
 * for a product sheet (view detection, roles, crops), so tests can run any picture through them.
 */
import { segmentObject, maskCoverage, fitBackground } from './hull.js';
import {
  detectSheetViews,
  assignSheetViews,
  cropSheetView,
  chooseSideSlot,
  prepareCrop,
  estimateProportions,
  estimatePartialProportions,
  dimensionsFromProportions,
} from './sheet.js';
import { withMirroredSides } from './design.js';
import { buildViews, designFromViews, pieceMask } from './photoPipeline.js';
import { extractForeground } from './foreground.js';

/** What the dialog does with photos in slots: cut out, mirror a lone side, build views, read the design. */
export function build(slotPhotos, { tolerance, sheet = false, forceType } = {}) {
  let photos = {};
  for (const [slot, p] of Object.entries(slotPhotos)) photos[slot] = { ...p };
  if (Boolean(photos.left) !== Boolean(photos.right)) photos = withMirroredSides(photos);
  // The dialog's background threshold: a clean render takes a fine one, a noisy backdrop a coarser one
  const noisy = Object.values(photos).some(
    (p) => fitBackground(p.rgba, p.width, p.height).noise > 1.5
  );
  tolerance ??= noisy ? (sheet ? 35 : 60) : 16;
  const cuts = {};
  const cutouts = {};
  for (const [slot, p] of Object.entries(photos)) {
    const mask = segmentObject(p.rgba, p.width, p.height, tolerance);
    cuts[slot] = { mask, coverage: maskCoverage(mask) };
    cutouts[slot] = { mask, width: p.width, height: p.height };
  }
  const views = buildViews(photos, cuts, tolerance);
  // The dialog keeps its size in the photos' proportions once two or more photos fix them
  const ratios = estimateProportions(cutouts);
  const dims = ratios
    ? dimensionsFromProportions(ratios, 'widthCm', 80)
    : { widthCm: 80, depthCm: 50, heightCm: 80 };
  return designFromViews(views, {
    dims,
    forceType,
    ratios,
    partial: estimatePartialProportions(cutouts),
  });
}

/** A product sheet through detection, view roles and crops, as the dialog's sheet splitter does. */
export function fromSheet(sheet) {
  const detection = detectSheetViews(sheet.rgba, sheet.width, sheet.height);
  const slots = assignSheetViews(detection.views);
  const crops = detection.views.map((v) =>
    cropSheetView(sheet.rgba, sheet.width, sheet.height, detection, v)
  );
  const side = slots.indexOf('right');
  if (side >= 0) {
    const get = (slot) => {
      const i = slots.indexOf(slot);
      return i >= 0 ? prepareCrop(crops[i]) : null;
    };
    slots[side] = chooseSideSlot({ front: get('front'), top: get('top'), side: get('right') });
  }
  const photos = {};
  detection.views.forEach((v, i) => {
    if (slots[i] && !photos[slots[i]]) photos[slots[i]] = crops[i];
  });
  return { slots, photos, detection };
}

/**
 * A photo taken in a room: cut out with the scene cut-out, then each separate piece read as a front photo of its
 * own, the way the dialog does it.
 * @returns {{ cut: object, pieces: Array<{ design: object, dims: object|null, candidates: object }> }}
 */
export function buildScene(photo, { mode = 'scene', crop = null, keep, remove, forceType } = {}) {
  const cut = extractForeground(photo.rgba, photo.width, photo.height, {
    mode,
    crop,
    keep,
    remove,
  });
  const pieces = cut.pieces.map((_, i) => {
    const mask = pieceMask(cut, i);
    const views = buildViews(
      { front: photo },
      { front: { mask, scene: cut.mode === 'scene' } },
      16
    );
    return designFromViews(views, {
      dims: { widthCm: 80, depthCm: 50, heightCm: 80 },
      forceType,
      partial: estimatePartialProportions({
        front: { mask, width: photo.width, height: photo.height },
      }),
    });
  });
  return { cut, pieces };
}
