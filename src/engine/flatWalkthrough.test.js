import { describe, it, expect } from 'vitest';
import {
  addSegment,
  edgesToRuns,
  wallPieces,
  subtractRect,
  carveHoles,
  analyzeEdges,
  WALL3D_INTERIOR_CM,
} from './flatWalls.js';
import {
  reconcile,
  addOpening,
  levelSolidEdges,
  analyzeLevel,
  openingsOf,
  entranceOf,
  exteriorDoors,
  setEntrance,
} from './flatPlan.js';
import {
  createFlat,
  createStair,
  addLevel,
  stairGeometry,
  stairStepCount,
  stairStepRange,
  stairTreads,
  stairHeightAt,
  stairTopTread,
  stairOpensOn,
  stairTargetIndex,
  normalizeStairs,
} from './flat.js';
import {
  wallObstacles,
  levelObstacles,
  isFlatBlocked,
  flatWalkStart,
  walkSurface,
} from './flatWalk.js';

const rectEdges = (x, y, w, d) => {
  let e = new Set();
  e = addSegment(e, x, y, x + w, y);
  e = addSegment(e, x, y + d, x + w, y + d);
  e = addSegment(e, x, y, x, y + d);
  e = addSegment(e, x + w, y, x + w, y + d);
  return e;
};
const union = (...sets) => new Set(sets.flatMap((s) => [...s]));
const door = (id, axis, line, start, widthCm = 90) => ({
  id,
  type: 'door',
  axis,
  line,
  start,
  widthCm,
});

/** A 600 x 400 flat split into two rooms by a wall at x = 300. */
function twoRoomFlat() {
  const flat0 = createFlat('T');
  const levelId = flat0.levels[0].id;
  const edges = union(rectEdges(0, 0, 600, 400), addSegment(new Set(), 300, 0, 300, 400));
  let r = reconcile({ ...flat0, walls: { [levelId]: edgesToRuns(edges) } }, {});
  r = addOpening(r.flat, r.rooms, levelId, door('front', 'h', 400, 100)); // outer door, bottom wall
  r = addOpening(r.flat, r.rooms, levelId, door('inner', 'v', 300, 150)); // between the rooms
  return { ...r, levelId };
}

