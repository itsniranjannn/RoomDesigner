import { describe, it, expect } from 'vitest';
import { createFlat } from './flat.js';
import { addWall, levelEdges, openingsOf, analyzeLevel } from './flatPlan.js';
import {
  placePassage,
  editPassage,
  rotatePassage,
  previewPassage,
  passageRect,
  passageOrigin,
  passageDims,
  clampPassageSize,
  snapPassageToWalls,
  rectBoundaryEdges,
  PASSAGE_DEFAULTS,
} from './flatPassage.js';
import { edgesToRuns, wallBoxes, skirtingBoxes, SKIRTING_HEIGHT_CM } from './flatWalls.js';

const start = () => {
  const flat = createFlat('T');
  return { flat, rooms: {}, levelId: flat.levels[0].id };
};

/** A closed rectangular room built wall by wall. */
function withRoom(x, y, w, d) {
  let { flat, rooms, levelId } = start();
  for (const [a, b, c, e] of [
    [x, y, x + w, y],
    [x + w, y, x + w, y + d],
    [x + w, y + d, x, y + d],
    [x, y + d, x, y],
  ]) {
    ({ flat, rooms } = addWall(flat, rooms, levelId, a, b, c, e));
  }
  return { flat, rooms, levelId };
}

const passages = (flat) => flat.spaces.filter((s) => s.kind === 'passage');
const wallCount = (flat, levelId) => levelEdges(flat, levelId).size;

describe('passage sizing', () => {
  it('snaps to the 10 cm grid and stays inside the limits', () => {
    expect(clampPassageSize({ lengthCm: 304, widthCm: 123 })).toEqual({
      lengthCm: 300,
      widthCm: 120,
    });
    expect(clampPassageSize({ lengthCm: 5000, widthCm: 10 })).toEqual({
      lengthCm: 1500,
      widthCm: 80,
    });
    expect(clampPassageSize({ lengthCm: 'x', widthCm: 900 })).toEqual({
      lengthCm: PASSAGE_DEFAULTS.lengthCm,
      widthCm: 250,
    });
  });

  it('swaps the footprint for the vertical headings', () => {
    const dims = { lengthCm: 300, widthCm: 120 };
    expect(passageRect({ x: 0, y: 0, ...dims, heading: 0 })).toMatchObject({
      widthCm: 300,
      depthCm: 120,
    });
    expect(passageRect({ x: 0, y: 0, ...dims, heading: 90 })).toMatchObject({
      widthCm: 120,
      depthCm: 300,
    });
    expect(passageRect({ x: 0, y: 0, ...dims, heading: 180 })).toMatchObject({ widthCm: 300 });
    expect(passageRect({ x: 0, y: 0, ...dims, heading: 270 })).toMatchObject({ depthCm: 300 });
  });

  it('centres the footprint on the cursor', () => {
    expect(passageOrigin(500, 500, { ...dims(), heading: 0 })).toEqual({ x: 350, y: 440 });
    expect(passageOrigin(500, 500, { ...dims(), heading: 90 })).toEqual({ x: 440, y: 350 });
  });
});

function dims() {
  return { lengthCm: 300, widthCm: 120 };
}

