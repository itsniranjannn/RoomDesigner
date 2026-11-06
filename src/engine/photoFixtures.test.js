import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, shrink } from '../../scripts/photo-harness/png.js';
import { detectSheetViews, cropSheetView } from './sheet.js';
import { build, fromSheet } from './photoTestKit.js';

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

function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
