/**
 * foreground.js
 * Cuts furniture out of a photo taken in a real room (a lifestyle shot: walls, floor, rugs, plants, lamps,
 * watermarks) with no plain backdrop to key against, in pure JS on one photo:
 *
 *   1. SLIC-style superpixels in Lab colour,
 *   2. a background model from boundary connectivity (a region that is joined to the photo border along a
 *      long edge is wall or floor; furniture is a compact thing sitting inside the picture) plus a centre prior,
 *   3. GrabCut on the superpixel graph: Gaussian mixtures for piece and surroundings, exact min-cut
 *      (Dinic) with edge-aware smoothness, refitted a few times,
 *   4. pixel-level refinement along the boundary, then clean-up (specks, caption bars, thin text) and
 *      splitting into separate pieces.
 *
 * User corrections (a crop rectangle, "keep" and "remove" brush strokes) go in as hard constraints and as
 * colour samples, so a stroke teaches the cut-out what the piece looks like.
 * `extractForeground` picks the plain-backdrop cut (hull.segmentObject) when the backdrop is plain, so
 * product pictures keep their exact old behaviour.
 */

import { fitBackground, segmentObject, maskBounds } from './hull.js';

const ANALYSIS_EDGE = 300;

// ---------- colour ----------

const GAMMA = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  GAMMA[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const lab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

/** sRGB bytes to CIE Lab (L 0-100). */
export function rgbToLab(r, g, b) {
  const R = GAMMA[r | 0];
  const G = GAMMA[g | 0];
  const B = GAMMA[b | 0];
  const fx = lab((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const fy = lab(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const fz = lab((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ---------- small image helpers ----------

/** Box-averaged downscale (no-op when already small). */
export function shrinkRgba(rgba, width, height, edge) {
  const scale = Math.min(1, edge / Math.max(width, height));
  if (scale === 1) return { rgba, width, height, scale: 1 };
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
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
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          n++;
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

/** Bilinear upscale of a 0/1 mask to a new size, thresholded at one half (smooth edges, no blockiness). */
export function resizeMask(mask, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return Uint8Array.from(mask);
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / dh - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / dw - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      const v =
        mask[y0 * sw + x0] * (1 - tx) * (1 - ty) +
        mask[y0 * sw + x1] * tx * (1 - ty) +
        mask[y1 * sw + x0] * (1 - tx) * ty +
        mask[y1 * sw + x1] * tx * ty;
      out[y * dw + x] = v >= 0.5 ? 1 : 0;
    }
  }
  return out;
}

function morph(mask, w, h, radius, grow) {
  // separable square dilation (grow) or erosion
  const pass = (src, horizontal) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let hit = grow ? 0 : 1;
        for (let d = -radius; d <= radius; d++) {
          const xx = horizontal ? x + d : x;
          const yy = horizontal ? y : y + d;
          const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? (grow ? 0 : 1) : src[yy * w + xx];
          if (grow ? v : !v) {
            hit = grow ? 1 : 0;
            break;
          }
        }
        out[y * w + x] = hit;
      }
    return out;
  };
  return pass(pass(mask, true), false);
}
const openMask = (m, w, h, r) => morph(morph(m, w, h, r, false), w, h, r, true);
const closeMask = (m, w, h, r) => morph(morph(m, w, h, r, true), w, h, r, false);

/** Connected components (4-neighbour) of a mask: labels (0 = none) and each component's stats. */
export function components(mask, w, h) {
  const labels = new Int32Array(w * h);
  const list = [];
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || labels[s]) continue;
    const id = list.length + 1;
    let area = 0,
      minX = w,
      minY = h,
      maxX = -1,
      maxY = -1,
      sx = 0,
      sy = 0;
    stack.push(s);
    labels[s] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      area++;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !labels[p - 1]) ((labels[p - 1] = id), stack.push(p - 1));
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) ((labels[p + 1] = id), stack.push(p + 1));
      if (y > 0 && mask[p - w] && !labels[p - w]) ((labels[p - w] = id), stack.push(p - w));
      if (y < h - 1 && mask[p + w] && !labels[p + w]) ((labels[p + w] = id), stack.push(p + w));
    }
    list.push({
      id,
      area,
      box: { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
      cx: sx / area,
      cy: sy / area,
    });
  }
  return { labels, list };
}

function fillSmallHoles(mask, w, h, maxFraction) {
  // background components not touching the border and smaller than the limit become object
  const inv = mask.map((v) => (v ? 0 : 1));
  const { labels, list } = components(inv, w, h);
  const out = Uint8Array.from(mask);
  const limit = maxFraction * w * h;
  for (const c of list) {
    const touches =
      c.box.minX === 0 || c.box.minY === 0 || c.box.maxX === w - 1 || c.box.maxY === h - 1;
    if (touches || c.area > limit) continue;
    for (let p = 0; p < labels.length; p++) if (labels[p] === c.id) out[p] = 1;
  }
  return out;
}

// ---------- superpixels (SLIC) ----------

function toLabPlanes(rgba, n) {
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const [l, a, b] = rgbToLab(rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]);
    L[p] = l;
    A[p] = a;
    B[p] = b;
  }
  return { L, A, B };
}

