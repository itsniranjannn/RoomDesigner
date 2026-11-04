import { describe, it, expect } from 'vitest';
import {
  segmentObject,
  fitBackground,
  normalizeView,
  buildModelFromViews,
  maskCoverage,
  maskBounds,
  carveVoxels,
  upgradeLegacyMesh,
  pickPlanSlot,
  cutoutImage,
  renderMesh,
  topDownImage,
  footprintOutline,
  meshAverageHex,
  proportionWarnings,
} from './hull.js';

const BG = [245, 245, 245];

// Synthetic "photo": a background function with coloured shapes drawn over it
function makePhoto(width, height, shapes, background = () => BG) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let c = background(x, y);
      for (const s of shapes) {
        const inside = s.round
          ? ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1
          : x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1;
        if (inside) c = s.color;
      }
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const rect = (x0, y0, x1, y1, color) => ({ x0, y0, x1, y1, color });
const ellipse = (cx, cy, rx, ry, color) => ({ round: true, cx, cy, rx, ry, color });

function view(slot, angle, rgba, w, h) {
  const mask = segmentObject(rgba, w, h);
  const n = normalizeView(rgba, mask, w, h, 64);
  return { slot, angle, ...n };
}

const boxPhoto = (color) => makePhoto(100, 100, [rect(10, 10, 90, 90, color)]);
const boxViews = (n = 3) => {
  const views = [
    view('front', 0, boxPhoto([200, 30, 30]), 100, 100),
    view('right', 90, boxPhoto([30, 200, 30]), 100, 100),
    view('top', null, boxPhoto([30, 30, 200]), 100, 100),
  ];
  return views.slice(0, n);
};

function signedVolume(mesh) {
  const { positions, indices } = mesh;
  let v = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3,
      b = indices[t + 1] * 3,
      c = indices[t + 2] * 3;
    v +=
      (positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1]) -
        positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c]) +
        positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])) /
      6;
  }
  return v;
}

