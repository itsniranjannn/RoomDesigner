import { describe, it, expect } from 'vitest';
import {
  DESIGN_TYPES,
  PALETTE_SLOTS,
  measureTraits,
  classifyType,
  buildDesign,
  sanitizeDesign,
  depthProfile,
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

// A bed: the front shows a wide block with a headboard band, the side shows the headboard rising at the back
const bedViews = () => ({
  front: view(
    () => true,
    (u, v) => (v < 0.3 ? [170, 160, 150] : v < 0.8 ? [90, 85, 80] : [170, 160, 150])
  ),
  left: view((u, v) => u < 0.1 || v > 0.45),
  top: view(
    () => true,
    (u, v) => (v < 0.1 ? [170, 160, 150] : v < 0.4 ? [240, 240, 240] : [90, 85, 80])
  ),
});

describe('measuring a photographed piece', () => {
  it('reads the headboard rise from the side view whichever way the side photo faces', () => {
    const left = measureTraits({ left: view((u, v) => u < 0.1 || v > 0.45) });
    expect(left.rise).toBeGreaterThan(1.5);
    expect(left.tallEnd).toBe('back');
    // The tall end on the other edge is still taken as the back
    const flipped = measureTraits({ left: view((u, v) => u > 0.9 || v > 0.45) });
    expect(flipped.tallEnd).toBe('back');
    const profile = depthProfile({ right: view((u, v) => u < 0.1 || v > 0.45) });
    expect(profile[S - 1]).toBeGreaterThan(0.9);
  });

  it('sees the space under a table and the thickness of its top', () => {
    const table = view((u, v) => v < 0.15 || u < 0.12 || u > 0.88);
    const t = measureTraits({ front: table });
    expect(t.gapFrac).toBeGreaterThan(0.3);
    expect(t.slabFrac).toBeLessThan(0.25);
    expect(measureTraits({ front: view(() => true) }).gapFrac).toBeLessThan(0.05);
  });

  it('spots a round plan view', () => {
    const round = view((u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 <= 0.25);
    expect(measureTraits({ top: round }).round).toBe(true);
    expect(measureTraits({ top: view(() => true) }).round).toBe(false);
  });
});

describe('guessing the type of furniture', () => {
  const traits = (over) => ({ rise: 1, gapFrac: 0, slabFrac: 0.1, round: false, ...over });
  const size = (widthCm, depthCm, heightCm) => ({ widthCm, depthCm, heightCm });

  it('tells beds, sofas and armchairs apart by proportion', () => {
    expect(classifyType(traits({ rise: 1.8 }), size(160, 183, 96))).toBe('bed');
    expect(classifyType(traits({ rise: 1.5 }), size(220, 90, 82))).toBe('sofa');
    expect(classifyType(traits({ rise: 1.5 }), size(85, 85, 76))).toBe('armchair');
  });

  it('tells chairs, stools and tables apart', () => {
    expect(classifyType(traits({ rise: 1.6, gapFrac: 0.45 }), size(45, 50, 90))).toBe('chair');
    expect(classifyType(traits({ gapFrac: 0.5 }), size(35, 35, 65))).toBe('stool');
    expect(classifyType(traits({ gapFrac: 0.8 }), size(180, 90, 75))).toBe('table');
    expect(classifyType(traits({ gapFrac: 0.6 }), size(110, 60, 42))).toBe('coffee-table');
    expect(classifyType(traits({ gapFrac: 0.8 }), size(140, 70, 75))).toBe('desk');
    expect(classifyType(traits({ gapFrac: 0.8, round: true }), size(100, 100, 75))).toBe(
      'table-round'
    );
  });

  it('tells storage by size', () => {
    expect(classifyType(traits(), size(180, 60, 220))).toBe('wardrobe');
    expect(classifyType(traits(), size(80, 30, 180))).toBe('bookshelf');
    expect(classifyType(traits(), size(160, 45, 80))).toBe('cabinet');
  });
});

describe('building the design of a bed', () => {
  const dims = { widthCm: 160, depthCm: 183, heightCm: 96 };

  it('finds the bed, the upholstery, duvet and pillow colours and the pillow count', () => {
    const d = buildDesign(bedViews(), dims);
    expect(d.type).toBe('bed');
    const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(channels(d.palette.body)).toEqual([170, 160, 150]);
    // The duvet is the darker cover (lifted slightly), the pillows the light ones
    expect(channels(d.palette.accent)[0]).toBeLessThan(140);
    expect(channels(d.palette.pillow)[0]).toBeGreaterThan(220);
    expect(d.traits.pillows).toBeGreaterThanOrEqual(2);
    expect(d.traits.bodyFrac).toBeGreaterThan(0.3);
    expect(d.traits.bodyFrac).toBeLessThan(0.8);
  });

  it('keeps the type the user chose', () => {
    expect(buildDesign(bedViews(), dims, 'sofa').type).toBe('sofa');
  });

  it('gives every type a palette with its slots filled in', () => {
    for (const { id } of DESIGN_TYPES) {
      const d = buildDesign(bedViews(), { widthCm: 120, depthCm: 80, heightCm: 80 }, id);
      for (const [key] of PALETTE_SLOTS[id]) expect(d.palette[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('stays tiny enough to ride along in a share link', () => {
    expect(JSON.stringify(buildDesign(bedViews(), dims)).length).toBeLessThan(300);
  });
});

describe('design records from outside', () => {
  const good = {
    v: 1,
    type: 'bed',
    palette: { body: '#AABBCC', accent: '#112233' },
    traits: { pillows: 9, bodyFrac: 5, legs: 1 },
  };

  it('accepts a good record and clamps its traits', () => {
    const d = sanitizeDesign(good);
    expect(d.palette.body).toBe('#aabbcc');
    expect(d.traits.pillows).toBe(4);
    expect(d.traits.bodyFrac).toBe(0.9);
    expect(d.traits.legs).toBe(1);
  });

  it('rejects junk and drops unknown or unsafe fields', () => {
    expect(sanitizeDesign(null)).toBeNull();
    expect(sanitizeDesign({ type: 'spaceship' })).toBeNull();
    const d = sanitizeDesign({
      ...good,
      palette: { body: 'url(x)', accent: 'red' },
      extra: 1,
      traits: { pillows: 'x' },
    });
    expect(d.palette.accent).toBeUndefined();
    expect(d.palette.body).toMatch(/^#[0-9a-f]{6}$/);
    expect(d.traits.pillows).toBe(2);
    expect(d.extra).toBeUndefined();
  });
});
