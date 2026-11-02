/**
 * flatWalls.js
 * Pure wall geometry for the flat designer.
 *
 * Walls live on a 10 cm grid. Internally a level's walls are a set of unit edges
 * (the key 'h<i>,<j>' is the edge from grid vertex (i,j) to (i+1,j); 'v<i>,<j>' is
 * the edge from (i,j) to (i,j+1)). They are stored and drawn as merged collinear runs.
 *
 * Rooms are the enclosed regions of the grid: cells are flood-filled, walls block
 * movement between cells and doors/windows do not (an opening is only a gap drawn
 * in a wall, it never merges two rooms).
 */

export const CELL = 10;
export const MAX_COORD_CM = 4000;
export const MIN_REGION_CELLS = 30;

export const DOOR_HEIGHT_CM = 205;
export const WINDOW_SILL_CM = 90;
export const WALL_HEIGHT_CM = 240;
export const CUTAWAY_HEIGHT_CM = 45;
export const INTERIOR_THICK_CM = 12;
export const EXTERIOR_THICK_CM = 20;

// ---------- edge keys ----------

export const edgeKey = (axis, i, j) => `${axis}${i},${j}`;

export function parseEdge(key) {
  const axis = key[0];
  const [i, j] = key.slice(1).split(',').map(Number);
  return { axis, i, j };
}

/** Endpoints of a unit edge in cm. */
export function edgeEnds(key) {
  const { axis, i, j } = parseEdge(key);
  return axis === 'h'
    ? { x1: i * CELL, y1: j * CELL, x2: (i + 1) * CELL, y2: j * CELL }
    : { x1: i * CELL, y1: j * CELL, x2: i * CELL, y2: (j + 1) * CELL };
}

export const snapCm = (v) => Math.round(v / CELL) * CELL;

export const clampCoord = (v) => Math.max(0, Math.min(MAX_COORD_CM, snapCm(v)));

// ---------- runs <-> edges ----------

/** A run is { x1, y1, x2, y2 } in cm, axis-aligned with x1<=x2 and y1<=y2. */
export function runsToEdges(runs = []) {
  const edges = new Set();
  for (const r of runs) {
    if (r.y1 === r.y2) {
      const j = Math.round(r.y1 / CELL);
      for (let i = Math.round(r.x1 / CELL); i < Math.round(r.x2 / CELL); i++) edges.add(edgeKey('h', i, j));
    } else if (r.x1 === r.x2) {
      const i = Math.round(r.x1 / CELL);
      for (let j = Math.round(r.y1 / CELL); j < Math.round(r.y2 / CELL); j++) edges.add(edgeKey('v', i, j));
    }
  }
  return edges;
}

/** Merges collinear touching edges into the fewest straight runs. */
export function edgesToRuns(edges) {
  const lines = { h: new Map(), v: new Map() };
  for (const key of edges) {
    const { axis, i, j } = parseEdge(key);
    const line = axis === 'h' ? j : i;
    const pos = axis === 'h' ? i : j;
    if (!lines[axis].has(line)) lines[axis].set(line, []);
    lines[axis].get(line).push(pos);
  }
  const runs = [];
  for (const axis of ['h', 'v']) {
    const sortedLines = [...lines[axis].keys()].sort((a, b) => a - b);
    for (const line of sortedLines) {
      const list = lines[axis].get(line).sort((a, b) => a - b);
      let start = list[0];
      let prev = list[0];
      const flush = (from, to) => {
        runs.push(
          axis === 'h'
            ? { x1: from * CELL, y1: line * CELL, x2: (to + 1) * CELL, y2: line * CELL }
            : { x1: line * CELL, y1: from * CELL, x2: line * CELL, y2: (to + 1) * CELL }
        );
      };
      for (let n = 1; n < list.length; n++) {
        if (list[n] !== prev + 1) {
          flush(start, prev);
          start = list[n];
        }
        prev = list[n];
      }
      flush(start, prev);
    }
  }
  return runs;
}

const runsEdgesCache = new WeakMap();

/** Edge set for a runs array (cached per array, treat the result as read-only). */
export function edgesOf(runs) {
  if (!runs) return new Set();
  let edges = runsEdgesCache.get(runs);
  if (!edges) {
    edges = runsToEdges(runs);
    runsEdgesCache.set(runs, edges);
  }
  return edges;
}

