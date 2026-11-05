import { describe, it, expect } from 'vitest';
import {
  photoQuality,
  floorTiltDegrees,
  photoAspect,
  normalizeMask,
  silhouetteOverlap,
  fitScore,
  describeFit,
  matchPhotoDims,
  fitHint,
  silhouetteFromRender,
} from './photoFit.js';

/** A photo with a lighter or darker box on a plain background, and the mask of the box. */
function photo({ w = 200, h = 160, box = [50, 40, 150, 120], bg = 235, fg = 120, tilt = 0 } = {}) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  const [x0, y0, x1, y1] = box;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // A tilted floor line: the bottom edge drops by `tilt` pixels per pixel across
      const bottom = y1 + (x - (x0 + x1) / 2) * tilt;
      const inside = x >= x0 && x < x1 && y >= y0 && y < bottom;
      const p = y * w + x;
      mask[p] = inside ? 1 : 0;
      const v = inside ? fg : bg;
      rgba.set([v, v, v, 255], p * 4);
    }
  return { photo: { width: w, height: h, rgba, sourceWidth: 1600, sourceHeight: 1280 }, mask };
}

const ids = (list) => list.map((q) => q.id);

describe('checking a photo as it is added', () => {
  it('passes a clear, well-framed photo', () => {
    const { photo: p, mask } = photo();
    expect(photoQuality(p, mask)).toEqual([]);
  });

  it('says when it is too dark and how to fix it', () => {
    const { photo: p, mask } = photo({ bg: 40, fg: 20 });
    const found = photoQuality(p, mask);
    expect(ids(found)).toContain('dark');
    expect(found.find((q) => q.id === 'dark').fix).toMatch(/light|window/i);
  });

  it('says when the photo is small or the piece fills little of it', () => {
    const { photo: p, mask } = photo();
    expect(ids(photoQuality({ ...p, sourceWidth: 320, sourceHeight: 240 }, mask))).toContain(
      'small'
    );
    // Large photo, but the piece spans only a few pixels of it
    const tiny = photo({ box: [95, 75, 105, 85] });
    expect(
      ids(photoQuality({ ...tiny.photo, sourceWidth: 600, sourceHeight: 480 }, tiny.mask))
    ).toContain('small');
  });

  it('says when the piece is cut off at the edge of the picture', () => {
    const cut = photo({ box: [0, 40, 150, 120] });
    expect(ids(photoQuality(cut.photo, cut.mask))).toContain('cutoff');
    const top = photo({ box: [50, 0, 150, 120] });
    expect(ids(photoQuality(top.photo, top.mask))).toContain('cutoff');
  });

  it('says when the camera is tilted', () => {
    const level = photo();
    expect(floorTiltDegrees(level.mask, 200, 160)).toBeCloseTo(0, 0);
    const tilted = photo({ tilt: 0.14 });
    expect(Math.abs(floorTiltDegrees(tilted.mask, 200, 160))).toBeGreaterThan(5);
    expect(ids(photoQuality(tilted.photo, tilted.mask))).toContain('tilted');
    expect(ids(photoQuality(level.photo, level.mask))).not.toContain('tilted');
  });

  it('says when the background is busy', () => {
    const { photo: p, mask } = photo();
    // Speckle the border with noise
    for (let i = 0; i < p.rgba.length; i += 4) {
      const x = (i / 4) % p.width;
      const y = Math.floor(i / 4 / p.width);
      if (x < 8 || y < 8 || x > p.width - 9 || y > p.height - 9) {
        const v = 60 + ((x * 37 + y * 91) % 170);
        p.rgba.set([v, v, v], i);
      }
    }
    expect(ids(photoQuality(p, mask))).toContain('busy');
  });
});

