import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act, extend } from '@react-three/fiber';
import { CustomMeshModel } from './customMesh.jsx';
import { ArchitecturalSilhouette } from '../../canvas/ArchitecturalSilhouette.jsx';
import { OLD_DESIGNS } from './designTraits.fixtures.js';
import { roundedPath, channelRibsGeometry, ribCentres } from './channels.jsx';
import { wrapShellGeometry, metalFinish } from './designShapes.jsx';
import {
  stepTiers,
  wrapRise,
  WRAP_END,
  guardRailSpans,
  wardrobeLayout,
  deskLayout,
} from './designLayout.js';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);

// Decimals are rounded to 5 places before hashing. Math.sin, pow and friends can differ in their last bits from
// one platform to another (Windows here, Linux on CI), and that must not count as a different model.
const stable = (s) =>
  s.replace(/(?<![\d.])-?\d+\.\d+(?:e[-+]?\d+)?/gi, (m) =>
    String(Math.round(Number(m) * 1e5) / 1e5)
  );

const markup = (type, palette, traits, [w, d, h]) =>
  renderToStaticMarkup(
    <CustomMeshModel
      def={{ design: { v: 1, type, palette, traits } }}
      widthM={w}
      depthM={d}
      heightM={h}
      mainColor={palette.body}
    />
  );

const planMarkup = (type, palette, traits, [w, d]) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette
        item={{
          shapeType: 'custom-mesh',
          color: palette.body,
          design: { v: 1, type, palette, traits },
        }}
        widthCm={w * 100}
        depthCm={d * 100}
      />
    </svg>
  );

/** Builds the model into a real three.js scene (no WebGL needed) and returns it with its exact bounds. */
async function buildScene(type, palette, traits, [w, d, h], names = []) {
  const canvas = { style: {}, addEventListener() {}, removeEventListener() {} };
  const gl = {
    render() {},
    setPixelRatio() {},
    setSize() {},
    getPixelRatio: () => 1,
    shadowMap: {},
    xr: { enabled: false },
    domElement: canvas,
    dispose() {},
  };
  const root = createRoot(canvas);
  await root.configure({
    gl,
    size: { width: 64, height: 64, top: 0, left: 0 },
    frameloop: 'never',
  });
  let store;
  await act(async () => {
    store = root.render(
      <CustomMeshModel
        def={{ design: { v: 1, type, palette, traits } }}
        widthM={w}
        depthM={d}
        heightM={h}
        mainColor={palette.body}
      />
    );
  });
  const scene = store.getState().scene;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene, true);
  const meshes = [];
  scene.traverse((o) => o.isMesh && meshes.push(o));
  // Bounds of every part with each of the given names (several parts may share a name)
  const parts = {};
  for (const name of names) {
    const b = new THREE.Box3();
    scene.traverse((o) => o.name === name && b.union(new THREE.Box3().setFromObject(o, true)));
    parts[name] = b;
  }
  root.unmount();
  return { box, meshes, parts };
}

// Hashes of the model and plan markup (decimals rounded, see `stable`) of designs saved before these traits,
// taken before they were added
const BASELINE = {
  'sofa-plain': ['0098f88f2bacf4a5', '930991c7d29a574d'],
  'sofa-rolled': ['454a13a4d5f2e4dd', '162f76f40d6f224e'],
  'sofa-classic': ['71c9371986fbeddf', '88e252ca03f5c666'],
  'armchair-plain': ['0cb0744a4815c93e', '2b0f5f137122f977'],
  'armchair-rolled': ['7bf0ee3414216730', '88278cb09acd218c'],
  'tub-round': ['3a5517f751762eca', '689d1a60ff50341f'],
  'tub-bucket': ['199b682a55939898', '364ddb9fe239ade1'],
  'tub-pedestal': ['09a5be77c960ee5e', '67992faf2b3781c0'],
  'bed-plain': ['631f5c01711cdc92', '61edeb5a9916553d'],
  'bed-channel': ['833b5bca6ba73d3e', '718522023118a210'],
  // the plan hash changed on purpose: a sleigh footboard is drawn in the base's wood, as the 3D draws it
  'bed-carved': ['da238db0297359a5', '4311196288be3b52'],
  'bed-skirt': ['3dd42cfc08a65b11', '2feb32af3296aa78'],
  'wardrobe-2': ['aa7519fce68e2e64', '254d5dcfa81ede9f'],
  'wardrobe-3': ['f3cb6a2e0efb4670', '67a56b3fbf1025da'],
  'wardrobe-loft': ['c246c3140126b04d', 'd16c9ee1f299b8e4'],
  'desk-plain': ['ef40a5c198970e31', 'a7664ec1871578df'],
  'desk-thick': ['ca96cc8e36c3a380', 'ffed48512e5ccbed'],
};

