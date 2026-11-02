import { describe, it, expect } from 'vitest';
import {
  runsToEdges,
  edgesToRuns,
  addSegment,
  wallRunAt,
  analyzeEdges,
  hitTestEdge,
  planOpening,
  openingFitsWalls,
  wallBoxes,
  wallsCrossRect,
  regionRects,
  analyzeRuns,
  orthoEnd,
  edgeKey,
} from './flatWalls.js';
import {
  reconcile,
  addWall,
  eraseWallRun,
  addOpening,
  removeOpening,
  setSpaceMeta,
  furnishSpace,
  migrateFlat,
  syncRoomToFlat,
  stairWarnings,
  analyzeLevel,
  levelEdges,
  openingsOf,
} from './flatPlan.js';
import { buildPresetFlat } from './flatPresets.js';
import { createFlat, createStair, stairGeometry, stairFootprint, SPACE_KINDS, flatSummary } from './flat.js';

const rectEdges = (x, y, w, d) => {
  let e = new Set();
  e = addSegment(e, x, y, x + w, y);
  e = addSegment(e, x, y + d, x + w, y + d);
  e = addSegment(e, x, y, x, y + d);
  e = addSegment(e, x + w, y, x + w, y + d);
  return e;
};
const union = (...sets) => new Set(sets.flatMap((s) => [...s]));
const door = (axis, line, start, widthCm = 90) => ({ id: `d-${axis}${line}-${start}`, type: 'door', axis, line, start, widthCm });

function blank() {
  const flat = createFlat('T');
  return { flat, rooms: {}, levelId: flat.levels[0].id };
}

function withWalls(edges) {
  const { flat, rooms, levelId } = blank();
  const next = reconcile({ ...flat, walls: { [levelId]: edgesToRuns(edges) } }, rooms);
  return { ...next, levelId };
}

describe('wall edges and runs', () => {
  it('round-trips runs and merges collinear pieces', () => {
    const edges = union(addSegment(new Set(), 0, 0, 100, 0), addSegment(new Set(), 100, 0, 300, 0));
    expect(edgesToRuns(edges)).toEqual([{ x1: 0, y1: 0, x2: 300, y2: 0 }]);
    expect(runsToEdges(edgesToRuns(edges)).size).toBe(30);
  });

  it('snaps drawn walls to the grid and the dominant axis', () => {
    const e = addSegment(new Set(), 3, 4, 207, 38);
    expect(edgesToRuns(e)).toEqual([{ x1: 0, y1: 0, x2: 210, y2: 0 }]);
    expect(orthoEnd(0, 0, 40, 200)).toEqual({ x: 0, y: 200 });
  });

  it('wallRunAt stops at junctions and corners', () => {
    // A box with a partition: the partition meets the top and bottom walls at T-junctions
    const edges = union(rectEdges(0, 0, 400, 300), addSegment(new Set(), 200, 0, 200, 300));
    const top = wallRunAt(edges, edgeKey('h', 5, 0));
    expect(top).toHaveLength(20); // 0..200 only
    const partition = wallRunAt(edges, edgeKey('v', 20, 10));
    expect(partition).toHaveLength(30);
    const side = wallRunAt(edges, edgeKey('v', 0, 10));
    expect(side).toHaveLength(30);
  });

  it('hit tests the nearest edge', () => {
    const edges = rectEdges(0, 0, 200, 200);
    expect(hitTestEdge(edges, 105, 4)).toBe(edgeKey('h', 10, 0));
    expect(hitTestEdge(edges, 100, 100)).toBeNull();
  });
});

