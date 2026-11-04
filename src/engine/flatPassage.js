/**
 * flatPassage.js
 * Pure engine for passages (corridors) in the flat designer.
 *
 * A passage is a rectangular room with a long axis. It is stored as nothing more than
 * its bounding walls plus a room of kind "passage" that remembers which way it points
 * (`heading`: 0 east, 90 south, 180 west, 270 north). Walls are straight runs on the
 * 10 cm grid, so a passage turns in quarter turns only.
 *
 * Placing builds the four walls (sharing and merging with walls that already exist),
 * refuses to cut through other rooms or walls, and offers a door onto a neighbouring
 * room so the passage is reachable. Editing and rotating rebuild the walls the passage
 * owns and keep the ones it shares with its neighbours.
 */

import {
  CELL,
  analyzeEdges,
  analyzeRuns,
  edgeKey,
  edgesOf,
  openingFitsWalls,
  snapCm,
} from './flatWalls.js';
import { setLevelWalls, addOpening, setSpaceMeta, wallsOf, openingsOf } from './flatPlan.js';
import { isPassageKind, uid } from './flat.js';

export const PASSAGE_DEFAULTS = { lengthCm: 300, widthCm: 120, heading: 0 };
export const PASSAGE_LIMITS = { widthCm: [80, 250], lengthCm: [100, 1500] };
const MAX_COORD_CM = 4000;
const DOOR_WIDTHS = [90, 80, 70, 60];

const quarter = (heading) => (((Math.round((heading || 0) / 90) % 4) + 4) % 4) * 90;
const isHorizontal = (heading) => quarter(heading) % 180 === 0;

/** Rounds to the grid, away from zero, so a turn and its reverse cancel exactly. */
const snapAway = (v) => Math.sign(v) * Math.round(Math.abs(v) / CELL) * CELL;

/** Length and width snapped to the grid and kept inside the allowed range. */
export function clampPassageSize({ lengthCm, widthCm }) {
  const fit = (v, [lo, hi], fallback) => {
    const n = Number.isFinite(Number(v)) ? Number(v) : fallback;
    return Math.max(lo, Math.min(hi, snapCm(n)));
  };
  return {
    lengthCm: fit(lengthCm, PASSAGE_LIMITS.lengthCm, PASSAGE_DEFAULTS.lengthCm),
    widthCm: fit(widthCm, PASSAGE_LIMITS.widthCm, PASSAGE_DEFAULTS.widthCm),
  };
}

/** Footprint of a passage whose top-left corner is (x, y). */
export function passageRect({ x, y, lengthCm, widthCm, heading = 0 }) {
  const horizontal = isHorizontal(heading);
  return {
    x,
    y,
    widthCm: horizontal ? lengthCm : widthCm,
    depthCm: horizontal ? widthCm : lengthCm,
  };
}

/** Top-left corner that centres a footprint on a point. */
export function passageOrigin(cx, cy, dims) {
  const r = passageRect({ x: 0, y: 0, ...dims });
  return {
    x: snapCm(cx - r.widthCm / 2),
    y: snapCm(cy - r.depthCm / 2),
  };
}

/** Length, width and heading of an existing passage room. */
export function passageDims(space) {
  const heading =
    space.heading !== undefined ? quarter(space.heading) : space.widthCm >= space.depthCm ? 0 : 90;
  const horizontal = isHorizontal(heading);
  return {
    heading,
    lengthCm: horizontal ? space.widthCm : space.depthCm,
    widthCm: horizontal ? space.depthCm : space.widthCm,
  };
}

/** Whether a room can be edited as a passage (a passage kind with a rectangular floor). */
export const isEditablePassage = (space) => !!space && isPassageKind(space.kind) && !!space.rect;

const cellsOf = (rect) => ({
  i0: Math.round(rect.x / CELL),
  j0: Math.round(rect.y / CELL),
  i1: Math.round((rect.x + rect.widthCm) / CELL),
  j1: Math.round((rect.y + rect.depthCm) / CELL),
});

