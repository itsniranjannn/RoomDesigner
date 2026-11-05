import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { FURNITURE_CATALOG, resolveItemDef, isColorLocked } from '../data/furnitureCatalog.js';
import { cleanOverrides } from './overrides.js';
import { retint, shiftLightness } from './tint.js';
import { ArchitecturalSilhouette } from '../components/canvas/ArchitecturalSilhouette.jsx';

const RED = '#d02020';

function markup(def) {
  return renderToStaticMarkup(
    createElement(ArchitecturalSilhouette, {
      item: def,
      widthCm: def.widthCm,
      depthCm: def.depthCm,
    })
  ).toLowerCase();
}

describe('tint helpers', () => {
  it('moves a companion to the new hue while keeping its lightness offset', () => {
    const out = retint('#808080', '#d02020', '#a0a0a0');
    expect(out).not.toBe('#a0a0a0');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    expect(shiftLightness('#808080', 0.2)).not.toBe('#808080');
  });
});

describe('colour override', () => {
  const locked = FURNITURE_CATALOG.filter((i) => i.colorLocked);
  const free = FURNITURE_CATALOG.filter((i) => !i.colorLocked);

  it('has a short list of locked pieces', () => {
    expect(locked.length).toBeGreaterThan(5);
    expect(locked.length).toBeLessThan(FURNITURE_CATALOG.length * 0.3);
    for (const id of ['tv-43', 'toilet', 'bathtub', 'kitchen-fridge', 'wall-mirror']) {
      expect(isColorLocked(FURNITURE_CATALOG.find((i) => i.id === id))).toBe(true);
    }
  });

  it('ignores colour overrides on locked pieces', () => {
    for (const base of locked) {
      const def = resolveItemDef({ furnitureTypeId: base.id, overrides: { color: RED } });
      expect(def.color, base.id).toBe(base.color);
      expect(cleanOverrides({ color: RED, widthCm: 50 }, base)).toEqual({ widthCm: 50 });
    }
  });

  it.each(['bed-queen', 'sofa-3seat', 'wardrobe-3door', 'dining-chair', 'dining-table-4'])(
    'tints the 2D plan symbol of %s',
    (id) => {
      const base = FURNITURE_CATALOG.find((i) => i.id === id);
      const plain = markup(resolveItemDef({ furnitureTypeId: id }));
      const tinted = markup(resolveItemDef({ furnitureTypeId: id, overrides: { color: RED } }));
      expect(tinted).toContain(RED);
      expect(plain).not.toContain(RED);
      expect(base.colorLocked).toBeFalsy();
    }
  );

  it('changes the 2D symbol of every recolourable piece', () => {
    const missing = free
      .filter((b) => !b.restsOnTop || b.shapeType === 'cushion')
      .filter(
        (b) =>
          markup(resolveItemDef({ furnitureTypeId: b.id, overrides: { color: RED } })) ===
          markup(resolveItemDef({ furnitureTypeId: b.id }))
      )
      .map((b) => b.id);
    expect(missing).toEqual([]);
  });
});

describe('shared photo design', () => {
  it('keeps a valid design on the stand-in of a photo-made piece', async () => {
    const { registerPlaceholderFurniture, getFurnitureType } =
      await import('../data/furnitureCatalog.js');
    registerPlaceholderFurniture({
      id: 'custom-shared-1',
      name: 'Bed',
      widthCm: 160,
      depthCm: 200,
      heightCm: 95,
      color: '#aaa19a',
      design: { type: 'bed', palette: { body: '#aaa19a', accent: '#615c5a' } },
    });
    const def = getFurnitureType('custom-shared-1');
    expect(def.placeholder).toBe(true);
    expect(def.design.type).toBe('bed');
    expect(def.design.palette.body).toBe('#aaa19a');
  });
});
