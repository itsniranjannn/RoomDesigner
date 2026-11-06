/**
 * design.js
 * Turns the photos of a piece into a small "design" record (type, palette, a few traits) that the normal
 * catalog model builders render, so photo-made furniture looks like the rest of the catalog. The record is
 * tiny JSON, so it can be stored, recoloured and shared like any other setting.
 *
 *   design = { v: 1, type, palette: { body, accent, ... }, traits: { ... } }
 *
 * Views come from hull.normalizeView: square grids with the object stretched to the bounding box,
 * { mask, rgb, size }, one per slot (front, back, left, right, top).
 */

import { rankFront, rankMulti, knownProportions } from './frontModel.js';

export const DESIGN_TYPES = [
  { id: 'bed', label: 'Bed' },
  { id: 'daybed', label: 'Daybed' },
  { id: 'sofa', label: 'Sofa' },
  { id: 'corner-sofa', label: 'Corner sofa (L-shaped)' },
  { id: 'armchair', label: 'Armchair' },
  { id: 'tub-chair', label: 'Tub chair (round or bucket)' },
  { id: 'lounge', label: 'Lounge chair (wood frame)' },
  { id: 'chair', label: 'Chair' },
  { id: 'stool', label: 'Stool or bar stool' },
  { id: 'ottoman', label: 'Ottoman or pouf' },
  { id: 'table', label: 'Dining table' },
  { id: 'table-round', label: 'Round table' },
  { id: 'coffee-table', label: 'Coffee table' },
  { id: 'desk', label: 'Desk' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'bookshelf', label: 'Bookshelf' },
  { id: 'etagere', label: 'Open shelving unit' },
  { id: 'cabinet', label: 'Cabinet or sideboard' },
  { id: 'nightstand', label: 'Nightstand or chest' },
];

/** A usual real width per type, used when the user has not entered a size (photos only give proportions). */
export const TYPICAL_WIDTH_CM = {
  bed: 160,
  daybed: 200,
  'corner-sofa': 260,
  'tub-chair': 75,
  ottoman: 60,
  etagere: 80,
  sofa: 200,
  armchair: 85,
  lounge: 72,
  chair: 45,
  stool: 38,
  table: 150,
  'table-round': 100,
  'coffee-table': 100,
  desk: 120,
  wardrobe: 120,
  bookshelf: 80,
  cabinet: 140,
  nightstand: 48,
};

/** Short names for the quick "Looks like" choices. */
export const SHORT_LABEL = {
  bed: 'Bed',
  daybed: 'Daybed',
  sofa: 'Sofa',
  'corner-sofa': 'Corner sofa',
  armchair: 'Armchair',
  'tub-chair': 'Tub chair',
  lounge: 'Lounge chair',
  chair: 'Chair',
  stool: 'Stool',
  ottoman: 'Ottoman',
  table: 'Dining table',
  'table-round': 'Round table',
  'coffee-table': 'Coffee table',
  desk: 'Desk',
  wardrobe: 'Wardrobe',
  bookshelf: 'Bookshelf',
  etagere: 'Open shelving',
  cabinet: 'Sideboard',
  nightstand: 'Nightstand',
};

/** Colour slots each type exposes (label shown to the user), in palette order. */
/** Colour slots only some pieces use: shown and saved only when the photos gave them a colour. */
export const OPTIONAL_SLOTS = new Set(['panel', 'frame', 'trim', 'scatter']);

export const PALETTE_SLOTS = {
  bed: [
    ['body', 'Headboard'],
    ['base', 'Frame and base'],
    ['accent', 'Duvet'],
    ['sheet', 'Sheet and mattress'],
    ['pillow', 'Pillows'],
    ['panel', 'Headboard panel'],
  ],
  daybed: [
    ['body', 'Frame'],
    ['cushion', 'Mattress'],
    ['accent', 'Bolsters'],
  ],
  sofa: [
    ['body', 'Body'],
    ['arm', 'Arms'],
    ['cushion', 'Cushions'],
    ['leg', 'Feet'],
    ['frame', 'Wood frame'],
    ['trim', 'Gold trim'],
    ['scatter', 'Scatter cushions'],
  ],
  'corner-sofa': [
    ['body', 'Body'],
    ['cushion', 'Cushions'],
    ['leg', 'Feet'],
  ],
  'tub-chair': [
    ['body', 'Shell'],
    ['cushion', 'Seat cushion'],
    ['leg', 'Feet or base'],
  ],
  ottoman: [
    ['body', 'Cover'],
    ['leg', 'Feet'],
  ],
  etagere: [
    ['body', 'Frame'],
    ['accent', 'Doors and drawers'],
  ],
  armchair: [
    ['body', 'Body'],
    ['arm', 'Arms'],
    ['cushion', 'Cushions'],
    ['leg', 'Feet'],
    ['frame', 'Wood frame'],
    ['trim', 'Gold trim'],
    ['scatter', 'Scatter cushions'],
  ],
  lounge: [
    ['body', 'Wood frame'],
    ['cushion', 'Cushions'],
  ],
  chair: [
    ['body', 'Frame'],
    ['cushion', 'Seat'],
    ['leg', 'Legs'],
  ],
  stool: [
    ['body', 'Frame'],
    ['cushion', 'Seat'],
    ['leg', 'Legs'],
  ],
  table: [
    ['body', 'Top'],
    ['accent', 'Apron'],
    ['leg', 'Legs'],
  ],
  'table-round': [
    ['body', 'Top'],
    ['leg', 'Base'],
  ],
  'coffee-table': [
    ['body', 'Top'],
    ['accent', 'Shelf'],
    ['leg', 'Legs'],
    ['frame', 'Carved wood'],
    ['trim', 'Gold trim'],
  ],
  desk: [
    ['body', 'Top'],
    ['accent', 'Drawers'],
    ['leg', 'Legs'],
  ],
  wardrobe: [['body', 'Body']],
  bookshelf: [['body', 'Body']],
  cabinet: [
    ['body', 'Body'],
    ['accent', 'Top'],
    ['leg', 'Legs'],
  ],
  nightstand: [
    ['body', 'Body'],
    ['leg', 'Feet'],
  ],
};

/** How likely the trained ranking must find the rules' answer for the rules to stand (0-1). */
export let RULE_TRUST = 0.15;
/** The same for several photos, where the rules have more to go on (side depth, plan shape). */
/** The ranking only overrules the rules when it is at least this sure of its own first choice. */
export const MIN_SURE = 0.3;
export const BED_VETO = 0.03;
export const MIN_SURE_MULTI = 0.55;
export let MULTI_TRUST = 0.1;
export const setRuleTrust = (v) => {
  RULE_TRUST = v;
  MULTI_TRUST = v / 5;
};
const TYPE_IDS = new Set(DESIGN_TYPES.map((t) => t.id));
const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK = {
  body: '#8a7a6a',
  arm: '#8a7a6a',
  base: '#8a7a6a',
  sheet: '#f4f1ea',
  accent: '#b8aa98',
  pillow: '#f4f1ea',
  cushion: '#9a8b7a',
  leg: '#2a2622',
};

// ---------- small colour and grid helpers ----------

const toHex = (rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const shadeHex = (hex, k) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return toHex(v.map((c) => c * k));
};
/** White or cream linen photographed in soft light looks darker than it is: lift it toward its real tone. */
const linen = (hex) => {
  const rgb = hexRgb(hex);
  const chroma = Math.max(...rgb) - Math.min(...rgb);
  return chroma < 40 && luma(rgb) > 150 ? shadeHex(hex, 1.1) : hex;
};
const mean = (list) => {
  const out = [0, 0, 0];
  for (const c of list) for (let k = 0; k < 3; k++) out[k] += c[k] / list.length;
  return out;
};

/** Colours of object pixels inside a region given in 0-1 view fractions. */
function regionPixels(view, x0, y0, x1, y1, closed = false) {
  if (!view) return [];
  const s = view.size;
  const out = [];
  // The mask with its gaps open, when there is one: colours of the piece, not of what shows through it
  const mask = (!closed && view.open) || view.mask;
  for (let y = Math.floor(y0 * s); y < Math.ceil(y1 * s); y++) {
    for (let x = Math.floor(x0 * s); x < Math.ceil(x1 * s); x++) {
      const p = y * s + x;
      if (mask[p]) out.push([view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]]);
    }
  }
  return out;
}

function pickColor(view, region, mode = 'mean') {
  // Small light things (pillows, linen) are read from the whole cut-out: the open mask treats pale linen as gap
  const px = regionPixels(view, ...region, mode === 'brightest' || mode === 'linen');
  if (px.length < 6) return null;
  if (mode === 'mean') return toHex(mean(px));
  px.sort((a, b) => luma(a) - luma(b));
  // 'brightest' is for small light things (pillows against a dark headboard) that fill little of the region
  const n = Math.max(3, Math.round(px.length * (mode === 'brightest' ? 0.15 : 0.4)));
  return toHex(
    mean(
      mode === 'light' || mode === 'brightest' || mode === 'linen' ? px.slice(-n) : px.slice(0, n)
    )
  );
}

function objectMean(view) {
  return pickColor(view, [0, 0, 1, 1]) || null;
}

/** Per column: fraction of the view height covered above the lowest object pixel's top (the profile). */
function topProfile(view) {
  const s = view.size;
  const out = new Float32Array(s);
  for (let x = 0; x < s; x++) {
    for (let y = 0; y < s; y++) {
      if (view.mask[y * s + x]) {
        out[x] = 1 - y / s;
        break;
      }
    }
  }
  return out;
}

/** Per column: where the object ends at the bottom, as a fraction of the height from the top. */
function bottomProfile(view) {
  const s = view.size;
  const out = new Float32Array(s);
  for (let x = 0; x < s; x++) {
    for (let y = s - 1; y >= 0; y--) {
      if (view.mask[y * s + x]) {
        out[x] = (y + 1) / s;
        break;
      }
    }
  }
  return out;
}

const median = (arr) => {
  const a = Array.from(arr).sort((p, q) => p - q);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};
const slice = (arr, a, b) =>
  Array.from(arr).slice(Math.floor(a * arr.length), Math.ceil(b * arr.length));

/** Heights along the depth of the piece from the back (index 0) to the front, as fractions of its height. */
export function depthProfile(views) {
  if (views.left) return topProfile(views.left); // left photo: back on its left edge
  if (views.right) return Array.from(topProfile(views.right)).reverse(); // right photo: front on its left edge
  return null;
}

// ---------- measuring ----------

/**
 * Shape traits measured from the views.
 * @returns {{ rise: number, tallEnd: 'back'|'none', bodyFrac: number, gapFrac: number, slabFrac: number, round: boolean }}
 */
