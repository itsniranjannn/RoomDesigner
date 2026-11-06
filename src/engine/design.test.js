import { describe, it, expect } from 'vitest';
import {
  DESIGN_TYPES,
  PALETTE_SLOTS,
  OPTIONAL_SLOTS,
  measureTraits,
  classifyType,
  buildDesign,
  sanitizeDesign,
  depthProfile,
  classifyFromFront,
  inferDimensions,
  detectionConfidence,
  withMirroredSides,
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
      for (const [key] of PALETTE_SLOTS[id].filter(([k]) => !OPTIONAL_SLOTS.has(k)))
        expect(d.palette[key]).toMatch(/^#[0-9a-f]{6}$/);
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

describe('reading structure from the front photo', () => {
  const wood = [160, 120, 80];
  const dark = [50, 35, 25];
  const near = (u, targets) => targets.some((t) => Math.abs(u - t) < 0.03);

  it('counts wardrobe doors from the gaps between them', () => {
    const front = view(
      () => true,
      (u) => (near(u, [1 / 3, 2 / 3]) ? dark : wood)
    );
    const d = buildDesign({ front }, { widthCm: 150, depthCm: 55, heightCm: 200 }, 'wardrobe');
    expect(d.traits.doors).toBe(3);
  });

  it('falls back to the width when no gaps show', () => {
    const d = buildDesign(
      {
        front: view(
          () => true,
          () => wood
        ),
      },
      { widthCm: 124, depthCm: 55, heightCm: 200 },
      'wardrobe'
    );
    expect(d.traits.doors).toBe(2);
  });

  it('counts bookshelf compartments from the shelf lines', () => {
    const front = view(
      () => true,
      (u, v) => (near(v, [0.25, 0.5, 0.75]) ? dark : wood)
    );
    const d = buildDesign({ front }, { widthCm: 80, depthCm: 30, heightCm: 180 }, 'bookshelf');
    expect(d.traits.shelves).toBe(4);
  });

  it('counts nightstand drawers', () => {
    const front = view(
      () => true,
      (u, v) => (near(v, [0.5]) ? dark : wood)
    );
    const d = buildDesign({ front }, { widthCm: 45, depthCm: 40, heightCm: 55 }, 'nightstand');
    expect(d.traits.drawers).toBe(2);
  });

  it('tells a solid chair back from slats and an open back', () => {
    const dims = { widthCm: 45, depthCm: 48, heightCm: 90 };
    const chair = (back) =>
      buildDesign(
        { front: view((u, v) => (v < 0.3 ? back(u) : v < 0.5 || u < 0.1 || u > 0.9)) },
        dims,
        'chair'
      ).traits.back;
    expect(chair(() => true)).toBe('solid');
    expect(chair((u) => Math.floor(u * 10) % 2 === 0)).toBe('slat');
    expect(chair((u) => u < 0.1 || u > 0.9)).toBe('open');
  });

  it('keeps sofa seats within what the width allows', () => {
    const front = view(
      () => true,
      (u, v) => (v > 0.5 && v < 0.76 && near(u, [0.5]) ? dark : wood)
    );
    const d = buildDesign({ front }, { widthCm: 210, depthCm: 90, heightCm: 85 }, 'sofa');
    expect(d.traits.seats).toBe(2);
    expect(d.traits.arm).toBeGreaterThanOrEqual(0.04);
  });

  it('measures the leg thickness of a table', () => {
    const front = view((u, v) => v < 0.12 || u < 0.08 || u > 0.92);
    const d = buildDesign({ front }, { widthCm: 150, depthCm: 80, heightCm: 75 }, 'table');
    expect(d.traits.legFrac).toBeCloseTo(0.08, 1);
  });
});

describe('faithful colours', () => {
  it('uses the photographed duvet colour as it is, without brightening', () => {
    const flat = () =>
      view(
        () => true,
        () => [100, 90, 80]
      );
    const d = buildDesign(
      {
        front: flat(),
        top: flat(),
        left: view(
          (u, v) => u < 0.1 || v > 0.45,
          () => [100, 90, 80]
        ),
      },
      { widthCm: 160, depthCm: 183, heightCm: 96 },
      'bed'
    );
    const ch = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(ch(d.palette.accent)).toEqual([100, 90, 80]);
  });
});

describe('proportions without a real size', () => {
  const traits = { rise: 1, gapFrac: 0, slabFrac: 0.1, round: false };
  it('does not turn a wardrobe into a cabinet just because the size is small', () => {
    // 80 wide, 30 deep, 90 high: the ratios of a 180 x 68 x 200 wardrobe
    expect(classifyType(traits, { widthCm: 80, depthCm: 30, heightCm: 89 }, false)).toBe(
      'wardrobe'
    );
    expect(classifyType(traits, { widthCm: 80, depthCm: 30, heightCm: 89 }, true)).not.toBe(
      'wardrobe'
    );
  });
  it('finds nightstands and coffee tables by ratio', () => {
    expect(classifyType(traits, { widthCm: 48, depthCm: 42, heightCm: 55 }, false)).toBe(
      'nightstand'
    );
    expect(
      classifyType({ ...traits, gapFrac: 0.6 }, { widthCm: 80, depthCm: 45, heightCm: 30 }, false)
    ).toBe('coffee-table');
  });
});

describe('storage of new traits', () => {
  it('keeps and clamps door, shelf, drawer, back and leg traits', () => {
    expect(
      sanitizeDesign({ type: 'wardrobe', palette: {}, traits: { doors: 99 } }).traits.doors
    ).toBe(6);
    expect(
      sanitizeDesign({ type: 'bookshelf', palette: {}, traits: { shelves: 1 } }).traits.shelves
    ).toBe(2);
    expect(
      sanitizeDesign({ type: 'nightstand', palette: {}, traits: { drawers: 3 } }).traits.drawers
    ).toBe(3);
    expect(sanitizeDesign({ type: 'chair', palette: {}, traits: { back: 'x' } }).traits.back).toBe(
      'slat'
    );
    const t = sanitizeDesign({
      type: 'table',
      palette: {},
      traits: { legFrac: 5, roundLegs: 1 },
    }).traits;
    expect(t.legFrac).toBe(0.12);
    expect(t.roundLegs).toBe(1);
  });
});

describe('slatted backs hidden by the filled silhouette', () => {
  it('reads the gaps from the open mask when the photo has one', () => {
    const dims = { widthCm: 45, depthCm: 48, heightCm: 90 };
    const filled = view(() => true);
    const slats = view((u) => Math.floor(u * 10) % 2 === 0);
    expect(buildDesign({ front: filled }, dims, 'chair').traits.back).toBe('solid');
    const front = { ...filled, open: slats.mask };
    expect(buildDesign({ front }, dims, 'chair').traits.back).toBe('slat');
  });
});

describe('one long seat cushion on a sofa', () => {
  const fabric = [60, 90, 150];
  const dark = [20, 30, 50];
  const near = (u, t) => Math.abs(u - t) < 0.03;
  const dims = { widthCm: 150, depthCm: 85, heightCm: 85 };

  it('is found when two back cushions sit on one seat with no seam across it', () => {
    const front = view(
      () => true,
      (u, v) => (v > 0.12 && v < 0.42 && near(u, 0.5) ? dark : fabric)
    );
    const d = buildDesign({ front }, dims, 'sofa');
    expect(d.traits.longSeat).toBe(1);
    expect(d.traits.seats).toBe(2);
  });

  it('stays off when the seat has its own seams', () => {
    const front = view(
      () => true,
      (u, v) => (v > 0.12 && v < 0.76 && near(u, 0.5) ? dark : fabric)
    );
    expect(buildDesign({ front }, dims, 'sofa').traits.longSeat).toBe(0);
  });

  it('is kept by storage and defaults to separate cushions for older designs', () => {
    const base = { type: 'sofa', palette: { body: '#112233' } };
    expect(sanitizeDesign({ ...base, traits: { seats: 2, longSeat: 1 } }).traits.longSeat).toBe(1);
    const old = sanitizeDesign({ ...base, traits: { seats: 3 } });
    expect(old.traits.longSeat).toBe(0);
    expect(old.traits.seats).toBe(3);
  });
});

describe('building from a single photo', () => {
  const sofaFront = () =>
    view(
      () => true,
      (u, v) => (v > 0.5 && v < 0.6 ? [30, 40, 70] : [60, 90, 150])
    );

  it('guesses the type from the front view and its proportions alone', () => {
    expect(classifyFromFront(sofaFront(), 1.9)).toBe('sofa');
    expect(classifyFromFront(sofaFront(), 1.1)).toBe('armchair');
    const table = view((u, v) => v < 0.12 || u < 0.08 || u > 0.92);
    expect(classifyFromFront(table, 2)).toBe('table');
    const stool = view((u, v) => v < 0.12 || u < 0.1 || u > 0.9);
    expect(classifyFromFront(stool, 0.6)).toBe('stool');
  });

  it('builds a complete design from the front photo only', () => {
    const d = buildDesign(
      { front: sofaFront() },
      { widthCm: 80, depthCm: 50, heightCm: 80 },
      undefined,
      false,
      {
        widthPerHeight: 1.9,
      }
    );
    expect(d.type).toBe('sofa');
    expect(d.traits.seats).toBeGreaterThanOrEqual(1);
    expect(d.palette.body).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('builds from a lone side photo too', () => {
    const side = view((u, v) => u < 0.1 || v > 0.45);
    expect(
      buildDesign({ left: side }, { widthCm: 80, depthCm: 50, heightCm: 80 }).type
    ).toBeTruthy();
  });

  it('fills in the depth and height a photo cannot show with the usual for the type', () => {
    const sofa = inferDimensions('sofa', { widthPerHeight: 2 }, 200);
    expect(sofa).toEqual({ widthCm: 200, depthCm: 90, heightCm: 100 });
    expect(inferDimensions('chair', {}).depthCm).toBe(48);
    // A side photo fixes the depth instead
    expect(inferDimensions('sofa', { depthPerHeight: 1 }, 200).depthCm).toBe(85);
  });

  it('says how sure it is from the photos it had', () => {
    expect(detectionConfidence(['front'])).toBe('rough');
    expect(detectionConfidence(['front', 'top'])).toBe('fair');
    expect(detectionConfidence(['front', 'right'])).toBe('good');
  });
});

describe('mirroring the other side', () => {
  const photo = (marks) => {
    const rgba = new Uint8ClampedArray(4 * 2 * 4);
    marks.forEach((x) => {
      rgba[x * 4] = 200; // red in column x of the first row
      rgba[x * 4 + 3] = 255;
    });
    return { width: 4, height: 2, rgba };
  };

  it('copies a lone side flipped left to right for the opposite side', () => {
    const out = withMirroredSides({ right: photo([0]) });
    expect(out.left.mirroredFrom).toBe('right');
    expect(out.left.rgba[3 * 4]).toBe(200);
    expect(out.left.rgba[0]).toBe(0);
    expect(withMirroredSides({ left: photo([1]) }).right.rgba[2 * 4]).toBe(200);
  });

  it('never replaces a photo the user gave', () => {
    const mine = photo([2]);
    const out = withMirroredSides({ right: photo([0]), left: mine });
    expect(out.left).toBe(mine);
    expect(withMirroredSides({ front: photo([0]) }).left).toBeUndefined();
  });
});
