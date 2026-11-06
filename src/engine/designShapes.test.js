import { describe, it, expect } from 'vitest';
import {
  DESIGN_TYPES,
  PALETTE_SLOTS,
  SHORT_LABEL,
  TYPICAL_WIDTH_CM,
  measureTraits,
  classifyType,
  buildDesign,
  sanitizeDesign,
  detectLShape,
  typeCandidates,
} from './design.js';

const S = 40;

/** Square view from a predicate over (u, v) in 0-1 with a colour function. */
function view(inside, color = () => [150, 140, 130]) {
  const mask = new Uint8Array(S * S);
  const rgb = new Uint8Array(S * S * 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const v = (y + 0.5) / S;
      const p = y * S + x;
      mask[p] = inside(u, v) ? 1 : 0;
      rgb.set(color(u, v), p * 3);
    }
  }
  return { mask, rgb, size: S };
}

const wood = [160, 120, 80];
const dark = [40, 30, 22];
const near = (u, targets) => targets.some((t) => Math.abs(u - t) < 0.03);
const flat = () => wood;
const circle = (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 <= 0.25;
const sideView = () => view((u, v) => u < 0.1 || v > 0.45);

describe('more furniture shapes', () => {
  it('reads an L-shaped plan view as a corner sofa and which side the chaise is on', () => {
    // Back run along the top, chaise down one side: the opposite front corner is empty
    const right = view(
      (u, v) => v < 0.55 || u > 0.64,
      () => [60, 90, 150]
    );
    const left = view(
      (u, v) => v < 0.55 || u < 0.36,
      () => [60, 90, 150]
    );
    expect(detectLShape(right)).toBe('right');
    expect(detectLShape(left)).toBe('left');
    // A plain block and a circle are not L shapes
    expect(detectLShape(view(() => true))).toBeNull();
    expect(detectLShape(view(circle))).toBeNull();
    const front = view(
      () => true,
      () => [60, 90, 150]
    );
    const dims = { widthCm: 260, depthCm: 160, heightCm: 85 };
    const d = buildDesign({ front, left: sideView(), top: right }, dims);
    expect(d.type).toBe('corner-sofa');
    expect(d.traits.side).toBe('right');
    expect(buildDesign({ front, left: sideView(), top: left }, dims).traits.side).toBe('left');
  });

  it('calls a round, backed seat a tub chair, and a square one an armchair', () => {
    const front = view(
      () => true,
      () => [150, 90, 60]
    );
    const dims = { widthCm: 75, depthCm: 75, heightCm: 78 };
    const tub = buildDesign({ front, left: sideView(), top: view(circle) }, dims);
    expect(tub.type).toBe('tub-chair');
    expect(tub.traits.plan).toBe('round');
    expect(buildDesign({ front, left: sideView(), top: view(() => true) }, dims).type).toBe(
      'armchair'
    );
  });

  it('tells a low squarish block with no back from a nightstand or a cabinet', () => {
    const traits = { rise: 1, gapFrac: 0, slabFrac: 0.1, round: false };
    expect(classifyType(traits, { widthCm: 60, depthCm: 60, heightCm: 42 })).toBe('ottoman');
    expect(classifyType(traits, { widthCm: 48, depthCm: 42, heightCm: 55 })).toBe('nightstand');
    expect(classifyType(traits, { widthCm: 160, depthCm: 45, heightCm: 80 })).toBe('cabinet');
    const d = buildDesign(
      { front: view(() => true, flat), top: view(circle) },
      { widthCm: 50, depthCm: 50, heightCm: 40 },
      'ottoman'
    );
    expect(d.traits.shape).toBe('round');
    expect(d.traits.feet).toBe('none');
  });

  it('calls a long, deep, low piece with no legs a daybed', () => {
    const traits = { rise: 1, gapFrac: 0.05, slabFrac: 0.1, round: false };
    const dims = { widthCm: 200, depthCm: 95, heightCm: 80 };
    expect(classifyType(traits, dims)).toBe('daybed');
    const slats = view(
      () => true,
      (u) => (Math.round(u * 40) % 4 === 0 ? dark : wood)
    );
    expect(buildDesign({ front: slats }, dims, 'daybed').traits.back).toBe('slat');
  });

  it('spots open shelving by what shows through it, and reads rows and a closed base', () => {
    const front = view(
      () => true,
      (u, v) => (near(v, [0.2, 0.4, 0.6]) ? dark : wood)
    );
    // Open compartments: the wall shows through the upper part, the lower part is solid
    front.open = Uint8Array.from(front.mask, (m, i) => (m && Math.floor(i / S) / S > 0.7 ? 1 : 0));
    const dims = { widthCm: 80, depthCm: 35, heightCm: 180 };
    expect(measureTraits({ front }).openFill).toBeLessThan(0.72);
    expect(classifyType(measureTraits({ front }), dims)).toBe('etagere');
    const d = buildDesign({ front }, dims, 'etagere');
    expect(d.traits.shelves).toBe(4);
    expect(d.traits.cols).toBe(1);
    expect(d.traits.base).toBe('doors');
    // A solid front is a closed bookshelf, never an open unit
    const solid = measureTraits({ front: view(() => true) });
    expect(classifyType(solid, { widthCm: 80, depthCm: 30, heightCm: 180 })).toBe('bookshelf');
  });

  it('reads sideboard sections and whether the fronts are doors or drawers', () => {
    const doors = view(
      () => true,
      (u) => (near(u, [0.25, 0.5, 0.75]) ? dark : wood)
    );
    const dims = { widthCm: 160, depthCm: 45, heightCm: 80 };
    const d = buildDesign({ front: doors }, dims, 'cabinet');
    expect(d.traits.n).toBe(4);
    expect(d.traits.front).toBe('doors');
    const drawers = view(
      () => true,
      (u, v) => (near(u, [0.5]) || near(v, [0.5]) ? dark : wood)
    );
    expect(buildDesign({ front: drawers }, dims, 'cabinet').traits.front).toBe('drawers');
    const legged = view((u, v) => v < 0.75 || u < 0.08 || u > 0.92, flat);
    expect(buildDesign({ front: legged }, dims, 'cabinet').traits.legs).toBe(1);
  });

  it('reads the headboard style of a bed', () => {
    const dims = { widthCm: 160, depthCm: 200, heightCm: 100 };
    const slatted = view(
      () => true,
      (u, v) => (v < 0.22 && Math.round(u * 40) % 4 === 0 ? dark : wood)
    );
    expect(buildDesign({ front: slatted }, dims, 'bed').traits.head).toBe('slat');
    const plain = buildDesign({ front: view(() => true, flat) }, dims, 'bed');
    expect(['panel', 'flat']).toContain(plain.traits.head);
  });

  it('reads a stool: round or square seat, a back and a footrest', () => {
    const bar = view((u, v) => v < 0.15 || u < 0.1 || u > 0.9 || (v > 0.55 && v < 0.62));
    const d = buildDesign({ front: bar }, { widthCm: 38, depthCm: 38, heightCm: 70 }, 'stool');
    expect(d.traits.seat).toBe('round');
    expect(d.traits.rest).toBe(1);
    expect(d.traits.back).toBe(0);
  });
});

describe('records of the new shapes', () => {
  const palette = { body: '#445566', accent: '#778899', cushion: '#998877', leg: '#222222' };
  const worst = {
    bed: {
      pillows: 4,
      bodyFrac: 0.55,
      legs: 1,
      head: 'channel',
      headW: 0.75,
      lumbar: 0,
      fold: 0,
      throw: 1,
      foot: 1,
      store: 1,
      skirt: 1,
      tiers: 1,
    },
    'corner-sofa': { side: 'right', seats: 4, arm: 0.08, tufted: 1, taper: 1 },
    'tub-chair': { plan: 'bucket', base: 'pedestal', tufted: 1 },
    ottoman: { shape: 'square', tufted: 1, feet: 'short' },
    daybed: { back: 'panel', ends: 2 },
    etagere: { shelves: 7, cols: 4, base: 'drawers', back: 1 },
    stool: { seat: 'square', back: 1, rest: 1 },
    cabinet: { front: 'mixed', n: 5, legs: 1 },
  };

  it('round-trips through storage and stays small enough for a share link', () => {
    for (const [type, traits] of Object.entries(worst)) {
      const record = {
        v: 1,
        type,
        palette: {
          ...palette,
          pillow: '#f4f1ea',
          base: '#8a6a4a',
          sheet: '#eeeeee',
          arm: '#664422',
        },
        traits,
      };
      const clean = sanitizeDesign(JSON.parse(JSON.stringify(record)));
      expect(clean.type).toBe(type);
      for (const [key, value] of Object.entries(traits))
        expect(clean.traits[key], `${type}.${key}`).toEqual(value);
      expect(JSON.stringify(clean).length, type).toBeLessThan(300);
    }
  });

  it('clamps and defaults what is outside the allowed choices', () => {
    const t = (type, traits) => sanitizeDesign({ type, palette, traits }).traits;
    expect(t('corner-sofa', { side: 'up', seats: 99 })).toMatchObject({ side: 'right', seats: 4 });
    expect(t('tub-chair', { plan: 'x', base: 'y' })).toMatchObject({
      plan: 'round',
      base: 'feet',
    });
    expect(t('etagere', { shelves: 1, cols: 9, base: 'moat' })).toMatchObject({
      shelves: 2,
      cols: 4,
      base: 'open',
    });
    expect(t('cabinet', { front: 'glass', n: 0 })).toMatchObject({ front: 'doors', n: 1 });
    expect(t('ottoman', { shape: 'cube', feet: 'stilts' })).toMatchObject({
      shape: 'square',
      feet: 'short',
    });
    expect(t('daybed', { back: 'x', ends: 7 })).toMatchObject({ back: 'panel', ends: 2 });
  });

  it('keeps designs saved before these options existed looking the same', () => {
    // A bed with channel stitching used the old flag
    const old = sanitizeDesign({ type: 'bed', palette, traits: { channels: 1 } });
    expect(old.traits.head).toBe('channel');
    expect(old.traits.channels).toBe(1);
    expect(sanitizeDesign({ type: 'bed', palette, traits: {} }).traits.head).toBe('panel');
    // Stools and cabinets with no new traits stay empty, so they keep their original 3D model
    expect(sanitizeDesign({ type: 'stool', palette, traits: {} }).traits).toEqual({});
    expect(sanitizeDesign({ type: 'cabinet', palette, traits: {} }).traits).toEqual({});
  });

  it('has a palette, a usual size and a label for every type', () => {
    for (const { id } of DESIGN_TYPES) {
      expect(PALETTE_SLOTS[id], id).toBeTruthy();
      expect(TYPICAL_WIDTH_CM[id], id).toBeGreaterThan(20);
      expect(SHORT_LABEL[id], id).toBeTruthy();
    }
  });
});

describe('quick type choices', () => {
  it('always offers the detected type first, with at most three distinct choices', () => {
    const views = { front: view(() => true), left: sideView() };
    const dims = { widthCm: 160, depthCm: 45, heightCm: 80 };
    const { list } = typeCandidates(views, dims, true, {}, 'cabinet');
    expect(list[0]).toBe('cabinet');
    expect(list.length).toBeLessThanOrEqual(3);
    expect(new Set(list).size).toBe(list.length);
  });

  it('is steadier for a clear case than for a toss-up', () => {
    const views = { front: view(() => true) };
    const clear = typeCandidates(views, { widthCm: 200, depthCm: 60, heightCm: 200 }, true, {});
    const toss = typeCandidates(views, { widthCm: 60, depthCm: 60, heightCm: 50 }, true, {});
    expect(clear.agreement).toBeGreaterThan(toss.agreement);
    expect(toss.list.length).toBeGreaterThanOrEqual(2);
  });

  it('offers the likely mix-ups for a sideboard', () => {
    const dims = { widthCm: 140, depthCm: 45, heightCm: 80 };
    const { list } = typeCandidates({ front: view(() => true) }, dims, true, {});
    expect(list).toContain('cabinet');
    expect(list.some((t) => ['nightstand', 'bookshelf', 'ottoman'].includes(t))).toBe(true);
  });
});
