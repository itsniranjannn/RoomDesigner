import { describe, it, expect } from 'vitest';
import { segmentObject, maskCoverage } from './hull.js';
import {
  detectSheetViews,
  assignSheetViews,
  cropSheetView,
  chooseSideSlot,
  prepareCrop,
  estimateProportions,
  estimatePartialProportions,
} from './sheet.js';
import { withMirroredSides } from './design.js';
import { buildViews, designFromViews } from './photoPipeline.js';
import {
  bedPhoto,
  sofaPhoto,
  armchairPhoto,
  tablePhoto,
  productSheet,
  BED_COLORS,
  SOFA_COLORS,
} from './testPhotos.js';

/**
 * Fidelity guard: pictures of known furniture go through the same steps the Create from photos dialog
 * runs (cut-out, views, detection, design record) and must keep coming out as the right type with the
 * right distinguishing details. A change that makes a bed turn into a sofa, or loses the headboard,
 * pillows or colours, fails here.
 */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (h, rgb, tol = 40) => hex(h).every((c, i) => Math.abs(c - rgb[i]) <= tol);

/** What the dialog does with photos in slots: cut out, mirror a lone side, build views, read the design. */
function build(slotPhotos, { tolerance = 16, forceType } = {}) {
  let photos = {};
  for (const [slot, p] of Object.entries(slotPhotos)) photos[slot] = { ...p };
  if (Boolean(photos.left) !== Boolean(photos.right)) photos = withMirroredSides(photos);
  const cuts = {};
  const cutouts = {};
  for (const [slot, p] of Object.entries(photos)) {
    const mask = segmentObject(p.rgba, p.width, p.height, tolerance);
    cuts[slot] = { mask, coverage: maskCoverage(mask) };
    cutouts[slot] = { mask, width: p.width, height: p.height };
  }
  const views = buildViews(photos, cuts, tolerance);
  return designFromViews(views, {
    dims: { widthCm: 80, depthCm: 50, heightCm: 80 },
    forceType,
    ratios: estimateProportions(cutouts),
    partial: estimatePartialProportions(cutouts),
  });
}

/** A product sheet through detection, view roles and crops, as the dialog's sheet splitter does. */
function fromSheet(sheet) {
  const detection = detectSheetViews(sheet.rgba, sheet.width, sheet.height);
  const slots = assignSheetViews(detection.views);
  const crops = detection.views.map((v) =>
    cropSheetView(sheet.rgba, sheet.width, sheet.height, detection, v)
  );
  const side = slots.indexOf('right');
  if (side >= 0) {
    const get = (slot) => {
      const i = slots.indexOf(slot);
      return i >= 0 ? prepareCrop(crops[i]) : null;
    };
    slots[side] = chooseSideSlot({ front: get('front'), top: get('top'), side: get('right') });
  }
  const photos = {};
  detection.views.forEach((v, i) => {
    if (slots[i] && !photos[slots[i]]) photos[slots[i]] = crops[i];
  });
  return { slots, photos, detection };
}

describe('a bed sheet (front, side, plan and three-quarter views)', () => {
  const sheet = productSheet(['front', 'side', 'top', 'threeQuarter'].map((v) => bedPhoto(v)));

  it('finds four views and gives the front, side and plan their roles', () => {
    const { slots, detection } = fromSheet(sheet);
    expect(detection.views).toHaveLength(4);
    expect(
      slots
        .filter(Boolean)
        .map((s) => (s === 'left' ? 'right' : s))
        .sort()
    ).toEqual(['front', 'right', 'top']);
  });

  it('builds a bed with its headboard, pillows, bolster and colours', () => {
    const { design, dims } = build(fromSheet(sheet).photos);
    expect(design.type).toBe('bed');
    expect(design.traits.head).toBe('panel');
    expect(design.traits.legs).toBe(0);
    expect(design.traits.pillows).toBeGreaterThanOrEqual(2);
    // The headboard is narrower than the base, and the bolster in front of the pillows is seen
    expect(design.traits.headW).toBeGreaterThanOrEqual(0.7);
    expect(design.traits.headW).toBeLessThanOrEqual(0.9);
    expect(design.traits.lumbar).toBe(1);
    // Headboard taupe, duvet darker, pillows and sheet near white
    expect(near(design.palette.body, BED_COLORS.head, 30), `body ${design.palette.body}`).toBe(
      true
    );
    expect(
      near(design.palette.accent, BED_COLORS.duvet, 40),
      `accent ${design.palette.accent}`
    ).toBe(true);
    expect(
      near(design.palette.pillow, [246, 245, 243], 25),
      `pillow ${design.palette.pillow}`
    ).toBe(true);
    expect(near(design.palette.sheet, BED_COLORS.sheet, 30), `sheet ${design.palette.sheet}`).toBe(
      true
    );
    // A bed is wider than tall and deeper than wide
    expect(dims.depthCm).toBeGreaterThan(dims.widthCm);
  });
});

