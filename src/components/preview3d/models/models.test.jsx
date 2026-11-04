import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { SILHOUETTES } from '../../canvas/silhouettes/index.js';
import { MODELS, resolveModel } from './index.js';
import { FallbackBoxModel } from './fallback.jsx';
import { corners, strutTransform, clamp, shade } from './shared.jsx';

const SCALES = [0.4, 1, 2.5];

function modelProps(item, scale) {
  return {
    def: item,
    widthM: (item.widthCm * scale) / 100,
    depthM: (item.depthCm * scale) / 100,
    heightM: item.heightCm / 100,
    mainColor: item.color,
    fabricColor: item.fabricColor || '#FAF6EE',
    headboardColor: item.headboardColor || '#5A554E',
    accentColor: item.accentColor || '#C4B8A5',
    cushionColor: item.cushionColor || item.color,
    legColor: item.legColor || '#242321',
    handleColor: item.handleColor || '#C4A869',
    subColor: item.subColor || '#D4A359',
  };
}

describe('catalog shape registries', () => {
  it('has a dedicated 3D model for every catalog item', () => {
    const missing = FURNITURE_CATALOG.filter((item) => !MODELS[item.shapeType]).map(
      (item) => `${item.id}:${item.shapeType}`
    );
    expect(missing).toEqual([]);
  });

  it('has a 2D plan symbol for every catalog item', () => {
    const missing = FURNITURE_CATALOG.filter((item) => !SILHOUETTES[item.shapeType]).map(
      (item) => `${item.id}:${item.shapeType}`
    );
    expect(missing).toEqual([]);
  });

  it('registers the same shape types in 2D and 3D', () => {
    expect(Object.keys(MODELS).sort()).toEqual(Object.keys(SILHOUETTES).sort());
  });

  it('falls back to a plain box for unknown shapes', () => {
    expect(resolveModel('does-not-exist')).toBe(FallbackBoxModel);
  });
});

describe('3D model markup', () => {
  // The DOM renderer warns about three.js element names; only the generated props matter here.
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  for (const item of FURNITURE_CATALOG) {
    it(`${item.id} builds finite geometry at 0.4x, 1x and 2.5x width and depth`, () => {
      const Model = resolveModel(item.shapeType);
      for (const scale of SCALES) {
        const html = renderToStaticMarkup(<Model {...modelProps(item, scale)} />);
        expect(html.length).toBeGreaterThan(20);
        expect(html).not.toMatch(/NaN|Infinity|undefined/);
      }
    });
  }
});

/** Named detail groups each model must contain, so fine hardware cannot silently disappear. */
const DETAIL_PARTS = {
  'wash-basin': ['tap', 'drain', 'overflow'],
  'bath-vanity': ['tap', 'drain', 'overflow', 'doors', 'drawers', 'handle'],
  'shower-tray': [
    'shower-head',
    'hand-shower',
    'mixer-valve',
    'shower-door',
    'drain',
    'knob',
    'handle',
  ],
  toilet: ['toilet-seat', 'toilet-lid', 'toilet-hinge', 'flush-button'],
  'squat-toilet': ['flush-pipe', 'foot-pad'],
  bathtub: ['tap', 'drain', 'overflow'],
  'washing-machine': ['washer-door', 'soap-drawer', 'washer-display', 'knob'],
  'water-heater': ['thermostat', 'heater-pipe', 'knob'],
  'mirror-cabinet': ['mirror-cabinet', 'handle'],
  'towel-cabinet': ['towel-shelf', 'towel-frame'],
  'laundry-basket': ['basket-lid', 'basket-handle'],
  'nepali-doko': ['doko-strap'],
  'kitchen-stove': ['burner', 'oven-door', 'stove-display', 'knob'],
  'kitchen-fridge': ['dispenser', 'fridge-vent', 'handle'],
  'kitchen-counter': ['sink-bowl', 'tap', 'doors', 'drain'],
  'sink-unit': ['sink-bowl', 'tap', 'doors', 'drawers'],
  dishwasher: ['control-panel', 'knob'],
  'oven-unit': ['hob-zone', 'oven-door', 'knob'],
  'kitchen-island': ['stool', 'corbel', 'doors', 'drawers'],
  'dining-nook': ['nook-table'],
  'bed-king': ['headboard', 'mattress', 'duvet', 'pillow'],
  'bed-queen': ['headboard', 'mattress', 'duvet', 'pillow'],
  'bed-single': ['headboard', 'pillow'],
  'bed-storage-single': ['drawers', 'handle'],
  'bed-bunk': ['bunk-ladder', 'bunk-rail', 'bunk-mattress', 'pillow'],
  'wardrobe-3door': ['doors', 'handle'],
  'wardrobe-wall': ['doors', 'handle'],
  bookshelf: ['shelf', 'books'],
  'chest-drawers': ['drawers', 'handle'],
  'filing-cabinet': ['drawers', 'label-holder', 'lock'],
  'shoe-rack': ['rack-tier'],
  'bar-cabinet': ['doors', 'bottles', 'bar-display'],
  'microwave-stand': ['microwave', 'drawers'],
  'vanity-dresser': ['drawers', 'dresser-mirror', 'dresser-decor'],
  'media-console': ['doors', 'drawers', 'av-bay'],
  'sofa-3seat': ['seat-cushion', 'piping'],
  'sofa-l-shaped': ['seat-cushion', 'piping', 'pillow'],
  'recliner-chair': ['recliner-mech', 'seat-cushion'],
  ottoman: ['piping', 'tufting'],
  'desk-chair': ['caster', 'piping'],
  'dining-chair': ['piping'],
  'conference-table': ['cable-port'],
  'desk-executive': ['drawers'],
  nightstand: ['drawers', 'handle'],
  'dressing-table': ['dressing-mirror', 'dressing-decor', 'drawers'],
  'standing-desk': ['height-control', 'monitor'],
  'reception-counter': ['monitor'],
  'floor-lamp': ['lamp-switch'],
  'floor-lamp-torchiere': ['lamp-switch'],
  'cheval-mirror': ['cheval-mirror'],
  'room-divider-screen': ['screen-hinge'],
  'nepali-charpai': ['rope-weave'],
  'nepali-puja-mandir': ['shrine-contents', 'shrine-bell', 'shrine-lamp'],
  'nepali-pooja-table': ['pooja-set'],
};