function slic(planes, w, h, count) {
  const { L, A, B } = planes;
  const step = Math.max(4, Math.round(Math.sqrt((w * h) / count)));
  const compact = 14;
  const centers = [];
  for (let y = Math.floor(step / 2); y < h; y += step)
    for (let x = Math.floor(step / 2); x < w; x += step) {
      const p = y * w + x;
      centers.push({ x, y, l: L[p], a: A[p], b: B[p] });
    }
  const labels = new Int32Array(w * h).fill(-1);
  const dist = new Float32Array(w * h);
  const m2 = (compact / step) ** 2;
  for (let iter = 0; iter < 6; iter++) {
    dist.fill(Infinity);
    centers.forEach((c, k) => {
      const x0 = Math.max(0, Math.floor(c.x - step * 2));
      const x1 = Math.min(w - 1, Math.ceil(c.x + step * 2));
      const y0 = Math.max(0, Math.floor(c.y - step * 2));
      const y1 = Math.min(h - 1, Math.ceil(c.y + step * 2));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const p = y * w + x;
          const dl = L[p] - c.l;
          const da = A[p] - c.a;
          const db = B[p] - c.b;
          const d = dl * dl + da * da + db * db + m2 * ((x - c.x) ** 2 + (y - c.y) ** 2);
          if (d < dist[p]) {
            dist[p] = d;
            labels[p] = k;
          }
        }
    });
    const acc = centers.map(() => ({ x: 0, y: 0, l: 0, a: 0, b: 0, n: 0 }));
    for (let p = 0; p < labels.length; p++) {
      const k = labels[p];
      if (k < 0) continue;
      const s = acc[k];
      s.x += p % w;
      s.y += Math.floor(p / w);
      s.l += L[p];
      s.a += A[p];
      s.b += B[p];
      s.n++;
    }
    acc.forEach((s, k) => {
      if (s.n)
        centers[k] = { x: s.x / s.n, y: s.y / s.n, l: s.l / s.n, a: s.a / s.n, b: s.b / s.n };
    });
  }
  // Make every superpixel one connected piece: split disconnected parts, merge tiny ones into a neighbour
  const out = new Int32Array(w * h).fill(-1);
  let next = 0;
  const minArea = Math.max(6, Math.floor((step * step) / 4));
  const stack = [];
  for (let s = 0; s < out.length; s++) {
    if (out[s] >= 0) continue;
    const label = labels[s];
    const members = [];
    stack.push(s);
    out[s] = next;
    let neighbour = -1;
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      const x = p % w;
      const nb = [];
      if (x > 0) nb.push(p - 1);
      if (x < w - 1) nb.push(p + 1);
      if (p >= w) nb.push(p - w);
      if (p < w * (h - 1)) nb.push(p + w);
      for (const q of nb) {
        if (labels[q] === label) {
          if (out[q] < 0) {
            out[q] = next;
            stack.push(q);
          }
        } else if (out[q] >= 0 && out[q] !== next) neighbour = out[q];
      }
    }
    if (members.length < minArea && neighbour >= 0) for (const p of members) out[p] = neighbour;
    else next++;
  }
  // compact the ids (merging can leave gaps)
  const remap = new Map();
  let ids = 0;
  for (let p = 0; p < out.length; p++) {
    if (!remap.has(out[p])) remap.set(out[p], ids++);
    out[p] = remap.get(out[p]);
  }
  return { labels: out, count: ids };
}

// ---------- mixtures and max-flow ----------

/** K-means mixture of isotropic Gaussians over weighted Lab samples: [{ mean, var, weight }]. */
function fitMixture(samples, k) {
  if (!samples.length) return [{ mean: [50, 0, 0], v: 400, w: 1 }];
  const comps = [];
  const n = samples.length;
  const kk = Math.min(k, n);
  // spread the starting means along the lightness order
  const sorted = [...samples].sort((p, q) => p.c[0] - q.c[0]);
  for (let i = 0; i < kk; i++)
    comps.push({ mean: [...sorted[Math.floor(((i + 0.5) * n) / kk)].c] });
  const assign = new Int32Array(n);
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < n; i++) {
      let best = 0,
        bd = Infinity;
      for (let j = 0; j < comps.length; j++) {
        const m = comps[j].mean;
        const d =
          (samples[i].c[0] - m[0]) ** 2 +
          (samples[i].c[1] - m[1]) ** 2 +
          (samples[i].c[2] - m[2]) ** 2;
        if (d < bd) ((bd = d), (best = j));
      }
      assign[i] = best;
    }
    for (let j = 0; j < comps.length; j++) {
      let sw = 0;
      const s = [0, 0, 0];
      for (let i = 0; i < n; i++)
        if (assign[i] === j) {
          sw += samples[i].w;
          for (let ch = 0; ch < 3; ch++) s[ch] += samples[i].c[ch] * samples[i].w;
        }
      if (sw > 0) comps[j].mean = s.map((v) => v / sw);
    }
  }
  const total = samples.reduce((a, s) => a + s.w, 0) || 1;
  const out = [];
  for (let j = 0; j < comps.length; j++) {
    let sw = 0,
      sq = 0;
    for (let i = 0; i < n; i++)
      if (assign[i] === j) {
        const m = comps[j].mean;
        sw += samples[i].w;
        sq +=
          samples[i].w *
          ((samples[i].c[0] - m[0]) ** 2 +
            (samples[i].c[1] - m[1]) ** 2 +
            (samples[i].c[2] - m[2]) ** 2);
      }
    if (sw <= 0) continue;
    out.push({ mean: comps[j].mean, v: Math.max(30, sq / sw / 3), w: sw / total });
  }
  return out;
}

/** Negative log-likelihood of a colour under a mixture, capped so one odd pixel cannot dominate. */
function mixtureCost(mix, c) {
  let best = Infinity;
  for (const g of mix) {
    const d = (c[0] - g.mean[0]) ** 2 + (c[1] - g.mean[1]) ** 2 + (c[2] - g.mean[2]) ** 2;
    const cost = d / (2 * g.v) + 1.5 * Math.log(g.v) - Math.log(g.w);
    if (cost < best) best = cost;
  }
  return best;
}

