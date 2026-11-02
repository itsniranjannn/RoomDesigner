/**
 * hull.js
 * Builds a coloured 3D model from a few photos of an object, entirely in the browser:
 *   1. segment the object from the (plain) background of each photo,
 *   2. carve a voxel grid with the silhouettes (visual hull, orthographic views),
 *   3. emit the exposed voxel faces, coloured from the photo that sees them best.
 *
 * Views sit at fixed angles around the object: front (0), right (90), back (180),
 * left (270) and top. Each silhouette is cropped and stretched to the object's
 * bounding box, so real proportions come from the width/depth/height the user enters.
 *
 * Model space: x = width (centred), y = height (0 = floor), z = depth (centred), all in [-0.5, 1].
 */

export const VIEW_SLOTS = [
  { id: 'front', label: 'Front', angle: 0 },
  { id: 'right', label: 'Right side', angle: 90 },
  { id: 'back', label: 'Back', angle: 180 },
  { id: 'left', label: 'Left side', angle: 270 },
  { id: 'top', label: 'Top', angle: null },
];

const NORMAL_SIZE = 128;

// ---------- segmentation ----------

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function estimateBackground(rgba, width, height) {
  const samples = [];
  const take = (x, y) => {
    const i = (y * width + x) * 4;
    samples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  };
  const stepX = Math.max(1, Math.floor(width / 24));
  const stepY = Math.max(1, Math.floor(height / 24));
  for (let x = 0; x < width; x += stepX) {
    take(x, 0);
    take(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    take(0, y);
    take(width - 1, y);
  }
  const median = (k) => {
    const sorted = samples.map((s) => s[k]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  return [median(0), median(1), median(2)];
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
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = label; stack.push(p - 1); }
      if (x < width - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = label; stack.push(p + 1); }
      if (y > 0 && mask[p - width] && !labels[p - width]) { labels[p - width] = label; stack.push(p - width); }
      if (y < height - 1 && mask[p + width] && !labels[p + width]) { labels[p + width] = label; stack.push(p + width); }
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

function fillHoles(mask, width, height) {
  // Flood the background from the border; anything not reached is inside the object
  const outside = new Uint8Array(mask.length);
  const stack = [];
  const push = (p) => {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (y > 0) push(p - width);
    if (y < height - 1) push(p + width);
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/**
 * Separates the object from a plain background.
 * @param {Uint8ClampedArray|Uint8Array} rgba
 * @param {number} tolerance - colour distance (0-441) treated as background, default 60
 * @returns {Uint8Array} mask (1 = object)
 */
export function segmentObject(rgba, width, height, tolerance = 60) {
  const [br, bg, bb] = estimateBackground(rgba, width, height);
  const raw = new Uint8Array(width * height);
  for (let p = 0; p < raw.length; p++) {
    const i = p * 4;
    const transparent = rgba[i + 3] < 40;
    raw[p] = !transparent && colorDistance(rgba[i], rgba[i + 1], rgba[i + 2], br, bg, bb) > tolerance ? 1 : 0;
  }
  return fillHoles(keepLargestComponent(raw, width, height), width, height);
}

export function maskCoverage(mask) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n / mask.length;
}

/**
 * Crops a view to the object's bounding box and resamples it to a square grid.
 * @returns {{ mask: Uint8Array, rgb: Uint8Array, size: number } | null}
 */
export function normalizeView(rgba, mask, width, height, size = NORMAL_SIZE) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
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
  if (maxX < 0) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
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
  return { mask: outMask, rgb: outRgb, size };
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

/**
 * @param {Array<{slot: string, angle: number|null, mask: Uint8Array, rgb: Uint8Array, size: number}>} views
 * @param {number} resolution voxels per axis
 * @returns {{ occupancy: Uint8Array, resolution: number }}
 */
export function carveVoxels(views, resolution = 40) {
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

const FACES = [
  { n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
  { n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

function faceColor(views, n, x, y, z, fallback) {
  let best = null;
  let bestScore = 0.2;
  for (const view of views) {
    let score;
    if (view.slot === 'top') score = n[1];
    else {
      const rad = (view.angle * Math.PI) / 180;
      score = n[0] * Math.sin(rad) + n[2] * Math.cos(rad);
    }
    if (score > bestScore) {
      bestScore = score;
      best = view;
    }
  }
  if (!best) return fallback;
  const { u, v } = projectToView(best, x, y, z);
  const p = sample(best, u, v) * 3;
  return [best.rgb[p], best.rgb[p + 1], best.rgb[p + 2]];
}

function averageColor(views) {
  let r = 0, g = 0, b = 0, n = 0;
  for (const view of views) {
    for (let p = 0; p < view.mask.length; p += 7) {
      if (view.mask[p]) {
        r += view.rgb[p * 3]; g += view.rgb[p * 3 + 1]; b += view.rgb[p * 3 + 2]; n++;
      }
    }
  }
  return n ? [r / n, g / n, b / n] : [160, 160, 160];
}

/**
 * Converts occupied voxels to a triangle soup with per-vertex colours.
 * @returns {{ positions: Float32Array, colors: Uint8Array, voxelCount: number, triangleCount: number }}
 */
export function buildMesh(occupancy, resolution, views) {
  const R = resolution;
  const filled = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < R && j < R && k < R && occupancy[(k * R + j) * R + i] === 1;
  const fallback = averageColor(views);
  const positions = [];
  const colors = [];
  let voxelCount = 0;

  for (let k = 0; k < R; k++) {
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < R; i++) {
        if (!filled(i, j, k)) continue;
        voxelCount++;
        for (const face of FACES) {
          if (filled(i + face.n[0], j + face.n[1], k + face.n[2])) continue;
          const cx = (i + 0.5 + face.n[0] * 0.5) / R;
          const cy = (j + 0.5 + face.n[1] * 0.5) / R;
          const cz = (k + 0.5 + face.n[2] * 0.5) / R;
          // Sample just inside the voxel so the sample point stays within the silhouette
          const col = faceColor(views, face.n, cx - face.n[0] * 0.5 / R, cy - face.n[1] * 0.5 / R, cz - face.n[2] * 0.5 / R, fallback);
          const quad = face.corners.map((c) => [(i + c[0]) / R - 0.5, (j + c[1]) / R, (k + c[2]) / R - 0.5]);
          for (const t of [0, 1, 2, 0, 2, 3]) {
            positions.push(quad[t][0], quad[t][1], quad[t][2]);
            colors.push(col[0], col[1], col[2]);
          }
        }
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    colors: new Uint8Array(colors),
    voxelCount,
    triangleCount: positions.length / 9,
  };
}

/**
 * Full pipeline from prepared views.
 * @param {Array} views - normalized views tagged with slot + angle
 */
export function buildModelFromViews(views, resolution = 40) {
  if (views.length < 2) throw new Error('Add at least two photos (for example front and side).');
  const { occupancy, resolution: R } = carveVoxels(views, resolution);
  const mesh = buildMesh(occupancy, R, views);
  if (mesh.voxelCount < 20) {
    throw new Error('The photos do not agree on a shape. Use a plain background and the same object in every photo.');
  }
  return mesh;
}
