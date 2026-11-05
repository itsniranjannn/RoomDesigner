import { describe, it, expect } from 'vitest';
import { segmentObject, normalizeView } from './hull.js';
import {
  detectSheetViews,
  cropSheetView,
  assignSheetViews,
  chooseSideSlot,
  estimateProportions,
  dimensionsFromProportions,
} from './sheet.js';

const W = 360;
const H = 260;

/** A white sheet with grey-brown boxes (x0, y0, x1, y1). */
function makeSheet(boxes) {
  const rgba = new Uint8ClampedArray(W * H * 4).fill(255);
  for (const [x0, y0, x1, y1, color = [150, 120, 100]] of boxes) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
      }
    }
  }
  return rgba;
}

// front 80x40, side 120x40, top 80x120, plus a spare three-quarter view
const SHEET = [
  [10, 10, 90, 50],
  [150, 10, 270, 50],
  [10, 100, 90, 220],
  [150, 120, 270, 160],
];

describe('detecting the views on a sheet', () => {
  it('finds each separate object in reading order', () => {
    const { views } = detectSheetViews(makeSheet(SHEET), W, H);
    expect(views).toHaveLength(4);
    expect(views.map((v) => [v.box.w, v.box.h])).toEqual([
      [80, 40],
      [120, 40],
      [80, 120],
      [120, 40],
    ]);
    expect(views[0].box.x).toBe(10);
    expect(views[1].box.x).toBe(150);
  });

  it('ignores specks and finds nothing on a blank sheet', () => {
    const speck = makeSheet([...SHEET, [330, 240, 333, 243]]);
    expect(detectSheetViews(speck, W, H).views).toHaveLength(4);
    expect(detectSheetViews(makeSheet([]), W, H).views).toHaveLength(0);
  });

  it('crops one view with a plain margin and paints neighbours out', () => {
    const sheet = makeSheet([
      [10, 10, 90, 50, [200, 30, 30]],
      [104, 10, 184, 50, [30, 30, 200]],
    ]);
    const detection = detectSheetViews(sheet, W, H);
    const crop = cropSheetView(sheet, W, H, detection, detection.views[0], 0.3);
    expect(crop.width).toBeGreaterThan(80);
    // The neighbour lies inside the crop margin but must not be in the photo
    let blue = 0;
    for (let i = 0; i < crop.rgba.length; i += 4)
      if (crop.rgba[i + 2] > 180 && crop.rgba[i] < 80) blue++;
    expect(blue).toBe(0);
    const mask = segmentObject(crop.rgba, crop.width, crop.height, 40);
    const prepared = normalizeView(crop.rgba, mask, crop.width, crop.height);
    expect(prepared).not.toBeNull();
  });
});

describe('assigning the views', () => {
  it('picks front, side and top by their matching measurements', () => {
    const { views } = detectSheetViews(makeSheet(SHEET), W, H);
    expect(assignSheetViews(views)).toEqual(['front', 'right', 'top', null]);
  });

  it('does not depend on the order the views appear in', () => {
    const { views } = detectSheetViews(makeSheet(SHEET), W, H);
    const shuffled = [views[2], views[0], views[3], views[1]];
    const slots = assignSheetViews(shuffled);
    expect(slots[1]).toBe('front');
    expect(slots[0]).toBe('top');
    expect(['right']).toContain(slots[3] || slots[2]);
  });

  it('copes with small sheets', () => {
    expect(assignSheetViews([])).toEqual([]);
    expect(assignSheetViews([{ box: { w: 1, h: 1 } }])).toEqual(['front']);
    expect(assignSheetViews([{ box: { w: 1, h: 1 } }, { box: { w: 2, h: 1 } }])).toEqual([
      'front',
      'right',
    ]);
  });
});

function viewFromMask(size, inside) {
  const mask = new Uint8Array(size * size);
  const rgb = new Uint8Array(size * size * 3).fill(128);
  for (let v = 0; v < size; v++)
    for (let u = 0; u < size; u++) mask[v * size + u] = inside((u + 0.5) / size, (v + 0.5) / size);
  return { mask, rgb, size };
}

