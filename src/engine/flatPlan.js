/**
 * flatPlan.js
 * Keeps a flat consistent while its walls change: detects rooms from the walls,
 * carries each room's identity (name, kind, room record) across edits, derives the
 * doors and windows of every room record from the openings in the walls, and
 * upgrades flats saved in the old rectangle format.
 *
 * Every function here is pure. Edits take { flat, rooms } and return
 * { flat, rooms, removedRoomIds } so a store can persist exactly what changed.
 */

import {
  CELL,
  analyzeRuns,
  edgesOf,
  edgesToRuns,
  pruneOpenings,
  runsOverlap,
  wallsCrossRect,
  wallRunAt,
  addSegment,
  removeEdges,
  openingFitsWalls,
} from './flatWalls.js';
import {
  SPACE_KINDS,
  buildBlankRoom,
  furnishRoomRecord,
  uid,
  FLAT_VERSION,
  stairRect,
} from './flat.js';

const NO_ITEMS = [];

export const wallsOf = (flat, levelId) => flat.walls?.[levelId] || NO_ITEMS;
export const openingsOf = (flat, levelId) => flat.openings?.[levelId] || NO_ITEMS;
export const analyzeLevel = (flat, levelId) => analyzeRuns(wallsOf(flat, levelId));
export const levelEdges = (flat, levelId) => edgesOf(wallsOf(flat, levelId));

// ---------- openings <-> room record doors and windows ----------

/** Openings that sit on the four sides of a rectangle, as room-record wall + offset. */
function boundaryOpenings(openings, rect) {
  const x1 = rect.x + rect.widthCm;
  const y1 = rect.y + rect.depthCm;
  const out = [];
  for (const op of openings) {
    const end = op.start + op.widthCm;
    if (op.axis === 'h') {
      if (op.start < rect.x || end > x1) continue;
      if (op.line === rect.y) out.push({ op, wall: 'top', offsetCm: op.start - rect.x });
      else if (op.line === y1) out.push({ op, wall: 'bottom', offsetCm: op.start - rect.x });
    } else {
      if (op.start < rect.y || end > y1) continue;
      if (op.line === rect.x) out.push({ op, wall: 'left', offsetCm: op.start - rect.y });
      else if (op.line === x1) out.push({ op, wall: 'right', offsetCm: op.start - rect.y });
    }
  }
  return out;
}

function roomOpeningsFor(openings, rect) {
  const doors = [];
  const windows = [];
  for (const { op, wall, offsetCm } of boundaryOpenings(openings, rect)) {
    if (op.type === 'door')
      doors.push({
        id: op.id,
        wall,
        offsetCm,
        widthCm: op.widthCm,
        swingDirection: op.swing || 'inward-left',
      });
    else windows.push({ id: op.id, wall, offsetCm, widthCm: op.widthCm });
  }
  return { doors, windows };
}

function openingFromRoomItem(item, type, rect) {
  const wall = item.wall || (type === 'door' ? 'bottom' : 'top');
  const horizontal = wall === 'top' || wall === 'bottom';
  const lineOf = {
    top: rect.y,
    bottom: rect.y + rect.depthCm,
    left: rect.x,
    right: rect.x + rect.widthCm,
  }[wall];
  const origin = horizontal ? rect.x : rect.y;
  const len = horizontal ? rect.widthCm : rect.depthCm;
  const widthCm = Math.max(30, Math.min(len, Math.round(item.widthCm)));
  const start = Math.max(
    origin,
    Math.min(origin + len - widthCm, origin + Math.round(item.offsetCm))
  );
  const op = { id: item.id, type, axis: horizontal ? 'h' : 'v', line: lineOf, start, widthCm };
  if (type === 'door' && item.swingDirection) op.swing = item.swingDirection;
  return op;
}

// ---------- reconcile ----------

const spaceRuns = (s) => {
  if (s.runs) return s.runs;
  const runs = [];
  const j0 = Math.round(s.y / CELL);
  const j1 = Math.round((s.y + s.depthCm) / CELL);
  const i0 = Math.round(s.x / CELL);
  const i1 = Math.round((s.x + s.widthCm) / CELL);
  for (let j = j0; j < j1; j++) runs.push([j, i0, i1]);
  return runs;
};

const spaceCells = (s) =>
  s.runs
    ? s.runs.reduce((n, [, a, b]) => n + (b - a), 0)
    : Math.round((s.widthCm * s.depthCm) / (CELL * CELL));

