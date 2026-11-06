/**
 * hull.js
 * Builds a coloured 3D model from a few photos of an object, entirely in the browser:
 *   1. segment the object from the (plain) background of each photo,
 *   2. carve a voxel grid with the silhouettes (visual hull, orthographic views),
 *   3. smooth the carved volume and extract a clean indexed surface (surface nets),
 *      colouring every vertex from the photos that see it best.
 *
 * Views sit at fixed angles around the object: front (0), right (90), back (180),
 * left (270) and top. Each silhouette is cropped and stretched to the object's
 * bounding box, so real proportions come from the width/depth/height the user enters.
 *
 * Mesh space: x = width and z = depth (centred, [-0.5, 0.5]), y = height ([0, 1], 0 = floor).
 * Meshes are `{ positions: Float32Array, colors: Uint8Array, indices?: Uint16Array | Uint32Array }`.
 * Meshes without `indices` are the older block-based triangle soup and are upgraded on load.
 */

export const VIEW_SLOTS = [
  { id: 'front', label: 'Front', angle: 0 },
  { id: 'right', label: 'Right side', angle: 90 },
  { id: 'back', label: 'Back', angle: 180 },
  { id: 'left', label: 'Left side', angle: 270 },
  { id: 'top', label: 'Top', angle: null },
];

const MESH_RESOLUTION = 88;
const NORMAL_SIZE = 160;
const LEGACY_RESOLUTION = 40;

// ---------- segmentation ----------

function solve3(m, b) {
  // Gauss-Jordan on a 3x3 system; returns null when singular
  const a = m.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-9) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/**
 * A vignette or a spotlight makes the backdrop fall off toward the corners, which a plane cannot follow: fit a
 * quadratic surface to the border samples instead (robustly, dropping samples an object covers), and keep it only
 * when it models the border clearly better.
 */
function quadraticBackground(samples, plane) {
  const terms = (x, y) => [1, x, y, x * x, x * y, y * y];
  const solve = (list) => {
    const n = 6;
    const m = Array.from({ length: n }, () => new Array(n).fill(0));
    const rhs = [0, 1, 2].map(() => new Array(n).fill(0));
    for (const s of list) {
      const t = terms(s.x, s.y);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) m[i][j] += t[i] * t[j];
        for (let c = 0; c < 3; c++) rhs[c][i] += t[i] * s.c[c];
      }
    }
    for (let i = 0; i < n; i++) m[i][i] += 1e-6;
    return rhs.map((r) => {
      const a = m.map((row, i) => [...row, r[i]]);
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(a[r2][c]) > Math.abs(a[p][c])) p = r2;
        if (Math.abs(a[p][c]) < 1e-12) return null;
        [a[c], a[p]] = [a[p], a[c]];
        for (let r2 = 0; r2 < n; r2++) {
          if (r2 === c) continue;
          const f = a[r2][c] / a[c][c];
          for (let k = c; k <= n; k++) a[r2][k] -= f * a[c][k];
        }
      }
      return a.map((row, i) => row[n] / row[i]);
    });
  };
  const predict = (coef, x, y) =>
    coef.map((c) => c.reduce((acc, v, i) => acc + v * terms(x, y)[i], 0));
  const resid = (coef, s) => {
    const p = predict(coef, s.x, s.y);
    return Math.hypot(s.c[0] - p[0], s.c[1] - p[1], s.c[2] - p[2]);
  };
  let kept = samples;
  let coef = solve(kept);
  for (let pass = 0; pass < 3 && coef && !coef.some((c) => !c); pass++) {
    const res = kept.map((s) => resid(coef, s)).sort((a, b) => a - b);
    const cut = Math.max(14, 2.5 * res[Math.floor(res.length / 2)]);
    const next = samples.filter((s) => resid(coef, s) <= cut);
    if (next.length < 24) break;
    kept = next;
    coef = solve(kept) || coef;
  }
  if (!coef || coef.some((c) => !c)) return plane;
  let sq = 0;
  for (const s of kept) sq += resid(coef, s) ** 2;
  const noise = Math.sqrt(sq / Math.max(1, kept.length));
  if (noise > plane.noise * 0.6) return plane;
  return { at: (x, y) => predict(coef, x, y), noise };
}

/**
 * Models the background as a plane (per colour channel) fitted to a band of pixels along the photo border,
 * so soft vignettes and gentle gradients do not leak into the object. Samples that disagree (an object
 * touching the border) are dropped and the plane refitted.
 * @returns {{ at: (x: number, y: number) => number[], noise: number }}
 */
export function fitBackground(rgba, width, height) {
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.03));
  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 40));
  let samples = [];
  const take = (x, y) => {
    const i = (y * width + x) * 4;
    samples.push({ x: x / width, y: y / height, c: [rgba[i], rgba[i + 1], rgba[i + 2]] });
  };
  for (let x = 0; x < width; x += stepX) {
    for (let d = 0; d < band; d++) {
      take(x, d);
      take(x, height - 1 - d);
    }
  }
  for (let y = 0; y < height; y += stepY) {
    for (let d = 0; d < band; d++) {
      take(d, y);
      take(width - 1 - d, y);
    }
  }

  const everySample = () => samples.slice();
  const fit = (list) => {
    const m = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const rhs = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const s of list) {
      const row = [1, s.x, s.y];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
        for (let ch = 0; ch < 3; ch++) rhs[ch][i] += row[i] * s.c[ch];
      }
    }
    const coef = rhs.map((r) => solve3(m, r));
    return coef.some((c) => !c) ? null : coef;
  };
  const predict = (coef, x, y) => coef.map((c) => c[0] + c[1] * x + c[2] * y);
  const residual = (coef, s) => {
    const p = predict(coef, s.x, s.y);
    return Math.hypot(s.c[0] - p[0], s.c[1] - p[1], s.c[2] - p[2]);
  };

  // Start from the median border colour so an object touching the border cannot drag the fit away
  const median = (ch) =>
    samples.map((s) => s.c[ch]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  const allSamples = everySample();
  const base = [median(0), median(1), median(2)];
  let kept = samples.filter(
    (s) => Math.hypot(s.c[0] - base[0], s.c[1] - base[1], s.c[2] - base[2]) <= 45
  );
  if (kept.length < 12) kept = samples;
  let coef = fit(kept);
  for (let pass = 0; pass < 2 && coef; pass++) {
    const res = kept.map((s) => residual(coef, s)).sort((a, b) => a - b);
    const cut = Math.max(18, 2.5 * res[Math.floor(res.length / 2)]);
    const next = samples.filter((s) => residual(coef, s) <= cut);
    if (next.length < 12) break;
    kept = next;
    coef = fit(kept) || coef;
  }
  samples = kept;
  if (!coef) {
    const mean = [0, 0, 0];
    for (const s of samples) for (let ch = 0; ch < 3; ch++) mean[ch] += s.c[ch] / samples.length;
    coef = mean.map((v) => [v, 0, 0]);
  }
  let sq = 0;
  for (const s of samples) sq += residual(coef, s) ** 2;
  const noise = Math.sqrt(sq / Math.max(1, samples.length));
  const plane = { at: (x, y) => predict(coef, x, y), noise };
  return noise > 7 ? quadraticBackground(allSamples, plane) : plane;
}

