import { describe, it, expect } from 'vitest';
import { findFreePosition } from './placement.js';

const piece = (x, y, w = 100, d = 100) => ({ x, y, widthCm: w, depthCm: d, rotationDeg: 0 });

describe('finding a free place for a new piece', () => {
  it('uses the preferred spot when it is free', () => {
    expect(
      findFreePosition({ widthCm: 80, depthCm: 80 }, [], 500, 400, null, { x: 250, y: 200 })
    ).toEqual({
      x: 250,
      y: 200,
    });
  });

  it('moves off a piece that already stands in the middle', () => {
    const others = [piece(250, 200)];
    const at = findFreePosition({ widthCm: 80, depthCm: 80 }, others, 500, 400, null, {
      x: 250,
      y: 200,
    });
    const overlap = Math.abs(at.x - 250) < 90 && Math.abs(at.y - 200) < 90;
    expect(overlap).toBe(false);
    expect(at.x).toBeGreaterThanOrEqual(40);
    expect(at.x).toBeLessThanOrEqual(460);
  });

  it('stays inside the room and falls back to the start when nothing fits', () => {
    const full = [piece(100, 100, 200, 200)];
    const at = findFreePosition({ widthCm: 150, depthCm: 150 }, full, 200, 200, null, {
      x: 100,
      y: 100,
    });
    expect(at).toEqual({ x: 100, y: 100 });
  });
});
