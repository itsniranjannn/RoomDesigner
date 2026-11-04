/**
 * roomShape.js
 * Pure geometry for rooms that are not plain rectangles.
 *
 * A room record may carry an optional `outline`: the corners of its floor in room
 * coordinates (cm, origin at the top-left of the bounding box, which is still
 * widthCm x depthCm). Corners run clockwise on screen (y points down), so the room
 * is always on the right of the direction of travel. Edge i joins corner i to corner
 * i + 1. `openEdges` lists the edges that have no wall (an open archway or divider).
 * Rooms without an outline are rectangles and keep the four named walls.
 */

import { getRotatedRectCorners, getAABB } from './geometry.js';

const EPS = 0.01;
const CELL = 10;

export const hasOutline = (room) =>
  !!room && Array.isArray(room.outline) && room.outline.length >= 3;

// ---------- building an outline from grid cells ----------

/**
 * Traces the outer boundary of a set of grid cells.
 * @param {Array<[number, number, number]>} runs - [row, from, to) cell runs
 * @param {{x: number, y: number}} origin - cm offset subtracted from every corner
 * @param {Set<string>} [openKeys] - wall edge keys ('h<i>,<j>' / 'v<i>,<j>') that have no wall
 * @returns {{ outline: number[][], openEdges: number[] } | null}
 */
export function traceOutline(runs, origin = { x: 0, y: 0 }, openKeys = new Set()) {
  const cells = new Set();
  for (const [j, i0, i1] of runs) for (let i = i0; i < i1; i++) cells.add(`${i},${j}`);
  const has = (i, j) => cells.has(`${i},${j}`);

  // Unit edges with the region on the right. Keys: "x,y>x,y"
  const out = new Map(); // "x,y" -> [{ to: [x, y], dir, key }]
  const push = (a, b, dir, key) => {
    const k = `${a[0]},${a[1]}`;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push({ from: a, to: b, dir, key, used: false });
  };
  for (const c of cells) {
    const [i, j] = c.split(',').map(Number);
    if (!has(i, j - 1)) push([i, j], [i + 1, j], 0, `h${i},${j}`); // east
    if (!has(i + 1, j)) push([i + 1, j], [i + 1, j + 1], 1, `v${i + 1},${j}`); // south
    if (!has(i, j + 1)) push([i + 1, j + 1], [i, j + 1], 2, `h${i},${j + 1}`); // west
    if (!has(i - 1, j)) push([i, j + 1], [i, j], 3, `v${i},${j}`); // north
  }

  const loops = [];
  for (const list of out.values()) {
    for (const start of list) {
      if (start.used) continue;
      const loop = [];
      let cur = start;
      for (let guard = 0; guard < 200000; guard++) {
        cur.used = true;
        loop.push({ from: cur.from, dir: cur.dir, key: cur.key });
        const at = cur.to;
        const options = (out.get(`${at[0]},${at[1]}`) || []).filter((o) => !o.used);
        if (options.length === 0) break;
        // Prefer the sharpest right turn so corners that only touch split into separate loops
        const turn = (o) => (o.dir - cur.dir + 4) % 4; // 1 right, 0 straight, 3 left
        const rank = { 1: 0, 0: 1, 3: 2, 2: 3 };
        options.sort((p, q) => rank[turn(p)] - rank[turn(q)]);
        cur = options[0];
      }
      loops.push(loop);
    }
  }
  if (loops.length === 0) return null;

  const area = (loop) => {
    let a = 0;
    for (let n = 0; n < loop.length; n++) {
      const p = loop[n].from;
      const q = loop[(n + 1) % loop.length].from;
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a / 2);
  };
  const loop = loops.sort((a, b) => area(b) - area(a))[0];

  // Merge unit edges that continue in the same direction with the same openness
  const pts = [];
  const flags = [];
  for (let n = 0; n < loop.length; n++) {
    const prev = loop[(n - 1 + loop.length) % loop.length];
    const unit = loop[n];
    const open = openKeys.has(unit.key);
    const prevOpen = openKeys.has(prev.key);
    if (prev.dir !== unit.dir || prevOpen !== open) {
      pts.push([unit.from[0] * CELL - origin.x, unit.from[1] * CELL - origin.y]);
      flags.push(open);
    }
  }
  const openEdges = [];
  flags.forEach((f, i) => f && openEdges.push(i));
  return { outline: pts, openEdges };
}