function boxFilter(mask, width, height, radius, mode) {
  // mode 'min' erodes, 'max' dilates (square window, separable)
  const pass = (src, horizontal) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let v = mode === 'min' ? 1 : 0;
        for (let d = -radius; d <= radius && (mode === 'min' ? v === 1 : v === 0); d++) {
          const sx = horizontal ? x + d : x;
          const sy = horizontal ? y : y + d;
          const inside = sx >= 0 && sy >= 0 && sx < width && sy < height;
          const s = inside ? src[sy * width + sx] : mode === 'min' ? 1 : 0;
          if (mode === 'min' && !s) v = 0;
          if (mode === 'max' && s) v = 1;
        }
        out[y * width + x] = v;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

function majority(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          const sy = Math.min(height - 1, Math.max(0, y + dy));
          n += mask[sy * width + sx];
        }
      }
      out[y * width + x] = n >= 5 ? 1 : 0;
    }
  }
  return out;
}

function keepLargestComponent(mask, width, height) {
  const labels = new Int32Array(width * height);
  let best = 0;
  let bestSize = 0;
  let label = 0;
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    let size = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % width;
      const y = (p - x) / width;
      if (x > 0 && mask[p - 1] && !labels[p - 1]) {
        labels[p - 1] = label;
        stack.push(p - 1);
      }
      if (x < width - 1 && mask[p + 1] && !labels[p + 1]) {
        labels[p + 1] = label;
        stack.push(p + 1);
      }
      if (y > 0 && mask[p - width] && !labels[p - width]) {
        labels[p - width] = label;
        stack.push(p - width);
      }
      if (y < height - 1 && mask[p + width] && !labels[p + width]) {
        labels[p + width] = label;
        stack.push(p + width);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = label;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = labels[i] === best && best !== 0 ? 1 : 0;
  return out;
}

/**
 * Fills small holes inside the object (highlights, patterns close to the backdrop colour) but keeps large
 * openings, such as the gap between a chair's legs or a window in a frame, so they stay open in 3D.
 */
function fillHoles(mask, width, height) {
  // Flood the background from the border; anything not reached is a hole inside the object
  const outside = new Uint8Array(mask.length);
  const stack = [];
  const push = (p) => {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (y > 0) push(p - width);
    if (y < height - 1) push(p + width);
  }
  let objectArea = 0;
  for (let i = 0; i < mask.length; i++) objectArea += mask[i];
  const limit = Math.max(24, Math.min(objectArea * 0.02, width * height * 0.01));

  const out = Uint8Array.from(mask);
  const visited = new Uint8Array(mask.length);
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] || outside[start] || visited[start]) continue;
    const cells = [start];
    visited[start] = 1;
    for (let k = 0; k < cells.length; k++) {
      const p = cells[k];
      const x = p % width;
      const y = (p - x) / width;
      const visit = (q) => {
        if (!mask[q] && !outside[q] && !visited[q]) {
          visited[q] = 1;
          cells.push(q);
        }
      };
      if (x > 0) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      if (y > 0) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
    if (cells.length <= limit) for (const p of cells) out[p] = 1;
  }
  return out;
}

/**
 * Fills background pixels that have the object above and below them close by in the same column. White
 * linen or a pale cushion on a white backdrop leaves such gaps inside a piece that is open to the side, which
 * hole filling cannot reach. Gaps are only filled when short compared with the object and held up
 * by more of it below, so the space under a table or between chair legs stays open.
 */
function fillSandwiched(mask, width, height) {
  const box = maskBounds(mask, width, height);
  if (!box) return mask;
  const maxRun = Math.max(2, Math.round(box.height * 0.25));
  const out = Uint8Array.from(mask);
  for (let x = box.minX; x <= box.maxX; x++) {
    let y = box.minY;
    while (y <= box.maxY) {
      if (mask[y * width + x]) {
        y++;
        continue;
      }
      let end = y;
      while (end <= box.maxY && !mask[end * width + x]) end++;
      // A run that starts below the top edge and ends before the bottom is bounded on both sides
      if (y > box.minY && end <= box.maxY && end - y <= maxRun) {
        for (let k = y; k < end; k++) out[k * width + x] = 1;
      }
      y = end;
    }
  }
  // Short gaps between two parts of the object in a row, with more of the object under them: the valley
  // between a headboard and a duvet seen from the side. Gaps with nothing below (between legs) stay open.
  const supported = new Uint8Array(mask.length);
  for (let x = box.minX; x <= box.maxX; x++) {
    let seen = 0;
    for (let y = box.maxY; y >= box.minY; y--) {
      supported[y * width + x] = seen;
      if (mask[y * width + x]) seen = 1;
    }
  }
  const maxGap = Math.max(2, Math.round(box.width * 0.25));
  for (let y = box.minY; y <= box.maxY; y++) {
    let x = box.minX;
    while (x <= box.maxX) {
      if (mask[y * width + x]) {
        x++;
        continue;
      }
      let end = x;
      while (end <= box.maxX && !mask[y * width + end]) end++;
      if (x > box.minX && end <= box.maxX && end - x <= maxGap) {
        for (let k = x; k < end; k++) if (supported[y * width + k]) out[y * width + k] = 1;
      }
      x = end;
    }
  }
  return out;
}