const pink = { body: '#d8a1a4', leg: '#c9a24a' };
const mustard = { body: '#a8822f', leg: '#9a9a98' };
const metalBed = {
  body: '#a27a78',
  base: '#5a4a48',
  sheet: '#f2f0ec',
  pillow: '#c9a8a6',
  accent: '#f0eeea',
};
const wood = { body: '#9c8a74', door: '#f2f1ee', trim: '#d9d9d6' };
const office = { body: '#3b3836', accent: '#5d5a57', leg: '#3a3735' };

// Each new trait: the record with it, the record without it, the size, and a part it must draw
const TRAITS = [
  [
    'sofa chan',
    'sofa',
    pink,
    { seats: 3, chan: 1, longSeat: 1 },
    {},
    [2.3, 0.95, 0.76],
    'channels',
  ],
  ['sofa step', 'sofa', pink, { seats: 3, step: 1 }, {}, [2.2, 0.92, 0.85], 'stepped-arm'],
  [
    'sofa chan+step',
    'sofa',
    pink,
    { seats: 3, chan: 1, step: 1, longSeat: 1, arm: 0.12 },
    { seats: 3, longSeat: 1, arm: 0.12 },
    [2.3, 0.95, 0.76],
    'stepped-arm',
  ],
  ['armchair chan', 'armchair', pink, { chan: 1 }, {}, [0.8, 0.82, 0.8], 'channels'],
  [
    'tub metal',
    'tub-chair',
    mustard,
    { plan: 'round', base: 'metal' },
    { plan: 'round', base: 'feet' },
    [0.75, 0.75, 0.78],
    'metal-legs',
  ],
  [
    'tub wrap',
    'tub-chair',
    mustard,
    { plan: 'round', base: 'metal', wrap: 1 },
    { plan: 'round', base: 'metal' },
    [0.75, 0.75, 0.78],
    'wrap-shell',
  ],
  [
    'bed metal',
    'bed',
    metalBed,
    { pillows: 1, metal: 1, bodyFrac: 0.5 },
    { pillows: 1, bodyFrac: 0.5 },
    [1.0, 2.0, 0.95],
    'metal-frame',
  ],
  [
    'bed rails',
    'bed',
    metalBed,
    { pillows: 1, metal: 1, rails: 1, bodyFrac: 0.5 },
    { pillows: 1, metal: 1, bodyFrac: 0.5 },
    [1.0, 2.0, 0.95],
    'guard-rails',
  ],
  [
    'bed casters',
    'bed',
    metalBed,
    { pillows: 1, metal: 1, casters: 1, bodyFrac: 0.5 },
    { pillows: 1, metal: 1, bodyFrac: 0.5 },
    [1.0, 2.0, 0.95],
    'caster',
  ],
  [
    'upholstered bed rails+casters',
    'bed',
    metalBed,
    { pillows: 2, rails: 1, casters: 1, legs: 1 },
    { pillows: 2, legs: 1 },
    [1.4, 2.05, 1.0],
    'guard-rails',
  ],
  [
    'bed store',
    'bed',
    metalBed,
    { pillows: 2, store: 1 },
    { pillows: 2 },
    [1.6, 2.1, 1.1],
    'bed-drawers',
  ],
  [
    'wardrobe mirror 2',
    'wardrobe',
    wood,
    { doors: 2, mirror: 2 },
    { doors: 2 },
    [1.0, 0.55, 1.85],
    'wardrobe-mirror',
  ],
  [
    'wardrobe mirror 1',
    'wardrobe',
    { body: '#f1f0ed' },
    { doors: 3, mirror: 1 },
    { doors: 3 },
    [1.4, 0.55, 1.9],
    'wardrobe-mirror',
  ],
  [
    'wardrobe drawers right',
    'wardrobe',
    wood,
    { doors: 2, mirror: 2, drawers: 3, dside: 'right', handle: 'ring' },
    { doors: 2, mirror: 2, handle: 'ring' },
    [1.0, 0.55, 1.85],
    'drawers',
  ],
  [
    'wardrobe drawers full',
    'wardrobe',
    { body: '#f1f0ed', trim: '#3a3a3a' },
    { doors: 3, drawers: 2, dside: 'full', handle: 'bar' },
    { doors: 3, handle: 'bar' },
    [1.4, 0.55, 1.9],
    'drawers',
  ],
  [
    'wardrobe knob',
    'wardrobe',
    { body: '#6a4a32' },
    { doors: 4, handle: 'knob' },
    { doors: 4, handle: 'bar' },
    [2.0, 0.6, 2.1],
    'handle',
  ],
  [
    'wardrobe upper',
    'wardrobe',
    { body: '#8fa9ad', trim: '#c8a96a' },
    { doors: 3, upper: 1 },
    { doors: 3, handle: 'bar' },
    [2.0, 0.6, 2.5],
    'upper-door',
  ],
  [
    'wardrobe niche',
    'wardrobe',
    { body: '#8fa9ad', trim: '#c8a96a' },
    { doors: 3, niche: 1, upper: 1, drawers: 4 },
    { doors: 3, upper: 1, drawers: 4 },
    [3.0, 0.6, 2.7],
    'niche',
  ],
  [
    'wardrobe fluted',
    'wardrobe',
    { body: '#6a4a32' },
    { doors: 4, fluted: 1 },
    { doors: 4, handle: 'bar' },
    [2.0, 0.6, 2.1],
    'channels',
  ],
  [
    'desk pedestal',
    'desk',
    office,
    { ped: 'right', drawers: 3 },
    { modesty: 1 },
    [1.4, 0.7, 0.75],
    'pedestal',
  ],
  [
    'desk sled',
    'desk',
    office,
    { ped: 'right', drawers: 3, base: 'sled' },
    { ped: 'right', drawers: 3 },
    [1.4, 0.7, 0.75],
    'sled-end',
  ],
  [
    'desk panel',
    'desk',
    { body: '#e8e4dc', accent: '#8a6a4a', leg: '#e8e4dc' },
    { ped: 'both', drawers: 4, base: 'panel' },
    { ped: 'both', drawers: 4 },
    [1.6, 0.75, 0.76],
    'pedestal',
  ],
  [
    'desk modesty',
    'desk',
    office,
    { ped: 'left', drawers: 2, modesty: 1 },
    { ped: 'left', drawers: 2 },
    [1.2, 0.6, 0.75],
    'modesty-panel',
  ],
];

