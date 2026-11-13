/**
 * sheet.js
 * Helpers for a single picture that shows one piece from several angles on a plain background
 * (a product sheet: front, side, top and a three-quarter view). Finds the separate views, guesses which
 * is which, crops each into its own photo and derives the piece's proportions from them.
 * All functions are pure and work on RGBA pixel arrays.
 */

import { fitBackground, segmentObject, normalizeView, carveVoxels, maskBounds } from './hull.js';

const ANALYSIS_EDGE = 900;
const MAX_VIEWS = 12;

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

/** Erosion followed by dilation: removes strokes thinner than the kernel (dimension lines, frames, text). */
function open(mask, width, height, radius) {
  const inverse = mask.map((v) => (v ? 0 : 1));
  const eroded = dilate(inverse, width, height, radius).map((v) => (v ? 0 : 1));
  return dilate(eroded, width, height, radius);
}

/**
 * Clears long thin horizontal and vertical strokes (dimension lines, panel frames): a pixel that belongs to
 * a horizontal run at least `minRun` long but is at most `thin` pixels tall (or the same vertically).
 */
function stripLines(mask, width, height, minRun, thin) {
  const out = Uint8Array.from(mask);
  const sweep = (along, across, alongLen, acrossLen, index) => {
    for (let a = 0; a < acrossLen; a++) {
      let b = 0;
      while (b < alongLen) {
        if (!mask[index(a, b)]) {
          b++;
          continue;
        }
        let e = b;
        while (e < alongLen && mask[index(a, e)]) e++;
        if (e - b >= minRun) {
          for (let k = b; k < e; k++) {
            // thickness across the run at this position
            let t = 1;
            for (let d = 1; a - d >= 0 && mask[index(a - d, k)] && t <= thin; d++) t++;
            for (let d = 1; a + d < acrossLen && mask[index(a + d, k)] && t <= thin; d++) t++;
            if (t <= thin) out[index(a, k)] = 0;
          }
        }
        b = e;
      }
    }
  };
  sweep('x', 'y', width, height, (a, b) => a * width + b);
  sweep('y', 'x', height, width, (a, b) => b * width + a);
  return out;
}

/**
 * Finds the separate objects on a plain background (light or dark): connected groups of pixels that differ
 * from the background colour estimated along the border. Thin strokes (dimension lines, frames, a watermark)
 * are ignored, and a close-up inset that fills its whole box is not taken for a view.
 * @returns {{ views: Array<{ id: number, box: {x:number,y:number,w:number,h:number}, area: number }>, labels: Int16Array, analysis: {width:number,height:number,scale:number} }}
 *   boxes are in source pixels, in reading order (left to right within a row, rows top to bottom)
 */
