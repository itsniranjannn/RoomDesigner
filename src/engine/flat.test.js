import { describe, it, expect } from 'vitest';
import {
  createFlat,
  createSpace,
  buildStarterRoom,
  fitRoomToSize,
  stairGeometry,
  stairFootprint,
  stairStepCount,
  createStair,
  snapRect,
  rectsOverlap,
  canPlace,
  addLevel,
  removeLevel,
  flatSummary,
} from './flat.js';
import { evaluateAllCollisions } from './collision.js';

describe('flat spaces', () => {
  it('places new spaces without overlapping', () => {
    let flat = createFlat('F');
    for (const kind of ['living', 'bedroom', 'bathroom', 'corridor']) {
      const space = createSpace(flat, { kind, levelId: 'lvl-0', roomId: `r-${kind}` });
      flat = { ...flat, spaces: [...flat.spaces, space] };
    }
    for (let i = 0; i < flat.spaces.length; i++) {
      for (let j = i + 1; j < flat.spaces.length; j++) {
        expect(rectsOverlap(flat.spaces[i], flat.spaces[j])).toBe(false);
      }
    }
  });

  it('snaps a dragged rect flush to a neighbour', () => {
    const neighbour = { x: 0, y: 0, widthCm: 400, depthCm: 300 };
    const snapped = snapRect({ x: 410, y: 8, widthCm: 200, depthCm: 200 }, [neighbour]);
    expect(snapped).toEqual({ x: 400, y: 0 });
  });

  it('refuses overlapping placement', () => {
    let flat = createFlat('F');
    const s = createSpace(flat, { kind: 'living', levelId: 'lvl-0', roomId: 'r' });
    flat = { ...flat, spaces: [s] };
    expect(canPlace(flat, 'lvl-0', { x: s.x + 10, y: s.y + 10, widthCm: 100, depthCm: 100 })).toBe(false);
    expect(canPlace(flat, 'lvl-0', { x: s.x + s.widthCm, y: s.y, widthCm: 100, depthCm: 100 })).toBe(true);
  });

  it('manages levels', () => {
    let flat = addLevel(createFlat('F'));
    expect(flat.levels).toHaveLength(2);
    flat = removeLevel(flat, flat.levels[1].id);
    expect(flat.levels).toHaveLength(1);
    expect(removeLevel(flat, flat.levels[0].id).levels).toHaveLength(1);
  });
});

describe('starter rooms', () => {
  it('fits a bathroom with fixtures and no collisions', () => {
    const room = buildStarterRoom({ kind: 'bathroom', name: 'Bath', widthCm: 200, depthCm: 240, flatId: 'f', spaceId: 's' });
    const types = room.placedFurniture.map((f) => f.furnitureTypeId).sort();
    expect(types).toEqual(['shower-tray', 'toilet', 'wash-basin']);
    expect(evaluateAllCollisions(room.placedFurniture, room.widthCm, room.depthCm).collidingIds.size).toBe(0);
  });

  it('gives a corridor a door at both ends and no windows', () => {
    const room = buildStarterRoom({ kind: 'corridor', name: 'C', widthCm: 120, depthCm: 400, flatId: 'f', spaceId: 's' });
    expect(room.doors.map((d) => d.wall).sort()).toEqual(['bottom', 'top']);
    expect(room.windows).toHaveLength(0);
  });

  it('keeps openings and furniture inside after resizing', () => {
    const room = buildStarterRoom({ kind: 'bedroom', name: 'B', widthCm: 360, depthCm: 340, flatId: 'f', spaceId: 's' });
    const small = fitRoomToSize(room, 220, 220);
    for (const d of small.doors) expect(d.offsetCm + d.widthCm).toBeLessThanOrEqual(220);
    for (const f of small.placedFurniture) {
      expect(f.x).toBeLessThanOrEqual(220);
      expect(f.y).toBeLessThanOrEqual(220);
    }
  });
});

describe('stairs', () => {
  const base = { widthCm: 100, riseCm: 280, rotationDeg: 0 };

  it('computes straight stair steps and footprint', () => {
    const n = stairStepCount(280);
    expect(n).toBe(16);
    const g = stairGeometry({ ...base, type: 'straight' });
    expect(g.flights[0].treads).toBe(15);
    expect(g.localDepthCm).toBe(15 * 27);
    expect(g.riserCm).toBeCloseTo(17.5, 5);
  });

  it('L and U stairs include a landing and use the full rise', () => {
    for (const type of ['L', 'U']) {
      const g = stairGeometry({ ...base, type });
      const treads = g.flights.reduce((s, f) => s + f.treads, 0);
      expect(g.landing).not.toBeNull();
      expect(treads + 2).toBe(g.steps);
    }
  });

  it('swaps footprint when rotated a quarter turn', () => {
    const a = stairFootprint({ ...base, type: 'straight' });
    const b = stairFootprint({ ...base, type: 'straight', rotationDeg: 90 });
    expect(b.widthCm).toBe(a.depthCm);
    expect(b.depthCm).toBe(a.widthCm);
  });

  it('places a stair clear of existing spaces', () => {
    let flat = createFlat('F');
    const s = createSpace(flat, { kind: 'living', levelId: 'lvl-0', roomId: 'r' });
    flat = { ...flat, spaces: [s] };
    const stair = createStair(flat, { levelId: 'lvl-0', type: 'U' });
    flat = { ...flat, stairs: [stair] };
    expect(flatSummary(flat).stairs).toBe(1);
    const fp = stairFootprint(stair);
    expect(rectsOverlap({ x: stair.x, y: stair.y, widthCm: fp.widthCm, depthCm: fp.depthCm }, s)).toBe(false);
  });
});
