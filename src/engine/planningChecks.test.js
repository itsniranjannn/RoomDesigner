import { describe, it, expect } from 'vitest';
import {
  freeDepthInFront,
  gatherPieces,
  runPlanChecks,
  serviceFootprint,
  turningSpace,
} from './planningChecks.js';
import { buildFloorGrid, circleFits, widestRoutes, cellOf } from './floorGrid.js';

let n = 0;
const piece = (furnitureTypeId, x, y, rotationDeg = 0, extra = {}) => ({
  id: `p${++n}`,
  furnitureTypeId,
  x,
  y,
  rotationDeg,
  ...extra,
});

const room = (extra = {}) => ({
  id: 'r',
  name: 'Test',
  widthCm: 400,
  depthCm: 300,
  doors: [{ id: 'd1', wall: 'bottom', offsetCm: 155, widthCm: 90 }],
  windows: [],
  placedFurniture: [],
  services: [],
  ...extra,
});

const codes = (r, opts) => runPlanChecks(r, opts).issues.map((i) => i.code);
const find = (r, code, opts) => runPlanChecks(r, opts).issues.filter((i) => i.code === code);

describe('floor grid', () => {
  it('measures corridor width between two obstacles', () => {
    const r = room();
    const left = [
      { x: 0, y: 100 },
      { x: 150, y: 100 },
      { x: 150, y: 200 },
      { x: 0, y: 200 },
    ];
    const right = [
      { x: 240, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 200 },
      { x: 240, y: 200 },
    ];
    const grid = buildFloorGrid(r, [left, right]);
    const mid = cellOf(grid, 195, 150);
    expect(grid.free[mid]).toBe(1);
    // gap is 90 cm wide
    expect(grid.dist[mid] * 2).toBeGreaterThan(84);
    expect(grid.dist[mid] * 2).toBeLessThan(96);
  });

  it('finds the widest route and reports unreachable pockets as 0', () => {
    const r = room();
    const wall = [
      { x: 0, y: 140 },
      { x: 400, y: 140 },
      { x: 400, y: 160 },
      { x: 0, y: 160 },
    ];
    const grid = buildFloorGrid(r, [wall]);
    const routes = widestRoutes(grid, [cellOf(grid, 200, 250)]);
    expect(routes[cellOf(grid, 100, 220)]).toBeGreaterThan(60);
    expect(routes[cellOf(grid, 200, 50)]).toBe(0);
  });

  it('keeps cells outside an outline blocked', () => {
    const lShape = room({
      outline: [
        [0, 0],
        [200, 0],
        [200, 150],
        [400, 150],
        [400, 300],
        [0, 300],
      ],
    });
    const grid = buildFloorGrid(lShape, []);
    expect(grid.free[cellOf(grid, 300, 50)]).toBe(0);
    expect(grid.free[cellOf(grid, 100, 50)]).toBe(1);
  });

  it('fits a circle only where there is room', () => {
    const grid = buildFloorGrid(room({ widthCm: 200, depthCm: 200 }), []);
    expect(circleFits(grid, 150).runs.length).toBeGreaterThan(0);
    expect(circleFits(grid, 210).runs).toHaveLength(0);
    const best = circleFits(grid, 150).best;
    expect(best.x).toBeGreaterThan(90);
    expect(best.x).toBeLessThan(110);
  });
});

