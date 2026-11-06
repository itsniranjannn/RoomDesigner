import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomMeshModel } from './customMesh.jsx';

const palette = {
  body: '#aaa19a',
  accent: '#615c5a',
  pillow: '#d4d3d2',
  cushion: '#998877',
  leg: '#222222',
};

function render(type, traits, size = [1.6, 0.9, 0.9], color = '#aaa19a') {
  return renderToStaticMarkup(
    <CustomMeshModel
      def={{ design: { v: 1, type, palette, traits } }}
      widthM={size[0]}
      depthM={size[1]}
      heightM={size[2]}
      mainColor={color}
    />
  );
}

const SHAPES = {
  'corner-sofa': [
    { side: 'right', seats: 2, arm: 0.08, tufted: 0, taper: 0 },
    { side: 'left', seats: 3, arm: 0.1, tufted: 1, taper: 1 },
  ],
  'tub-chair': [
    { plan: 'round', base: 'feet', tufted: 0 },
    { plan: 'bucket', base: 'legs', tufted: 1 },
    { plan: 'round', base: 'pedestal', tufted: 0 },
  ],
  ottoman: [
    { shape: 'square', feet: 'none', tufted: 0 },
    { shape: 'round', feet: 'tall', tufted: 1 },
    { shape: 'square', feet: 'short', tufted: 1 },
  ],
  daybed: [
    { back: 'panel', ends: 2 },
    { back: 'slat', ends: 1 },
    { back: 'none', ends: 0 },
  ],
  etagere: [
    { shelves: 5, cols: 1, base: 'open', back: 0 },
    { shelves: 3, cols: 3, base: 'doors', back: 1 },
    { shelves: 4, cols: 2, base: 'drawers', back: 1 },
  ],
  stool: [
    { seat: 'round', back: 1, rest: 1 },
    { seat: 'square', back: 1, rest: 1 },
    { seat: 'square', back: 0, rest: 0 },
    {},
  ],
  cabinet: [
    { front: 'doors', n: 2, legs: 0 },
    { front: 'drawers', n: 3, legs: 1 },
    { front: 'mixed', n: 4, legs: 1 },
    {},
  ],
  bed: ['flat', 'panel', 'channel', 'tufted', 'slat'].map((head) => ({ head, pillows: 2 })),
};

describe('shapes built from photos', () => {
  it('draws every variant of every new shape, in two colors, without bad numbers', () => {
    for (const [type, variants] of Object.entries(SHAPES)) {
      for (const traits of variants) {
        for (const color of ['#aaa19a', '#2b7a78']) {
          const size =
            type === 'ottoman' ? [0.6, 0.6, 0.42] : type === 'stool' ? [0.4, 0.4, 0.7] : undefined;
          const html = render(type, traits, size, color);
          expect(html.length, `${type} ${JSON.stringify(traits)}`).toBeGreaterThan(200);
          expect(html, `${type} ${JSON.stringify(traits)}`).not.toMatch(/NaN|Infinity/);
        }
      }
    }
  });

  it('mirrors a corner sofa for a chaise on the left', () => {
    expect(render('corner-sofa', { side: 'left', seats: 2 })).toContain('scale="-1,1,1"');
    expect(render('corner-sofa', { side: 'right', seats: 2 })).not.toContain('scale="-1,1,1"');
  });

  it('gives a round tub chair a shell that wraps the back and a bucket a lower arm wrap', () => {
    const wraps = (plan) =>
      (render('tub-chair', { plan, base: 'feet' }).match(/openEnded|cylinderGeometry/g) || [])
        .length;
    expect(wraps('bucket')).toBeGreaterThan(wraps('round'));
  });

  it('closes the lower part of an open shelving unit with doors or drawers when asked', () => {
    const base = (b) =>
      render('etagere', { shelves: 4, cols: 1, base: b, back: 1 }, [0.8, 0.35, 1.7]);
    expect(base('open')).not.toContain('name="doors"');
    expect(base('doors')).toContain('name="doors"');
    expect(base('drawers')).toContain('name="drawers"');
  });

  it('shows doors, drawers or both on a sideboard', () => {
    const fronts = (front) => render('cabinet', { front, n: 4, legs: 0 }, [1.6, 0.45, 0.8]);
    expect(fronts('doors')).toContain('name="doors"');
    expect(fronts('doors')).not.toContain('name="drawers"');
    expect(fronts('drawers')).toContain('name="drawers"');
    expect(fronts('mixed')).toContain('name="doors"');
    expect(fronts('mixed')).toContain('name="drawers"');
  });

  it('draws the five headboard styles differently, and old beds as before', () => {
    const html = Object.fromEntries(
      ['flat', 'panel', 'channel', 'tufted', 'slat'].map((head) => [
        head,
        render('bed', { head, pillows: 2, bodyFrac: 0.5 }, [1.6, 2, 1]),
      ])
    );
    expect(new Set(Object.values(html)).size).toBe(5);
    expect(html.tufted).toContain('name="tufting"');
    // A bed from before headboard styles, with channel stitching, matches the new channel style
    const old = render('bed', { channels: 1, pillows: 2, bodyFrac: 0.5 }, [1.6, 2, 1]);
    expect(old).toBe(html.channel);
    expect(render('bed', { pillows: 2, bodyFrac: 0.5 }, [1.6, 2, 1])).toBe(html.panel);
  });

  it('shows the bed details read from the photos', () => {
    const bed = (traits, pal = {}) => {
      const html = renderToStaticMarkup(
        <CustomMeshModel
          def={{
            design: {
              v: 1,
              type: 'bed',
              palette: { ...palette, base: '#8a6a4a', sheet: '#eeeeee', ...pal },
              traits: { pillows: 2, bodyFrac: 0.5, head: 'channel', ...traits },
            },
          }}
          widthM={1.6}
          depthM={2}
          heightM={1}
          mainColor="#aaa19a"
        />
      );
      return html;
    };
    const plain = bed({});
    for (const traits of [
      { headW: 0.75 },
      { tiers: 1 },
      { lumbar: 0 },
      { fold: 0 },
      { throw: 1 },
      { foot: 1 },
      { store: 1 },
      { skirt: 1 },
      { legs: 1 },
    ])
      expect(bed(traits), JSON.stringify(traits)).not.toBe(plain);
    expect(bed({ store: 1 })).toContain('name="bed-drawers"');
    expect(bed({ skirt: 1 })).toContain('name="bed-skirt"');
    expect(plain).not.toContain('name="bed-skirt"');
    // The base, sheet and pillows take their own colours rather than the headboard's
    expect(bed({}, { base: '#123456' })).not.toBe(plain);
    expect(bed({}, { sheet: '#223344' })).not.toBe(plain);
    expect(bed({}, { pillow: '#ffeeee' })).not.toBe(plain);
  });

  it('keeps stools and cabinets from before these options on their original models', () => {
    expect(render('stool', {})).toContain('torusGeometry');
    expect(render('cabinet', {})).not.toBe(render('cabinet', { front: 'doors', n: 2, legs: 0 }));
  });
});