/** Unit edges around a rectangle. */
export function rectBoundaryEdges(rect) {
  const { i0, j0, i1, j1 } = cellsOf(rect);
  const out = [];
  for (let i = i0; i < i1; i++) out.push(edgeKey('h', i, j0), edgeKey('h', i, j1));
  for (let j = j0; j < j1; j++) out.push(edgeKey('v', i0, j), edgeKey('v', i1, j));
  return out;
}

/** The unit edge on the rectangle's boundary and the cell just outside it. */
function boundaryNeighbours(rect) {
  const { i0, j0, i1, j1 } = cellsOf(rect);
  const out = [];
  for (let i = i0; i < i1; i++) {
    out.push({ key: edgeKey('h', i, j0), cell: [i, j0 - 1] });
    out.push({ key: edgeKey('h', i, j1), cell: [i, j1] });
  }
  for (let j = j0; j < j1; j++) {
    out.push({ key: edgeKey('v', i0, j), cell: [i0 - 1, j] });
    out.push({ key: edgeKey('v', i1, j), cell: [i1, j] });
  }
  return out;
}

const outsideAt = (analysis, i, j) => analysis.empty || analysis.isOutsideCell(i, j);

const PROBLEMS = {
  plan: {
    place: 'That would leave the plan. Move it back onto the plan.',
    edit: 'That would leave the plan, so the passage is left as it is.',
  },
  room: {
    place: 'That overlaps a room. Pick a free spot or a smaller size.',
    edit: 'That would overlap another room, so the passage is left as it is.',
  },
  wall: {
    place: 'A wall runs through that spot.',
    edit: 'A wall runs through the new shape, so the passage is left as it is.',
  },
};

/** Why a rectangle cannot hold a passage on this wall layout, or null when it can. */
export function rectProblem(edges, analysis, rect, mode = 'place', skipLow = false) {
  const right = rect.x + rect.widthCm;
  const bottom = rect.y + rect.depthCm;
  if ((!skipLow && (rect.x < 0 || rect.y < 0)) || right > MAX_COORD_CM || bottom > MAX_COORD_CM)
    return PROBLEMS.plan[mode];
  if (edges.size === 0) return null;
  const { i0, j0, i1, j1 } = cellsOf(rect);
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) if (!outsideAt(analysis, i, j)) return PROBLEMS.room[mode];
  for (let j = j0 + 1; j < j1; j++)
    for (let i = i0; i < i1; i++) if (edges.has(edgeKey('h', i, j))) return PROBLEMS.wall[mode];
  for (let i = i0 + 1; i < i1; i++)
    for (let j = j0; j < j1; j++) if (edges.has(edgeKey('v', i, j))) return PROBLEMS.wall[mode];
  return null;
}

const touches = (a, b) =>
  a.axis === b.axis &&
  a.line === b.line &&
  a.start < b.start + b.widthCm &&
  b.start < a.start + a.widthCm;

/** Stretches of the rectangle's sides that lie against an existing room. */
function sharedSpans(analysis, rect) {
  const { i0, j0, i1, j1 } = cellsOf(rect);
  const spans = [];
  const walk = (axis, line, from, to, neighbour) => {
    let start = null;
    for (let n = from; n <= to; n++) {
      const [ci, cj] = n < to ? neighbour(n) : [0, 0];
      const shared = n < to && !outsideAt(analysis, ci, cj);
      if (shared && start === null) start = n;
      if (!shared && start !== null) {
        spans.push({ axis, line: line * CELL, from: start * CELL, to: n * CELL });
        start = null;
      }
    }
  };
  walk('h', j0, i0, i1, (n) => [n, j0 - 1]);
  walk('h', j1, i0, i1, (n) => [n, j1]);
  walk('v', i0, j0, j1, (n) => [i0 - 1, n]);
  walk('v', i1, j0, j1, (n) => [i1, n]);
  return spans.sort((a, b) => b.to - b.from - (a.to - a.from));
}