export function measureTraits(views) {
  const front = views.front || views.back || null;
  const profile = depthProfile(views);
  let rise = 1;
  let tallEnd = 'none';
  let bodyFrac = 0.5;
  if (profile) {
    const p = profile;
    const backMax = Math.max(...slice(p, 0, 0.3));
    const frontMax = Math.max(...slice(p, 0.7, 1));
    const midFront = median(slice(p, 0.45, 1));
    const midBack = median(slice(p, 0, 0.55));
    // The taller end is taken as the back (headboard, backrest): the plan photo has it at the top
    if (backMax >= frontMax) {
      rise = backMax / Math.max(0.05, midFront);
      bodyFrac = midFront / Math.max(0.05, backMax);
    } else {
      rise = frontMax / Math.max(0.05, midBack);
      bodyFrac = midBack / Math.max(0.05, frontMax);
    }
    if (rise >= 1.25) tallEnd = 'back';
  }
  let gapFrac = 0;
  let slabFrac = 0.1;
  // Space under the piece shows in a side view too, when that is all there is
  const underside = front || views.left || views.right;
  if (underside) gapFrac = 1 - median(slice(bottomProfile(underside), 0.3, 0.7));
  if (front) {
    // Thickness of the top: rows from the top that are nearly as wide as the widest row
    const s = front.size;
    const widths = [];
    for (let y = 0; y < s; y++) {
      let n = 0;
      for (let x = 0; x < s; x++) n += front.mask[y * s + x];
      widths.push(n);
    }
    const widest = Math.max(...widths);
    let first = widths.findIndex((w) => w >= widest * 0.85);
    if (first < 0) first = 0;
    let last = first;
    while (last + 1 < s && widths[last + 1] >= widest * 0.85) last++;
    slabFrac = (last - first + 1) / s;
  }
  let round = false;
  let lShape = null;
  if (views.top) {
    const s = views.top.size;
    let n = 0;
    for (let p = 0; p < s * s; p++) n += views.top.mask[p];
    const fill = n / (s * s);
    lShape = detectLShape(views.top);
    round = !lShape && fill > 0.7 && fill < 0.85;
  }
  // How much of the front view is solid when its gaps are left open (shelving and slats show the wall)
  const openFill = front?.open ? fillOf(front, [0.1, 0.1, 0.9, 0.9], true) : null;
  return {
    rise,
    tallEnd,
    bodyFrac,
    gapFrac,
    slabFrac,
    round,
    lShape,
    openFill,
    domed: front ? isDomed(front) : false,
    hasTop: Boolean(views.top),
  };
}

/**
 * An L-shaped plan view (a corner sofa): one front corner of the bounding box is empty while the rest is
 * solid. Returns the side the chaise is on ('left' or 'right', seen from the front), or null.
 */
export function detectLShape(top) {
  if (!top) return null;
  const solid = (r) => (fillOf(top, r) ?? 0) >= 0.78;
  const empty = (r) => (fillOf(top, r) ?? 1) <= 0.14;
  // The back run is solid edge to edge; the chaise fills one front corner and leaves the other empty
  if (!(solid([0, 0, 0.3, 0.3]) && solid([0.7, 0, 1, 0.3]) && solid([0.38, 0.2, 0.62, 0.45])))
    return null;
  if (empty([0, 0.72, 0.28, 1]) && solid([0.72, 0.72, 1, 1])) return 'right';
  if (empty([0.72, 0.72, 1, 1]) && solid([0, 0.72, 0.28, 1])) return 'left';
  return null;
}

/** Rounded shoulders in the front outline (a tub chair), not a step down to lower arms or a flat top. */
function isDomed(front) {
  const p = topProfile(front);
  const s = p.length;
  const centre = Math.max(...slice(p, 0.35, 0.65));
  if (centre < 0.5) return false;
  let sharp = 0;
  for (let x = 1; x < s; x++) sharp = Math.max(sharp, Math.abs(p[x] - p[x - 1]));
  const ends = [p[Math.round(s * 0.08)], p[Math.round(s * 0.92)]];
  return sharp < 0.07 && ends.every((e) => e > 0.45 * centre && e < 0.9 * centre);
}

/**
 * Best guess of what the piece is from the proportions of its three sizes and the measured shape. Ratios
 * are used so the guess does not depend on a real size having been entered yet.
 * @param {{widthCm:number, depthCm:number, heightCm:number}} dims
 */
export function classifyType(traits, dims, sizeKnown = true) {
  const { widthCm: w, depthCm: d, heightCm: h } = dims;
  const { rise, gapFrac, round, lShape } = traits;
  const backed = rise >= 1.25;
  const open = gapFrac > 0.3; // clear space under it: legs
  const wh = w / h;
  const dh = d / h;
  if (backed && !open) {
    // An L-shaped plan view: a corner sofa (deep, so it must be checked before the bed)
    if (lShape && w / d >= 0.9 && w / d <= 2.6) return 'corner-sofa';
    if (dh >= 1.5) return 'bed';
    // A round plan, or a rounded outline when there is no plan photo: a tub chair
    const squarish = Math.abs(w - d) <= 0.22 * Math.max(w, d);
    // Only a round plan view is proof enough: rounded arms alone would turn armchairs into tubs
    if (squarish && wh <= 1.3 && round) return 'tub-chair';
    return w / d >= 1.45 ? 'sofa' : 'armchair';
  }
  if (backed && open) {
    if (wh <= 1.05 && dh <= 1.05) return 'chair';
    // A deep, narrow seat on an open frame: a lounge chair, not a sofa
    if (w / d < 1.4 && dh < 1.6) return 'lounge';
    return dh >= 1.5 ? 'bed' : 'sofa';
  }
  if (open || (gapFrac > 0.12 && h <= w)) {
    if (!backed && wh <= 0.75 && dh <= 0.75) return 'stool';
    if (round && Math.abs(w - d) < 0.2 * Math.max(w, d)) return 'table-round';
    if (h / w <= 0.45 && (!sizeKnown || h <= 60)) return 'coffee-table';
    if (sizeKnown ? h / w <= 0.7 && d / w <= 0.65 && w <= 175 : h / w <= 0.6 && d / w <= 0.5)
      return 'desk';
    return 'table';
  }
  // Closed furniture: by size when it is known, otherwise by proportion alone
  const tall = sizeKnown ? h >= 150 : h / w >= 1.1 && h / d >= 2.3;
  const thin = sizeKnown ? d <= 40 : d / h <= 0.22;
  // Shelving that shows the wall through its compartments is an open unit, not a closed case
  const seeThrough = traits.openFill != null && traits.openFill < 0.72;
  if (tall && thin && seeThrough) return 'etagere';
  if (tall) return thin ? 'bookshelf' : 'wardrobe';
  // Deep, long and low with a back and arms all round: a daybed
  const daybedShape = w / d >= 1.7 && w / d <= 2.9 && dh >= 0.8 && dh <= 1.6;
  // A daybed is only taken from a size the user entered: from proportions alone it is a sofa (offered as a choice)
  if (daybedShape && gapFrac <= 0.3 && sizeKnown && h <= 105) return 'daybed';
  // Low and squarish with no back: an ottoman or pouf
  const stoutLow = sizeKnown
    ? h <= 50 && h / w <= 0.95 && w <= 110 && w / d <= 1.9 && w / d >= 0.5
    : h / w <= 0.75 && w / d <= 1.7 && w / d >= 0.6 && d / h >= 1;
  if (stoutLow && !seeThrough) return 'ottoman';
  if (sizeKnown ? h >= 90 && d <= 40 : h / w >= 0.9 && h / d >= 2.4)
    return seeThrough ? 'etagere' : 'bookshelf';
  if (sizeKnown ? w <= 65 && h <= 80 : w / h <= 0.9 && h / w <= 1.6 && d / w >= 0.7)
    return 'nightstand';
  return 'cabinet';
}

// ---------- structure: seams, shelves, legs, arms ----------

/**
 * Thin dark or light lines across a band of the view: door gaps, drawer fronts, shelf edges, cushion seams.
 * 'x' finds vertical lines (the signal runs along columns), 'y' finds horizontal ones.
 * Returns the line positions as 0-1 fractions along the axis.
 */
export function findLines(view, axis, region, maxWidth = 4) {
  if (!view) return [];
  const [x0, y0, x1, y1] = region;
  const s = view.size;
  const a0 = Math.floor((axis === 'x' ? x0 : y0) * s);
  const a1 = Math.ceil((axis === 'x' ? x1 : y1) * s);
  const b0 = Math.floor((axis === 'x' ? y0 : x0) * s);
  const b1 = Math.ceil((axis === 'x' ? y1 : x1) * s);
  const signal = [];
  for (let a = a0; a < a1; a++) {
    // The median along the band, so a handle or a label covering part of a door is not taken as a gap
    const values = [];
    for (let b = b0; b < b1; b++) {
      const p = axis === 'x' ? b * s + a : a * s + b;
      if (!view.mask[p]) continue;
      values.push(luma([view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]]));
    }
    signal.push(values.length >= (b1 - b0) * 0.6 ? median(values) : null);
  }
  const win = Math.max(maxWidth * 3, Math.round(s * 0.1));
  const dev = signal.map((v, i) => {
    if (v === null) return 0;
    const near = [];
    for (let j = Math.max(0, i - win); j <= Math.min(signal.length - 1, i + win); j++)
      if (signal[j] !== null) near.push(signal[j]);
    return near.length ? v - median(near) : 0;
  });
  const abs = dev.map(Math.abs).sort((p, q) => p - q);
  const noise = abs[Math.floor(abs.length * 0.5)] || 0;
  const thr = Math.max(12, noise * 3.5);
  const found = [];
  let i = 0;
  while (i < dev.length) {
    if (Math.abs(dev[i]) > thr) {
      let j = i;
      while (j + 1 < dev.length && Math.abs(dev[j + 1]) > thr * 0.6) j++;
      if (j - i + 1 <= maxWidth + 1) found.push((a0 + (i + j + 1) / 2) / s);
      i = j + 1;
    } else i++;
  }
  // Lines hugging the outline are edges, not seams
  return found.filter((f) => f > 0.1 && f < 0.9);
}

/** Width of the outermost run of object pixels along a row, as a fraction of the view (a leg, an arm). */
function edgeRunFrac(view, row) {
  const s = view.size;
  const y = Math.min(s - 1, Math.max(0, Math.round(row * s)));
  let x = 0;
  while (x < s && !view.mask[y * s + x]) x++;
  const start = x;
  while (x < s && view.mask[y * s + x]) x++;
  return (x - start) / s;
}

