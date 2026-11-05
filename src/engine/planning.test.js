import { describe, it, expect } from 'vitest';
import {
  SERVICE_KINDS,
  doorGeometry,
  doorZone,
  openingFrame,
  polygonsOverlap,
  positionService,
  rotationForInward,
  sanitizeServices,
  sectorPolygon,
  serviceLabels,
  servicesOf,
  snapToWall,
  windowLeaves,
  windowSwingZones,
  distanceToPolygon,
  WALL_FACE_CM,
} from './planning.js';
import { getClearanceZones, evaluateClearance } from './clearance.js';

const OUTLINE = [
  [0, 0],
  [400, 0],
  [400, 300],
  [0, 300],
];

const room = (extra = {}) => ({
  id: 'r',
  widthCm: 400,
  depthCm: 300,
  doors: [],
  windows: [],
  placedFurniture: [],
  ...extra,
});

describe('wall frames', () => {
  it('points inward on every wall of a rectangle', () => {
    const r = room();
    expect(openingFrame(r, { wall: 'top' }).n).toEqual({ x: 0, y: 1 });
    expect(openingFrame(r, { wall: 'bottom' }).n).toEqual({ x: 0, y: -1 });
    expect(openingFrame(r, { wall: 'left' }).n).toEqual({ x: 1, y: 0 });
    expect(openingFrame(r, { wall: 'right' }).n).toEqual({ x: -1, y: 0 });
  });

  it('places points along the wall and into the room', () => {
    const r = room();
    expect(openingFrame(r, { wall: 'bottom' }).at(100, 20)).toEqual({ x: 100, y: 280 });
    expect(openingFrame(r, { wall: 'right' }).at(50, 10)).toEqual({ x: 390, y: 50 });
  });

  it('falls back to the bottom wall for doors and the top wall for windows', () => {
    const r = room();
    expect(openingFrame(r, {}, 'door').n).toEqual({ x: 0, y: -1 });
    expect(openingFrame(r, {}, 'window').n).toEqual({ x: 0, y: 1 });
  });

  it('follows an outline edge', () => {
    const r = room({ outline: OUTLINE });
    const f = openingFrame(r, { edge: 0 });
    expect(f.len).toBe(400);
    expect(f.n.y).toBe(1);
    expect(f.at(10, 5)).toEqual({ x: 10, y: 5 });
    expect(openingFrame(r, { edge: 9 })).toBeNull();
  });

  it('turns a symbol so its back is on the wall', () => {
    expect(rotationForInward({ x: 0, y: 1 })).toBe(0);
    expect(rotationForInward({ x: -1, y: 0 })).toBe(90);
    expect(rotationForInward({ x: 0, y: -1 })).toBe(180);
    expect(rotationForInward({ x: 1, y: 0 })).toBe(270);
  });
});

describe('door geometry', () => {
  const door = (extra = {}) => ({ id: 'd1', wall: 'bottom', offsetCm: 100, widthCm: 90, ...extra });

  it('hinges at the start jamb by default and swings into the room', () => {
    const g = doorGeometry(room(), door());
    expect(g.hinge).toEqual({ x: 100, y: 300 });
    expect(g.far).toEqual({ x: 190, y: 300 });
    expect(g.tip).toEqual({ x: 100, y: 210 });
    expect(g.sweep).toBe(1); // the arc the plan has always drawn for this door
  });

  it('hinges at the far jamb when asked, mirroring the swing', () => {
    const g = doorGeometry(room(), door({ hingeSide: 'end' }));
    expect(g.hinge).toEqual({ x: 190, y: 300 });
    expect(g.far).toEqual({ x: 100, y: 300 });
    expect(g.tip).toEqual({ x: 190, y: 210 });
    expect(g.sweep).toBe(0);
  });

  it('swings outwards past the wall', () => {
    const g = doorGeometry(room(), door({ swingDirection: 'outward' }));
    expect(g.outward).toBe(true);
    expect(g.tip).toEqual({ x: 100, y: 390 });
    expect(g.sweep).toBe(0);
  });

  it('keeps the arc flag the plan used for every wall, hinge at the start', () => {
    const expected = { top: 0, bottom: 1, left: 1, right: 0 };
    for (const [wall, sweep] of Object.entries(expected)) {
      expect(doorGeometry(room(), door({ wall })).sweep).toBe(sweep);
    }
  });

  it('matches the outline arcs the plan has always drawn', () => {
    const r = room({ outline: OUTLINE });
    const inward = doorGeometry(r, { id: 'a', edge: 0, offsetCm: 50, widthCm: 90 });
    expect(inward.sweep).toBe(0);
    const outward = doorGeometry(r, {
      id: 'a',
      edge: 0,
      offsetCm: 50,
      widthCm: 90,
      swingDirection: 'outward',
    });
    expect(outward.sweep).toBe(1);
  });

  it('has no geometry on an open edge', () => {
    const r = room({ outline: OUTLINE, openEdges: [0] });
    expect(doorGeometry(r, { id: 'x', edge: 0, offsetCm: 50, widthCm: 90 })).toBeNull();
    expect(doorGeometry(r, { id: 'x', edge: 1, offsetCm: 50, widthCm: 90 })).not.toBeNull();
  });

  it('builds a quarter-disc zone for an inward door', () => {
    const z = doorZone(room(), door());
    expect(z.kind).toBe('door');
    const hinge = { x: 100, y: 300 };
    for (const p of z.corners) {
      expect(Math.hypot(p.x - hinge.x, p.y - hinge.y)).toBeLessThanOrEqual(90.01);
    }
    // The corner of the old square zone is outside the real swing
    expect(distanceToPolygon({ x: 189, y: 211 }, z.corners)).toBeGreaterThan(5);
    expect(distanceToPolygon({ x: 130, y: 250 }, z.corners)).toBe(0);
  });

  it('asks for a 60 cm landing in front of an outward door', () => {
    const z = doorZone(room(), door({ swingDirection: 'outward' }));
    expect(z.kind).toBe('door-landing');
    expect(z.corners[2]).toEqual({ x: 190, y: 240 });
  });

  it('moves the swing zone with the hinge side', () => {
    const start = doorZone(room(), door()).corners;
    const end = doorZone(room(), door({ hingeSide: 'end' })).corners;
    const nearStart = { x: 102, y: 270 };
    expect(distanceToPolygon(nearStart, start)).toBe(0);
    expect(distanceToPolygon(nearStart, end)).toBeGreaterThan(0);
  });
});