/** Dinic max-flow; returns the set of nodes on the source side of a minimum cut. */
function minCut(n, source, sink, edges) {
  const head = new Int32Array(n).fill(-1);
  const to = [];
  const cap = [];
  const nxt = [];
  const add = (u, v, c1, c2) => {
    to.push(v);
    cap.push(c1);
    nxt.push(head[u]);
    head[u] = to.length - 1;
    to.push(u);
    cap.push(c2);
    nxt.push(head[v]);
    head[v] = to.length - 1;
  };
  for (const [u, v, c1, c2] of edges) add(u, v, c1, c2);
  const level = new Int32Array(n);
  const it = new Int32Array(n);
  const bfs = () => {
    level.fill(-1);
    level[source] = 0;
    const q = [source];
    for (let i = 0; i < q.length; i++) {
      const u = q[i];
      for (let e = head[u]; e >= 0; e = nxt[e])
        if (cap[e] > 1e-9 && level[to[e]] < 0) {
          level[to[e]] = level[u] + 1;
          q.push(to[e]);
        }
    }
    return level[sink] >= 0;
  };
  const dfs = (u, f) => {
    if (u === sink) return f;
    for (; it[u] >= 0; it[u] = nxt[it[u]]) {
      const e = it[u];
      const v = to[e];
      if (cap[e] > 1e-9 && level[v] === level[u] + 1) {
        const d = dfs(v, Math.min(f, cap[e]));
        if (d > 0) {
          cap[e] -= d;
          cap[e ^ 1] += d;
          return d;
        }
      }
    }
    return 0;
  };
  while (bfs()) {
    for (let i = 0; i < n; i++) it[i] = head[i];
    while (dfs(source, Infinity) > 0);
  }
  bfs();
  return Array.from(level, (l) => l >= 0);
}

// ---------- the scene cut ----------

function otsu(values, weights) {
  const bins = 32;
  const hist = new Float64Array(bins);
  let total = 0;
  values.forEach((v, i) => {
    hist[Math.min(bins - 1, Math.floor(v * bins))] += weights[i];
    total += weights[i];
  });
  let best = 0.5,
    bestVar = -1,
    wB = 0,
    sumB = 0;
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += (i + 0.5) * hist[i];
  for (let i = 0; i < bins - 1; i++) {
    wB += hist[i];
    sumB += (i + 0.5) * hist[i];
    const wF = total - wB;
    if (wB <= 0 || wF <= 0) continue;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > bestVar) ((bestVar = v), (best = (i + 1) / bins));
  }
  return best;
}

/**
 * The scene cut at analysis size.
 * @param {{rgba:Uint8ClampedArray,width:number,height:number}} img
 * @param {{ fg?: Uint8Array, bg?: Uint8Array }} [hints] brush strokes at the same size (1 = marked)
 * @returns {{ mask: Uint8Array, saliency: Float32Array, background: Float32Array }}
 */