/** Share of a region of the view that is object (how solid it looks). */
function fillOf(view, region, useOpen = false) {
  if (!view) return null;
  const mask = (useOpen && view.open) || view.mask;
  const [x0, y0, x1, y1] = region;
  const s = view.size;
  let n = 0;
  let tot = 0;
  for (let y = Math.floor(y0 * s); y < Math.ceil(y1 * s); y++)
    for (let x = Math.floor(x0 * s); x < Math.ceil(x1 * s); x++) {
      tot++;
      n += mask[y * s + x];
    }
  return tot ? n / tot : null;
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const colourGap = (a, b) => {
  const [p, q] = [hexRgb(a), hexRgb(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/** Arm width of a sofa or armchair as a fraction of its width, from where the top view changes colour. */
function armFraction(top, fallback) {
  if (!top) return fallback;
  const s = top.size;
  const edge = pickColor(top, [0.02, 0.45, 0.06, 0.85]);
  if (!edge) return fallback;
  for (let x = Math.round(s * 0.05); x < s * 0.35; x++) {
    const px = regionPixels(top, x / s, 0.4, (x + 1) / s, 0.85);
    if (px.length < 4) continue;
    const m = mean(px);
    if (colourGap(edge, toHex(m)) > 28) return x / s;
  }
  return fallback;
}

/** Left and right edges (fractions of the view) of the object along one row of the view. */
function rowSpan(view, row) {
  const s = view.size;
  const y = Math.min(s - 1, Math.max(0, Math.round(row * s)));
  let lo = -1;
  let hi = -1;
  for (let x = 0; x < s; x++)
    if (view.mask[y * s + x]) {
      if (lo < 0) lo = x;
      hi = x;
    }
  return lo < 0 ? null : { lo: lo / s, hi: (hi + 1) / s };
}

/** Do the arms stand wider than the back, like rolled padded arms? Compares the back rows with the arm rows. */
function rolledArms(front) {
  if (!front) return null;
  const top = rowSpan(front, 0.12);
  const mid = rowSpan(front, 0.62);
  if (!top || !mid) return null;
  const protrusion = (top.lo - mid.lo + (mid.hi - top.hi)) / 2;
  return { roll: protrusion > 0.035, protrusion: Math.max(0, protrusion) };
}

/** Slim tapered legs: thin runs of object at the very bottom of the front view, with a gap under the body. */
function taperedLegs(front) {
  if (!front) return false;
  const s = front.size;
  const bottom = bottomProfile(front);
  const centre = median(slice(bottom, 0.3, 0.7));
  const lowest = Math.max(...Array.from(bottom));
  if (lowest - centre < 0.04 || lowest < 0.9) return false;
  const row = Math.round(Math.min(s - 1, (lowest - 0.02) * s));
  let runs = 0;
  let thin = 0;
  let x = 0;
  while (x < s) {
    if (front.mask[row * s + x]) {
      let e = x;
      while (e < s && front.mask[row * s + e]) e++;
      runs++;
      if ((e - x) / s < 0.09) thin++;
      x = e;
    } else x++;
  }
  return runs >= 2 && thin === runs;
}

/** Tufting: small dark dimples (buttons) across the back cushions, found as isolated local luma minima. */
function tuftedBack(front, region = [0.2, 0.12, 0.8, 0.45]) {
  if (!front) return false;
  const s = front.size;
  const lum = new Float32Array(s * s);
  for (let p = 0; p < s * s; p++)
    lum[p] = luma([front.rgb[p * 3], front.rgb[p * 3 + 1], front.rgb[p * 3 + 2]]);
  let dimples = 0;
  const x0 = Math.floor(s * region[0]);
  const x1 = Math.ceil(s * region[2]);
  const y0 = Math.floor(s * region[1]);
  const y1 = Math.ceil(s * region[3]);
  for (let y = y0 + 2; y < y1 - 2; y++)
    for (let x = x0 + 2; x < x1 - 2; x++) {
      const p = y * s + x;
      if (!front.mask[p]) continue;
      let ring = 0;
      let n = 0;
      let inside = true;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 2) continue;
          const q = (y + dy) * s + x + dx;
          if (!front.mask[q]) {
            inside = false;
            continue;
          }
          ring += lum[q];
          n++;
        }
      if (!inside || n < 12) continue;
      let isMin = true;
      for (let dy = -1; dy <= 1 && isMin; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if ((dx || dy) && lum[(y + dy) * s + x + dx] < lum[p]) {
            isMin = false;
            break;
          }
      if (isMin && ring / n - lum[p] > 9) dimples++;
    }
  return dimples >= 4;
}

/** Horizontal back rails seen from the back: bands of wood separated by gaps or cushion down the middle. */
function countBackRails(view) {
  if (!view) return 3;
  const s = view.size;
  const bands = [];
  for (let y = Math.floor(s * 0.1); y < Math.floor(s * 0.9); y++) {
    const px = regionPixels(view, 0.3, y / s, 0.7, (y + 1) / s);
    bands.push(px.length ? mean(px.map((c) => [luma(c), 0, 0]))[0] : 0);
  }
  if (!bands.length) return 3;
  const sorted = [...bands].sort((a, b) => a - b);
  const cut =
    (sorted[Math.floor(sorted.length * 0.25)] + sorted[Math.floor(sorted.length * 0.75)]) / 2;
  let runs = 0;
  let inside = false;
  for (const v of bands) {
    if (v > cut && !inside) runs++;
    inside = v > cut;
  }
  return runs;
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const round2 = (v) => Math.round(v * 100) / 100;

/** Traits beyond the basic shape: what the front photo shows of doors, drawers, shelves, legs and arms. */
export function detectStructure(type, views, dims) {
  const F = views.front || views.back || null;
  const T = views.top || null;
  const out = {};
  const w = dims.widthCm / 100;
  if (type === 'wardrobe') {
    const seams = F ? findLines(F, 'x', [0.05, 0.2, 0.95, 0.7]).length : 0;
    out.doors = seams ? clampInt(seams + 1, 1, 6) : clampInt(w / 0.62, 2, 6);
  } else if (type === 'bookshelf') {
    const lines = F ? findLines(F, 'y', [0.12, 0.03, 0.88, 0.97], 5).length : 0;
    out.shelves = lines ? clampInt(lines + 1, 2, 8) : clampInt(dims.heightCm / 36, 3, 6);
  } else if (type === 'etagere') {
    Object.assign(out, shelvingDetails(F, dims));
  } else if (type === 'cabinet') {
    Object.assign(out, sideboardDetails(F, dims));
  } else if (type === 'corner-sofa') {
    out.side = detectLShape(T) || 'right';
    const backSeams = F ? findLines(F, 'x', [0.1, 0.12, 0.9, 0.42]).length : 0;
    const byWidth = clampInt((w * 0.66 - 0.2) / 0.75, 1, 4);
    out.seats = backSeams ? clampInt(backSeams, 1, 4) : byWidth;
    out.arm = 0.08;
    out.tufted = tuftedBack(F) ? 1 : 0;
    out.taper = taperedLegs(F) ? 1 : 0;
  } else if (type === 'tub-chair') {
    const fill = T ? (fillOf(T, [0, 0, 1, 1]) ?? 1) : null;
    out.plan =
      fill !== null ? (fill > 0.88 ? 'bucket' : 'round') : isDomed(F || T) ? 'round' : 'bucket';
    out.base = F ? baseKind(F) : 'feet';
    out.tufted = tuftedBack(F) ? 1 : 0;
  } else if (type === 'ottoman') {
    out.shape = T && roundPlan(T) ? 'round' : 'square';
    out.tufted = T && tuftedBack(T, [0.15, 0.15, 0.85, 0.85]) ? 1 : 0;
    const gap = F ? measureTraits({ front: F }).gapFrac : 0;
    out.feet = gap < 0.04 ? 'none' : gap < 0.2 ? 'short' : 'tall';
  } else if (type === 'daybed') {
    const slats = F ? findLines(F, 'x', [0.08, 0.1, 0.92, 0.4], 3).length : 0;
    out.back = slats >= 5 ? 'slat' : 'panel';
    out.ends = 2;
  } else if (type === 'stool') {
    Object.assign(out, stoolDetails(F, T, dims));
  } else if (type === 'nightstand') {
    const lines = F ? findLines(F, 'y', [0.15, 0.05, 0.85, 0.9], 5).length : 0;
    out.drawers = lines ? clampInt(lines + 1, 1, 4) : 2;
  } else if (type === 'chair') {
    const fill = F ? fillOf(F, [0.22, 0.14, 0.78, 0.3], true) : null;
    out.back = fill === null ? 'slat' : fill >= 0.8 ? 'solid' : fill >= 0.12 ? 'slat' : 'open';
  } else if (type === 'lounge') {
    out.slats = clampInt(countBackRails(views.back || F), 2, 5);
  } else if (type === 'sofa' || type === 'armchair') {
    const arm = armFraction(T, type === 'sofa' ? 0.1 : 0.17);
    out.arm = round2(Math.min(0.2, Math.max(0.04, arm)));
    const roll = rolledArms(F);
    if (roll) {
      out.roll = roll.roll ? 1 : 0;
      // Arms that stand proud of the back are wide and padded
      if (roll.roll) out.arm = round2(Math.min(0.14, Math.max(0.08, 0.05 + roll.protrusion * 1.6)));
    }
    out.tufted = tuftedBack(F) ? 1 : 0;
    out.taper = taperedLegs(F) ? 1 : 0;
    if (type === 'sofa') {
      const seams = F ? findLines(F, 'x', [0.05, 0.5, 0.95, 0.76]).length : 0;
      // Only between the arms: where an arm meets the back is not a cushion seam
      const lo2 = Math.min(0.4, out.arm + 0.08);
      const between = (y0, y1) =>
        F
          ? findLines(F, 'x', [lo2, y0, 1 - lo2, y1]).filter(
              (f) => f > lo2 + 0.05 && f < 1 - lo2 - 0.05
            )
          : [];
      const backSeams = between(0.12, 0.42).length;
      const seatSeams = between(0.5, 0.76).length;
      const inner = w * (1 - 2 * out.arm);
      const lo = clampInt(Math.ceil(inner / 1.1), 1, 5);
      const hi = clampInt(Math.floor(inner / 0.45), lo, 5);
      out.seats = seams ? clampInt(seams + 1, lo, hi) : clampInt(inner / 0.7, lo, hi);
      // Several back cushions but no seam across the seat: one long seat cushion, like many loveseats
      out.longSeat = !seams && !seatSeams && backSeams >= 1 ? 1 : 0;
      if (out.longSeat) out.seats = clampInt(backSeams + 1, 2, hi);
    }
  } else if (['table', 'coffee-table', 'desk'].includes(type) && F) {
    const frac = edgeRunFrac(F, 0.97);
    out.legFrac = round2(Math.min(0.12, Math.max(0.02, frac || 0.05)));
    // A turned leg shades across its width; a square one is flat
    const span = frac || 0.06;
    const leg = pickColor(F, [0, 0.8, span, 0.98]);
    const dark = pickColor(F, [0, 0.8, span, 0.98], 'dark');
    const light = pickColor(F, [0, 0.8, span, 0.98], 'light');
    out.roundLegs =
      leg && dark && light && colourGap(dark, light) > 0.4 * Math.max(40, luma(hexRgb(leg)))
        ? 1
        : 0;
    // The thickness of the top, from the rows that are as wide as the piece (a glass top is thin, a slab thick)
    const slab = measureTraits({ front: F }).slabFrac;
    if (slab > 0 && slab < 0.5)
      out.topH = Math.round(Math.min(8, Math.max(2, slab * dims.heightCm)) * 2) / 2;
  } else if (type === 'bed') {
    if (F) {
      out.head = headboardStyle(
        F,
        views.left || views.right ? measureTraits(views).bodyFrac : 0.55
      );
      out.channels = out.head === 'channel' ? 1 : 0;
      const hw = headboardWidth(F);
      if (hw !== null) out.headW = Math.round(Math.min(1.15, Math.max(0.7, hw)) * 20) / 20;
    }
    // A bolster or euro pillow in front of the pillows shows as a second light band from above
    if (views.top) out.lumbar = hasFrontPillows(views.top) ? 1 : 0;
    if (hasFootboard(views)) out.foot = 1;
  }
  return out;
}

const roundPlan = (top) => {
  if (detectLShape(top)) return false;
  const fill = fillOf(top, [0, 0, 1, 1]) ?? 1;
  return fill > 0.7 && fill < 0.85;
};

/** Headboard style from the top band of the front view: stitching lines, buttons or slats. */
function headboardStyle(F, bodyFrac) {
  const band = [0.12, 0.04, 0.88, 0.22];
  const lines = findLines(F, 'x', band, 3).length;
  if (lines >= 5) return 'slat';
  if (tuftedBack(F, [0.15, 0.04, 0.85, 0.24])) return 'tufted';
  if (lines >= 2) return 'channel';
  return bodyFrac > 0.75 ? 'flat' : 'panel';
}

/**
 * How much of the bed's width the headboard spans, from a straight-on front view (1 = as wide as the base).
 * Null when the view is not square on, or when no headboard stands above the body.
 */
function headboardWidth(F) {
  const s = F.size;
  const rows = rowWidthFractions(F);
  const avg = (a, b) => {
    const part = rows.slice(Math.round(s * a), Math.round(s * b));
    return part.length ? part.reduce((x, y) => x + y, 0) / part.length : 0;
  };
  const head = avg(0.04, 0.2);
  const ref = avg(0.88, 1);
  if (head < 0.4 || ref < 0.5) return null;
  // Square on: the headboard sits in the middle of the view
  let sum = 0;
  let n = 0;
  for (let y = Math.round(s * 0.04); y < Math.round(s * 0.2); y++)
    for (let x = 0; x < s; x++)
      if (F.mask[y * s + x]) {
        sum += x / s;
        n++;
      }
  if (!n || Math.abs(sum / n - 0.5) > 0.045) return null;
  return head / ref;
}

/**
 * A bolster, euro pillow or second row of pillows in front of the main ones: seen from above it is a second
 * light band down the middle of the bed's head end, set off by a shadow line (the first line, right under the
 * headboard, is not counted).
 */
function hasFrontPillows(top) {
  if (!top) return false;
  const s = top.size;
  const first = Math.round(s * 0.06);
  const prof = [];
  for (let y = first; y < Math.round(s * 0.5); y++) {
    const px = regionPixels(top, 0.4, y / s, 0.6, (y + 1) / s, true);
    prof.push(px.length ? mean(px.map((c) => [luma(c), 0, 0]))[0] : null);
  }
  for (let i = 3; i < prof.length - 3; i++) {
    if ((first + i) / s < 0.17) continue;
    const v = prof[i];
    const a = prof[i - 3];
    const b = prof[i + 3];
    if (v === null || a === null || b === null) continue;
    let isMin = true;
    for (let j = i - 2; j <= i + 2; j++) if (prof[j] !== null && prof[j] < v) isMin = false;
    if (isMin && Math.min(a, b) - v >= 14) return true;
  }
  return false;
}

/** A footboard: the foot end of the side view stands up like the head end, not flat like the mattress. */
function hasFootboard(views) {
  const profile = depthProfile(views);
  if (!profile) return false;
  const p = Array.from(profile);
  const lo = Math.max(...slice(p, 0, 0.08));
  const hi = Math.max(...slice(p, 0.92, 1));
  const mid = median(slice(p, 0.25, 0.75));
  const lowEnd = Math.min(lo, hi);
  return lowEnd >= 1.2 * mid && lowEnd >= 0.55 * Math.max(lo, hi);
}

/** What stands under a tub chair: short feet, slim legs or one central base. */
function baseKind(F) {
  const s = F.size;
  const bottom = bottomProfile(F);
  const lowest = Math.max(...Array.from(bottom));
  const row = Math.max(0, Math.min(s - 1, Math.round(Math.min(lowest, 0.99) * s) - 2));
  let n = 0;
  for (let x = 0; x < s; x++) n += F.mask[row * s + x];
  const gap = lowest - median(slice(bottom, 0.3, 0.7));
  if (gap > 0.04 && n / s < 0.4) return 'pedestal';
  return taperedLegs(F) ? 'legs' : 'feet';
}

/** Open shelving: rows, columns, and whether the lower part is closed with doors or drawers. */
function shelvingDetails(F, dims) {
  const out = {};
  const rows = F ? findLines(F, 'y', [0.12, 0.03, 0.88, 0.97], 5).length : 0;
  out.shelves = rows ? clampInt(rows + 1, 2, 7) : clampInt(dims.heightCm / 38, 3, 6);
  const cols = F ? findLines(F, 'x', [0.05, 0.08, 0.95, 0.62]).length : 0;
  out.cols = clampInt(cols + 1, 1, 4);
  const upper = F ? (fillOf(F, [0.1, 0.05, 0.9, 0.6], true) ?? 1) : 1;
  const lower = F ? (fillOf(F, [0.1, 0.72, 0.9, 0.97], true) ?? 0) : 0;
  out.base = 'open';
  if (F && lower >= 0.85 && upper < 0.85) {
    const across = findLines(F, 'x', [0.08, 0.72, 0.92, 0.97]).length;
    const along = findLines(F, 'y', [0.08, 0.72, 0.92, 0.97]).length;
    out.base = along > across ? 'drawers' : 'doors';
  }
  out.back = upper >= 0.6 ? 1 : 0;
  return out;
}

/** Sideboard: sections across, doors or drawers in each, and legs or a plinth. */
function sideboardDetails(F, dims) {
  const out = { front: 'doors', n: clampInt(dims.widthCm / 55, 2, 4), legs: 0 };
  if (!F) return out;
  const seams = findLines(F, 'x', [0.04, 0.2, 0.96, 0.85]).filter((f) => f > 0.12 && f < 0.88);
  if (seams.length) out.n = clampInt(seams.length + 1, 2, 5);
  const edges = [0, ...seams, 1];
  let drawers = 0;
  for (let i = 0; i + 1 < edges.length; i++) {
    const rows = findLines(F, 'y', [edges[i] + 0.02, 0.2, edges[i + 1] - 0.02, 0.85], 4);
    if (rows.length >= 1) drawers++;
  }
  out.front = drawers === 0 ? 'doors' : drawers >= edges.length - 1 ? 'drawers' : 'mixed';
  out.legs = measureTraits({ front: F }).gapFrac > 0.08 ? 1 : 0;
  return out;
}

/** Stool or bar stool: round or square seat, a back, a footrest. */
function stoolDetails(F, T, dims) {
  const out = { seat: T ? (roundPlan(T) ? 'round' : 'square') : 'round', back: 0, rest: 0 };
  if (!F) return out;
  const s = F.size;
  const widths = [];
  for (let y = 0; y < s; y++) {
    let n = 0;
    for (let x = 0; x < s; x++) n += F.mask[y * s + x];
    widths.push(n);
  }
  const widest = Math.max(...widths);
  const firstWide = widths.findIndex((v) => v >= widest * 0.85);
  out.back = firstWide / s > 0.14 ? 1 : 0;
  const mid = widths.slice(Math.floor(s * 0.5), Math.floor(s * 0.85));
  out.rest = dims.heightCm >= 58 || Math.max(...mid, 0) >= widest * 0.7 ? 1 : 0;
  return out;
}

// ---------- beds: a tall narrow headboard over a wide low body ----------

/** Per row of the view: how wide the object is, as a fraction of its widest row. */
function rowWidthFractions(view) {
  const s = view.size;
  const widths = [];
  for (let y = 0; y < s; y++) {
    let n = 0;
    for (let x = 0; x < s; x++) n += view.mask[y * s + x];
    widths.push(n);
  }
  const widest = Math.max(1, ...widths);
  return widths.map((n) => n / widest);
}

/**
 * How much of the height, counted from the top, is clearly narrower than the widest part. A bed has a
 * headboard that stands well over a wider mattress or duvet, from the front, the side and in between; the
 * back of a sofa, chair or armchair gives way to arms or a seat much sooner.
 */
export function narrowTopFraction(view, limit = 0.86) {
  if (!view) return 0;
  const rows = rowWidthFractions(view);
  const first = rows.findIndex((w) => w > 0.02);
  if (first < 0) return 0;
  let last = rows.length - 1;
  while (last > first && rows[last] <= 0.02) last--;
  let n = 0;
  for (let y = first; y <= last && rows[y] <= limit; y++) n++;
  return n / (last - first + 1);
}

/**
 * Signs that a single outline is a bed: a headboard that is a good part of the height and stands over a
 * wide body, with the body solid down to the floor (or on short feet), seen from the front, the side or three
 * quarters. Needs the photo's own width to height ratio (the views are stretched to a square).
 * @param {number|null|undefined} aspect width of the piece divided by its height in the photo
 * @param {'front'|'side'} kind
 */
function bedOutline(view, aspect, kind) {
  if (!view) return false;
  const narrow = narrowTopFraction(view);
  if (narrow < 0.4) return false;
  if (measureTraits({ front: view }).gapFrac > 0.3) return false; // clear space under it: a chair or table
  const rows = rowWidthFractions(view);
  const mean = (part) => part.reduce((a, b) => a + b, 0) / Math.max(1, part.length);
  // An arched or scrolled crest is narrow at the very top: read the headboard where its body is. A very wide
  // outline (a sofa with a carved crest) is not read that way: beds seen from the front are not that wide
  const topMean = mean(rows.slice(0, Math.max(2, Math.round(view.size * 0.12))));
  const headW =
    aspect != null && aspect > 2.05
      ? topMean
      : Math.max(
          topMean,
          mean(rows.slice(Math.round(view.size * 0.2), Math.round(view.size * 0.34)))
        );
  if (kind === 'front') return headW >= 0.4 && (aspect == null || aspect >= 0.85);
  return aspect == null || aspect >= 1.45;
}

/**
 * A photo taken from an angle rather than straight on: the top of the piece sits well to one side (a bed
 * photographed from three quarters has its headboard at the back left or right). Its width to height ratio is
 * then not the piece's, so it should not set the size.
 */
export function isObliqueView(view) {
  if (!view) return false;
  const s = view.size;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < Math.round(s * 0.25); y++)
    for (let x = 0; x < s; x++)
      if (view.mask[y * s + x]) {
        sum += x / s;
        n++;
      }
  return n > 0 && Math.abs(sum / n - 0.5) > 0.12;
}

/**
 * Is the piece a bed? True when any of the photos shows the headboard-over-mattress outline, or the plan view
 * is bed-shaped (taller than wide) while no other photo says otherwise.
 * @param {{widthPerHeight?: number|null, depthPerHeight?: number|null, widthPerDepth?: number|null}} hints
 */
export function looksLikeBed(views, hints = {}, dims = null) {
  const front = views.front || views.back;
  const side = views.left || views.right;
  // The photo's own proportions when known, else those of the size in hand
  const wph = hints.widthPerHeight ?? (dims ? dims.widthCm / dims.heightCm : null);
  const dph = hints.depthPerHeight ?? (dims ? dims.depthCm / dims.heightCm : null);
  if (front && bedOutline(front, wph, 'front')) return true;
  // A carved, buttoned headboard rising in the middle of a piece that is not wider than a bed is one: a lifestyle
  // photo shows side tables and a rug that blur the outline, but not this
  if (front && (wph == null || wph <= 1.9)) {
    const head = bedHead(front);
    if (
      head &&
      head.crest &&
      head.buttoned &&
      head.framed &&
      head.headW &&
      head.headW <= 1.2 &&
      head.footWood >= 0.78
    )
      return true;
  }
  if (side && bedOutline(side, dph, 'side')) return true;
  // A plan view alone: a bed is the one big piece that is longer than it is wide, solid corner to corner
  if (views.top && !front && !side) {
    const wd = hints.widthPerDepth ?? (dims ? dims.widthCm / dims.depthCm : null);
    const fill = fillOf(views.top, [0, 0, 1, 1]) ?? 0;
    if (wd != null && wd >= 0.55 && wd <= 0.97 && fill >= 0.8 && !detectLShape(views.top))
      return true;
  }
  return false;
}

// ---------- one photo: guessing from the front view alone ----------

/**
 * Best guess of the type from a front (or back) view and its width-to-height ratio only, for when no side or
 * top photo says how deep the piece is. Cruder than classifyType, so the app presents it as a guess.
 * @param {number} wh the width of the piece divided by its height, from the photo
 */
export function classifyFromFront(front, wh) {
  if (bedOutline(front, wh, 'front')) return 'bed';
  const { gapFrac, slabFrac } = measureTraits({ front });
  const open = gapFrac > 0.3; // clear space under it: legs
  if (open) {
    if (wh <= 0.8) {
      // A back shows above the seat of a chair; a stool is a seat on legs
      const upper = fillOf(front, [0.2, 0.2, 0.8, 0.36], true) ?? 0;
      return upper >= 0.12 && slabFrac < 0.4 ? 'chair' : 'stool';
    }
    // Cushions and a back fill the upper half of a lounge chair; a table shows only its top there
    if (wh <= 1.6 && (fillOf(front, [0.25, 0.1, 0.75, 0.45]) ?? 0) >= 0.5) return 'lounge';
    if (wh >= 2.3) return 'coffee-table';
    return wh >= 1.75 ? 'table' : 'desk';
  }
  const seatSeam = findLines(front, 'y', [0.25, 0.3, 0.75, 0.8]).length >= 1;
  const soft = rolledArms(front)?.roll || tuftedBack(front) || seatSeam;
  if (soft && wh >= 0.85 && wh <= 3.4) return wh >= 1.32 ? 'sofa' : 'armchair';
  if (wh <= 0.9) {
    const shelves = findLines(front, 'y', [0.12, 0.03, 0.88, 0.97], 5).length;
    const seeThrough = front.open && (fillOf(front, [0.1, 0.1, 0.9, 0.9], true) ?? 1) < 0.72;
    if (seeThrough && wh <= 0.75) return 'etagere';
    return shelves >= 3 && wh <= 0.75 ? 'bookshelf' : wh <= 0.7 ? 'wardrobe' : 'nightstand';
  }
  return wh <= 1.3 ? 'nightstand' : 'cabinet';
}

/** Usual height and depth (cm) per type, to fill in what a single photo cannot show. */
const TYPICAL_HEIGHT_CM = {
  bed: 100,
  daybed: 80,
  'corner-sofa': 85,
  'tub-chair': 78,
  ottoman: 42,
  etagere: 170,
  sofa: 85,
  armchair: 85,
  lounge: 80,
  chair: 90,
  stool: 65,
  table: 75,
  'table-round': 75,
  'coffee-table': 45,
  desk: 75,
  wardrobe: 200,
  bookshelf: 180,
  cabinet: 80,
  nightstand: 55,
};
const TYPICAL_DEPTH_CM = {
  bed: 210,
  daybed: 95,
  'corner-sofa': 160,
  'tub-chair': 75,
  ottoman: 60,
  etagere: 35,
  sofa: 90,
  armchair: 85,
  lounge: 78,
  chair: 48,
  stool: 38,
  table: 90,
  'table-round': 100,
  'coffee-table': 55,
  desk: 60,
  wardrobe: 55,
  bookshelf: 30,
  cabinet: 45,
  nightstand: 40,
};

/**
 * A believable size when the photos fix only some of the three proportions: what they do show is kept, the rest
 * is the usual for the type.
 * @param {{widthPerHeight?: number|null, depthPerHeight?: number|null, widthPerDepth?: number|null}} known
 * @param {number} [widthCm] the width to build around (default: the type's usual one)
 */
export function inferDimensions(type, known = {}, widthCm = TYPICAL_WIDTH_CM[type] ?? 100) {
  const clampCm = (v) => Math.min(600, Math.max(5, Math.round(v)));
  const height = known.widthPerHeight
    ? widthCm / known.widthPerHeight
    : (TYPICAL_HEIGHT_CM[type] ?? 80);
  let depth = TYPICAL_DEPTH_CM[type] ?? 50;
  if (known.depthPerHeight) depth = height * known.depthPerHeight;
  else if (known.widthPerDepth) depth = widthCm / known.widthPerDepth;
  else if (type === 'table-round') depth = widthCm;
  return { widthCm: clampCm(widthCm), depthCm: clampCm(depth), heightCm: clampCm(height) };
}

/** How sure the detection can be, from which photos it had: 'good' (side and front), 'fair', or 'rough'. */
export function detectionConfidence(slots) {
  const has = (id) => slots.includes(id);
  const side = has('left') || has('right');
  const front = has('front') || has('back');
  if (side && front) return 'good';
  if (slots.length >= 2) return 'fair';
  return 'rough';
}

/**
 * Fills in a missing side photo with the mirror image of the one given (a piece is nearly always the same on
 * both sides). Photos are { width, height, rgba }; the copies carry `mirroredFrom` and never replace a real photo.
 * @returns {Record<string, object>} the photos by slot id, with the copies added
 */
export function withMirroredSides(photos) {
  const out = { ...photos };
  for (const [from, to] of [
    ['right', 'left'],
    ['left', 'right'],
  ]) {
    const src = photos[from];
    if (!src || photos[to]) continue;
    const rgba = new Uint8ClampedArray(src.rgba.length);
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const a = (y * src.width + x) * 4;
        const b = (y * src.width + (src.width - 1 - x)) * 4;
        rgba[b] = src.rgba[a];
        rgba[b + 1] = src.rgba[a + 1];
        rgba[b + 2] = src.rgba[a + 2];
        rgba[b + 3] = src.rgba[a + 3];
      }
    out[to] = { ...src, rgba, thumbUrl: undefined, mirroredFrom: from };
  }
  return out;
}

// ---------- palette ----------

/** Pillow count from the lighter peaks across the pillow band of the top view (or by bed width). */
function countPillows(top, widthCm) {
  const byWidth = widthCm < 110 ? 1 : widthCm < 170 ? 2 : 3;
  if (!top) return byWidth;
  const s = top.size;
  const cols = [];
  for (let x = 0; x < s; x++) {
    const px = regionPixels(top, x / s, 0.13, (x + 1) / s, 0.38);
    cols.push(px.length ? mean(px.map((c) => [luma(c), 0, 0]))[0] : 0);
  }
  const smooth = cols.map(
    (_, i) => mean(cols.slice(Math.max(0, i - 2), i + 3).map((v) => [v, 0, 0]))[0]
  );
  const peak = Math.max(...smooth);
  const low = Math.min(...smooth.filter((v) => v > 0));
  if (!(peak - low > 12)) return byWidth;
  const cut = low + (peak - low) * 0.55;
  let runs = 0;
  let inside = false;
  for (const v of smooth) {
    if (v >= cut && !inside) runs++;
    inside = v >= cut;
  }
  return Math.min(4, Math.max(byWidth, runs));
}

/**
 * A region of a bed's side view by where it lies along the bed: near the headboard or toward the foot. The side
 * photo may face either way, so the taller end is taken as the head.
 * @param {'head'|'foot'} part
 * @param {[number, number]} rows top and bottom of the region as fractions of the height
 */
function sideRegion(side, part, rows) {
  if (!side) return [0, 0, 0, 0];
  const p = Array.from(topProfile(side));
  const tallLeft = Math.max(...slice(p, 0, 0.2)) >= Math.max(...slice(p, 0.8, 1));
  const headSpan = part === 'head' ? [0.12, 0.45] : [0.55, 0.9];
  const [a, b] = tallLeft ? headSpan : [1 - headSpan[1], 1 - headSpan[0]];
  return [a, rows[0], b, rows[1]];
}

/**
 * Two colours that look like different cloth, leather or wood rather than one fabric in light and shadow: the
 * hue differs, or one is far darker or lighter than the other (a shaded arm is only a little darker).
 */
function differentMaterial(a, b) {
  const hue = (hex) => {
    const [r, g, bl] = hexRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, bl);
    const min = Math.min(r, g, bl);
    if (max - min < 0.05) return null; // grey: no hue
    const d = max - min;
    const h = max === r ? ((g - bl) / d + 6) % 6 : max === g ? (bl - r) / d + 2 : (r - g) / d + 4;
    return h / 6;
  };
  const [ha, hb] = [hue(a), hue(b)];
  if (ha !== null && hb !== null) {
    const dh = Math.abs(ha - hb);
    if (Math.min(dh, 1 - dh) > 0.06) return true;
  }
  const [la, lb] = [luma(hexRgb(a)), luma(hexRgb(b))];
  const ratio = la / Math.max(1, lb);
  return ratio < 0.5 || ratio > 2;
}

function paletteFor(type, views) {
  const F = views.front || views.back || views.right || views.left;
  const T = views.top;
  const all = objectMean(F) || FALLBACK.body;
  const palette = {};
  if (type === 'bed') {
    // Headboard seen from the foot: the upholstery colour; duvet and pillows from the plan view
    palette.body =
      pickColor(F, [0.2, 0.06, 0.8, 0.2]) || pickColor(T, [0.2, 0.0, 0.8, 0.08]) || all;
    // The base is its own colour when it differs from the headboard (a grey headboard on a wooden frame)
    const baseSeen = [
      pickColor(views.front || views.back, [0.25, 0.9, 0.75, 0.985]),
      pickColor(views.left || views.right, [0.2, 0.9, 0.8, 0.985]),
    ].filter(Boolean);
    const base = baseSeen.length ? toHex(mean(baseSeen.map(hexRgb))) : null;
    palette.base = base && colourGap(base, palette.body) > 14 ? base : palette.body;
    // The duvet is used as photographed: no brightening, so the colour stays faithful
    // It is read from every view that shows it: the plan view alone sits in the shadow of the foot
    const side = views.left || views.right;
    const seen = [
      pickColor(T, [0.2, 0.58, 0.8, 0.84]),
      pickColor(F, [0.2, 0.55, 0.8, 0.85]),
      pickColor(side, sideRegion(side, 'foot', [0.4, 0.62])),
    ].filter(Boolean);
    // The middle reading, so a view that also shows sheet or pillow in the region does not pull it light
    palette.accent = seen.length
      ? toHex([0, 1, 2].map((k) => median(seen.map((h) => hexRgb(h)[k]))).map((v) => v))
      : FALLBACK.accent;
    // White linen reads grey in the folds of a photo: the pillows and sheet are lifted toward what it is
    const pillowSeen =
      pickColor(T, [0.2, 0.13, 0.8, 0.38], 'linen') ||
      pickColor(views.front || views.back, [0.3, 0.26, 0.7, 0.5], 'brightest') ||
      pickColor(side, sideRegion(side, 'head', [0.1, 0.4]), 'linen');
    palette.pillow = linen(pillowSeen || FALLBACK.pillow);
    const sheet =
      pickColor(T, [0.25, 0.4, 0.75, 0.47], 'linen') ||
      pickColor(side, sideRegion(side, 'head', [0.3, 0.45]), 'linen');
    palette.sheet = sheet ? linen(sheet) : palette.pillow;
  } else if (type === 'lounge') {
    // Cushions from the middle of the front view; the frame from the posts and rails at the sides
    palette.cushion = pickColor(F, [0.3, 0.1, 0.7, 0.35]) || all;
    const wood = [
      pickColor(F, [0.0, 0.5, 0.12, 0.98], 'light'),
      pickColor(views.left || views.right, [0.1, 0.6, 0.9, 0.98], 'light'),
    ].filter(Boolean);
    palette.body = wood.length ? toHex(mean(wood.map(hexRgb))) : '#8a5a34';
    palette.leg = palette.body;
  } else if (type === 'tub-chair') {
    palette.body = pickColor(F, [0.15, 0.1, 0.85, 0.5]) || all;
    palette.cushion =
      pickColor(T, [0.3, 0.3, 0.7, 0.7]) || pickColor(F, [0.25, 0.5, 0.75, 0.75]) || palette.body;
    palette.leg = pickColor(F, [0.1, 0.94, 0.9, 1.0], 'dark') || FALLBACK.leg;
  } else if (type === 'ottoman') {
    palette.body = pickColor(T, [0.2, 0.2, 0.8, 0.8]) || pickColor(F, [0.1, 0.1, 0.9, 0.8]) || all;
    palette.leg = pickColor(F, [0.1, 0.92, 0.9, 1.0], 'dark') || shadeHex(palette.body, 0.5);
  } else if (type === 'daybed') {
    palette.body = pickColor(F, [0.05, 0.05, 0.95, 0.35]) || all;
    palette.cushion =
      pickColor(T, [0.2, 0.3, 0.8, 0.8]) || pickColor(F, [0.2, 0.45, 0.8, 0.7]) || palette.body;
    palette.accent = pickColor(T, [0.05, 0.1, 0.25, 0.9], 'light') || palette.cushion;
  } else if (type === 'etagere') {
    palette.body = pickColor(F, [0.02, 0.02, 0.98, 0.7], 'light') || all;
    palette.accent = pickColor(F, [0.1, 0.75, 0.9, 0.95]) || palette.body;
  } else if (type === 'sofa' || type === 'armchair' || type === 'corner-sofa') {
    palette.body = pickColor(F, [0.15, 0.1, 0.85, 0.4]) || all;
    palette.cushion =
      pickColor(T, [0.25, 0.4, 0.75, 0.85]) || pickColor(F, [0.2, 0.5, 0.8, 0.75]) || palette.body;
    palette.leg = pickColor(F, [0.1, 0.94, 0.9, 1.0], 'dark') || FALLBACK.leg;
    // Arms in a different cloth, leather or wood than the back are read from the ends of the front view
    const arms = [pickColor(F, [0.01, 0.42, 0.06, 0.78]), pickColor(F, [0.94, 0.42, 0.99, 0.78])]
      .filter(Boolean)
      .map(hexRgb);
    const arm = arms.length ? toHex(mean(arms)) : null;
    palette.arm = arm && differentMaterial(arm, palette.body) ? arm : palette.body;
  } else if (type === 'chair' || type === 'stool') {
    palette.body = pickColor(F, [0.15, 0.05, 0.85, 0.4]) || all;
    palette.cushion = pickColor(T, [0.2, 0.2, 0.8, 0.8]) || palette.body;
    palette.leg = pickColor(F, [0.0, 0.8, 1.0, 1.0], 'dark') || FALLBACK.leg;
  } else if (type === 'wardrobe' || type === 'bookshelf') {
    palette.body = pickColor(F, [0.1, 0.1, 0.9, 0.9]) || all;
  } else if (type === 'nightstand') {
    palette.body = pickColor(F, [0.1, 0.1, 0.9, 0.85]) || all;
    palette.leg = pickColor(F, [0.1, 0.9, 0.9, 1.0], 'dark') || shadeHex(palette.body, 0.5);
  } else if (type === 'cabinet') {
    palette.body = pickColor(F, [0.1, 0.3, 0.9, 0.9]) || all;
    palette.accent = pickColor(T, [0.1, 0.1, 0.9, 0.9]) || palette.body;
    palette.leg = pickColor(F, [0.05, 0.9, 0.95, 1.0], 'dark') || shadeHex(palette.body, 0.45);
  } else {
    // Tables, desks: top from the plan view, legs from the lower part of the front view
    palette.body =
      pickColor(T, [0.15, 0.15, 0.85, 0.85]) || pickColor(F, [0.1, 0.0, 0.9, 0.2]) || all;
    palette.accent = pickColor(F, [0.15, 0.2, 0.85, 0.4]) || palette.body;
    palette.leg =
      pickColor(F, [0.0, 0.7, 1.0, 1.0], 'dark') ||
      pickColor(F, [0.0, 0.6, 1.0, 1.0]) ||
      FALLBACK.leg;
  }
  return palette;
}

/**
 * The detected type for the views, sizes and measured traits (what buildDesign uses when none is forced).
 * A bed is recognised first, from its outline in any photo, so a headboard standing over a long mattress is
 * never taken for a sofa, a daybed or a cabinet whatever the view.
 */
function pickType(views, traits, dims, sizeKnown, hints) {
  const lone = views.front || views.back;
  const side = views.left || views.right;
  const frontOnly = lone && !views.left && !views.right && !views.top;
  if (!traits.lShape && looksLikeBed(views, hints, dims)) {
    // One photo: a bed outline the trained ranking finds very unlikely (a sideboard with a rug, say) is not taken
    const check = frontOnly
      ? rankFront(lone, hints.widthPerHeight || dims.widthCm / dims.heightCm)
      : null;
    if (!check || check.p < MIN_SURE || (check.prob.bed ?? 0) >= BED_VETO * check.p) return 'bed';
  }
  if (frontOnly) {
    const wh = hints.widthPerHeight || dims.widthCm / dims.heightCm;
    const rules = classifyFromFront(lone, wh);
    const ranked = rankFront(lone, wh);
    // The hand-written rules stay in charge unless the trained ranking finds their answer implausible
    if (!ranked || (ranked.prob[rules] ?? 0) >= RULE_TRUST * ranked.p) return rules;
    return ranked.top;
  }
  if (!lone && !views.top && side) {
    // Only a side view: its width is unknown, so assume the usual for a piece that deep
    const dph = hints.depthPerHeight;
    const known = dph ? { heightCm: 100, depthCm: dph * 100 } : dims;
    return classifyType(traits, { ...known, widthCm: known.depthCm * 1.25 }, false);
  }
  if (!lone && !side && views.top) return classifyFromTop(views.top, hints.widthPerDepth, traits);
  const rules = classifyType(traits, dims, sizeKnown);
  // Several photos: the trained ranking checks the rules' answer against all that the photos show
  // (a plan view that is round or L-shaped is direct evidence the ranking cannot overrule)
  if (lone && !traits.round && !traits.lShape) {
    const ranked = rankMulti(views, knownProportions(views, hints, dims), traits);
    if (ranked && ranked.p >= MIN_SURE_MULTI && (ranked.prob[rules] ?? 0) < MULTI_TRUST * ranked.p)
      return ranked.top;
  }
  return rules;
}

/**
 * Best guess from a plan view alone: round, L-shaped, long and narrow, deep and narrow or squarish. A guess
 * only; the app offers the other likely types beside it.
 * @param {number|null|undefined} wd width of the piece divided by its depth in the photo
 */
export function classifyFromTop(top, wd, traits = measureTraits({ top })) {
  const ratio = wd || 1;
  if (traits.lShape) return 'corner-sofa';
  if (traits.round && ratio > 0.8 && ratio < 1.25) return 'table-round';
  if (ratio <= 0.97 && ratio >= 0.55 && (fillOf(top, [0, 0, 1, 1]) ?? 0) >= 0.8) return 'bed';
  // Arms at the ends show as a change of colour or texture; a table top is one surface
  const edge = pickColor(top, [0.02, 0.3, 0.07, 0.85]);
  const inner = pickColor(top, [0.2, 0.5, 0.8, 0.85]);
  const armed = edge && inner && colourGap(edge, inner) > 14;
  if (ratio >= 2.2 || (ratio >= 1.45 && armed)) return 'sofa';
  if (ratio >= 1.7) return 'table';
  return ratio >= 0.8 && ratio <= 1.25 ? 'armchair' : 'table';
}

/** Types most often mistaken for each other, in order of likelihood: pads out the "Looks like" choices. */
const NEIGHBORS = {
  bed: ['daybed', 'sofa'],
  daybed: ['sofa', 'bed', 'ottoman'],
  sofa: ['corner-sofa', 'daybed', 'armchair'],
  'corner-sofa': ['sofa', 'daybed'],
  armchair: ['tub-chair', 'sofa', 'lounge'],
  'tub-chair': ['armchair', 'ottoman', 'chair'],
  lounge: ['armchair', 'chair'],
  chair: ['stool', 'lounge', 'armchair'],
  stool: ['chair', 'ottoman', 'table-round'],
  ottoman: ['stool', 'coffee-table', 'nightstand'],
  table: ['desk', 'coffee-table'],
  'table-round': ['table', 'stool', 'coffee-table'],
  'coffee-table': ['ottoman', 'table', 'desk'],
  desk: ['table', 'cabinet'],
  wardrobe: ['cabinet', 'bookshelf'],
  bookshelf: ['etagere', 'wardrobe', 'cabinet'],
  etagere: ['bookshelf', 'cabinet'],
  cabinet: ['nightstand', 'bookshelf', 'ottoman'],
  nightstand: ['cabinet', 'ottoman', 'stool'],
};

/**
 * The likeliest types for the photos, best first, found by re-running the detection with the sizes and
 * measurements nudged a little: a piece whose answer survives the nudging is a sure thing, one that flips
 * is a toss-up between the types it flips to.
 * @returns {{ list: string[], agreement: number }} up to three type ids, and how steady the first one was (0-1)
 */
export function typeCandidates(views, dims, sizeKnown = true, hints = {}, chosen = null) {
  const traits = measureTraits(views);
  const primary = TYPE_IDS.has(chosen) ? chosen : pickType(views, traits, dims, sizeKnown, hints);
  // One photo and nothing else: the trained ranking of the silhouette adds its own list and certainty
  const lone = views.front || views.back;
  const ranking =
    lone && !views.left && !views.right && !views.top
      ? rankFront(lone, hints.widthPerHeight || dims.widthCm / dims.heightCm)
      : null;
  const votes = new Map([[primary, 1]]);
  let total = 1;
  const tally = (type) => {
    total++;
    votes.set(type, (votes.get(type) || 0) + 1);
  };
  const scale = (k) => ({
    widthCm: dims.widthCm * k[0],
    depthCm: dims.depthCm * k[1],
    heightCm: dims.heightCm * k[2],
  });
  const sizes = [
    [0.8, 1, 1],
    [1.25, 1, 1],
    [1, 0.8, 1],
    [1, 1.25, 1],
    [1, 1, 0.8],
    [1, 1, 1.25],
  ];
  for (const k of sizes) tally(pickType(views, traits, scale(k), sizeKnown, hints));
  for (const t of [
    { ...traits, gapFrac: traits.gapFrac * 0.6 },
    { ...traits, gapFrac: traits.gapFrac * 1.5 },
    { ...traits, rise: traits.rise * 0.8 },
    { ...traits, rise: traits.rise * 1.25 },
  ])
    tally(pickType(views, t, dims, sizeKnown, hints));
  if (hints.widthPerHeight)
    for (const k of [0.85, 1.18])
      tally(
        pickType(views, traits, dims, sizeKnown, {
          ...hints,
          widthPerHeight: hints.widthPerHeight * k,
        })
      );
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const list = [primary, ...ranked.filter((t) => t !== primary)];
  for (const n of NEIGHBORS[primary] || []) if (!list.includes(n)) list.push(n);
  const agreement = (votes.get(primary) || 1) / total;
  if (ranking) {
    const byProb = Object.keys(ranking.prob).sort((x, y) => ranking.prob[y] - ranking.prob[x]);
    const second = byProb.find((t) => t !== primary);
    return {
      list: [...new Set([primary, second, ...list])].slice(0, 3),
      agreement: (agreement + (ranking.prob[primary] ?? 0.1)) / 2,
    };
  }
  return { list: list.slice(0, 3), agreement };
}

/**
 * Builds the design record from the prepared views and the real size.
 * @param {Record<string, {mask: Uint8Array, rgb: Uint8Array, size: number}>} views by slot id
 * @param {{widthCm:number, depthCm:number, heightCm:number}} dims
 * @param {string} [forceType] a type id chosen by the user; otherwise it is detected
 * @param {{widthPerHeight?: number|null}} [hints] proportions read from the photos, for a lone front view
 */
export function buildDesign(views, dims, forceType, sizeKnown = true, hints = {}) {
  const traits = measureTraits(views);
  const type = TYPE_IDS.has(forceType)
    ? forceType
    : pickType(views, traits, dims, sizeKnown, hints);
  const palette = paletteFor(type, views);
  const out = { v: 1, type, palette, traits: {} };
  if (type === 'bed') {
    out.traits.pillows = countPillows(views.top, dims.widthCm);
    // How high the covers sit compared with the headboard decides how deep the base is
    out.traits.bodyFrac = Math.round(Math.min(0.9, Math.max(0.25, traits.bodyFrac)) * 100) / 100;
    out.traits.legs = traits.gapFrac > 0.08 ? 1 : 0;
  }
  Object.assign(out.traits, detectStructure(type, views, dims));
  const extras = classicExtras(type, views, palette, out.traits);
  Object.assign(out.palette, extras.palette);
  Object.assign(out.traits, extras.traits);
  return out;
}

// ---------- ornate and framed pieces (carved wood, leather panels, gold trim, cane) ----------

const hexRgbSafe = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Hue (0-360), HSV saturation and value (0-1) of an [r, g, b] colour. */
function hsv([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

/**
 * Lit cloth, wood and leather look darker once drawn with the preview's lighting than in the photo they were read
 * from: brings a colour back up in value (dark colours most) and keeps its hue and saturation.
 */
function liftTone(hex, k = 1.22) {
  const [h, sat, v] = hsv(hexRgbSafe(hex));
  const hi = Math.min(1, v < 0.35 ? v * (k + 0.2) : v * k);
  const c = hi * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = hi - c;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Warm brown of stained or polished wood (not grey, not a bright fabric). */
function woodLike(rgb) {
  const [h, s, v] = hsv(rgb);
  return h >= 8 && h <= 48 && s >= 0.3 && s <= 0.9 && v >= 0.18 && v <= 0.85;
}

/** Gold or brass carving and trim: a saturated yellow, brighter than wood, more saturated than cream cloth. */
function goldTrim(view) {
  if (!view) return null;
  const s = view.size;
  const gold = [];
  let count = 0;
  for (let p = 0; p < s * s; p++) {
    if (!view.mask[p]) continue;
    count++;
    const c = [view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]];
    const [h, sat, v] = hsv(c);
    if (h >= 36 && h <= 54 && sat >= 0.5 && v >= 0.55) gold.push(c);
  }
  return count && gold.length / count >= 0.006 ? toHex(mean(gold)) : null;
}

function smoothProfile(prof) {
  const out = new Float32Array(prof.length);
  for (let x = 0; x < prof.length; x++) {
    let sum = 0;
    let n = 0;
    for (let d = -1; d <= 1; d++) {
      const i = x + d;
      if (i >= 0 && i < prof.length) {
        sum += prof[i];
        n++;
      }
    }
    out[x] = sum / n;
  }
  return out;
}

/**
 * The crest of a backrest or headboard from the outline: how much the middle stands above the shoulders (a flat top
 * has none), and whether the rise is one smooth arch or has scrolls (several bumps).
 * @returns {{ crest: 0|1|2, span: [number, number], peak: number, shoulder: number } | null}
 */
export function crestOf(view) {
  const s = view.size;
  const prof = smoothProfile(topProfile(view));
  const max = Math.max(...prof);
  if (max < 0.3) return null;
  const c = Math.round(s / 2);
  const thr = max * 0.7;
  let a = c;
  let b = c;
  while (a > 0 && prof[a - 1] >= thr) a--;
  while (b < s - 1 && prof[b + 1] >= thr) b++;
  const w = b - a + 1;
  if (w < s * 0.25) return null;
  const med = (lo, hi) =>
    median(Array.from(prof.slice(Math.round(a + w * lo), Math.round(a + w * hi) + 1)));
  const shoulder = (med(0.04, 0.2) + med(0.8, 0.96)) / 2;
  const peak = Math.max(
    ...Array.from(prof.slice(Math.round(a + w * 0.3), Math.round(a + w * 0.7) + 1))
  );
  let crest = 0;
  if (peak - shoulder >= 0.07) {
    let bumps = 0;
    for (let x = Math.round(a + w * 0.15); x < Math.round(a + w * 0.85); x++)
      if (prof[x] > prof[x - 2] + 0.012 && prof[x] >= prof[x + 2] + 0.012) bumps++;
    crest = bumps >= 3 ? 2 : 1;
  }
  return { crest, span: [a, b], peak, shoulder };
}

/**
 * A carved or framed headboard: its crest, the wood of the frame and the panel set in it (leather, cloth), and
 * whether the panel is buttoned. Null when the view shows no such headboard.
 */
export function bedHead(F) {
  if (!F) return null;
  const info = crestOf(F);
  if (!info) return null;
  const s = F.size;
  const [a, b] = info.span;
  const w = b - a + 1;
  const wood = pickColor(F, [0.28, 0.66, 0.72, 0.84], 'light');
  const x0 = (a + w * 0.3) / s;
  const x1 = (a + w * 0.7) / s;
  const y0 = 1 - info.peak + 0.12;
  const panel = pickColor(F, [x0, y0, x1, y0 + 0.18]);
  const buttoned = tuftedBack(F, [x0, y0, x1, y0 + 0.2]);
  // Leather is one even tone with buttons; printed cloth varies much more across the same area
  const lum = regionPixels(F, x0, y0, x1, y0 + 0.18, true).map(luma);
  const mu = lum.reduce((a, b) => a + b, 0) / Math.max(1, lum.length);
  const variance =
    Math.sqrt(lum.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(1, lum.length)) /
    Math.max(1, mu);
  // The row at three quarters height: how wide the base of the bed is around the middle
  const row = Math.round(s * 0.74);
  let l = Math.round(s / 2);
  let r = l;
  while (l > 0 && F.mask[row * s + l - 1]) l--;
  while (r < s - 1 && F.mask[row * s + r + 1]) r++;
  const bodyW = (r - l + 1) / s;
  // A wood frame: warm, saturated wood around a panel of another material (not a grey bed whose parts differ in tone)
  // A bed's foot end is a wide wooden board; a sofa's lower half is cloth (seat cushions, arms) above a wood rail
  const lower = regionPixels(F, 0.12, 0.66, 0.88, 0.86, true);
  const footWood = lower.length ? lower.filter(woodLike).length / lower.length : 0;
  const framed = Boolean(
    panel &&
    wood &&
    woodLike(hexRgbSafe(wood)) &&
    ((colourGap(panel, wood) > 14 && (buttoned || info.crest)) || (buttoned && info.crest > 0))
  );
  return {
    crest: info.crest,
    framed,
    buttoned,
    variance,
    footWood,
    wood,
    panel,
    headW: bodyW > 0.3 ? w / s / bodyW : null,
  };
}

/**
 * Exposed wood on an upholstered sofa or armchair, and what goes with it: the frame colour, carved crest, gold
 * trim, cane side panels, scatter cushions and patterned cloth. Null for plain upholstery on feet.
 */
function seatClassic(F, body, type) {
  if (!F || !body) return null;
  const bodyRgb = hexRgbSafe(body);
  const band = regionPixels(F, 0.12, 0.66, 0.88, 0.9, true);
  if (band.length < 20) return null;
  const woods = band.filter(woodLike);
  const woodFrac = woods.length / band.length;
  // The frame's own colour is its darker half (highlights on a glossy rail and cane or cloth near it are lighter)
  const woodsDark = [...woods]
    .sort((a, b) => luma(a) - luma(b))
    .slice(0, Math.ceil(woods.length / 2));
  const frameHex = woodsDark.length ? toHex(mean(woodsDark)) : null;
  // The wood must be a clear band of its own along the base, in a different material from the cloth
  const exposed = frameHex && woodFrac >= 0.3 && colourGap(frameHex, body) > 34;
  let gold = goldTrim(F);
  const info = crestOf(F);
  // Carving this fine does not survive a small view: a carved crest on gold brocade comes with gilded carving
  if (!gold && exposed && info && info.crest) {
    const [h, sat, v] = hsv(bodyRgb);
    if (h >= 28 && h <= 54 && sat >= 0.25 && v >= 0.6) gold = '#c9a24a';
  }
  if (!exposed && !gold) return null;
  const out = { frame: info && info.crest ? 2 : 1, wood: frameHex || null, trim: gold };
  // Cane: pale warm weave on the arms or sides, unlike the cloth. Counted per pixel: the weave sits between
  // dark rails, so a mean colour over the side would hide it
  const side = [
    ...regionPixels(F, 0.0, 0.45, 0.2, 0.9, true),
    ...regionPixels(F, 0.8, 0.45, 1.0, 0.9, true),
  ];
  if (side.length > 12) {
    const caney = side.filter((c) => {
      const [h, sat, v] = hsv(c);
      return h >= 26 && h <= 54 && sat >= 0.2 && sat <= 0.62 && v >= 0.55;
    });
    const share = caney.length / side.length;
    out.cane = share >= 0.3 && colourGap(toHex(mean(caney)), body) > 30;
    if (out.cane) out.caneColor = toHex(mean(caney));
  }
  // A cane-sided chair has a plain wood frame: its cushions rise above the rail but nothing is carved
  if (out.cane) out.frame = 1;
  // Scatter cushions: seams across the upper back show one cushion per seat plus the loose ones in front
  const seams = findLines(F, 'x', [0.15, 0.3, 0.85, 0.52], 3).length;
  // (Only a carved set is dressed with several; a plain framed sofa shows just its own back cushions.)
  out.scat = out.frame === 2 ? Math.max(2, Math.min(4, seams + 1)) : type === 'armchair' ? 1 : 0;
  // Printed cloth varies a lot within a small region
  const cloth = regionPixels(F, 0.25, 0.3, 0.75, 0.6, true).map(luma);
  if (cloth.length > 40) {
    const mu = cloth.reduce((x, y) => x + y, 0) / cloth.length;
    const sd = Math.sqrt(cloth.reduce((x, y) => x + (y - mu) ** 2, 0) / cloth.length);
    out.pat = sd / Math.max(1, mu) > 0.14 && bodyRgb[0] > 90;
  }
  return out;
}

/** Palette and trait extras for ornate pieces, merged into a design record. Empty for plain ones. */
function classicExtras(type, views, palette, traits = {}) {
  const F = views.front || views.back || null;
  const out = { palette: {}, traits: {} };
  if (!F) return out;
  if (type === 'bed') {
    const head = bedHead(F);
    if (head && (head.crest || head.framed)) {
      out.traits.crest = head.crest;
      if (head.framed) {
        out.traits.framed = 1;
        if (head.buttoned && traits.head !== 'slat') out.traits.head = 'tufted';
        // Lit wood and leather look darker once drawn with the preview's lighting: lift them back to the photo's tone
        const lift = liftTone;
        out.palette.body = lift(head.wood);
        out.palette.base = lift(head.wood);
        out.palette.panel = lift(head.panel);
      }
      out.traits.foot = 2;
      if (head.headW)
        out.traits.headW = Math.round(Math.min(1.15, Math.max(0.7, head.headW)) * 20) / 20;
      if (measureTraits({ front: F }).gapFrac > 0.05) out.traits.legs = 2;
    }
  } else if (type === 'sofa' || type === 'armchair') {
    const seat = seatClassic(F, palette.body, type);
    if (seat) {
      out.traits.frame = seat.frame;
      if (seat.trim) out.traits.trim = 1;
      if (seat.cane) out.traits.cane = 1;
      if (seat.pat) out.traits.pat = 1;
      if (seat.trim && seat.frame === 2) out.traits.cab = 1;
      out.traits.scat = seat.scat;
      if (seat.wood) {
        out.palette.frame = seat.wood;
        out.palette.leg = seat.wood;
      }
      if (seat.trim) out.palette.trim = seat.trim;
      for (const key of ['body', 'cushion', 'arm'])
        if (palette[key]) out.palette[key] = liftTone(palette[key]);
      if (seat.cane) {
        // The cloth of a cane chair is its cushions: read it from what is neither wood nor cane
        const cloth = regionPixels(F, 0.05, 0.05, 0.95, 0.7, true).filter((c) => {
          const [h, sat, v] = hsv(c);
          const caney = h >= 26 && h <= 54 && sat >= 0.2 && sat <= 0.62 && v >= 0.55;
          return !woodLike(c) && !caney;
        });
        if (cloth.length > 15) {
          // the cushion colour is the richer part of what is left; deep shadow between the rails is not
          const chroma = (c) => Math.max(...c) - Math.min(...c);
          const rich = [...cloth]
            .sort((a, b) => chroma(b) - chroma(a))
            .slice(0, Math.ceil(cloth.length * 0.4));
          const tone = liftTone(toHex(mean(rich)));
          out.palette.body = tone;
          out.palette.cushion = tone;
          out.palette.arm = tone;
        }
      }
    }
  } else if (type === 'coffee-table') {
    const gold = goldTrim(F);
    if (gold) {
      out.traits.trim = 1;
      out.traits.cab = 1;
      out.palette.trim = gold;
      out.palette.frame = palette.leg || shadeHex(palette.body, 0.9);
    }
  }
  return out;
}

// ---------- storage ----------

const HEADBOARDS = ['flat', 'panel', 'channel', 'tufted', 'slat'];
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

const num = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Validates a design from storage, a share link or a file; returns null when it is not usable. */
export function sanitizeDesign(raw) {
  if (!raw || typeof raw !== 'object' || !TYPE_IDS.has(raw.type)) return null;
  const palette = {};
  // Only the colours this type uses are kept, which keeps shared records short
  const slots = new Set(['body', ...(PALETTE_SLOTS[raw.type] || []).map(([key]) => key)]);
  for (const key of slots) {
    const v = raw.palette?.[key];
    if (typeof v === 'string' && HEX.test(v)) palette[key] = v.toLowerCase();
  }
  if (!palette.body) palette.body = FALLBACK.body;
  const t = raw.traits || {};
  const traits = {};
  if (raw.type === 'bed') {
    traits.pillows = Math.round(num(t.pillows, 1, 4, 2));
    traits.bodyFrac = num(t.bodyFrac, 0.25, 0.9, 0.55);
    traits.legs = t.legs === 2 ? 2 : t.legs ? 1 : 0;
    // Older designs only knew channel stitching
    traits.head = oneOf(t.head, HEADBOARDS, t.channels ? 'channel' : 'panel');
    traits.channels = traits.head === 'channel' ? 1 : 0;
    // Details beyond the basics are kept only when they differ from the usual, so records stay small and
    // older beds look as they did
    const headW = num(t.headW, 0.7, 1.15, 1);
    if (headW !== 1) traits.headW = Math.round(headW * 20) / 20;
    const lumbar = t.lumbar === undefined ? traits.pillows >= 2 : Boolean(t.lumbar);
    if (lumbar !== traits.pillows >= 2) traits.lumbar = lumbar ? 1 : 0;
    if (t.fold === 0) traits.fold = 0;
    for (const key of ['throw', 'store', 'skirt', 'framed']) if (t[key]) traits[key] = 1;
    if (t.foot) traits.foot = t.foot === 2 ? 2 : 1;
    const crest = Math.round(num(t.crest, 0, 2, 0));
    if (crest) traits.crest = crest;
    if (t.tiers) traits.tiers = 1;
  } else if (raw.type === 'corner-sofa') {
    traits.side = oneOf(t.side, ['left', 'right'], 'right');
    traits.seats = Math.round(num(t.seats, 1, 4, 2));
    traits.arm = num(t.arm, 0.04, 0.2, 0.08);
    traits.tufted = t.tufted ? 1 : 0;
    traits.taper = t.taper ? 1 : 0;
  } else if (raw.type === 'tub-chair') {
    traits.plan = oneOf(t.plan, ['round', 'bucket'], 'round');
    traits.base = oneOf(t.base, ['feet', 'legs', 'pedestal'], 'feet');
    traits.tufted = t.tufted ? 1 : 0;
  } else if (raw.type === 'ottoman') {
    traits.shape = oneOf(t.shape, ['square', 'round'], 'square');
    traits.tufted = t.tufted ? 1 : 0;
    traits.feet = oneOf(t.feet, ['none', 'short', 'tall'], 'short');
  } else if (raw.type === 'daybed') {
    traits.back = oneOf(t.back, ['panel', 'slat', 'none'], 'panel');
    traits.ends = t.ends === 1 || t.ends === 0 ? t.ends : 2;
  } else if (raw.type === 'etagere') {
    traits.shelves = Math.round(num(t.shelves, 2, 7, 4));
    traits.cols = Math.round(num(t.cols, 1, 4, 1));
    traits.base = oneOf(t.base, ['open', 'doors', 'drawers'], 'open');
    traits.back = t.back === 0 ? 0 : 1;
  } else if (raw.type === 'stool') {
    // Stools drawn before these options existed keep their original look (no traits at all)
    if (t.seat !== undefined) {
      traits.seat = oneOf(t.seat, ['round', 'square'], 'round');
      traits.back = t.back ? 1 : 0;
      traits.rest = t.rest ? 1 : 0;
    }
  } else if (raw.type === 'cabinet') {
    if (t.front !== undefined) {
      traits.front = oneOf(t.front, ['doors', 'drawers', 'mixed'], 'doors');
      traits.n = Math.round(num(t.n, 1, 5, 2));
      traits.legs = t.legs ? 1 : 0;
    }
  } else if (raw.type === 'sofa') {
    traits.seats = Math.round(num(t.seats, 1, 5, 3));
    traits.arm = num(t.arm, 0.04, 0.2, 0.1);
    traits.roll = t.roll ? 1 : 0;
    traits.tufted = t.tufted ? 1 : 0;
    traits.taper = t.taper ? 1 : 0;
    traits.longSeat = t.longSeat ? 1 : 0; // older designs have none: separate seat cushions
    if (t.frame || t.cane) {
      traits.frame = t.frame === 2 ? 2 : 1;
      for (const key of ['trim', 'cane', 'pat', 'cab']) if (t[key]) traits[key] = 1;
      traits.scat = Math.round(num(t.scat, 0, 4, 0));
    }
  } else if (raw.type === 'armchair') {
    traits.arm = num(t.arm, 0.04, 0.22, 0.17);
    traits.roll = t.roll ? 1 : 0;
    traits.tufted = t.tufted ? 1 : 0;
    traits.taper = t.taper ? 1 : 0;
    if (t.frame || t.cane) {
      traits.frame = t.frame === 2 ? 2 : 1;
      for (const key of ['trim', 'cane', 'pat', 'cab']) if (t[key]) traits[key] = 1;
      traits.scat = Math.round(num(t.scat, 0, 4, 0));
    }
  } else if (raw.type === 'lounge') {
    traits.slats = Math.round(num(t.slats, 2, 5, 3));
  } else if (raw.type === 'wardrobe') {
    traits.doors = Math.round(num(t.doors, 1, 6, 2));
  } else if (raw.type === 'bookshelf') {
    traits.shelves = Math.round(num(t.shelves, 2, 8, 4));
  } else if (raw.type === 'nightstand') {
    traits.drawers = Math.round(num(t.drawers, 1, 4, 2));
  } else if (raw.type === 'chair') {
    traits.back = ['solid', 'slat', 'open'].includes(t.back) ? t.back : 'slat';
  } else if (['table', 'coffee-table', 'desk'].includes(raw.type)) {
    traits.legFrac = num(t.legFrac, 0.02, 0.12, 0.05);
    traits.roundLegs = t.roundLegs ? 1 : 0;
    // Top thickness in cm, kept only when it is not the usual 3.5, so older tables look as they did
    const topH = Math.round(num(t.topH, 2, 8, 3.5) * 2) / 2;
    if (topH !== 3.5) traits.topH = topH;
    if (raw.type === 'coffee-table') for (const key of ['trim', 'cab']) if (t[key]) traits[key] = 1;
  }
  return { v: 1, type: raw.type, palette, traits };
}

/** The catalog's main colour for a design (what the colour picker shows as the original). */
export function designMainColor(design) {
  return design?.palette?.body || FALLBACK.body;
}

/**
 * What a photo-made piece offers to small items resting on it (a laptop on a desk, a lamp on a nightstand),
 * from its type: tables, desks and cabinets have a flat top; a bed has a soft one.
 */
export function supportTraitsFor(design) {
  const type = design?.type;
  if (type === 'bed') return { supportsTop: true, supportKind: 'soft', surfaceHeightCm: 46 };
  if (
    ['sofa', 'armchair', 'lounge', 'corner-sofa', 'tub-chair', 'daybed', 'ottoman'].includes(type)
  )
    return {
      supportsTop: true,
      supportKind: 'soft',
      surfaceHeightCm: type === 'ottoman' ? 40 : 44,
    };
  if (
    ['table', 'table-round', 'coffee-table', 'desk', 'cabinet', 'nightstand', 'etagere'].includes(
      type
    )
  )
    return { supportsTop: true };
  return {};
}
