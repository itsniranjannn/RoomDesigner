import { describe, it, expect } from 'vitest';
import { segmentObject, normalizeView, buildModelFromViews, maskCoverage, carveVoxels } from './hull.js';

// Synthetic "photo": plain light background with a coloured rectangle
function makePhoto(width, height, rect, color) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1;
      const c = inside ? color : [245, 245, 245];
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function view(slot, angle, rgba, w, h) {
  const mask = segmentObject(rgba, w, h);
  const n = normalizeView(rgba, mask, w, h, 64);
  return { slot, angle, ...n };
}

describe('photo segmentation', () => {
  it('separates a coloured object from a plain background', () => {
    const rgba = makePhoto(100, 80, { x0: 20, x1: 80, y0: 10, y1: 70 }, [180, 60, 40]);
    const mask = segmentObject(rgba, 100, 80);
    expect(mask[40 * 100 + 50]).toBe(1);
    expect(mask[2 * 100 + 2]).toBe(0);
    expect(maskCoverage(mask)).toBeCloseTo((60 * 60) / (100 * 80), 1);
  });

  it('fills small holes inside the object', () => {
    const rgba = makePhoto(100, 80, { x0: 20, x1: 80, y0: 10, y1: 70 }, [180, 60, 40]);
    for (let y = 35; y < 40; y++) for (let x = 45; x < 50; x++) {
      const i = (y * 100 + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 245;
    }
    const mask = segmentObject(rgba, 100, 80);
    expect(mask[37 * 100 + 47]).toBe(1);
  });
});

describe('visual hull', () => {
  it('carves a solid box from three matching views', () => {
    const front = view('front', 0, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [200, 30, 30]), 100, 100);
    const side = view('right', 90, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [30, 200, 30]), 100, 100);
    const top = view('top', null, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [30, 30, 200]), 100, 100);
    const { occupancy, resolution } = carveVoxels([front, side, top], 16);
    expect(occupancy.reduce((a, b) => a + b, 0)).toBe(resolution ** 3);
    const mesh = buildModelFromViews([front, side, top], 16);
    expect(mesh.triangleCount).toBe(6 * 16 * 16 * 2);
    expect(mesh.positions.length).toBe(mesh.triangleCount * 9);
    expect(mesh.colors.length).toBe(mesh.triangleCount * 9);
  });

  it('removes volume where the side view is narrower than the front', () => {
    // Front is a full square, side shows only the lower half -> object is half height
    const front = view('front', 0, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [200, 30, 30]), 100, 100);
    const sideRgba = makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [30, 200, 30]);
    const side = view('right', 90, sideRgba, 100, 100);
    const lShape = {
      ...side,
      mask: side.mask.map((m, p) => (m && Math.floor(p / side.size) > side.size / 2 ? 1 : 0)),
    };
    const { occupancy } = carveVoxels([front, lShape], 16);
    const filled = occupancy.reduce((a, b) => a + b, 0);
    expect(filled).toBeGreaterThan(0);
    expect(filled).toBeLessThan(16 ** 3 * 0.6);
  });

  it('colours faces from the photo that sees them', () => {
    const front = view('front', 0, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [200, 30, 30]), 100, 100);
    const side = view('right', 90, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [30, 200, 30]), 100, 100);
    const mesh = buildModelFromViews([front, side], 8);
    let red = 0;
    let green = 0;
    for (let i = 0; i < mesh.colors.length; i += 3) {
      if (mesh.colors[i] > 150) red++;
      if (mesh.colors[i + 1] > 150) green++;
    }
    expect(red).toBeGreaterThan(0);
    expect(green).toBeGreaterThan(0);
  });

  it('requires at least two photos', () => {
    const front = view('front', 0, makePhoto(100, 100, { x0: 10, x1: 90, y0: 10, y1: 90 }, [200, 30, 30]), 100, 100);
    expect(() => buildModelFromViews([front])).toThrow(/at least two/);
  });
});
