import { describe, it, expect } from 'vitest';
import {
  checkPolygonCollision,
  checkFurnitureCollision,
  checkRoomBoundaryCollision,
  evaluateAllCollisions,
} from '../collision.js';
import { getRotatedRectCorners } from '../geometry.js';

describe('collision.js (Separating Axis Theorem)', () => {
  it('detects no collision between separated parallel rectangles', () => {
    const itemA = { x: 50, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 };
    const itemB = { x: 120, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 };
    expect(checkFurnitureCollision(itemA, itemB)).toBe(false);
  });

  it('detects collision between overlapping parallel rectangles', () => {
    const itemA = { x: 50, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 };
    const itemB = { x: 70, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 };
    expect(checkFurnitureCollision(itemA, itemB)).toBe(true);
  });

  it('correctly distinguishes separation when AABBs overlap but SAT separates rotated shapes', () => {
    // Two rectangles rotated 45 degrees, positioned diagonally so their bounding boxes overlap
    // but the rotated diamonds themselves do not touch
    const cornersA = getRotatedRectCorners(50, 50, 40, 40, 45); // Diamond centered at (50, 50), half-diag ~28.3
    const cornersB = getRotatedRectCorners(100, 100, 40, 40, 45); // Diamond centered at (100, 100)
    // Distance between centers along (1,1) is sqrt(50^2 + 50^2) = 70.7.
    // Sum of half-diagonals = 28.28 + 28.28 = 56.56 < 70.7.
    // The shapes are separated by ~14cm, but their AABB extends from 21.7 to 78.3 (A) and 71.7 to 128.3 (B),
    // meaning their AABBs overlap in range [71.7, 78.3] on both X and Y!
    // AABB test would falsely report collision, but SAT must report FALSE!
    expect(checkPolygonCollision(cornersA, cornersB)).toBe(false);
  });

  it('detects collision when rotated rectangle penetrates another', () => {
    const cornersA = getRotatedRectCorners(50, 50, 60, 40, 45);
    const cornersB = getRotatedRectCorners(75, 50, 60, 40, 0);
    expect(checkPolygonCollision(cornersA, cornersB)).toBe(true);
  });

  it('detects room boundary violations', () => {
    const roomW = 400;
    const roomD = 300;

    // Fully inside
    const inside = { x: 100, y: 100, widthCm: 80, depthCm: 60, rotationDeg: 0 };
    expect(checkRoomBoundaryCollision(inside, roomW, roomD)).toBe(false);

    // Over left wall
    const overLeft = { x: 20, y: 100, widthCm: 80, depthCm: 60, rotationDeg: 0 };
    expect(checkRoomBoundaryCollision(overLeft, roomW, roomD)).toBe(true);

    // Rotated corner crossing boundary
    const rotatedCrossing = { x: 40, y: 40, widthCm: 80, depthCm: 60, rotationDeg: 45 };
    expect(checkRoomBoundaryCollision(rotatedCrossing, roomW, roomD)).toBe(true);
  });

  it('evaluates all collisions across multiple items and boundaries', () => {
    const roomW = 400;
    const roomD = 300;
    const items = [
      { id: '1', x: 50, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 },
      { id: '2', x: 60, y: 50, widthCm: 40, depthCm: 40, rotationDeg: 0 }, // collides with 1
      { id: '3', x: 250, y: 200, widthCm: 40, depthCm: 40, rotationDeg: 0 }, // clear
      { id: '4', x: 390, y: 200, widthCm: 40, depthCm: 40, rotationDeg: 0 }, // boundary violation
    ];

    const result = evaluateAllCollisions(items, roomW, roomD);
    expect(result.collidingIds.has('1')).toBe(true);
    expect(result.collidingIds.has('2')).toBe(true);
    expect(result.collidingIds.has('3')).toBe(false);
    expect(result.collidingIds.has('4')).toBe(true);
    expect(result.boundaryCollidingIds.has('4')).toBe(true);
  });

  it('exempts rugs and carpet runners from furniture-on-furniture collisions', () => {
    const roomW = 500;
    const roomD = 400;
    const items = [
      { id: 'rug-1', furnitureTypeId: 'rug-living', x: 200, y: 200, widthCm: 240, depthCm: 300, rotationDeg: 0 },
      { id: 'table-1', furnitureTypeId: 'coffee-table', x: 200, y: 200, widthCm: 110, depthCm: 60, rotationDeg: 0 },
    ];

    // Check direct pairwise check
    expect(checkFurnitureCollision(items[0], items[1])).toBe(false);

    // Check evaluateAllCollisions
    const result = evaluateAllCollisions(items, roomW, roomD);
    expect(result.collidingIds.has('rug-1')).toBe(false);
    expect(result.collidingIds.has('table-1')).toBe(false);
  });
});