export function sceneCut(img, hints = {}, { wallRule = true } = {}) {
  const { rgba, width: w, height: h } = img;
  const n = w * h;
  const planes = toLabPlanes(rgba, n);
  const { labels, count } = slic(planes, w, h, 320);
  const area = new Float64Array(count);
  const sum = Array.from({ length: count }, () => [0, 0, 0]);
  const cx = new Float64Array(count);
  const cy = new Float64Array(count);
  const border = new Float64Array(count);
  const hintFg = new Float64Array(count);
  const hintBg = new Float64Array(count);
  for (let p = 0; p < n; p++) {
    const k = labels[p];
    const x = p % w;
    const y = (p - x) / w;
    area[k]++;
    sum[k][0] += planes.L[p];
    sum[k][1] += planes.A[p];
    sum[k][2] += planes.B[p];
    cx[k] += x;
    cy[k] += y;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border[k]++;
    if (hints.fg?.[p]) hintFg[k]++;
    if (hints.bg?.[p]) hintBg[k]++;
  }
  const col = sum.map((s, k) => s.map((v) => v / area[k]));
  for (let k = 0; k < count; k++) {
    cx[k] /= area[k] * w;
    cy[k] /= area[k] * h;
  }
  // adjacency with the boundary length and the colour step across it
  const adj = new Map();
  const touch = (p, q) => {
    const a = labels[p];
    const b = labels[q];
    if (a === b) return;
    const key = a < b ? a * count + b : b * count + a;
    const e = adj.get(key) || { a: Math.min(a, b), b: Math.max(a, b), len: 0, diff: 0 };
    e.len++;
    e.diff += Math.hypot(
      planes.L[p] - planes.L[q],
      planes.A[p] - planes.A[q],
      planes.B[p] - planes.B[q]
    );
    adj.set(key, e);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x < w - 1) touch(p, p + 1);
      if (y < h - 1) touch(p, p + w);
    }
  const dc = (i, j) =>
    Math.hypot(col[i][0] - col[j][0], col[i][1] - col[j][1], col[i][2] - col[j][2]);

  // geodesic colour distance between superpixels (small steps are clipped to ignore texture)
  const geo = new Float32Array(count * count).fill(1e9);
  for (let i = 0; i < count; i++) geo[i * count + i] = 0;
  for (const e of adj.values()) {
    const d = Math.max(0, dc(e.a, e.b) - 3);
    geo[e.a * count + e.b] = d;
    geo[e.b * count + e.a] = d;
  }
  for (let k = 0; k < count; k++)
    for (let i = 0; i < count; i++) {
      const ik = geo[i * count + k];
      if (ik >= 1e9) continue;
      for (let j = 0; j < count; j++) {
        const v = ik + geo[k * count + j];
        if (v < geo[i * count + j]) geo[i * count + j] = v;
      }
    }
  const sigma = 10;
  const bndCon = new Float64Array(count);
  const softArea = new Float64Array(count);
  const wideArea = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    let aw = 0;
    for (let j = 0; j < count; j++) {
      const d = geo[i * count + j];
      aw += Math.exp(-(d * d) / (2 * 18 * 18)) * area[j];
    }
    wideArea[i] = aw / n;
    let a = 0,
      l = 0;
    for (let j = 0; j < count; j++) {
      const d = geo[i * count + j];
      const wgt = Math.exp(-(d * d) / (2 * sigma * sigma));
      a += wgt * area[j];
      l += wgt * border[j];
    }
    bndCon[i] = l / Math.sqrt(a);
    softArea[i] = a / n;
  }
  // A big, evenly coloured region (a wall that stops short of the border) is surroundings too: furniture is
  // a smaller part of the picture than the room around it. softArea (narrow) is kept for the maps.
  // wall and floor are plain and pale-to-neutral; a big region of rich colour (warm wood, teal fabric) is the piece
  const bigOf = (i) => {
    if (!wallRule) return 0;
    const chroma = Math.hypot(col[i][1], col[i][2]);
    const plain = Math.min(1, Math.max(0, (32 - chroma) / 12));
    return Math.min(1, Math.max(0, (wideArea[i] - 0.12) / 0.07)) * plain;
  };
  const bgGeo = Array.from(bndCon, (b, i) => Math.max(1 - Math.exp(-(b * b) / 2), 0.95 * bigOf(i)));
  // A colour region that is tall and narrow and runs most of the picture's height is a wall panel, a door or a
  // curtain, not furniture
  const towers = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    let x0 = 1,
      x1 = 0,
      y0 = 1,
      y1 = 0;
    for (let j = 0; j < count; j++)
      if (geo[i * count + j] < 12) {
        x0 = Math.min(x0, cx[j]);
        x1 = Math.max(x1, cx[j]);
        y0 = Math.min(y0, cy[j]);
        y1 = Math.max(y1, cy[j]);
      }
    const wf = Math.max(0.05, x1 - x0);
    const hf = y1 - y0;
    towers[i] = hf >= 0.4 && wf <= 0.32 && hf / wf >= 2.2 ? 1 : 0;
  }
  const bgProb = Array.from(bndCon, (b, i) => {
    const big = bigOf(i);
    // the subject of a listing photo often runs off the border, but it is the thing in the middle
    const middle = Math.exp(-(((cx[i] - 0.5) / 0.3) ** 2 + ((cy[i] - 0.52) / 0.32) ** 2) / 2);
    return Math.max(
      (1 - Math.exp(-(b * b) / 2)) * (1 - 0.75 * middle),
      0.95 * big,
      0.92 * towers[i]
    );
  });

  // contrast against what the surroundings look like
  let bgW = 0;
  const bgMean = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const wgt = area[i] * bgGeo[i];
    bgW += wgt;
    for (let ch = 0; ch < 3; ch++) bgMean[ch] += col[i][ch] * wgt;
  }
  if (bgW > 0) for (let ch = 0; ch < 3; ch++) bgMean[ch] /= bgW;
  const contrast = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    let s = 0,
      t = 0;
    for (let j = 0; j < count; j++) {
      const wgt = area[j] * bgGeo[j];
      s += wgt * dc(i, j);
      t += wgt;
    }
    contrast[i] = t > 0 ? s / t : 0;
  }
  const maxContrast = Math.max(...contrast, 1);
  const saliency = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const centre = Math.exp(-(((cx[i] - 0.5) / 0.4) ** 2 + ((cy[i] - 0.55) / 0.4) ** 2) / 2);
    saliency[i] = (contrast[i] / maxContrast) * (1 - bgProb[i]) * (0.4 + 0.6 * centre);
  }
  const peak = Math.max(...saliency, 1e-6);
  const values = Array.from(saliency, (s) => s / peak);
  const cutoff = Math.min(0.5, Math.max(0.12, otsu(values, area)));
  // seeds: clearly inside the picture and not wall or floor; the cut then spreads them by colour
  let isFg = values.map((v, i) => v >= cutoff || (bgProb[i] < 0.3 && v >= cutoff * 0.35));
  for (let i = 0; i < count; i++) {
    if (hintFg[i] > 0.25 * area[i]) isFg[i] = true;
    if (hintBg[i] > 0.25 * area[i] && hintFg[i] < hintBg[i]) isFg[i] = false;
  }

  // GrabCut on the superpixel graph
  const meanDiff =
    [...adj.values()].reduce((a, e) => a + e.diff / e.len, 0) / Math.max(1, adj.size);
  const beta = 1 / (2 * Math.max(4, meanDiff) ** 2);
  const lambda = 10;
  const hintsSamples = { fg: [], bg: [] };
  const sample = (mask, into) => {
    if (!mask) return;
    for (let p = 0; p < n; p += 1)
      if (mask[p]) into.push({ c: [planes.L[p], planes.A[p], planes.B[p]], w: 6 });
  };
  sample(hints.fg, hintsSamples.fg);
  sample(hints.bg, hintsSamples.bg);
  let fgMix = null;
  let bgMix = null;
  for (let round = 0; round < 6; round++) {
    const fgS = [];
    const bgS = [];
    for (let i = 0; i < count; i++) {
      if (round < 3) (isFg[i] ? fgS : bgS).push({ c: col[i], w: area[i] });
      else {
        // second stage: learn the piece from the parts that are surely inside, the room from all the rest, and
        // let the doubtful in-between parts choose
        if (isFg[i] && bgProb[i] < 0.15) fgS.push({ c: col[i], w: area[i] });
        if (!isFg[i] || bgProb[i] > 0.4) bgS.push({ c: col[i], w: area[i] });
      }
    }
    fgS.push(...hintsSamples.fg);
    bgS.push(...hintsSamples.bg);
    if (!fgS.length || !bgS.length) break;
    fgMix = fitMixture(fgS, 5);
    bgMix = fitMixture(bgS, 6);
    const S = count + 2;
    const src = count;
    const snk = count + 1;
    const es = [];
    for (let i = 0; i < count; i++) {
      const cf = Math.min(14, mixtureCost(fgMix, col[i]));
      const cb = Math.min(14, mixtureCost(bgMix, col[i]));
      // a region joined to the border for a long way is surroundings whatever its colour
      // positive when the region looks like a thing inside the picture, negative for wall and floor
      const prior = (0.5 - bgProb[i]) * 20;
      let toFg = Math.max(0, 0.6 * (cb - cf) + prior) * area[i];
      let toBg = Math.max(0, 0.6 * (cf - cb) - prior + 14 * Math.max(0, bgProb[i] - 0.9)) * area[i];
      toFg += 40 * hintBg[i];
      toBg += 40 * hintFg[i];
      // source side = object: cutting source->i labels it surroundings
      es.push([src, i, toFg, 0]);
      es.push([i, snk, toBg, 0]);
    }
    for (const e of adj.values()) {
      const wgt = lambda * e.len * Math.exp(-beta * (e.diff / e.len) ** 2);
      es.push([e.a, e.b, wgt, wgt]);
    }
    const side = minCut(S, src, snk, es);
    const next = Array.from({ length: count }, (_, i) => side[i]);
    const changed = next.some((v, i) => v !== isFg[i]);
    isFg = next;
    if (!changed && round >= 3) break;
  }

  // pixels: superpixel labels, then ICM along the boundary with pixel-level costs
  let mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) mask[p] = isFg[labels[p]] ? 1 : 0;
  if (fgMix && bgMix) {
    const unary = (p) => {
      const c = [planes.L[p], planes.A[p], planes.B[p]];
      return Math.min(14, mixtureCost(bgMix, c)) - Math.min(14, mixtureCost(fgMix, c));
    };
    const diffAt = (p, q) =>
      Math.hypot(planes.L[p] - planes.L[q], planes.A[p] - planes.A[q], planes.B[p] - planes.B[q]);
    for (let sweep = 0; sweep < 3; sweep++) {
      const keep = Uint8Array.from(mask);
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          const nb = [p - 1, p + 1, p - w, p + w];
          if (nb.every((q) => keep[q] === keep[p])) continue;
          if (hints.fg?.[p]) {
            mask[p] = 1;
            continue;
          }
          if (hints.bg?.[p]) {
            mask[p] = 0;
            continue;
          }
          let e1 = -unary(p);
          let e0 = unary(p);
          for (const q of nb) {
            const wgt = 2.2 * Math.exp(-beta * diffAt(p, q) ** 2);
            if (keep[q]) e0 += wgt;
            else e1 += wgt;
          }
          // e1 = cost of object, e0 = cost of surroundings
          mask[p] = e1 < e0 ? 1 : 0;
        }
    }
  }
  const sal = new Float32Array(n);
  const bgp = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    sal[p] = values[labels[p]];
    bgp[p] = bgProb[labels[p]];
  }
  const wide = new Float32Array(n);
  for (let p = 0; p < n; p++) wide[p] = wideArea[labels[p]];
  return { mask, saliency: sal, background: bgp, wide };
}

