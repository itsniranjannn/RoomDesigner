/**
 * photoPipeline.js
 * The steps between cut-out photos and a design record, shared by the Create from photos dialog and by the
 * tests that guard the quality of what it builds (so the checks run the very code the app runs).
 *
 *   photos + masks -> normalized views -> design record (type, palette, traits) + a believable size
 */

import { normalizeView, segmentObject, fitBackground, maskBounds } from './hull.js';
import { threeQuarter } from './oblique.js';
import {
  dimensionsFromProportions,
  detectSheetViews,
  assignSheetViews,
  cropSheetView,
  prepareCrop,
  chooseSideSlot,
} from './sheet.js';
import { extractForeground, backdropIsPlain, shrinkRgba } from './foreground.js';
import { detectStackedPhotos, cropRegion, symmetryScores, regionSimilarity } from './stacked.js';
import {
  DESIGN_TYPES,
  buildDesign,
  typeCandidates,
  inferDimensions,
  isObliqueView,
  threeQuarterProportions,
  measureTraits,
  TYPICAL_WIDTH_CM,
} from './design.js';

export const VIEW_GRID = 96;
const FINE_GRID = 192;

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
    // A finer copy for small details: handles, flutes, mirror frames, castors
    norm.fine = normalizeView(photo.rgba, cuts[slot].mask, photo.width, photo.height, FINE_GRID);
    // the proportions read from all the three-quarter views of the sheet the photo came from
    if (photo.quarter) norm.quarter = photo.quarter;
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
    // A three-quarter photo shows the front and a side at once: its outline is not the piece's width over its
    // height. Read as such it gives the piece's own width and depth (see oblique.js); a bed photographed from an
    // angle that cannot be read keeps its usual height
    const quarter = threeQuarterProportions(views, partial, result.type);
    const oblique =
      result.type === 'bed' && Object.keys(views).length === 1 && isObliqueView(views.front);
    let sizing = quarter
      ? { ...partial, ...quarter }
      : oblique
        ? { ...partial, widthPerHeight: null }
        : partial;
    // A carved bed in a bedroom photo has its side tables in the outline, which widens it by about a fifth
    if (result.type === 'bed' && result.traits.crest && sizing.widthPerHeight)
      sizing = { ...sizing, widthPerHeight: sizing.widthPerHeight * 0.82 };
    // An ornate sofa photographed from a little to the side and above looks taller than it is: its back stands
    // about a metre high whatever the photo's proportions say
    if (result.type === 'sofa' && result.traits.frame && sizing.widthPerHeight)
      sizing = { ...sizing, widthPerHeight: Math.max(sizing.widthPerHeight, 1.9) };
    const fit = (width) =>
      ratios
        ? dimensionsFromProportions(ratios, 'widthCm', width)
        : inferDimensions(result.type, sizing, width);
    let width = TYPICAL_WIDTH_CM[result.type];
    // A bed is about two metres long whatever its width: when the photos show a bed much longer than wide, it
    // is sized by its length, so a single bed is not built as wide as a double
    if (result.type === 'bed') {
      const dw = ratios
        ? ratios.depthCm / ratios.widthCm
        : sizing.depthPerHeight && sizing.widthPerHeight
          ? sizing.depthPerHeight / sizing.widthPerHeight
          : null;
      if (dw && 205 / dw < width) width = Math.round(Math.max(80, 205 / dw));
    }
    let next = fit(width);
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

/**
 * What each view of a sheet shows, for telling the views apart by more than their boxes: how left-right
 * symmetric its outline is (a straight front), whether it is a three-quarter view (see oblique.js) and how much
 * clear space there is under it (legs; a plan view shows none).
 */