/** Adds an orthogonal wall; a diagonal drag snaps to its dominant axis. */
export function addSegment(edges, x1, y1, x2, y2) {
  const next = new Set(edges);
  const ax = clampCoord(x1);
  const ay = clampCoord(y1);
  let bx = clampCoord(x2);
  let by = clampCoord(y2);
  if (Math.abs(bx - ax) >= Math.abs(by - ay)) by = ay;
  else bx = ax;
  if (ax === bx && ay === by) return next;
  const added = runsToEdges([
    { x1: Math.min(ax, bx), y1: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) },
  ]);
  for (const k of added) next.add(k);
  return next;
}

export function removeEdges(edges, keys) {
  const next = new Set(edges);
  for (const k of keys) next.delete(k);
  return next;
}

/** Orthogonal end point for a wall being dragged from (sx,sy) to (x,y). */
export function orthoEnd(sx, sy, x, y) {
  const ex = clampCoord(x);
  const ey = clampCoord(y);
  return Math.abs(ex - sx) >= Math.abs(ey - sy) ? { x: ex, y: sy } : { x: sx, y: ey };
}

// ---------- junction aware runs ----------

function vertexEdges(edges, a, b) {
  return [
    edges.has(edgeKey('h', a, b)),
    edges.has(edgeKey('h', a - 1, b)),
    edges.has(edgeKey('v', a, b)),
    edges.has(edgeKey('v', a, b - 1)),
  ];
}

/** Edge keys at the grid vertex (a,b). */
export function degreeAt(edges, a, b) {
  return vertexEdges(edges, a, b).filter(Boolean).length;
}

/**
 * The straight run of walls that contains an edge, stopping at corners, T-junctions
 * and free ends. This is what the eraser removes.
 */
export function wallRunAt(edges, key) {
  if (!edges.has(key)) return [];
  const { axis, i, j } = parseEdge(key);
  const run = [key];
  const step = (di, dj, forward) => {
    let ci = i;
    let cj = j;
    for (let guard = 0; guard < 2000; guard++) {
      // vertex we are walking towards
      const va = axis === 'h' ? (forward ? ci + 1 : ci) : ci;
      const vb = axis === 'h' ? cj : forward ? cj + 1 : cj;
      if (degreeAt(edges, va, vb) !== 2) return;
      const ni = ci + (forward ? di : -di);
      const nj = cj + (forward ? dj : -dj);
      const nk = edgeKey(axis, ni, nj);
      if (!edges.has(nk)) return; // corner
      run.push(nk);
      ci = ni;
      cj = nj;
    }
  };
  if (axis === 'h') {
    step(1, 0, true);
    step(1, 0, false);
  } else {
    step(0, 1, true);
    step(0, 1, false);
  }
  return run;
}

/** Nearest wall edge to a point in cm, or null when none lies within tolCm. */
export function hitTestEdge(edges, x, y, tolCm = 8) {
  const ci = Math.floor(x / CELL);
  const cj = Math.floor(y / CELL);
  let best = null;
  let bestD = tolCm + 1;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      for (const axis of ['h', 'v']) {
        const i = ci + di;
        const j = cj + dj;
        const key = edgeKey(axis, i, j);
        if (!edges.has(key)) continue;
        const e = edgeEnds(key);
        const px = Math.max(e.x1, Math.min(e.x2, x));
        const py = Math.max(e.y1, Math.min(e.y2, y));
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) {
          bestD = d;
          best = key;
        }
      }
    }
  }
  return bestD <= tolCm ? best : null;
}

/** Contiguous span (cm) of a straight run of edges that contains `key`, from junction to junction. */
export function runSpan(edges, key) {
  const run = wallRunAt(edges, key);
  const { axis } = parseEdge(key);
  const pos = run.map((k) => (axis === 'h' ? parseEdge(k).i : parseEdge(k).j));
  return { axis, line: (axis === 'h' ? parseEdge(key).j : parseEdge(key).i) * CELL, lo: Math.min(...pos) * CELL, hi: (Math.max(...pos) + 1) * CELL };
}

// ---------- regions ----------

const analysisCache = new WeakMap();

/**
 * Flood-fills the grid around a level's walls.
 * @returns {{ regions: Array, labelAt: Function, isExteriorEdge: Function, empty: boolean }}
 */