// ---------- separating pieces that touch ----------

/** Distance (in pixels, chamfer 3-4) from each object pixel to the nearest non-object pixel. */
function distanceInside(mask, w, h) {
  const d = new Float32Array(w * h);
  for (let p = 0; p < d.length; p++) d[p] = mask[p] ? 1e6 : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!mask[p]) continue;
      let v = d[p];
      if (x === 0 || y === 0) v = Math.min(v, 1);
      if (x > 0) v = Math.min(v, d[p - 1] + 1);
      if (y > 0) v = Math.min(v, d[p - w] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[p - w - 1] + 1.4);
      if (x < w - 1 && y > 0) v = Math.min(v, d[p - w + 1] + 1.4);
      d[p] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (!mask[p]) continue;
      let v = d[p];
      if (x === w - 1 || y === h - 1) v = Math.min(v, 1);
      if (x < w - 1) v = Math.min(v, d[p + 1] + 1);
      if (y < h - 1) v = Math.min(v, d[p + w] + 1);
      if (x < w - 1 && y < h - 1) v = Math.min(v, d[p + w + 1] + 1.4);
      if (x > 0 && y < h - 1) v = Math.min(v, d[p + w - 1] + 1.4);
      d[p] = v;
    }
  return d;
}

/**
 * Splits a mask into the separate pieces it holds: blobs that are joined only by a neck much thinner than
 * either blob (a sofa and the armchair touching it) become different pieces. A watershed on the distance
 * transform in which two basins merge when the pass between them is at least `ratio` of the smaller one's depth.
 * @returns {Int32Array} labels, 0 = not object, 1.. = pieces
 */
