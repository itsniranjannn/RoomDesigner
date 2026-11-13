import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, shrink } from '../../scripts/photo-harness/png.js';
import { detectSheetViews, cropSheetView } from './sheet.js';
import { build, fromSheet, dialogPhoto } from './photoTestKit.js';

/**
 * Real product pictures, when a folder of them is given: PHOTO_FIXTURES=<dir> with 5.png (a bed sheet),
 * 8.png (a loveseat sheet) and 10.png (a wood-frame lounge chair sheet). They are never kept in the repo, so
 * these checks are skipped on a machine without them.
 */
const dir = process.env.PHOTO_FIXTURES;
const has = (name) => Boolean(dir) && fs.existsSync(path.join(dir, name));
const load = (name) => shrink(decodePng(path.join(dir, name)), 1800);

describe.skipIf(!has('5.png'))('the real bed sheet', () => {
  const sheet = () => load('5.png');
  const crop = (i) => {
    const s = sheet();
    const det = detectSheetViews(s.rgba, s.width, s.height);
    return cropSheetView(s.rgba, s.width, s.height, det, det.views[i]);
  };

  it('builds a bed with a panel headboard narrower than the base, white pillows and a dark duvet', () => {
    const { design } = build(fromSheet(sheet()).photos, { sheet: true });
    expect(design.type).toBe('bed');
    expect(design.traits.head).toBe('panel');
    expect(design.traits.legs).toBe(0);
    expect(design.traits.headW).toBeLessThanOrEqual(0.9);
    expect(design.traits.lumbar).toBe(1);
    const lum = (h) => hex(h).reduce((a, b) => a + b, 0) / 3;
    expect(lum(design.palette.pillow)).toBeGreaterThan(200);
    expect(lum(design.palette.accent)).toBeLessThan(lum(design.palette.body) - 25);
  });

  for (const [name, index, slot] of [
    ['front', 0, 'front'],
    ['side', 1, 'right'],
    ['top', 2, 'top'],
    ['three-quarter', 3, 'front'],
  ])
    it(`calls the ${name} picture alone a bed`, () => {
      expect(build({ [slot]: crop(index) }).design.type).toBe('bed');
    });
});

describe.skipIf(!has('8.png'))('the real loveseat sheet', () => {
  it('builds a two-seat sofa with rounded padded arms and tapered legs', () => {
    const { design } = build(fromSheet(load('8.png')).photos, { sheet: true });
    expect(design.type).toBe('sofa');
    expect(design.traits).toMatchObject({ seats: 2, roll: 1, taper: 1 });
  });
});

describe.skipIf(!has('10.png'))('the real lounge chair sheet', () => {
  it('builds a wood-frame lounge chair with back rails', () => {
    const { design } = build(fromSheet(load('10.png')).photos, { sheet: true });
    expect(design.type).toBe('lounge');
    expect(design.traits.slats).toBeGreaterThanOrEqual(3);
  });
});

/**
 * The second set of real pictures (r2-*.png), each dropped on the Front photo slot as a user would: the dialog's
 * own route (a sheet on a plain backdrop is split into views, a collage into photos) and cut-out, then the design.
 */
const r2 = (name) => dialogPhoto(load(name));
const hue = (h) => {
  const [r, g, b] = hex(h);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return null;
  const x = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return x * 60;
};
const lum = (h) => hex(h).reduce((a, b) => a + b, 0) / 3;

describe.skipIf(!has('r2-pink-channel-sofa.png'))(
  'the pink channel sofa, two three-quarter views',
  () => {
    it('builds a channel-tufted sofa with stepped arms on one long seat, in pink', () => {
      const { design, dims } = r2('r2-pink-channel-sofa.png');
      expect(design.type).toBe('sofa');
      expect(design.traits).toMatchObject({ chan: 1, step: 1, longSeat: 1, tufted: 0 });
      // read from both three-quarter views: about as deep as it is tall, not a bench
      expect(dims.depthCm / dims.widthCm).toBeGreaterThan(0.3);
      expect(dims.heightCm / dims.widthCm).toBeLessThan(0.45);
      const [r, g, b] = hex(design.palette.body);
      expect(r).toBeGreaterThan(g + 25);
      expect(r).toBeGreaterThan(b + 25);
      expect(lum(design.palette.body)).toBeGreaterThan(130);
    });
    // The small gold feet are a few pixels in this picture and are not read yet
    it.todo('reads the gold feet');
  }
);

