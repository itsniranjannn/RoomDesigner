import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, shrink } from '../../scripts/photo-harness/png.js';
import { lifestyleScene, surface } from './testPhotos.js';
import { buildScene } from './photoTestKit.js';
import { detectStackedPhotos, cropRegion, symmetryScores } from './stacked.js';
import { sanitizeDesign, PALETTE_SLOTS, OPTIONAL_SLOTS } from './design.js';
import { pieceLabel } from './photoPipeline.js';

describe('photos taken in a room: what each piece is read as', () => {
  it('reads the sofa in a living room as a sofa, with the armchairs as pieces of their own', () => {
    const { cut, pieces } = buildScene(lifestyleScene('sofaAndChairs'));
    expect(cut.pieces.length).toBeGreaterThanOrEqual(3);
    expect(pieces[0].design.type).toBe('sofa');
    // a teal sofa on a wooden base keeps its colour, not a generic brown
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(pieces[0].design.palette.body.slice(i, i + 2), 16)
    );
    expect(g).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(r);
  });

  it('reads a wooden bed with a tall headboard in a bedroom as a bed, not a sofa', () => {
    const { pieces } = buildScene(lifestyleScene('bedroomBed'));
    expect(pieces[0].design.type).toBe('bed');
  });

  it('names pieces the way the dialog saves them', () => {
    expect(pieceLabel({ type: 'sofa', traits: { seats: 3 } })).toBe('3-seater sofa');
    expect(pieceLabel({ type: 'sofa', traits: { seats: 2 } })).toBe('loveseat');
    expect(pieceLabel({ type: 'armchair', traits: {} })).toBe('armchair');
    expect(pieceLabel({ type: 'coffee-table', traits: {} })).toBe('coffee table');
  });
});

describe('one picture holding several photos of the same piece', () => {
  const stacked = (axis) => {
    const a = lifestyleScene('bedroomBed');
    const b = lifestyleScene('bedroomBed');
    const gutter = 8;
    const s =
      axis === 'y'
        ? surface(a.width, a.height + b.height + gutter, [255, 255, 255])
        : surface(a.width + b.width + gutter, a.height, [255, 255, 255]);
    s.paste(a, 0, 0);
    if (axis === 'y') s.paste(b, 0, a.height + gutter);
    else s.paste(b, a.width + gutter, 0);
    return s;
  };

  it('finds a picture split by a plain gutter, stacked or side by side', () => {
    for (const axis of ['y', 'x']) {
      const s = stacked(axis);
      const found = detectStackedPhotos(s.rgba, s.width, s.height);
      expect(found).not.toBeNull();
      expect(found.axis).toBe(axis);
      expect(found.parts).toHaveLength(2);
      expect(found.similarity).toBeGreaterThan(0.5);
    }
  });

  it('crops each photo out and does not split a single photo', () => {
    const s = stacked('y');
    const found = detectStackedPhotos(s.rgba, s.width, s.height);
    const top = cropRegion(s.rgba, s.width, found.parts[0]);
    expect(top.width).toBe(480);
    expect(top.height).toBeGreaterThan(380);
    const single = lifestyleScene('sofaAndChairs');
    expect(detectStackedPhotos(single.rgba, single.width, single.height)).toBeNull();
  });

  it('picks the straight-on view as the most symmetric outline', () => {
    const sized = { width: 40, height: 20 };
    const straight = new Uint8Array(40 * 20);
    const skewed = new Uint8Array(40 * 20);
    for (let y = 2; y < 18; y++)
      for (let x = 4; x < 36; x++) {
        straight[y * 40 + x] = 1;
        if (x < 20 + (y - 2)) skewed[y * 40 + x] = 1;
      }
    const [a, b] = symmetryScores([straight, skewed], [sized, sized]);
    expect(a).toBeGreaterThan(0.95);
    expect(b).toBeLessThan(a);
  });
});