/**
 * Separates the object from a plain (possibly unevenly lit) background.
 * A pixel is object when it differs from the locally fitted background by more than the tolerance
 * and is not just a soft, same-coloured shadow of it. The raw cut is then cleaned up: thin fringes
 * and specks are opened away, the largest blob is kept, holes are filled and edges smoothed.
 * @param {Uint8ClampedArray|Uint8Array} rgba
 * @param {number} tolerance - colour distance (0-441) treated as background, default 60
 * @returns {Uint8Array} mask (1 = object)
 */
export function segmentObject(rgba, width, height, tolerance = 60, { keepGaps = false } = {}) {
  const bg = fitBackground(rgba, width, height);
  const threshold = Math.max(tolerance, bg.noise * 3.2);
  const raw = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      if (rgba[i + 3] < 40) continue;
      const [br, bgc, bb] = bg.at(x / width, y / height);
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const dist = Math.hypot(r - br, g - bgc, b - bb);
      if (dist <= threshold) continue;
      // Soft shadows keep the background's colour and only darken it a little
      const bb2 = br * br + bgc * bgc + bb * bb;
      if (bb2 > 1) {
        const k = (r * br + g * bgc + b * bb) / bb2;
        const off = Math.hypot(r - k * br, g - k * bgc, b - k * bb);
        if (k >= 0.72 && k <= 1.08 && off < threshold * 0.45 && dist < threshold * 1.8) continue;
      }
      raw[p] = 1;
    }
  }
  const radius = Math.max(1, Math.round(Math.min(width, height) / 400));
  const opened = boxFilter(
    boxFilter(raw, width, height, radius, 'min'),
    width,
    height,
    radius,
    'max'
  );
  // Gaps (between chair slats, shelf bays) are kept when asked, to read how open the piece is
  if (keepGaps) return majority(keepLargestComponent(opened, width, height), width, height);
  const filled = fillHoles(keepLargestComponent(opened, width, height), width, height);
  const mask = fillHoles(fillSandwiched(filled, width, height), width, height);
  return majority(mask, width, height);
}

export function maskCoverage(mask) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n / mask.length;
}

/** Bounding box of the object in a mask, or null when it is empty. */
export function maskBounds(mask, width, height) {
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0
    ? null
    : { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const PROPORTION_LIMIT = 1.45;

const SLOT_PROPORTION = {
  front: { across: 'widthCm', up: 'heightCm', wide: 'wide', tall: 'tall' },
  back: { across: 'widthCm', up: 'heightCm', wide: 'wide', tall: 'tall' },
  right: { across: 'depthCm', up: 'heightCm', wide: 'deep', tall: 'tall' },
  left: { across: 'depthCm', up: 'heightCm', wide: 'deep', tall: 'tall' },
  top: { across: 'widthCm', up: 'depthCm', wide: 'wide', tall: 'deep' },
};

/**
 * Warns when a cut-out is much wider or taller than the entered size allows, which usually means a
 * wrong size, a tilted camera or a photo cropped too tightly.
 * @param {Record<string, {mask: Uint8Array, width: number, height: number}>} cutouts by slot id
 * @param {{widthCm: number, depthCm: number, heightCm: number}} dims
 * @returns {string[]}
 */
export function proportionWarnings(cutouts, dims) {
  const out = [];
  for (const slot of VIEW_SLOTS) {
    const cut = cutouts[slot.id];
    if (!cut) continue;
    const box = maskBounds(cut.mask, cut.width, cut.height);
    if (!box) continue;
    const rule = SLOT_PROPORTION[slot.id];
    const ratio = box.width / box.height / (dims[rule.across] / dims[rule.up]);
    if (ratio > PROPORTION_LIMIT || ratio < 1 / PROPORTION_LIMIT) {
      const times = (ratio > 1 ? ratio : 1 / ratio).toFixed(1);
      const [more, less] = ratio > 1 ? [rule.wide, rule.tall] : [rule.tall, rule.wide];
      out.push(
        `The ${slot.label.toLowerCase()} photo shows the piece ${times} times more ${more} than ${less} compared with the size you entered.`
      );
    }
  }
  return out;
}

/**
 * Colours of pixels on the cut-out edge blend with the background; replace them with the average of
 * nearby interior pixels so the model does not pick up a pale or dark rim.
 */
function bleedEdgeColors(mask, rgb, size) {
  const interior = new Uint8Array(mask.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      if (!mask[p]) continue;
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const sx = x + dx;
          const sy = y + dy;
          if (sx < 0 || sy < 0 || sx >= size || sy >= size || !mask[sy * size + sx]) {
            edge = true;
            break;
          }
        }
      }
      interior[p] = edge ? 0 : 1;
    }
  }
  const out = Uint8Array.from(rgb);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      if (!mask[p] || interior[p]) continue;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const sx = x + dx;
          const sy = y + dy;
          if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
          const q = sy * size + sx;
          if (!interior[q]) continue;
          r += rgb[q * 3];
          g += rgb[q * 3 + 1];
          b += rgb[q * 3 + 2];
          n++;
        }
      }
      if (n) {
        out[p * 3] = r / n;
        out[p * 3 + 1] = g / n;
        out[p * 3 + 2] = b / n;
      }
    }
  }
  return out;
}

