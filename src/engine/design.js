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

export const DESIGN_TYPES = [
  { id: 'bed', label: 'Bed' },
  { id: 'sofa', label: 'Sofa' },
  { id: 'armchair', label: 'Armchair' },
  { id: 'chair', label: 'Chair' },
  { id: 'stool', label: 'Stool' },
  { id: 'table', label: 'Dining table' },
  { id: 'table-round', label: 'Round table' },
  { id: 'coffee-table', label: 'Coffee table' },
  { id: 'desk', label: 'Desk' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'bookshelf', label: 'Bookshelf' },
  { id: 'cabinet', label: 'Cabinet or sideboard' },
  { id: 'nightstand', label: 'Nightstand or chest' },
];

/** A usual real width per type, used when the user has not entered a size (photos only give proportions). */
export const TYPICAL_WIDTH_CM = {
  bed: 160,
  sofa: 200,
  armchair: 85,
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

/** Colour slots each type exposes (label shown to the user), in palette order. */
export const PALETTE_SLOTS = {
  bed: [
    ['body', 'Frame and headboard'],
    ['accent', 'Duvet'],
    ['pillow', 'Pillows'],
  ],
  sofa: [
    ['body', 'Body'],
    ['cushion', 'Cushions'],
    ['leg', 'Feet'],
  ],
  armchair: [
    ['body', 'Body'],
    ['cushion', 'Cushions'],
    ['leg', 'Feet'],
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
  ],
  nightstand: [
    ['body', 'Body'],
    ['leg', 'Feet'],
  ],
};

const TYPE_IDS = new Set(DESIGN_TYPES.map((t) => t.id));
const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK = {
  body: '#8a7a6a',
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
const mean = (list) => {
  const out = [0, 0, 0];
  for (const c of list) for (let k = 0; k < 3; k++) out[k] += c[k] / list.length;
  return out;
};

/** Colours of object pixels inside a region given in 0-1 view fractions. */
function regionPixels(view, x0, y0, x1, y1) {
  if (!view) return [];
  const s = view.size;
  const out = [];
  // The mask with its gaps open, when there is one: colours of the piece, not of what shows through it
  const mask = view.open || view.mask;
  for (let y = Math.floor(y0 * s); y < Math.ceil(y1 * s); y++) {
    for (let x = Math.floor(x0 * s); x < Math.ceil(x1 * s); x++) {
      const p = y * s + x;
      if (mask[p]) out.push([view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]]);
    }
  }
  return out;
}

function pickColor(view, region, mode = 'mean') {
  const px = regionPixels(view, ...region);
  if (px.length < 6) return null;
  if (mode === 'mean') return toHex(mean(px));
  px.sort((a, b) => luma(a) - luma(b));
  const n = Math.max(3, Math.round(px.length * 0.4));
  return toHex(mean(mode === 'light' ? px.slice(-n) : px.slice(0, n)));
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
  if (front) {
    const bottom = bottomProfile(front);
    gapFrac = 1 - median(slice(bottom, 0.3, 0.7));
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
  if (views.top) {
    const s = views.top.size;
    let n = 0;
    for (let p = 0; p < s * s; p++) n += views.top.mask[p];
    const fill = n / (s * s);
    round = fill > 0.7 && fill < 0.85;
  }
  return { rise, tallEnd, bodyFrac, gapFrac, slabFrac, round };
}

/**
 * Best guess of what the piece is from the proportions of its three sizes and the measured shape. Ratios
 * are used so the guess does not depend on a real size having been entered yet.
 * @param {{widthCm:number, depthCm:number, heightCm:number}} dims
 */
export function classifyType(traits, dims, sizeKnown = true) {
  const { widthCm: w, depthCm: d, heightCm: h } = dims;
  const { rise, gapFrac, round } = traits;
  const backed = rise >= 1.25;
  const open = gapFrac > 0.3; // clear space under it: legs
  const wh = w / h;
  const dh = d / h;
  if (backed && !open) {
    if (dh >= 1.5) return 'bed';
    return w / d >= 1.45 ? 'sofa' : 'armchair';
  }
  if (backed && open) return wh <= 1.05 && dh <= 1.05 ? 'chair' : dh >= 1.5 ? 'bed' : 'sofa';
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
  if (tall) return thin ? 'bookshelf' : 'wardrobe';
  if (sizeKnown ? h >= 90 && d <= 40 : h / w >= 0.9 && h / d >= 2.4) return 'bookshelf';
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
  } else if (type === 'nightstand') {
    const lines = F ? findLines(F, 'y', [0.15, 0.05, 0.85, 0.9], 5).length : 0;
    out.drawers = lines ? clampInt(lines + 1, 1, 4) : 2;
  } else if (type === 'chair') {
    const fill = F ? fillOf(F, [0.22, 0.14, 0.78, 0.3], true) : null;
    out.back = fill === null ? 'slat' : fill >= 0.8 ? 'solid' : fill >= 0.12 ? 'slat' : 'open';
  } else if (type === 'sofa' || type === 'armchair') {
    const arm = armFraction(T, type === 'sofa' ? 0.1 : 0.17);
    out.arm = round2(Math.min(0.2, Math.max(0.04, arm)));
    if (type === 'sofa') {
      const seams = F ? findLines(F, 'x', [0.05, 0.5, 0.95, 0.76]).length : 0;
      const inner = w * (1 - 2 * out.arm);
      const lo = clampInt(Math.ceil(inner / 1.1), 1, 5);
      const hi = clampInt(Math.floor(inner / 0.45), lo, 5);
      out.seats = seams ? clampInt(seams + 1, lo, hi) : clampInt(inner / 0.7, lo, hi);
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
  } else if (type === 'bed' && F) {
    out.channels = findLines(F, 'x', [0.1, 0.06, 0.9, 0.2]).length >= 2 ? 1 : 0;
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

function paletteFor(type, views) {
  const F = views.front || views.back || views.right || views.left;
  const T = views.top;
  const all = objectMean(F) || FALLBACK.body;
  const palette = {};
  if (type === 'bed') {
    // Headboard seen from the foot: the upholstery colour; duvet and pillows from the plan view
    palette.body =
      pickColor(F, [0.2, 0.06, 0.8, 0.2]) || pickColor(T, [0.2, 0.0, 0.8, 0.08]) || all;
    // The duvet is used as photographed: no brightening, so the colour stays faithful
    // It is read from every view that shows it: the plan view alone sits in the shadow of the foot
    const seen = [
      pickColor(T, [0.2, 0.58, 0.8, 0.84]),
      pickColor(F, [0.2, 0.55, 0.8, 0.85]),
      views.left ? pickColor(views.left, [0.5, 0.3, 0.9, 0.65]) : null,
      views.right ? pickColor(views.right, [0.1, 0.3, 0.5, 0.65]) : null,
    ].filter(Boolean);
    palette.accent = seen.length ? toHex(mean(seen.map(hexRgb))) : FALLBACK.accent;
    palette.pillow = pickColor(T, [0.2, 0.13, 0.8, 0.38], 'light') || FALLBACK.pillow;
  } else if (type === 'sofa' || type === 'armchair') {
    palette.body = pickColor(F, [0.15, 0.1, 0.85, 0.4]) || all;
    palette.cushion =
      pickColor(T, [0.25, 0.4, 0.75, 0.85]) || pickColor(F, [0.2, 0.5, 0.8, 0.75]) || palette.body;
    palette.leg = pickColor(F, [0.1, 0.94, 0.9, 1.0], 'dark') || FALLBACK.leg;
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
 * Builds the design record from the prepared views and the real size.
 * @param {Record<string, {mask: Uint8Array, rgb: Uint8Array, size: number}>} views by slot id
 * @param {{widthCm:number, depthCm:number, heightCm:number}} dims
 * @param {string} [forceType] a type id chosen by the user; otherwise it is detected
 */
export function buildDesign(views, dims, forceType, sizeKnown = true) {
  const traits = measureTraits(views);
  const type = TYPE_IDS.has(forceType) ? forceType : classifyType(traits, dims, sizeKnown);
  const palette = paletteFor(type, views);
  const out = { v: 1, type, palette, traits: {} };
  if (type === 'bed') {
    out.traits.pillows = countPillows(views.top, dims.widthCm);
    // How high the covers sit compared with the headboard decides how deep the base is
    out.traits.bodyFrac = Math.round(Math.min(0.9, Math.max(0.25, traits.bodyFrac)) * 100) / 100;
    out.traits.legs = traits.gapFrac > 0.08 ? 1 : 0;
  }
  Object.assign(out.traits, detectStructure(type, views, dims));
  return out;
}

// ---------- storage ----------

const num = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Validates a design from storage, a share link or a file; returns null when it is not usable. */
export function sanitizeDesign(raw) {
  if (!raw || typeof raw !== 'object' || !TYPE_IDS.has(raw.type)) return null;
  const palette = {};
  for (const key of ['body', 'accent', 'pillow', 'cushion', 'leg']) {
    const v = raw.palette?.[key];
    if (typeof v === 'string' && HEX.test(v)) palette[key] = v.toLowerCase();
  }
  if (!palette.body) palette.body = FALLBACK.body;
  const t = raw.traits || {};
  const traits = {};
  if (raw.type === 'bed') {
    traits.pillows = Math.round(num(t.pillows, 1, 4, 2));
    traits.bodyFrac = num(t.bodyFrac, 0.25, 0.9, 0.55);
    traits.legs = t.legs ? 1 : 0;
    traits.channels = t.channels ? 1 : 0;
  } else if (raw.type === 'sofa') {
    traits.seats = Math.round(num(t.seats, 1, 5, 3));
    traits.arm = num(t.arm, 0.04, 0.2, 0.1);
  } else if (raw.type === 'armchair') {
    traits.arm = num(t.arm, 0.04, 0.22, 0.17);
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
  if (type === 'sofa' || type === 'armchair')
    return { supportsTop: true, supportKind: 'soft', surfaceHeightCm: 44 };
  if (['table', 'table-round', 'coffee-table', 'desk', 'cabinet', 'nightstand'].includes(type))
    return { supportsTop: true };
  return {};
}