describe('region detection', () => {
  it('finds one rectangular room and marks the outside', () => {
    const a = analyzeEdges(rectEdges(0, 0, 400, 300));
    expect(a.regions).toHaveLength(1);
    const r = a.regions[0];
    expect(r).toMatchObject({ x: 0, y: 0, widthCm: 400, depthCm: 300, rect: true, areaCm2: 400 * 300 });
    expect(a.labelAt(5, 5)).toBe(0);
    expect(a.labelAt(-3, 5)).toBe(-1);
  });

  it('ignores dangling walls and open boxes', () => {
    const open = rectEdges(0, 0, 400, 300);
    open.delete(edgeKey('h', 10, 0));
    expect(analyzeEdges(open).regions).toHaveLength(0);
    const dangling = union(rectEdges(0, 0, 400, 300), addSegment(new Set(), 200, 0, 200, 150));
    expect(analyzeEdges(dangling).regions).toHaveLength(1);
  });

  it('detects non-rectangular regions', () => {
    // L-shape
    let e = new Set();
    for (const [x1, y1, x2, y2] of [[0, 0, 300, 0], [300, 0, 300, 100], [300, 100, 100, 100], [100, 100, 100, 300], [100, 300, 0, 300], [0, 300, 0, 0]]) {
      e = addSegment(e, x1, y1, x2, y2);
    }
    const a = analyzeEdges(e);
    expect(a.regions).toHaveLength(1);
    expect(a.regions[0].rect).toBe(false);
    expect(a.regions[0].areaCm2).toBe(300 * 100 + 100 * 200);
    expect(regionRects(a.regions[0]).reduce((n, r) => n + r.widthCm * r.depthCm, 0)).toBe(50000);
  });

  it('doors and windows do not merge rooms', () => {
    const edges = union(rectEdges(0, 0, 400, 300), addSegment(new Set(), 200, 0, 200, 300));
    const { flat, rooms, levelId } = withWalls(edges);
    expect(flat.spaces).toHaveLength(2);
    const withDoor = addOpening(flat, rooms, levelId, door('v', 200, 100));
    expect(withDoor.flat.spaces).toHaveLength(2);
  });

  it('classifies exterior edges', () => {
    const a = analyzeEdges(union(rectEdges(0, 0, 400, 300), addSegment(new Set(), 200, 0, 200, 300)));
    expect(a.isExteriorEdge(edgeKey('h', 5, 0))).toBe(true);
    expect(a.isExteriorEdge(edgeKey('v', 20, 10))).toBe(false);
  });
});