/**
 * Fills pixels outside the cut-out with the colour of the nearest object pixel, so colour lookups that land
 * slightly off the silhouette (thin legs, rims) still return the piece's colour instead of the backdrop.
 */
function extendColors(mask, rgb, size) {
  const out = Uint8Array.from(rgb);
  const seen = Uint8Array.from(mask);
  let frontier = [];
  for (let p = 0; p < mask.length; p++) if (mask[p]) frontier.push(p);
  while (frontier.length) {
    const next = [];
    for (const p of frontier) {
      const x = p % size;
      const y = (p - x) / size;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const sx = x + dx;
        const sy = y + dy;
        if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
        const q = sy * size + sx;
        if (seen[q]) continue;
        seen[q] = 1;
        out[q * 3] = out[p * 3];
        out[q * 3 + 1] = out[p * 3 + 1];
        out[q * 3 + 2] = out[p * 3 + 2];
        next.push(q);
      }
    }
    frontier = next;
  }
  return out;
}

/**
 * Crops a view to the object's bounding box and resamples it to a square grid.
 * @returns {{ mask: Uint8Array, rgb: Uint8Array, size: number } | null}
 */
export function normalizeView(rgba, mask, width, height, size = NORMAL_SIZE) {
  const box = maskBounds(mask, width, height);
  if (!box) return null;
  const { minX, minY, maxX, maxY } = box;
  const bw = box.width;
  const bh = box.height;
  const outMask = new Uint8Array(size * size);
  const outRgb = new Uint8Array(size * size * 3);
  for (let v = 0; v < size; v++) {
    const sy = Math.min(maxY, minY + Math.floor(((v + 0.5) / size) * bh));
    for (let u = 0; u < size; u++) {
      const sx = Math.min(maxX, minX + Math.floor(((u + 0.5) / size) * bw));
      const sp = sy * width + sx;
      const op = v * size + u;
      outMask[op] = mask[sp];
      outRgb[op * 3] = rgba[sp * 4];
      outRgb[op * 3 + 1] = rgba[sp * 4 + 1];
      outRgb[op * 3 + 2] = rgba[sp * 4 + 2];
    }
  }
  return {
    mask: outMask,
    rgb: extendColors(outMask, bleedEdgeColors(outMask, outRgb, size), size),
    size,
  };
}

// ---------- carving ----------

function projectToView(view, x, y, z) {
  if (view.slot === 'top') return { u: x, v: z };
  const rad = (view.angle * Math.PI) / 180;
  const u = 0.5 + (x - 0.5) * Math.cos(rad) - (z - 0.5) * Math.sin(rad);
  return { u, v: 1 - y };
}

function sample(view, u, v) {
  const s = view.size;
  const px = Math.min(s - 1, Math.max(0, Math.floor(u * s)));
  const py = Math.min(s - 1, Math.max(0, Math.floor(v * s)));
  return py * s + px;
}

function sampleRgb(view, u, v) {
  const s = view.size;
  const fx = Math.min(s - 1, Math.max(0, u * s - 0.5));
  const fy = Math.min(s - 1, Math.max(0, v * s - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(s - 1, x0 + 1);
  const y1 = Math.min(s - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const out = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    const a = view.rgb[(y0 * s + x0) * 3 + ch] * (1 - tx) + view.rgb[(y0 * s + x1) * 3 + ch] * tx;
    const b = view.rgb[(y1 * s + x0) * 3 + ch] * (1 - tx) + view.rgb[(y1 * s + x1) * 3 + ch] * tx;
    out[ch] = a * (1 - ty) + b * ty;
  }
  return out;
}

/**
 * @param {Array<{slot: string, angle: number|null, mask: Uint8Array, rgb: Uint8Array, size: number}>} views
 * @param {number} resolution voxels per axis
 * @returns {{ occupancy: Uint8Array, resolution: number }}
 */
export function carveVoxels(views, resolution = MESH_RESOLUTION) {
  const R = resolution;
  const occupancy = new Uint8Array(R * R * R).fill(1);
  for (let k = 0; k < R; k++) {
    const z = (k + 0.5) / R;
    for (let j = 0; j < R; j++) {
      const y = (j + 0.5) / R;
      for (let i = 0; i < R; i++) {
        const x = (i + 0.5) / R;
        const idx = (k * R + j) * R + i;
        for (const view of views) {
          const { u, v } = projectToView(view, x, y, z);
          if (!view.mask[sample(view, u, v)]) {
            occupancy[idx] = 0;
            break;
          }
        }
      }
    }
  }
  return { occupancy, resolution: R };
}

// ---------- surface extraction ----------

const CUBE_EDGES = (() => {
  const edges = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j <= 4; j <<= 1) {
      const p = i ^ j;
      if (i <= p) edges.push(i, p);
    }
  }
  return edges;
})();

const EDGE_TABLE = (() => {
  const table = new Int32Array(256);
  for (let mask = 0; mask < 256; mask++) {
    let bits = 0;
    for (let e = 0; e < 12; e++) {
      const a = Boolean(mask & (1 << CUBE_EDGES[2 * e]));
      const b = Boolean(mask & (1 << CUBE_EDGES[2 * e + 1]));
      if (a !== b) bits |= 1 << e;
    }
    table[mask] = bits;
  }
  return table;
})();

/** Occupancy as a smooth 0-1 density on a grid padded by one empty voxel on every side. */
function blurredDensity(occupancy, R) {
  const N = R + 2;
  let a = new Float32Array(N * N * N);
  for (let k = 0; k < R; k++) {
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < R; i++)
        a[((k + 1) * N + (j + 1)) * N + (i + 1)] = occupancy[(k * R + j) * R + i];
    }
  }
  const strides = [1, N, N * N];
  for (let pass = 0; pass < 2; pass++) {
    for (const stride of strides) {
      const b = new Float32Array(a.length);
      for (let p = 0; p < a.length; p++) {
        const lo = a[p - stride] ?? 0;
        const hi = a[p + stride] ?? 0;
        // Out-of-row neighbours wrap onto other rows; the empty padding ring makes that harmless
        b[p] = 0.25 * lo + 0.5 * a[p] + 0.25 * hi;
      }
      a = b;
    }
  }
  return { density: a, N };
}

