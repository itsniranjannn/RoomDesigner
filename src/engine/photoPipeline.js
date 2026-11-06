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
  DESIGN_TYPES,
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
    // A cut-out of a real room has no plain backdrop to read gaps from: its own mask is the open one
    const openMask = cuts[slot].scene
      ? cuts[slot].mask
      : segmentObject(photo.rgba, photo.width, photo.height, tolerance, { keepGaps: true });
    const open = normalizeView(photo.rgba, openMask, photo.width, photo.height, VIEW_GRID);
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
    let sizing = oblique ? { ...partial, widthPerHeight: null } : partial;
    // A carved bed in a bedroom photo has its side tables in the outline, which widens it by about a fifth
    if (result.type === 'bed' && result.traits.crest && sizing.widthPerHeight)
      sizing = { ...sizing, widthPerHeight: sizing.widthPerHeight * 0.82 };
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

/** The mask of one separate piece found by extractForeground (pieces are numbered largest first). */
export function pieceMask(cut, index) {
  const piece = cut.pieces[index];
  if (!piece) return null;
  const out = new Uint8Array(cut.mask.length);
  for (let p = 0; p < out.length; p++) if (cut.pieceLabels[p] === piece.id) out[p] = 1;
  return out;
}

/** A friendly name for a piece read from a photo ("3-seater sofa", "armchair", "coffee table"). */
export function pieceLabel(design) {
  const label = DESIGN_TYPES.find((t) => t.id === design.type)?.label || 'furniture';
  if (design.type === 'sofa') {
    const seats = design.traits?.seats || 3;
    return seats <= 1 ? 'armchair' : seats === 2 ? 'loveseat' : `${seats}-seater sofa`;
  }
  return design.type === 'lounge' ? 'lounge chair' : label.toLowerCase();
}

/**
 * Pieces of a photo that are copies of each other (the pair of armchairs): about the same shape and size and
 * the same colours. Returns groups of piece indexes, each group building once with a count.
 * @param {{rgba: Uint8ClampedArray, width: number}} photo
 * @param {{ pieces: Array<{area:number, box:{width:number,height:number}}>, pieceLabels: Int32Array }} cut
 * @param {number[]} indexes the pieces to group
 */
export function groupPieces(photo, cut, indexes) {
  const stats = indexes.map((i) => {
    const piece = cut.pieces[i];
    const sum = [0, 0, 0];
    let n = 0;
    for (let p = 0; p < cut.pieceLabels.length; p += 3)
      if (cut.pieceLabels[p] === piece.id) {
        for (let c = 0; c < 3; c++) sum[c] += photo.rgba[p * 4 + c];
        n++;
      }
    return {
      i,
      aspect: piece.box.width / piece.box.height,
      area: piece.area,
      mean: sum.map((v) => v / Math.max(1, n)),
    };
  });
  const groups = [];
  for (const s of stats) {
    const home = groups.find((g) => {
      const t = g.stat;
      return (
        Math.abs(Math.log(s.aspect / t.aspect)) < 0.18 &&
        Math.abs(Math.log(s.area / t.area)) < 0.3 &&
        Math.hypot(s.mean[0] - t.mean[0], s.mean[1] - t.mean[1], s.mean[2] - t.mean[2]) < 40
      );
    });
    if (home) home.indexes.push(s.i);
    else groups.push({ stat: s, indexes: [s.i] });
  }
  return groups.map((g) => ({ indexes: g.indexes, count: g.indexes.length }));
}