describe('ornate and framed pieces read from room photos', () => {
  const wood = { body: '#8b513c', base: '#8b513c', panel: '#914f32', accent: '#d8cbb8' };
  const draw = (type, traits, pal, size) =>
    renderToStaticMarkup(
      <CustomMeshModel
        def={{ design: { v: 1, type, palette: pal, traits } }}
        widthM={size[0]}
        depthM={size[1]}
        heightM={size[2]}
        mainColor={pal.body}
      />
    );

  it('draws a carved bed with a crest, a leather panel, a sleigh footboard and bun feet', () => {
    const plain = draw('bed', { head: 'tufted', pillows: 2, bodyFrac: 0.5 }, wood, [1.6, 2.1, 1.3]);
    const carved = draw(
      'bed',
      { head: 'tufted', pillows: 2, bodyFrac: 0.5, crest: 2, framed: 1, foot: 2, legs: 2 },
      wood,
      [1.6, 2.1, 1.3]
    );
    expect(carved).not.toBe(plain);
    expect(carved).toContain('name="headboard"');
    expect(carved).toContain('name="footboard"');
    expect(carved).toContain('name="bun-feet"');
    expect(carved).not.toMatch(/NaN|Infinity/);
    // an arched crest and a scrolled one are different headboards
    const arch = draw(
      'bed',
      { head: 'tufted', crest: 1, framed: 1, pillows: 2 },
      wood,
      [1.6, 2.1, 1.3]
    );
    const scroll = draw(
      'bed',
      { head: 'tufted', crest: 2, framed: 1, pillows: 2 },
      wood,
      [1.6, 2.1, 1.3]
    );
    expect(arch).not.toBe(scroll);
  });

  it('draws classic seating: exposed frame, carved crest, cane sides, gold trim, scatter cushions, patterns', () => {
    const pal = {
      body: '#c9a56a',
      cushion: '#b89658',
      leg: '#4b2a17',
      frame: '#4b2a17',
      trim: '#c9a24a',
    };
    const variants = [
      { seats: 3, frame: 1 },
      { seats: 3, frame: 2, trim: 1, cab: 1, pat: 1, scat: 3, roll: 1 },
      { seats: 1, frame: 1, cane: 1, scat: 2 },
    ];
    const seen = new Set();
    for (const traits of variants)
      for (const type of ['sofa', 'armchair']) {
        const html = draw(type, traits, pal, type === 'sofa' ? [2, 0.9, 1] : [0.8, 0.8, 0.9]);
        expect(html).toContain('name="classic-seat"');
        expect(html).not.toMatch(/NaN|Infinity/);
        seen.add(html);
      }
    expect(seen.size).toBe(6);
    // plain upholstery without a frame trait still uses the catalog sofa
    expect(draw('sofa', { seats: 3 }, pal, [2, 0.9, 1])).not.toContain('classic-seat');
  });

  it('draws a coffee table with a polished top, gold trim and cabriole legs', () => {
    const pal = { body: '#3a1e12', leg: '#3a1e12', frame: '#4a2a18', trim: '#c9a24a' };
    const html = draw('coffee-table', { trim: 1, cab: 1 }, pal, [1.1, 0.6, 0.45]);
    expect(html).toContain('name="classic-table"');
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(draw('coffee-table', {}, pal, [1.1, 0.6, 0.45])).not.toContain('classic-table');
  });
});