/** A door in the longest wall the passage shares with a room, or null when there is none. */
export function connectingDoor(analysis, edgesAfter, openings, rect) {
  for (const span of sharedSpans(analysis, rect)) {
    const len = span.to - span.from;
    for (const widthCm of DOOR_WIDTHS) {
      if (widthCm > len) continue;
      const centre = span.from + snapCm((len - widthCm) / 2);
      const starts = [];
      for (let s = span.from; s + widthCm <= span.to; s += CELL) starts.push(s);
      starts.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
      for (const start of starts) {
        const op = {
          id: uid('door'),
          type: 'door',
          axis: span.axis,
          line: span.line,
          start,
          widthCm,
        };
        if (openingFitsWalls(edgesAfter, op) && !openings.some((o) => touches(o, op))) return op;
      }
    }
  }
  return null;
}

/**
 * Pulls a footprint flush against nearby walls so a passage meets a room cleanly.
 * Only walls that overlap the footprint's span are considered.
 */
export function snapPassageToWalls(runs, rect, tolCm = 16) {
  let dx = 0;
  let dy = 0;
  let bestX = tolCm + 1;
  let bestY = tolCm + 1;
  const right = rect.x + rect.widthCm;
  const bottom = rect.y + rect.depthCm;
  for (const r of runs) {
    if (r.x1 === r.x2) {
      if (r.y2 <= rect.y || r.y1 >= bottom) continue;
      for (const side of [rect.x, right]) {
        const d = r.x1 - side;
        if (Math.abs(d) < bestX) {
          bestX = Math.abs(d);
          dx = d;
        }
      }
    } else {
      if (r.x2 <= rect.x || r.x1 >= right) continue;
      for (const side of [rect.y, bottom]) {
        const d = r.y1 - side;
        if (Math.abs(d) < bestY) {
          bestY = Math.abs(d);
          dy = d;
        }
      }
    }
  }
  return { dx: bestX <= tolCm ? dx : 0, dy: bestY <= tolCm ? dy : 0 };
}

/** Everything in a flat moved by (dx, dy) cm (both multiples of the grid). */
export function shiftFlat(flat, dx, dy) {
  if (!dx && !dy) return flat;
  const di = dx / CELL;
  const dj = dy / CELL;
  const walls = {};
  for (const [id, runs] of Object.entries(flat.walls || {}))
    walls[id] = runs.map((r) => ({ x1: r.x1 + dx, y1: r.y1 + dy, x2: r.x2 + dx, y2: r.y2 + dy }));
  const openings = {};
  for (const [id, list] of Object.entries(flat.openings || {}))
    openings[id] = list.map((o) =>
      o.axis === 'h'
        ? { ...o, line: o.line + dy, start: o.start + dx }
        : { ...o, line: o.line + dx, start: o.start + dy }
    );
  return {
    ...flat,
    walls,
    openings,
    spaces: flat.spaces.map((s) => ({
      ...s,
      x: s.x + dx,
      y: s.y + dy,
      ...(s.roomX !== undefined ? { roomX: s.roomX + dx, roomY: s.roomY + dy } : {}),
      ...(s.runs ? { runs: s.runs.map(([j, i0, i1]) => [j + dj, i0 + di, i1 + di]) } : {}),
    })),
    stairs: flat.stairs.map((st) => ({ ...st, x: st.x + dx, y: st.y + dy })),
  };
}

/**
 * Placing may start left of or above the plan. The plan then slides across (every floor
 * together) so the whole drawing stays on positive coordinates.
 */
function placementShift(rect) {
  return { dx: Math.max(0, -rect.x), dy: Math.max(0, -rect.y) };
}

function placementProblem(flat, levelId, rect) {
  const { dx, dy } = placementShift(rect);
  let maxX = 0;
  let maxY = 0;
  for (const runs of Object.values(flat.walls || {}))
    for (const r of runs) {
      maxX = Math.max(maxX, r.x2);
      maxY = Math.max(maxY, r.y2);
    }
  for (const st of flat.stairs) {
    maxX = Math.max(maxX, st.x + 400);
    maxY = Math.max(maxY, st.y + 400);
  }
  if (maxX + dx > MAX_COORD_CM || maxY + dy > MAX_COORD_CM) return PROBLEMS.plan.place;
  const runs = wallsOf(flat, levelId);
  return rectProblem(edgesOf(runs), analyzeRuns(runs), rect, 'place', true);
}