describe.skipIf(!has('r2-mustard-tub-chair-sheet.png'))('the mustard tub chair sheet', () => {
  it('builds a round tub chair on thin metal legs whose shell slopes down to the front', () => {
    const { design, slots } = r2('r2-mustard-tub-chair-sheet.png');
    // top, front, three-quarter, side: the three-quarter view is left out
    expect(slots).toEqual(['top', 'front', null, expect.stringMatching(/right|left/)]);
    expect(design.type).toBe('tub-chair');
    expect(design.traits).toMatchObject({ base: 'metal', wrap: 1, plan: 'round', tufted: 0 });
    const h = hue(design.palette.body);
    expect(h).toBeGreaterThan(25);
    expect(h).toBeLessThan(55);
    // chrome legs: a light grey
    const [r, g, b] = hex(design.palette.leg);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(25);
    expect(lum(design.palette.leg)).toBeGreaterThan(130);
  });
});

describe.skipIf(!has('r2-carved-sofa-three.png'))('the carved sofa collage', () => {
  it('reads the big photo, not the small colourways, as a cream carved sofa', () => {
    const { design, route } = r2('r2-carved-sofa-three.png');
    expect(route).toBe('stacked');
    expect(design.type).toBe('sofa');
    expect(design.traits).toMatchObject({ frame: 2, roll: 1, cab: 1 });
    expect(design.traits.scat).toBeGreaterThanOrEqual(3);
    expect(lum(design.palette.body)).toBeGreaterThan(190);
    const wood = hue(design.palette.frame);
    expect(wood).toBeGreaterThan(15);
    expect(wood).toBeLessThan(50);
  });
});

describe.skipIf(!has('r2-office-desk-sheet.png'))('the office desk sheet', () => {
  it('builds a desk with a three-drawer pedestal on the right, a sled base and a modesty panel', () => {
    const { design } = r2('r2-office-desk-sheet.png');
    expect(design.type).toBe('desk');
    expect(design.traits).toMatchObject({ ped: 'right', base: 'sled', modesty: 1 });
    expect(design.traits.drawers).toBeGreaterThanOrEqual(2);
    expect(design.traits.drawers).toBeLessThanOrEqual(4);
    expect(lum(design.palette.body)).toBeLessThan(90);
  });
});

describe.skipIf(!has('r2-metal-bed-sheet.png'))('the metal bed sheet', () => {
  it('builds a tube metal bed with guard rails and a foot rail, in the frame colour', () => {
    const { design, dims } = r2('r2-metal-bed-sheet.png');
    expect(design.type).toBe('bed');
    expect(design.traits).toMatchObject({ metal: 1, rails: 1, foot: 1, pillows: 1 });
    expect(lum(design.palette.base)).toBeLessThan(110);
    // a single bed: about two metres long and under a metre wide
    expect(dims.depthCm).toBeGreaterThan(190);
    expect(dims.widthCm).toBeLessThan(110);
  });
  // The views are about 60 pixels tall: the castors are too small to read yet
  it.todo('reads the castors');
});

describe.skipIf(!has('r2-mirror-wardrobe-drawers.png'))(
  'the wardrobe shown closed and open',
  () => {
    it('reads the closed view: two doors, an oval mirror, three drawers on the right, ring handles', () => {
      const { design } = r2('r2-mirror-wardrobe-drawers.png');
      expect(design.type).toBe('wardrobe');
      expect(design.traits).toMatchObject({
        doors: 2,
        mirror: 2,
        drawers: 3,
        dside: 'right',
        handle: 'ring',
      });
      // wood carcass, white door
      const h = hue(design.palette.body);
      expect(h).toBeGreaterThan(15);
      expect(h).toBeLessThan(50);
      expect(lum(design.palette.door)).toBeGreaterThan(200);
    });
  }
);

describe.skipIf(!has('r2-room-built-in-wardrobe.png'))('the built-in wardrobe in a room', () => {
  it('is read as a wardrobe with bar handles and an open niche', () => {
    const { design } = r2('r2-room-built-in-wardrobe.png');
    expect(design.type).toBe('wardrobe');
    expect(design.traits).toMatchObject({ handle: 'bar', niche: 1 });
    const [r, g, b] = hex(design.palette.body);
    expect(g).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(r);
  });
  // The cut-out misses the left door column; the top cupboards, fluting, gold handles and the drawer count under
  // the niche are not read yet
  it.todo('reads the top cupboards, the fluted doors, the gold handles and four drawers');
});

describe.skipIf(!has('r2-room-white-wardrobe.png'))('the white wardrobe in a room', () => {
  // The white doors on a cream wall are lost by the room cut-out (it keeps the clothes and the drawers)
  it.todo('is read as a four-door white wardrobe with a mirror door and two rows of drawers');
});

function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