describe('telling the left side from the right side', () => {
  // Tall at the back and wide at the back, like a bed with a headboard
  const front = viewFromMask(32, () => 1);
  const top = viewFromMask(32, (u, v) => (Math.abs(u - 0.5) <= 0.5 - v * 0.35 ? 1 : 0));
  // v is the row from the top: tall part is the first 40% of columns, low part the rest
  const tallFirst = viewFromMask(32, (u, v) => (u < 0.4 || v > 0.6 ? 1 : 0));
  const tallLast = viewFromMask(32, (u, v) => (u > 0.6 || v > 0.6 ? 1 : 0));

  it('puts the tall end on the back of the piece', () => {
    // 'left' photos show the back (top of the plan) on their left edge
    expect(chooseSideSlot({ front, top, side: tallFirst })).toBe('left');
    expect(chooseSideSlot({ front, top, side: tallLast })).toBe('right');
  });

  it('defaults to the right side without other views', () => {
    expect(chooseSideSlot({ side: tallFirst })).toBe('right');
  });
});

describe('proportions from the views', () => {
  const box = (w, h) => {
    const width = 100;
    const height = 100;
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * width + x] = 1;
    return { mask, width, height };
  };

  it('solves width, depth and height from front, side and top', () => {
    // true size 60 x 80 x 40
    const r = estimateProportions({ front: box(60, 40), right: box(80, 40), top: box(60, 80) });
    expect(r.widthCm / r.heightCm).toBeCloseTo(1.5, 5);
    expect(r.depthCm / r.heightCm).toBeCloseTo(2, 5);
  });

  it('settles on a compromise when the views disagree a little', () => {
    const r = estimateProportions({ front: box(60, 40), right: box(80, 40), top: box(66, 80) });
    expect(r.widthCm / r.heightCm).toBeGreaterThan(1.5);
    expect(r.widthCm / r.heightCm).toBeLessThan(1.65);
  });

  it('works from front and top alone, and gives up when depth is unknown', () => {
    expect(estimateProportions({ front: box(60, 40), top: box(60, 80) }).depthCm).toBeCloseTo(2, 5);
    expect(estimateProportions({ front: box(60, 40) })).toBeNull();
  });

  it('scales every size from the one the user knows', () => {
    const r = { widthCm: 1.5, depthCm: 2, heightCm: 1 };
    expect(dimensionsFromProportions(r, 'widthCm', 150)).toEqual({
      widthCm: 150,
      depthCm: 200,
      heightCm: 100,
    });
    expect(dimensionsFromProportions(r, 'heightCm', 40).depthCm).toBe(80);
    expect(dimensionsFromProportions(r, 'widthCm', 5000).depthCm).toBe(600);
  });
});

describe('sheets on a dark background with dimension lines', () => {
  const DW = 400;
  const DH = 240;
  function darkSheet() {
    const rgba = new Uint8ClampedArray(DW * DH * 4);
    for (let i = 0; i < DW * DH; i++) {
      rgba[i * 4] = 24;
      rgba[i * 4 + 1] = 24;
      rgba[i * 4 + 2] = 26;
      rgba[i * 4 + 3] = 255;
    }
    const fill = (x0, y0, x1, y1, c) => {
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * DW + x) * 4;
          rgba[i] = c[0];
          rgba[i + 1] = c[1];
          rgba[i + 2] = c[2];
        }
    };
    // two pieces (L shapes keep them from being solid), joined by a thin green line under their feet
    fill(20, 20, 100, 90, [140, 90, 50]);
    fill(30, 30, 90, 60, [24, 24, 26]);
    fill(140, 20, 220, 90, [140, 90, 50]);
    fill(150, 30, 210, 60, [24, 24, 26]);
    fill(10, 100, 230, 101, [120, 160, 40]);
    // a full-bleed close-up inset
    fill(250, 20, 390, 220, [90, 70, 50]);
    return rgba;
  }

  it('keeps the pieces apart, ignores the line and drops the close-up', () => {
    const { views } = detectSheetViews(darkSheet(), DW, DH);
    expect(views).toHaveLength(2);
    expect(views[0].box.x).toBeLessThan(40);
    expect(views[1].box.x).toBeGreaterThan(120);
  });
});