/**
 * Surface nets on a density grid (inside > 0.5). Returns vertices in grid units and triangle indices
 * with counter-clockwise winding seen from outside.
 */
function surfaceNets(density, N) {
  const cells = N - 1;
  const cellStride = [1, cells, cells * cells];
  const cellVertex = new Int32Array(cells * cells * cells).fill(-1);
  const verts = [];
  const tris = [];
  const corner = new Float32Array(8);
  const xyz = [0, 0, 0];
  const acc = [0, 0, 0];
  for (let z = 0; z < cells; z++) {
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const base = x + y * N + z * N * N;
        let mask = 0;
        for (let g = 0; g < 8; g++) {
          const v = 0.5 - density[base + (g & 1 ? 1 : 0) + (g & 2 ? N : 0) + (g & 4 ? N * N : 0)];
          corner[g] = v;
          if (v < 0) mask |= 1 << g;
        }
        if (mask === 0 || mask === 255) continue;
        const edgeMask = EDGE_TABLE[mask];
        let count = 0;
        acc[0] = acc[1] = acc[2] = 0;
        for (let e = 0; e < 12; e++) {
          if (!(edgeMask & (1 << e))) continue;
          count++;
          const e0 = CUBE_EDGES[2 * e];
          const e1 = CUBE_EDGES[2 * e + 1];
          const g0 = corner[e0];
          const g1 = corner[e1];
          const diff = g0 - g1;
          const t = Math.abs(diff) > 1e-6 ? g0 / diff : 0.5;
          for (let j = 0; j < 3; j++) {
            const a = e0 & (1 << j);
            const b = e1 & (1 << j);
            if (a !== b) acc[j] += a ? 1 - t : t;
            else acc[j] += a ? 1 : 0;
          }
        }
        xyz[0] = x;
        xyz[1] = y;
        xyz[2] = z;
        const s = 1 / count;
        const cellIndex = x + y * cells + z * cells * cells;
        cellVertex[cellIndex] = verts.length / 3;
        verts.push(x + s * acc[0], y + s * acc[1], z + s * acc[2]);

        for (let i = 0; i < 3; i++) {
          if (!(edgeMask & (1 << i))) continue;
          const iu = (i + 1) % 3;
          const iv = (i + 2) % 3;
          if (xyz[iu] === 0 || xyz[iv] === 0) continue;
          const du = cellStride[iu];
          const dv = cellStride[iv];
          const a = cellVertex[cellIndex];
          const b = cellVertex[cellIndex - du];
          const c = cellVertex[cellIndex - du - dv];
          const d = cellVertex[cellIndex - dv];
          if (mask & 1) tris.push(a, b, c, a, c, d);
          else tris.push(a, d, c, a, c, b);
        }
      }
    }
  }
  return { verts, tris };
}

function viewDirection(view) {
  if (view.slot === 'top') return [0, 1, 0];
  const rad = (view.angle * Math.PI) / 180;
  return [Math.sin(rad), 0, Math.cos(rad)];
}

/** Colour for a surface point, blended from the photos that face it (mirroring the best one if none does). */
function blendViewColor(views, n, x, y, z, fallback) {
  let r = 0,
    g = 0,
    b = 0,
    total = 0;
  let best = null;
  let bestScore = -Infinity;
  for (const view of views) {
    const d = viewDirection(view);
    const score = n[0] * d[0] + n[1] * d[1] + n[2] * d[2];
    if (score > bestScore) {
      bestScore = score;
      best = view;
    }
    if (score <= 0.05) continue;
    const { u, v } = projectToView(view, x, y, z);
    const c = sampleRgb(view, u, v);
    const w = score ** 3;
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
    total += w;
  }
  if (total > 0) return [r / total, g / total, b / total];
  if (!best) return fallback;
  const { u, v } = projectToView(best, x, y, z);
  return sampleRgb(best, u, v);
}

function averageColor(views) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const view of views) {
    for (let p = 0; p < view.mask.length; p += 7) {
      if (view.mask[p]) {
        r += view.rgb[p * 3];
        g += view.rgb[p * 3 + 1];
        b += view.rgb[p * 3 + 2];
        n++;
      }
    }
  }
  return n ? [r / n, g / n, b / n] : [160, 160, 160];
}

/**
 * Smooths a voxel volume and extracts an indexed triangle mesh from it.
 * @param {Uint8Array} occupancy R*R*R, 1 = solid
 * @param {(x: number, y: number, z: number, n: number[]) => number[]} colorAt colour for a point in unit space with its outward normal
 */