/**
 * What placing a passage would do, for the ghost that follows the cursor.
 * @returns {{ rect, valid: boolean, reason?: string }}
 */
export function previewPassage(flat, levelId, { x, y, lengthCm, widthCm, heading = 0 }) {
  const size = clampPassageSize({ lengthCm, widthCm });
  const rect = passageRect({ x, y, ...size, heading });
  const problem = placementProblem(flat, levelId, rect);
  return problem ? { rect, valid: false, reason: problem } : { rect, valid: true };
}

function nextPassageName(flat) {
  const used = new Set(flat.spaces.map((s) => s.name));
  let n = flat.spaces.filter((s) => isPassageKind(s.kind)).length + 1;
  while (used.has(`Passage ${n}`)) n++;
  return `Passage ${n}`;
}

function findRectSpace(flat, levelId, rect) {
  return flat.spaces.find(
    (s) =>
      s.levelId === levelId &&
      s.x === rect.x &&
      s.y === rect.y &&
      s.widthCm === rect.widthCm &&
      s.depthCm === rect.depthCm
  );
}

/** Marks a detected region as a passage and gives its room the same name and kind. */
function markPassage(result, levelId, rect, { name, heading }) {
  const space = findRectSpace(result.flat, levelId, rect);
  if (!space) return null;
  const meta = setSpaceMeta(result.flat, result.rooms, space.id, { name, kind: 'passage' });
  const spaces = meta.flat.spaces.map((s) => (s.id === space.id ? { ...s, heading } : s));
  return {
    ...result,
    flat: { ...meta.flat, spaces },
    rooms: meta.rooms,
    spaceId: space.id,
  };
}

/**
 * Builds a passage whose top-left corner is (x, y).
 * @returns {{ flat, rooms, removedRoomIds, spaceId, connected: boolean } | { error: string }}
 */
export function placePassage(flat, rooms, levelId, spec) {
  const size = clampPassageSize(spec);
  const heading = quarter(spec.heading);
  const asked = passageRect({ x: snapCm(spec.x), y: snapCm(spec.y), ...size, heading });
  const problem = placementProblem(flat, levelId, asked);
  if (problem) return { error: problem };

  // Starting left of or above the plan slides the whole plan across first
  const shift = placementShift(asked);
  const rect = { ...asked, x: asked.x + shift.dx, y: asked.y + shift.dy };
  const original = flat;
  flat = shiftFlat(flat, shift.dx, shift.dy);
  const runs = wallsOf(flat, levelId);
  const before = edgesOf(runs);
  const analysis = analyzeRuns(runs);

  const edges = new Set(before);
  for (const key of rectBoundaryEdges(rect)) edges.add(key);
  const door =
    spec.connect === false
      ? null
      : connectingDoor(analysis, edges, openingsOf(flat, levelId), rect);

  let result = setLevelWalls(flat, rooms, levelId, edges);
  if (door) result = addOpening(result.flat, result.rooms, levelId, door) || result;
  const marked = markPassage(result, levelId, rect, { name: nextPassageName(flat), heading });
  if (!marked) return { error: 'That spot could not be turned into a passage.' };
  // The detected region took a "Room n" number that the rename leaves unused
  return {
    ...marked,
    flat: { ...marked.flat, roomCounter: original.roomCounter || 0 },
    connected: !!door,
    shift: shift.dx || shift.dy ? shift : null,
  };
}

/** Walls of a passage that nothing else uses (the far side is open ground). */
function ownedEdges(analysis, rect) {
  return boundaryNeighbours(rect)
    .filter(({ cell }) => outsideAt(analysis, cell[0], cell[1]))
    .map(({ key }) => key);
}