describe('photo segmentation', () => {
  it('separates a coloured object from a plain background', () => {
    const rgba = makePhoto(100, 80, [rect(20, 10, 80, 70, [180, 60, 40])]);
    const mask = segmentObject(rgba, 100, 80);
    expect(mask[40 * 100 + 50]).toBe(1);
    expect(mask[2 * 100 + 2]).toBe(0);
    expect(maskCoverage(mask)).toBeCloseTo((60 * 60) / (100 * 80), 1);
  });

  it('fills small holes inside the object', () => {
    const rgba = makePhoto(100, 80, [rect(20, 10, 80, 70, [180, 60, 40])]);
    for (let y = 35; y < 40; y++)
      for (let x = 45; x < 50; x++) {
        const i = (y * 100 + x) * 4;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 245;
      }
    const mask = segmentObject(rgba, 100, 80);
    expect(mask[37 * 100 + 47]).toBe(1);
  });

  it('ignores a smooth lighting gradient across the background', () => {
    const gradient = (x, y) => [
      250 - x * 0.5 - y * 0.2,
      248 - x * 0.5 - y * 0.2,
      240 - x * 0.5 - y * 0.2,
    ];
    const rgba = makePhoto(160, 120, [rect(50, 30, 110, 90, [60, 90, 150])], gradient);
    const mask = segmentObject(rgba, 160, 120);
    expect(mask[60 * 160 + 80]).toBe(1);
    expect(mask[5 * 160 + 5]).toBe(0);
    expect(mask[115 * 160 + 155]).toBe(0);
    expect(maskCoverage(mask)).toBeCloseTo((60 * 60) / (160 * 120), 1);
  });

  it('treats a soft shadow under the object as background', () => {
    const rgba = makePhoto(160, 120, [rect(50, 20, 110, 80, [150, 70, 40])]);
    // A pale, same-hued shadow band right under the object
    for (let y = 80; y < 92; y++)
      for (let x = 50; x < 125; x++) {
        const i = (y * 160 + x) * 4;
        rgba[i] = 215;
        rgba[i + 1] = 215;
        rgba[i + 2] = 215;
      }
    const mask = segmentObject(rgba, 160, 120);
    expect(mask[50 * 160 + 80]).toBe(1);
    expect(mask[86 * 160 + 90]).toBe(0);
    const box = maskBounds(mask, 160, 120);
    expect(box.maxY).toBeLessThan(82);
  });

  it('copes with mild sensor noise on the background', () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const noisy = () => {
      const d = (rnd() - 0.5) * 36;
      return [BG[0] + d, BG[1] + d, BG[2] + d];
    };
    const rgba = makePhoto(120, 100, [rect(30, 20, 90, 80, [40, 120, 80])], noisy);
    const mask = segmentObject(rgba, 120, 100);
    expect(maskCoverage(mask)).toBeCloseTo((60 * 60) / (120 * 100), 1);
    expect(mask[3 * 120 + 3]).toBe(0);
  });

  it('keeps only the largest object and drops specks and thin fringes', () => {
    const rgba = makePhoto(200, 160, [
      rect(40, 30, 140, 130, [90, 50, 30]),
      rect(170, 10, 175, 15, [90, 50, 30]),
      rect(140, 78, 160, 79, [90, 50, 30]),
    ]);
    const mask = segmentObject(rgba, 200, 160);
    expect(mask[12 * 200 + 172]).toBe(0);
    expect(mask[78 * 200 + 155]).toBe(0);
    expect(mask[80 * 200 + 90]).toBe(1);
  });

  it('still finds an object that touches the photo border', () => {
    const rgba = makePhoto(120, 100, [rect(0, 30, 70, 100, [40, 40, 140])]);
    const mask = segmentObject(rgba, 120, 100);
    expect(mask[60 * 120 + 30]).toBe(1);
    expect(mask[10 * 120 + 100]).toBe(0);
  });

  it('keeps a large opening, such as the gap between table legs, open', () => {
    const rgba = makePhoto(200, 160, [
      rect(30, 20, 170, 60, [120, 80, 50]),
      rect(30, 60, 55, 140, [120, 80, 50]),
      rect(145, 60, 170, 140, [120, 80, 50]),
      rect(30, 125, 170, 140, [120, 80, 50]),
    ]);
    const mask = segmentObject(rgba, 200, 160);
    expect(mask[90 * 200 + 100]).toBe(0);
    expect(mask[40 * 200 + 100]).toBe(1);
  });

  it('smooths the edge of a round object', () => {
    const rgba = makePhoto(160, 160, [ellipse(80, 80, 50, 50, [160, 40, 40])]);
    const mask = segmentObject(rgba, 160, 160);
    expect(maskCoverage(mask)).toBeGreaterThan((Math.PI * 2500 * 0.96) / (160 * 160));
    expect(maskCoverage(mask)).toBeLessThan((Math.PI * 2500 * 1.04) / (160 * 160));
  });

  it('returns an empty mask for a blank photo and honours transparent pixels', () => {
    const blank = makePhoto(60, 60, []);
    expect(maskCoverage(segmentObject(blank, 60, 60))).toBe(0);
    const rgba = makePhoto(60, 60, [rect(10, 10, 50, 50, [200, 0, 0])]);
    for (let p = 0; p < 60 * 60; p++) if (p % 60 < 30) rgba[p * 4 + 3] = 0;
    const mask = segmentObject(rgba, 60, 60);
    expect(mask[30 * 60 + 15]).toBe(0);
    expect(mask[30 * 60 + 40]).toBe(1);
  });

  it('raising the tolerance removes a faint object', () => {
    const rgba = makePhoto(100, 100, [rect(30, 30, 70, 70, [215, 215, 235])]);
    expect(maskCoverage(segmentObject(rgba, 100, 100, 20))).toBeGreaterThan(0.1);
    expect(maskCoverage(segmentObject(rgba, 100, 100, 120))).toBe(0);
  });

  it('fits the background plane and reports noise', () => {
    const bg = fitBackground(
      makePhoto(80, 80, [], (x) => [200 + x * 0.2, 200, 200]),
      80,
      80
    );
    const [r] = bg.at(0.5, 0.5);
    expect(r).toBeCloseTo(208, 0);
    expect(bg.noise).toBeLessThan(1);
  });

  it('measures the bounding box of a mask', () => {
    const mask = new Uint8Array(10 * 10);
    mask[2 * 10 + 3] = 1;
    mask[6 * 10 + 8] = 1;
    expect(maskBounds(mask, 10, 10)).toEqual({
      minX: 3,
      minY: 2,
      maxX: 8,
      maxY: 6,
      width: 6,
      height: 5,
    });
    expect(maskBounds(new Uint8Array(100), 10, 10)).toBeNull();
  });
});

