import { describe, it, expect } from 'vitest';
import {
  snapToNearestWall,
  defaultWallSpot,
  freeWallSpot,
  mountItem,
  clampMountHeight,
  defaultMountHeight,
  isWallMounted,
  isFlushToWall,
} from './wallMount.js';
import { getFurnitureType } from '../data/furnitureCatalog.js';

const ROOM = {
  widthCm: 500,
  depthCm: 400,
  windows: [{ id: 'w1', wall: 'top', offsetCm: 200, widthCm: 120 }],
  doors: [{ id: 'd1', wall: 'bottom', offsetCm: 20, widthCm: 90 }],
};
const art = getFurnitureType('wall-art-landscape'); // 80 x 4
const curtain = getFurnitureType('curtain-heavy-open'); // 220 x 16

describe('snapToNearestWall', () => {
  it('puts the back flush on the nearest wall, facing into the room', () => {
    const top = snapToNearestWall(ROOM, art, { x: 250, y: 30 });
    expect(top).toMatchObject({ wall: 'top', rotationDeg: 0, x: 250, y: 2 });
    const bottom = snapToNearestWall(ROOM, art, { x: 250, y: 380 });
    expect(bottom).toMatchObject({ wall: 'bottom', rotationDeg: 180, y: 398 });
    const left = snapToNearestWall(ROOM, art, { x: 40, y: 200 });
    expect(left).toMatchObject({ wall: 'left', rotationDeg: 270, x: 2, y: 200 });
    const right = snapToNearestWall(ROOM, art, { x: 470, y: 200 });
    expect(right).toMatchObject({ wall: 'right', rotationDeg: 90, x: 498, y: 200 });
  });

  it('keeps the piece inside the wall length', () => {
    const p = snapToNearestWall(ROOM, art, { x: 20, y: 6 });
    expect(p.wall).toBe('top');
    expect(p.x).toBe(40);
    const q = snapToNearestWall(ROOM, art, { x: 490, y: 3 });
    expect(q.x).toBe(460);
  });

  it('centres a curtain on a window nearby, but not on one far away', () => {
    const near = snapToNearestWall(ROOM, curtain, { x: 290, y: 5 });
    expect(near.x).toBe(260);
    const far = snapToNearestWall(ROOM, curtain, { x: 440, y: 5 });
    expect(far.x).toBe(390);
    // A picture is never pulled onto a window
    expect(snapToNearestWall(ROOM, art, { x: 290, y: 5 }).x).toBe(290);
  });

  it('is idempotent', () => {
    const once = snapToNearestWall(ROOM, art, { x: 123, y: 77 });
    const twice = snapToNearestWall(ROOM, art, once);
    expect(twice.x).toBe(once.x);
    expect(twice.y).toBe(once.y);
    expect(twice.rotationDeg).toBe(once.rotationDeg);
  });

  it('works on an L-shaped outline', () => {
    const room = {
      widthCm: 400,
      depthCm: 400,
      outline: [
        [0, 0],
        [400, 0],
        [400, 200],
        [200, 200],
        [200, 400],
        [0, 400],
      ],
    };
    // The edge from (400,200) to (200,200): its inward side faces up
    const p = snapToNearestWall(room, art, { x: 300, y: 190 });
    expect(p.y).toBeCloseTo(198, 0);
    expect(p.rotationDeg).toBe(180);
    // The edge from (200,200) down to (200,400): its inward side faces left, so the back is on the right
    const inner = snapToNearestWall(room, art, { x: 190, y: 300 });
    expect(inner.x).toBeCloseTo(198, 0);
    expect(inner.rotationDeg).toBe(90);
  });
});

describe('placing a new wall piece', () => {
  it('hangs a curtain on the first window without one', () => {
    const first = defaultWallSpot(ROOM, curtain, []);
    expect(first.x).toBe(260);
    expect(first.y).toBe(8);
    const dressed = [{ id: 'c1', furnitureTypeId: 'curtain-heavy-open', x: 260, y: 8 }];
    const two = {
      ...ROOM,
      windows: [...ROOM.windows, { wall: 'left', offsetCm: 100, widthCm: 100 }],
    };
    const second = defaultWallSpot(two, curtain, dressed);
    expect(second.x).toBe(8);
    expect(second.y).toBe(150);
  });

  it('finds a free stretch of wall for a picture, clear of doors, windows and other pictures', () => {
    const spot = freeWallSpot(ROOM, art, []);
    // The longest walls come first; on the top wall it must clear the window (200 to 320)
    expect(spot.y === 2 || spot.y === 398).toBe(true);
    if (spot.y === 2) expect(spot.x - 40 >= 326 || spot.x + 40 <= 194).toBe(true);
    const hung = [{ id: 'a', furnitureTypeId: 'wall-art-landscape', ...spot }];
    const next = freeWallSpot(ROOM, art, hung);
    expect(next.y !== spot.y || Math.abs(next.x - spot.x) >= 86).toBe(true);
  });
});

describe('mounting', () => {
  it('moves and turns the piece and keeps an existing height', () => {
    const m = mountItem(ROOM, { id: 'a', x: 250, y: 30, rotationDeg: 33, elevationCm: 150 }, art);
    expect(m).toMatchObject({ x: 250, y: 2, rotationDeg: 0, elevationCm: 150 });
    const fresh = mountItem(ROOM, { id: 'a', x: 250, y: 30 }, art);
    expect(fresh.elevationCm).toBe(135);
  });

  it('clamps the hanging height so the piece stays under the ceiling', () => {
    expect(clampMountHeight(500, art)).toBe(240 - 55);
    expect(clampMountHeight(-5, art)).toBe(0);
    expect(clampMountHeight('abc', art)).toBe(135);
    expect(defaultMountHeight(curtain)).toBe(0);
  });

  it('knows which pieces are wall pieces and whether one is flush', () => {
    expect(isWallMounted(art)).toBe(true);
    expect(isWallMounted(getFurnitureType('sofa-3seat'))).toBe(false);
    const m = mountItem(ROOM, { id: 'a', x: 250, y: 30 }, art);
    expect(isFlushToWall(ROOM, m, art)).toBe(true);
    expect(isFlushToWall(ROOM, { ...m, y: 200 }, art)).toBe(false);
  });
});