describe('3D walls with real openings', () => {
  const edges = rectEdges(0, 0, 400, 300);
  const analysis = analyzeEdges(edges);
  const ops = [
    door('d', 'h', 300, 100),
    { id: 'w', type: 'window', axis: 'h', line: 0, start: 100, widthCm: 120 },
  ];

  it('builds each wall from boxes around an opening, so it is a hole', () => {
    const { boxes } = wallPieces(edges, analysis.isExteriorEdge, ops, {
      outsideCell: analysis.isOutsideCell,
    });
    const bottom = boxes.filter((b) => b.axis === 'h' && b.line === 300 && !b.glass);
    // left of the door, right of the door, and the lintel above it
    expect(bottom.filter((b) => b.z0 === 0).length).toBe(2);
    expect(bottom.some((b) => b.z0 > 0 && b.a <= 100 && b.b >= 190)).toBe(true);
    // nothing solid fills the door below the lintel
    expect(bottom.some((b) => b.z0 === 0 && b.a < 190 && b.b > 100)).toBe(false);
    // window: wall below the sill and above the head, glass between
    const top = boxes.filter((b) => b.axis === 'h' && b.line === 0);
    expect(top.some((b) => b.glass)).toBe(true);
    expect(
      top.some((b) => !b.glass && b.z0 === 0 && b.z1 === 90 && b.a === 100 && b.b === 220)
    ).toBe(true);
    expect(top.some((b) => !b.glass && b.z0 === 205 && b.a === 100 && b.b === 220)).toBe(true);
  });

  it('gives every door and window a fixture to draw the frame, leaf and glazing', () => {
    const { fixtures } = wallPieces(edges, analysis.isExteriorEdge, ops, {
      outsideCell: analysis.isOutsideCell,
    });
    expect(fixtures.map((f) => [f.id, f.type, f.a, f.b])).toEqual(
      expect.arrayContaining([
        ['d', 'door', 100, 190],
        ['w', 'window', 100, 220],
      ])
    );
    const win = fixtures.find((f) => f.id === 'w');
    expect(win).toMatchObject({ sill: 90, z1: 205 });
  });

  it('keeps frames at the low-wall height so the cutaway shows where openings are', () => {
    const { fixtures, boxes } = wallPieces(edges, analysis.isExteriorEdge, ops, {
      fullHeight: false,
      outsideCell: analysis.isOutsideCell,
    });
    expect(fixtures).toHaveLength(2);
    expect(fixtures.every((f) => f.z1 <= 45)).toBe(true);
    // the door is still a gap in the low wall
    expect(boxes.some((b) => b.line === 300 && b.z0 === 0 && b.a < 190 && b.b > 100)).toBe(false);
  });

  it('puts outer walls outside the room outline and thins interior walls', () => {
    const e = union(edges, addSegment(new Set(), 200, 0, 200, 300));
    const a = analyzeEdges(e);
    const { boxes } = wallPieces(e, a.isExteriorEdge, [], { outsideCell: a.isOutsideCell });
    const topWall = boxes.find((b) => b.axis === 'h' && b.line === 0);
    // inner face on the grid line: the room keeps its full rectangle
    expect(topWall.off - topWall.thick / 2).toBe(0 - 0 + topWall.off - topWall.thick / 2);
    expect(topWall.off).toBeLessThan(0);
    expect(topWall.off + topWall.thick / 2).toBeCloseTo(0);
    const bottomWall = boxes.find((b) => b.axis === 'h' && b.line === 300);
    expect(bottomWall.off - bottomWall.thick / 2).toBeCloseTo(0);
    const leftWall = boxes.find((b) => b.axis === 'v' && b.line === 0);
    expect(leftWall.off + leftWall.thick / 2).toBeCloseTo(0);
    const rightWall = boxes.find((b) => b.axis === 'v' && b.line === 400);
    expect(rightWall.off - rightWall.thick / 2).toBeCloseTo(0);
    const partition = boxes.find((b) => b.axis === 'v' && b.line === 200);
    expect(partition.off).toBe(0);
    expect(partition.thick).toBe(WALL3D_INTERIOR_CM);
  });

  it('closes the outer corners', () => {
    const a = analyzeEdges(edges);
    const { boxes } = wallPieces(edges, a.isExteriorEdge, [], { outsideCell: a.isOutsideCell });
    const covers = (px, py) =>
      boxes.some((b) => {
        const lo = b.line + b.off - b.thick / 2;
        const hi = b.line + b.off + b.thick / 2;
        return b.axis === 'h'
          ? px >= b.a && px <= b.b && py >= lo && py <= hi
          : py >= b.a && py <= b.b && px >= lo && px <= hi;
      });
    for (const [x, y] of [
      [-15, -15],
      [415, -15],
      [-15, 315],
      [415, 315],
    ])
      expect(covers(x, y)).toBe(true);
  });
});

describe('floor holes', () => {
  it('cuts a rectangle out of another and tiles what is left', () => {
    const rect = { x: 0, y: 0, widthCm: 400, depthCm: 300 };
    const hole = { x: 100, y: 100, widthCm: 100, depthCm: 100 };
    const parts = subtractRect(rect, hole);
    const area = parts.reduce((n, r) => n + r.widthCm * r.depthCm, 0);
    expect(area).toBe(400 * 300 - 100 * 100);
    expect(
      parts.every(
        (r) => !(r.x < 200 && r.x + r.widthCm > 100 && r.y < 200 && r.y + r.depthCm > 100)
      )
    ).toBe(true);
    expect(subtractRect(rect, { x: 500, y: 0, widthCm: 10, depthCm: 10 })).toEqual([rect]);
    const carved = carveHoles([rect], [hole, { x: 300, y: 0, widthCm: 100, depthCm: 50 }]);
    expect(carved.reduce((n, r) => n + r.widthCm * r.depthCm, 0)).toBe(
      400 * 300 - 100 * 100 - 100 * 50
    );
  });
});

