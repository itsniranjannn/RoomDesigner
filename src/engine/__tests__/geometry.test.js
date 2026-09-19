import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  normalizeAngle,
  rotatePoint,
  getRotatedRectCorners,
  getAABB,
  getPolygonNormals,
  projectPolygonOntoAxis,
} from '../geometry.js';

describe('geometry.js', () => {
  it('normalizes angles properly to [0, 360)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(-370)).toBe(350);
  });

  it('rotates a point clockwise with y-down coordinate convention', () => {
    // Center at (100, 100), point at (130, 80) -> relative dx=+30, dy=-20 (top-right)
    // 90 deg clockwise: dx' = -dy = +20, dy' = +dx = +30 -> (120, 130) (bottom-right)
    const rotated = rotatePoint(130, 80, 100, 100, 90);
    expect(Math.round(rotated.x)).toBe(120);
    expect(Math.round(rotated.y)).toBe(130);
  });

  it('computes exact 4 corners for unrotated rectangle', () => {
    // center (100, 100), w=60, d=40
    // hw=30, hd=20
    const corners = getRotatedRectCorners(100, 100, 60, 40, 0);
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: 70, y: 80 });   // Top-Left
    expect(corners[1]).toEqual({ x: 130, y: 80 });  // Top-Right
    expect(corners[2]).toEqual({ x: 130, y: 120 }); // Bottom-Right
    expect(corners[3]).toEqual({ x: 70, y: 120 });  // Bottom-Left
  });

  it('verifies 90 degree clockwise rotation moves top-right corner to bottom-right (user spec verification)', () => {
    const corners = getRotatedRectCorners(100, 100, 60, 40, 90);
    // After 90 deg clockwise:
    // Corner 0 (was Top-Left):   dx=-30, dy=-20 -> dx'=20, dy'=-30 -> (120, 70) (now Top-Right)
    // Corner 1 (was Top-Right):  dx=+30, dy=-20 -> dx'=20, dy'=30  -> (120, 130) (now Bottom-Right)
    // Corner 2 (was Bottom-Right): dx=+30, dy=20 -> dx'=-20, dy'=30 -> (80, 130) (now Bottom-Left)
    // Corner 3 (was Bottom-Left): dx=-30, dy=20 -> dx'=-20, dy'=-30 -> (80, 70) (now Top-Left)
    expect(Math.round(corners[1].x)).toBe(120);
    expect(Math.round(corners[1].y)).toBe(130);

    const aabb = getAABB(corners);
    expect(Math.round(aabb.width)).toBe(40);
    expect(Math.round(aabb.height)).toBe(60);
    expect(Math.round(aabb.minX)).toBe(80);
    expect(Math.round(aabb.maxX)).toBe(120);
    expect(Math.round(aabb.minY)).toBe(70);
    expect(Math.round(aabb.maxY)).toBe(130);
  });

  it('extracts correct unit normal axes', () => {
    const corners = getRotatedRectCorners(50, 50, 40, 20, 0);
    const normals = getPolygonNormals(corners);
    expect(normals).toHaveLength(4);
    // Edge 0 is top horizontal edge: p1(30,40) -> p2(70,40), dx=40, dy=0. Normal: (-0, 40)/40 = (0, 1)
    expect(Math.abs(normals[0].x)).toBeCloseTo(0);
    expect(Math.abs(normals[0].y)).toBeCloseTo(1);
  });

  it('projects corners correctly onto axis', () => {
    const corners = [
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 30, y: 50 },
      { x: 10, y: 50 },
    ];
    const axisX = { x: 1, y: 0 };
    const projX = projectPolygonOntoAxis(corners, axisX);
    expect(projX.min).toBe(10);
    expect(projX.max).toBe(30);

    const axisY = { x: 0, y: 1 };
    const projY = projectPolygonOntoAxis(corners, axisY);
    expect(projY.min).toBe(10);
    expect(projY.max).toBe(50);
  });
});

