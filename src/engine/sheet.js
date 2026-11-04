/**
 * sheet.js
 * Helpers for a single picture that shows one piece from several angles on a plain background
 * (a product sheet: front, side, top and a three-quarter view). Finds the separate views, guesses which
 * is which, crops each into its own photo and derives the piece's proportions from them.
 * All functions are pure and work on RGBA pixel arrays.
 */

import { fitBackground, segmentObject, normalizeView, carveVoxels, maskBounds } from './hull.js';

const ANALYSIS_EDGE = 360;
const MAX_VIEWS = 8;

/** Box-averaged downscale to at most `edge` pixels on the long side. */
function downscale(rgba, width, height, edge) {
  const scale = Math.min(1, edge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  if (scale === 1) return { rgba, width, height, scale: 1 };
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y / scale);
    const y1 = Math.max(y0 + 1, Math.min(height, Math.floor((y + 1) / scale)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x / scale);
      const x1 = Math.max(x0 + 1, Math.min(width, Math.floor((x + 1) / scale)));
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          n++;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { rgba: out, width: w, height: h, scale };
}

function dilate(mask, width, height, radius) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let d = -radius; d <= radius && !on; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < width && mask[y * width + xx]) on = 1;
      }
      tmp[y * width + x] = on;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let d = -radius; d <= radius && !on; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < height && tmp[yy * width + x]) on = 1;
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

/**
 * Finds the separate objects on a plain background (connected groups of non-background pixels).
 * @returns {{ views: Array<{ id: number, box: {x:number,y:number,w:number,h:number}, area: number }>, labels: Int16Array, analysis: {width:number,height:number,scale:number} }}
 *   boxes are in source pixels, in reading order (left to right within a row, rows top to bottom)
 */
export function detectSheetViews(rgba, width, height) {
  const small = downscale(rgba, width, height, ANALYSIS_EDGE);
  const { width: sw, height: sh } = small;
  const bg = fitBackground(small.rgba, sw, sh);
  const threshold = Math.max(22, bg.noise * 4);
  const raw = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const [r, g, b] = bg.at(x / sw, y / sh);
      const dist = Math.hypot(small.rgba[i] - r, small.rgba[i + 1] - g, small.rgba[i + 2] - b);
      if (dist > threshold) raw[y * sw + x] = 1;
    }
  }
  const grown = dilate(raw, sw, sh, Math.max(2, Math.round(Math.max(sw, sh) * 0.012)));
  const labels = new Int16Array(sw * sh).fill(-1);
  const found = [];
  const stack = [];
  for (let p = 0; p < grown.length; p++) {
    if (!grown[p] || labels[p] !== -1) continue;
    const id = found.length;
    const comp = { id, minX: sw, minY: sh, maxX: -1, maxY: -1, area: 0 };
    labels[p] = id;
    stack.push(p);
    while (stack.length) {
      const q = stack.pop();
      const x = q % sw;
      const y = (q - x) / sw;
      if (raw[q]) {
        comp.area++;
        if (x < comp.minX) comp.minX = x;
        if (x > comp.maxX) comp.maxX = x;
        if (y < comp.minY) comp.minY = y;
        if (y > comp.maxY) comp.maxY = y;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) continue;
        const n = yy * sw + xx;
        if (grown[n] && labels[n] === -1) {
          labels[n] = id;
          stack.push(n);
        }
      }
    }
    found.push(comp);
  }
  const biggest = Math.max(0, ...found.map((c) => c.area));
  const keep = found
    .filter((c) => c.maxX >= 0 && c.area >= Math.max(biggest * 0.04, sw * sh * 0.003))
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_VIEWS);

  // Reading order: rows by vertical centre, then left to right
  const rowTolerance = Math.max(...keep.map((c) => c.maxY - c.minY + 1), 1) * 0.5;
  const withCentre = keep.map((c) => ({ c, cy: (c.minY + c.maxY) / 2, cx: (c.minX + c.maxX) / 2 }));
  withCentre.sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const entry of withCentre) {
    const row = rows.find((r) => Math.abs(r.cy - entry.cy) <= rowTolerance);
    if (row) row.items.push(entry);
    else rows.push({ cy: entry.cy, items: [entry] });
  }
  const ordered = rows.flatMap((r) => r.items.sort((a, b) => a.cx - b.cx)).map((e) => e.c);

  const views = ordered.map((c, index) => {
    const x = Math.floor(c.minX / small.scale);
    const y = Math.floor(c.minY / small.scale);
    return {
      id: c.id,
      index,
      box: {
        x,
        y,
        w: Math.min(width - x, Math.ceil((c.maxX + 1) / small.scale) - x),
        h: Math.min(height - y, Math.ceil((c.maxY + 1) / small.scale) - y),
      },
      area: c.area,
    };
  });
  return { views, labels, analysis: { width: sw, height: sh, scale: small.scale } };
}