describe('view colours', () => {
  it('extends the object colours outwards so off-edge lookups never return the backdrop', () => {
    const rgba = makePhoto(160, 160, [ellipse(80, 80, 50, 50, [180, 60, 40])]);
    const mask = segmentObject(rgba, 160, 160);
    const n = normalizeView(rgba, mask, 160, 160, 32);
    expect(n.mask[0]).toBe(0); // the corner of a round object's bounding box is empty
    expect(n.rgb[0]).toBeGreaterThan(150);
    expect(n.rgb[1]).toBeLessThan(100);
    expect(n.rgb[2]).toBeLessThan(80);
  });
});

describe('visual hull', () => {
  it('carves a solid box from three matching views', () => {
    const { occupancy, resolution } = carveVoxels(boxViews(), 16);
    expect(occupancy.reduce((a, b) => a + b, 0)).toBe(resolution ** 3);
  });

  it('removes volume where the side view is narrower than the front', () => {
    // Front is a full square, side shows only the lower half -> object is half height
    const [front, side] = boxViews(2);
    const lShape = {
      ...side,
      mask: side.mask.map((m, p) => (m && Math.floor(p / side.size) > side.size / 2 ? 1 : 0)),
    };
    const { occupancy } = carveVoxels([front, lShape], 16);
    const filled = occupancy.reduce((a, b) => a + b, 0);
    expect(filled).toBeGreaterThan(0);
    expect(filled).toBeLessThan(16 ** 3 * 0.6);
  });

  it('requires at least two photos', () => {
    expect(() => buildModelFromViews(boxViews(1))).toThrow(/at least two/);
  });

  it('rejects photos that do not overlap', () => {
    const strip = (slot, angle, row) => {
      const size = 16;
      const mask = new Uint8Array(size * size);
      for (let u = 0; u < size; u++) mask[row * size + u] = 1;
      return { slot, angle, mask, rgb: new Uint8Array(size * size * 3), size };
    };
    expect(() => buildModelFromViews([strip('front', 0, 0), strip('right', 90, 15)], 16)).toThrow(
      /do not agree/
    );
  });
});