describe('designs saved before the new traits', () => {
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  it('keep exactly the model and plan symbol they had', () => {
    for (const [key, { type, palette, traits, size }] of Object.entries(OLD_DESIGNS)) {
      expect([key, hash(stable(markup(type, palette, traits, size)))]).toEqual([
        key,
        BASELINE[key][0],
      ]);
      expect([key, hash(stable(planMarkup(type, palette, traits, size)))]).toEqual([
        key,
        BASELINE[key][1],
      ]);
    }
  });
});

describe('new traits read from photos', () => {
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  for (const [name, type, palette, traits, without, size, part] of TRAITS) {
    it(`${name}: draws its ${part} and changes the model`, () => {
      const html = markup(type, palette, traits, size);
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(html).toContain(`name="${part}"`);
      expect(html).not.toBe(markup(type, palette, without, size));
    });

    it(`${name}: stays inside its footprint box at small, normal and large sizes`, async () => {
      for (const k of [0.5, 1, 1.7]) {
        const dims = [size[0] * k, size[1] * k, size[2]];
        const { box, meshes } = await buildScene(type, palette, traits, dims);
        // Upholstered headboards have always been 1 cm wider than the bed each side
        const tol = type === 'bed' && !traits.metal ? 0.011 : 0.006;
        const at = `${name} at ${k}x`;
        for (const m of meshes) {
          for (const v of m.geometry.attributes.position.array)
            expect(Number.isFinite(v), at).toBe(true);
        }
        expect(box.min.x, at).toBeGreaterThanOrEqual(-dims[0] / 2 - tol);
        expect(box.max.x, at).toBeLessThanOrEqual(dims[0] / 2 + tol);
        expect(box.min.z, at).toBeGreaterThanOrEqual(-dims[1] / 2 - tol);
        expect(box.max.z, at).toBeLessThanOrEqual(dims[1] / 2 + tol);
        expect(box.max.y, at).toBeLessThanOrEqual(dims[2] + tol);
        // standing on the floor: neither floating above it nor sunk into it
        expect(box.min.y, at).toBeGreaterThan(-0.002);
        expect(box.min.y, at).toBeLessThan(0.006);
      }
    });
  }

  it('keeps a channel-tufted sofa to a few meshes however many channels it has', async () => {
    const { meshes } = await buildScene(
      'sofa',
      pink,
      { seats: 3, chan: 1, longSeat: 1 },
      [3.4, 0.95, 0.76]
    );
    const channels = meshes.filter((m) => m.name === 'channels');
    expect(channels.length).toBeLessThanOrEqual(4);
    expect(meshes.length).toBeLessThan(20);
    // the back's channels run the full width
    const back = new THREE.Box3().setFromObject(channels[0], true);
    expect(back.max.x - back.min.x).toBeGreaterThan(3.3);
  });

  it('gives a metal tub chair four thin legs reaching the floor', async () => {
    const { meshes } = await buildScene(
      'tub-chair',
      mustard,
      { plan: 'round', base: 'metal', wrap: 1 },
      [0.75, 0.75, 0.78]
    );
    const legs = meshes.filter(
      (m) => m.geometry.type === 'CylinderGeometry' && m.geometry.parameters.radiusTop < 0.012
    );
    expect(legs.length).toBeGreaterThanOrEqual(4);
    const lowest = legs
      .map((m) => new THREE.Box3().setFromObject(m, true).min.y)
      .filter((y) => y < 0.01);
    expect(lowest.length).toBe(4);
  });

  it('rests each new part on what holds it up', async () => {
    const tub = await buildScene(
      'tub-chair',
      mustard,
      { plan: 'round', base: 'metal', wrap: 1 },
      [0.75, 0.75, 0.78],
      ['wrap-shell', 'metal-legs', 'seat-cushion']
    );
    expect(tub.parts['wrap-shell'].min.y).toBeCloseTo(tub.parts['metal-legs'].max.y, 2);
    expect(tub.parts['seat-cushion'].min.y).toBeCloseTo(tub.parts['metal-legs'].max.y, 2);
    const bed = await buildScene(
      'bed',
      metalBed,
      { pillows: 1, metal: 1, rails: 1, casters: 1, bodyFrac: 0.5 },
      [1.0, 2.0, 0.95],
      ['mattress', 'metal-frame', 'guard-rails', 'caster', 'headboard']
    );
    // the mattress lies on the frame's deck, the rails stand on the side rails, the frame on its castors
    expect(bed.parts.mattress.min.y).toBeGreaterThan(bed.parts['metal-frame'].min.y + 0.1);
    expect(bed.parts['guard-rails'].min.y).toBeLessThan(bed.parts.mattress.min.y);
    expect(bed.parts['guard-rails'].max.y).toBeGreaterThan(bed.parts.mattress.max.y + 0.1);
    expect(bed.parts.caster.min.y).toBeCloseTo(0, 3);
    expect(bed.parts.headboard.min.y).toBeLessThan(0.07);
    expect(bed.parts.headboard.max.y).toBeCloseTo(0.95, 2);
    const desk = await buildScene(
      'desk',
      office,
      { ped: 'right', drawers: 3, base: 'sled', modesty: 1, topH: 3 },
      [1.4, 0.7, 0.74],
      ['pedestal', 'sled-end', 'modesty-panel']
    );
    for (const part of ['pedestal', 'sled-end', 'modesty-panel'])
      expect(desk.parts[part].max.y, part).toBeCloseTo(0.74 - 0.03, 2);
    expect(desk.parts['sled-end'].min.y).toBeCloseTo(0, 3);
  });

  it('makes grey metal legs shiny and keeps a coloured or near-black finish its own colour', () => {
    expect(metalFinish('#9a9a98').metalness).toBeGreaterThan(0.5);
    expect(metalFinish('#c9a24a').color).toBe('#c9a24a');
    expect(metalFinish('#1c1c1c').metalness).toBeLessThan(0.5);
  });
});