function buildSmoothMesh(occupancy, R, colorAt) {
  const { density, N } = blurredDensity(occupancy, R);
  const { verts, tris } = surfaceNets(density, N);
  const vertexCount = verts.length / 3;
  if (vertexCount === 0) return null;

  // Grid units -> unit cube, where voxel i is centred at (i + 0.5) / R
  const unit = new Float32Array(verts.length);
  for (let i = 0; i < verts.length; i++) unit[i] = (verts[i] - 0.5) / R;

  // Outward vertex normals from the (area-weighted) triangle normals
  const normals = new Float32Array(unit.length);
  for (let t = 0; t < tris.length; t += 3) {
    const ia = tris[t] * 3,
      ib = tris[t + 1] * 3,
      ic = tris[t + 2] * 3;
    const ux = unit[ib] - unit[ia],
      uy = unit[ib + 1] - unit[ia + 1],
      uz = unit[ib + 2] - unit[ia + 2];
    const vx = unit[ic] - unit[ia],
      vy = unit[ic + 1] - unit[ia + 1],
      vz = unit[ic + 2] - unit[ia + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const i of [ia, ib, ic]) {
      normals[i] += nx;
      normals[i + 1] += ny;
      normals[i + 2] += nz;
    }
  }

  const colors = new Uint8Array(unit.length);
  const inset = 0.8 / R;
  for (let v = 0; v < vertexCount; v++) {
    const i = v * 3;
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    const n = [normals[i] / len, normals[i + 1] / len, normals[i + 2] / len];
    // Look just inside the surface so the sample point stays within each silhouette
    const c = colorAt(
      unit[i] - n[0] * inset,
      unit[i + 1] - n[1] * inset,
      unit[i + 2] - n[2] * inset,
      n
    );
    colors[i] = Math.round(Math.min(255, Math.max(0, c[0])));
    colors[i + 1] = Math.round(Math.min(255, Math.max(0, c[1])));
    colors[i + 2] = Math.round(Math.min(255, Math.max(0, c[2])));
  }

  // Stretch to the exact model bounds: x, z in [-0.5, 0.5] and y in [0, 1] with the base on the floor
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < unit.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      if (unit[i + a] < min[a]) min[a] = unit[i + a];
      if (unit[i + a] > max[a]) max[a] = unit[i + a];
    }
  }
  const positions = new Float32Array(unit.length);
  for (let i = 0; i < unit.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const span = max[a] - min[a] || 1;
      const t = (unit[i + a] - min[a]) / span;
      positions[i + a] = a === 1 ? t : t - 0.5;
    }
  }

  const indices = vertexCount > 65535 ? Uint32Array.from(tris) : Uint16Array.from(tris);
  let voxelCount = 0;
  for (let i = 0; i < occupancy.length; i++) voxelCount += occupancy[i];
  return { positions, colors, indices, voxelCount, vertexCount, triangleCount: tris.length / 3 };
}

/**
 * Full pipeline from prepared views.
 * @param {Array} views - normalized views tagged with slot + angle
 */
export function buildModelFromViews(views, resolution = MESH_RESOLUTION) {
  if (views.length < 2) throw new Error('Add at least two photos (for example front and side).');
  const { occupancy, resolution: R } = carveVoxels(views, resolution);
  let solid = 0;
  for (let i = 0; i < occupancy.length; i++) solid += occupancy[i];
  if (solid < 20) {
    throw new Error(
      'The photos do not agree on a shape. Use a plain background and the same object in every photo.'
    );
  }
  const fallback = averageColor(views);
  const mesh = buildSmoothMesh(occupancy, R, (x, y, z, n) =>
    blendViewColor(views, n, x, y, z, fallback)
  );
  if (!mesh)
    throw new Error(
      'The photos do not agree on a shape. Use a plain background and the same object in every photo.'
    );
  return mesh;
}

// ---------- older block-based meshes ----------

const upgraded = new WeakMap();

/**
 * Meshes saved by earlier versions are a soup of cube faces (no indices). Rebuilds the volume from the
 * faces and returns a smooth indexed mesh; returns the mesh itself when it is already indexed, or null
 * when the soup is not a 40-voxel block mesh (the caller then draws it as stored).
 */
export function upgradeLegacyMesh(mesh) {
  if (!mesh || mesh.indices) return mesh || null;
  if (upgraded.has(mesh)) return upgraded.get(mesh);
  const result = rebuildFromBlocks(mesh);
  upgraded.set(mesh, result);
  return result;
}