describe('doors', () => {
  it('flags a door that is too narrow to roll through', () => {
    const narrow = room({ doors: [{ id: 'd1', wall: 'bottom', offsetCm: 155, widthCm: 70 }] });
    const issue = find(narrow, 'door-narrow')[0];
    expect(issue.severity).toBe('warning');
    expect(issue.message).toMatch(/70 cm wide/);
    expect(issue.focus).toEqual({ type: 'opening', id: 'd1' });
    expect(codes(room())).not.toContain('door-narrow');
  });

  it('flags a piece standing in a door swing as an error with a Show target', () => {
    const r = room({ placedFurniture: [piece('armchair', 150, 250)] });
    const issue = find(r, 'door-blocked')[0];
    expect(issue.severity).toBe('error');
    expect(issue.itemId).toBe(r.placedFurniture[0].id);
    expect(issue.focus.type).toBe('item');
    expect(issue.message).toMatch(/Door 1/);
  });

  it('depends on which side the door is hinged', () => {
    // A small lamp near the far jamb, halfway into the room: the leaf hinged at the far jamb
    // sweeps over it, the leaf hinged at the start jamb never reaches it
    const lamp = piece('floor-lamp', 103, 235, 0, { overrides: { widthCm: 14, depthCm: 14 } });
    const door = { id: 'd1', wall: 'bottom', offsetCm: 20, widthCm: 90 };
    const atStart = room({ doors: [door], placedFurniture: [lamp] });
    const atEnd = room({ doors: [{ ...door, hingeSide: 'end' }], placedFurniture: [lamp] });
    expect(codes(atStart)).not.toContain('door-blocked');
    expect(codes(atEnd)).toContain('door-blocked');
  });

  it('only asks for a landing, as a warning, when the door opens outwards', () => {
    const door = {
      id: 'd1',
      wall: 'bottom',
      offsetCm: 155,
      widthCm: 90,
      swingDirection: 'outward',
    };
    const close = room({ doors: [door], placedFurniture: [piece('armchair', 200, 260)] });
    const issue = find(close, 'door-blocked')[0];
    expect(issue.severity).toBe('warning');
    const far = room({ doors: [door], placedFurniture: [piece('armchair', 200, 190)] });
    expect(codes(far)).not.toContain('door-blocked');
  });

  it('ignores rugs and low mats in the swing', () => {
    expect(codes(room({ placedFurniture: [piece('rug-living', 200, 200)] }))).not.toContain(
      'door-blocked'
    );
  });

  it('flags two doors that swing into each other', () => {
    const r = room({
      doors: [
        { id: 'a', wall: 'bottom', offsetCm: 20, widthCm: 90 },
        { id: 'b', wall: 'left', offsetCm: 200, widthCm: 90, hingeSide: 'end' },
      ],
    });
    expect(codes(r)).toContain('door-clash');
    expect(codes(room())).not.toContain('door-clash');
  });
});

describe('windows', () => {
  const win = (extra = {}) => ({ id: 'w1', wall: 'top', offsetCm: 100, widthCm: 120, ...extra });

  it('flags a tall piece where an inward window swings', () => {
    const r = room({
      windows: [win({ swing: 'inward' })],
      placedFurniture: [piece('wardrobe-2door', 160, 30)],
    });
    expect(find(r, 'window-blocked')[0]).toMatchObject({ severity: 'warning', openingId: 'w1' });
  });

  it('lets a low sofa sit under an opening window', () => {
    const r = room({
      windows: [win({ swing: 'inward' })],
      placedFurniture: [piece('sofa-3seat', 160, 50)],
    });
    expect(codes(r)).not.toContain('window-blocked');
  });

  it('mentions a tall piece that merely covers a fixed window, as a tip', () => {
    const r = room({ windows: [win()], placedFurniture: [piece('wardrobe-2door', 160, 30)] });
    expect(codes(r)).not.toContain('window-blocked');
    expect(find(r, 'window-covered')[0].severity).toBe('info');
  });

  it('does not flag a window that opens outwards', () => {
    const r = room({
      windows: [win({ swing: 'outward' })],
      placedFurniture: [piece('wardrobe-2door', 160, 30)],
    });
    expect(codes(r)).not.toContain('window-blocked');
  });
});