describe('editing walls', () => {
  it('splits a room when a wall is drawn across it and merges when it is erased', () => {
    const { flat, rooms, levelId } = withWalls(rectEdges(0, 0, 600, 400));
    expect(flat.spaces).toHaveLength(1);
    const named = setSpaceMeta(flat, rooms, flat.spaces[0].id, { name: 'Big hall', kind: 'living' });
    const split = addWall(named.flat, named.rooms, levelId, 400, 0, 400, 400);
    expect(split.flat.spaces).toHaveLength(2);
    // the larger half keeps the identity
    const big = split.flat.spaces.find((s) => s.widthCm === 400);
    expect(big.name).toBe('Big hall');
    expect(big.kind).toBe('living');
    expect(big.id).toBe(flat.spaces[0].id);
    expect(big.roomId).toBe(flat.spaces[0].roomId);
    const small = split.flat.spaces.find((s) => s.widthCm === 200);
    expect(small.roomId).not.toBe(big.roomId);
    expect(Object.keys(split.rooms)).toHaveLength(2);

    const key = edgeKey('v', 40, 10);
    const merged = eraseWallRun(split.flat, split.rooms, levelId, key);
    expect(merged.flat.spaces).toHaveLength(1);
    expect(merged.flat.spaces[0].name).toBe('Big hall');
    expect(merged.flat.spaces[0].widthCm).toBe(600);
    expect(merged.removedRoomIds).toContain(small.roomId);
    expect(Object.keys(merged.rooms)).toHaveLength(1);
    const room = merged.rooms[merged.flat.spaces[0].roomId];
    expect(room.widthCm).toBe(600);
  });

  it('erases only the run between two junctions', () => {
    const edges = union(rectEdges(0, 0, 600, 400), addSegment(new Set(), 300, 0, 300, 400), addSegment(new Set(), 0, 200, 300, 200));
    const { flat, rooms, levelId } = withWalls(edges);
    expect(flat.spaces).toHaveLength(3);
    const out = eraseWallRun(flat, rooms, levelId, edgeKey('h', 10, 20));
    expect(out.flat.spaces).toHaveLength(2);
    // the central partition is untouched
    expect(levelEdges(out.flat, levelId).has(edgeKey('v', 30, 5))).toBe(true);
  });

  it('removes openings with their wall', () => {
    const edges = union(rectEdges(0, 0, 600, 400), addSegment(new Set(), 300, 0, 300, 400));
    const { flat, rooms, levelId } = withWalls(edges);
    const a = addOpening(flat, rooms, levelId, door('v', 300, 100));
    const b = addOpening(a.flat, a.rooms, levelId, { id: 'w1', type: 'window', axis: 'h', line: 0, start: 100, widthCm: 120 });
    expect(openingsOf(b.flat, levelId)).toHaveLength(2);
    const c = eraseWallRun(b.flat, b.rooms, levelId, edgeKey('v', 30, 10));
    expect(openingsOf(c.flat, levelId).map((o) => o.id)).toEqual(['w1']);
    expect(addOpening(flat, rooms, levelId, door('v', 300, 380))).toBeNull(); // runs off the wall
  });

  it('carries identity across a wall that moves a little', () => {
    const { flat, rooms, levelId } = withWalls(rectEdges(0, 0, 400, 400));
    const named = setSpaceMeta(flat, rooms, flat.spaces[0].id, { name: 'Study', kind: 'bedroom' });
    // Extend the room east by 100 cm
    const bigger = reconcile(
      { ...named.flat, walls: { ...named.flat.walls, [levelId]: edgesToRuns(rectEdges(0, 0, 500, 400)) } },
      named.rooms
    );
    expect(bigger.flat.spaces).toHaveLength(1);
    expect(bigger.flat.spaces[0]).toMatchObject({ id: flat.spaces[0].id, name: 'Study', roomId: flat.spaces[0].roomId, widthCm: 500 });
    expect(bigger.rooms[flat.spaces[0].roomId].widthCm).toBe(500);
  });

  it('keeps non-rectangular rooms named but not furnishable, and never crashes', () => {
    const l = new Set();
    for (const [x1, y1, x2, y2] of [[0, 0, 300, 0], [300, 0, 300, 100], [300, 100, 100, 100], [100, 100, 100, 300], [100, 300, 0, 300], [0, 300, 0, 0]]) {
      for (const k of addSegment(new Set(), x1, y1, x2, y2)) l.add(k);
    }
    const { flat, rooms } = withWalls(l);
    expect(flat.spaces[0].furnishable).toBe(false);
    expect(flat.spaces[0].roomId).toBeNull();
    expect(furnishSpace(flat, rooms, flat.spaces[0].id)).toBeNull();
  });

  it('derives room doors and windows from boundary openings', () => {
    const { flat, rooms, levelId } = withWalls(rectEdges(0, 100, 400, 300));
    const a = addOpening(flat, rooms, levelId, door('h', 400, 50));
    const b = addOpening(a.flat, a.rooms, levelId, { id: 'w', type: 'window', axis: 'v', line: 400, start: 150, widthCm: 120 });
    const room = b.rooms[b.flat.spaces[0].roomId];
    expect(room.doors).toEqual([{ id: 'd-h400-50', wall: 'bottom', offsetCm: 50, widthCm: 90, swingDirection: 'inward-left' }]);
    expect(room.windows).toEqual([{ id: 'w', wall: 'right', offsetCm: 50, widthCm: 120 }]);
  });

  it('syncs door edits made in the room designer back to the walls', () => {
    const { flat, rooms, levelId } = withWalls(rectEdges(0, 0, 400, 300));
    const a = addOpening(flat, rooms, levelId, door('h', 300, 50));
    const room = a.rooms[a.flat.spaces[0].roomId];
    const edited = { ...room, doors: [{ ...room.doors[0], offsetCm: 200 }] };
    const synced = syncRoomToFlat(a.flat, a.rooms, a.flat.spaces[0].id, edited);
    expect(openingsOf(synced.flat, levelId)[0].start).toBe(200);
    expect(synced.rooms[room.id].doors[0].offsetCm).toBe(200);
    const removed = syncRoomToFlat(a.flat, a.rooms, a.flat.spaces[0].id, { ...room, doors: [] });
    expect(openingsOf(removed.flat, levelId)).toHaveLength(0);
  });

  it('removes a door by id and plans door placement on a wall', () => {
    const { flat, rooms, levelId } = withWalls(rectEdges(0, 0, 400, 300));
    const plan = planOpening(levelEdges(flat, levelId), [], { type: 'door', x: 200, y: 3, widthCm: 90 });
    expect(plan.valid).toBe(true);
    expect(plan.op).toMatchObject({ axis: 'h', line: 0, start: 160 });
    expect(openingFitsWalls(levelEdges(flat, levelId), plan.op)).toBe(true);
    const placed = addOpening(flat, rooms, levelId, { ...plan.op, id: 'p1' });
    const second = planOpening(levelEdges(flat, levelId), openingsOf(placed.flat, levelId), { type: 'window', x: 200, y: 0, widthCm: 120 });
    expect(second.valid).toBe(false);
    expect(openingsOf(removeOpening(placed.flat, placed.rooms, levelId, 'p1').flat, levelId)).toHaveLength(0);
    expect(planOpening(levelEdges(flat, levelId), [], { type: 'door', x: 200, y: 150, widthCm: 90 })).toBeNull();
  });

  it('cuts door and window gaps in 3D wall boxes', () => {
    const edges = rectEdges(0, 0, 400, 300);
    const a = analyzeEdges(edges);
    const solid = wallBoxes(edges, a.isExteriorEdge, []).filter((b) => !b.glass);
    const holed = wallBoxes(edges, a.isExteriorEdge, [door('h', 0, 100), { id: 'w', type: 'window', axis: 'h', line: 300, start: 100, widthCm: 120 }]);
    expect(holed.length).toBeGreaterThan(solid.length);
    expect(holed.some((b) => b.glass)).toBe(true);
    // nothing solid fills the door gap below the lintel
    expect(holed.some((b) => b.axis === 'h' && b.line === 0 && b.a < 150 && b.b > 120 && b.z0 === 0)).toBe(false);
  });
});