describe('placing a passage', () => {
  it.each([0, 90, 180, 270])('places a free-standing passage at heading %i', (heading) => {
    const { flat, rooms, levelId } = start();
    const res = placePassage(flat, rooms, levelId, { x: 200, y: 200, ...dims(), heading });
    expect(res.error).toBeUndefined();
    const horizontal = heading % 180 === 0;
    const space = passages(res.flat)[0];
    expect(space).toMatchObject({
      kind: 'passage',
      name: 'Passage 1',
      heading,
      x: 200,
      y: 200,
      widthCm: horizontal ? 300 : 120,
      depthCm: horizontal ? 120 : 300,
      rect: true,
      furnishable: true,
    });
    expect(res.rooms[space.roomId]).toMatchObject({ kind: 'passage', name: 'Passage 1' });
    expect(res.connected).toBe(false);
    // four straight walls: 2 x (length + width) in 10 cm pieces
    expect(wallCount(res.flat, levelId)).toBe(((300 + 120) * 2) / 10);
    expect(edgesToRuns(levelEdges(res.flat, levelId))).toHaveLength(4);
  });

  it('numbers passages and keeps the room counter unchanged', () => {
    let s = start();
    let r = placePassage(s.flat, s.rooms, s.levelId, { x: 0, y: 0, ...dims() });
    r = placePassage(r.flat, r.rooms, s.levelId, { x: 0, y: 300, ...dims(), heading: 90 });
    expect(passages(r.flat).map((p) => p.name)).toEqual(['Passage 1', 'Passage 2']);
    expect(r.flat.roomCounter).toBe(0);
  });

  it('merges with walls that already exist, without duplicate or overlapping runs', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    // passage to the right of the room, sharing its right wall
    const res = placePassage(flat, rooms, levelId, {
      x: 400,
      y: 0,
      lengthCm: 300,
      widthCm: 120,
      heading: 90,
    });
    expect(res.error).toBeUndefined();
    expect(res.flat.spaces).toHaveLength(2);
    // shared wall counted once: room 14*... edges + passage edges minus the 30 shared units
    const roomEdges = ((400 + 300) * 2) / 10;
    const passageEdges = ((120 + 300) * 2) / 10;
    expect(wallCount(res.flat, levelId)).toBe(roomEdges + passageEdges - 30);
    // no two runs lie on the same line and touch or overlap
    const runs = res.flat.walls[levelId];
    for (let a = 0; a < runs.length; a++)
      for (let b = a + 1; b < runs.length; b++) {
        const p = runs[a];
        const q = runs[b];
        const sameLine =
          p.x1 === p.x2 ? q.x1 === q.x2 && q.x1 === p.x1 : q.y1 === q.y2 && q.y1 === p.y1;
        if (!sameLine) continue;
        const overlap = p.x1 === p.x2 ? p.y1 <= q.y2 && q.y1 <= p.y2 : p.x1 <= q.x2 && q.x1 <= p.x2;
        expect(overlap).toBe(false);
      }
    // the room kept its identity
    expect(res.flat.spaces.some((s) => s.id === flat.spaces[0].id)).toBe(true);
  });

  it('adds a door on the wall it shares so the passage connects', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const res = placePassage(flat, rooms, levelId, {
      x: 400,
      y: 0,
      lengthCm: 300,
      widthCm: 120,
      heading: 90,
    });
    expect(res.connected).toBe(true);
    const doors = openingsOf(res.flat, levelId);
    expect(doors).toHaveLength(1);
    expect(doors[0]).toMatchObject({ type: 'door', axis: 'v', line: 400, widthCm: 90 });
    // centred on the 300 cm of shared wall
    expect(doors[0].start).toBe(110);
    const room = res.rooms[res.flat.spaces.find((s) => s.id === flat.spaces[0].id).roomId];
    expect(room.doors).toHaveLength(1);
  });

  it('can skip the door', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const res = placePassage(flat, rooms, levelId, {
      x: 0,
      y: 300,
      ...dims(),
      connect: false,
    });
    expect(res.connected).toBe(false);
    expect(openingsOf(res.flat, levelId)).toHaveLength(0);
  });

  it('attaches below a room with a door in the shared wall', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const res = placePassage(flat, rooms, levelId, { x: 0, y: 300, ...dims(), heading: 0 });
    expect(res.connected).toBe(true);
    expect(openingsOf(res.flat, levelId)[0]).toMatchObject({ axis: 'h', line: 300 });
  });

  it('refuses to overlap a room, cut through a wall, or leave the plan', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const over = placePassage(flat, rooms, levelId, { x: 100, y: 100, ...dims() });
    expect(over.error).toMatch(/overlaps a room/);
    const inside = placePassage(flat, rooms, levelId, {
      x: 100,
      y: 100,
      lengthCm: 100,
      widthCm: 80,
    });
    expect(inside.error).toBeTruthy();
    const left = placePassage(flat, rooms, levelId, { x: -100, y: 0, ...dims() });
    expect(left.error).toMatch(/leave the plan/);
    const far = placePassage(flat, rooms, levelId, { x: 3900, y: 0, ...dims() });
    expect(far.error).toMatch(/leave the plan/);
    // a stray wall inside the footprint is a clash too
    const stray = start();
    const wall = addWall(stray.flat, stray.rooms, stray.levelId, 300, 0, 300, 400);
    const clash = placePassage(wall.flat, wall.rooms, stray.levelId, { x: 200, y: 100, ...dims() });
    expect(clash.error).toMatch(/wall runs through/);
  });

  it('previews validity for the ghost', () => {
    const { flat, levelId } = withRoom(0, 0, 400, 300);
    expect(previewPassage(flat, levelId, { x: 400, y: 0, ...dims(), heading: 90 }).valid).toBe(
      true
    );
    const bad = previewPassage(flat, levelId, { x: 100, y: 100, ...dims() });
    expect(bad.valid).toBe(false);
    expect(bad.reason).toBeTruthy();
  });

  it('is detected as a single room by the wall analysis', () => {
    const { flat, rooms, levelId } = start();
    const res = placePassage(flat, rooms, levelId, { x: 0, y: 0, ...dims(), heading: 90 });
    const a = analyzeLevel(res.flat, levelId);
    expect(a.regions).toHaveLength(1);
    expect(a.regions[0]).toMatchObject({ widthCm: 120, depthCm: 300, rect: true });
  });
});

