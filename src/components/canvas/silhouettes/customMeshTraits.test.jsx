import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchitecturalSilhouette } from '../ArchitecturalSilhouette.jsx';
import { hasCaseworkTraits } from './customMesh.jsx';

function plan(type, traits, w, d, palette = { body: '#335577', cushion: '#6688aa' }) {
  return renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette
        item={{
          shapeType: 'custom-mesh',
          color: palette.body,
          design: { v: 1, type, palette, traits },
        }}
        widthCm={w}
        depthCm={d}
      />
    </svg>
  );
}

const num = (s, attr) =>
  [...s.matchAll(new RegExp(`\\s${attr}="(-?[\\d.]+(?:e[-+]?\\d+)?)"`, 'g'))].map((m) => +m[1]);

/** Every drawn coordinate of a plan symbol, as [x, y] points (rect corners, line ends, path points). */
function points(html) {
  const pts = [];
  for (const m of html.matchAll(/<rect([^>]*)>/g)) {
    const [x] = num(m[1], 'x');
    const [y] = num(m[1], 'y');
    const [w] = num(m[1], 'width');
    const [h] = num(m[1], 'height');
    pts.push([x, y], [x + w, y + h]);
  }
  for (const m of html.matchAll(/<line([^>]*)>/g)) {
    const a = m[1];
    pts.push([num(a, 'x1')[0], num(a, 'y1')[0]], [num(a, 'x2')[0], num(a, 'y2')[0]]);
  }
  for (const m of html.matchAll(/<(circle|ellipse)([^>]*)>/g)) {
    const a = m[2];
    const [cx] = num(a, 'cx');
    const [cy] = num(a, 'cy');
    const rx = num(a, 'rx')[0] ?? num(a, 'r')[0];
    const ry = num(a, 'ry')[0] ?? num(a, 'r')[0];
    pts.push([cx - rx, cy - ry], [cx + rx, cy + ry]);
  }
  for (const m of html.matchAll(/\sd="([^"]*)"/g)) {
    const tokens = m[1].match(/-?[\d.]+(?:e[-+]?\d+)?/g) || [];
    if (/A/.test(m[1])) continue;
    for (let i = 0; i + 1 < tokens.length; i += 2) pts.push([+tokens[i], +tokens[i + 1]]);
  }
  return pts;
}

function expectInside(html, w, d, tol = 0.8) {
  expect(html).not.toMatch(/NaN|Infinity/);
  expect(html).not.toMatch(/\s(width|height)="-/);
  for (const [x, y] of points(html)) {
    expect(Math.abs(x)).toBeLessThanOrEqual(w / 2 + tol);
    expect(Math.abs(y)).toBeLessThanOrEqual(d / 2 + tol);
  }
}

const SIZES = (w, d) => [
  [w * 0.5, d * 0.5],
  [w, d],
  [w * 1.7, d * 1.7],
];

describe('plan symbols for the new traits', () => {
  const cases = [
    [
      'sofa',
      { seats: 3, chan: 1, longSeat: 1 },
      { seats: 3, longSeat: 1 },
      230,
      95,
      'channel-plan',
    ],
    ['sofa', { seats: 3, step: 1 }, { seats: 3 }, 220, 92, 'arm-tiers'],
    [
      'sofa',
      { seats: 3, chan: 1, step: 1, arm: 0.12 },
      { seats: 3, arm: 0.12 },
      230,
      95,
      'arm-tiers',
    ],
    ['armchair', { chan: 1 }, {}, 80, 82, 'channel-plan'],
    ['tub-chair', { plan: 'round', wrap: 1 }, { plan: 'round' }, 75, 75, 'wrap-plan'],
    ['bed', { pillows: 1, metal: 1 }, { pillows: 1 }, 100, 200, 'metal-ends'],
    ['bed', { pillows: 1, metal: 1, rails: 1 }, { pillows: 1, metal: 1 }, 100, 200, 'guard-rails'],
    ['bed', { pillows: 2, rails: 1 }, { pillows: 2 }, 160, 205, 'guard-rails'],
    [
      'wardrobe',
      { doors: 2, mirror: 2, drawers: 3, dside: 'right' },
      { doors: 2 },
      100,
      55,
      'wardrobe-plan',
    ],
    ['wardrobe', { doors: 3, niche: 1, upper: 1 }, { doors: 3 }, 300, 60, 'wardrobe-plan'],
    ['desk', { ped: 'right', drawers: 3, base: 'sled', modesty: 1 }, {}, 140, 70, 'desk-plan'],
    ['desk', { ped: 'both', drawers: 4, base: 'panel' }, {}, 160, 75, 'desk-plan'],
  ];
  for (const [type, traits, without, w, d, part] of cases) {
    it(`${type} ${JSON.stringify(traits)} draws its ${part} inside the footprint`, () => {
      for (const [sw, sd] of SIZES(w, d)) {
        const html = plan(type, traits, sw, sd);
        expect(html).toContain(`name="${part}"`);
        expect(html).not.toBe(plan(type, without, sw, sd));
        expectInside(html, sw, sd);
      }
    });
  }

  it('draws more channel seams on a longer channel-tufted sofa', () => {
    const seams = (w) => (plan('sofa', { seats: 3, chan: 1 }, w, 95).match(/<line/g) || []).length;
    expect(seams(320)).toBeGreaterThan(seams(200));
  });

  it('marks the mirror door of a wardrobe and one front for each door', () => {
    const html = plan('wardrobe', { doors: 3, mirror: 1 }, 140, 55, { body: '#f1f0ed' });
    expect(html).toContain('#CFE3EA');
    expect((html.match(/<g name="handle"|name="handle"/g) || []).length).toBe(3);
    expect(plan('wardrobe', { doors: 3 }, 140, 55)).not.toContain('wardrobe-plan');
  });

  it('only draws the detailed wardrobe and desk plans for records with the new details', () => {
    expect(hasCaseworkTraits({ type: 'wardrobe', palette: {}, traits: { doors: 2 } })).toBe(false);
    expect(hasCaseworkTraits({ type: 'wardrobe', palette: { door: '#fff' }, traits: {} })).toBe(
      true
    );
    expect(hasCaseworkTraits({ type: 'desk', palette: {}, traits: { topH: 5 } })).toBe(false);
    expect(hasCaseworkTraits({ type: 'desk', palette: {}, traits: { modesty: 1 } })).toBe(true);
    expect(plan('desk', { topH: 5 }, 140, 70)).not.toContain('desk-plan');
  });
});
