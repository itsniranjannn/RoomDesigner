/**
 * Test kit: the dialog's steps for photos already in memory (cut-out, mirrored side, views, design record) and
 * for a product sheet (view detection, roles, crops), so tests can run any picture through them.
 */
import { segmentObject, maskCoverage, fitBackground } from './hull.js';
import {
  cropSheetView,
  estimateProportions,
  estimatePartialProportions,
  dimensionsFromProportions,
} from './sheet.js';
import { withMirroredSides } from './design.js';
import { buildViews, designFromViews, pieceMask, photoRoute, sheetSlots } from './photoPipeline.js';
import { extractForeground, shrinkRgba } from './foreground.js';

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
  const partial = estimatePartialProportions(cutouts);
  return {
    ...designFromViews(views, { dims, forceType, ratios, partial }),
    views,
    partial,
    dims0: dims,
  };
}

/** A product sheet through detection, view roles and crops, as the dialog's sheet splitter does. */
export function fromSheet(sheet) {
  const { detection, slots } = sheetSlots(sheet.rgba, sheet.width, sheet.height);
  const crops = detection.views.map((v) =>
    cropSheetView(sheet.rgba, sheet.width, sheet.height, detection, v)
  );
  const photos = {};
  detection.views.forEach((v, i) => {
    if (slots[i] && !photos[slots[i]]) photos[slots[i]] = crops[i];
  });
  return { slots, photos, detection };
}

/** Box-averaged downscale to at most `edge` pixels on the long side (what the dialog's canvas resize does). */
export const shrinkTo = (img, edge) => {
  const { rgba, width, height } = shrinkRgba(img.rgba, img.width, img.height, edge);
  return { rgba, width, height };
};

/**
 * The dialog's own steps from photos in slots to a design record: the cut-out it shows (extractForeground with the
 * dialog's threshold, the first piece of a room photo), the views, the proportions and the design.
 * @param {Record<string, {rgba: Uint8ClampedArray, width: number, height: number}>} slotPhotos at the dialog's size
 * @param {{ sheet?: boolean, forceType?: string, piece?: number }} [options]
 */
export function dialogBuild(slotPhotos, { sheet = false, forceType, piece = 0 } = {}) {
  let photos = {};
  for (const [slot, p] of Object.entries(slotPhotos)) photos[slot] = { ...p };
  if (Boolean(photos.left) !== Boolean(photos.right)) photos = withMirroredSides(photos);
  const noisy = Object.values(photos).some(
    (p) => fitBackground(p.rgba, p.width, p.height).noise > 1.5
  );
  const tolerance = noisy ? (sheet ? 35 : 60) : 16;
  const segmented = {};
  const cutouts = {};
  for (const [slot, p] of Object.entries(photos)) {
    const cut = extractForeground(p.rgba, p.width, p.height, {
      tolerance,
      mode: 'auto',
      framed: Boolean(p.framed),
    });
    const scene = cut.mode === 'scene';
    const mask =
      scene && cut.pieces.length
        ? pieceMask(cut, Math.min(piece, cut.pieces.length - 1))
        : cut.mask;
    segmented[slot] = { mask, coverage: maskCoverage(mask), scene, cut };
    cutouts[slot] = { mask, width: p.width, height: p.height };
  }
  const views = buildViews(photos, segmented, tolerance);
  const ratios = estimateProportions(cutouts);
  const partial = estimatePartialProportions(cutouts);
  const dims = { widthCm: 80, depthCm: 50, heightCm: 80 };
  const start = ratios ? dimensionsFromProportions(ratios, 'widthCm', dims.widthCm) : dims;
  const built = designFromViews(views, { dims: start, forceType, ratios, partial });
  return { ...built, views, segmented, photos, partial };
}

/**
 * A picture dropped on the Front photo slot, as the dialog's loadPhoto takes it: a picture of several photos on a
 * busy background is split and the straight-on one used; a product sheet of several views on a plain backdrop goes
 * through the sheet splitter; otherwise it is one photo. `big` is the picture at the dialog's reading size (1800).
 */
export function dialogPhoto(big, { slot = 'front', forceType, piece } = {}) {
  const route = photoRoute(big.rgba, big.width, big.height);
  if (route.kind === 'sheet') return { ...dialogSheet(big, { forceType }), route: 'sheet' };
  const photo =
    route.kind === 'stacked'
      ? { ...shrinkTo(route.parts[route.used], 480), framed: true }
      : shrinkTo(big, 480);
  return { ...dialogBuild({ [slot]: photo }, { forceType, piece }), route: route.kind };
}

/** A product sheet through the dialog's splitter and "Use these views", then built. */
export function dialogSheet(big, { forceType } = {}) {
  const { slots, detection, quarter } = sheetSlots(big.rgba, big.width, big.height);
  const photos = {};
  detection.views.forEach((v, i) => {
    const slot = slots[i];
    if (!slot || photos[slot]) return;
    photos[slot] = {
      ...shrinkTo(cropSheetView(big.rgba, big.width, big.height, detection, v), 480),
      fromSheet: true,
      ...(quarter && slot === 'front' ? { quarter } : {}),
    };
  });
  return { ...dialogBuild(photos, { sheet: true, forceType }), slots, detection };
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