describe('main entrance', () => {
  it('finds outer doors and defaults to the first one', () => {
    const { flat } = twoRoomFlat();
    const doors = exteriorDoors(flat);
    expect(doors.map((d) => d.opening.id)).toEqual(['front']);
    expect(doors[0].inward).toEqual({ dx: 0, dy: -1 }); // the flat is above the bottom wall
    expect(entranceOf(flat)).toMatchObject({ explicit: false, opening: { id: 'front' } });
  });

  it('lets the user choose a door, but only an outer door, and only one', () => {
    const { flat, rooms, levelId } = twoRoomFlat();
    const withSecond = addOpening(flat, rooms, levelId, door('back', 'h', 0, 100));
    const two = withSecond.flat;
    const chosen = setEntrance(two, 'back');
    expect(chosen.flat.entranceId).toBe('back');
    expect(entranceOf(chosen.flat)).toMatchObject({ explicit: true, opening: { id: 'back' } });
    expect(entranceOf(chosen.flat).inward).toEqual({ dx: 0, dy: 1 });
    // choosing another replaces it
    expect(setEntrance(chosen.flat, 'front').flat.entranceId).toBe('front');
    // an inner door and a window are refused with a friendly reason
    expect(setEntrance(two, 'inner').error).toMatch(/outer wall/);
    expect(setEntrance(two, 'nope').error).toMatch(/door/);
    // clearing falls back to the first outer door
    const cleared = setEntrance(chosen.flat, null).flat;
    expect(cleared.entranceId).toBeUndefined();
    expect(entranceOf(cleared).opening.id).toBe('front');
  });

  it('falls back when the chosen door is removed, and works on flats saved without one', () => {
    const { flat, levelId } = twoRoomFlat();
    const stale = { ...flat, entranceId: 'gone' };
    expect(entranceOf(stale).opening.id).toBe('front');
    expect(entranceOf(flat).opening.id).toBe('front');
    expect(entranceOf(createFlat('Empty'))).toBeNull();
    expect(openingsOf(flat, levelId)).toHaveLength(2);
  });
});

describe('walking through the flat', () => {
  it('starts inside the main entrance facing in', () => {
    const { flat, rooms } = twoRoomFlat();
    const start = flatWalkStart(flat, rooms);
    expect(start.entranceId).toBe('front');
    expect(start.x).toBeCloseTo(1.45); // door centre x = 100 + 45
    expect(start.z).toBeCloseTo(3.1); // 90 cm above the bottom wall at y = 400
    // looking along -z (towards the top of the plan)
    expect(Math.sin(start.yaw)).toBeCloseTo(0);
    expect(Math.cos(start.yaw)).toBeCloseTo(1);
    const obstacles = levelObstacles(flat, rooms, start.levelId);
    expect(isFlatBlocked(start.x, start.z, obstacles)).toBe(false);
  });

  it('blocks walls and the outside but not door openings', () => {
    const { flat, rooms, levelId } = twoRoomFlat();
    const ob = levelObstacles(flat, rooms, levelId);
    // through the partition wall at x = 300: blocked beside the door, free in it
    expect(isFlatBlocked(3.0, 0.6, ob)).toBe(true);
    expect(isFlatBlocked(3.0, 1.95, ob)).toBe(false); // door spans y 150..240
    expect(isFlatBlocked(2.6, 1.95, ob)).toBe(false);
    expect(isFlatBlocked(3.4, 1.95, ob)).toBe(false);
    // the outer door: standing in it is fine, stepping outside is not
    expect(isFlatBlocked(1.45, 3.95, ob)).toBe(false);
    expect(isFlatBlocked(1.45, 4.3, ob)).toBe(true);
    // beside the door the outer wall blocks
    expect(isFlatBlocked(0.5, 3.9, ob)).toBe(true);
    expect(wallObstacles(flat, levelId).length).toBeGreaterThan(6);
  });

  it('blocks furniture of every room, in flat coordinates', () => {
    const { flat, rooms } = twoRoomFlat();
    const right = flat.spaces.find((s) => s.x >= 300);
    const room = { ...rooms[right.roomId] };
    // a wardrobe in the middle of the right room, which starts at x = 300
    room.placedFurniture = [
      { id: 'a', furnitureTypeId: 'wardrobe-2door', x: 150, y: 200, rotationDeg: 0 },
    ];
    const ob = levelObstacles(flat, { ...rooms, [room.id]: room }, right.levelId);
    expect(ob.furniture).toHaveLength(1);
    expect(ob.furniture[0].x).toBeCloseTo(4.5); // 300 + 150 cm
    expect(ob.furniture[0].z).toBeCloseTo(2.0);
    expect(isFlatBlocked(4.5, 2.0, ob)).toBe(true);
    expect(isFlatBlocked(1.5, 2.0, ob)).toBe(false);
  });
});

