import { describe, it, expect } from 'vitest';
import {
  FLOORS,
  WALLS,
  getFloor,
  getWall,
  normalizeFinish,
  isClassicFinish,
  withFinish,
  finishForStorage,
  applyFinish,
} from './materials.js';
import { normalizeQuality, resolveQuality, settingsFor, QUALITY_SETTINGS } from './quality.js';
import { collectLamps, isLampShape } from './lamps.js';

describe('finish definitions', () => {
  it('has the requested floors and unique ids', () => {
    const ids = FLOORS.map((f) => f.id);
    for (const id of ['plank', 'oak', 'walnut', 'tile', 'concrete', 'marble', 'carpet'])
      expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the paint palette plus brick, plaster and wood panel', () => {
    const ids = WALLS.map((w) => w.id);
    for (const id of [
      'warm-white',
      'cream',
      'sage',
      'blue-gray',
      'terracotta',
      'brick',
      'plaster',
      'panel',
    ])
      expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WALLS.filter((w) => w.paint).every((w) => w.texture === null)).toBe(true);
    expect(WALLS.filter((w) => !w.paint).every((w) => w.texture)).toBe(true);
  });

  it('gives every finish a size, roughness and swatch', () => {
    for (const f of [...FLOORS, ...WALLS]) {
      expect(f.tileM).toBeGreaterThan(0);
      expect(f.roughness).toBeGreaterThanOrEqual(0);
      expect(f.roughness).toBeLessThanOrEqual(1);
      expect(f.swatch).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(getFloor('oak').label).toBe('Light oak');
    expect(getWall('nope')).toBeNull();
  });
});

describe('finish settings migration', () => {
  it('treats a room without a finish as classic', () => {
    expect(normalizeFinish(undefined)).toEqual({ floor: null, wall: null });
    expect(normalizeFinish('oak')).toEqual({ floor: null, wall: null });
    expect(isClassicFinish(undefined)).toBe(true);
    expect(finishForStorage(undefined)).toBeUndefined();
  });

  it('drops unknown ids and keeps valid ones', () => {
    expect(normalizeFinish({ floor: 'lava', wall: 'brick' })).toEqual({
      floor: null,
      wall: 'brick',
    });
  });

  it('applies a change and returns to classic', () => {
    const a = withFinish(undefined, { floor: 'marble' });
    expect(a).toEqual({ floor: 'marble', wall: null });
    const b = withFinish(a, { wall: 'sage' });
    expect(b).toEqual({ floor: 'marble', wall: 'sage' });
    expect(withFinish(b, { floor: null })).toEqual({ floor: null, wall: 'sage' });
    expect(withFinish(b, { floor: 'nonsense' }).floor).toBeNull();
  });

  it('stores only chosen ids and removes the field when classic', () => {
    expect(finishForStorage({ floor: 'tile', wall: null })).toEqual({ floor: 'tile' });
    const room = { id: 'r', name: 'R' };
    const withTile = applyFinish(room, { floor: 'tile' });
    expect(withTile.finish).toEqual({ floor: 'tile' });
    expect(room.finish).toBeUndefined();
    const back = applyFinish(withTile, { floor: null });
    expect('finish' in back).toBe(false);
  });
});

describe('graphics quality', () => {
  it('normalizes unknown values to auto', () => {
    expect(normalizeQuality('ultra')).toBe('auto');
    expect(normalizeQuality(null)).toBe('auto');
    expect(normalizeQuality('high')).toBe('high');
  });

  it('keeps an explicit choice and adapts Auto to the device', () => {
    expect(resolveQuality('low', { width: 2000 })).toBe('low');
    expect(resolveQuality('high', { coarsePointer: true })).toBe('high');
    expect(resolveQuality('auto', { coarsePointer: true })).toBe('low');
    expect(resolveQuality('auto', { width: 500 })).toBe('low');
    expect(resolveQuality('auto', { width: 1600, memoryGb: 2 })).toBe('low');
    expect(resolveQuality('auto', { width: 1600, cores: 2 })).toBe('low');
    expect(resolveQuality('auto', { width: 1600, memoryGb: 8, cores: 8 })).toBe('high');
    expect(resolveQuality('auto', {})).toBe('high');
  });

  it('keeps Low lighter than High', () => {
    const low = settingsFor('low');
    const high = settingsFor('high');
    expect(low.shadowMap).toBeLessThan(high.shadowMap);
    expect(low.dpr[1]).toBeLessThan(high.dpr[1]);
    expect(low.environment).toBe(false);
    expect(low.contactShadows).toBe(false);
    expect(low.maxLamps).toBeLessThan(high.maxLamps);
    expect(settingsFor('weird')).toBe(QUALITY_SETTINGS.low);
  });
});

describe('lamps', () => {
  const resolve = (item) => item.def;
  it('finds lamps and places the light near the top of the shade', () => {
    const items = [
      { id: 'a', x: 300, y: 200, def: { shapeType: 'lamp', heightCm: 160 } },
      { id: 'b', x: 100, y: 100, elevationCm: 75, def: { shapeType: 'table-lamp', heightCm: 40 } },
      { id: 'c', x: 0, y: 0, def: { shapeType: 'sofa', heightCm: 80 } },
      { id: 'd', x: 0, y: 0, def: null },
    ];
    const lamps = collectLamps(items, 600, 400, resolve);
    expect(lamps.map((l) => l.id)).toEqual(['a', 'b']);
    expect(lamps[0]).toMatchObject({ x: 0, z: 0, tall: true });
    expect(lamps[0].y).toBeCloseTo(1.408, 2);
    expect(lamps[1].y).toBeCloseTo(0.75 + 0.352, 2);
    expect(lamps[1].tall).toBe(false);
    expect(isLampShape('lamp-torchiere')).toBe(true);
    expect(isLampShape('bed')).toBe(false);
  });
});
