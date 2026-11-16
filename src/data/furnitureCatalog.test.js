import { describe, it, expect, afterEach } from 'vitest';
import {
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  getFurnitureType,
  listCustomFurniture,
  registerCustomFurniture,
  unregisterCustomFurniture,
} from './furnitureCatalog.js';
import { SILHOUETTES, resolveSilhouette } from '../components/canvas/silhouettes/index.js';
import { MODELS, resolveModel } from '../components/preview3d/models/index.js';

const CATEGORY_IDS = new Set(FURNITURE_CATEGORIES.map((c) => c.id));

describe('furniture catalog', () => {
  it('has unique kebab-case ids', () => {
    const ids = FURNITURE_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('uses positive real-world sizes and a known category', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.name, item.id).toBeTruthy();
      expect(item.widthCm, item.id).toBeGreaterThan(0);
      expect(item.depthCm, item.id).toBeGreaterThan(0);
      expect(item.heightCm, item.id).toBeGreaterThan(0);
      expect(CATEGORY_IDS.has(item.category), `${item.id} category ${item.category}`).toBe(true);
      expect(item.color, item.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('resolves every shapeType to a registered 2D symbol and 3D model', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(SILHOUETTES[item.shapeType], `2D ${item.id} (${item.shapeType})`).toBeTypeOf(
        'function'
      );
      expect(MODELS[item.shapeType], `3D ${item.id} (${item.shapeType})`).toBeTypeOf('function');
    }
  });

  it('falls back to a generic shape for unknown shapeTypes', () => {
    expect(resolveSilhouette('no-such-shape')).toBeTypeOf('function');
    expect(resolveModel('no-such-shape')).toBeTypeOf('function');
  });
});

describe('a damaged photo-made record', () => {
  afterEach(() => unregisterCustomFurniture('custom-damaged'));

  // A record damaged in storage used to be spread straight in, painting NaN over the plan and
  // the 3D view: a blank card reading "wide x cm", an invisible piece and a NaN bounding sphere.
  it('is registered with a readable name, a real size and a real colour', () => {
    registerCustomFurniture({
      id: 'custom-damaged',
      name: '   ',
      widthCm: 'wide',
      depthCm: NaN,
      heightCm: null,
      color: 'brownish',
      design: { type: 'not-a-type' },
      mesh: { positions: [0, 0, 0] },
    });
    const def = getFurnitureType('custom-damaged');
    expect(def.name).toBe('Photo furniture');
    expect(def.widthCm).toBe(80);
    expect(def.depthCm).toBe(60);
    expect(def.heightCm).toBe(80);
    expect(def.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(def.design).toBeUndefined();
    // what was sound about the record is kept
    expect(def.mesh.positions).toEqual([0, 0, 0]);
    expect(listCustomFurniture().some((d) => d.id === 'custom-damaged')).toBe(true);
  });

  it('keeps a sound record exactly as it was made', () => {
    registerCustomFurniture({
      id: 'custom-damaged',
      name: 'Grandma chair',
      widthCm: 62.5,
      depthCm: 58,
      heightCm: 94,
      color: '#7A4B2A',
    });
    expect(getFurnitureType('custom-damaged')).toMatchObject({
      name: 'Grandma chair',
      widthCm: 62.5,
      depthCm: 58,
      heightCm: 94,
      color: '#7A4B2A',
      category: 'custom',
      shapeType: 'custom-mesh',
    });
  });

  it('ignores a record with no id at all', () => {
    registerCustomFurniture({ name: 'Nameless' });
    registerCustomFurniture(null);
    expect(listCustomFurniture().some((d) => !d.id)).toBe(false);
  });
});