export function splitPieces(mask, w, h, ratio = 0.62) {
  const dist = distanceInside(mask, w, h);
  // smooth a little so one noisy ridge does not make two peaks
  const sm = new Float32Array(dist.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!mask[p]) continue;
      let s = 0,
        n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || !mask[yy * w + xx]) continue;
          s += dist[yy * w + xx];
          n++;
        }
      sm[p] = s / n;
    }
  const order = [];
  for (let p = 0; p < mask.length; p++) if (mask[p]) order.push(p);
  order.sort((a, b) => sm[b] - sm[a]);
  const parent = [0];
  const peak = [0];
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const label = new Int32Array(w * h);
  for (const p of order) {
    const x = p % w;
    const near = [];
    if (x > 0) near.push(p - 1);
    if (x < w - 1) near.push(p + 1);
    if (p >= w) near.push(p - w);
    if (p < w * (h - 1)) near.push(p + w);
    if (x > 0 && p >= w) near.push(p - w - 1);
    if (x < w - 1 && p >= w) near.push(p - w + 1);
    if (x > 0 && p < w * (h - 1)) near.push(p + w - 1);
    if (x < w - 1 && p < w * (h - 1)) near.push(p + w + 1);
    const roots = [];
    for (const q of near) {
      if (!label[q]) continue;
      const r = find(label[q]);
      if (!roots.includes(r)) roots.push(r);
    }
    if (!roots.length) {
      const id = parent.length;
      parent.push(id);
      peak.push(sm[p]);
      label[p] = id;
      continue;
    }
    roots.sort((a, b) => peak[b] - peak[a]);
    const top = roots[0];
    label[p] = top;
    for (let k = 1; k < roots.length; k++) {
      const r = roots[k];
      // the pass here is sm[p]: wide enough compared with the smaller basin, they are one piece
      if (sm[p] >= ratio * peak[r] || peak[r] < 3) {
        parent[r] = top;
      }
    }
  }
  // roots to consecutive ids
  const ids = new Map();
  const out = new Int32Array(w * h);
  for (const p of order) {
    const r = find(label[p]);
    if (!ids.has(r)) ids.set(r, ids.size + 1);
    out[p] = ids.get(r);
  }
  // Two parts that meet along a long line (compared with the size of the smaller one) are one piece: a bed's
  // headboard and footboard are joined by a thin spread of bedding, but along the whole width
  for (;;) {
    const area = new Map();
    const seam = new Map();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const a = out[y * w + x];
        if (!a) continue;
        area.set(a, (area.get(a) || 0) + 1);
        for (const q of [x < w - 1 ? y * w + x + 1 : -1, y < h - 1 ? (y + 1) * w + x : -1]) {
          if (q < 0 || !out[q] || out[q] === a) continue;
          const key = a < out[q] ? a * 4096 + out[q] : out[q] * 4096 + a;
          seam.set(key, (seam.get(key) || 0) + 1);
        }
      }
    let worst = null;
    for (const [key, len] of seam) {
      const a = Math.floor(key / 4096);
      const b = key % 4096;
      const score = len / Math.sqrt(Math.min(area.get(a), area.get(b)));
      if (score >= 0.55 && (!worst || score > worst.score)) worst = { a, b, score };
    }
    if (!worst) break;
    for (let p = 0; p < out.length; p++) if (out[p] === worst.b) out[p] = worst.a;
  }
  const dense = new Map();
  for (let p = 0; p < out.length; p++)
    if (out[p]) {
      if (!dense.has(out[p])) dense.set(out[p], dense.size + 1);
      out[p] = dense.get(out[p]);
    }
  return out;
}

// ---------- clean-up, pieces, quality ----------

/**
 * Removes what is not furniture: thin strokes (text, a watermark), flat bars hugging a border (a caption),
 * and specks; keeps every sizeable piece, largest first.
 */
function tidy(mask, w, h, hints = {}) {
  const r = Math.max(1, Math.round(Math.max(w, h) / 150));
  let m = openMask(dropStrips(mask, w, h, hints), w, h, r);
  m = closeMask(m, w, h, r);
  m = fillSmallHoles(m, w, h, 0.01);
  const { labels, list } = components(m, w, h);
  if (!list.length) return { mask: m, pieces: [] };
  const total = w * h;
  const out = new Uint8Array(w * h);
  const kept = [];
  const biggest = Math.max(...list.map((c) => c.area));
  for (const c of list) {
    const b = c.box;
    const fill = c.area / (b.width * b.height);
    // a caption or ribbon: wide, short and flat against the border
    const hugsBorder = b.minY === 0 || b.maxY === h - 1 || b.minX === 0 || b.maxX === w - 1;
    const ribbon = b.height < h * 0.1 && b.width > b.height * 4 && hugsBorder && fill > 0.5;
    const hinted = hints.fg && hasHint(hints.fg, labels, c.id);
    // wall art and windows hang high in the picture; furniture stands on the floor, in the lower part
    const high = c.box.maxY < h * 0.5 && c.area < biggest * 0.5;
    if (!hinted && (ribbon || high || c.area < total * 0.012 || c.area < biggest * 0.1)) continue;
    kept.push(c);
  }
  kept.sort((a, b) => b.area - a.area);
  for (let p = 0; p < labels.length; p++) if (kept.some((c) => c.id === labels[p])) out[p] = 1;
  return { mask: out, pieces: kept };
}

/**
 * Removes upright slivers (a lit strip of wall, a curtain edge, a lamp stem) that hang on a piece: runs of object
 * narrower than a few percent of the picture are dropped, and what stands below a surviving part within a short
 * reach (legs, feet) is put back.
 */
function dropStrips(mask, w, h, hints) {
  const k = Math.max(3, Math.round(Math.max(w, h) * 0.07));
  const keep = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && mask[y * w + x]) run++;
      else {
        if (run >= k) for (let i = x - run; i < x; i++) keep[y * w + i] = 1;
        run = 0;
      }
    }
  }
  const reachMax = Math.round(h * 0.14);
  const out = Uint8Array.from(keep);
  for (let x = 0; x < w; x++) {
    let reach = 0;
    for (let y = 0; y < h; y++) {
      const p = y * w + x;
      if (keep[p]) reach = reachMax;
      else if (mask[p] && reach > 0) {
        out[p] = 1;
        reach--;
      } else reach = 0;
    }
  }
  if (hints.fg) for (let p = 0; p < out.length; p++) if (hints.fg[p]) out[p] = mask[p] | out[p];
  return out;
}

