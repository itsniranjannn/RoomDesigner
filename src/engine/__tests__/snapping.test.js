import { describe, it, expect } from 'vitest';
import {
  snapValueToGrid,
  getOrthogonalAlignment,
  snapToWalls,
  applySnapping,
} from '../snapping.js';

describe('snapping.js', () => {
  it('snaps values to nearest grid interval when within threshold', () => {
    // gridStep = 10, threshold = 3.5
    expect(snapValueToGrid(12, 10, 3.5)).toEqual({ value: 10, snapped: true });
    expect(snapValueToGrid(19, 10, 3.5)).toEqual({ value: 20, snapped: true });
    // Exactly at threshold (3.5)
    expect(snapValueToGrid(13.5, 10, 3.5)).toEqual({ value: 10, snapped: true });
    // Beyond threshold
    expect(snapValueToGrid(15, 10, 3.5)).toEqual({ value: 15, snapped: false });
  });

  it('identifies orthogonal rotation angles accurately', () => {
    expect(getOrthogonalAlignment(0).isOrthogonal).toBe(true);
    expect(getOrthogonalAlignment(91, 3).isOrthogonal).toBe(true);
    expect(getOrthogonalAlignment(178, 3).isOrthogonal).toBe(true);
    expect(getOrthogonalAlignment(269, 3).isOrthogonal).toBe(true);
    expect(getOrthogonalAlignment(358, 3).isOrthogonal).toBe(true);

    // Non-orthogonal
    expect(getOrthogonalAlignment(45).isOrthogonal).toBe(false);
    expect(getOrthogonalAlignment(30).isOrthogonal).toBe(false);
  });

  it('snaps furniture flush against left and top room walls', () => {
    const roomW = 500;
    const roomD = 400;
    // Furniture w=80, d=60. Half-w=40, Half-d=30.
    // Left edge is at x - 40. If center x=45, left edge is at 5cm (within threshold 12).
    // Should snap flush so left edge is at 0 -> center x becomes 40.
    const item = { x: 45, y: 35, widthCm: 80, depthCm: 60, rotationDeg: 0 };
    const result = snapToWalls(item, roomW, roomD, 12);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(true);
    expect(result.x).toBe(40);
    expect(result.y).toBe(30);
  });

  it('snaps furniture flush against walls when rotated 90 degrees', () => {
    const roomW = 500;
    const roomD = 400;
    // Furniture w=80, d=60 rotated 90 deg.
    // Extents are swapped: effective width along x is 60 (half-w=30), depth along y is 80 (half-d=40).
    // If center x=34, left edge is at 34 - 30 = 4cm.
    const item = { x: 34, y: 150, widthCm: 80, depthCm: 60, rotationDeg: 90 };
    const result = snapToWalls(item, roomW, roomD, 12);
    expect(result.snappedX).toBe(true);
    expect(result.x).toBe(30);
  });

  it('combines wall snap and grid snap in applySnapping', () => {
    const roomW = 500;
    const roomD = 400;
    // Item: w=60, d=40 (half-w=30, half-d=20).
    // x=32 (2cm from wall -> snaps flush to x=30)
    // y=102 (far from wall, but near grid line 100 -> snaps to y=100)
    const item = { x: 32, y: 102, widthCm: 60, depthCm: 40, rotationDeg: 0 };
    const snapped = applySnapping(item, roomW, roomD, { gridStep: 10, gridThreshold: 3.5, wallThreshold: 12 });
    expect(snapped.x).toBe(30);
    expect(snapped.y).toBe(100);
    expect(snapped.snappedToWall).toBe(true);
    expect(snapped.snappedToGrid).toBe(true);
  });
});