describe('migration', () => {
  it('turns old rectangle spaces into walls and keeps rooms, doors and names', () => {
    const levelId = 'lvl-0';
    const old = {
      id: 'flat-old',
      name: 'Old flat',
      floorHeightCm: 280,
      levels: [{ id: levelId, name: 'Ground floor' }],
      spaces: [
        { id: 's1', kind: 'living', levelId, roomId: 'r1', name: 'Lounge', x: 0, y: 0, widthCm: 400, depthCm: 300 },
        { id: 's2', kind: 'bedroom', levelId, roomId: 'r2', name: 'Sleep', x: 400, y: 0, widthCm: 300, depthCm: 300 },
      ],
      stairs: [{ id: 'st', levelId, type: 'straight', widthCm: 100, rotationDeg: 0, riseCm: 280, x: 20, y: 20 }],
    };
    const rooms = {
      r1: { id: 'r1', flatId: 'flat-old', spaceId: 's1', name: 'Lounge', kind: 'living', widthCm: 400, depthCm: 300, doors: [{ id: 'dA', wall: 'right', offsetCm: 100, widthCm: 90 }], windows: [], placedFurniture: [{ id: 'f1', furnitureTypeId: 'sofa-3seat', x: 100, y: 100, rotationDeg: 0 }] },
      r2: { id: 'r2', flatId: 'flat-old', spaceId: 's2', name: 'Sleep', kind: 'bedroom', widthCm: 300, depthCm: 300, doors: [], windows: [{ id: 'wA', wall: 'top', offsetCm: 90, widthCm: 120 }], placedFurniture: [] },
    };
    const out = migrateFlat(old, rooms);
    expect(out.migrated).toBe(true);
    const f = out.flat;
    expect(f.version).toBe(2);
    expect(f.spaces).toHaveLength(2);
    expect(f.spaces.find((s) => s.id === 's1')).toMatchObject({ name: 'Lounge', roomId: 'r1', kind: 'living', widthCm: 400, depthCm: 300 });
    expect(f.spaces.find((s) => s.id === 's2')).toMatchObject({ name: 'Sleep', roomId: 'r2' });
    // the shared side is a single wall
    expect(levelEdges(f, levelId).size).toBe(230);
    expect(openingsOf(f, levelId).map((o) => o.type).sort()).toEqual(['door', 'window']);
    expect(out.rooms.r1.doors).toHaveLength(1);
    expect(out.rooms.r1.placedFurniture).toHaveLength(1);
    expect(out.rooms.r2.windows).toHaveLength(1);
    expect(f.stairs).toHaveLength(1);
    expect(migrateFlat(f, out.rooms).migrated).toBe(false);
  });
});