function refitRoom(room, space, openings, flatId) {
  const rect = { x: space.x, y: space.y, widthCm: space.widthCm, depthCm: space.depthCm };
  const shiftX = space.roomX !== undefined ? space.roomX - space.x : 0;
  const shiftY = space.roomY !== undefined ? space.roomY - space.y : 0;
  const { doors, windows } = roomOpeningsFor(openings, rect);
  let furnitureChanged = false;
  const placedFurniture = (room.placedFurniture || []).map((f) => {
    const x = Math.max(0, Math.min(rect.widthCm, f.x + shiftX));
    const y = Math.max(0, Math.min(rect.depthCm, f.y + shiftY));
    if (x === f.x && y === f.y) return f;
    furnitureChanged = true;
    return { ...f, x, y };
  });
  const same =
    room.widthCm === rect.widthCm &&
    room.depthCm === rect.depthCm &&
    room.name === space.name &&
    room.kind === space.kind &&
    room.spaceId === space.id &&
    room.flatId === flatId &&
    !furnitureChanged &&
    JSON.stringify(room.doors || []) === JSON.stringify(doors) &&
    JSON.stringify(room.windows || []) === JSON.stringify(windows);
  if (same) return room;
  return {
    ...room,
    name: space.name,
    kind: space.kind,
    spaceId: space.id,
    flatId,
    widthCm: rect.widthCm,
    depthCm: rect.depthCm,
    doors,
    windows,
    placedFurniture: furnitureChanged ? placedFurniture : room.placedFurniture,
  };
}

/**
 * Detects the rooms of every level and brings the room records in line.
 * Rooms keep their name, kind and record when the new region overlaps an old one
 * by at least half; unmatched old rooms lose their record and new regions get an
 * empty one.
 */
export function reconcile(flat, rooms = {}) {
  const nextRooms = { ...rooms };
  const removedRoomIds = [];
  const dropRoom = (roomId) => {
    if (roomId && nextRooms[roomId]) {
      delete nextRooms[roomId];
      removedRoomIds.push(roomId);
    }
  };
  let counter = flat.roomCounter || 0;
  const levelIds = new Set(flat.levels.map((l) => l.id));
  for (const s of flat.spaces) if (!levelIds.has(s.levelId)) dropRoom(s.roomId);

  const spaces = [];
  for (const level of flat.levels) {
    const analysis = analyzeLevel(flat, level.id);
    const openings = openingsOf(flat, level.id);
    const previous = flat.spaces.filter((s) => s.levelId === level.id);

    const pairs = [];
    for (const region of analysis.regions) {
      for (const p of previous) {
        const overlap = runsOverlap(region.runs, spaceRuns(p));
        if (overlap > 0) pairs.push({ overlap, region, p });
      }
    }
    pairs.sort((a, b) => b.overlap - a.overlap);
    const carried = new Map();
    const used = new Set();
    for (const { overlap, region, p } of pairs) {
      if (carried.has(region.index) || used.has(p.id)) continue;
      if (overlap / spaceCells(p) >= 0.5 || overlap / region.cells >= 0.5) {
        carried.set(region.index, p);
        used.add(p.id);
      }
    }
    for (const p of previous) if (!used.has(p.id)) dropRoom(p.roomId);

    for (const region of analysis.regions) {
      const old = carried.get(region.index);
      const space = {
        id: old?.id ?? uid('space'),
        levelId: level.id,
        kind: old?.kind && SPACE_KINDS[old.kind] ? old.kind : 'room',
        name: old?.name ?? `Room ${++counter}`,
        roomId: old?.roomId ?? null,
        roomX: old?.roomX,
        roomY: old?.roomY,
        x: region.x,
        y: region.y,
        widthCm: region.widthCm,
        depthCm: region.depthCm,
        areaCm2: region.areaCm2,
        rect: region.rect,
        furnishable: region.rect,
        runs: region.runs,
      };
      if (old?.heading !== undefined) space.heading = old.heading;
      if (region.rect) {
        let room = space.roomId ? nextRooms[space.roomId] : null;
        if (!room) {
          room = buildBlankRoom({
            kind: space.kind,
            name: space.name,
            widthCm: space.widthCm,
            depthCm: space.depthCm,
            flatId: flat.id,
            spaceId: space.id,
          });
          space.roomId = room.id;
          space.roomX = space.x;
          space.roomY = space.y;
        }
        const fitted = refitRoom(room, space, openings, flat.id);
        nextRooms[fitted.id] = fitted;
        space.roomX = space.x;
        space.roomY = space.y;
      }
      spaces.push(space);
    }
  }
  return { flat: { ...flat, spaces, roomCounter: counter }, rooms: nextRooms, removedRoomIds };
}