describe('staircases', () => {
  const twoFloors = () => {
    const base = addLevel(createFlat('S'));
    return { flat: base, ground: base.levels[0].id, upper: base.levels[1].id };
  };

  it('lets the user choose width, steps and the floor it climbs to', () => {
    const { flat, ground, upper } = twoFloors();
    const auto = createStair(flat, { levelId: ground, widthCm: 90 });
    expect(auto.widthCm).toBe(90);
    expect(stairTargetIndex(flat, auto)).toBe(1);
    expect(stairStepCount(auto)).toBe(16);
    const steps = createStair(flat, { levelId: ground, toLevelId: upper, steps: 18 });
    expect(stairStepCount(steps)).toBe(18);
    expect(stairGeometry(steps).riserCm).toBeCloseTo(280 / 18);
    // steps are kept within a comfortable range
    const [lo, hi] = stairStepRange(280);
    expect(stairStepCount({ ...steps, steps: 2 })).toBe(lo);
    expect(stairStepCount({ ...steps, steps: 99 })).toBe(hi);
  });

  it('spans several floors and cuts a hole in each floor it reaches', () => {
    let flat = addLevel(addLevel(createFlat('S')));
    const [g, f1, f2] = flat.levels.map((l) => l.id);
    const stair = createStair(flat, { levelId: g, toLevelId: f2 });
    expect(stair.riseCm).toBe(560);
    flat = { ...flat, stairs: [stair] };
    expect(stairOpensOn(flat, stair, g)).toBe(false);
    expect(stairOpensOn(flat, stair, f1)).toBe(true);
    expect(stairOpensOn(flat, stair, f2)).toBe(true);
    // removing the target floor falls back to the floor above and the rise follows
    const fewer = { ...flat, levels: flat.levels.slice(0, 2) };
    expect(normalizeStairs(fewer).stairs[0].riseCm).toBe(280);
  });

  it('turns the steps with the stair and climbs to the top tread', () => {
    const { flat, ground } = twoFloors();
    for (const rotationDeg of [0, 90, 180, 270]) {
      for (const type of ['straight', 'L', 'U']) {
        const stair = createStair(flat, { levelId: ground, type, x: 100, y: 200, rotationDeg });
        const treads = stairTreads(stair);
        const fp = (() => {
          const g = stairGeometry(stair);
          return rotationDeg % 180 === 0
            ? [g.localWidthCm, g.localDepthCm]
            : [g.localDepthCm, g.localWidthCm];
        })();
        // every tread lies inside the rotated footprint
        for (const t of treads) {
          expect(t.x0).toBeGreaterThanOrEqual(100 - 0.001);
          expect(t.y0).toBeGreaterThanOrEqual(200 - 0.001);
          expect(t.x1).toBeLessThanOrEqual(100 + fp[0] + 0.001);
          expect(t.y1).toBeLessThanOrEqual(200 + fp[1] + 0.001);
        }
        // the highest tread is the top one and each flight climbs away from the one before
        expect(Math.max(...treads.map((t) => t.top))).toBeCloseTo(stairTopTread(stair));
        const byFlight = new Map();
        for (const t of treads) {
          if (t.flight === undefined) continue;
          if (!byFlight.has(t.flight)) byFlight.set(t.flight, []);
          byFlight.get(t.flight).push(t);
        }
        for (const list of byFlight.values()) {
          list.sort((a, b) => a.index - b.index);
          for (let i = 1; i < list.length; i++) {
            const dx = (list[i].x0 + list[i].x1 - list[i - 1].x0 - list[i - 1].x1) / 2;
            const dy = (list[i].y0 + list[i].y1 - list[i - 1].y0 - list[i - 1].y1) / 2;
            expect(Math.sign(dx)).toBe(Math.sign(list[i].dirX) || 0);
            expect(Math.sign(dy)).toBe(Math.sign(list[i].dirY) || 0);
            expect(list[i].top).toBeGreaterThan(list[i - 1].top);
          }
        }
      }
    }
  });

  it('makes the second flight of an L climb away from the landing', () => {
    const { flat, ground } = twoFloors();
    const stair = createStair(flat, { levelId: ground, type: 'L', x: 0, y: 0 });
    const treads = stairTreads(stair);
    const landing = treads.find((t) => t.landing);
    const second = treads.filter((t) => t.flight === 1).sort((a, b) => a.index - b.index);
    // the first tread of the second flight touches the landing and is one step above it
    expect(second[0].top).toBeCloseTo(landing.top + stairGeometry(stair).riserCm);
    const touchesX =
      Math.abs(second[0].x1 - landing.x0) < 0.01 || Math.abs(second[0].x0 - landing.x1) < 0.01;
    expect(touchesX).toBe(true);
    expect(second[second.length - 1].top).toBeCloseTo(stairTopTread(stair));
  });

  it('carries a visitor up to the next floor and back down', () => {
    const { flat: base, ground, upper } = twoFloors();
    const stair = createStair(base, { levelId: ground, type: 'straight', x: 100, y: 100 });
    const flat = { ...base, stairs: [stair] };
    const g = stairGeometry(stair);
    // bottom step, middle and top of a straight stair that climbs towards -y
    const x = (100 + g.localWidthCm / 2) / 100;
    const bottom = walkSurface(flat, 0, x, (100 + g.localDepthCm - 5) / 100);
    expect(bottom.levelIdx).toBe(0);
    expect(bottom.floorM).toBeCloseTo(g.riserCm / 100);
    const mid = walkSurface(flat, 0, x, (100 + g.localDepthCm / 2) / 100);
    expect(mid.levelIdx).toBe(0);
    expect(mid.floorM).toBeGreaterThan(bottom.floorM);
    const top = walkSurface(flat, 0, x, 1.05);
    expect(top).toMatchObject({ levelIdx: 1, floorM: 2.8 });
    // from above, over the opening, the top tread keeps you up and a lower tread brings you down
    expect(walkSurface(flat, 1, x, 1.05).levelIdx).toBe(1);
    const down = walkSurface(flat, 1, x, (100 + g.localDepthCm / 2) / 100);
    expect(down.levelIdx).toBe(0);
    expect(down.floorM).toBeGreaterThan(0.5);
    // away from the stair nothing changes
    expect(walkSurface(flat, 0, 5, 5)).toEqual({ levelIdx: 0, floorM: 0 });
    expect(walkSurface(flat, 1, 5, 5)).toEqual({ levelIdx: 1, floorM: 2.8 });
    expect(stairHeightAt(stair, 5000, 5000)).toBeNull();
    expect(upper).toBeTruthy();
  });

  it('does not let a visitor fall into the opening in the gap of a U stair', () => {
    const { flat: base, ground } = twoFloors();
    const stair = createStair(base, { levelId: ground, type: 'U', x: 0, y: 0 });
    const flat = { ...base, stairs: [stair] };
    const g = stairGeometry(stair);
    // between the two flights there is a 10 cm gap with no tread
    const gapX = (g.flights[0].x + g.flights[0].widthCm + 5) / 100;
    const res = walkSurface(flat, 1, gapX, (g.localDepthCm - 20) / 100);
    expect(res.blocked).toBe(true);
  });
});