describe('window swings', () => {
  const win = (extra = {}) => ({ id: 'w1', wall: 'top', offsetCm: 100, widthCm: 120, ...extra });

  it('has no leaves for a fixed window', () => {
    expect(windowLeaves(room(), win())).toEqual([]);
    expect(windowSwingZones(room(), win())).toEqual([]);
  });

  it('opens a wide window with two leaves meeting in the middle', () => {
    const leaves = windowLeaves(room(), win({ swing: 'inward' }));
    expect(leaves).toHaveLength(2);
    expect(leaves[0].radius).toBe(60);
    expect(leaves[0].hinge).toEqual({ x: 100, y: 0 });
    expect(leaves[1].hinge).toEqual({ x: 220, y: 0 });
    expect(leaves[0].tip).toEqual({ x: 100, y: 60 });
  });

  it('opens a narrow window with one leaf on the chosen side', () => {
    const start = windowLeaves(room(), win({ swing: 'inward', widthCm: 60 }));
    const end = windowLeaves(room(), win({ swing: 'inward', widthCm: 60, hingeSide: 'end' }));
    expect(start).toHaveLength(1);
    expect(start[0].hinge.x).toBe(100);
    expect(end[0].hinge.x).toBe(160);
    expect(end[0].radius).toBe(60);
  });

  it('only sweeps floor space when it opens inward', () => {
    expect(windowSwingZones(room(), win({ swing: 'inward' }))).toHaveLength(2);
    expect(windowSwingZones(room(), win({ swing: 'outward' }))).toEqual([]);
    expect(windowLeaves(room(), win({ swing: 'outward' }))[0].tip.y).toBe(-60);
  });
});

describe('clearance zones follow the doors and windows', () => {
  it('honours the hinge side when something stands in the swing', () => {
    const base = {
      id: 'd1',
      wall: 'bottom',
      offsetCm: 100,
      widthCm: 90,
    };
    const chair = { id: 'a', furnitureTypeId: 'armchair', x: 112, y: 262, rotationDeg: 0 };
    const hingedAtStart = room({ doors: [base], placedFurniture: [chair] });
    const hingedAtEnd = room({ doors: [{ ...base, hingeSide: 'end' }], placedFurniture: [chair] });
    // The chair is close to the start jamb: the leaf sweeps it only when hinged there... or
    // also when hinged at the far jamb and swinging across. Either way the zone must follow the hinge.
    const zonesStart = getClearanceZones(hingedAtStart).find((z) => z.kind === 'door');
    const zonesEnd = getClearanceZones(hingedAtEnd).find((z) => z.kind === 'door');
    expect(zonesStart.corners[0]).toEqual({ x: 100, y: 300 });
    expect(zonesEnd.corners[0]).toEqual({ x: 190, y: 300 });
    expect(evaluateClearance(hingedAtStart).some((i) => i.kind === 'door-swing')).toBe(true);
  });

  it('adds swing zones for windows that open inward', () => {
    const r = room({
      windows: [{ id: 'w1', wall: 'top', offsetCm: 100, widthCm: 120, swing: 'inward' }],
    });
    const kinds = getClearanceZones(r).map((z) => z.kind);
    expect(kinds.filter((k) => k === 'window-swing')).toHaveLength(2);
    expect(kinds).toContain('window');
  });
});

