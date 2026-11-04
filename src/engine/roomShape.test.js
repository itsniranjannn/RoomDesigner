import { describe, it, expect } from 'vitest';
import {
  traceOutline,
  polygonArea,
  pointInOutline,
  cornersInOutline,
  pieceOutsideOutline,
  nudgeIntoOutline,
  outlineEdges,
  pointOnEdge,
  sanitizeOutline,
  distancesToOutline,
} from './roomShape.js';

// An L: 4 x 2 cells on top, 2 x 2 cells below on the left (cells are 10 cm)
const L_RUNS = [
  [0, 0, 4],
  [1, 0, 4],
  [2, 0, 2],
  [3, 0, 2],
];

describe('traceOutline', () => {
  it('traces a rectangle as four corners', () => {
    const r = traceOutline([
      [0, 0, 5],
      [1, 0, 5],
    ]);
    expect(r.outline).toHaveLength(4);
    expect(polygonArea(r.outline)).toBe(5 * 2 * 100);
    expect(r.openEdges).toEqual([]);
  });

  it('traces an L as six corners with the right area, clockwise', () => {
    const r = traceOutline(L_RUNS);
    expect(r.outline).toHaveLength(6);
    expect(polygonArea(r.outline)).toBe((8 + 4) * 100);
    // Clockwise on screen: the first edge runs east along the top
    const e = outlineEdges({ outline: r.outline })[0];
    expect(e.dx).toBe(1);
    expect(e.ny).toBe(1); // the room is below the top edge
  });

  it('moves the corners by the origin', () => {
    const r = traceOutline([[3, 2, 4]], { x: 20, y: 30 });
    expect(r.outline[0]).toEqual([0, 0]);
  });

  it('flags open edges and splits an edge where openness changes', () => {
    const open = new Set(['h2,0', 'h3,0']); // part of the top edge
    const r = traceOutline([[0, 0, 5]], { x: 0, y: 0 }, open);
    expect(r.outline.length).toBeGreaterThan(4);
    const edges = outlineEdges({ outline: r.outline, openEdges: r.openEdges });
    const openLen = edges.filter((e) => e.open).reduce((n, e) => n + e.len, 0);
    expect(openLen).toBe(20);
  });
});

describe('point and piece containment', () => {
  const L = traceOutline(L_RUNS).outline; // 40 x 40 box minus the lower right
  it('knows the notch is outside', () => {
    expect(pointInOutline(10, 10, L)).toBe(true);
    expect(pointInOutline(30, 30, L)).toBe(false);
    expect(pointInOutline(20, 20, L)).toBe(true); // on the corner
  });

  it('accepts a piece that fits and rejects one that crosses the notch', () => {
    expect(pieceOutsideOutline({ x: 10, y: 10, widthCm: 10, depthCm: 10 }, L)).toBe(false);
    // All four corners inside the bounding box, but the piece cuts the reflex corner
    expect(pieceOutsideOutline({ x: 20, y: 20, widthCm: 20, depthCm: 20 }, L)).toBe(true);
    expect(pieceOutsideOutline({ x: 30, y: 30, widthCm: 6, depthCm: 6 }, L)).toBe(true);
  });

  it('handles rotated pieces', () => {
    const corners = [
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 10, y: 20 },
      { x: 0, y: 10 },
    ];
    expect(cornersInOutline(corners, L)).toBe(true);
  });

  it('nudges a piece out of the notch back into the room', () => {
    const item = { x: 32, y: 32, widthCm: 8, depthCm: 8, rotationDeg: 0 };
    const moved = nudgeIntoOutline(item, L);
    expect(pieceOutsideOutline({ ...item, ...moved }, L)).toBe(false);
  });

  it('leaves a fitting piece where it is', () => {
    const item = { x: 10, y: 10, widthCm: 8, depthCm: 8 };
    expect(nudgeIntoOutline(item, L)).toEqual({ x: 10, y: 10 });
  });
});

describe('edges', () => {
  it('places points along an edge and into the room', () => {
    const outline = traceOutline([
      [0, 0, 4],
      [1, 0, 4],
    ]).outline; // 40 x 20
    const top = outlineEdges({ outline })[0];
    expect(pointOnEdge(top, 10, 5)).toEqual({ x: 10, y: 5 });
  });

  it('measures the gap to the walls on each side', () => {
    const outline = traceOutline([
      [0, 0, 10],
      [1, 0, 10],
      [2, 0, 10],
    ]).outline; // 100 x 30
    const d = distancesToOutline({ minX: 20, maxX: 40, minY: 10, maxY: 20 }, outline);
    expect(d).toEqual({ left: 20, right: 60, top: 10, bottom: 10 });
  });
});

describe('sanitizeOutline', () => {
  it('keeps a sound outline and drops junk', () => {
    expect(
      sanitizeOutline([
        [0, 0],
        [400, 0],
        [400, 300],
        [0, 300],
      ])
    ).toHaveLength(4);
    expect(
      sanitizeOutline([
        [0, 0],
        [1, 1],
      ])
    ).toBeNull();
    expect(
      sanitizeOutline([
        [0, 0],
        [NaN, 0],
        [5, 5],
      ])
    ).toBeNull();
    expect(sanitizeOutline('x')).toBeNull();
    expect(
      sanitizeOutline([
        [0, 0],
        [5, 0],
        [5, 5],
      ])
    ).toBeNull(); // too small
  });
});