describe('smooth mesh', () => {
  const mesh = buildModelFromViews(boxViews(), 32);

  it('is an indexed mesh with one colour per vertex', () => {
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.colors.length).toBe(mesh.positions.length);
    expect(mesh.triangleCount).toBe(mesh.indices.length / 3);
    expect(mesh.vertexCount).toBe(mesh.positions.length / 3);
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.vertexCount);
    expect(mesh.indices).toBeInstanceOf(Uint16Array);
  });

  it('stays within the unit bounds and stands on the floor', () => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a], mesh.positions[i + a]);
        hi[a] = Math.max(hi[a], mesh.positions[i + a]);
      }
    }
    expect(lo[0]).toBeCloseTo(-0.5, 5);
    expect(hi[0]).toBeCloseTo(0.5, 5);
    expect(lo[1]).toBeCloseTo(0, 5);
    expect(hi[1]).toBeCloseTo(1, 5);
    expect(lo[2]).toBeCloseTo(-0.5, 5);
    expect(hi[2]).toBeCloseTo(0.5, 5);
  });

  it('is watertight: every edge is shared by exactly two triangles', () => {
    const edges = new Map();
    for (let t = 0; t < mesh.indices.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = mesh.indices[t + e];
        const b = mesh.indices[t + ((e + 1) % 3)];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
    const open = [...edges.values()].filter((n) => n !== 2).length;
    expect(open).toBe(0);
  });

  it('winds triangles outward and fills most of the box', () => {
    const volume = signedVolume(mesh);
    expect(volume).toBeGreaterThan(0.8);
    expect(volume).toBeLessThanOrEqual(1.0);
  });

  it('colours each side from the photo that faces it', () => {
    let front = 0;
    let side = 0;
    let top = 0;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const [x, y, z] = [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
      const [r, g, b] = [mesh.colors[i], mesh.colors[i + 1], mesh.colors[i + 2]];
      if (z > 0.49 && Math.abs(x) < 0.3 && y > 0.2 && y < 0.8 && r > 150 && g < 100) front++;
      if (x > 0.49 && Math.abs(z) < 0.3 && y > 0.2 && y < 0.8 && g > 150 && r < 100) side++;
      if (y > 0.99 && Math.abs(x) < 0.3 && Math.abs(z) < 0.3 && b > 150 && r < 100) top++;
    }
    expect(front).toBeGreaterThan(0);
    expect(side).toBeGreaterThan(0);
    expect(top).toBeGreaterThan(0);
  });

  it('rounds a cylinder-like object instead of stacking blocks', () => {
    const round = makePhoto(100, 100, [ellipse(50, 50, 40, 40, [150, 100, 60])]);
    const cyl = buildModelFromViews(
      [
        view('front', 0, makePhoto(100, 100, [rect(10, 10, 90, 90, [150, 100, 60])]), 100, 100),
        view('right', 90, makePhoto(100, 100, [rect(10, 10, 90, 90, [150, 100, 60])]), 100, 100),
        view('top', null, round, 100, 100),
      ],
      32
    );
    const volume = signedVolume(cyl);
    expect(volume).toBeGreaterThan(Math.PI * 0.25 * 0.85);
    expect(volume).toBeLessThan(Math.PI * 0.25 * 1.05);
  });

  it('builds a 64-voxel model quickly with a modest stored size', () => {
    const t0 = performance.now();
    const big = buildModelFromViews(boxViews(), 64);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(2500);
    const bytes = big.positions.byteLength + big.colors.byteLength + big.indices.byteLength;
    expect(bytes).toBeLessThan(1_500_000);
  });
});

