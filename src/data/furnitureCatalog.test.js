import { describe, it, expect } from 'vitest';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES } from './furnitureCatalog.js';
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
      expect(SILHOUETTES[item.shapeType], `2D ${item.id} (${item.shapeType})`).toBeTypeOf('function');
      expect(MODELS[item.shapeType], `3D ${item.id} (${item.shapeType})`).toBeTypeOf('function');
    }
  });

  it('falls back to a generic shape for unknown shapeTypes', () => {
    expect(resolveSilhouette('no-such-shape')).toBeTypeOf('function');
    expect(resolveModel('no-such-shape')).toBeTypeOf('function');
  });
});