/**
 * Crops one detected view into its own photo with a plain margin around it. Pixels that belong to
 * a different view are painted with the background colour, so neighbours do not leak in.
 */
export function cropSheetView(rgba, width, height, detection, view, marginRatio = 0.08) {
  const { box } = view;
  const margin = Math.round(Math.max(box.w, box.h) * marginRatio);
  const x0 = Math.max(0, box.x - margin);
  const y0 = Math.max(0, box.y - margin);
  const x1 = Math.min(width, box.x + box.w + margin);
  const y1 = Math.min(height, box.y + box.h + margin);
  const w = x1 - x0;
  const h = y1 - y0;
  const bg = fitBackground(rgba, width, height);
  const { labels, analysis } = detection;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ly = Math.min(analysis.height - 1, Math.floor((y0 + y) * analysis.scale));
    for (let x = 0; x < w; x++) {
      const lx = Math.min(analysis.width - 1, Math.floor((x0 + x) * analysis.scale));
      const label = labels[ly * analysis.width + lx];
      const o = (y * w + x) * 4;
      const s = ((y0 + y) * width + (x0 + x)) * 4;
      if (label !== -1 && label !== view.id) {
        const [r, g, b] = bg.at((x0 + x) / width, (y0 + y) / height);
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
      } else {
        out[o] = rgba[s];
        out[o + 1] = rgba[s + 1];
        out[o + 2] = rgba[s + 2];
      }
      out[o + 3] = 255;
    }
  }
  return { rgba: out, width: w, height: h };
}

const permutations = (n, k) => {
  const out = [];
  const walk = (acc) => {
    if (acc.length === k) return out.push(acc);
    for (let i = 0; i < n; i++) if (!acc.includes(i)) walk([...acc, i]);
  };
  walk([]);
  return out;
};

/**
 * Guesses which detected view is front, side and top. A real piece has one height, one width and one
 * depth, so the right trio is the one whose boxes agree the most: front and side heights, front and top
 * widths, side and top depths. Reading order breaks ties (front, side, top, then a spare angle).
 * @param {Array<{box: {w:number,h:number}}>} views in reading order
 * @returns {Array<'front'|'right'|'left'|'top'|null>} one slot per view; side views start as 'right'
 */
export function assignSheetViews(views) {
  const out = views.map(() => null);
  if (views.length === 0) return out;
  if (views.length === 1) {
    out[0] = 'front';
    return out;
  }
  if (views.length === 2) {
    out[0] = 'front';
    out[1] = 'right';
    return out;
  }
  const ratio = (a, b) => Math.abs(Math.log(a / b));
  let best = null;
  for (const [f, s, t] of permutations(views.length, 3)) {
    const F = views[f].box;
    const S = views[s].box;
    const T = views[t].box;
    const cost =
      // heights and widths shared directly (works when views share a scale)
      ratio(F.h, S.h) * 0.6 +
      ratio(F.w, T.w) * 0.6 +
      ratio(S.w, T.h) * 0.6 +
      // and the aspect loop (works for any scale): (w/h) * (d/h)^-1 = w/d
      ratio(F.w / F.h / (S.w / S.h), T.w / T.h) +
      // prefer reading order and a top view that is taller than it is wide-ish
      (f > s ? 0.05 : 0) +
      (s > t ? 0.02 : 0) +
      (f > t ? 0.02 : 0);
    if (!best || cost < best.cost) best = { cost, f, s, t };
  }
  out[best.f] = 'front';
  out[best.s] = 'right';
  out[best.t] = 'top';
  return out;
}