describe('older block-based meshes', () => {
  // The previous builder emitted six exposed cube faces per boundary voxel at 40 voxels per axis
  function legacyBlockMesh(filled, R = 40) {
    const FACES = [
      {
        n: [1, 0, 0],
        c: [
          [1, 0, 0],
          [1, 1, 0],
          [1, 1, 1],
          [1, 0, 1],
        ],
      },
      {
        n: [-1, 0, 0],
        c: [
          [0, 0, 1],
          [0, 1, 1],
          [0, 1, 0],
          [0, 0, 0],
        ],
      },
      {
        n: [0, 1, 0],
        c: [
          [0, 1, 0],
          [0, 1, 1],
          [1, 1, 1],
          [1, 1, 0],
        ],
      },
      {
        n: [0, -1, 0],
        c: [
          [0, 0, 1],
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 1],
        ],
      },
      {
        n: [0, 0, 1],
        c: [
          [0, 0, 1],
          [1, 0, 1],
          [1, 1, 1],
          [0, 1, 1],
        ],
      },
      {
        n: [0, 0, -1],
        c: [
          [1, 0, 0],
          [0, 0, 0],
          [0, 1, 0],
          [1, 1, 0],
        ],
      },
    ];
    const positions = [];
    const colors = [];
    for (let k = 0; k < R; k++)
      for (let j = 0; j < R; j++)
        for (let i = 0; i < R; i++) {
          if (!filled(i, j, k)) continue;
          for (const f of FACES) {
            if (filled(i + f.n[0], j + f.n[1], k + f.n[2])) continue;
            const quad = f.c.map((c) => [
              (i + c[0]) / R - 0.5,
              (j + c[1]) / R,
              (k + c[2]) / R - 0.5,
            ]);
            for (const t of [0, 1, 2, 0, 2, 3]) {
              positions.push(...quad[t]);
              colors.push(200, 120, 60);
            }
          }
        }
    return { positions: new Float32Array(positions), colors: new Uint8Array(colors) };
  }

  const block = (i, j, k) => i >= 8 && i < 32 && j >= 0 && j < 30 && k >= 10 && k < 30;

  it('upgrades a block mesh to a smooth indexed one', () => {
    const legacy = legacyBlockMesh(block);
    const upgraded = upgradeLegacyMesh(legacy);
    expect(upgraded.indices).toBeDefined();
    expect(upgraded.colors.length).toBe(upgraded.positions.length);
    expect(signedVolume(upgraded)).toBeGreaterThan(0.1);
    let minY = Infinity;
    for (let i = 1; i < upgraded.positions.length; i += 3)
      minY = Math.min(minY, upgraded.positions[i]);
    expect(minY).toBeCloseTo(0, 5);
    // Colours survive the upgrade
    expect(upgraded.colors[0]).toBeGreaterThan(150);
    expect(upgraded.colors[2]).toBeLessThan(100);
  });

  it('caches the upgrade and passes indexed or missing meshes through', () => {
    const legacy = legacyBlockMesh(block);
    expect(upgradeLegacyMesh(legacy)).toBe(upgradeLegacyMesh(legacy));
    const modern = buildModelFromViews(boxViews(), 16);
    expect(upgradeLegacyMesh(modern)).toBe(modern);
    expect(upgradeLegacyMesh(null)).toBeNull();
  });

  it('gives up on meshes that are not 40-voxel block meshes', () => {
    expect(
      upgradeLegacyMesh({ positions: new Float32Array(9), colors: new Uint8Array(9) })
    ).toBeNull();
  });

  it('renders old meshes in plan view too', () => {
    const pixels = renderMesh(legacyBlockMesh(block), { size: 32, top: true });
    expect(pixels.length).toBe(32 * 32 * 4);
    let opaque = 0;
    for (let p = 3; p < pixels.length; p += 4) if (pixels[p] > 200) opaque++;
    expect(opaque).toBeGreaterThan(100);
  });
});

describe('plan symbol rendering', () => {
  const mesh = buildModelFromViews(boxViews(), 24);

  it('renders the footprint of a box edge to edge', () => {
    const size = 48;
    const pixels = topDownImage(mesh, size);
    let opaque = 0;
    for (let p = 3; p < pixels.length; p += 4) if (pixels[p] > 200) opaque++;
    expect(opaque / (size * size)).toBeGreaterThan(0.9);
  });

  it('looks from above with the front edge at the bottom', () => {
    // An L-shaped footprint: the front-left corner is missing
    const front = view(
      'front',
      0,
      makePhoto(100, 100, [rect(10, 10, 90, 90, [180, 60, 40])]),
      100,
      100
    );
    const side = view(
      'right',
      90,
      makePhoto(100, 100, [rect(10, 10, 90, 90, [180, 60, 40])]),
      100,
      100
    );
    const top = view(
      'top',
      null,
      makePhoto(100, 100, [rect(10, 10, 90, 90, [180, 60, 40])].concat([rect(0, 50, 50, 100, BG)])),
      100,
      100
    );
    const lMesh = buildModelFromViews([front, side, top], 32);
    const size = 40;
    const pixels = topDownImage(lMesh, size);
    const alphaAt = (x, y) => pixels[(y * size + x) * 4 + 3];
    expect(alphaAt(30, 10)).toBeGreaterThan(200);
    expect(alphaAt(30, 30)).toBeGreaterThan(200);
    expect(alphaAt(8, 30)).toBeLessThan(60);
  });

  it('renders an isometric thumbnail that fits the frame', () => {
    const pixels = renderMesh(mesh, { size: 40 });
    let opaque = 0;
    for (let p = 3; p < pixels.length; p += 4) if (pixels[p] > 128) opaque++;
    expect(opaque).toBeGreaterThan(300);
    for (let x = 0; x < 40; x++) {
      expect(pixels[x * 4 + 3]).toBe(0);
      expect(pixels[(39 * 40 + x) * 4 + 3]).toBe(0);
    }
  });

  it('averages the mesh colour to a hex string', () => {
    expect(meshAverageHex({ colors: new Uint8Array([255, 0, 0, 255, 0, 0]) })).toBe('#ff0000');
    expect(meshAverageHex({ colors: new Uint8Array(0) })).toBe('#a0a0a0');
  });
});