export function sheetLooks(rgba, width, height, detection) {
  return detection.views.map((v) => {
    const crop = cropSheetView(rgba, width, height, detection, v);
    const small = shrinkRgba(crop.rgba, crop.width, crop.height, 240);
    const noisy = fitBackground(small.rgba, small.width, small.height).noise > 1.5;
    const mask = segmentObject(small.rgba, small.width, small.height, noisy ? 35 : 16);
    const view = normalizeView(small.rgba, mask, small.width, small.height, VIEW_GRID);
    if (!view) return { sym: 0, oblique: null, legs: 0 };
    const box = maskBounds(mask, small.width, small.height);
    const [sym] = symmetryScores([mask], [small]);
    return {
      sym,
      oblique: threeQuarter(view, box.width / box.height),
      legs: measureTraits({ front: view }).gapFrac,
    };
  });
}

/**
 * The views of a product sheet and the role of each (front, side, top, back), as the sheet splitter proposes
 * them: which side photo is which is decided with the other views.
 */
export function sheetSlots(rgba, width, height, { looks: useLooks = true } = {}) {
  const detection = detectSheetViews(rgba, width, height);
  const looks = useLooks ? sheetLooks(rgba, width, height, detection) : null;
  const slots = assignSheetViews(detection.views, looks);
  const sideIndex = slots.indexOf('right');
  if (sideIndex >= 0) {
    const crop = (slot) => {
      const i = slots.indexOf(slot);
      return i >= 0
        ? prepareCrop(cropSheetView(rgba, width, height, detection, detection.views[i]))
        : null;
    };
    const side = crop('right');
    if (side) slots[sideIndex] = chooseSideSlot({ front: crop('front'), top: crop('top'), side });
  }
  return { detection, slots, quarter: looks ? sheetQuarter(looks) : null };
}

/**
 * The piece's proportions from all the three-quarter views of a sheet together: each reading of one view is
 * rough, the readings of several views of one piece (from the left and from the right, from higher or lower)
 * average out. Readings far from the others are left out.
 * @returns {{ longer: number, shorter: number, n: number } | null} face lengths over the height
 */
export function sheetQuarter(looks) {
  const qs = looks.map((l) => l.oblique).filter(Boolean);
  if (qs.length < 2) return null;
  const mid = (key) => {
    const v = qs.map((q) => Math.log(q[key])).sort((a, b) => a - b);
    return v[Math.floor((v.length - 1) / 2)];
  };
  const [ml, ms] = [mid('longer'), mid('shorter')];
  // (with only two readings there is no telling which one is off: both count)
  const kept =
    qs.length < 3
      ? qs
      : qs.filter(
          (q) => Math.abs(Math.log(q.longer) - ml) < 0.4 && Math.abs(Math.log(q.shorter) - ms) < 0.6
        );
  if (kept.length < 2) return null;
  const geo = (key) => Math.exp(kept.reduce((a, q) => a + Math.log(q[key]), 0) / kept.length);
  return { longer: geo('longer'), shorter: geo('shorter'), n: kept.length };
}

/**
 * What a picture given as one photo is: one photo ('single'); several photos of the same piece on a busy
 * background split by a plain gutter or a hairline ('stacked', with the crops and the one to use: the main
 * photo of a collage, else the straight-on one); or a product sheet of several views on a plain backdrop
 * ('sheet', for the sheet splitter).
 * @returns {{ kind: 'single' } | { kind: 'sheet' } |
 *   { kind: 'stacked', parts: Array<{rgba, width, height}>, sym: number[], used: number }}
 */
