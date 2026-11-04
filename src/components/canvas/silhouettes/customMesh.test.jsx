import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  registerCustomFurniture,
  unregisterCustomFurniture,
} from '../../../data/furnitureCatalog.js';
import { ArchitecturalSilhouette } from '../ArchitecturalSilhouette.jsx';
import { outlinePath } from './customMesh.jsx';

const LOOPS = [[-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]];

function render(item, w = 100, d = 60, props = {}) {
  return renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette
        item={{ shapeType: 'custom-mesh', color: '#885533', ...item }}
        widthCm={w}
        depthCm={d}
        {...props}
      />
    </svg>
  );
}

afterEach(() => unregisterCustomFurniture('photo-test'));

describe('photo furniture plan symbol', () => {
  it('scales the footprint outline to the piece size', () => {
    expect(outlinePath(LOOPS, 100, 60)).toBe(
      'M -50.00 -30.00 L 50.00 -30.00 L 50.00 30.00 L -50.00 30.00 Z'
    );
    expect(outlinePath([LOOPS[0], LOOPS[0]], 10, 10).split('M').length).toBe(3);
  });

  it('draws the top-down render clipped by an outline, with the front-edge marker', () => {
    const html = render({ topImage: 'data:image/png;base64,AAAA', topOutline: LOOPS });
    expect(html).toContain('<image');
    expect(html).toContain('stroke="#22180E"');
    expect(html).toContain('stroke-dasharray');
    expect(html).not.toContain('NaN');
    // Front marker sits just inside the front (bottom) edge
    expect(html).toMatch(/y1="27(\.0+)?"/);
  });

  it('follows an L-shaped footprint instead of a rectangle', () => {
    const L = [[-0.5, -0.5, 0.5, -0.5, 0.5, 0, 0, 0, 0, 0.5, -0.5, 0.5]];
    const html = render({ topOutline: L });
    expect(html).toContain('L 0.00 0.00');
    expect(html).not.toContain('<rect');
  });

  it('falls back to a rounded rectangle for pieces saved without an outline', () => {
    const html = render({ topImage: 'data:image/png;base64,AAAA' });
    expect(html).toContain('<rect');
    expect(html).toContain('<image');
  });

  it('shows the 3D thumbnail on the catalog swatch', () => {
    const html = render({ thumb: 'data:image/png;base64,BBBB', topOutline: LOOPS }, 80, 50, {
      isSwatch: true,
    });
    expect(html).toContain('BBBB');
    expect(html).not.toContain('<path');
  });

  it('tints the symbol when the colour was changed from the original', () => {
    registerCustomFurniture({
      id: 'photo-test',
      name: 'Photo',
      widthCm: 100,
      depthCm: 60,
      heightCm: 50,
      color: '#885533',
    });
    const same = render({ id: 'photo-test', topOutline: LOOPS });
    expect(same).not.toContain('mix-blend-mode');
    const changed = render({ id: 'photo-test', color: '#2b7a78', topOutline: LOOPS });
    expect(changed).toContain('mix-blend-mode');
  });

  it('stays well-formed when resized to 0.4x and 2.5x', () => {
    for (const [w, d] of [
      [40, 24],
      [250, 150],
    ]) {
      const html = render({ topImage: 'data:image/png;base64,AAAA', topOutline: LOOPS }, w, d);
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(html).not.toMatch(/\s(width|height)="-/);
    }
  });
});