/** Volume the carved hull keeps for a set of views: a consistent set keeps more of the object. */
function hullVolume(views) {
  const { occupancy } = carveVoxels(views, 24);
  let n = 0;
  for (let i = 0; i < occupancy.length; i++) n += occupancy[i];
  return n;
}

/**
 * Decides whether a side photo shows the right side (front of the piece on the left of the photo) or the
 * left side, by trying both with the other views and keeping the one that carves more volume.
 * Needs the front and top photos to decide; returns 'right' when it cannot.
 * @param {{front?: object, top?: object, side: object}} normalized views from normalizeView
 */
export function chooseSideSlot({ front, top, side }) {
  if (!side || (!front && !top)) return 'right';
  const others = [
    front && { slot: 'front', angle: 0, ...front },
    top && { slot: 'top', angle: null, ...top },
  ].filter(Boolean);
  const right = hullVolume([...others, { slot: 'right', angle: 90, ...side }]);
  const left = hullVolume([...others, { slot: 'left', angle: 270, ...side }]);
  return left > right * 1.02 ? 'left' : 'right';
}

/**
 * Real proportions of the piece implied by the views, relative to its height (height = 1).
 * Front/back give width:height, sides give depth:height and the top gives width:depth; when the views
 * disagree a little (perspective) the answer is the best compromise.
 * @param {Record<string, {mask: Uint8Array, width: number, height: number}>} cutouts by slot id
 * @returns {{ widthCm: number, depthCm: number, heightCm: number } | null} ratios, or null when the views
 *   cannot fix all three
 */
export function estimateProportions(cutouts) {
  const rows = []; // [a, b, value]: a*lw + b*ld = value
  for (const [slot, cut] of Object.entries(cutouts)) {
    const box = maskBounds(cut.mask, cut.width, cut.height);
    if (!box) continue;
    const lr = Math.log(box.width / box.height);
    if (slot === 'front' || slot === 'back') rows.push([1, 0, lr]);
    else if (slot === 'left' || slot === 'right') rows.push([0, 1, lr]);
    else if (slot === 'top') rows.push([1, -1, lr]);
  }
  let a11 = 0,
    a12 = 0,
    a22 = 0,
    b1 = 0,
    b2 = 0;
  for (const [a, b, v] of rows) {
    a11 += a * a;
    a12 += a * b;
    a22 += b * b;
    b1 += a * v;
    b2 += b * v;
  }
  const det = a11 * a22 - a12 * a12;
  if (rows.length < 2 || Math.abs(det) < 1e-6) return null;
  const lw = (b1 * a22 - b2 * a12) / det;
  const ld = (a11 * b2 - a12 * b1) / det;
  return { widthCm: Math.exp(lw), depthCm: Math.exp(ld), heightCm: 1 };
}

/** Scales the proportions so the dimension `key` equals `value`; results are clamped to [5, 600] cm. */
export function dimensionsFromProportions(ratios, key, value) {
  const k = value / ratios[key];
  const clampCm = (v) => Math.min(600, Math.max(5, Math.round(v)));
  return {
    widthCm: clampCm(ratios.widthCm * k),
    depthCm: clampCm(ratios.depthCm * k),
    heightCm: clampCm(ratios.heightCm * k),
  };
}

/** Segments and normalizes a cropped photo; convenience for the side-orientation test. */
export function prepareCrop(crop, tolerance = 40) {
  const mask = segmentObject(crop.rgba, crop.width, crop.height, tolerance);
  return normalizeView(crop.rgba, mask, crop.width, crop.height);
}
