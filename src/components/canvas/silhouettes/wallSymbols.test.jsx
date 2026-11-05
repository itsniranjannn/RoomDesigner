import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FURNITURE_CATALOG, resolveItemDef } from '../../../data/furnitureCatalog.js';
import { ArchitecturalSilhouette } from '../ArchitecturalSilhouette.jsx';
import { RUG_PATTERNS } from '../../preview3d/patterns.js';

const svg = (def, w = def.widthCm, d = def.depthCm) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette item={def} widthCm={w} depthCm={d} />
    </svg>
  );

describe('plan symbols of wall pieces', () => {
  const wall = FURNITURE_CATALOG.filter((d) => d.wallMounted);

  it('draws every wall piece with the shared wall-mounted outline', () => {
    for (const def of wall) {
      const html = svg(def);
      expect(html, def.id).toContain('data-wall-mounted="true"');
      expect(html, def.id).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('stays well formed when the piece is resized to 40% and 250%', () => {
    for (const def of wall) {
      for (const k of [0.4, 2.5]) {
        const html = svg(def, def.widthCm * k, def.depthCm);
        expect(html, `${def.id} x${k}`).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('draws two panels for open curtains and one for closed', () => {
    const open = svg(FURNITURE_CATALOG.find((d) => d.id === 'curtain-heavy-open'));
    const closed = svg(FURNITURE_CATALOG.find((d) => d.id === 'curtain-heavy-closed'));
    const panels = (html) => (html.match(/<path /g) || []).length;
    expect(panels(open)).toBe(2);
    expect(panels(closed)).toBe(1);
  });
});

describe('plan symbols of patterned rugs', () => {
  it('draws the chosen pattern for every pattern on every rug shape', () => {
    for (const id of ['rug-living', 'rug-runner', 'rug-round', 'nepali-dhaka-rug']) {
      for (const p of RUG_PATTERNS.filter((x) => x.id !== 'classic')) {
        const def = resolveItemDef({ id: 'x', furnitureTypeId: id, overrides: { pattern: p.id } });
        const html = svg(def);
        expect(html, `${id} ${p.id}`).toContain('clip-path');
        expect(html, `${id} ${p.id}`).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });

  it('keeps the original rug drawing when no pattern is chosen', () => {
    const def = resolveItemDef({ id: 'x', furnitureTypeId: 'rug-living' });
    expect(svg(def)).not.toContain('clip-path');
  });

  it('follows the colour override', () => {
    const def = resolveItemDef({
      id: 'x',
      furnitureTypeId: 'rug-persian',
      overrides: { color: '#225522' },
    });
    expect(svg(def)).toContain('#225522');
  });
});
