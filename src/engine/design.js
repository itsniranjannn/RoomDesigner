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
];

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
  for (let y = Math.floor(y0 * s); y < Math.ceil(y1 * s); y++) {
    for (let x = Math.floor(x0 * s); x < Math.ceil(x1 * s); x++) {
      const p = y * s + x;
      if (view.mask[p]) out.push([view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]]);
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

/** Mixes a hex colour a fraction of the way towards white. */
function lift(hex, k) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return toHex(v.map((c) => c + (255 - c) * k));
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
export function classifyType(traits, dims) {
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
    if (h / w <= 0.45 && h <= 60) return 'coffee-table';
    if (h / w <= 0.7 && d / w <= 0.65 && w <= 175) return 'desk';
    return 'table';
  }
  if (h >= 150) return d <= 40 ? 'bookshelf' : 'wardrobe';
  if (h >= 90 && d <= 40) return 'bookshelf';
  return 'cabinet';
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
    // Folds and shadow darken the photographed cover, so lift it a little towards its lit side
    palette.accent = lift(
      pickColor(T, [0.2, 0.58, 0.8, 0.84]) ||
        pickColor(F, [0.2, 0.55, 0.8, 0.85]) ||
        FALLBACK.accent,
      0.12
    );
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
export function buildDesign(views, dims, forceType) {
  const traits = measureTraits(views);
  const type = TYPE_IDS.has(forceType) ? forceType : classifyType(traits, dims);
  const palette = paletteFor(type, views);
  const out = { v: 1, type, palette, traits: {} };
  if (type === 'bed') {
    out.traits.pillows = countPillows(views.top, dims.widthCm);
    // How high the covers sit compared with the headboard decides how deep the base is
    out.traits.bodyFrac = Math.round(Math.min(0.9, Math.max(0.25, traits.bodyFrac)) * 100) / 100;
    out.traits.legs = traits.gapFrac > 0.08 ? 1 : 0;
    out.traits.channels = 0;
  } else if (type === 'sofa') {
    out.traits.seats = Math.min(4, Math.max(2, Math.round((dims.widthCm * 0.8) / 62)));
  }
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
  }
  return { v: 1, type: raw.type, palette, traits };
}

/** The catalog's main colour for a design (what the colour picker shows as the original). */
export function designMainColor(design) {
  return design?.palette?.body || FALLBACK.body;
}
