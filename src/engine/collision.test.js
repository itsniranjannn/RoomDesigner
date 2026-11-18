import { describe, it, expect } from 'vitest';
import { evaluateAllCollisions, checkPolygonCollision } from './collision.js';
import { getRotatedRectCorners } from './geometry.js';
import { isRestingOn } from './stacking.js';
import { FURNITURE_CATALOG, resolveItemDef } from '../data/furnitureCatalog.js';

const FLAT_RUGS = new Set(['rug', 'rug-runner', 'rug-round', 'nepali-dhaka-rug']);

/**
 * The plain statement of what a clash is, written out pair by pair with nothing skipped. The
 * engine's own pass sorts the pieces and drops pairs whose upright boxes do not even meet, so
 * that a crowded room does not cost the square of what it holds -- at 300 pieces that was two
 * and a half seconds on every step of a drag. This is here to say that it still answers the same.
 */
function brute(items, W, D) {
  const colliding = new Set();
  const outside = new Set();
  const sized = items.map((item) => {
    const def = resolveItemDef(item);
    return {
      ...item,
      widthCm: item.widthCm ?? def?.widthCm ?? 50,
      depthCm: item.depthCm ?? def?.depthCm ?? 50,
      heightCm: def?.heightCm ?? 100,
      shapeType: def?.shapeType,
      wallMounted: !!def?.wallMounted,
    };
  });
  const corners = new Map(
    sized.map((i) => [
      i.id,
      getRotatedRectCorners(i.x, i.y, i.widthCm, i.depthCm, i.rotationDeg || 0),
    ])
  );
  for (const i of sized) {
    if (corners.get(i.id).some((c) => c.x < -0.1 || c.x > W + 0.1 || c.y < -0.1 || c.y > D + 0.1)) {
      outside.add(i.id);
      colliding.add(i.id);
    }
  }
  const exempt = (i) => FLAT_RUGS.has(i.shapeType) || i.wallMounted;
  const stacked = (a, b) => {
    const aB = a.elevationCm || 0;
    const bB = b.elevationCm || 0;
    return !(aB < bB + b.heightCm - 0.5 && bB < aB + a.heightCm - 0.5);
  };
  for (let i = 0; i < sized.length; i += 1) {
    for (let j = i + 1; j < sized.length; j += 1) {
      const a = sized[i];
      const b = sized[j];
      if (exempt(a) || exempt(b) || stacked(a, b)) continue;
      if (isRestingOn(a, b, items) || isRestingOn(b, a, items)) continue;
      if (checkPolygonCollision(corners.get(a.id), corners.get(b.id))) {
        colliding.add(a.id);
        colliding.add(b.id);
      }
    }
  }
  return { colliding, outside };
}

const catalogAt = (r) => FURNITURE_CATALOG[Math.floor(r * FURNITURE_CATALOG.length)];

describe('every clash in the room, and nothing else', () => {
  it('matches a pair-by-pair reading of 200 random rooms', () => {
    for (let trial = 1; trial <= 200; trial += 1) {
      let seed = trial * 7919 + 13;
      const r = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
      const W = 300 + Math.floor(r() * 900);
      const D = 300 + Math.floor(r() * 900);
      const items = [];
      for (let i = 0, n = 2 + Math.floor(r() * 40); i < n; i += 1) {
        items.push({
          id: `i${i}`,
          furnitureTypeId: catalogAt(r()).id,
          x: Math.round(r() * W),
          y: Math.round(r() * D),
          rotationDeg: [0, 45, 90, 180, 270][Math.floor(r() * 5)],
          elevationCm: r() < 0.15 ? Math.round(r() * 80) : 0,
        });
      }
      const got = evaluateAllCollisions(items, W, D);
      const want = brute(items, W, D);
      expect([...got.collidingIds].sort(), `room ${trial}`).toEqual([...want.colliding].sort());
      expect([...got.boundaryCollidingIds].sort(), `room ${trial}`).toEqual(
        [...want.outside].sort()
      );
    }
  });

  it('answers a crowded room quickly', () => {
    const items = [];
    const side = 25; // 625 pieces, more than anyone will place
    for (let i = 0; i < side * side; i += 1) {
      items.push({
        id: `i${i}`,
        furnitureTypeId: 'nightstand',
        x: 60 + (i % side) * 120,
        y: 60 + Math.floor(i / side) * 120,
        rotationDeg: 0,
      });
    }
    const span = 60 + side * 120 + 60;
    const started = performance.now();
    const got = evaluateAllCollisions(items, span, span);
    // Pair by pair this took over twenty seconds; a generous ceiling still catches a return to it
    expect(performance.now() - started).toBeLessThan(1000);
    expect(got.collidingIds.size).toBe(0);
  });
});