describe('walking paths', () => {
  // A barrier across the room with a gap of the given width in the middle, a sofa behind it
  const withGap = (gap) => {
    const leftEdge = 200 - gap / 2;
    const rightEdge = 200 + gap / 2;
    return room({
      doors: [{ id: 'd1', wall: 'bottom', offsetCm: 155, widthCm: 90 }],
      placedFurniture: [
        piece('wardrobe-3door', leftEdge - 90, 150), // 180 wide
        piece('wardrobe-3door', rightEdge + 90, 150),
        piece('sofa-3seat', 200, 50),
      ],
      widthCm: Math.max(400, rightEdge + 180),
    });
  };

  it('is happy with a comfortable gap', () => {
    const r = withGap(110);
    expect(codes(r)).not.toContain('path-narrow');
    expect(codes(r)).not.toContain('path-blocked');
  });

  it('measures a narrow gap on the way to a piece', () => {
    const issue = find(withGap(70), 'path-narrow')[0];
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('warning');
    expect(issue.message).toMatch(/sofa/);
    const width = Number(issue.message.match(/about (\d+) cm/)[1]);
    expect(width).toBeGreaterThanOrEqual(65);
    expect(width).toBeLessThanOrEqual(75);
  });

  it('gives a gentle tip for a path just under 90 cm', () => {
    const issue = find(withGap(80), 'path-narrow')[0];
    expect(issue.severity).toBe('info');
  });

  it('calls a very tight squeeze an error', () => {
    const issue = find(withGap(52), 'path-narrow')[0];
    expect(issue.severity).toBe('error');
  });

  it('reports a piece that cannot be reached at all', () => {
    const issue = find(withGap(20), 'path-blocked')[0];
    expect(issue.severity).toBe('error');
    expect(issue.itemId).toBeTruthy();
  });

  it('wants a wider main route in accessible mode', () => {
    const r = withGap(100);
    expect(codes(r)).not.toContain('path-narrow');
    const strict = find(r, 'path-narrow', { accessible: true })[0];
    expect(strict).toBeTruthy();
    expect(strict.message).toMatch(/wheelchair/);
  });

  it('notices when every door is blocked', () => {
    const r = room({ placedFurniture: [piece('sofa-3seat', 200, 250)] });
    const issue = find(r, 'entrance-blocked')[0];
    expect(issue.severity).toBe('error');
  });

  it('skips path checks in a room with no doors', () => {
    const r = room({ doors: [], placedFurniture: [piece('sofa-3seat', 200, 250)] });
    expect(codes(r)).not.toContain('entrance-blocked');
  });

  it('checks the route between two doors in accessible mode', () => {
    const r = room({
      doors: [
        { id: 'a', wall: 'bottom', offsetCm: 20, widthCm: 90 },
        { id: 'b', wall: 'bottom', offsetCm: 290, widthCm: 90 },
      ],
      // Two wardrobes standing on end split the room, leaving a 70 cm gap between them
      placedFurniture: [
        piece('wardrobe-2door', 200, 240, 90),
        piece('wardrobe-2door', 200, 50, 90),
      ],
    });
    const issue = find(r, 'route-narrow', { accessible: true })[0];
    expect(issue.severity).toBe('warning');
    expect(Number(issue.message.match(/about (\d+) cm/)[1])).toBeGreaterThanOrEqual(65);
    expect(codes(r)).not.toContain('route-narrow');
  });

  it('works in an L-shaped room', () => {
    const r = room({
      outline: [
        [0, 0],
        [200, 0],
        [200, 150],
        [400, 150],
        [400, 300],
        [0, 300],
      ],
      placedFurniture: [piece('sofa-3seat', 100, 60)],
    });
    expect(codes(r)).not.toContain('path-blocked');
  });
});