// ---------- edits ----------

function withLevelEdges(flat, levelId, edges) {
  return {
    ...flat,
    walls: { ...flat.walls, [levelId]: edgesToRuns(edges) },
    openings: { ...flat.openings, [levelId]: pruneOpenings(openingsOf(flat, levelId), edges) },
  };
}

/** Replaces a level's walls (openings that lose their wall are removed). */
export function setLevelWalls(flat, rooms, levelId, edges) {
  return reconcile(withLevelEdges(flat, levelId, edges), rooms);
}

export function addWall(flat, rooms, levelId, x1, y1, x2, y2) {
  return setLevelWalls(flat, rooms, levelId, addSegment(levelEdges(flat, levelId), x1, y1, x2, y2));
}

/** Removes the straight run of wall (between junctions) that contains an edge. */
export function eraseWallRun(flat, rooms, levelId, key) {
  const edges = levelEdges(flat, levelId);
  const run = wallRunAt(edges, key);
  if (run.length === 0) return null;
  return setLevelWalls(flat, rooms, levelId, removeEdges(edges, run));
}

function setLevelOpenings(flat, rooms, levelId, openings) {
  return reconcile({ ...flat, openings: { ...flat.openings, [levelId]: openings } }, rooms);
}

export function addOpening(flat, rooms, levelId, op) {
  const edges = levelEdges(flat, levelId);
  if (!openingFitsWalls(edges, op)) return null;
  return setLevelOpenings(flat, rooms, levelId, [...openingsOf(flat, levelId), op]);
}

export function removeOpening(flat, rooms, levelId, openingId) {
  return setLevelOpenings(
    flat,
    rooms,
    levelId,
    openingsOf(flat, levelId).filter((o) => o.id !== openingId)
  );
}

export function updateOpening(flat, rooms, levelId, openingId, patch) {
  const edges = levelEdges(flat, levelId);
  const list = openingsOf(flat, levelId);
  const old = list.find((o) => o.id === openingId);
  if (!old) return null;
  const next = { ...old, ...patch };
  if (!openingFitsWalls(edges, next)) return null;
  const clash = list.some(
    (o) =>
      o.id !== openingId &&
      o.axis === next.axis &&
      o.line === next.line &&
      o.start < next.start + next.widthCm &&
      next.start < o.start + o.widthCm
  );
  if (clash) return null;
  return setLevelOpenings(
    flat,
    rooms,
    levelId,
    list.map((o) => (o.id === openingId ? next : o))
  );
}

export function setSpaceMeta(flat, rooms, spaceId, { name, kind }) {
  const space = flat.spaces.find((s) => s.id === spaceId);
  if (!space) return null;
  const nextName = name === undefined ? space.name : String(name).trim().slice(0, 60) || space.name;
  const nextKind = kind && SPACE_KINDS[kind] ? kind : space.kind;
  const updated = { ...space, name: nextName, kind: nextKind };
  const nextRooms = { ...rooms };
  if (space.roomId && rooms[space.roomId])
    nextRooms[space.roomId] = { ...rooms[space.roomId], name: nextName, kind: nextKind };
  return {
    flat: { ...flat, spaces: flat.spaces.map((s) => (s.id === spaceId ? updated : s)) },
    rooms: nextRooms,
    removedRoomIds: [],
  };
}

/** Replaces a rectangular room's furniture with the defaults for its kind. */
export function furnishSpace(flat, rooms, spaceId) {
  const space = flat.spaces.find((s) => s.id === spaceId);
  const room = space && space.roomId ? rooms[space.roomId] : null;
  if (!space || !space.furnishable || !room) return null;
  const furnished = furnishRoomRecord({ ...room, placedFurniture: [] }, space.kind);
  return { flat, rooms: { ...rooms, [room.id]: furnished }, removedRoomIds: [] };
}

/**
 * Folds door and window edits made in the room designer back into the wall openings
 * of that room, then re-derives every room record from the walls.
 */
