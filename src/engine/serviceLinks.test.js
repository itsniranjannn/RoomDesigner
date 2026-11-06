import { describe, it, expect } from 'vitest';
import {
  closestPointOnPolygon,
  computeServiceLinks,
  needsOf,
  summarizeLinks,
} from './serviceLinks.js';
import { runPlanChecks } from './planningChecks.js';

let n = 0;
const piece = (furnitureTypeId, x, y, rotationDeg = 0) => ({
  id: `p${++n}`,
  furnitureTypeId,
  x,
  y,
  rotationDeg,
});
const svc = (kind, x, y) => ({ id: `s${++n}`, kind, x, y, rotationDeg: 0 });
const room = (extra = {}) => ({
  id: 'r',
  name: 'Test',
  widthCm: 500,
  depthCm: 400,
  doors: [{ id: 'd1', wall: 'bottom', offsetCm: 200, widthCm: 90 }],
  windows: [],
  placedFurniture: [],
  services: [],
  ...extra,
});
const link = (links, itemId, need) => links.find((l) => l.itemId === itemId && l.need === need);

describe('service links', () => {
  it('draws nothing until a service point is marked', () => {
    const r = room({ placedFurniture: [piece('tv-43', 250, 40)] });
    expect(computeServiceLinks(r)).toEqual([]);
    expect(computeServiceLinks(null)).toEqual([]);
  });

  it('knows what each kind of piece relies on', () => {
    expect(needsOf('sink-unit').map((x) => x.need)).toEqual(['water', 'drain']);
    expect(needsOf('kitchen-stove').map((x) => x.need)).toEqual(['gas']);
    expect(needsOf('washing-machine').map((x) => x.need)).toEqual(['socket', 'water', 'drain']);
    expect(needsOf('tv-55').map((x) => x.need)).toEqual(['socket']);
    expect(needsOf('table-lamp').map((x) => x.need)).toEqual(['socket']);
    expect(needsOf('sofa-3seat')).toEqual([]);
  });

  it('links a sink to the nearest water and drain within reach', () => {
    const sink = piece('sink-unit', 200, 40);
    const r = room({
      placedFurniture: [sink],
      services: [svc('water', 120, 8), svc('water', 450, 8), svc('drain', 200, 70)],
    });
    const links = computeServiceLinks(r);
    const w = link(links, sink.id, 'water');
    expect(w.status).toBe('ok');
    expect(w.from).toEqual({ x: 120, y: 8 });
    expect(w.tag).toBeNull();
    expect(link(links, sink.id, 'drain').status).toBe('ok');
    // the line ends on the piece edge, not its centre
    expect(w.to.x).toBeGreaterThan(120);
    expect(w.to.x).toBeLessThan(200);
  });

  it('marks a link far when the nearest point is out of reach, with a tag', () => {
    const sink = piece('sink-unit', 400, 40);
    const r = room({
      placedFurniture: [sink],
      services: [svc('water', 20, 8), svc('drain', 400, 40)],
    });
    const w = link(computeServiceLinks(r), sink.id, 'water');
    expect(w.status).toBe('far');
    expect(w.tag).toBe('no water nearby');
    expect(w.distanceCm).toBeGreaterThan(150);
    expect(w.from).toEqual({ x: 20, y: 8 });
  });

  it('marks a link missing when its group is marked but not this kind', () => {
    const stove = piece('kitchen-stove', 200, 40);
    const sink = piece('sink-unit', 300, 40);
    const r = room({ placedFurniture: [stove, sink], services: [svc('water', 300, 8)] });
    const links = computeServiceLinks(r);
    // no gas point anywhere: gas is not judged
    expect(link(links, stove.id, 'gas')).toBeUndefined();
    const d = link(links, sink.id, 'drain');
    expect(d.status).toBe('missing');
    expect(d.from).toBeNull();
    expect(d.serviceId).toBeNull();
    expect(d.tag).toBe('no drain nearby');
  });

  it('judges gas once a gas point exists, and power only once electrical points exist', () => {
    const stove = piece('kitchen-stove', 200, 40);
    const tv = piece('tv-43', 400, 300);
    const only = room({ placedFurniture: [stove, tv], services: [svc('gas', 210, 8)] });
    let links = computeServiceLinks(only);
    expect(link(links, stove.id, 'gas').status).toBe('ok');
    expect(link(links, tv.id, 'socket')).toBeUndefined();
    links = computeServiceLinks({ ...only, services: [svc('switch', 10, 200)] });
    expect(link(links, tv.id, 'socket').status).toBe('missing');
  });

  it('uses a shorter reach for appliances than for a bed or TV', () => {
    const fridge = piece('kitchen-fridge', 100, 40);
    const r = room({ placedFurniture: [fridge], services: [svc('socket', 100, 380)] });
    expect(link(computeServiceLinks(r), fridge.id, 'socket').status).toBe('far');
    const near = { ...r, services: [svc('socket', 100, 8)] };
    expect(link(computeServiceLinks(near), fridge.id, 'socket').status).toBe('ok');
  });

  it('agrees with the Plan checks on which pieces lack a point', () => {
    const items = [
      piece('sink-unit', 100, 40),
      piece('washing-machine', 420, 40),
      piece('tv-43', 250, 350),
      piece('kitchen-stove', 250, 40),
      piece('bed-double', 250, 200),
    ];
    const r = room({
      placedFurniture: items,
      services: [
        svc('water', 100, 8),
        svc('drain', 100, 70),
        svc('socket', 20, 200),
        svc('gas', 400, 8),
      ],
    });
    const broken = new Set(
      computeServiceLinks(r)
        .filter((l) => l.status !== 'ok')
        .map((l) => `${l.itemId}:${l.need}`)
    );
    const codeNeed = {
      'no-socket': 'socket',
      'no-water': 'water',
      'no-drain': 'drain',
      'no-gas': 'gas',
    };
    const flagged = new Set(
      runPlanChecks(r)
        .issues.filter((i) => codeNeed[i.code])
        .map((i) => `${i.itemId}:${codeNeed[i.code]}`)
    );
    expect(broken.size).toBeGreaterThan(0);
    expect(broken).toEqual(flagged);
  });

  it('works in an outline-shaped room', () => {
    const outline = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 200 },
      { x: 250, y: 200 },
      { x: 250, y: 400 },
      { x: 0, y: 400 },
    ];
    const sink = piece('sink-unit', 100, 330);
    const r = room({
      outline,
      placedFurniture: [sink],
      services: [svc('water', 8, 330), svc('drain', 100, 380)],
    });
    const links = computeServiceLinks(r);
    expect(link(links, sink.id, 'water').status).toBe('ok');
    expect(link(links, sink.id, 'drain').status).toBe('ok');
  });

  it('summarizes by status and finds the closest point on a polygon', () => {
    expect(summarizeLinks([{ status: 'ok' }, { status: 'far' }, { status: 'ok' }])).toEqual({
      ok: 2,
      far: 1,
      missing: 0,
      total: 3,
    });
    const sq = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(closestPointOnPolygon({ x: 20, y: 5 }, sq)).toEqual({ x: 10, y: 5 });
    expect(closestPointOnPolygon({ x: 5, y: 5 }, sq)).toEqual({ x: 5, y: 5 });
  });
});