// ---------- basic polygon maths ----------

export function polygonArea(outline) {
  let a = 0;
  for (let n = 0; n < outline.length; n++) {
    const p = outline[n];
    const q = outline[(n + 1) % outline.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a / 2);
}

function distToSegment(x, y, p, q) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / len2));
  return Math.hypot(x - (p[0] + t * dx), y - (p[1] + t * dy));
}

/** True when the point is inside the outline or on its boundary (within eps). */
export function pointInOutline(x, y, outline, eps = 0.1) {
  let inside = false;
  const n = outline.length;
  for (let a = 0, b = n - 1; a < n; b = a++) {
    const p = outline[a];
    const q = outline[b];
    if (distToSegment(x, y, p, q) <= eps) return true;
    if (p[1] > y !== q[1] > y && x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0])
      inside = !inside;
  }
  return inside;
}

function properCross(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(a, b, c);
  const d2 = o(a, b, d);
  const d3 = o(c, d, a);
  const d4 = o(c, d, b);
  return d1 * d2 < -EPS && d3 * d4 < -EPS;
}

/**
 * Whether a convex quadrilateral (rotated rectangle corners) lies inside the outline.
 * Touching the boundary is allowed.
 */
export function cornersInOutline(corners, outline, eps = 0.1) {
  for (const c of corners) if (!pointInOutline(c.x, c.y, outline, eps)) return false;
  const quad = corners.map((c) => [c.x, c.y]);
  for (let n = 0; n < outline.length; n++) {
    const p = outline[n];
    const q = outline[(n + 1) % outline.length];
    for (let k = 0; k < 4; k++) if (properCross(p, q, quad[k], quad[(k + 1) % 4])) return false;
    // A reflex corner poking into the piece
    if (pointStrictlyInQuad(p, quad, eps)) return false;
  }
  return true;
}

