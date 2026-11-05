/**
 * planning.js
 * Pure geometry for the planning layer of a room: service points (sockets, switches,
 * water, drains ...), wall frames, and door and window swings.
 *
 * Service points live on the room as `room.services`, a list of
 *   { id, kind, x, y, rotationDeg, note? }
 * Wall points sit on the inner face of a wall. Their symbol is drawn in a local frame
 * where +y points into the room, and `rotationDeg` turns that frame (clockwise, like
 * furniture), so a point on the top wall has rotation 0, bottom 180, left 270, right 90.
 *
 * Doors may carry `swingDirection` ('inward' | 'outward') and `hingeSide` ('start' | 'end',
 * default 'start': the jamb with the smaller offset). Windows may carry `swing`
 * ('none' | 'inward' | 'outward'; default 'none' = fixed or sliding) and `hingeSide`.
 */

import { hasOutline, outlineEdges, pointInOutline } from './roomShape.js';

/** Drawn thickness of a wall is 16 cm, centred on the room edge; this is the inner face. */
export const WALL_FACE_CM = 8;

/** Doors are measured leaf to leaf; the usable opening is a little narrower than the frame. */
export const DOOR_FRAME_LOSS_CM = 10;
export const WINDOW_SILL_CM = 90;
export const MAX_SERVICES = 300;

export const SERVICE_GROUPS = [
  { id: 'electrical', label: 'Electrical' },
  { id: 'plumbing', label: 'Plumbing and gas' },
];

/**
 * Kinds of service point. `mount` says where the point lives: on a wall (it snaps to the
 * nearest wall), on the floor or on the ceiling (placed anywhere inside the room).
 * `size` is the footprint of the symbol on the plan in cm (width along the wall, depth into
 * the room), large enough to read on screen.
 */
export const SERVICE_KINDS = {
  socket: {
    group: 'electrical',
    label: 'Socket',
    help: 'A power outlet.',
    mount: 'wall',
    heightCm: 30,
    size: { w: 20, d: 14 },
  },
  switch: {
    group: 'electrical',
    label: 'Light switch',
    help: 'A wall switch for the lights.',
    mount: 'wall',
    heightCm: 110,
    size: { w: 18, d: 14 },
  },
  light: {
    group: 'electrical',
    label: 'Wall light',
    help: 'A light fixed to the wall.',
    mount: 'wall',
    heightCm: 180,
    size: { w: 22, d: 16 },
  },
  ceiling: {
    group: 'electrical',
    label: 'Ceiling light',
    help: 'A light point in the ceiling.',
    mount: 'ceiling',
    heightCm: 260,
    size: { w: 28, d: 28 },
  },
  data: {
    group: 'electrical',
    label: 'TV or data point',
    help: 'An aerial, network or TV cable outlet.',
    mount: 'wall',
    heightCm: 100,
    size: { w: 26, d: 14 },
  },
  water: {
    group: 'plumbing',
    label: 'Water supply',
    help: 'Where a water pipe comes out.',
    mount: 'wall',
    heightCm: 60,
    size: { w: 20, d: 14 },
  },
  drain: {
    group: 'plumbing',
    label: 'Drain',
    help: 'A floor drain or waste outlet.',
    mount: 'floor',
    heightCm: 0,
    size: { w: 22, d: 22 },
  },
  gas: {
    group: 'plumbing',
    label: 'Gas point',
    help: 'Where a gas pipe comes out.',
    mount: 'wall',
    heightCm: 60,
    size: { w: 20, d: 14 },
  },
  radiator: {
    group: 'plumbing',
    label: 'Radiator',
    help: 'A wall heater.',
    mount: 'wall',
    heightCm: 20,
    size: { w: 70, d: 10 },
  },
  ac: {
    group: 'plumbing',
    label: 'Air conditioner',
    help: 'An indoor air-conditioning unit.',
    mount: 'wall',
    heightCm: 220,
    size: { w: 80, d: 20 },
  },
};

export const SERVICE_KIND_IDS = Object.keys(SERVICE_KINDS);

export const kindsInGroup = (group) =>
  SERVICE_KIND_IDS.filter((k) => SERVICE_KINDS[k].group === group);

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const round1 = (v) => Math.round(v * 10) / 10;

