import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog.js';
import { ArchitecturalSilhouette } from './ArchitecturalSilhouette.jsx';

// SVG rejects negative widths/heights, so any catalog item that produces one renders incorrectly
describe('2D silhouettes', () => {
  for (const item of FURNITURE_CATALOG) {
    it(`${item.id} renders without negative or NaN dimensions`, () => {
      const html = renderToStaticMarkup(
        <svg>
          <ArchitecturalSilhouette item={item} widthCm={item.widthCm} depthCm={item.depthCm} />
        </svg>
      );
      expect(html.length).toBeGreaterThan(20);
      expect(html).not.toMatch(/\s(width|height|rx|ry|r)="-/);
      expect(html).not.toContain('NaN');
    });
  }

  it('renders resized pieces (0.4x to 2.5x) without negative dimensions', () => {
    const bad = [];
    for (const item of FURNITURE_CATALOG) {
      const sizes = [
        // The customize panel limits resizing to 0.4x - 2.5x of the catalog size
        [Math.max(20, item.widthCm * 0.4), Math.max(20, item.depthCm * 0.4)],
        [item.widthCm * 2.5, item.depthCm * 2.5],
      ];
      for (const [w, d] of sizes) {
        const html = renderToStaticMarkup(
          <svg>
            <ArchitecturalSilhouette item={item} widthCm={w} depthCm={d} />
          </svg>
        );
        if (/\s(width|height|rx|ry|r)="-/.test(html)) bad.push(`${item.id}@${w}x${d}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
