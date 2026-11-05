/**
 * floorGrid.js
 * Walkable-floor analysis on a grid: which spots are free, how far each is from the nearest
 * obstacle, how wide the widest route to a spot is, and where a turning circle fits.
 * Pure functions on plain numbers, no DOM.
 */

import { hasOutline, pointInOutline } from './roomShape.js';

const INF = 1e12;
const BIG = 1e30;

/** Cell size in cm: fine for normal rooms, coarser for very large ones to keep it quick. */
export function chooseCell(room) {
  const area = (room.widthCm || 400) * (room.depthCm || 400);
  return area <= 700000 ? 2.5 : 5;
}

function pointInConvex(px, py, corners) {
  let sign = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const c = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (c !== 0) {
      const s = c > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

/** 1D squared distance transform (Felzenszwalb and Huttenlocher). */
function edt1d(f, n, d, v, z) {
  const cross = (q, p) => (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
  let k = 0;
  v[0] = 0;
  z[0] = -BIG;
  z[1] = BIG;
  for (let q = 1; q < n; q++) {
    let s = cross(q, v[k]);
    while (s <= z[k]) {
      k--;
      s = cross(q, v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = BIG;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/**
 * Builds the grid. `obstacles` are convex polygons (rotated rectangles) that block walking.
 * Cells outside the room are blocked. A ring of blocked cells surrounds the grid.
 * `dist[i]` is the distance (cm) from a free cell's centre to the centre of the nearest
 * blocked cell: half the width of the widest corridor that cell can sit in.
 */
export function buildFloorGrid(room, obstacles = [], cell = chooseCell(room)) {
  const W = room.widthCm;
  const D = room.depthCm;
  const cols = Math.ceil(W / cell) + 2;
  const rows = Math.ceil(D / cell) + 2;
  const n = cols * rows;
  const free = new Uint8Array(n);
  const outlined = hasOutline(room);
  const cx = (c) => (c - 1 + 0.5) * cell;
  const cy = (r) => (r - 1 + 0.5) * cell;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const x = cx(c);
      const y = cy(r);
      if (x > W || y > D) continue;
      if (outlined && !pointInOutline(x, y, room.outline, 0.01)) continue;
      free[r * cols + c] = 1;
    }
  }

  for (const poly of obstacles) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const c0 = Math.max(1, Math.floor(minX / cell));
    const c1 = Math.min(cols - 2, Math.ceil(maxX / cell) + 1);
    const r0 = Math.max(1, Math.floor(minY / cell));
    const r1 = Math.min(rows - 2, Math.ceil(maxY / cell) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (free[r * cols + c] && pointInConvex(cx(c), cy(r), poly)) free[r * cols + c] = 0;
      }
    }
  }

  // Squared distance (in cells) from every cell to the nearest blocked cell
  const sq = new Float64Array(n);
  for (let i = 0; i < n; i++) sq[i] = free[i] ? INF : 0;
  const m = Math.max(cols, rows);
  const f = new Float64Array(m);
  const d = new Float64Array(m);
  const v = new Int32Array(m);
  const z = new Float64Array(m + 1);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) f[r] = sq[r * cols + c];
    edt1d(f, rows, d, v, z);
    for (let r = 0; r < rows; r++) sq[r * cols + c] = d[r];
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) f[c] = sq[r * cols + c];
    edt1d(f, cols, d, v, z);
    for (let c = 0; c < cols; c++) sq[r * cols + c] = d[c];
  }
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = free[i] ? Math.sqrt(sq[i]) * cell : 0;

  return { cell, cols, rows, free, dist, cx, cy, W, D, index: (c, r) => r * cols + c };
}

/** Grid cell holding a point in room space. */
export function cellOf(grid, x, y) {
  const c = Math.floor(x / grid.cell) + 1;
  const r = Math.floor(y / grid.cell) + 1;
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return -1;
  return r * grid.cols + c;
}

/** Width of the corridor a cell can sit in (cm), a little under 2 x distance to compensate for sampling. */
export const corridorWidth = (grid, i) => Math.max(0, 2 * grid.dist[i] - grid.cell * 0.5);

/**
 * Widest-route search: for every cell, the width of the widest route from any seed, where a
 * route is as wide as its narrowest cell. Returns a Float32Array (0 for unreachable cells).
 */
export function widestRoutes(grid, seeds) {
  const { cols, rows, free } = grid;
  const n = cols * rows;
  const best = new Float32Array(n);
  // Binary max-heap of [width, cell]
  const hw = [];
  const hi = [];
  const push = (w, i) => {
    let k = hw.length;
    hw.push(w);
    hi.push(i);
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hw[p] >= hw[k]) break;
      [hw[p], hw[k]] = [hw[k], hw[p]];
      [hi[p], hi[k]] = [hi[k], hi[p]];
      k = p;
    }
  };
  const pop = () => {
    const w = hw[0];
    const i = hi[0];
    const lw = hw.pop();
    const li = hi.pop();
    if (hw.length) {
      hw[0] = lw;
      hi[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < hw.length && hw[l] > hw[m]) m = l;
        if (r < hw.length && hw[r] > hw[m]) m = r;
        if (m === k) break;
        [hw[m], hw[k]] = [hw[k], hw[m]];
        [hi[m], hi[k]] = [hi[k], hi[m]];
        k = m;
      }
    }
    return [w, i];
  };

  for (const s of seeds) {
    if (s < 0 || !free[s]) continue;
    const w = corridorWidth(grid, s);
    if (w > best[s]) {
      best[s] = w;
      push(w, s);
    }
  }
  const nbr = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  while (hw.length) {
    const [w, i] = pop();
    if (w < best[i]) continue;
    const c = i % cols;
    const r = (i - c) / cols;
    for (const [dc, dr] of nbr) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 1 || nr < 1 || nc >= cols - 1 || nr >= rows - 1) continue;
      const j = nr * cols + nc;
      if (!free[j]) continue;
      const nw = Math.min(w, corridorWidth(grid, j));
      if (nw > best[j]) {
        best[j] = nw;
        push(nw, j);
      }
    }
  }
  return best;
}

/**
 * Cells where a circle of the given diameter fits without touching an obstacle, as
 * row runs { y, x0, x1 } (cell centres, cm) plus the best centre (the roomiest spot).
 */
export function circleFits(grid, diameterCm) {
  const need = diameterCm / 2;
  const { cols, rows, free, dist, cell } = grid;
  const runs = [];
  let best = null;
  for (let r = 1; r < rows - 1; r++) {
    let start = -1;
    for (let c = 1; c <= cols - 1; c++) {
      const i = r * cols + c;
      const ok = c < cols - 1 && free[i] && dist[i] - cell * 0.5 >= need;
      if (ok) {
        if (start < 0) start = c;
        if (!best || dist[i] > best.dist) best = { x: grid.cx(c), y: grid.cy(r), dist: dist[i] };
      } else if (start >= 0) {
        runs.push({
          y: grid.cy(r) - cell / 2,
          x0: grid.cx(start) - cell / 2,
          x1: grid.cx(c - 1) + cell / 2,
          h: cell,
        });
        start = -1;
      }
    }
  }
  return { runs, best };
}
