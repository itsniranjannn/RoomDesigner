import { describe, it, expect } from 'vitest';
import { FURNITURE_CATALOG, resolveItemDef, getFurnitureType } from './furnitureCatalog.js';
import { cleanOverrides } from '../engine/overrides.js';
import { evaluateAllCollisions } from '../engine/collision.js';
import { isPatternId, patternKindOf, patternOf } from '../components/preview3d/patterns.js';
import { SILHOUETTES } from '../components/canvas/silhouettes/index.js';
import { MODELS } from '../components/preview3d/models/index.js';
import { tintedCompanions } from '../engine/tint.js';
import { MOUNT_LIMITS } from '../engine/wallMount.js';

const wall = FURNITURE_CATALOG.filter((d) => d.wallMounted);
const patterned = FURNITURE_CATALOG.filter((d) => patternKindOf(d));

describe('wall-mounted catalog pieces', () => {
  it('has pictures, mirrors, a shelf, a clock, a planter and curtains', () => {
    const shapes = new Set(wall.map((d) => d.shapeType));
    for (const s of [
      'wall-art',
      'wall-mirror-hung',
      'wall-shelf',
      'wall-clock',
      'wall-planter',
      'curtain',
    ])
      expect(shapes.has(s), s).toBe(true);
    const curtains = wall.filter((d) => d.shapeType === 'curtain');
    expect(curtains.some((c) => c.curtainStyle === 'open')).toBe(true);
    expect(curtains.some((c) => c.curtainStyle === 'closed')).toBe(true);
    expect(curtains.some((c) => c.sheer)).toBe(true);
    expect(curtains.some((c) => !c.sheer)).toBe(true);
  });

  it('gives each a hanging height that fits under the ceiling, and a thin footprint', () => {
    for (const d of wall) {
      expect(Number.isFinite(d.mountHeightCm), d.id).toBe(true);
      expect(d.mountHeightCm + d.heightCm, d.id).toBeLessThanOrEqual(MOUNT_LIMITS.wallHeightCm);
      expect(d.depthCm, d.id).toBeLessThanOrEqual(25);
      expect(d.shapeType in MODELS && d.shapeType in SILHOUETTES, d.id).toBe(true);
    }
  });

  it('locks the colour of pictures, mirrors, clocks and planters, not curtains or the shelf', () => {
    for (const d of wall) {
      const locked = ['wall-art', 'wall-mirror-hung', 'wall-clock', 'wall-planter'].includes(
        d.shapeType
      );
      expect(!!d.colorLocked, d.id).toBe(locked);
    }
    const art = getFurnitureType('wall-art-landscape');
    expect(cleanOverrides({ color: '#123456', widthCm: 90 }, art)).toEqual({ widthCm: 90 });
    const curtain = getFurnitureType('curtain-heavy-open');
    expect(cleanOverrides({ color: '#123456' }, curtain)).toEqual({ color: '#123456' });
  });

  it('marks curtains as window dressings', () => {
    for (const d of wall.filter((x) => x.shapeType === 'curtain'))
      expect(d.windowDressing, d.id).toBe(true);
  });

  it('lets a shelf carry small pieces', () => {
    const shelf = getFurnitureType('wall-shelf-floating');
    expect(shelf.supportsTop).toBe(true);
    expect(shelf.surfaceHeightCm).toBe(shelf.heightCm);
  });

  it('does not collide with floor furniture', () => {
    const items = [
      { id: 'sofa', furnitureTypeId: 'sofa-3seat', x: 250, y: 60, rotationDeg: 0, elevationCm: 0 },
      {
        id: 'art',
        furnitureTypeId: 'wall-art-landscape',
        x: 250,
        y: 2,
        rotationDeg: 0,
        elevationCm: 135,
      },
      {
        id: 'curtain',
        furnitureTypeId: 'curtain-heavy-closed',
        x: 250,
        y: 7,
        rotationDeg: 0,
        elevationCm: 0,
      },
    ];
    const { collidingIds } = evaluateAllCollisions(items, 500, 400);
    expect(collidingIds.size).toBe(0);
  });
});

describe('patterned rugs and curtains in the catalog', () => {
  it('has the requested rug kinds', () => {
    const patternsOfRugs = new Set(
      FURNITURE_CATALOG.filter((d) => patternKindOf(d) === 'rug').map((d) => d.pattern)
    );
    for (const p of ['persian', 'kilim', 'dhaka', 'stripes', 'shag', 'rings'])
      expect(patternsOfRugs.has(p), p).toBe(true);
    const shapes = new Set(
      FURNITURE_CATALOG.filter((d) => patternKindOf(d) === 'rug').map((d) => d.shapeType)
    );
    expect(shapes.has('rug-round')).toBe(true);
    expect(shapes.has('rug-runner')).toBe(true);
  });

  it('only names patterns that exist for the piece family', () => {
    for (const d of patterned) {
      if (d.pattern !== undefined)
        expect(isPatternId(patternKindOf(d), d.pattern), `${d.id} ${d.pattern}`).toBe(true);
    }
  });

  it('accepts a pattern override only from the right family', () => {
    const rug = getFurnitureType('rug-persian');
    expect(cleanOverrides({ pattern: 'kilim' }, rug)).toEqual({ pattern: 'kilim' });
    expect(cleanOverrides({ pattern: 'check' }, rug)).toBeUndefined();
    expect(cleanOverrides({ pattern: 'lava' }, rug)).toBeUndefined();
    const sofa = getFurnitureType('sofa-3seat');
    expect(cleanOverrides({ pattern: 'kilim' }, sofa)).toBeUndefined();
    const curtain = getFurnitureType('curtain-heavy-open');
    expect(cleanOverrides({ pattern: 'check' }, curtain)).toEqual({ pattern: 'check' });
  });

  it('resolves a chosen pattern and keeps the colour override working', () => {
    const item = {
      id: 'r',
      furnitureTypeId: 'rug-living',
      overrides: { pattern: 'kilim', color: '#224466' },
    };
    const def = resolveItemDef(item);
    expect(patternOf(def)).toBe('kilim');
    expect(def.color).toBe('#224466');
    // Companion colours follow the main colour, so the pattern is recoloured as a whole
    const base = getFurnitureType('rug-living');
    expect(def.subColor).not.toBe(base.subColor);
    expect(def.accentColor).not.toBe(base.accentColor);
    expect(resolveItemDef({ id: 'q', furnitureTypeId: 'rug-living' }).pattern).toBeUndefined();
  });

  it('retints curtain companion colours too', () => {
    const base = getFurnitureType('curtain-heavy-open');
    const tinted = tintedCompanions(base, '#AA3322');
    expect(Object.keys(tinted).sort()).toEqual(['accentColor', 'subColor']);
  });
});

describe('catalog integrity for the new pieces', () => {
  it('keeps unique ids, valid colours and a known category', () => {
    const ids = FURNITURE_CATALOG.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of [...wall, ...patterned]) {
      expect(d.color, d.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      for (const k of ['subColor', 'accentColor', 'mirrorColor', 'handleColor'])
        if (d[k]) expect(d[k], `${d.id} ${k}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