describe('analysis helper', () => {
  it('reports no outside cells for an empty level', () => {
    const { flat, levelId } = twoRoomFlat();
    expect(analyzeLevel(flat, levelId).isOutsideCell(-5, -5)).toBe(true);
    expect(levelSolidEdges(flat, levelId).size).toBeGreaterThan(0);
  });
});

describe('exports', () => {
  it('labels the main entrance on the printed plan and names the floor a stair climbs to', async () => {
    const { buildFlatSheet } = await import('./sheetModel.js');
    const { flat, rooms, levelId } = twoRoomFlat();
    const sheet = buildFlatSheet(flat, rooms, levelId);
    expect(sheet.entrance.text).toBe('Main entrance');
    expect(Number.isFinite(sheet.entrance.x)).toBe(true);
    // the arrow sits outside the bottom wall, pointing up into the flat
    expect(sheet.entrance.shaft.y1).toBeGreaterThan(400);
    expect(sheet.entrance.shaft.y2).toBeLessThan(sheet.entrance.shaft.y1);
    // no entrance on a floor without the door, none in a flat without outer doors
    const upper = addLevel(flat);
    expect(buildFlatSheet(upper, rooms, upper.levels[1].id).entrance).toBeNull();
    const stair = createStair(upper, { levelId, toLevelId: upper.levels[1].id });
    const withStair = buildFlatSheet({ ...upper, stairs: [stair] }, rooms, levelId);
    expect(withStair.stairLabels[0].text).toBe('Up to Floor 1');
  });
});