function hasHint(hint, labels, id) {
  for (let p = 0; p < labels.length; p++) if (hint[p] && labels[p] === id) return true;
  return false;
}

/**
 * How trustworthy a cut-out looks, 0-1: a sensible share of the picture, a compact outline, an edge that follows
 * real colour steps, and not glued to the border all the way round.
 */
export function cutQuality(rgba, mask, w, h) {
  const n = w * h;
  let area = 0;
  for (let p = 0; p < n; p++) area += mask[p];
  if (!area) return 0;
  const frac = area / n;
  let perim = 0,
    edgeSum = 0,
    borderTouch = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!mask[p]) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borderTouch++;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || mask[yy * w + xx]) continue;
        perim++;
        const q = yy * w + xx;
        edgeSum += Math.hypot(
          rgba[p * 4] - rgba[q * 4],
          rgba[p * 4 + 1] - rgba[q * 4 + 1],
          rgba[p * 4 + 2] - rgba[q * 4 + 2]
        );
      }
    }
  const edge = perim ? Math.min(1, edgeSum / perim / 60) : 0;
  const compact = Math.min(1, (4 * Math.PI * area) / Math.max(1, perim * perim) / 0.12);
  const size = frac < 0.04 ? frac / 0.04 : frac > 0.85 ? Math.max(0, (1 - frac) / 0.15) : 1;
  const free = 1 - Math.min(1, borderTouch / Math.max(1, 2 * (w + h)) / 0.6);
  return Math.max(0, Math.min(1, 0.4 * edge + 0.2 * compact + 0.25 * size + 0.15 * free));
}

/** How furniture-like a candidate cut-out is: a good outline, a sensible size, floor contact, not a frame of border. */
function candidateScore(rgba, mask, w, h) {
  const q = cutQuality(rgba, mask, w, h);
  let area = 0,
    maxY = 0,
    minY = h;
  for (let p = 0; p < mask.length; p++)
    if (mask[p]) {
      area++;
      const y = Math.floor(p / w);
      if (y > maxY) maxY = y;
      if (y < minY) minY = y;
    }
  if (!area) return -1;
  const frac = area / (w * h);
  // furniture rarely fills more than half the photo, and stands in the lower three quarters
  const size = frac > 0.55 ? Math.max(0, 1 - (frac - 0.55) / 0.2) : frac < 0.05 ? frac / 0.05 : 1;
  const grounded = maxY > h * 0.55 ? 1 : 0.6;
  return q * size * grounded;
}

/**
 * Is the backdrop plain enough for the colour-threshold cut? (a studio or catalogue picture)
 * @returns {{ plain: boolean, noise: number, share: number }}
 */
export function backdropIsPlain(rgba, width, height) {
  const bg = fitBackground(rgba, width, height);
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.03));
  let close = 0,
    count = 0;
  const check = (x, y) => {
    const i = (y * width + x) * 4;
    const [r, g, b] = bg.at(x / width, y / height);
    if (Math.hypot(rgba[i] - r, rgba[i + 1] - g, rgba[i + 2] - b) <= 28) close++;
    count++;
  };
  for (let x = 0; x < width; x += 2)
    for (let d = 0; d < band; d++) {
      check(x, d);
      check(x, height - 1 - d);
    }
  for (let y = 0; y < height; y += 2)
    for (let d = 0; d < band; d++) {
      check(d, y);
      check(width - 1 - d, y);
    }
  const share = close / Math.max(1, count);
  return { plain: share >= 0.9 && bg.noise <= 8, noise: bg.noise, share };
}

// ---------- user edits ----------

/**
 * Paints brush strokes into a mask (1 = marked), at any resolution: strokes are in fractions of the photo.
 * @param {Array<{ points: Array<[number, number]>, size: number }>} strokes size is a fraction of the long side
 */
export function paintStrokes(strokes, width, height) {
  const out = new Uint8Array(width * height);
  const long = Math.max(width, height);
  for (const s of strokes || []) {
    const r = Math.max(1, (s.size * long) / 2);
    const pts = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = [pts[i][0] * width, pts[i][1] * height];
      const [x1, y1] = [pts[i + 1][0] * width, pts[i + 1][1] * height];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r / 2)));
      for (let k = 0; k <= steps; k++) {
        const cx = x0 + ((x1 - x0) * k) / steps;
        const cy = y0 + ((y1 - y0) * k) / steps;
        for (
          let y = Math.max(0, Math.floor(cy - r));
          y <= Math.min(height - 1, Math.ceil(cy + r));
          y++
        )
          for (
            let x = Math.max(0, Math.floor(cx - r));
            x <= Math.min(width - 1, Math.ceil(cx + r));
            x++
          )
            if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) out[y * width + x] = 1;
      }
    }
  }
  return out;
}

/**
 * The cut-out of one photo.
 * @param {Uint8ClampedArray} rgba
 * @param {{ tolerance?: number, mode?: 'auto'|'plain'|'scene', crop?: {x0:number,y0:number,x1:number,y1:number}|null,
 *   keep?: object[], remove?: object[] }} [options] crop in photo fractions, strokes as for paintStrokes
 * @returns {{ mask: Uint8Array, quality: number, mode: 'plain'|'scene', pieces: Array<{id:number,area:number,box:object,cx:number,cy:number}>,
 *   pieceLabels: Int32Array, coverage: number }} masks are photo-sized; pieces describe the separate blobs, largest first
 */