/** Cleans a list of service points from untrusted data (a share link, a file, old storage). */
export function sanitizeServices(list, { maxX = 4000, maxY = 4000 } = {}) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  list.forEach((s, i) => {
    if (out.length >= MAX_SERVICES || !s || typeof s !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(SERVICE_KINDS, s.kind)) return;
    const x = Number(s.x);
    const y = Number(s.y);
    if (!finite(x) || !finite(y)) return;
    let id = String(s.id || `svc-${i}`).slice(0, 60);
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    const rot = Number(s.rotationDeg);
    const note = typeof s.note === 'string' ? s.note.trim().slice(0, 80) : '';
    out.push({
      id,
      kind: s.kind,
      x: round1(Math.max(0, Math.min(maxX, x))),
      y: round1(Math.max(0, Math.min(maxY, y))),
      rotationDeg: finite(rot) ? ((Math.round(rot) % 360) + 360) % 360 : 0,
      ...(note ? { note } : {}),
    });
  });
  return out;
}

/** The room's service points, always an array of valid points. */
export function servicesOf(room) {
  return room && Array.isArray(room.services) ? sanitizeServices(room.services) : [];
}

export const newServiceId = () => `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------- wall frames ----------

const RECT_FALLBACK = { door: 'bottom', window: 'top' };

/**
 * Frame of the wall an opening sits on: `at(along, inward)` gives the point `along` cm from
 * the start of the wall and `inward` cm into the room. `t` runs along the wall, `n` points
 * into the room.
 */
export function openingFrame(room, opening, type = 'door') {
  if (hasOutline(room)) {
    const e = outlineEdges(room)[opening.edge ?? 0];
    if (!e) return null;
    return {
      len: e.len,
      t: { x: e.dx, y: e.dy },
      n: { x: e.nx, y: e.ny },
      open: e.open,
      at: (along, inward = 0) => ({
        x: e.p0.x + e.dx * along + e.nx * inward,
        y: e.p0.y + e.dy * along + e.ny * inward,
      }),
    };
  }
  return rectFrame(room, opening.wall || RECT_FALLBACK[type] || 'bottom');
}

export function rectFrame(room, wall) {
  const W = room.widthCm;
  const D = room.depthCm;
  const defs = {
    top: { o: [0, 0], t: [1, 0], n: [0, 1], len: W },
    bottom: { o: [0, D], t: [1, 0], n: [0, -1], len: W },
    left: { o: [0, 0], t: [0, 1], n: [1, 0], len: D },
    right: { o: [W, 0], t: [0, 1], n: [-1, 0], len: D },
  };
  const f = defs[wall] || defs.bottom;
  return {
    len: f.len,
    t: { x: f.t[0], y: f.t[1] },
    n: { x: f.n[0], y: f.n[1] },
    open: false,
    at: (along, inward = 0) => ({
      x: f.o[0] + f.t[0] * along + f.n[0] * inward,
      y: f.o[1] + f.t[1] * along + f.n[1] * inward,
    }),
  };
}

/** Rotation (degrees) that turns a symbol's local +y onto the given inward direction. */
export function rotationForInward(n) {
  const deg = (Math.atan2(-n.x, n.y) * 180) / Math.PI;
  return ((Math.round(deg) % 360) + 360) % 360;
}

// ---------- door and window swings ----------

const sweepFlag = (hinge, tip, far) => {
  const cross = (tip.x - hinge.x) * (far.y - hinge.y) - (tip.y - hinge.y) * (far.x - hinge.x);
  return cross > 0 ? 1 : 0;
};

/**
 * One leaf: hinge point, the tip of the leaf when open at 90 degrees, and the far jamb it
 * swings towards. `sweep` is the SVG arc flag for the path from tip to far.
 */
function leaf(frame, from, to, side) {
  const hinge = frame.at(from, 0);
  const far = frame.at(to, 0);
  const radius = Math.abs(to - from);
  const tip = frame.at(from, side * radius);
  return { hinge, tip, far, radius, sweep: sweepFlag(hinge, tip, far) };
}

export const isOutward = (opening) => opening?.swingDirection === 'outward';

/**
 * Geometry of a door: its frame, the jamb it hinges on and the leaf swing.
 * Returns null when the door's wall does not exist (an open edge, a removed edge).
 */
export function doorGeometry(room, door) {
  const frame = openingFrame(room, door, 'door');
  if (!frame || frame.open) return null;
  const a = door.offsetCm;
  const b = door.offsetCm + door.widthCm;
  const hingeAtStart = door.hingeSide !== 'end';
  const outward = isOutward(door);
  const side = outward ? -1 : 1;
  const l = hingeAtStart ? leaf(frame, a, b, side) : leaf(frame, b, a, side);
  return { frame, outward, hingeAtStart, a, b, ...l };
}

/** A quarter-disc as a polygon: hinge, then points along the arc from tip to far jamb. */
export function sectorPolygon(hinge, tip, far, steps = 12) {
  const vx = tip.x - hinge.x;
  const vy = tip.y - hinge.y;
  const wx = far.x - hinge.x;
  const wy = far.y - hinge.y;
  const pts = [{ x: hinge.x, y: hinge.y }];
  for (let i = 0; i <= steps; i++) {
    const phi = ((Math.PI / 2) * i) / steps;
    pts.push({
      x: hinge.x + vx * Math.cos(phi) + wx * Math.sin(phi),
      y: hinge.y + vy * Math.cos(phi) + wy * Math.sin(phi),
    });
  }
  return pts;
}

/** Space a door needs: the leaf's quarter-circle, or (opens outwards) a 60 cm landing. */
export const DOOR_LANDING_CM = 60;

export function doorZone(room, door) {
  const g = doorGeometry(room, door);
  if (!g) return null;
  if (g.outward) {
    return {
      kind: 'door-landing',
      corners: [
        g.frame.at(g.a, 0),
        g.frame.at(g.b, 0),
        g.frame.at(g.b, DOOR_LANDING_CM),
        g.frame.at(g.a, DOOR_LANDING_CM),
      ],
    };
  }
  return { kind: 'door', corners: sectorPolygon(g.hinge, g.tip, g.far) };
}

/**
 * Leaves of a window that opens. Wide windows have two leaves meeting in the middle,
 * narrow ones one leaf on the chosen hinge side. Empty for fixed windows.
 */
export function windowLeaves(room, win) {
  const swing = win?.swing;
  if (swing !== 'inward' && swing !== 'outward') return [];
  const frame = openingFrame(room, win, 'window');
  if (!frame || frame.open) return [];
  const a = win.offsetCm;
  const b = win.offsetCm + win.widthCm;
  const side = swing === 'outward' ? -1 : 1;
  if (win.widthCm > 90) {
    const mid = (a + b) / 2;
    return [leaf(frame, a, mid, side), leaf(frame, b, mid, side)];
  }
  return [win.hingeSide === 'end' ? leaf(frame, b, a, side) : leaf(frame, a, b, side)];
}

/** Floor space a swinging window sweeps (inward leaves only; they can be blocked from inside). */
export function windowSwingZones(room, win) {
  return win?.swing === 'inward'
    ? windowLeaves(room, win).map((l) => sectorPolygon(l.hinge, l.tip, l.far, 8))
    : [];
}

// ---------- service points ----------

function rectWalls(room) {
  return ['top', 'bottom', 'left', 'right'].map((wall) => ({ wall, frame: rectFrame(room, wall) }));
}

/**
 * Nearest wall to a point: the point on the wall's inner face, the symbol rotation, and the
 * distance from the pointer. Open edges (no wall) are skipped.
 */
export function snapToWall(room, x, y) {
  let best = null;
  const consider = (key, frame) => {
    const along = Math.max(
      0,
      Math.min(frame.len, (x - frame.at(0).x) * frame.t.x + (y - frame.at(0).y) * frame.t.y)
    );
    const onWall = frame.at(along, 0);
    const dist = Math.hypot(onWall.x - x, onWall.y - y);
    if (!best || dist < best.dist) best = { key, frame, along, dist };
  };
  if (hasOutline(room)) {
    for (const e of outlineEdges(room)) {
      if (e.open) continue;
      consider(e.i, openingFrame(room, { edge: e.i }));
    }
  } else {
    for (const w of rectWalls(room)) consider(w.wall, w.frame);
  }
  if (!best) return null;
  const p = best.frame.at(best.along, WALL_FACE_CM);
  return {
    x: round1(p.x),
    y: round1(p.y),
    rotationDeg: rotationForInward(best.frame.n),
    wall: best.key,
    along: best.along,
    dist: best.dist,
  };
}

/** True when the point lies in the room's floor area. */
export function insideRoom(room, x, y, eps = 0.5) {
  if (hasOutline(room)) return pointInOutline(x, y, room.outline, eps);
  return x >= -eps && y >= -eps && x <= room.widthCm + eps && y <= room.depthCm + eps;
}

/**
 * Where a point of this kind goes when the user drops it at (x, y): wall points snap to the
 * nearest wall, floor and ceiling points stay where they are (kept inside the room).
 */
export function positionService(room, kind, x, y, rotationDeg = 0) {
  const def = SERVICE_KINDS[kind];
  if (!def) return null;
  if (def.mount === 'wall') {
    const snap = snapToWall(room, x, y);
    if (!snap) return null;
    return { x: snap.x, y: snap.y, rotationDeg: snap.rotationDeg };
  }
  const bw = room.widthCm;
  const bd = room.depthCm;
  let px = Math.max(0, Math.min(bw, x));
  let py = Math.max(0, Math.min(bd, y));
  if (hasOutline(room) && !pointInOutline(px, py, room.outline, 0.5)) {
    // Nearest point of the floor: walk back towards the pointer's nearest wall
    const snap = snapToWall(room, px, py);
    if (snap) {
      px = snap.x;
      py = snap.y;
    }
  }
  return {
    x: round1(px),
    y: round1(py),
    rotationDeg: ((Math.round(rotationDeg) % 360) + 360) % 360,
  };
}

/** The service shown to the user, e.g. "Socket 2". Numbered per kind in list order. */
export function serviceLabels(services) {
  const count = {};
  const out = {};
  for (const s of services) {
    count[s.kind] = (count[s.kind] || 0) + 1;
    out[s.id] = `${SERVICE_KINDS[s.kind].label} ${count[s.kind]}`;
  }
  return out;
}

// ---------- small geometry helpers shared with the checks ----------

/** Distance from a point to a convex polygon (0 when inside). */
export function distanceToPolygon(p, corners) {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross < 0) inside = false;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  // Corners may be wound either way: inside when all crosses share a sign
  if (!inside) {
    const signs = corners.map((a, i) => {
      const b = corners[(i + 1) % corners.length];
      return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0;
    });
    if (signs.every(Boolean)) inside = true;
  }
  return inside ? 0 : best;
}

/**
 * Whether two convex polygons (any number of corners) overlap by more than `eps` cm.
 * Separating-axis test over every edge, so it also works for the swing sectors.
 */
export function polygonsOverlap(a, b, eps = 0.5) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (len === 0) continue;
      const nx = -(q.y - p.y) / len;
      const ny = (q.x - p.x) / len;
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const c of a) {
        const d = c.x * nx + c.y * ny;
        minA = Math.min(minA, d);
        maxA = Math.max(maxA, d);
      }
      for (const c of b) {
        const d = c.x * nx + c.y * ny;
        minB = Math.min(minB, d);
        maxB = Math.max(maxB, d);
      }
      if (maxA - minB <= eps || maxB - minA <= eps) return false;
    }
  }
  return true;
}

/**
 * Which jamb ('start' or 'end') is on the viewer's left and right when standing inside the
 * room facing the wall the opening is in. Lets the inspector say "Left" and "Right" instead
 * of "start" and "end".
 */
export function hingeSides(room, opening, type = 'door') {
  const frame = openingFrame(room, opening, type);
  if (!frame) return { left: 'start', right: 'end' };
  // Facing the wall means facing -n; the viewer's right-hand direction on screen is (n.y, -n.x)
  const toRight = frame.t.x * frame.n.y + frame.t.y * -frame.n.x;
  return toRight > 0 ? { left: 'start', right: 'end' } : { left: 'end', right: 'start' };
}
