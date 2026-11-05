import { describe, it, expect } from 'vitest';
import { pushOffInteriorWalls } from './furnitureWalls.js';

const space = { x: 0, y: 0, widthCm: 400, depthCm: 300 };
const room = { widthCm: 400, depthCm: 300 };
const def = { widthCm: 100, depthCm: 50 };
// Vertical interior wall on x = 400, 8 cm thick, centred
const wall = [{ axis: 'v', line: 400, off: 0, a: 0, b: 300, thick: 8 }];

describe('pushOffInteriorWalls', () => {
  it('moves a piece flush with the room edge out of the wall', () => {
    const p = pushOffInteriorWalls({ x: 350, y: 100, rotationDeg: 0 }, space, room, wall, def);
    expect(p.x + 50).toBeLessThanOrEqual(396);
    expect(p.y).toBe(100);
  });
  it('leaves a piece away from the wall alone', () => {
    const p = pushOffInteriorWalls({ x: 200, y: 100 }, space, room, wall, def);
    expect(p).toEqual({ x: 200, y: 100 });
  });
  it('works with a turned piece', () => {
    const p = pushOffInteriorWalls({ x: 375, y: 100, rotationDeg: 90 }, space, room, wall, def);
    expect(p.x + 25).toBeLessThanOrEqual(396);
  });
});