/** Turns furniture with its passage: one quarter turn clockwise per step. */
function turnFurniture(items, w, d, turns) {
  let [cw, cd] = [w, d];
  let list = items;
  for (let n = 0; n < turns; n++) {
    list = list.map((f) => ({
      ...f,
      x: cd - f.y,
      y: f.x,
      rotationDeg: ((((f.rotationDeg || 0) + 90) % 360) + 360) % 360,
    }));
    [cw, cd] = [cd, cw];
  }
  return { list, width: cw, depth: cd };
}

const clampInto = (items, w, d) =>
  items.map((f) => ({
    ...f,
    x: Math.max(0, Math.min(w, f.x)),
    y: Math.max(0, Math.min(d, f.y)),
  }));

/**
 * Changes the length or width of a passage (its top-left corner stays put) and/or turns it
 * clockwise about its centre by `turns` quarter turns.
 * @returns {{ flat, rooms, removedRoomIds, spaceId } | { error: string }}
 */
export function editPassage(flat, rooms, spaceId, patch = {}) {
  const space = flat.spaces.find((s) => s.id === spaceId);
  if (!isEditablePassage(space)) return { error: 'Only a rectangular passage can be edited here.' };
  const levelId = space.levelId;
  const cur = passageDims(space);
  const turns = ((Math.round(patch.turns || 0) % 4) + 4) % 4;
  const heading = quarter(cur.heading + turns * 90);
  const size = clampPassageSize({
    lengthCm: patch.lengthCm ?? cur.lengthCm,
    widthCm: patch.widthCm ?? cur.widthCm,
  });
  const next = passageRect({ x: space.x, y: space.y, ...size, heading });
  if (turns % 2 === 1) {
    // A quarter turn keeps the centre where it is
    next.x = space.x + snapAway((space.widthCm - next.widthCm) / 2);
    next.y = space.y + snapAway((space.depthCm - next.depthCm) / 2);
  }
  const sameRect =
    next.x === space.x &&
    next.y === space.y &&
    next.widthCm === space.widthCm &&
    next.depthCm === space.depthCm;
  const oldRoom = space.roomId ? rooms[space.roomId] : null;
  const furniture = oldRoom?.placedFurniture || [];

  if (sameRect) {
    if (heading === (space.heading ?? cur.heading) && turns === 0)
      return { flat, rooms, removedRoomIds: [], spaceId };
    const moved = turnFurniture(furniture, space.widthCm, space.depthCm, turns);
    return {
      flat: {
        ...flat,
        spaces: flat.spaces.map((s) => (s.id === spaceId ? { ...s, heading } : s)),
      },
      rooms: oldRoom
        ? {
            ...rooms,
            [oldRoom.id]: {
              ...oldRoom,
              placedFurniture: clampInto(moved.list, space.widthCm, space.depthCm),
            },
          }
        : rooms,
      removedRoomIds: [],
      spaceId,
    };
  }

  const runs = wallsOf(flat, levelId);
  const edges = new Set(edgesOf(runs));
  const analysis = analyzeRuns(runs);
  for (const key of ownedEdges(analysis, space)) edges.delete(key);
  const freed = analyzeEdges(edges.size ? edges : null);
  const problem = rectProblem(edges, freed, next, 'edit');
  if (problem) return { error: problem };
  for (const key of rectBoundaryEdges(next)) edges.add(key);

  const result = setLevelWalls(flat, rooms, levelId, edges);
  const marked = markPassage(result, levelId, next, { name: space.name, heading });
  if (!marked) return { error: 'That size could not be applied.' };
  const room = marked.rooms[marked.flat.spaces.find((s) => s.id === marked.spaceId).roomId];
  const moved = turnFurniture(furniture, space.widthCm, space.depthCm, turns);
  const kept = room
    ? {
        ...marked.rooms,
        [room.id]: {
          ...room,
          placedFurniture: clampInto(moved.list, next.widthCm, next.depthCm),
        },
      }
    : marked.rooms;
  return {
    ...marked,
    rooms: kept,
    flat: { ...marked.flat, roomCounter: flat.roomCounter || 0 },
  };
}

/** Turns a passage a quarter turn clockwise about its centre. */
export const rotatePassage = (flat, rooms, spaceId, turns = 1) =>
  editPassage(flat, rooms, spaceId, { turns });