describe('footprint outline', () => {
  const alpha = (size, filled) => {
    const px = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) if (filled(x, y)) px[(y * size + x) * 4 + 3] = 255;
    return px;
  };

  it('traces a rectangle as four corners in plan coordinates', () => {
    const loops = footprintOutline(
      alpha(20, (x, y) => x >= 5 && x < 15 && y >= 4 && y < 16),
      20
    );
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(8);
    const xs = loops[0].filter((_, i) => i % 2 === 0);
    const zs = loops[0].filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeCloseTo(-0.25);
    expect(Math.max(...xs)).toBeCloseTo(0.25);
    expect(Math.min(...zs)).toBeCloseTo(-0.3);
    expect(Math.max(...zs)).toBeCloseTo(0.3);
  });

  it('traces an L shape with six corners', () => {
    const loops = footprintOutline(
      alpha(
        20,
        (x, y) => (x >= 4 && x < 16 && y >= 4 && y < 10) || (x >= 4 && x < 10 && y >= 10 && y < 16)
      ),
      20
    );
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(12);
  });

  it('returns separate loops for separate parts and for holes', () => {
    const two = footprintOutline(
      alpha(
        24,
        (x, y) => (x >= 2 && x < 8 && y >= 2 && y < 8) || (x >= 14 && x < 22 && y >= 12 && y < 20)
      ),
      24
    );
    expect(two).toHaveLength(2);
    const ring = footprintOutline(
      alpha(
        24,
        (x, y) => x >= 4 && x < 20 && y >= 4 && y < 20 && !(x >= 9 && x < 15 && y >= 9 && y < 15)
      ),
      24
    );
    expect(ring).toHaveLength(2);
  });

  it('simplifies a round footprint to a modest number of points', () => {
    const loops = footprintOutline(
      alpha(64, (x, y) => (x - 32) ** 2 + (y - 32) ** 2 < 28 * 28),
      64
    );
    expect(loops).toHaveLength(1);
    expect(loops[0].length / 2).toBeGreaterThan(12);
    expect(loops[0].length / 2).toBeLessThan(90);
  });

  it('ignores empty images and tiny specks', () => {
    expect(
      footprintOutline(
        alpha(16, () => false),
        16
      )
    ).toEqual([]);
    expect(
      footprintOutline(
        alpha(16, (x, y) => x === 3 && y === 3),
        16
      )
    ).toEqual([]);
  });
});