describe('snapping to walls', () => {
  it('pulls a footprint flush against a nearby wall', () => {
    const { flat, levelId } = withRoom(0, 0, 400, 300);
    const runs = flat.walls[levelId];
    const rect = passageRect({ x: 410, y: 20, lengthCm: 300, widthCm: 120, heading: 90 });
    expect(snapPassageToWalls(runs, rect)).toEqual({ dx: -10, dy: 0 });
    const far = passageRect({ x: 600, y: 600, ...dims(), heading: 0 });
    expect(snapPassageToWalls(runs, far)).toEqual({ dx: 0, dy: 0 });
  });
});

describe('editing and rotating a passage', () => {
  const place = (extra = {}) => {
    const { flat, rooms, levelId } = start();
    const res = placePassage(flat, rooms, levelId, { x: 200, y: 200, ...dims(), ...extra });
    return { ...res, levelId, id: passages(res.flat)[0].id };
  };

  it('changes length and width keeping the top-left corner', () => {
    const p = place();
    const longer = editPassage(p.flat, p.rooms, p.id, { lengthCm: 500, widthCm: 150 });
    expect(longer.error).toBeUndefined();
    expect(passages(longer.flat)).toHaveLength(1);
    expect(passages(longer.flat)[0]).toMatchObject({
      x: 200,
      y: 200,
      widthCm: 500,
      depthCm: 150,
      name: 'Passage 1',
      kind: 'passage',
    });
    expect(wallCount(longer.flat, p.levelId)).toBe(((500 + 150) * 2) / 10);
    expect(edgesToRuns(levelEdges(longer.flat, p.levelId))).toHaveLength(4);
    // old room record removed, new one present
    expect(Object.keys(longer.rooms)).toHaveLength(1);
  });

  it('rotates a quarter turn about its centre, through all four headings', () => {
    let p = place();
    let { flat, rooms } = p;
    const seen = [];
    for (let n = 1; n <= 4; n++) {
      const res = rotatePassage(flat, rooms, passages(flat)[0].id);
      expect(res.error).toBeUndefined();
      ({ flat, rooms } = res);
      const s = passages(flat)[0];
      seen.push([s.heading, s.widthCm, s.depthCm, s.x, s.y]);
      // the centre never moves
      expect(s.x + s.widthCm / 2).toBe(350);
      expect(s.y + s.depthCm / 2).toBe(260);
      expect(wallCount(flat, p.levelId)).toBe(((300 + 120) * 2) / 10);
      expect(flat.spaces).toHaveLength(1);
    }
    expect(seen).toEqual([
      [90, 120, 300, 290, 110],
      [180, 300, 120, 200, 200],
      [270, 120, 300, 290, 110],
      [0, 300, 120, 200, 200],
    ]);
  });

  it('keeps the name, kind and furniture of a rotated passage', () => {
    const p = place();
    const roomId = passages(p.flat)[0].roomId;
    const rooms = {
      ...p.rooms,
      [roomId]: {
        ...p.rooms[roomId],
        placedFurniture: [{ id: 'f1', typeId: 'shoe-rack', x: 30, y: 20, rotationDeg: 0 }],
      },
    };
    const res = rotatePassage(p.flat, rooms, p.id);
    const space = passages(res.flat)[0];
    expect(space.name).toBe('Passage 1');
    const room = res.rooms[space.roomId];
    // (30, 20) in a 300 x 120 room becomes (100, 30) in the turned 120 x 300 room
    expect(room.placedFurniture[0]).toMatchObject({ x: 100, y: 30, rotationDeg: 90 });
  });

  it('refuses a rotation that would collide with a neighbour', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const stray = addWall(flat, rooms, levelId, 520, 150, 560, 150);
    const placed = placePassage(stray.flat, stray.rooms, levelId, {
      x: 400,
      y: 200,
      lengthCm: 300,
      widthCm: 100,
      heading: 0,
    });
    expect(placed.error).toBeUndefined();
    const id = passages(placed.flat)[0].id;
    // turning about the centre sweeps the passage across the free-standing wall
    const res = rotatePassage(placed.flat, placed.rooms, id);
    expect(res.error).toMatch(/wall runs through/);
    expect(res.error).toMatch(/left as it is/);
    // and the flat is left exactly as it was
    expect(passages(placed.flat)[0]).toMatchObject({ widthCm: 300, depthCm: 100, heading: 0 });
  });

  it('refuses a rotation or resize that leaves the plan', () => {
    const p = place();
    const near = placePassage(start().flat, {}, start().levelId, { x: 0, y: 0, ...dims() });
    const id = passages(near.flat)[0].id;
    expect(rotatePassage(near.flat, near.rooms, id).error).toMatch(/leave the plan/);
    expect(editPassage(p.flat, p.rooms, p.id, { lengthCm: 1500 }).error).toBeUndefined();
  });

  it('refuses a resize that runs into another room', () => {
    const { flat, rooms, levelId } = withRoom(500, 0, 300, 300);
    const placed = placePassage(flat, rooms, levelId, { x: 0, y: 0, ...dims() });
    const id = passages(placed.flat)[0].id;
    expect(editPassage(placed.flat, placed.rooms, id, { lengthCm: 800 }).error).toMatch(/overlap another room/);
    // stopping at the room's wall is fine
    const ok = editPassage(placed.flat, placed.rooms, id, { lengthCm: 500 });
    expect(ok.error).toBeUndefined();
    expect(ok.flat.spaces).toHaveLength(2);
  });

  it('keeps walls shared with a neighbouring room when the passage moves away', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const placed = placePassage(flat, rooms, levelId, {
      x: 400,
      y: 0,
      lengthCm: 300,
      widthCm: 120,
      heading: 90,
    });
    const id = passages(placed.flat)[0].id;
    // the passage shrinks to 100 cm: the room's right wall must survive intact
    const res = editPassage(placed.flat, placed.rooms, id, { lengthCm: 100 });
    expect(res.error).toBeUndefined();
    const roomSpace = res.flat.spaces.find((s) => s.kind !== 'passage');
    expect(roomSpace).toMatchObject({ widthCm: 400, depthCm: 300 });
    expect(res.flat.spaces).toHaveLength(2);
  });

  it('turns by 180 degrees without touching the walls', () => {
    const p = place();
    const res = editPassage(p.flat, p.rooms, p.id, { turns: 2 });
    expect(passages(res.flat)[0]).toMatchObject({ heading: 180, x: 200, y: 200, widthCm: 300 });
    expect(res.flat.walls).toBe(p.flat.walls);
  });

  it('rejects other kinds of room', () => {
    const { flat, rooms } = withRoom(0, 0, 400, 300);
    expect(editPassage(flat, rooms, flat.spaces[0].id, { turns: 1 }).error).toBeTruthy();
    expect(editPassage(flat, rooms, 'nope', {}).error).toBeTruthy();
  });

  it('reads a heading from the shape of a passage that has none', () => {
    expect(passageDims({ widthCm: 100, depthCm: 400 })).toMatchObject({
      heading: 90,
      lengthCm: 400,
      widthCm: 100,
    });
    expect(rectBoundaryEdges({ x: 0, y: 0, widthCm: 20, depthCm: 10 })).toHaveLength(6);
  });
});

describe('skirting in the 3D view', () => {
  it('runs along the foot of every solid wall piece and leaves doors clear', () => {
    const { flat, rooms, levelId } = withRoom(0, 0, 400, 300);
    const res = placePassage(flat, rooms, levelId, {
      x: 400,
      y: 0,
      ...dims(),
      heading: 90,
    });
    const edges = levelEdges(res.flat, levelId);
    const analysis = analyzeLevel(res.flat, levelId);
    const walls = wallBoxes(edges, analysis.isExteriorEdge, openingsOf(res.flat, levelId));
    const skirting = skirtingBoxes(walls);
    expect(skirting.length).toBeGreaterThan(0);
    for (const s of skirting) {
      expect(s.z0).toBe(0);
      expect(s.z1).toBeLessThanOrEqual(SKIRTING_HEIGHT_CM);
    }
    // the shared wall has a door (90 cm), so its skirting covers less than the full 300 cm
    const door = openingsOf(res.flat, levelId)[0];
    const over = skirting.filter(
      (s) => s.axis === 'v' && s.line === 400 && s.a < door.start + door.widthCm && s.b > door.start
    );
    expect(over).toHaveLength(0);
  });
});
