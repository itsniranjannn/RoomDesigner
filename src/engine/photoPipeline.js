/**
 * photoPipeline.js
 * The steps between cut-out photos and a design record, shared by the Create from photos dialog and by the
 * tests that guard the quality of what it builds (so the checks run the very code the app runs).
 *
 *   photos + masks -> normalized views -> design record (type, palette, traits) + a believable size
 */

import { normalizeView, segmentObject } from './hull.js';
import { dimensionsFromProportions } from './sheet.js';
import {
  buildDesign,
  typeCandidates,
  inferDimensions,
  isObliqueView,
  TYPICAL_WIDTH_CM,
} from './design.js';

export const VIEW_GRID = 96;

/**
 * Square, bounding-box-stretched views for each photo, with a second mask that leaves gaps open (slatted
 * backs, shelving) for the structure readers.
 * @param {Record<string, {rgba: Uint8ClampedArray, width: number, height: number}>} photos by slot id
 * @param {Record<string, {mask: Uint8Array}>} cuts the segmentation of each photo, by slot id
 * @param {number} tolerance background removal tolerance used for the open mask
 * @param {(slot: string) => string} [labelOf] names a slot in the error for a photo with no object found
 */
export function buildViews(photos, cuts, tolerance, labelOf = (slot) => slot) {
  const views = {};
  for (const [slot, photo] of Object.entries(photos)) {
    const norm = normalizeView(photo.rgba, cuts[slot].mask, photo.width, photo.height, VIEW_GRID);
    if (!norm)
      throw new Error(
        `No object found in the ${labelOf(slot).toLowerCase()} photo. Try a plainer background.`
      );
    const open = normalizeView(
      photo.rgba,
      segmentObject(photo.rgba, photo.width, photo.height, tolerance, { keepGaps: true }),
      photo.width,
      photo.height,
      VIEW_GRID
    );
    if (open) norm.open = open.mask;
    views[slot] = norm;
  }
  return views;
}

/**
 * Detects the type and reads the traits and colours; when no real size was entered, also picks the piece's
 * usual size for its type (what the photos cannot show is the usual for the type).
 * @param {object} views from buildViews
 * @param {{ dims: {widthCm:number, depthCm:number, heightCm:number}, sizeEdited?: boolean,
 *   forceType?: string, ratios?: object|null, partial?: object }} options
 * @returns {{ design: object, dims: object|null, candidates: object }} dims is null when it stays as given
 */
export function designFromViews(views, options) {
  const { dims, sizeEdited = false, forceType, ratios = null, partial = {} } = options;
  const hints = { ...partial };
  let result = buildDesign(views, dims, forceType || undefined, sizeEdited, hints);
  let nextDims = null;
  if (!sizeEdited && TYPICAL_WIDTH_CM[result.type]) {
    // A bed photographed from three quarters is not as wide as it is tall in the picture: keep its usual height
    const oblique =
      result.type === 'bed' && Object.keys(views).length === 1 && isObliqueView(views.front);
    const sizing = oblique ? { ...partial, widthPerHeight: null } : partial;
    const fit = (width) =>
      ratios
        ? dimensionsFromProportions(ratios, 'widthCm', width)
        : inferDimensions(result.type, sizing, width);
    let next = fit(TYPICAL_WIDTH_CM[result.type]);
    if (result.type === 'sofa') {
      // Count the seats at a full sofa width first; a one or two seater is then narrower
      const seats = buildDesign(views, next, result.type, true, hints).traits.seats;
      if (seats <= 2) next = fit(80 + seats * 35);
    }
    nextDims = next;
    result = buildDesign(views, next, result.type, true, hints);
  }
  const candidates = typeCandidates(views, dims, sizeEdited, hints, result.type);
  return { design: result, dims: nextDims, candidates };
}
