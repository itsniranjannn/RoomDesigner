import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchitecturalSilhouette } from '../ArchitecturalSilhouette.jsx';
import { cornerSofaPoints } from './customMesh.jsx';

const palette = { body: '#335577', cushion: '#6688aa', accent: '#aabbcc', leg: '#222222' };

function plan(type, traits, w = 200, d = 100) {
  return renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette
        item={{
          shapeType: 'custom-mesh',
          color: '#335577',
          design: { v: 1, type, palette, traits },
        }}
        widthCm={w}
        depthCm={d}
      />
    </svg>
  );
}

describe('plan symbols for photo shapes', () => {
  it('draws every new shape from its design alone, without bad numbers', () => {
    const shapes = {
      'corner-sofa': { side: 'left', seats: 2 },
      'tub-chair': { plan: 'round' },
      ottoman: { shape: 'round', tufted: 1 },
      daybed: { back: 'panel', ends: 1 },
      etagere: { cols: 3 },
      stool: { seat: 'square' },
      cabinet: { front: 'doors', n: 3 },
    };
    for (const [type, traits] of Object.entries(shapes)) {
      const html = plan(type, traits);
      expect(html.length, type).toBeGreaterThan(80);
      expect(html, type).not.toMatch(/NaN|Infinity/);
    }
  });

  it('draws an L for a corner sofa, with the chaise on the chosen side', () => {
    const right = cornerSofaPoints(260, 160, { side: 'right', seats: 2 });
    const left = cornerSofaPoints(260, 160, { side: 'left', seats: 2 });
    expect(right.points).toHaveLength(6);
    const along = (pts) => pts.filter(([, y]) => y === -80 + right.mainD).map(([x]) => x);
    expect(Math.min(...along(right.points))).toBe(-130);
    expect(Math.max(...along(left.points))).toBe(130);
    // The chaise reaches the front on its own side only
    const front = (pts) => pts.filter(([, y]) => y === 80).map(([x]) => x);
    expect(Math.min(...front(right.points))).toBeGreaterThan(0);
    expect(Math.max(...front(left.points))).toBeLessThan(0);
    expect(plan('corner-sofa', { side: 'right', seats: 2 }, 260, 160)).toContain(' L ');
  });

  it('uses the round or square outline the design asks for', () => {
    expect(plan('tub-chair', { plan: 'round' })).toContain('<ellipse');
    expect(plan('ottoman', { shape: 'square' })).not.toContain('<ellipse');
    expect(plan('stool', { seat: 'round' })).toContain('<ellipse');
  });

  it('marks each section of a sideboard on its front edge', () => {
    const ticks = (n) => (plan('cabinet', { front: 'doors', n }).match(/<line/g) || []).length;
    expect(ticks(4)).toBe(ticks(2) + 2);
  });
});
