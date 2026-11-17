/**
 * The kitchen island's bar stools: they scale with the island, stand inside its own footprint (the app snaps an
 * island flush against a wall, so a seat outside the footprint is a seat inside the wall), clear the cabinet,
 * and the plan symbol draws the same stools, in the same number and at the same size.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act, extend } from '@react-three/fiber';
import { ArchitecturalSilhouette } from '../../canvas/ArchitecturalSilhouette.jsx';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { resolveModel } from './index.js';
import { islandCarcass, islandStools } from './kitchenLayout.js';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

const ISLAND = FURNITURE_CATALOG.find((i) => i.id === 'kitchen-island');
const SIZES = [
  [0.6, 0.28],
  [0.9, 0.45],
  [1.2, 0.6],
  [1.5, 0.7],
  [2.2, 1.0],
  [3.75, 1.75],
];

async function island(widthM, depthM, heightM, look) {
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
  const Model = resolveModel(ISLAND.shapeType);
  let store;
  await act(async () => {
    store = root.render(
      <Model
        def={ISLAND}
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        mainColor={ISLAND.color}
        legColor={ISLAND.legColor}
      />
    );
  });
  const scene = store.getState().scene;
  scene.updateMatrixWorld(true);
  try {
    return look(scene);
  } finally {
    root.unmount();
  }
}

const bbox = (o) => new THREE.Box3().setFromObject(o, true);
const stoolsIn = (scene) => {
  const out = [];
  scene.traverse((o) => o.name === 'stool' && out.push(o));
  return out;
};

const plan = (widthCm, depthCm) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette item={ISLAND} widthCm={widthCm} depthCm={depthCm} />
    </svg>
  );

describe('kitchen island stools', () => {
  for (const [widthM, depthM] of SIZES)
    it(`stay inside the footprint at ${widthM} x ${depthM} m`, async () => {
      await island(widthM, depthM, 0.92, (scene) => {
        const stools = stoolsIn(scene);
        expect(stools.length).toBeGreaterThan(0);
        for (const stool of stools) {
          const b = bbox(stool);
          expect(b.max.z).toBeLessThanOrEqual(depthM / 2 + 1e-6);
          expect(b.min.z).toBeGreaterThanOrEqual(-depthM / 2 - 1e-6);
          expect(b.min.x).toBeGreaterThanOrEqual(-widthM / 2 - 1e-6);
          expect(b.max.x).toBeLessThanOrEqual(widthM / 2 + 1e-6);
          // and clear of the cabinet it is tucked under
          expect(b.min.z).toBeGreaterThanOrEqual(islandCarcass(depthM).front - 1e-6);
        }
      });
    });

  it('never stands taller than the worktop, whatever the island height', async () => {
    for (const heightM of [0.6, 0.8, 0.92, 1.1])
      await island(1.5, 0.7, heightM, (scene) => {
        for (const stool of stoolsIn(scene))
          expect(bbox(stool).max.y, `h=${heightM}`).toBeLessThan(heightM - 0.05);
      });
  });

  it('scales the seat with the island instead of keeping one fixed size', async () => {
    const seat = (widthM, depthM) =>
      island(widthM, depthM, 0.92, (scene) => {
        const b = bbox(stoolsIn(scene)[0]);
        return b.max.x - b.min.x;
      });
    const small = await seat(0.6, 0.28);
    const normal = await seat(1.5, 0.7);
    const large = await seat(3.75, 1.75);
    expect(small).toBeLessThan(normal);
    expect(normal).toBeLessThan(large);
    expect(small).toBeLessThan(0.28);
  });

  it('draws the same stools on the plan, in number and size', async () => {
    for (const [widthM, depthM] of SIZES) {
      const want = islandStools({ widthM, depthM, heightM: 0.92 });
      const drawn = await island(widthM, depthM, 0.92, (scene) =>
        stoolsIn(scene).map((o) => {
          const b = bbox(o);
          return { r: (b.max.x - b.min.x) / 2, cx: (b.min.x + b.max.x) / 2 };
        })
      );
      const at = `${widthM} x ${depthM}`;
      expect(drawn.length, at).toBe(want.count);
      const html = plan(widthM * 100, depthM * 100);
      const circles = [
        ...html.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"/g),
      ].map((m) => ({ cx: +m[1], cy: +m[2], r: +m[3] }));
      // the plan draws a seat and a footrest ring for each stool, and nothing else round
      expect(circles.length, at).toBe(want.count * 2);
      const seats = circles.filter((c) => c.r > want.footR * 100 + 1e-9);
      expect(seats.length, at).toBe(want.count);
      for (const seat of seats) {
        expect(seat.r, at).toBeCloseTo(want.seatR * 100, 6);
        expect(Math.abs(seat.cy) + seat.r, at).toBeLessThanOrEqual((depthM * 100) / 2 + 1e-6);
        expect(
          drawn.some((d) => Math.abs(d.cx * 100 - seat.cx) < 1e-6),
          at
        ).toBe(true);
        expect(
          drawn.some((d) => Math.abs(d.r * 100 - seat.r) < 0.5),
          at
        ).toBe(true);
      }
    }
  });

  it('leaves the knee space in front of the cabinet the stools sit in', () => {
    for (const [, depthM] of SIZES) {
      const { front } = islandCarcass(depthM);
      expect(front).toBeLessThan(depthM / 2);
      expect(depthM / 2 - front).toBeGreaterThan(depthM * 0.25);
    }
  });
});