describe('size checks', () => {
  const cut = (w, h, x0, y0, x1, y1) => {
    const mask = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = 1;
    return { mask, width: w, height: h };
  };
  const dims = { widthCm: 100, depthCm: 50, heightCm: 80 };

  it('accepts photos that match the entered size', () => {
    const front = cut(200, 200, 20, 40, 170, 160); // 150 x 120 -> 1.25 vs 1.25
    const side = cut(200, 200, 40, 40, 140, 160); // 100 x 120 -> 0.83 vs 0.625 (within tolerance)
    expect(proportionWarnings({ front, right: side }, dims)).toEqual([]);
  });

  it('flags a photo whose shape disagrees with the size', () => {
    const tallFront = cut(200, 200, 70, 20, 130, 180); // 60 x 160 vs 100 x 80
    const warnings = proportionWarnings({ front: tallFront }, dims);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/front photo/);
    expect(warnings[0]).toMatch(/more tall than wide/);
  });

  it('flags a top view that is much wider than it is deep', () => {
    const top = cut(200, 200, 10, 80, 190, 120); // 180 x 40 vs 100 x 50
    expect(proportionWarnings({ top }, dims)[0]).toMatch(/top photo/);
  });

  it('ignores slots without a photo or without an object', () => {
    expect(
      proportionWarnings({ front: { mask: new Uint8Array(100), width: 10, height: 10 } }, dims)
    ).toEqual([]);
    expect(proportionWarnings({}, dims)).toEqual([]);
  });
});

describe('plan photo cut-out', () => {
  it('prefers the top photo, then the front', () => {
    expect(pickPlanSlot(['right', 'front'])).toBe('front');
    expect(pickPlanSlot(['front', 'top', 'left'])).toBe('top');
    expect(pickPlanSlot(['left'])).toBe('left');
    expect(pickPlanSlot([])).toBeNull();
  });

  it('crops to the object and makes the background transparent', () => {
    const w = 10;
    const h = 8;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(200);
    const mask = new Uint8Array(w * h);
    for (let y = 2; y < 6; y++) for (let x = 3; x < 9; x++) mask[y * w + x] = 1;
    rgba[(2 * w + 3) * 4] = 10;
    const cut = cutoutImage(rgba, mask, w, h);
    expect(cut.width).toBe(6);
    expect(cut.height).toBe(4);
    expect(cut.rgba[0]).toBe(10);
    expect(cut.rgba[3]).toBe(255);
    // Every pixel inside the box belongs to the object here
    expect(Array.from(cut.rgba).filter((_, i) => i % 4 === 3 && cut.rgba[i] === 0)).toHaveLength(0);
  });

  it('leaves unmasked pixels transparent, scales down and handles an empty mask', () => {
    const w = 400;
    const h = 100;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(90);
    const mask = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) mask[x] = 1;
    mask[(h - 1) * w + w - 1] = 1;
    const cut = cutoutImage(rgba, mask, w, h, 192);
    expect(cut.width).toBe(192);
    expect(cut.height).toBeLessThanOrEqual(100);
    expect(cut.rgba[(cut.height * cut.width - 192) * 4 + 3]).toBe(0);
    expect(cutoutImage(rgba, new Uint8Array(w * h), w, h)).toBeNull();
  });
});

describe('pale parts on a pale background', () => {
  const white = [252, 252, 252];
  const dark = [90, 70, 60];

  it('fills the gap between two parts that stand on more of the piece', () => {
    // A tall left end and a lower right end with a white valley between them, on a slab
    const w = 160;
    const h = 100;
    const rgba = makePhoto(
      w,
      h,
      [
        rect(30, 20, 50, 80, dark), // tall end
        rect(70, 55, 130, 80, dark), // low end
        rect(30, 70, 130, 80, dark), // slab joining them
        rect(52, 55, 68, 70, white), // white linen in the valley
      ],
      () => [255, 255, 255]
    );
    const mask = segmentObject(rgba, w, h, 16);
    expect(mask[62 * w + 60]).toBe(1); // inside the valley, held up by the slab
    expect(mask[10 * w + 75]).toBe(0); // well above the piece
  });

  it('keeps the space between the legs of a table open', () => {
    const w = 160;
    const h = 100;
    const rgba = makePhoto(
      w,
      h,
      [rect(20, 20, 140, 35, dark), rect(22, 35, 32, 85, dark), rect(128, 35, 138, 85, dark)],
      () => [255, 255, 255]
    );
    const mask = segmentObject(rgba, w, h, 16);
    expect(mask[60 * w + 80]).toBe(0);
    expect(mask[28 * w + 80]).toBe(1);
  });
});