function rebuildFromBlocks(mesh) {
  const R = LEGACY_RESOLUTION;
  const { positions, colors } = mesh;
  if (!positions || positions.length === 0 || positions.length % 18 !== 0) return null;
  const surface = new Uint8Array(R * R * R);
  const faceColor = new Uint8Array(R * R * R * 3);
  for (let q = 0; q < positions.length; q += 18) {
    let cx = 0,
      cy = 0,
      cz = 0;
    for (let v = 0; v < 6; v++) {
      cx += positions[q + v * 3];
      cy += positions[q + v * 3 + 1];
      cz += positions[q + v * 3 + 2];
    }
    cx /= 6;
    cy /= 6;
    cz /= 6;
    const ux = positions[q + 3] - positions[q],
      uy = positions[q + 4] - positions[q + 1],
      uz = positions[q + 5] - positions[q + 2];
    const vx = positions[q + 6] - positions[q],
      vy = positions[q + 7] - positions[q + 1],
      vz = positions[q + 8] - positions[q + 2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return null;
    nx /= len;
    ny /= len;
    nz /= len;
    // The solid voxel lies behind the face
    const px = cx - (nx * 0.5) / R,
      py = cy - (ny * 0.5) / R,
      pz = cz - (nz * 0.5) / R;
    const i = Math.floor((px + 0.5) * R);
    const j = Math.floor(py * R);
    const k = Math.floor(pz * R + 0.5 * R);
    if (i < 0 || j < 0 || k < 0 || i >= R || j >= R || k >= R) return null;
    const idx = (k * R + j) * R + i;
    surface[idx] = 1;
    faceColor[idx * 3] = colors[q];
    faceColor[idx * 3 + 1] = colors[q + 1];
    faceColor[idx * 3 + 2] = colors[q + 2];
  }
  // Fill the interior: everything the outside cannot reach is solid
  const outside = new Uint8Array(R * R * R);
  const stack = [];
  const push = (i, j, k) => {
    if (i < 0 || j < 0 || k < 0 || i >= R || j >= R || k >= R) return;
    const idx = (k * R + j) * R + i;
    if (surface[idx] || outside[idx]) return;
    outside[idx] = 1;
    stack.push(i, j, k);
  };
  for (let a = 0; a < R; a++)
    for (let b = 0; b < R; b++) {
      push(a, b, 0);
      push(a, b, R - 1);
      push(a, 0, b);
      push(a, R - 1, b);
      push(0, a, b);
      push(R - 1, a, b);
    }
  while (stack.length) {
    const k = stack.pop(),
      j = stack.pop(),
      i = stack.pop();
    push(i + 1, j, k);
    push(i - 1, j, k);
    push(i, j + 1, k);
    push(i, j - 1, k);
    push(i, j, k + 1);
    push(i, j, k - 1);
  }
  const occupancy = new Uint8Array(R * R * R);
  for (let p = 0; p < occupancy.length; p++) occupancy[p] = outside[p] ? 0 : 1;

  const colorAt = (x, y, z) => {
    const ci = Math.min(R - 1, Math.max(0, Math.floor(x * R)));
    const cj = Math.min(R - 1, Math.max(0, Math.floor(y * R)));
    const ck = Math.min(R - 1, Math.max(0, Math.floor(z * R)));
    for (let radius = 0; radius <= 3; radius++) {
      for (let dk = -radius; dk <= radius; dk++)
        for (let dj = -radius; dj <= radius; dj++)
          for (let di = -radius; di <= radius; di++) {
            const i = ci + di,
              j = cj + dj,
              k = ck + dk;
            if (i < 0 || j < 0 || k < 0 || i >= R || j >= R || k >= R) continue;
            const idx = (k * R + j) * R + i;
            if (surface[idx])
              return [faceColor[idx * 3], faceColor[idx * 3 + 1], faceColor[idx * 3 + 2]];
          }
    }
    return [160, 160, 160];
  };
  return buildSmoothMesh(occupancy, R, colorAt);
}

// ---------- software rendering (plan symbol and thumbnail) ----------

function meshTriangles(mesh) {
  const { positions, indices } = mesh;
  if (indices) return indices;
  const seq = new Uint32Array(positions.length / 3);
  for (let i = 0; i < seq.length; i++) seq[i] = i;
  return seq;
}

/**
 * Orthographic software render of a mesh with a z-buffer, Gouraud colours and a soft light.
 * `top` looks straight down (x to the right, z down, so the front edge is at the bottom);
 * otherwise the camera orbits by yaw/pitch (degrees) and the model is fitted into the image.
 * @returns {Uint8ClampedArray} RGBA pixels, size x size, transparent where empty
 */
export function renderMesh(
  mesh,
  { size = 96, top = false, yaw = 35, pitch = 28, padding = 0.06, supersample = 2 } = {}
) {
  const S = size * supersample;
  const { positions, colors } = mesh;
  const tri = meshTriangles(mesh);
  const yawR = (yaw * Math.PI) / 180;
  const pitchR = ((top ? 90 : pitch) * Math.PI) / 180;
  const cosY = Math.cos(top ? 0 : yawR),
    sinY = Math.sin(top ? 0 : yawR);
  const cosP = Math.cos(pitchR),
    sinP = Math.sin(pitchR);
  const count = positions.length / 3;
  const sx = new Float32Array(count),
    sy = new Float32Array(count),
    depth = new Float32Array(count);
  let minU = Infinity,
    maxU = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3],
      y = positions[i * 3 + 1] - 0.5,
      z = positions[i * 3 + 2];
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;
    sx[i] = x1;
    sy[i] = -y2;
    depth[i] = z2;
    if (x1 < minU) minU = x1;
    if (x1 > maxU) maxU = x1;
    if (-y2 < minV) minV = -y2;
    if (-y2 > maxV) maxV = -y2;
  }
  let scale, offU, offV;
  if (top) {
    scale = S;
    offU = 0.5 * S;
    offV = 0.5 * S;
  } else {
    scale = (S * (1 - padding * 2)) / Math.max(maxU - minU, maxV - minV, 1e-6);
    offU = S / 2 - ((minU + maxU) / 2) * scale;
    offV = S / 2 - ((minV + maxV) / 2) * scale;
  }
  for (let i = 0; i < count; i++) {
    sx[i] = sx[i] * scale + offU;
    sy[i] = sy[i] * scale + offV;
  }

  const light = [-0.35, 0.85, 0.4];
  const lightLen = Math.hypot(...light);
  const z = new Float32Array(S * S).fill(-Infinity);
  const buf = new Float32Array(S * S * 3);
  const filled = new Uint8Array(S * S);
  for (let t = 0; t + 2 < tri.length; t += 3) {
    const a = tri[t],
      b = tri[t + 1],
      c = tri[t + 2];
    const ax = positions[a * 3],
      ay = positions[a * 3 + 1],
      az = positions[a * 3 + 2];
    const e1x = positions[b * 3] - ax,
      e1y = positions[b * 3 + 1] - ay,
      e1z = positions[b * 3 + 2] - az;
    const e2x = positions[c * 3] - ax,
      e2y = positions[c * 3 + 1] - ay,
      e2z = positions[c * 3 + 2] - az;
    let nx = e1y * e2z - e1z * e2y,
      ny = e1z * e2x - e1x * e2z,
      nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-12) continue;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const shade =
      0.58 + 0.42 * Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2]) / lightLen);
    const x0 = sx[a],
      y0 = sy[a],
      x1 = sx[b],
      y1 = sy[b],
      x2 = sx[c],
      y2 = sy[c];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) continue;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2) - 0.5));
    const maxX = Math.min(S - 1, Math.ceil(Math.max(x0, x1, x2) + 0.5));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2) - 0.5));
    const maxY = Math.min(S - 1, Math.ceil(Math.max(y0, y1, y2) + 0.5));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const qx = px + 0.5,
          qy = py + 0.5;
        const w0 = ((x1 - qx) * (y2 - qy) - (x2 - qx) * (y1 - qy)) / area;
        const w1 = ((x2 - qx) * (y0 - qy) - (x0 - qx) * (y2 - qy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * depth[a] + w1 * depth[b] + w2 * depth[c];
        const p = py * S + px;
        if (d <= z[p]) continue;
        z[p] = d;
        filled[p] = 1;
        for (let ch = 0; ch < 3; ch++) {
          buf[p * 3 + ch] =
            (w0 * colors[a * 3 + ch] + w1 * colors[b * 3 + ch] + w2 * colors[c * 3 + ch]) * shade;
        }
      }
    }
  }

  const out = new Uint8ClampedArray(size * size * 4);
  const n2 = supersample * supersample;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        hits = 0;
      for (let dy = 0; dy < supersample; dy++) {
        for (let dx = 0; dx < supersample; dx++) {
          const p = (y * supersample + dy) * S + x * supersample + dx;
          if (!filled[p]) continue;
          r += buf[p * 3];
          g += buf[p * 3 + 1];
          b += buf[p * 3 + 2];
          hits++;
        }
      }
      if (!hits) continue;
      const o = (y * size + x) * 4;
      out[o] = r / hits;
      out[o + 1] = g / hits;
      out[o + 2] = b / hits;
      out[o + 3] = (hits / n2) * 255;
    }
  }
  return out;
}