describe('channel ribs', () => {
  it('round the corner of a seat path with outward normals', () => {
    const path = roundedPath(
      [
        [-0.3, 0.4],
        [0.4, 0.4],
        [0.4, 0.05],
      ],
      0.05
    );
    for (const { p, n } of path) {
      expect(Math.hypot(...n)).toBeCloseTo(1, 6);
      for (const v of p) expect(Number.isFinite(v)).toBe(true);
      // nothing beyond the corner point
      expect(p[0]).toBeLessThanOrEqual(0.4 + 1e-9);
      expect(p[1]).toBeLessThanOrEqual(0.4 + 1e-9);
    }
    expect(path[0].n[1]).toBeCloseTo(1, 6); // up on the top
    expect(path[path.length - 1].n[0]).toBeCloseTo(1, 6); // forward down the front
  });

  it('build one merged mesh of ribs standing proud of the surface, facing out', () => {
    const { width, centres } = ribCentres(1, 0.1);
    expect(centres).toHaveLength(10);
    const geo = channelRibsGeometry({
      path: roundedPath(
        [
          [0, 0.4],
          [0.5, 0.4],
          [0.5, 0],
        ],
        0.05
      ),
      centres,
      width,
      depth: 0.03,
      profile: 0.6,
    });
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    expect(b.min.x).toBeCloseTo(-0.5, 3);
    expect(b.max.x).toBeCloseTo(0.5, 3);
    expect(b.max.y).toBeCloseTo(0.43, 3);
    expect(b.max.z).toBeCloseTo(0.53, 3);
    const n = geo.attributes.normal;
    // the crest of a rib on the seat top faces up
    let up = 0;
    for (let i = 0; i < n.count; i++) if (n.getY(i) > 0.9) up++;
    expect(up).toBeGreaterThan(centres.length);
  });
});