export function photoRoute(rgba, width, height, { photoEdge = 480 } = {}) {
  const stacked = detectStackedPhotos(rgba, width, height);
  const backdrop = backdropIsPlain(rgba, width, height);
  const plain = backdrop.plain;
  // a studio sheet on a dark or slightly grainy backdrop: nearly plain all round its border
  const nearlyPlain = plain || (backdrop.share >= 0.88 && backdrop.noise <= 12);
  // A product sheet on white has its own splitter; photos with busy backgrounds are split here
  if (stacked && !plain && stacked.similarity >= 0.35) {
    // a collage can split again the other way (a big photo over two small ones side by side)
    const parts = stacked.parts.flatMap((part) => {
      const crop = cropRegion(rgba, width, part);
      const inner = detectStackedPhotos(crop.rgba, crop.width, crop.height);
      return inner && inner.axis !== stacked.axis && inner.similarity >= 0.35
        ? inner.parts.map((p) => cropRegion(crop.rgba, crop.width, p))
        : [crop];
    });
    const small = parts.map((c) => shrinkRgba(c.rgba, c.width, c.height, photoEdge));
    // The straight-on view is the most left-right symmetric outline
    const masks = small.map((img) => {
      const cut = extractForeground(img.rgba, img.width, img.height, {
        mode: 'scene',
        framed: true,
      });
      return cut.pieces.length ? pieceMask(cut, 0) : cut.mask;
    });
    const sym = symmetryScores(masks, small);
    // One photo far bigger than the others is the main picture (the small ones show other colours or details);
    // among photos of one size the straight-on view is the most left-right symmetric outline
    const area = parts.map((p) => p.width * p.height);
    const big = area.indexOf(Math.max(...area));
    const main = area.every((a, i) => i === big || a * 1.6 <= area[big]);
    return { kind: 'stacked', parts, sym, used: main ? big : sym.indexOf(Math.max(...sym)) };
  }
  if (nearlyPlain) {
    // A product sheet on a plain backdrop given as one photo: several views of one piece (alike in colour and
    // drawn at one scale), or one view beside a bigger picture the splitter does not take for a view (the
    // piece with its doors open): the sheet splitter reads it
    const { views } = detectSheetViews(rgba, width, height);
    const box = (v) => ({ x: v.box.x, y: v.box.y, w: v.box.w, h: v.box.h });
    if (views.length >= 2) {
      const [a, b] = [...views].sort((p, q) => q.area - p.area);
      const sameScale = Math.abs(Math.log(a.box.h / b.box.h)) < 0.3 || views.length >= 3;
      // three views or more of about one size (a front, a side, a plan and a three-quarter view of one piece)
      // are a sheet whatever their colours: the plan view shows other parts than the front
      const sizes = [...views]
        .sort((p, q) => q.area - p.area)
        .slice(0, 4)
        .map((v) => v.box.w * v.box.h);
      const grid = views.length >= 3 && Math.max(...sizes) <= Math.min(...sizes) * 2.6;
      // (on a backdrop that is only nearly plain, only a sheet of three views or more is taken for one)
      if (!plain && views.length < 3) return { kind: 'single' };
      // alike: the same colours (for grey or black pieces, which have no hue to compare, the same mean tone)
      const bg = fitBackground(rgba, width, height);
      const tone = (v) => {
        const sum = [0, 0, 0];
        let n = 0;
        for (let y = v.box.y; y < v.box.y + v.box.h; y += 2)
          for (let x = v.box.x; x < v.box.x + v.box.w; x += 2) {
            const i = (y * width + x) * 4;
            const ref = bg.at(x / width, y / height);
            if (Math.hypot(rgba[i] - ref[0], rgba[i + 1] - ref[1], rgba[i + 2] - ref[2]) < 40)
              continue;
            for (let c = 0; c < 3; c++) sum[c] += rgba[i + c];
            n++;
          }
        return sum.map((s) => s / Math.max(1, n));
      };
      const [ta, tb] = [tone(a), tone(b)];
      const alike =
        regionSimilarity(rgba, width, box(a), box(b)) >= 0.5 ||
        Math.hypot(ta[0] - tb[0], ta[1] - tb[1], ta[2] - tb[2]) < 30;
      if (sameScale && (alike || grid)) return { kind: 'sheet' };
    } else if (views.length === 1 && plain) {
      const sm = shrinkRgba(rgba, width, height, 480);
      const cut = maskBounds(segmentObject(sm.rgba, sm.width, sm.height, 16), sm.width, sm.height);
      const k = sm.width / width;
      const v = views[0].box;
      const apart =
        cut && (cut.minX > (v.x + v.w) * k || cut.maxX < v.x * k || cut.minY > (v.y + v.h) * k);
      if (apart) return { kind: 'sheet' };
    }
  }
  return { kind: 'single' };
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