export function syncRoomToFlat(flat, rooms, spaceId, editedRoom) {
  const space = flat.spaces.find((s) => s.id === spaceId);
  if (!space || !space.furnishable) return { flat, rooms, removedRoomIds: [] };
  const rect = { x: space.x, y: space.y, widthCm: space.widthCm, depthCm: space.depthCm };
  const openings = openingsOf(flat, space.levelId);
  const edges = levelEdges(flat, space.levelId);
  const onBoundary = new Set(boundaryOpenings(openings, rect).map(({ op }) => op.id));
  const fromRoom = [
    ...(editedRoom.doors || []).map((d) => openingFromRoomItem(d, 'door', rect)),
    ...(editedRoom.windows || []).map((w) => openingFromRoomItem(w, 'window', rect)),
  ].filter((op) => openingFitsWalls(edges, op));
  const kept = openings.filter((o) => !onBoundary.has(o.id));
  const merged = [...kept];
  for (const op of fromRoom) {
    const clash = merged.some(
      (o) =>
        o.axis === op.axis &&
        o.line === op.line &&
        o.start < op.start + op.widthCm &&
        op.start < o.start + o.widthCm
    );
    if (!clash) merged.push(op);
  }
  const nextRooms = { ...rooms, [editedRoom.id]: { ...rooms[editedRoom.id], ...editedRoom } };
  return reconcile({ ...flat, openings: { ...flat.openings, [space.levelId]: merged } }, nextRooms);
}

// ---------- stairs ----------

/** Plain-language warnings for a staircase placed on a level. */
export function stairWarnings(flat, stair) {
  const warnings = [];
  const rect = stairRect(stair);
  const edges = levelEdges(flat, stair.levelId);
  if (edges.size > 0) {
    if (wallsCrossRect(edges, rect))
      warnings.push('This staircase runs through a wall. Move it or open the wall.');
    const analysis = analyzeLevel(flat, stair.levelId);
    const inside = analysis.regions.some(
      (r) =>
        rect.x < r.x + r.widthCm &&
        r.x < rect.x + rect.widthCm &&
        rect.y < r.y + r.depthCm &&
        r.y < rect.y + rect.depthCm
    );
    if (!inside) warnings.push('This staircase is outside every room.');
  }
  return warnings;
}

// ---------- migration ----------

/**
 * Flats saved before walls existed hold rectangles. Each rectangle becomes its four
 * walls (shared sides merge) and its room record keeps its doors and windows.
 */
export function migrateFlat(flat, rooms = {}) {
  if (flat.walls && flat.version >= FLAT_VERSION)
    return { flat, rooms, removedRoomIds: [], migrated: false };
  const snap = (v) => Math.round(v / CELL) * CELL;
  const walls = {};
  const openings = {};
  for (const level of flat.levels) {
    let edges = new Set();
    const ops = [];
    for (const s of (flat.spaces || []).filter((sp) => sp.levelId === level.id)) {
      const x0 = snap(s.x);
      const y0 = snap(s.y);
      const x1 = x0 + Math.max(CELL, snap(s.widthCm));
      const y1 = y0 + Math.max(CELL, snap(s.depthCm));
      edges = addSegment(edges, x0, y0, x1, y0);
      edges = addSegment(edges, x0, y1, x1, y1);
      edges = addSegment(edges, x0, y0, x0, y1);
      edges = addSegment(edges, x1, y0, x1, y1);
      const room = rooms[s.roomId];
      if (!room) continue;
      const rect = { x: x0, y: y0, widthCm: x1 - x0, depthCm: y1 - y0 };
      for (const [list, type] of [
        [room.doors, 'door'],
        [room.windows, 'window'],
      ]) {
        for (const item of list || []) {
          const op = openingFromRoomItem(item, type, rect);
          const clash = ops.some(
            (o) =>
              o.axis === op.axis &&
              o.line === op.line &&
              o.start < op.start + op.widthCm &&
              op.start < o.start + o.widthCm
          );
          if (!clash) ops.push(op);
        }
      }
    }
    walls[level.id] = edgesToRuns(edges);
    openings[level.id] = pruneOpenings(ops, edges);
  }
  const upgraded = {
    ...flat,
    version: FLAT_VERSION,
    walls,
    openings,
    roomCounter: (flat.spaces || []).length,
    spaces: (flat.spaces || []).map((s) => ({ ...s })),
    stairs: flat.stairs || [],
  };
  return { ...reconcile(upgraded, rooms), migrated: true };
}
