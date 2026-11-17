/**
 * A hung wall mirror's glint strokes belong on the glass: shrinking the mirror used to leave them outside its
 * outline, as stray white marks on empty plan.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchitecturalSilhouette } from '../ArchitecturalSilhouette.jsx';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { mirrorGlints } from './wallDecor.jsx';

const MIRRORS = FURNITURE_CATALOG.filter((i) => i.shapeType === 'wall-mirror-hung');
const hangDepth = (widthCm, depthCm) => Math.max(depthCm, Math.min(widthCm * 0.2, 12));

const draw = (item, widthCm, depthCm) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette item={item} widthCm={widthCm} depthCm={depthCm} />
    </svg>
  );

/** The white glint strokes of a plan symbol, as line ends. */
const glintsIn = (html) =>
  [
    ...html.matchAll(
      /<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"[^>]*#FFFFFF/g
    ),
  ].map((m) => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }));

describe('hung wall mirror glints', () => {
  it('has mirrors to check', () => {
    expect(MIRRORS.length).toBeGreaterThan(0);
  });

  // Sizes the store allows: shrunk whole, and (as the user drags one edge) narrowed on its own
  const SIZES = (item) => [
    [item.widthCm, item.depthCm],
    [item.widthCm * 2.5, item.depthCm * 2.5],
    [Math.max(10, item.widthCm * 0.4), Math.max(1, item.depthCm * 0.4)],
    [10, item.depthCm],
    [12, item.depthCm],
    [16, item.depthCm],
    [25, item.depthCm],
    [item.widthCm, 30],
  ];

  for (const item of MIRRORS)
    for (const [widthCm, depthCm] of SIZES(item))
      it(`${item.id} at ${widthCm} x ${depthCm} cm keeps every glint on the glass`, () => {
        const html = draw(item, widthCm, depthCm);
        const glints = glintsIn(html);
        expect(glints.length).toBeGreaterThan(0);
        const vd = hangDepth(widthCm, depthCm);
        const y0 = -depthCm / 2;
        for (const g of glints) {
          for (const x of [g.x1, g.x2]) {
            expect(x).toBeGreaterThanOrEqual(-widthCm / 2);
            expect(x).toBeLessThanOrEqual(widthCm / 2);
          }
          for (const y of [g.y1, g.y2]) {
            expect(y).toBeGreaterThanOrEqual(y0);
            expect(y).toBeLessThanOrEqual(y0 + vd);
          }
        }
      });

  it('keeps the glints inside however oddly the mirror is resized', () => {
    for (let widthCm = 10; widthCm <= 200; widthCm += 5)
      for (const depthCm of [1, 2, 4, 10, 25, 60]) {
        const vd = hangDepth(widthCm, depthCm);
        for (const { x, len } of mirrorGlints(widthCm, vd)) {
          const at = `${widthCm} x ${depthCm}`;
          expect(x, at).toBeGreaterThanOrEqual(-widthCm / 2);
          expect(x + len, at).toBeLessThanOrEqual(widthCm / 2);
          expect(len, at).toBeGreaterThan(0);
        }
      }
  });

  it('still draws three glints across the glass at the usual size', () => {
    const g = mirrorGlints(70, hangDepth(70, 4));
    expect(g).toHaveLength(3);
    expect(g[0].x).toBeLessThan(0);
    expect(g[2].x + g[2].len).toBeGreaterThan(0);
  });
});
