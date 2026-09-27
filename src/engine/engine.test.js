import { describe, it, expect } from 'vitest';
import {
  checkPolygonCollision,
  checkFurnitureCollision,
  checkRoomBoundaryCollision,
  evaluateAllCollisions,
} from './collision.js';
import {
  snapValueToGrid,
  getOrthogonalAlignment,
  snapToWalls,
  clampInsideRoom,
  applySnapping,
} from './snapping.js';
import {
  degToRad,
  radToDeg,
  normalizeAngle,
  rotatePoint,
  getRotatedRectCorners,
  getAABB,
} from './geometry.js';

describe('Geometry Engine', () => {
  it('normalizes angles into [0, 360) range', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(-360)).toBe(0);
  });

  it('rotates a point correctly around a center', () => {
    const center = { x: 100, y: 100 };
    const pt = { x: 100, y: 50 }; // 50 units north
    const rotated90 = rotatePoint(pt.x, pt.y, center.x, center.y, 90);
    expect(Math.round(rotated90.x)).toBe(150);
    expect(Math.round(rotated90.y)).toBe(100);
  });

  it('computes 4 corners of unrotated and rotated rectangles', () => {
    // 100x50 rectangle centered at (100, 100)
    const corners = getRotatedRectCorners(100, 100, 100, 50, 0);
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: 50, y: 75 });
    expect(corners[1]).toEqual({ x: 150, y: 75 });
    expect(corners[2]).toEqual({ x: 150, y: 125 });
    expect(corners[3]).toEqual({ x: 50, y: 125 });

    const aabb = getAABB(corners);
    expect(aabb.minX).toBe(50);
    expect(aabb.maxX).toBe(150);
    expect(aabb.minY).toBe(75);
    expect(aabb.maxY).toBe(125);
  });
});

describe('SAT Collision Engine', () => {
  it('detects overlap between two non-rotated overlapping rectangles', () => {
    const cornersA = getRotatedRectCorners(100, 100, 80, 80, 0);
    const cornersB = getRotatedRectCorners(130, 100, 80, 80, 0);
    expect(checkPolygonCollision(cornersA, cornersB)).toBe(true);
  });

  it('detects separation between two distinct rectangles', () => {
    const cornersA = getRotatedRectCorners(100, 100, 80, 80, 0);
    const cornersB = getRotatedRectCorners(250, 100, 80, 80, 0);
    expect(checkPolygonCollision(cornersA, cornersB)).toBe(false);
  });

  it('handles rotated rectangle collision at angles using SAT', () => {
    // Two boxes that only collide when one is rotated 45 degrees
    const cornersA = getRotatedRectCorners(100, 100, 60, 60, 45);
    const cornersB = getRotatedRectCorners(150, 100, 60, 60, 0);
    // At 45 deg, corner of A reaches 100 + 30 * sqrt(2) ≈ 142.42 > 150 - 30 = 120
    expect(checkPolygonCollision(cornersA, cornersB)).toBe(true);
  });

  it('allows rugs to not trigger collision with furniture (exemption rule)', () => {
    const bed = {
      id: 'bed1',
      furnitureTypeId: 'bed-queen',
      x: 150,
      y: 150,
      widthCm: 160,
      depthCm: 200,
      rotationDeg: 0,
    };
    const rug = {
      id: 'rug1',
      furnitureTypeId: 'nepali-dhaka-rug',
      x: 150,
      y: 150,
      widthCm: 200,
      depthCm: 300,
      rotationDeg: 0,
    };
    expect(checkFurnitureCollision(bed, rug)).toBe(false);
  });

  it('detects boundary collisions when an item protrudes outside the room', () => {
    const itemInside = {
      x: 100,
      y: 100,
      widthCm: 80,
      depthCm: 80,
      rotationDeg: 0,
    };
    const itemOutside = {
      x: 10,
      y: 100,
      widthCm: 80,
      depthCm: 80,
      rotationDeg: 0, // left edge is 10 - 40 = -30 (< 0)
    };
    expect(checkRoomBoundaryCollision(itemInside, 500, 400)).toBe(false);
    expect(checkRoomBoundaryCollision(itemOutside, 500, 400)).toBe(true);
  });
});

describe('Snapping and Boundary Clamping Engine', () => {
  it('snaps scalar coordinates to grid intervals within threshold', () => {
    // 10cm grid, 3.5cm threshold
    expect(snapValueToGrid(102, 10, 3.5)).toEqual({ value: 100, snapped: true });
    expect(snapValueToGrid(98, 10, 3.5)).toEqual({ value: 100, snapped: true });
    expect(snapValueToGrid(104, 10, 3.5)).toEqual({ value: 104, snapped: false });
  });

  it('detects orthogonal alignment for wall snapping', () => {
    expect(getOrthogonalAlignment(0, 6)).toEqual({ isOrthogonal: true, targetAngle: 0 });
    expect(getOrthogonalAlignment(88, 6)).toEqual({ isOrthogonal: true, targetAngle: 90 });
    expect(getOrthogonalAlignment(182, 6)).toEqual({ isOrthogonal: true, targetAngle: 180 });
    expect(getOrthogonalAlignment(45, 6).isOrthogonal).toBe(false);
  });

  it('snaps furniture flush against room walls when near edge', () => {
    const itemNearLeft = {
      x: 43, // width 80 -> left edge is 43 - 40 = 3cm from left wall (<= 12cm threshold)
      y: 200,
      widthCm: 80,
      depthCm: 80,
      rotationDeg: 0,
    };
    const result = snapToWalls(itemNearLeft, 500, 400, 12);
    expect(result.snappedX).toBe(true);
    expect(result.x).toBe(40); // perfectly flush at x=0 (minX = 0)
  });

  it('clamps furniture within room boundaries so it never escapes walls', () => {
    const protruding = {
      x: 20, // width 100 -> minX = -30
      y: 380, // depth 100 in 400cm room -> maxY = 430
      widthCm: 100,
      depthCm: 100,
      rotationDeg: 0,
    };
    const clamped = clampInsideRoom(protruding, 500, 400);
    expect(clamped.x).toBe(50); // minX is now 0
    expect(clamped.y).toBe(350); // maxY is now 400
  });

  it('applies the full snapping pipeline combining wall, grid, and clamping', () => {
    const item = {
      x: 44, // snaps to wall (40)
      y: 198, // snaps to 10cm grid (200)
      widthCm: 80,
      depthCm: 80,
      rotationDeg: 0,
    };
    const result = applySnapping(item, 500, 400);
    expect(result.x).toBe(40);
    expect(result.y).toBe(200);
    expect(result.snappedToWall).toBe(true);
  });
});