describe('polygonsOverlap', () => {
  const sq = (x, y, s) => [
    { x, y },
    { x: x + s, y },
    { x: x + s, y: y + s },
    { x, y: y + s },
  ];
  it('detects overlap and separation', () => {
    expect(polygonsOverlap(sq(0, 0, 10), sq(5, 5, 10))).toBe(true);
    expect(polygonsOverlap(sq(0, 0, 10), sq(20, 0, 10))).toBe(false);
  });
  it('treats flush contact as not overlapping', () => {
    expect(polygonsOverlap(sq(0, 0, 10), sq(10, 0, 10))).toBe(false);
  });
  it('handles a sector with many corners', () => {
    const sector = sectorPolygon({ x: 0, y: 0 }, { x: 0, y: 90 }, { x: 90, y: 0 });
    expect(polygonsOverlap(sector, sq(70, 70, 20))).toBe(false); // outside the arc
    expect(polygonsOverlap(sector, sq(20, 20, 20))).toBe(true);
  });
});

describe('service points', () => {
  it('knows every kind', () => {
    for (const def of Object.values(SERVICE_KINDS)) {
      expect(['electrical', 'plumbing']).toContain(def.group);
      expect(['wall', 'floor', 'ceiling']).toContain(def.mount);
      expect(def.size.w).toBeGreaterThan(0);
      expect(def.label.length).toBeGreaterThan(2);
    }
  });

  it('snaps wall points to the nearest wall face and turns them inward', () => {
    const r = room();
    expect(snapToWall(r, 200, 20)).toMatchObject({
      x: 200,
      y: WALL_FACE_CM,
      rotationDeg: 0,
      wall: 'top',
    });
    expect(snapToWall(r, 395, 150)).toMatchObject({
      x: 392,
      y: 150,
      rotationDeg: 90,
      wall: 'right',
    });
    expect(snapToWall(r, 5, 150)).toMatchObject({ x: 8, y: 150, rotationDeg: 270, wall: 'left' });
    expect(snapToWall(r, 200, 290)).toMatchObject({
      x: 200,
      y: 292,
      rotationDeg: 180,
      wall: 'bottom',
    });
  });

  it('keeps wall points on a wall even when the pointer is out in the room', () => {
    const p = positionService(room(), 'socket', 200, 40);
    expect(p).toMatchObject({ x: 200, y: WALL_FACE_CM, rotationDeg: 0 });
  });

  it('snaps to outline walls but skips open edges', () => {
    const r = room({ outline: OUTLINE, openEdges: [0] });
    const s = snapToWall(r, 200, 10);
    expect(s.wall).not.toBe(0);
  });

  it('leaves floor and ceiling points where they are, inside the room', () => {
    const r = room();
    expect(positionService(r, 'drain', 120, 80)).toEqual({ x: 120, y: 80, rotationDeg: 0 });
    expect(positionService(r, 'ceiling', 900, -5)).toEqual({ x: 400, y: 0, rotationDeg: 0 });
    expect(positionService(r, 'nonsense', 1, 1)).toBeNull();
  });

  it('cleans untrusted lists', () => {
    const cleaned = sanitizeServices([
      { id: 'a', kind: 'socket', x: 10.04, y: 20, rotationDeg: 450 },
      { id: 'a', kind: 'water', x: 5, y: 5 },
      { kind: 'bogus', x: 1, y: 1 },
      { kind: 'gas', x: 'no', y: 1 },
      null,
      { id: 'n', kind: 'switch', x: 99999, y: -4, note: '  by the door  ' },
    ]);
    expect(cleaned.map((s) => s.kind)).toEqual(['socket', 'water', 'switch']);
    expect(new Set(cleaned.map((s) => s.id)).size).toBe(3);
    expect(cleaned[0]).toMatchObject({ x: 10, rotationDeg: 90 });
    expect(cleaned[2]).toMatchObject({ x: 4000, y: 0, note: 'by the door' });
    expect(sanitizeServices('nope')).toEqual([]);
    const many = Array.from({ length: 400 }, (_, i) => ({ kind: 'socket', x: i, y: i }));
    expect(sanitizeServices(many)).toHaveLength(300);
  });

  it('reads services off a room safely', () => {
    expect(servicesOf(room())).toEqual([]);
    expect(servicesOf(null)).toEqual([]);
    expect(servicesOf(room({ services: [{ id: 's', kind: 'ac', x: 1, y: 2 }] }))).toHaveLength(1);
  });

  it('numbers labels per kind', () => {
    const labels = serviceLabels([
      { id: 'a', kind: 'socket' },
      { id: 'b', kind: 'water' },
      { id: 'c', kind: 'socket' },
    ]);
    expect(labels).toEqual({ a: 'Socket 1', b: 'Water supply 1', c: 'Socket 2' });
  });
});

describe('distanceToPolygon', () => {
  const sq = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it('is zero inside and measures to the nearest edge outside', () => {
    expect(distanceToPolygon({ x: 5, y: 5 }, sq)).toBe(0);
    expect(distanceToPolygon({ x: 20, y: 5 }, sq)).toBe(10);
    expect(distanceToPolygon({ x: 13, y: 14 }, sq)).toBeCloseTo(5, 5);
    expect(distanceToPolygon({ x: 5, y: 5 }, [...sq].reverse())).toBe(0);
  });
});