describe('front clearance', () => {
  it('flags units that face each other too closely', () => {
    const r = room({
      placedFurniture: [
        piece('kitchen-counter', 200, 32.5, 0),
        piece('kitchen-counter', 200, 120, 180),
      ],
    });
    const tight = find(r, 'front-tight');
    expect(tight.length).toBe(2);
    expect(tight[0].severity).toBe('warning');
    expect(tight[0].message).toMatch(/90 cm/);
  });

  it('is fine with a roomy aisle', () => {
    const r = room({
      placedFurniture: [
        piece('kitchen-counter', 200, 32.5, 0),
        piece('kitchen-counter', 200, 200, 180),
      ],
    });
    expect(codes(r)).not.toContain('front-tight');
  });

  it('counts the room wall as a limit', () => {
    const r = room({ placedFurniture: [piece('sink-unit', 200, 32.5, 180)] });
    // facing the top wall: no room at all in front
    expect(codes(r)).toContain('front-tight');
  });

  it('wants more space in accessible mode', () => {
    const r = room({
      placedFurniture: [
        piece('kitchen-counter', 200, 32.5, 0),
        piece('kitchen-counter', 200, 220, 180),
      ],
    });
    // 122 cm aisle: fine for most people, just right for a wheelchair
    expect(codes(r)).not.toContain('front-tight');
    expect(codes(r, { accessible: true })).not.toContain('front-tight');
    const tighter = room({
      placedFurniture: [
        piece('kitchen-counter', 200, 32.5, 0),
        piece('kitchen-counter', 200, 192.5, 180),
      ],
    });
    expect(codes(tighter)).not.toContain('front-tight');
    expect(codes(tighter, { accessible: true })).toContain('front-tight');
  });

  it('measures free depth directly', () => {
    const r = room({ placedFurniture: [piece('wardrobe-2door', 200, 30, 0)] });
    const [p] = gatherPieces(r);
    expect(freeDepthInFront(r, p, [], 150)).toBe(150);
    const box = gatherPieces(room({ placedFurniture: [piece('bookshelf', 200, 150, 0)] }));
    expect(freeDepthInFront(r, p, box, 150)).toBeLessThan(75);
    expect(freeDepthInFront(r, p, box, 150)).toBeGreaterThan(65);
  });
});

describe('turning circle', () => {
  it('shows where a 150 cm circle fits', () => {
    const t = turningSpace(room());
    expect(t.fits).toBe(true);
    expect(t.best.x).toBeGreaterThan(100);
    expect(t.radius).toBe(75);
    expect(t.runs.length).toBeGreaterThan(0);
  });

  it('finds no space in a narrow room or a crowded one', () => {
    expect(turningSpace(room({ widthCm: 140, depthCm: 600 })).fits).toBe(false);
    const crowded = room({
      placedFurniture: [piece('bed-queen', 100, 150, 0), piece('sofa-3seat', 300, 150, 90)],
    });
    expect(turningSpace(crowded).fits).toBe(false);
  });

  it('only raises an issue in accessible mode', () => {
    const small = room({ widthCm: 220, depthCm: 220 });
    // 220 cm fits a 150 circle; make the room too narrow instead
    const narrow = room({
      widthCm: 140,
      depthCm: 400,
      doors: [{ id: 'd', wall: 'bottom', offsetCm: 25, widthCm: 90 }],
    });
    expect(codes(narrow)).not.toContain('no-turning-circle');
    expect(codes(narrow, { accessible: true })).toContain('no-turning-circle');
    expect(codes(small, { accessible: true })).not.toContain('no-turning-circle');
  });
});

