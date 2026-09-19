import { describe, it, expect } from 'vitest';
import {
  clampOpening,
  clampMoveOpening,
  clampResizeEnd,
  clampResizeStart,
  getOpeningGeometry,
  OPENING_LIMITS,
} from '../openings.js';

describe('Doors & Windows Boundary and Resizing Constraints', () => {
  const wallLength = 500; // 5m wall

  describe('Dragging along wall past corners', () => {
    it('stops window at start corner instead of clipping through (min offset 15cm)', () => {
      // User drags far past the left corner (delta = -200)
      const offset = clampMoveOpening('window', 50, 120, -200, wallLength);
      expect(offset).toBe(OPENING_LIMITS.cornerMargin); // exactly 15cm
    });

    it('stops door at end corner instead of clipping through', () => {
      // User drags far past the right corner (delta = +600)
      const doorWidth = 90;
      const offset = clampMoveOpening('door', 200, doorWidth, 600, wallLength);
      const expectedMax = wallLength - doorWidth - OPENING_LIMITS.cornerMargin;
      expect(offset).toBe(expectedMax); // 500 - 90 - 15 = 395
      expect(offset + doorWidth).toBeLessThanOrEqual(wallLength - OPENING_LIMITS.cornerMargin);
    });
  });

  describe('Door width shrinking and expansion limits', () => {
    it('strictly prevents shrinking a door below 60cm via end handle', () => {
      // Try to shrink door to 30cm or 0cm
      const width = clampResizeEnd('door', 100, 30, wallLength);
      expect(width).toBe(60);
    });

    it('strictly prevents shrinking a door below 60cm via start handle', () => {
      // Start handle dragged towards the right edge
      const res = clampResizeStart('door', 100, 90, 180, wallLength);
      expect(res.widthCm).toBe(60);
      expect(res.offsetCm).toBe(130); // 100 + 90 - 60 = 130
    });

    it('strictly clamps door maximum width to 120cm', () => {
      const width = clampResizeEnd('door', 100, 200, wallLength);
      expect(width).toBe(120);
    });

    it('strictly clamps window maximum width to 240cm', () => {
      const width = clampResizeEnd('window', 100, 350, wallLength);
      expect(width).toBe(240);
    });

    it('prevents end handle resize from clipping through end corner', () => {
      // Door near corner: offset 400 on a 500cm wall
      // 500 - 400 - 15 = 85cm max possible width before hitting corner
      const width = clampResizeEnd('door', 400, 110, wallLength);
      expect(width).toBe(85);
      expect(400 + width).toBe(485); // exactly 15cm from corner
    });

    it('prevents start handle resize from clipping through start corner', () => {
      // Opening with rightEdge = 150. Drag start handle to -50
      const res = clampResizeStart('window', 50, 100, -50, wallLength);
      expect(res.offsetCm).toBe(OPENING_LIMITS.cornerMargin); // 15cm
      expect(res.widthCm).toBe(135); // 150 - 15 = 135
    });
  });

  describe('clampOpening store validation', () => {
    it('normalizes illegal negative offsets and tiny widths', () => {
      const res = clampOpening('door', -50, 20, wallLength);
      expect(res.offsetCm).toBe(15);
      expect(res.widthCm).toBe(60);
    });

    it('normalizes excessive widths and wall-overflowing offsets', () => {
      const res = clampOpening('door', 450, 200, wallLength);
      expect(res.widthCm).toBe(120);
      expect(res.offsetCm).toBe(500 - 120 - 15); // 365
    });

    it('safely handles NaN and undefined inputs without crashing', () => {
      const res1 = clampOpening('door', NaN, undefined, 500);
      expect(Number.isFinite(res1.offsetCm)).toBe(true);
      expect(Number.isFinite(res1.widthCm)).toBe(true);

      const res2 = clampOpening('window', undefined, NaN, 500);
      expect(Number.isFinite(res2.offsetCm)).toBe(true);
      expect(Number.isFinite(res2.widthCm)).toBe(true);
    });
  });

  describe('getOpeningGeometry 2D and 3D Canonical Mapping', () => {
    const roomW = 500;
    const roomD = 400;

    it('maps top and bottom walls to the same physical X coordinate for identical offsets', () => {
      const topGeom = getOpeningGeometry('top', 60, 90, roomW, roomD);
      const bottomGeom = getOpeningGeometry('bottom', 60, 90, roomW, roomD);

      expect(topGeom.isHorizontal).toBe(true);
      expect(bottomGeom.isHorizontal).toBe(true);
      // Both must have identical 3D X centers (offset 60cm + 45cm = 105cm from West: (105 - 250) / 100 = -1.45m)
      expect(topGeom.centerM).toBe(-1.45);
      expect(bottomGeom.centerM).toBe(-1.45);
    });

    it('maps left and right walls to the same physical Z coordinate for identical offsets', () => {
      const leftGeom = getOpeningGeometry('left', 80, 100, roomW, roomD);
      const rightGeom = getOpeningGeometry('right', 80, 100, roomW, roomD);

      expect(leftGeom.isHorizontal).toBe(false);
      expect(rightGeom.isHorizontal).toBe(false);
      // Both must have identical 3D Z centers (offset 80cm + 50cm = 130cm from North: (130 - 200) / 100 = -0.7m)
      expect(leftGeom.centerM).toBe(-0.7);
      expect(rightGeom.centerM).toBe(-0.7);
    });

    it('ensures offset 0 corresponds to West on horizontal walls and North on vertical walls', () => {
      const topStart = getOpeningGeometry('top', 0, 0, roomW, roomD);
      expect(topStart.centerM).toBe(-roomW / 2 / 100); // -2.5m (West edge)

      const leftStart = getOpeningGeometry('left', 0, 0, roomW, roomD);
      expect(leftStart.centerM).toBe(-roomD / 2 / 100); // -2.0m (North edge)
    });
  });
});