export function extractForeground(rgba, width, height, options = {}) {
  const { tolerance = 16, mode = 'auto', crop = null, keep = [], remove = [] } = options;
  const x0 = crop ? Math.max(0, Math.floor(crop.x0 * width)) : 0;
  const y0 = crop ? Math.max(0, Math.floor(crop.y0 * height)) : 0;
  const x1 = crop ? Math.min(width, Math.ceil(crop.x1 * width)) : width;
  const y1 = crop ? Math.min(height, Math.ceil(crop.y1 * height)) : height;
  const cw = Math.max(2, x1 - x0);
  const ch = Math.max(2, y1 - y0);
  const cropped = crop && (cw < width || ch < height);
  let sub = rgba;
  if (cropped) {
    sub = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      sub.set(
        rgba.subarray(((y + y0) * width + x0) * 4, ((y + y0) * width + x0 + cw) * 4),
        y * cw * 4
      );
  }
  const fgHint = keep.length ? paintStrokes(keep, width, height) : null;
  const bgHint = remove.length ? paintStrokes(remove, width, height) : null;
  const subHint = (hint) => {
    if (!hint || !cropped) return hint;
    const o = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) o[y * cw + x] = hint[(y + y0) * width + x + x0];
    return o;
  };
  const edited = Boolean(fgHint || bgHint);
  const plain = mode === 'plain' || (mode === 'auto' && backdropIsPlain(sub, cw, ch).plain);
  let used = plain ? 'plain' : 'scene';
  let mask;
  let smallSplit = null;
  if (plain && !edited) {
    mask = segmentObject(sub, cw, ch, tolerance);
  } else {
    // the scene cut works on a small copy; the result is scaled back up
    const small = shrinkRgba(sub, cw, ch, ANALYSIS_EDGE);
    const shrinkHint = (hint) =>
      hint ? resizeMask(subHint(hint) || hint, cw, ch, small.width, small.height) : undefined;
    const hints = { fg: shrinkHint(fgHint), bg: shrinkHint(bgHint) };
    // a stroke can vanish when scaled down: dilate it a pixel so it still counts
    if (hints.fg) hints.fg = morph(hints.fg, small.width, small.height, 1, true);
    if (hints.bg) hints.bg = morph(hints.bg, small.width, small.height, 1, true);
    // Two readings of the room: with and without "a big evenly coloured region is wall". The one whose outline
    // follows more of the picture's own edges and looks more like a piece of furniture wins.
    let best = null;
    for (const wallRule of [true, false]) {
      const cutA = sceneCut(small, hints, { wallRule });
      const tidyA = tidy(cutA.mask, small.width, small.height, hints);
      const score = candidateScore(small.rgba, tidyA.mask, small.width, small.height);
      if (!best || score > best.score) best = { cut: cutA, tidy: tidyA, score };
    }
    const tidy1 = best.tidy;
    mask = resizeMask(tidy1.mask, small.width, small.height, cw, ch);
    smallSplit = {
      labels: splitPieces(tidy1.mask, small.width, small.height),
      w: small.width,
      h: small.height,
      cw,
      ch,
    };
    used = 'scene';
  }
  let full = mask;
  if (cropped) {
    full = new Uint8Array(width * height);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) full[(y + y0) * width + x + x0] = mask[y * cw + x];
  }
  if (plain && edited) {
    // strokes on a plain picture: apply directly on the colour cut
    // (handled by the scene cut above, which already honours them)
  }
  let labels;
  let list;
  if (smallSplit) {
    // pieces were separated at analysis size; carry the labels to the photo (nearest), inside the final mask
    const sp = smallSplit;
    labels = new Int32Array(width * height);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        if (!mask[y * cw + x]) continue;
        const sx = Math.min(sp.w - 1, Math.floor(((x + 0.5) * sp.w) / cw));
        const sy = Math.min(sp.h - 1, Math.floor(((y + 0.5) * sp.h) / ch));
        let id = sp.labels[sy * sp.w + sx];
        if (!id) {
          // an edge pixel just outside the small mask: take the nearest label around
          for (let r = 1; r <= 2 && !id; r++)
            for (let dy = -r; dy <= r && !id; dy++)
              for (let dx = -r; dx <= r && !id; dx++) {
                const xx = sx + dx;
                const yy = sy + dy;
                if (xx >= 0 && yy >= 0 && xx < sp.w && yy < sp.h) id = sp.labels[yy * sp.w + xx];
              }
        }
        labels[(y + y0) * width + x + x0] = id;
      }
    list = [];
    const stats = new Map();
    for (let p = 0; p < labels.length; p++) {
      const id = labels[p];
      if (!id) continue;
      const x = p % width;
      const y = (p - x) / width;
      const c = stats.get(id) || {
        id,
        area: 0,
        minX: width,
        minY: height,
        maxX: -1,
        maxY: -1,
        sx: 0,
        sy: 0,
      };
      c.area++;
      c.sx += x;
      c.sy += y;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      stats.set(id, c);
    }
    for (const c of stats.values())
      list.push({
        id: c.id,
        area: c.area,
        box: {
          minX: c.minX,
          minY: c.minY,
          maxX: c.maxX,
          maxY: c.maxY,
          width: c.maxX - c.minX + 1,
          height: c.maxY - c.minY + 1,
        },
        cx: c.sx / c.area,
        cy: c.sy / c.area,
      });
  } else ({ labels, list } = components(full, width, height));
  const pieces = list
    .filter((c) => c.area >= width * height * 0.01)
    .sort((a, b) => b.area - a.area);
  return {
    mask: full,
    quality: cutQuality(rgba, full, width, height),
    mode: used,
    pieces,
    pieceLabels: labels,
    coverage: full.reduce((a, v) => a + v, 0) / full.length,
  };
}

/** The bounding box of a mask (re-exported for callers that only import this module). */
export const foregroundBounds = maskBounds;