describe('service points', () => {
  const socket = (x, y, extra = {}) => ({
    id: `s${x}-${y}`,
    kind: 'socket',
    x,
    y,
    rotationDeg: 0,
    ...extra,
  });

  it('suggests marking points when none exist but pieces need them', () => {
    const r = room({ placedFurniture: [piece('tv-43', 200, 50), piece('bed-queen', 200, 200)] });
    const issues = find(r, 'services-unmarked');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(codes(r)).not.toContain('no-socket');
  });

  it('flags a TV with no socket within 2 m', () => {
    const r = room({
      placedFurniture: [piece('tv-43', 200, 50)],
      services: [socket(8, 250, { rotationDeg: 270 })],
    });
    const issue = find(r, 'no-socket')[0];
    expect(issue.severity).toBe('warning');
    expect(issue.message).toMatch(/television/);
    expect(issue.message).toMatch(/2 m/);
  });

  it('accepts a socket within reach', () => {
    const r = room({
      placedFurniture: [piece('tv-43', 200, 50)],
      services: [socket(300, 8)],
    });
    expect(codes(r)).not.toContain('no-socket');
  });

  it('asks the same of beds and desks, as tips', () => {
    const r = room({
      placedFurniture: [piece('bed-queen', 120, 150), piece('desk-executive', 330, 250)],
      services: [socket(8, 20)],
    });
    const found = find(r, 'no-socket');
    expect(found.map((i) => i.severity)).toEqual(['info']);
    expect(found[0].itemId).toBe(r.placedFurniture[1].id);
  });

  it('is stricter for appliances (1.5 m) than for a TV (2 m)', () => {
    const fridge = piece('kitchen-fridge', 100, 40);
    const tv = piece('tv-43', 100, 40);
    const near = room({ placedFurniture: [fridge], services: [socket(240, 8)] });
    const mid = room({ placedFurniture: [fridge], services: [socket(317, 8)] });
    expect(codes(near)).not.toContain('no-socket');
    expect(codes(mid)).toContain('no-socket');
    expect(codes(room({ placedFurniture: [tv], services: [socket(317, 8)] }))).not.toContain(
      'no-socket'
    );
  });

  it('flags water fixtures with no supply or drain nearby', () => {
    const r = room({
      placedFurniture: [piece('sink-unit', 200, 40), piece('washing-machine', 60, 250)],
      services: [{ id: 'w', kind: 'water', x: 190, y: 8, rotationDeg: 0 }],
    });
    const water = find(r, 'no-water');
    expect(water).toHaveLength(1);
    expect(water[0].message).toMatch(/washing machine/);
    expect(find(r, 'no-drain').length).toBe(2);
  });

  it('is happy when supply and drain are close', () => {
    const r = room({
      placedFurniture: [piece('sink-unit', 200, 40)],
      services: [
        { id: 'w', kind: 'water', x: 190, y: 8, rotationDeg: 0 },
        { id: 'd', kind: 'drain', x: 200, y: 90, rotationDeg: 0 },
      ],
    });
    expect(codes(r)).not.toContain('no-water');
    expect(codes(r)).not.toContain('no-drain');
  });

  it('explains when only electrical points are marked', () => {
    const r = room({ placedFurniture: [piece('sink-unit', 200, 40)], services: [socket(8, 100)] });
    expect(codes(r)).toContain('no-plumbing-marked');
    expect(codes(r)).not.toContain('no-water');
  });

  it('checks the stove against gas points only when the room has gas', () => {
    const stove = piece('kitchen-stove', 200, 40);
    const noGas = room({
      placedFurniture: [stove],
      services: [{ id: 'w', kind: 'water', x: 20, y: 8, rotationDeg: 0 }],
    });
    expect(codes(noGas)).not.toContain('no-gas');
    const farGas = room({
      placedFurniture: [stove],
      services: [{ id: 'g', kind: 'gas', x: 380, y: 292, rotationDeg: 180 }],
    });
    expect(find(farGas, 'no-gas')[0].severity).toBe('info');
  });

  it('notices a wardrobe in front of a radiator', () => {
    const rad = { id: 'rad', kind: 'radiator', x: 200, y: 8, rotationDeg: 0 };
    const r = room({ placedFurniture: [piece('wardrobe-3door', 200, 35)], services: [rad] });
    const issue = find(r, 'service-covered')[0];
    expect(issue.serviceId).toBe('rad');
    expect(issue.focus).toEqual({ type: 'service', id: 'rad' });
    const clear = room({ placedFurniture: [piece('wardrobe-3door', 200, 120)], services: [rad] });
    expect(codes(clear)).not.toContain('service-covered');
  });

  it('notices wall points that have drifted off a wall', () => {
    const r = room({ services: [socket(200, 150)] });
    expect(codes(r)).toContain('service-off-wall');
    expect(codes(room({ services: [socket(200, 8)] }))).not.toContain('service-off-wall');
  });

  it('gives a footprint for each symbol', () => {
    const f = serviceFootprint({ kind: 'radiator', x: 200, y: 8, rotationDeg: 0 }, 0);
    const xs = f.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(165);
    expect(Math.max(...xs)).toBeCloseTo(235);
    const turned = serviceFootprint({ kind: 'radiator', x: 8, y: 150, rotationDeg: 270 }, 0);
    expect(Math.max(...turned.map((p) => p.x))).toBeGreaterThan(8);
  });
});

