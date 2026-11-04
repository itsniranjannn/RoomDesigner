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

// The catalog preview shrinks each symbol to fit a 100 x 70 box, which makes thin pieces tiny
describe('2D silhouettes at catalog swatch size', () => {
  it.each([
    ['fit to 56 units', (item) => 56 / Math.max(item.widthCm, item.depthCm)],
    ['fit to 84 x 54 units', (item) => Math.min(84 / item.widthCm, 54 / item.depthCm)],
  ])('render without negative dimensions for every catalog item (%s)', (_name, scaleOf) => {
    const bad = [];
    for (const item of FURNITURE_CATALOG) {
      const scale = scaleOf(item);
      const html = renderToStaticMarkup(
        <svg>
          <ArchitecturalSilhouette
            item={item}
            widthCm={item.widthCm * scale}
            depthCm={item.depthCm * scale}
            isSwatch
          />
        </svg>
      );
      if (/\s(width|height|rx|ry|r)="-/.test(html) || html.includes('NaN')) bad.push(item.id);
    }
    expect(bad).toEqual([]);
  });
});

// Functional details that must stay visible in the plan symbols (tagged with a name attribute)
describe('2D silhouette detail marks', () => {
  const EXPECTED = {
    'wash-basin': ['tap', 'drain'],
    'bath-vanity': ['tap', 'drain'],
    'shower-tray': ['drain', 'knob'],
    bathtub: ['tap', 'drain'],
    'kitchen-counter': ['tap', 'drain'],
    'sink-unit': ['tap', 'drain'],
    'kitchen-stove': ['knob'],
    dishwasher: ['knob'],
    'oven-unit': ['knob'],
    'water-heater': ['knob'],
    'filing-cabinet': ['handle'],
  };
  const render = (item, k = 1) =>
    renderToStaticMarkup(
      <svg>
        <ArchitecturalSilhouette
          item={item}
          widthCm={item.widthCm * k}
          depthCm={item.depthCm * k}
        />
      </svg>
    );
  const find = (id) => FURNITURE_CATALOG.find((i) => i.id === id);

  for (const [id, names] of Object.entries(EXPECTED)) {
    it(`${id} shows ${names.join(', ')} at 0.4x, 1x and 2.5x`, () => {
      expect(find(id)).toBeTruthy();
      for (const k of [0.4, 1, 2.5]) {
        const html = render(find(id), k);
        for (const n of names) expect(html).toContain(`name="${n}"`);
        expect(html).not.toMatch(/NaN|Infinity|undefined/);
      }
    });
  }

  it('the stove plan shows exactly four burner knobs', () => {
    expect(render(find('kitchen-stove')).split('name="knob"').length - 1).toBe(4);
  });

  it('the oven unit and the dishwasher are drawn differently', () => {
    expect(render(find('oven-unit'))).not.toEqual(render(find('dishwasher')));
  });
});