describe('fitting the model to a photo', () => {
  const dims = { widthCm: 200, depthCm: 90, heightCm: 85 };

  it('reads the proportions of the cut-out', () => {
    const { mask } = photo();
    expect(photoAspect(mask, 200, 160)).toBeCloseTo(100 / 80, 3);
    expect(photoAspect(new Uint8Array(100), 10, 10)).toBeNull();
  });

  it('scores identical silhouettes as a perfect match and different ones lower', () => {
    const { mask } = photo();
    const a = normalizeMask(mask, 200, 160, 32);
    expect(silhouetteOverlap(a.mask, a.mask)).toBe(1);
    expect(fitScore(a, a, 1.25, 1.25).score).toBeCloseTo(1, 5);
    // The same shape at the wrong proportions scores less
    expect(fitScore(a, a, 2.5, 1.25).score).toBeCloseTo(0.5, 5);
    // A ring against a block shares only part of its area
    const ring = {
      mask: a.mask.map((v, i) => (i % 32 > 8 && i % 32 < 24 && i > 300 && i < 700 ? 0 : v)),
    };
    expect(fitScore(a, ring, 1, 1).overlap).toBeLessThan(1);
    expect(silhouetteOverlap(null, a.mask)).toBe(0);
  });

  it('describes a score in plain words', () => {
    expect(describeFit(0.95).level).toBe('good');
    expect(describeFit(0.75).level).toBe('fair');
    expect(describeFit(0.3).level).toBe('poor');
  });

  it('scales the model so its bounds take the photo proportions, keeping the size you set', () => {
    // Front photo is 2:1; the model box is 200 x 85, so about 2.35:1
    const keepWidth = matchPhotoDims(dims, 'front', 2, { w: 1, h: 1 }, 'widthCm');
    expect(keepWidth.widthCm).toBe(200);
    expect(keepWidth.heightCm).toBe(100);
    expect(keepWidth.depthCm).toBe(90);
    const keepHeight = matchPhotoDims(dims, 'front', 2, { w: 1, h: 1 }, 'heightCm');
    expect(keepHeight.heightCm).toBe(85);
    expect(keepHeight.widthCm).toBe(170);
    // A side photo changes the depth, not the width
    const side = matchPhotoDims(dims, 'right', 1, { w: 1, h: 1 }, 'heightCm');
    expect(side.depthCm).toBe(85);
    expect(side.widthCm).toBe(200);
    // Following the silhouette bounds: a model that fills 90% of its box width
    const narrow = matchPhotoDims(dims, 'front', 2, { w: 0.9, h: 1 }, 'heightCm');
    expect(narrow.widthCm).toBe(Math.round((85 * 2) / 0.9));
    // A depth anchor on a front photo falls back to adjusting the width around the height
    expect(matchPhotoDims(dims, 'front', 2, { w: 1, h: 1 }, 'depthCm').heightCm).toBe(85);
  });

  it('never leaves the allowed range, and ignores a missing photo', () => {
    expect(matchPhotoDims(dims, 'front', 50, { w: 1, h: 1 }, 'heightCm').widthCm).toBe(600);
    expect(matchPhotoDims(dims, 'front', null)).toBe(dims);
    expect(matchPhotoDims(dims, 'nowhere', 2)).toBe(dims);
  });

  it('after matching, the model proportions equal the photo proportions', () => {
    const next = matchPhotoDims(dims, 'front', 1.6, { w: 1, h: 1 }, 'widthCm');
    expect(next.widthCm / next.heightCm).toBeCloseTo(1.6, 1);
  });

  it('explains which way to adjust', () => {
    expect(fitHint('front', 1, 1)).toBeNull();
    expect(fitHint('front', 2, 1)).toMatch(/wider/);
    expect(fitHint('front', 1, 2)).toMatch(/narrower/);
    expect(fitHint('top', 2, 1)).toMatch(/depth/);
  });

  it('turns rendered pixels, bottom row first, into a top-down mask', () => {
    const px = new Uint8Array(2 * 2 * 4);
    px[0] = 255; // first pixel of the bottom row
    const mask = silhouetteFromRender(px, 2, 2);
    expect(Array.from(mask)).toEqual([0, 0, 1, 0]);
  });
});