describe('detail layouts', () => {
  it('steps terraced arm slabs down towards the seat', () => {
    const tiers = stepTiers({ armW: 0.24, armH: 0.62, seatH: 0.44 });
    expect(tiers).toHaveLength(3);
    for (let k = 1; k < tiers.length; k++) expect(tiers[k].h).toBeLessThan(tiers[k - 1].h);
    expect(tiers[tiers.length - 1].h).toBeGreaterThan(0.44);
    expect(tiers.reduce((s, t) => s + t.w, 0)).toBeCloseTo(0.24, 9);
    expect(stepTiers({ armW: 0.12, armH: 0.58, seatH: 0.42 })).toHaveLength(2);
  });

  it('slopes a wrap-around shell from the back down to the arm ends', () => {
    expect(wrapRise(0)).toBe(1);
    expect(wrapRise(1)).toBe(0);
    expect(wrapRise(0.5)).toBeGreaterThan(wrapRise(0.8));
    const geo = wrapShellGeometry({ r: 0.375, t: 0.105, y0: 0.15, top: 0.78 });
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    expect(b.max.y).toBeCloseTo(0.78, 2);
    expect(b.min.y).toBeCloseTo(0.15, 6);
    expect(b.min.z).toBeGreaterThanOrEqual(-0.375 - 1e-6);
    expect(Math.max(-b.min.x, b.max.x)).toBeLessThanOrEqual(0.375 + 1e-6);
    // the arms end part way along the sides, leaving the front open
    expect(b.max.z).toBeLessThan(0.375 * -Math.cos(WRAP_END) + 0.06);
  });

  it('staggers guard rails along the sides, clear of the head and foot', () => {
    for (const depth of [1.0, 2.0, 3.4]) {
      const spans = guardRailSpans(depth);
      expect(spans.map((s) => s.side)).toEqual([-1, 1]);
      for (const s of spans) {
        expect(s.z0).toBeGreaterThan(-depth / 2 + 0.08);
        expect(s.z1).toBeLessThan(depth / 2 - 0.08);
        expect(s.z1 - s.z0).toBeGreaterThan(0.2);
      }
      expect(spans[0].z0).toBeLessThanOrEqual(spans[1].z0);
    }
  });

  it('lays out wardrobe doors across the width, the mirror on a central full-height door', () => {
    const two = wardrobeLayout({
      widthM: 1,
      heightM: 1.85,
      traits: { doors: 2, mirror: 2, drawers: 3, dside: 'right' },
    });
    expect(two.cols).toHaveLength(2);
    expect(two.mirrorIdx).toBe(0);
    expect(two.cols[1].under).toBe(true);
    expect(two.cols[1].bottom).toBeGreaterThan(two.cols[0].bottom + 0.3);
    const three = wardrobeLayout({ widthM: 1.4, heightM: 1.9, traits: { doors: 3, mirror: 1 } });
    expect(three.mirrorIdx).toBe(1);
    const sum = three.cols.reduce((s, c) => s + c.w, 0);
    expect(sum).toBeCloseTo(1.4 - 0.004, 9);
    const built = wardrobeLayout({
      widthM: 3,
      heightM: 2.7,
      traits: { doors: 3, niche: 1, upper: 1, drawers: 4 },
    });
    expect(built.niche.x0).toBeLessThan(0);
    expect(built.niche.x1).toBeGreaterThan(0);
    expect(built.niche.counter).toBeLessThan(built.niche.top);
    expect(built.uppers.length).toBeGreaterThan(built.cols.length);
    // tiny or squat resized units still have positive door columns and a niche above its counter
    for (const [w, h] of [
      [0.5, 1.0],
      [0.8, 1.4],
    ]) {
      const L = wardrobeLayout({
        widthM: w,
        heightM: h,
        traits: { doors: 4, niche: 1, upper: 1, drawers: 4 },
      });
      for (const c of L.cols) expect(c.w).toBeGreaterThan(0);
      expect(L.niche.top).toBeGreaterThan(L.niche.counter);
      expect(L.tallTop).toBeGreaterThan(L.plinth);
    }
  });

  it('puts desk pedestals under the top on their side and legs only where nothing else holds it', () => {
    const right = deskLayout({
      widthM: 1.4,
      depthM: 0.7,
      heightM: 0.75,
      traits: { ped: 'right', drawers: 3 },
    });
    expect(right.pedestals).toHaveLength(1);
    expect(right.pedestals[0].x).toBeGreaterThan(0);
    expect(right.pedestals[0].x + right.pedestals[0].w / 2).toBeLessThanOrEqual(0.7);
    expect(right.legs.every(([x]) => x < 0)).toBe(true);
    const hanging = deskLayout({
      widthM: 1.1,
      depthM: 0.55,
      heightM: 0.75,
      traits: { ped: 'right', drawers: 1 },
    });
    expect(hanging.legs).toHaveLength(4);
    expect(hanging.pedestals[0].y0).toBeGreaterThan(0.4);
    // Wide enough for two pedestals with knee room between them
    const both = deskLayout({
      widthM: 1.4,
      depthM: 0.6,
      heightM: 0.75,
      traits: { ped: 'both', drawers: 4, base: 'panel' },
    });
    expect(both.legs).toHaveLength(0);
    const [a, b] = both.pedestals;
    expect(a.x + a.w / 2).toBeLessThan(b.x - b.w / 2);
  });
});