/** Photo slot used for the 2D plan picture: the top photo when given, else the front, else any. */
export function pickPlanSlot(slotIds) {
  for (const id of ['top', 'front', 'back', 'right', 'left']) if (slotIds.includes(id)) return id;
  return slotIds[0] || null;
}

/**
 * The user's own photo cut out for the 2D plan: cropped to the object's bounding box, background made
 * transparent and scaled so the longest edge is at most maxEdge.
 * @param {Uint8ClampedArray} rgba source photo pixels
 * @param {Uint8Array} mask 1 where the object is
 * @returns {{width: number, height: number, rgba: Uint8ClampedArray} | null} null when nothing was found
 */
export function cutoutImage(rgba, mask, width, height, maxEdge = 192) {
  const box = maskBounds(mask, width, height);
  if (!box) return null;
  const scale = Math.min(1, maxEdge / Math.max(box.width, box.height));
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, box.minY + Math.floor(((y + 0.5) * box.height) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, box.minX + Math.floor(((x + 0.5) * box.width) / w));
      const sp = sy * width + sx;
      if (!mask[sp]) continue;
      const o = (y * w + x) * 4;
      out[o] = rgba[sp * 4];
      out[o + 1] = rgba[sp * 4 + 1];
      out[o + 2] = rgba[sp * 4 + 2];
      out[o + 3] = 255;
    }
  }
  return { width: w, height: h, rgba: out };
}

/** Plan-view render of the mesh (2D symbol). */
export function topDownImage(mesh, size = 96) {
  return renderMesh(mesh, { size, top: true });
}

// ---------- footprint outline ----------

function simplifyLoop(points, epsilon) {
  // Douglas-Peucker on a closed loop, split at the two points that are furthest apart
  if (points.length < 8) return points;
  let far = 0;
  let farDist = -1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > farDist) {
      farDist = d;
      far = i;
    }
  }
  const dp = (pts) => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let maxD = 0;
    let idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD <= epsilon) return [pts[0], pts[pts.length - 1]];
    const left = dp(pts.slice(0, idx + 1));
    return left.slice(0, -1).concat(dp(pts.slice(idx)));
  };
  const first = dp(points.slice(0, far + 1));
  const second = dp(points.slice(far).concat([points[0]]));
  return first.slice(0, -1).concat(second.slice(0, -1));
}

/**
 * Traces the outline of the filled pixels of an alpha image as closed polygons.
 * @param {Uint8ClampedArray} rgba size x size RGBA pixels (alpha > 127 counts as filled)
 * @returns {number[][]} loops of flat [x, z, x, z, ...] in plan coordinates, x and z in [-0.5, 0.5]
 */
export function footprintOutline(rgba, size) {
  const filled = (x, y) =>
    x >= 0 && y >= 0 && x < size && y < size && rgba[(y * size + x) * 4 + 3] > 127;
  // Directed edges with the filled side on the right, keyed by start corner
  const edges = new Map();
  const add = (x0, y0, x1, y1) => {
    const key = y0 * (size + 1) + x0;
    if (!edges.has(key)) edges.set(key, []);
    edges.get(key).push([x1, y1]);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) add(x, y, x + 1, y);
      if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!filled(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const loops = [];
  for (const [startKey] of edges) {
    while (edges.get(startKey)?.length) {
      const sx = startKey % (size + 1);
      const sy = Math.floor(startKey / (size + 1));
      const loop = [[sx, sy]];
      let [cx, cy] = edges.get(startKey).pop();
      let dir = [cx - sx, cy - sy];
      let guard = 0;
      while ((cx !== sx || cy !== sy) && guard++ < size * size * 4) {
        loop.push([cx, cy]);
        const outs = edges.get(cy * (size + 1) + cx);
        if (!outs || !outs.length) break;
        // Prefer turning right at saddles so touching corners stay separate loops
        let pick = 0;
        if (outs.length > 1) {
          let bestTurn = -Infinity;
          outs.forEach((o, i) => {
            const turn = dir[0] * (o[1] - cy) - dir[1] * (o[0] - cx);
            if (turn > bestTurn) {
              bestTurn = turn;
              pick = i;
            }
          });
        }
        const [nx, ny] = outs.splice(pick, 1)[0];
        dir = [nx - cx, ny - cy];
        cx = nx;
        cy = ny;
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  const area = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      a += x0 * y1 - x1 * y0;
    }
    return Math.abs(a) / 2;
  };
  return loops
    .filter((l) => area(l) >= 6)
    .map((l) => simplifyLoop(l, 0.7))
    .map((l) =>
      l.flatMap(([x, y]) => [
        Math.round((x / size - 0.5) * 1000) / 1000,
        Math.round((y / size - 0.5) * 1000) / 1000,
      ])
    );
}

/** Mean colour of a mesh as a CSS hex string. */
export function meshAverageHex(mesh) {
  const { colors } = mesh;
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i + 2 < colors.length; i += 3 * 5) {
    r += colors[i];
    g += colors[i + 1];
    b += colors[i + 2];
    n++;
  }
  if (!n) return '#a0a0a0';
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(v / n)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