export function analyzeEdges(edges) {
  if (!edges || edges.size === 0) {
    return { regions: [], labelAt: () => -1, isExteriorEdge: () => true, empty: true };
  }
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (const key of edges) {
    const { axis, i, j } = parseEdge(key);
    minI = Math.min(minI, i);
    minJ = Math.min(minJ, j);
    maxI = Math.max(maxI, axis === 'h' ? i + 1 : i);
    maxJ = Math.max(maxJ, axis === 'v' ? j + 1 : j);
  }
  // Cells run from (minI-1, minJ-1) to (maxI, maxJ) inclusive: a ring of outside cells around the walls
  const oi = minI - 1;
  const oj = minJ - 1;
  const W = maxI - minI + 2;
  const H = maxJ - minJ + 2;
  const hWall = new Uint8Array(W * (H + 1)); // top edge of cell (c, r) is hWall[r * W + c]
  const vWall = new Uint8Array((W + 1) * H); // left edge of cell (c, r) is vWall[r * (W + 1) + c]
  for (const key of edges) {
    const { axis, i, j } = parseEdge(key);
    if (axis === 'h') hWall[(j - oj) * W + (i - oi)] = 1;
    else vWall[(j - oj) * (W + 1) + (i - oi)] = 1;
  }

  const label = new Int32Array(W * H).fill(-1);
  const stack = new Int32Array(W * H);
  let next = 0;
  const fill = (start) => {
    const id = next++;
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    let count = 0;
    while (top > 0) {
      const cur = stack[--top];
      count++;
      const r = (cur / W) | 0;
      const c = cur - r * W;
      // right
      if (c + 1 < W && !vWall[r * (W + 1) + c + 1] && label[cur + 1] < 0) { label[cur + 1] = id; stack[top++] = cur + 1; }
      // left
      if (c > 0 && !vWall[r * (W + 1) + c] && label[cur - 1] < 0) { label[cur - 1] = id; stack[top++] = cur - 1; }
      // down
      if (r + 1 < H && !hWall[(r + 1) * W + c] && label[cur + W] < 0) { label[cur + W] = id; stack[top++] = cur + W; }
      // up
      if (r > 0 && !hWall[r * W + c] && label[cur - W] < 0) { label[cur - W] = id; stack[top++] = cur - W; }
    }
    return count;
  };
  fill(0); // label 0 is the outside
  const counts = [0];
  for (let n = 0; n < W * H; n++) {
    if (label[n] < 0) counts[next] = fill(n);
  }

  // Row runs and bounding boxes per label
  const info = new Map();
  for (let r = 0; r < H; r++) {
    let c = 0;
    while (c < W) {
      const l = label[r * W + c];
      let end = c + 1;
      while (end < W && label[r * W + end] === l) end++;
      if (l > 0 && counts[l] >= MIN_REGION_CELLS) {
        if (!info.has(l)) info.set(l, { runs: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
        const rec = info.get(l);
        rec.runs.push([r + oj, c + oi, end + oi]);
        rec.x0 = Math.min(rec.x0, c + oi);
        rec.x1 = Math.max(rec.x1, end + oi);
        rec.y0 = Math.min(rec.y0, r + oj);
        rec.y1 = Math.max(rec.y1, r + oj + 1);
      }
      c = end;
    }
  }
  const regions = [];
  const indexOfLabel = new Map();
  for (const [l, rec] of [...info.entries()].sort((a, b) => a[1].y0 - b[1].y0 || a[1].x0 - b[1].x0)) {
    indexOfLabel.set(l, regions.length);
    const widthCm = (rec.x1 - rec.x0) * CELL;
    const depthCm = (rec.y1 - rec.y0) * CELL;
    regions.push({
      index: regions.length,
      cells: counts[l],
      areaCm2: counts[l] * CELL * CELL,
      x: rec.x0 * CELL,
      y: rec.y0 * CELL,
      widthCm,
      depthCm,
      rect: counts[l] === (rec.x1 - rec.x0) * (rec.y1 - rec.y0),
      runs: rec.runs,
    });
  }

  const labelAtCell = (i, j) => {
    const c = i - oi;
    const r = j - oj;
    if (c < 0 || r < 0 || c >= W || r >= H) return -1;
    const l = label[r * W + c];
    return indexOfLabel.has(l) ? indexOfLabel.get(l) : -1;
  };
  const isOutsideCell = (i, j) => {
    const c = i - oi;
    const r = j - oj;
    if (c < 0 || r < 0 || c >= W || r >= H) return true;
    return label[r * W + c] === 0;
  };
  const isExteriorEdge = (key) => {
    const { axis, i, j } = parseEdge(key);
    return axis === 'h' ? isOutsideCell(i, j - 1) || isOutsideCell(i, j) : isOutsideCell(i - 1, j) || isOutsideCell(i, j);
  };

  return { regions, labelAt: labelAtCell, isExteriorEdge, isOutsideCell, empty: false };
}

/** Cached analysis for a runs array. */
export function analyzeRuns(runs) {
  if (!runs || runs.length === 0) return analyzeEdges(null);
  let a = analysisCache.get(runs);
  if (!a) {
    a = analyzeEdges(edgesOf(runs));
    analysisCache.set(runs, a);
  }
  return a;
}

/** Region at a point in cm, or null. */
export function regionAtPoint(analysis, x, y) {
  const idx = analysis.labelAt(Math.floor(x / CELL), Math.floor(y / CELL));
  return idx >= 0 ? analysis.regions[idx] : null;
}

/** Number of cells two row-run lists share. */
export function runsOverlap(a, b) {
  const rows = new Map();
  for (const [j, i0, i1] of a) {
    if (!rows.has(j)) rows.set(j, []);
    rows.get(j).push([i0, i1]);
  }
  let total = 0;
  for (const [j, i0, i1] of b) {
    for (const [a0, a1] of rows.get(j) || []) {
      const lo = Math.max(i0, a0);
      const hi = Math.min(i1, a1);
      if (hi > lo) total += hi - lo;
    }
  }
  return total;
}

/** Rectangles (cm) that tile a region, merging identical consecutive rows. */
export function regionRects(region) {
  const rects = [];
  let active = new Map();
  const rows = new Map();
  for (const [j, i0, i1] of region.runs) {
    if (!rows.has(j)) rows.set(j, []);
    rows.get(j).push([i0, i1]);
  }
  const js = [...rows.keys()].sort((a, b) => a - b);
  for (const j of js) {
    const cur = new Map(rows.get(j).map(([i0, i1]) => [`${i0},${i1}`, [i0, i1]]));
    const nextActive = new Map();
    for (const [k, v] of active) {
      if (cur.has(k)) nextActive.set(k, v);
      else rects.push({ x: v.i0 * CELL, y: v.j0 * CELL, widthCm: (v.i1 - v.i0) * CELL, depthCm: (j - v.j0) * CELL });
    }
    for (const [k, [i0, i1]] of cur) {
      if (!nextActive.has(k)) nextActive.set(k, { i0, i1, j0: j });
      else nextActive.set(k, active.get(k));
    }
    active = nextActive;
  }
  const lastJ = js[js.length - 1] + 1;
  for (const v of active.values()) rects.push({ x: v.i0 * CELL, y: v.j0 * CELL, widthCm: (v.i1 - v.i0) * CELL, depthCm: (lastJ - v.j0) * CELL });
  return rects;
}

// ---------- openings (doors and windows) ----------

/**
 * An opening is { id, type: 'door' | 'window', axis: 'h' | 'v', line, start, widthCm, swing? } in cm.
 * Horizontal ('h') openings sit on the wall y = line and span x = start .. start + width.
 */
export function openingEdgeKeys(op) {
  const keys = [];
  const first = Math.floor(op.start / CELL);
  const last = Math.ceil((op.start + op.widthCm) / CELL) - 1;
  const line = Math.round(op.line / CELL);
  for (let n = first; n <= last; n++) keys.push(op.axis === 'h' ? edgeKey('h', n, line) : edgeKey('v', line, n));
  return keys;
}

export function openingFitsWalls(edges, op) {
  return openingEdgeKeys(op).every((k) => edges.has(k));
}

/** Drops openings that no longer sit fully on a wall. */
export function pruneOpenings(openings = [], edges) {
  const kept = openings.filter((op) => openingFitsWalls(edges, op));
  return kept.length === openings.length ? openings : kept;
}

function openingsTouch(a, b) {
  return a.axis === b.axis && a.line === b.line && a.start < b.start + b.widthCm && b.start < a.start + a.widthCm;
}

/** Opening whose wall gap contains the point (cm), or null. */
export function openingAtPoint(openings = [], x, y, tolCm = 10) {
  for (const op of openings) {
    const along = op.axis === 'h' ? x : y;
    const across = op.axis === 'h' ? y : x;
    if (along >= op.start - 2 && along <= op.start + op.widthCm + 2 && Math.abs(across - op.line) <= tolCm) return op;
  }
  return null;
}

/**
 * Where an opening of a given width would sit if placed at the cursor.
 * @returns {{ op: Object, valid: boolean, reason?: string } | null} null when the cursor is not near a wall
 */
export function planOpening(edges, openings, { type, x, y, widthCm, tolCm = 10, ignoreId }) {
  const key = hitTestEdge(edges, x, y, tolCm);
  if (!key) return null;
  const span = runSpan(edges, key);
  const cursor = span.axis === 'h' ? x : y;
  let start = snapCm(cursor - widthCm / 2);
  start = Math.max(span.lo, Math.min(span.hi - widthCm, start));
  const op = { id: 'ghost', type, axis: span.axis, line: span.line, start, widthCm };
  if (span.hi - span.lo < widthCm) return { op: { ...op, start: span.lo }, valid: false, reason: 'That wall piece is too short.' };
  if (openings.some((o) => o.id !== ignoreId && openingsTouch(o, op))) {
    return { op, valid: false, reason: 'There is already a door or window here.' };
  }
  return { op, valid: true };
}

// ---------- drawable stretches and 3D boxes ----------

/**
 * Maximal straight stretches of wall with one thickness each.
 * @returns {Array<{ axis, line, from, to, thick, exterior }>} in cm
 */
export function wallStretches(edges, isExteriorEdge) {
  const out = [];
  const lines = { h: new Map(), v: new Map() };
  for (const key of edges) {
    const { axis, i, j } = parseEdge(key);
    const line = axis === 'h' ? j : i;
    const pos = axis === 'h' ? i : j;
    if (!lines[axis].has(line)) lines[axis].set(line, []);
    lines[axis].get(line).push({ pos, ext: isExteriorEdge(key) });
  }
  for (const axis of ['h', 'v']) {
    for (const [line, list] of lines[axis]) {
      list.sort((a, b) => a.pos - b.pos);
      let start = list[0];
      let prev = list[0];
      const flush = (a, b) =>
        out.push({ axis, line: line * CELL, from: a.pos * CELL, to: (b.pos + 1) * CELL, thick: a.ext ? EXTERIOR_THICK_CM : INTERIOR_THICK_CM, exterior: a.ext });
      for (let n = 1; n < list.length; n++) {
        const cur = list[n];
        if (cur.pos !== prev.pos + 1 || cur.ext !== prev.ext) {
          flush(start, prev);
          start = cur;
        }
        prev = cur;
      }
      flush(start, prev);
    }
  }
  return out;
}

/**
 * Wall solids for the 3D view with door and window gaps cut out.
 * Each box is { axis, line, a, b, thick, z0, z1, glass } (a..b along the wall, cm).
 */
export function wallBoxes(edges, isExteriorEdge, openings = [], { fullHeight = true } = {}) {
  const H = fullHeight ? WALL_HEIGHT_CM : CUTAWAY_HEIGHT_CM;
  const sill = fullHeight ? WINDOW_SILL_CM : 18;
  const head = fullHeight ? DOOR_HEIGHT_CM : H;
  const boxes = [];
  for (const s of wallStretches(edges, isExteriorEdge)) {
    const ops = openings
      .filter((o) => o.axis === s.axis && o.line === s.line && o.start < s.to && o.start + o.widthCm > s.from)
      .map((o) => ({ ...o, a: Math.max(s.from, o.start), b: Math.min(s.to, o.start + o.widthCm) }))
      .sort((p, q) => p.a - q.a);
    const ext = s.thick / 2;
    let cursor = s.from;
    const solid = (a, b, z0, z1) => {
      if (b - a > 0.5 && z1 - z0 > 0.5) boxes.push({ axis: s.axis, line: s.line, a, b, thick: s.thick, z0, z1, glass: false });
    };
    for (const o of ops) {
      solid(cursor === s.from ? cursor - ext : cursor, o.a, 0, H);
      if (o.type === 'door') {
        if (fullHeight) solid(o.a, o.b, head, H);
      } else {
        solid(o.a, o.b, 0, Math.min(sill, H));
        if (fullHeight) solid(o.a, o.b, head, H);
        boxes.push({ axis: s.axis, line: s.line, a: o.a, b: o.b, thick: 4, z0: Math.min(sill, H), z1: head, glass: true });
      }
      cursor = o.b;
    }
    solid(cursor === s.from ? cursor - ext : cursor, s.to + ext, 0, H);
  }
  return boxes;
}

/** Whether any wall edge crosses the interior of a rectangle (cm). */
export function wallsCrossRect(edges, rect) {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.widthCm;
  const y1 = rect.y + rect.depthCm;
  for (const key of edges) {
    const e = edgeEnds(key);
    if (e.y1 === e.y2) {
      if (e.y1 > y0 && e.y1 < y1 && e.x2 > x0 && e.x1 < x1) return true;
    } else if (e.x1 > x0 && e.x1 < x1 && e.y2 > y0 && e.y1 < y1) {
      return true;
    }
  }
  return false;
}

/** Unique vertex coordinates of a level's walls (for alignment guides). */
export function wallVertices(edges) {
  const xs = new Set();
  const ys = new Set();
  for (const key of edges) {
    const e = edgeEnds(key);
    xs.add(e.x1);
    xs.add(e.x2);
    ys.add(e.y1);
    ys.add(e.y2);
  }
  return { xs: [...xs], ys: [...ys] };
}