describe('results', () => {
  it('lists errors before warnings before tips and counts them', () => {
    const r = room({
      doors: [{ id: 'd1', wall: 'bottom', offsetCm: 155, widthCm: 70 }],
      placedFurniture: [piece('armchair', 150, 250), piece('tv-43', 200, 50)],
      services: [{ id: 's', kind: 'socket', x: 8, y: 280, rotationDeg: 270 }],
    });
    const { issues, counts } = runPlanChecks(r);
    const rank = { error: 0, warning: 1, info: 2 };
    for (let i = 1; i < issues.length; i++) {
      expect(rank[issues[i].severity]).toBeGreaterThanOrEqual(rank[issues[i - 1].severity]);
    }
    expect(counts.total).toBe(issues.length);
    expect(counts.error + counts.warning + counts.info).toBe(issues.length);
    expect(counts.error).toBeGreaterThan(0);
    expect(new Set(issues.map((i) => i.id)).size).toBe(issues.length);
  });

  it('every issue has plain text and a place to show', () => {
    const r = room({
      doors: [{ id: 'd1', wall: 'bottom', offsetCm: 155, widthCm: 70 }],
      placedFurniture: [
        piece('armchair', 150, 250),
        piece('tv-43', 200, 50),
        piece('sink-unit', 40, 40),
      ],
      services: [{ id: 's', kind: 'socket', x: 8, y: 280, rotationDeg: 270 }],
    });
    for (const i of runPlanChecks(r, { accessible: true }).issues) {
      expect(i.title.length).toBeGreaterThan(3);
      expect(i.message.length).toBeGreaterThan(10);
      expect(Number.isFinite(i.point.x) && Number.isFinite(i.point.y)).toBe(true);
      expect(i.focus.type).toMatch(/item|opening|service|spot/);
      expect(i.message).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('reports what was checked', () => {
    const { checked } = runPlanChecks(room());
    expect(checked.map((c) => c.id)).toContain('doors');
    expect(checked.every((c) => c.issues === 0)).toBe(true);
    expect(runPlanChecks(room(), { accessible: true }).checked.map((c) => c.id)).toContain(
      'turning'
    );
  });

  it('is calm for an empty room and for a null room', () => {
    expect(runPlanChecks(room()).issues).toEqual([]);
    expect(runPlanChecks(null).issues).toEqual([]);
  });

  it('copes with rooms without doors, damaged lists and unknown pieces', () => {
    const r = room({
      doors: undefined,
      windows: undefined,
      services: 'oops',
      placedFurniture: [piece('does-not-exist', 10, 10), piece('sofa-3seat', 200, 100)],
    });
    expect(() => runPlanChecks(r, { accessible: true })).not.toThrow();
  });

  it('stays quick on a big, full room', () => {
    const pieces = [];
    for (let i = 0; i < 12; i++)
      pieces.push(piece('sofa-3seat', 150 + (i % 4) * 280, 150 + Math.floor(i / 4) * 250));
    const big = room({ widthCm: 1200, depthCm: 800, placedFurniture: pieces });
    const t = Date.now();
    runPlanChecks(big, { accessible: true });
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