export function detectSheetViews(rgba, width, height) {
  const small = downscale(rgba, width, height, ANALYSIS_EDGE);
  const { width: sw, height: sh } = small;
  const bg = fitBackground(small.rgba, sw, sh);
  const threshold = Math.max(22, bg.noise * 4);
  const marked = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const [r, g, b] = bg.at(x / sw, y / sh);
      const dist = Math.hypot(small.rgba[i] - r, small.rgba[i + 1] - g, small.rgba[i + 2] - b);
      if (dist > threshold) marked[y * sw + x] = 1;
    }
  }
  const rough = stripLines(marked, sw, sh, Math.round(Math.max(sw, sh) * 0.06), 2);
  // Only blobs that are more than a thin stroke count; strokes touching a blob stay part of it (a thin leg)
  const core = open(rough, sw, sh, Math.max(1, Math.round(Math.max(sw, sh) * 0.003)));
  // Edge pixels the opening shaved off are restored a few pixels deep; strokes beyond that stay gone
  const reach = dilate(core, sw, sh, 3);
  const raw = new Uint8Array(sw * sh);
  for (let p = 0; p < raw.length; p++) if (rough[p] && reach[p]) raw[p] = 1;
  const grown = dilate(raw, sw, sh, 1);
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
  // Two views joined by a smear on the floor (a reflection, a shadow): cut a wide blob where it is thinnest
  const splitWide = (c) => {
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    if (w < h * 1.9) return;
    const cols = new Int32Array(w);
    for (let y = c.minY; y <= c.maxY; y++)
      for (let x = c.minX; x <= c.maxX; x++) {
        const p = y * sw + x;
        if (labels[p] === c.id && raw[p]) cols[x - c.minX]++;
      }
    const top = Math.max(...cols);
    let best = -1;
    for (let k = Math.floor(w * 0.3); k <= Math.ceil(w * 0.7); k++)
      if (cols[k] <= top * 0.12 && (best < 0 || cols[k] < cols[best])) best = k;
    if (best < 0) return;
    const part = { id: found.length, minX: sw, minY: sh, maxX: -1, maxY: -1, area: 0 };
    const rest = { id: c.id, minX: sw, minY: sh, maxX: -1, maxY: -1, area: 0 };
    for (let y = c.minY; y <= c.maxY; y++)
      for (let x = c.minX; x <= c.maxX; x++) {
        const p = y * sw + x;
        if (labels[p] !== c.id) continue;
        const target = x - c.minX > best ? part : rest;
        if (target === part) labels[p] = part.id;
        if (!raw[p]) continue;
        target.area++;
        if (x < target.minX) target.minX = x;
        if (x > target.maxX) target.maxX = x;
        if (y < target.minY) target.minY = y;
        if (y > target.maxY) target.maxY = y;
      }
    Object.assign(c, rest);
    found.push(part);
    splitWide(c);
    splitWide(part);
  };
  for (const c of [...found]) if (c.maxX >= 0) splitWide(c);
  // A close-up inset fills its whole box; real pieces leave background inside theirs
  const solidBox = (c) =>
    (c.area / ((c.maxX - c.minX + 1) * (c.maxY - c.minY + 1)) > 0.88 && c.area > sw * sh * 0.15) ||
    // a frame or panel spanning most of the picture is not a view either
    (c.maxX - c.minX + 1 > sw * 0.9 && c.maxY - c.minY + 1 > sh * 0.9 && found.length > 1);
  for (const c of found) if (c.maxX >= 0 && solidBox(c)) c.area = 0;
  // Views of one piece are drawn at similar scale: a much bigger blob is a close-up or a panel
  const boxArea = (c) => (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1);
  const sizes = found
    .filter((c) => c.area > 0 && c.area >= sw * sh * 0.003)
    .map(boxArea)
    .sort((p, q) => p - q);
  if (sizes.length >= 4) {
    const med = sizes[Math.floor(sizes.length / 2)];
    for (const c of found)
      if (c.area > 0 && boxArea(c) > med * 1.8 && c.area / boxArea(c) < 0.85) c.area = 0;
  }
  const biggest = Math.max(0, ...found.map((c) => c.area));
  const keep = found
    .filter((c) => c.maxX >= 0 && c.area >= Math.max(biggest * 0.12, sw * sh * 0.003))
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
      if (label !== view.id) {
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
 * With `looks` (what each view shows, see photoPipeline.sheetSlots) the content decides too: a three-quarter view
 * is no front, side or plan view; a front is left-right symmetric; a plan view shows no legs; one picture far
 * bigger than the rest is the main photo and the small ones are other colours or details.
 * @param {Array<{box: {w:number,h:number}}>} views in reading order
 * @param {Array<{ sym: number, oblique: object|null, legs: number }>|null} [looks] per view
 * @returns {Array<'front'|'right'|'left'|'top'|null>} one slot per view; side views start as 'right'
 */
export function assignSheetViews(views, looks = null) {
  if (looks && looks.length === views.length && views.length > 1)
    return assignWithLooks(views, looks);
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
  const topPart = (F, S, T) =>
    ratio(F.w, T.w) * 0.6 + ratio(S.w, T.h) * 0.6 + ratio(F.w / F.h / (S.w / S.h), T.w / T.h);
  let best = null;
  for (const [f, s, t] of permutations(views.length, 3)) {
    const F = views[f].box;
    const S = views[s].box;
    const T = views[t].box;
    const cost =
      // heights and widths shared directly (works when views share a scale)
      ratio(F.h, S.h) * 0.6 +
      topPart(F, S, T) +
      // prefer reading order
      (f > s ? 0.05 : 0) +
      (s > t ? 0.02 : 0) +
      (f > t ? 0.02 : 0);
    if (!best || cost < best.cost) best = { cost, f, s, t };
  }
  const Fb = views[best.f].box;
  const Sb = views[best.s].box;
  // A real side view is shaped differently from the front; without that the 'top' is just another side
  const Tb = views[best.t].box;
  const cost = topPart(Fb, Sb, Tb);
  // A plan view of a long piece (a bed) differs from the others in shape, so a looser fit is accepted for it
  const planShaped =
    cost < 0.5 &&
    ratio(Tb.w / Tb.h, Fb.w / Fb.h) > 0.3 &&
    ratio(Tb.w / Tb.h, Sb.w / Sb.h) > 0.3 &&
    ratio(Fb.h, Sb.h) < 0.12;
  if (best && (cost < 0.3 || planShaped) && ratio(Fb.w / Fb.h, Sb.w / Sb.h) > 0.12) {
    out[best.f] = 'front';
    out[best.s] = 'right';
    out[best.t] = 'top';
    // The same view drawn bigger elsewhere on the sheet (a full-size render beside the small drawing) has
    // more detail: use it instead when it has the same shape
    for (const slotIndex of [best.f, best.s]) {
      const role = out[slotIndex];
      const base = views[slotIndex].box;
      let bigger = slotIndex;
      for (let i = 0; i < views.length; i++) {
        if (out[i] && i !== slotIndex) continue;
        const b = views[i].box;
        if (
          ratio(b.w / b.h, base.w / base.h) < 0.04 &&
          b.w * b.h > views[bigger].box.w * views[bigger].box.h * 1.4
        )
          bigger = i;
      }
      if (bigger !== slotIndex) {
        out[slotIndex] = null;
        out[bigger] = role;
      }
    }
    return out;
  }
  // No plan view among them (a render from the front, the side and the back, plus a three-quarter view):
  // the first view is the front, the side is the one that differs most from it in shape, the back looks like it
  const aspect = (i) => views[i].box.w / views[i].box.h;
  let pick = null;
  for (let s = 1; s < views.length; s++) {
    const cost =
      ratio(views[0].box.h, views[s].box.h) * 0.6 -
      Math.min(0.4, ratio(aspect(0), aspect(s))) * 0.5 +
      s * 0.01;
    if (!pick || cost < pick.cost) pick = { cost, s };
  }
  out[0] = 'front';
  out[pick.s] = 'right';
  for (let b = 1; b < views.length; b++) {
    if (b === pick.s) continue;
    if (ratio(aspect(0), aspect(b)) < 0.15 && ratio(views[0].box.h, views[b].box.h) < 0.14) {
      out[b] = 'back';
      break;
    }
  }
  return out;
}

const logRatio = (a, b) => Math.abs(Math.log(a / b));
const boxAspect = (b) => b.w / b.h;

/**
 * Front, side and plan views from their boxes, corrected by what they show (see assignSheetViews). The roles from
 * the boxes stand unless the content says otherwise.
 */
function assignWithLooks(views, looks) {
  const out = views.map(() => null);
  const area = (i) => views[i].box.w * views[i].box.h;
  const all = views.map((_, i) => i);
  // One picture far bigger than all the others is the main photo: the small ones show other colours or details
  const big = all.reduce((b, i) => (area(i) > area(b) ? i : b), 0);
  if (all.every((i) => i === big || area(i) * 2.4 <= area(big))) {
    out[big] = 'front';
    return out;
  }
  const straight = all.filter((i) => !looks[i].oblique);
  const oblique = all.filter((i) => looks[i].oblique);
  // The three-quarter view that shows the front most squarely (the first one on a tie)
  const bestOblique = () =>
    oblique.reduce((b, i) => (looks[i].oblique.yaw < looks[b].oblique.yaw - 5 ? i : b), oblique[0]);
  // Only three-quarter views (or one straight view that is not symmetric beside them, its V hidden by the
  // feet): the squarest one is the photo to read, as a three-quarter view
  if (
    !straight.length ||
    (straight.length === 1 && oblique.length && looks[straight[0]].sym < 0.8)
  ) {
    out[bestOblique()] = 'front';
    return out;
  }
  if (straight.length === 1) {
    out[straight[0]] = 'front';
    return out;
  }
  // The roles from the boxes of the straight views; a three-quarter view never stands for a front, side or plan
  const sub = assignSheetViews(straight.map((i) => views[i]));
  straight.forEach((i, k) => (out[i] = sub[k]));
  // A front is the most symmetric of the straight views: when the boxes chose a view clearly less symmetric than
  // one left over (the long side of a bed beside its end), the symmetric one is the front. A plan view is no
  // front however symmetric: it hides the legs the front shows
  const f0 = out.indexOf('front');
  if (f0 >= 0 && looks[f0].sym < 0.9) {
    const spare = straight
      .filter(
        (i) =>
          !out[i] &&
          looks[i].sym >= Math.max(0.95, looks[f0].sym + 0.08) &&
          !(looks[f0].legs > 0.1 && looks[i].legs < 0.04)
      )
      .sort((a, b) => looks[b].sym - looks[a].sym)[0];
    if (spare !== undefined) {
      out[spare] = 'front';
      // the view taken for the side stays the side, unless it is as symmetric as a front (the other end of a
      // bed): then the view first taken for the front, the long one, is the side
      const r0 = out.indexOf('right');
      if (r0 >= 0 && looks[r0].sym >= 0.9) {
        out[r0] = null;
        out[f0] = 'right';
      } else out[f0] = r0 >= 0 ? null : 'right';
      // a plan view is as wide as the front: one chosen to fit the first front may not fit this one
      const t1 = out.indexOf('top');
      if (t1 >= 0 && logRatio(views[t1].box.w, views[spare].box.w) > 0.25) out[t1] = null;
    }
  }
  // A plan view seen as the front: the front shows legs that the plan view hides, and is symmetric
  const f = out.indexOf('front');
  const t = out.indexOf('top');
  if (f >= 0 && t < 0 && looks[f].legs < 0.03) {
    // (a seat seen from above is as wide as its front and less tall, with no feet under it)
    const legged = straight.filter(
      (i) =>
        i !== f &&
        looks[i].legs > 0.12 &&
        looks[i].legs < 0.5 &&
        looks[i].sym >= 0.9 &&
        logRatio(views[i].box.h, views[f].box.h) < 0.25 &&
        boxAspect(views[f].box) >= boxAspect(views[i].box) * 1.05
    );
    if (legged.length) {
      const g = legged[0];
      const was = out[g];
      out[g] = 'front';
      out[f] = 'top';
      // the side is the remaining straight view that differs most from the front in shape
      if (was === 'right' || !out.includes('right')) {
        const rest = straight.filter((i) => !out[i] || out[i] === 'back' || out[i] === 'right');
        let side = null;
        for (const i of rest) {
          if (i === g || i === f) continue;
          const d = logRatio(boxAspect(views[i].box), boxAspect(views[g].box)) - looks[i].sym * 0.1;
          if (side === null || d > side.d) side = { i, d };
        }
        for (const i of rest) if (out[i] === 'back' || out[i] === 'right') out[i] = null;
        if (side) out[side.i] = 'right';
      }
    }
  }
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

/**
 * The proportions the photos fix, even when they are too few to fix all three (a single front photo gives only
 * the width-to-height ratio). Each value is null when no photo shows it.
 * @returns {{ widthPerHeight: number|null, depthPerHeight: number|null, widthPerDepth: number|null }}
 */
export function estimatePartialProportions(cutouts) {
  const sums = { wph: [], dph: [], wpd: [] };
  for (const [slot, cut] of Object.entries(cutouts)) {
    const box = maskBounds(cut.mask, cut.width, cut.height);
    if (!box) continue;
    const lr = Math.log(box.width / box.height);
    if (slot === 'front' || slot === 'back') sums.wph.push(lr);
    else if (slot === 'left' || slot === 'right') sums.dph.push(lr);
    else if (slot === 'top') sums.wpd.push(lr);
  }
  const avg = (list) =>
    list.length ? Math.exp(list.reduce((a, b) => a + b, 0) / list.length) : null;
  return {
    widthPerHeight: avg(sums.wph),
    depthPerHeight: avg(sums.dph),
    widthPerDepth: avg(sums.wpd),
  };
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