describe('records for ornate pieces', () => {
  it('keeps the new traits and colours through a share link or file round trip', () => {
    const bed = {
      v: 1,
      type: 'bed',
      palette: { body: '#8a4a2a', base: '#8a4a2a', panel: '#5a2f1c', accent: '#d8cbb8' },
      traits: { pillows: 2, head: 'tufted', crest: 2, framed: 1, foot: 2, legs: 2, headW: 0.85 },
    };
    const back = sanitizeDesign(JSON.parse(JSON.stringify(bed)));
    expect(back.traits).toMatchObject({ head: 'tufted', crest: 2, framed: 1, foot: 2, legs: 2 });
    expect(back.palette.panel).toBe('#5a2f1c');
    expect(JSON.stringify(back).length).toBeLessThan(300);

    const sofa = {
      v: 1,
      type: 'sofa',
      palette: { body: '#c9a56a', frame: '#4b2a17', trim: '#c9a24a', scatter: '#b08040' },
      traits: { seats: 3, frame: 2, trim: 1, cab: 1, pat: 1, scat: 3, roll: 1 },
    };
    const sofaBack = sanitizeDesign(JSON.parse(JSON.stringify(sofa)));
    expect(sofaBack.traits).toMatchObject({ frame: 2, trim: 1, cab: 1, pat: 1, scat: 3 });
    expect(sofaBack.palette).toMatchObject({ frame: '#4b2a17', trim: '#c9a24a' });
    expect(JSON.stringify(sofaBack).length).toBeLessThan(300);

    const chair = sanitizeDesign({
      v: 1,
      type: 'armchair',
      palette: { body: '#1f5a55', frame: '#5a3a22' },
      traits: { frame: 1, cane: 1 },
    });
    expect(chair.traits).toMatchObject({ frame: 1, cane: 1 });

    const table = sanitizeDesign({
      v: 1,
      type: 'coffee-table',
      palette: { body: '#3a1e12', trim: '#c9a24a' },
      traits: { trim: 1, cab: 1 },
    });
    expect(table.traits).toMatchObject({ trim: 1, cab: 1 });
  });

  it('is unchanged for plain records: older beds and sofas look as they did', () => {
    const plain = sanitizeDesign({
      v: 1,
      type: 'sofa',
      palette: { body: '#406e96' },
      traits: { seats: 3 },
    });
    expect(plain.traits.frame).toBeUndefined();
    const bed = sanitizeDesign({ v: 1, type: 'bed', palette: { body: '#aaa' }, traits: {} });
    expect(bed.traits.crest).toBeUndefined();
    expect(bed.traits.legs).toBe(0);
  });

  it('lists the new colour slots as optional', () => {
    for (const key of ['panel', 'frame', 'trim', 'scatter'])
      expect(OPTIONAL_SLOTS.has(key)).toBe(true);
    expect(PALETTE_SLOTS.bed.map(([k]) => k)).toContain('panel');
    expect(PALETTE_SLOTS.sofa.map(([k]) => k)).toEqual(expect.arrayContaining(['frame', 'trim']));
  });
});

/**
 * Real lifestyle pictures, when a folder of them is given: PHOTO_FIXTURES=<dir> with new-bed.png (two stacked photos
 * of a carved bed), new-teal.png (a teal sofa and two cane armchairs) and new-sofa.png (a carved sofa set with a
 * coffee table). Never kept in the repo, so skipped on a machine without them.
 */
const dir = process.env.PHOTO_FIXTURES;
const has = (name) => Boolean(dir) && fs.existsSync(path.join(dir, name));
const load = (name) => shrink(decodePng(path.join(dir, name)), 1000);

describe.skipIf(!has('new-bed.png'))('the real carved bed picture', () => {
  it('is split into two photos by itself and the front one is a carved bed with a crest', () => {
    const img = load('new-bed.png');
    const found = detectStackedPhotos(img.rgba, img.width, img.height);
    expect(found.parts).toHaveLength(2);
    const front = cropRegion(img.rgba, img.width, found.parts[0]);
    const { pieces } = buildScene(shrink(front, 480));
    const { design } = pieces[0];
    expect(design.type).toBe('bed');
    expect(design.traits.head).toBe('tufted');
    expect(design.traits.crest).toBeGreaterThanOrEqual(1);
    expect(design.traits.foot).toBe(2);
  });
});

describe.skipIf(!has('new-teal.png'))('the real teal sofa and cane armchairs picture', () => {
  it('reads the cropped sofa as a sofa and a cropped armchair as an armchair with a cane side', () => {
    const img = shrink(load('new-teal.png'), 480);
    const sofa = buildScene(img, { crop: { x0: 0.255, y0: 0.47, x1: 0.72, y1: 0.8 } });
    expect(sofa.pieces[0].design.type).toBe('sofa');
    const chair = buildScene(img, { crop: { x0: 0, y0: 0.5, x1: 0.28, y1: 0.85 } });
    expect(chair.pieces[0].design.type).toBe('armchair');
    expect(chair.pieces[0].design.traits.cane).toBe(1);
  });
});

describe.skipIf(!has('new-sofa.png'))('the real carved sofa set picture', () => {
  it('reads a cropped sofa as a sofa with a carved frame and gold trim', () => {
    const img = shrink(load('new-sofa.png'), 480);
    const { pieces } = buildScene(img, { crop: { x0: 0.45, y0: 0.22, x1: 0.99, y1: 0.62 } });
    const { design } = pieces[0];
    expect(design.type).toBe('sofa');
    expect(design.traits.frame).toBe(2);
    expect(design.traits.trim).toBe(1);
  });
});
