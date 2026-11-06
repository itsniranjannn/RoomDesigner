import { describe, it, expect } from 'vitest';
import {
  extractForeground,
  backdropIsPlain,
  splitPieces,
  paintStrokes,
  resizeMask,
  cutQuality,
} from './foreground.js';
import { groupPieces, pieceMask } from './photoPipeline.js';
import { segmentObject } from './hull.js';
import { lifestyleScene, sofaPhoto, surface } from './testPhotos.js';

/** How much of the true shape the mask covers (recall), and how much of the mask lies outside it (spill). */
function overlap(mask, w, box) {
  let inside = 0;
  let outside = 0;
  let total = 0;
  for (let y = 0; y < mask.length / w; y++)
    for (let x = 0; x < w; x++) {
      const inBox = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      const on = mask[y * w + x];
      if (inBox) {
        total++;
        inside += on;
      } else outside += on;
    }
  return { recall: inside / total, spill: outside };
}

describe('the scene cut-out (photos taken in a room)', () => {
  const scene = lifestyleScene('sofaAndChairs');
  const cut = extractForeground(scene.rgba, scene.width, scene.height, { mode: 'scene' });

  it('uses the scene cut for a busy room and the colour cut for a plain backdrop', () => {
    expect(backdropIsPlain(scene.rgba, scene.width, scene.height).plain).toBe(false);
    expect(cut.mode).toBe('scene');
    const product = sofaPhoto('front');
    expect(backdropIsPlain(product.rgba, product.width, product.height).plain).toBe(true);
    const plain = extractForeground(product.rgba, product.width, product.height, {});
    expect(plain.mode).toBe('plain');
    // exactly what the plain-backdrop cut gave before
    const old = segmentObject(product.rgba, product.width, product.height, 16);
    expect(Array.from(plain.mask)).toEqual(Array.from(old));
  });

  it('keeps the sofa and leaves the wall and the picture frame out', () => {
    const { recall } = overlap(cut.mask, scene.width, { x: 150, y: 200, w: 180, h: 80 });
    expect(recall).toBeGreaterThan(0.8);
    let wall = 0;
    for (let y = 0; y < 150; y++)
      for (let x = 60; x < 380; x++) wall += cut.mask[y * scene.width + x];
    expect(wall).toBeLessThan(150);
    expect(cut.quality).toBeGreaterThan(0.4);
  });

  it('finds the sofa and the two armchairs as separate pieces, largest first', () => {
    expect(cut.pieces.length).toBeGreaterThanOrEqual(3);
    const top = cut.pieces.slice(0, 3);
    expect(top[0].area).toBeGreaterThanOrEqual(top[1].area);
    const centres = top.map((p) => p.cx).sort((a, b) => a - b);
    expect(centres[0]).toBeLessThan(140); // left armchair
    expect(centres[1]).toBeGreaterThan(180);
    expect(centres[1]).toBeLessThan(300); // sofa
    expect(centres[2]).toBeGreaterThan(340); // right armchair
  });

  it('groups the two identical armchairs as one piece with a count of two', () => {
    const photo = { rgba: scene.rgba, width: scene.width };
    const indexes = cut.pieces.slice(0, 3).map((_, i) => i);
    const groups = groupPieces(photo, cut, indexes);
    expect(groups.map((g) => g.count).sort()).toEqual([1, 2]);
  });

  it('builds a mask for one piece only', () => {
    const mask = pieceMask(cut, 0);
    expect(mask.reduce((a, v) => a + v, 0)).toBe(cut.pieces[0].area);
  });

  it('removes a leaked object when it is painted over with Remove', () => {
    const remove = [{ points: [[0.19, 0.67]], size: 0.1 }];
    const fixed = extractForeground(scene.rgba, scene.width, scene.height, {
      mode: 'scene',
      remove,
    });
    let chair = 0;
    for (let y = 226; y < 282; y++)
      for (let x = 62; x < 124; x++) chair += fixed.mask[y * scene.width + x];
    expect(chair).toBeLessThan(120);
    // the rest of the cut-out is unchanged: the sofa is still there
    expect(
      overlap(fixed.mask, scene.width, { x: 150, y: 200, w: 180, h: 80 }).recall
    ).toBeGreaterThan(0.8);
  });

  it('keeps only what is inside a crop box', () => {
    const crop = { x0: 0.28, y0: 0.45, x1: 0.72, y1: 0.8 };
    const boxed = extractForeground(scene.rgba, scene.width, scene.height, { mode: 'scene', crop });
    let outside = 0;
    for (let y = 0; y < scene.height; y++)
      for (let x = 0; x < scene.width; x++)
        if (x < 0.28 * scene.width - 2 || x > 0.72 * scene.width + 2)
          outside += boxed.mask[y * scene.width + x];
    expect(outside).toBe(0);
    const { recall } = overlap(boxed.mask, scene.width, { x: 150, y: 200, w: 180, h: 80 });
    expect(recall).toBeGreaterThan(0.7);
  });
});

describe('separating pieces that touch', () => {
  const blobs = (neck) => {
    const w = 120;
    const h = 60;
    const mask = new Uint8Array(w * h);
    const fill = (x0, y0, x1, y1) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = 1;
    };
    fill(5, 10, 50, 55);
    fill(70, 10, 115, 55);
    fill(50, 30, 70, 30 + neck);
    return { mask, w, h };
  };
  it('splits two blobs joined by a thin neck and keeps one blob with a wide join', () => {
    const thin = blobs(4);
    const labels = splitPieces(thin.mask, thin.w, thin.h);
    expect(new Set(Array.from(labels).filter(Boolean)).size).toBe(2);
    const wide = blobs(26);
    const one = splitPieces(wide.mask, wide.w, wide.h);
    expect(new Set(Array.from(one).filter(Boolean)).size).toBe(1);
  });
});

describe('helpers', () => {
  it('paints strokes at any resolution and resizes masks smoothly', () => {
    const strokes = [{ points: [[0.5, 0.5]], size: 0.2 }];
    const small = paintStrokes(strokes, 50, 50);
    const large = paintStrokes(strokes, 200, 200);
    expect(small[25 * 50 + 25]).toBe(1);
    expect(large[100 * 200 + 100]).toBe(1);
    expect(small[0]).toBe(0);
    const up = resizeMask(small, 50, 50, 100, 100);
    const covered = (m) => m.reduce((a, v) => a + v, 0) / m.length;
    expect(Math.abs(covered(up) - covered(small))).toBeLessThan(0.03);
  });

  it('scores an empty cut-out as zero and a clean one well', () => {
    const s = surface(60, 60, [240, 240, 240]);
    s.rect(15, 15, 30, 30, [20, 80, 120]);
    const mask = new Uint8Array(60 * 60);
    for (let y = 15; y < 45; y++) for (let x = 15; x < 45; x++) mask[y * 60 + x] = 1;
    expect(cutQuality(s.rgba, new Uint8Array(3600), 60, 60)).toBe(0);
    expect(cutQuality(s.rgba, mask, 60, 60)).toBeGreaterThan(0.7);
  });
});