describe('presets', () => {
  const kinds = (flat) => flat.spaces.map((s) => s.kind);
  const count = (flat, k) => kinds(flat).filter((x) => x === k).length;

  /** Breadth-first walk from outside through doors; returns the set of reached space ids. */
  function reachable(flat, levelId) {
    const analysis = analyzeLevel(flat, levelId);
    const edgesToSpace = new Map(flat.spaces.map((s) => [s.x + ',' + s.y, s.id]));
    const spaceOf = (i, j) => {
      const idx = analysis.labelAt(i, j);
      if (idx < 0) return null;
      const r = analysis.regions[idx];
      return edgesToSpace.get(r.x + ',' + r.y);
    };
    const adj = new Map();
    const link = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    };
    for (const op of openingsOf(flat, levelId).filter((o) => o.type === 'door')) {
      const mid = Math.floor((op.start + op.widthCm / 2) / 10);
      const line = op.line / 10;
      const [a, b] = op.axis === 'h' ? [spaceOf(mid, line - 1), spaceOf(mid, line)] : [spaceOf(line - 1, mid), spaceOf(line, mid)];
      const A = a ?? 'outside';
      const B = b ?? 'outside';
      link(A, B);
      link(B, A);
    }
    const seen = new Set(['outside']);
    const queue = ['outside'];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of adj.get(cur) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return seen;
  }

  it.each(['studio', '1bhk', '2bhk', '3bhk'])('%s has furnished rooms that are all reachable through doors', (preset) => {
    const { flat, rooms } = buildPresetFlat(preset);
    const levelId = flat.levels[0].id;
    expect(flat.spaces.length).toBeGreaterThanOrEqual(3);
    expect(flat.spaces.every((s) => s.rect && s.furnishable && rooms[s.roomId])).toBe(true);
    expect(count(flat, 'living')).toBeGreaterThanOrEqual(1);
    expect(count(flat, 'kitchen')).toBe(1);
    expect(count(flat, 'bathroom')).toBeGreaterThanOrEqual(1);
    const seen = reachable(flat, levelId);
    for (const s of flat.spaces) expect(seen.has(s.id), `${s.name} reachable`).toBe(true);
    for (const op of openingsOf(flat, levelId)) expect(openingFitsWalls(levelEdges(flat, levelId), op)).toBe(true);
    // rooms of furnishable kinds start with furniture, and every room has a door
    for (const s of flat.spaces) {
      const room = rooms[s.roomId];
      expect(room.doors.length, `${s.name} door`).toBeGreaterThanOrEqual(1);
      if (['bedroom', 'kitchen', 'bathroom', 'living'].includes(s.kind)) expect(room.placedFurniture.length, `${s.name} furniture`).toBeGreaterThan(0);
    }
  });

  it('2BHK has hall, kitchen, two bedrooms and bathrooms; 3BHK has three bedrooms', () => {
    const two = buildPresetFlat('2bhk').flat;
    expect(count(two, 'bedroom')).toBe(2);
    expect(count(two, 'bathroom')).toBeGreaterThanOrEqual(1);
    expect(count(two, 'corridor')).toBe(1);
    const three = buildPresetFlat('3bhk').flat;
    expect(count(three, 'bedroom')).toBe(3);
    expect(count(three, 'bathroom')).toBe(2);
    expect(count(buildPresetFlat('1bhk').flat, 'bedroom')).toBe(1);
  });

  it('builds a blank flat and an outer shell by size', () => {
    expect(buildPresetFlat('blank').flat.spaces).toHaveLength(0);
    const { flat } = buildPresetFlat('shell', { widthCm: 800, depthCm: 600 });
    expect(flat.spaces).toHaveLength(1);
    expect(flat.spaces[0]).toMatchObject({ widthCm: 800, depthCm: 600 });
    expect(flatSummary(flat).areaM2).toBe(48);
  });

  it('every kind has a colour and a label', () => {
    for (const def of Object.values(SPACE_KINDS)) expect(def.color).toMatch(/^#/);
  });
});

describe('stairs', () => {
  it('keeps the stair geometry and warns when it crosses a wall', () => {
    const { flat, levelId } = withWalls(rectEdges(0, 0, 600, 400));
    const stair = createStair(flat, { levelId, type: 'U', x: 100, y: 100 });
    expect(stairGeometry(stair).steps).toBeGreaterThan(10);
    expect(stairWarnings(flat, stair)).toHaveLength(0);
    const fp = stairFootprint(stair);
    expect(fp.widthCm).toBeGreaterThan(0);
    expect(stairWarnings(flat, { ...stair, x: 560, y: 100 }).length).toBeGreaterThan(0);
    expect(wallsCrossRect(levelEdges(flat, levelId), { x: 10, y: 10, widthCm: 50, depthCm: 50 })).toBe(false);
  });

  it('analysis is cached per runs array', () => {
    const runs = edgesToRuns(rectEdges(0, 0, 200, 200));
    expect(analyzeRuns(runs)).toBe(analyzeRuns(runs));
  });
});