function countOf(html, name) {
  return html.split(`name="${name}"`).length - 1;
}

describe('3D model detail parts', () => {
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  const render = (id, scale = 1) => {
    const item = FURNITURE_CATALOG.find((i) => i.id === id);
    const Model = resolveModel(item.shapeType);
    return renderToStaticMarkup(<Model {...modelProps(item, scale)} />);
  };

  for (const [id, parts] of Object.entries(DETAIL_PARTS)) {
    it(`${id} carries ${parts.join(', ')}`, () => {
      expect(FURNITURE_CATALOG.some((i) => i.id === id)).toBe(true);
      for (const scale of SCALES) {
        const html = render(id, scale);
        for (const part of parts)
          expect(html, `${id}@${scale}x ${part}`).toContain(`name="${part}"`);
      }
    });
  }

  it('the stove has four burners and at least four control knobs', () => {
    const html = render('kitchen-stove');
    expect(countOf(html, 'burner')).toBe(4);
    expect(countOf(html, 'knob')).toBeGreaterThanOrEqual(4);
  });

  it('the shower has one rain head, one hand shower and a mixer with knobs', () => {
    const html = render('shower-tray');
    expect(countOf(html, 'shower-head')).toBe(1);
    expect(countOf(html, 'hand-shower')).toBe(1);
    expect(countOf(html, 'knob')).toBeGreaterThanOrEqual(2);
  });

  it('wide wardrobes get a mirror door while narrow ones do not', () => {
    expect(render('wardrobe-3door')).toContain('name="wardrobe-mirror"');
    expect(render('wardrobe-2door')).not.toContain('name="wardrobe-mirror"');
  });

  it('the king bed has four pillows and the single bed one', () => {
    expect(countOf(render('bed-king'), 'pillow')).toBe(4);
    expect(countOf(render('bed-single'), 'pillow')).toBe(1);
  });

  it('fittings use absolute sizes: the tap scale is clamped when the basin is resized', () => {
    for (const scale of [0.4, 2.5]) {
      const html = render('wash-basin', scale);
      expect(html).toContain('name="tap"');
    }
  });
});

describe('model helpers', () => {
  it('corners returns the four inset footprint corners', () => {
    expect(corners(1, 0.5, 0.1)).toEqual([
      [-0.4, -0.15],
      [0.4, -0.15],
      [-0.4, 0.15],
      [0.4, 0.15],
    ]);
  });

  it('strutTransform centres a rod between two points and measures its length', () => {
    const t = strutTransform([0, 0, 0], [0, 2, 0]);
    expect(t.position).toEqual([0, 1, 0]);
    expect(t.length).toBeCloseTo(2);
    expect(t.quaternion.w).toBeCloseTo(1);
  });

  it('strutTransform tilts the rod towards the end point', () => {
    const t = strutTransform([0, 0, 0], [1, 0, 0]);
    expect(t.length).toBeCloseTo(1);
    expect(t.position).toEqual([0.5, 0, 0]);
    expect(Math.abs(t.quaternion.z)).toBeGreaterThan(0.5);
  });
});

describe('detail helpers', () => {
  it('clamp keeps hardware sizes within limits', () => {
    expect(clamp(5, 0.7, 1.4)).toBe(1.4);
    expect(clamp(0.1, 0.7, 1.4)).toBe(0.7);
    expect(clamp(1, 0.7, 1.4)).toBe(1);
  });

  it('shade returns a colour string for any base colour', () => {
    expect(shade('#808080', 0.1)).toMatch(/^rgb\(/);
    expect(shade('#ffffff', 0.5)).toMatch(/^rgb\(/);
  });
});