describe('one picture of a bed, from any side', () => {
  const views = ['front', 'side', 'top', 'threeQuarter'];
  const slotFor = { front: 'front', side: 'right', top: 'top', threeQuarter: 'front' };

  for (const view of views) {
    it(`calls a lone ${view} picture a bed, never a sofa, daybed or cabinet`, () => {
      const { design, candidates } = build({ [slotFor[view]]: bedPhoto(view) });
      expect(design.type).toBe('bed');
      expect(candidates.list[0]).toBe('bed');
    });
  }

  it('also finds the bed when the side picture is faced the other way', () => {
    expect(build({ left: bedPhoto('side') }).design.type).toBe('bed');
  });

  it('reads the bed colours from a single front picture', () => {
    const { design } = build({ front: bedPhoto('front') });
    expect(near(design.palette.body, BED_COLORS.head, 30), `body ${design.palette.body}`).toBe(
      true
    );
    expect(
      near(design.palette.accent, BED_COLORS.duvet, 45),
      `accent ${design.palette.accent}`
    ).toBe(true);
    expect(
      near(design.palette.pillow, BED_COLORS.pillow, 30),
      `pillow ${design.palette.pillow}`
    ).toBe(true);
    expect(design.traits.headW).toBeLessThan(0.95);
  });

  it('keeps a bed a bed with any two of its pictures', () => {
    const photo = (v) => bedPhoto(v);
    for (const pair of [
      { front: photo('front'), right: photo('side') },
      { front: photo('front'), top: photo('top') },
      { right: photo('side'), top: photo('top') },
    ])
      expect(build(pair).design.type, Object.keys(pair).join('+')).toBe('bed');
  });

  it('keeps a bed with legs a bed', () => {
    const front = bedPhoto('front');
    // lift the body off the floor: blank out the lowest rows under the legs except two feet
    for (let y = 118; y < 150; y++)
      for (let x = 30; x < 200; x++) {
        const foot = (x >= 34 && x < 44) || (x >= 186 && x < 196);
        if (y >= 134 && !foot) front.rgba.set([255, 255, 255, 255], (y * front.width + x) * 4);
      }
    expect(build({ front }).design.type).toBe('bed');
  });
});

describe('sofas and chairs are not mistaken for beds', () => {
  it('builds a sofa from its sheet views and from one front picture', () => {
    const sheet = productSheet([sofaPhoto('front'), sofaPhoto('side'), sofaPhoto('top')]);
    const { photos } = fromSheet(sheet);
    expect(build(photos).design.type).toBe('sofa');
    const lone = build({ front: sofaPhoto('front') });
    expect(lone.design.type).toBe('sofa');
    expect(near(lone.design.palette.body, SOFA_COLORS.body, 40)).toBe(true);
  });

  it('builds an armchair from a lone front picture', () => {
    expect(build({ front: armchairPhoto('front') }).design.type).toBe('armchair');
  });

  it('keeps a sofa a sofa from the side', () => {
    expect(['sofa', 'armchair']).toContain(build({ right: sofaPhoto('side') }).design.type);
  });

  it('never hands the new rare types to common pieces', () => {
    for (const lone of [sofaPhoto('front'), armchairPhoto('front'), bedPhoto('front')]) {
      const { design } = build({ front: lone });
      expect(['daybed', 'corner-sofa', 'tub-chair', 'etagere']).not.toContain(design.type);
    }
  });
});

describe('details beyond the bed', () => {
  it('reads arms in another material than the body of a sofa', () => {
    const front = sofaPhoto('front', { ...SOFA_COLORS, body: [200, 190, 170] });
    // brown leather arms: repaint the two arm blocks
    for (let y = 22; y < 84; y++)
      for (let x = 4; x < 256; x++) {
        const arm = x < 40 || x >= 220;
        if (arm && y > 20) front.rgba.set([110, 60, 30, 255], (y * front.width + x) * 4);
      }
    const { design } = build({ front });
    expect(design.type).toBe('sofa');
    expect(near(design.palette.arm, [110, 60, 30], 40), `arm ${design.palette.arm}`).toBe(true);
    // The same cloth all over keeps the arms the colour of the body
    const same = build({ front: sofaPhoto('front') }).design;
    expect(same.palette.arm).toBe(same.palette.body);
  });

  it('reads the thickness of a table top', () => {
    const thin = build({ front: tablePhoto(4) }).design;
    const thick = build({ front: tablePhoto(20) }).design;
    expect(thin.type).toBe('table');
    expect(thick.type).toBe('table');
    expect(thick.traits.topH).toBeGreaterThan(thin.traits.topH);
    expect(thin.traits.topH).toBeLessThanOrEqual(3);
  });
});

describe('the details of a design survive being saved and shared', () => {
  it('keeps what was read from a bed through JSON', async () => {
    const { sanitizeDesign } = await import('./design.js');
    const { design } = build(
      fromSheet(productSheet(['front', 'side', 'top', 'threeQuarter'].map((v) => bedPhoto(v))))
        .photos
    );
    const clean = sanitizeDesign(JSON.parse(JSON.stringify(design)));
    expect(clean.type).toBe('bed');
    expect(clean.palette).toMatchObject({
      body: design.palette.body,
      accent: design.palette.accent,
      sheet: design.palette.sheet,
      pillow: design.palette.pillow,
    });
    expect(clean.traits.headW).toBe(design.traits.headW);
    expect(JSON.stringify(clean).length).toBeLessThan(300);
  });
});