function pointStrictlyInQuad(p, quad, eps) {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const a = quad[k];
    const b = quad[(k + 1) % 4];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (Math.abs(cross) / len <= eps) return false;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** True when a furniture piece protrudes outside the outline. */
export function pieceOutsideOutline(item, outline, eps = 0.1) {
  const corners = getRotatedRectCorners(
    item.x,
    item.y,
    item.widthCm,
    item.depthCm,
    item.rotationDeg || 0
  );
  return !cornersInOutline(corners, outline, eps);
}

/**
 * Moves a piece to the nearest spot where it fits inside the outline.
 * Returns the position unchanged when it already fits, or when nothing fits.
 */
export function nudgeIntoOutline(item, outline, maxRadius = 600) {
  if (!pieceOutsideOutline(item, outline)) return { x: item.x, y: item.y };
  const test = (x, y) => !pieceOutsideOutline({ ...item, x, y }, outline);
  const step = 4;
  for (let r = step; r <= maxRadius; r += step) {
    const samples = Math.max(16, Math.round((2 * Math.PI * r) / 12));
    let best = null;
    for (let s = 0; s < samples; s++) {
      const ang = (s / samples) * Math.PI * 2;
      const x = item.x + Math.cos(ang) * r;
      const y = item.y + Math.sin(ang) * r;
      if (test(x, y)) {
        best = { x, y };
        break;
      }
    }
    if (best) return { x: Math.round(best.x * 10) / 10, y: Math.round(best.y * 10) / 10 };
  }
  return { x: item.x, y: item.y };
}

/** Axis-aligned slab of the outline's edges: a piece's AABB gap to the nearest wall on each side. */
export function distancesToOutline(aabb, outline) {
  const mid = { x: (aabb.minX + aabb.maxX) / 2, y: (aabb.minY + aabb.maxY) / 2 };
  const hit = { left: Infinity, right: Infinity, top: Infinity, bottom: Infinity };
  const n = outline.length;
  for (let k = 0; k < n; k++) {
    const p = outline[k];
    const q = outline[(k + 1) % n];
    if (p[1] === q[1]) {
      const lo = Math.min(p[0], q[0]);
      const hi = Math.max(p[0], q[0]);
      if (mid.x < lo || mid.x > hi) continue;
      if (p[1] <= aabb.minY) hit.top = Math.min(hit.top, aabb.minY - p[1]);
      if (p[1] >= aabb.maxY) hit.bottom = Math.min(hit.bottom, p[1] - aabb.maxY);
    } else if (p[0] === q[0]) {
      const lo = Math.min(p[1], q[1]);
      const hi = Math.max(p[1], q[1]);
      if (mid.y < lo || mid.y > hi) continue;
      if (p[0] <= aabb.minX) hit.left = Math.min(hit.left, aabb.minX - p[0]);
      if (p[0] >= aabb.maxX) hit.right = Math.min(hit.right, p[0] - aabb.maxX);
    }
  }
  const fin = (v) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  return { left: fin(hit.left), right: fin(hit.right), top: fin(hit.top), bottom: fin(hit.bottom) };
}

// ---------- edges ----------

/**
 * Edges of a room outline. Each has its end points, unit direction, the unit normal
 * pointing into the room and whether it is open (no wall).
 */
export function outlineEdges(room) {
  if (!hasOutline(room)) return [];
  const open = new Set(room.openEdges || []);
  const n = room.outline.length;
  return room.outline.map((p, i) => {
    const q = room.outline[(i + 1) % n];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const dx = len ? (q[0] - p[0]) / len : 1;
    const dy = len ? (q[1] - p[1]) / len : 0;
    return {
      i,
      p0: { x: p[0], y: p[1] },
      p1: { x: q[0], y: q[1] },
      len,
      dx,
      dy,
      nx: -dy,
      ny: dx,
      open: open.has(i),
    };
  });
}

/** Point `along` cm from the start of edge `edge` and `inward` cm into the room. */
export function pointOnEdge(edge, along, inward = 0) {
  return {
    x: edge.p0.x + edge.dx * along + edge.nx * inward,
    y: edge.p0.y + edge.dy * along + edge.ny * inward,
  };
}

/** Index of the edge nearest a point, with the distance along it. */
export function nearestEdge(room, x, y, { solidOnly = true } = {}) {
  let best = null;
  for (const e of outlineEdges(room)) {
    if (solidOnly && e.open) continue;
    const t = Math.max(0, Math.min(e.len, (x - e.p0.x) * e.dx + (y - e.p0.y) * e.dy));
    const px = e.p0.x + e.dx * t;
    const py = e.p0.y + e.dy * t;
    const d = Math.hypot(px - x, py - y);
    if (!best || d < best.dist) best = { edge: e.i, along: t, dist: d };
  }
  return best;
}

/** Length of the wall a door or window sits on (edge length for outline rooms). */
export function openingWallLength(room, opening) {
  if (hasOutline(room)) {
    const e = outlineEdges(room)[opening.edge ?? 0];
    return e ? e.len : 0;
  }
  const wall = opening.wall;
  return wall === 'left' || wall === 'right' ? room.depthCm : room.widthCm;
}

/** Rectangle (4 corners) in front of an opening on an outline edge, `depth` cm into the room. */
export function outlineOpeningZone(room, opening, depth) {
  const e = outlineEdges(room)[opening.edge ?? 0];
  if (!e) return [];
  const a = opening.offsetCm;
  const b = opening.offsetCm + opening.widthCm;
  return [
    pointOnEdge(e, a, 0),
    pointOnEdge(e, b, 0),
    pointOnEdge(e, b, depth),
    pointOnEdge(e, a, depth),
  ];
}

/** Index of the longest edge that has a wall (where a new door or window goes first). */
export function longestSolidEdge(room) {
  let best = 0;
  let bestLen = -1;
  for (const e of outlineEdges(room)) {
    if (!e.open && e.len > bestLen) {
      best = e.i;
      bestLen = e.len;
    }
  }
  return best;
}

/** Bounding box size of an outline. */
export function outlineBounds(outline) {
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Validates an outline from untrusted data. Returns clean points or null. */
export function sanitizeOutline(raw, maxCm = 4000) {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 200) return null;
  const pts = [];
  for (const p of raw) {
    if (!Array.isArray(p) || p.length < 2) return null;
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -1 || y < -1 || x > maxCm || y > maxCm)
      return null;
    pts.push([Math.max(0, Math.round(x)), Math.max(0, Math.round(y))]);
  }
  return polygonArea(pts) > 10000 ? pts : null;
}

export { getAABB };
