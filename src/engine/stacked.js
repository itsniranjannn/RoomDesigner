/**
 * stacked.js
 * One picture that holds several photos of the same piece (a listing image with a front view above a three-quarter
 * view, or two side by side), separated by a plain gutter. Finds the gutter, the photos on either side of it, and
 * whether they show the same piece (similar colours), so the dialog can split them into views by itself.
 * Pure functions on RGBA pixel arrays.
 */

import { rgbToLab } from './foreground.js';

const SAMPLE = 160;

/** Per-line (row or column) plainness: how little the colour varies along the line, and its mean colour. */
function lineStats(rgba, width, height, axis) {
  const lines = axis === 'y' ? height : width;
  const along = axis === 'y' ? width : height;
  const step = Math.max(1, Math.floor(along / SAMPLE));
  const out = [];
  for (let l = 0; l < lines; l++) {
    let n = 0;
    const sum = [0, 0, 0];
    const sq = [0, 0, 0];
    for (let a = 0; a < along; a += step) {
      const i = (axis === 'y' ? l * width + a : a * width + l) * 4;
      for (let c = 0; c < 3; c++) {
        sum[c] += rgba[i + c];
        sq[c] += rgba[i + c] * rgba[i + c];
      }
      n++;
    }
    const mean = sum.map((v) => v / n);
    const sd = Math.sqrt(Math.max(0, (sq[0] + sq[1] + sq[2]) / n - (mean[0] ** 2 + mean[1] ** 2 + mean[2] ** 2)));
    out.push({ mean, sd });
  }
  return out;
}

/** Plain runs of lines: [start, end) where the colour barely varies along the line and stays the same colour. */
function plainRuns(stats, maxSd = 7) {
  const runs = [];
  let s = -1;
  for (let l = 0; l <= stats.length; l++) {
    const plain =
      l < stats.length &&
      stats[l].sd <= maxSd &&
      (s < 0 ||
        Math.hypot(
          stats[l].mean[0] - stats[s].mean[0],
          stats[l].mean[1] - stats[s].mean[1],
          stats[l].mean[2] - stats[s].mean[2]
        ) < 30);
    if (plain) {
      if (s < 0) s = l;
    } else {
      if (s >= 0) runs.push([s, l]);
      s = -1;
      if (l < stats.length && stats[l].sd <= maxSd) s = l;
    }
  }
  return runs;
}

/** A coarse Lab histogram of a region (skipping near-white and near-black pixels), normalised to unit length. */
function colorSignature(rgba, width, box) {
  const hist = new Float64Array(5 * 6 * 6);
  const stepX = Math.max(1, Math.floor(box.w / 80));
  const stepY = Math.max(1, Math.floor(box.h / 80));
  for (let y = box.y; y < box.y + box.h; y += stepY)
    for (let x = box.x; x < box.x + box.w; x += stepX) {
      const i = (y * width + x) * 4;
      const [L, a, b] = rgbToLab(rgba[i], rgba[i + 1], rgba[i + 2]);
      if (L > 92 || L < 6) continue;
      // chroma carries the identity of a piece (wood, leather, fabric) better than lightness does
      const c = Math.hypot(a, b);
      if (c < 6) continue;
      const li = Math.min(4, Math.floor(L / 20));
      const ai = Math.min(5, Math.max(0, Math.floor((a + 30) / 10)));
      const bi = Math.min(5, Math.max(0, Math.floor((b + 20) / 10)));
      hist[(li * 6 + ai) * 6 + bi] += 1;
    }
  const norm = Math.sqrt(hist.reduce((s, v) => s + v * v, 0)) || 1;
  return hist.map((v) => v / norm);
}

const cosine = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

/**
 * Looks for a plain gutter splitting the picture into photos.
 * @returns {{ axis: 'x'|'y', parts: Array<{x:number,y:number,w:number,h:number}>, similarity: number } | null}
 *   parts in reading order; similarity 0-1 is how alike the colours of the photos are (the same piece)
 */
export function detectStackedPhotos(rgba, width, height) {
  let best = null;
  for (const axis of ['y', 'x']) {
    const length = axis === 'y' ? height : width;
    const stats = lineStats(rgba, width, height, axis);
    const runs = plainRuns(stats);
    const minGap = Math.max(2, Math.round(length * 0.004));
    // cuts between photos; plain runs at either end are just margins
    const spans = [];
    let from = 0;
    const margin = (r) => r[0] <= length * 0.03 || r[1] >= length * 0.97;
    for (const r of runs) {
      if (r[1] - r[0] < minGap) continue;
      if (r[0] <= length * 0.03 && r[0] <= from + 1) {
        from = Math.max(from, r[1]);
        continue;
      }
      if (r[1] >= length * 0.97) {
        spans.push([from, r[0]]);
        from = -1;
        break;
      }
      if (margin(r)) continue;
      spans.push([from, r[0]]);
      from = r[1];
    }
    if (from >= 0) spans.push([from, length]);
    const parts = spans
      .filter(([a, b]) => b - a >= length * 0.12)
      .map(([a, b]) =>
        axis === 'y' ? { x: 0, y: a, w: width, h: b - a } : { x: a, y: 0, w: b - a, h: height }
      );
    if (parts.length < 2 || parts.length > 4) continue;
    // each photo must have content (not a plain strip) and the pieces must look alike
    const sigs = parts.map((p) => colorSignature(rgba, width, p));
    let sim = 0;
    let pairs = 0;
    for (let i = 0; i < sigs.length; i++)
      for (let j = i + 1; j < sigs.length; j++) {
        sim += cosine(sigs[i], sigs[j]);
        pairs++;
      }
    sim /= pairs;
    if (!best || parts.length > best.parts.length) best = { axis, parts, similarity: sim };
  }
  return best;
}

/** Crops a region out of an RGBA picture, trimming plain margins off its edges. */
export function cropRegion(rgba, width, box) {
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++)
    out.set(rgba.subarray(((box.y + y) * width + box.x) * 4, ((box.y + y) * width + box.x + box.w) * 4), y * box.w * 4);
  return { rgba: out, width: box.w, height: box.h };
}

/**
 * Which of several masks of the same piece is the straight-on view: the most left-right symmetric outline
 * (a bed or sofa seen from the front mirrors itself; from three quarters it does not).
 * @param {Array<Uint8Array>} masks square or any size, each the same size as its own width/height
 * @param {Array<{width:number,height:number}>} sizes
 * @returns {number[]} symmetry 0-1 per mask
 */
export function symmetryScores(masks, sizes) {
  return masks.map((mask, k) => {
    const { width: w, height: h } = sizes[k];
    let minX = w,
      maxX = -1,
      minY = h,
      maxY = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (mask[y * w + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    if (maxX < 0) return 0;
    let both = 0,
      either = 0;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const a = mask[y * w + x];
        const b = mask[y * w + (minX + maxX - x)];
        if (a || b) either++;
        if (a && b) both++;
      }
    return either ? both / either : 0;
  });
}
