/**
 * Parts that left their piece when it was resized: the AV shelf of a media console or low TV unit grew out of
 * the front, and a counter's keyboard and mouse floated off the top of a shrunk reception counter.
 *
 * This is not a rule for every piece: plenty of them stand proud on purpose (a handle, a tap, a stool). These
 * are the parts that belong inside the carcass they sit in.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { createRoot, act, extend } from '@react-three/fiber';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { resolveModel } from './index.js';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

async function inScene(item, [w, d, h], look) {
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
  const Model = resolveModel(item.shapeType);
  let store;
  await act(async () => {
    store = root.render(
      <Model
        def={item}
        widthM={w}
        depthM={d}
        heightM={h}
        mainColor={item.color}
        subColor={item.subColor}
        accentColor={item.accentColor}
        legColor={item.legColor || '#242321'}
        handleColor="#C4A869"
        cushionColor={item.cushionColor || item.color}
        fabricColor="#FAF6EE"
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
const partIn = (scene, name) => {
  const b = new THREE.Box3();
  scene.traverse((o) => {
    if (o.name !== name) return;
    b.union(bbox(o));
  });
  return b.isEmpty() ? null : b;
};
const SCALES = [0.4, 0.7, 1, 1.8, 2.5];

describe('the AV bay shelf stays in the cabinet', () => {
  for (const id of ['media-console', 'tv-unit-low'])
    for (const scale of SCALES)
      it(`${id} at ${scale}x`, async () => {
        const item = FURNITURE_CATALOG.find((i) => i.id === id);
        const w = (item.widthCm * scale) / 100;
        const d = (item.depthCm * scale) / 100;
        await inScene(item, [w, d, item.heightCm / 100], (scene) => {
          const bay = partIn(scene, 'av-bay');
          expect(bay).not.toBeNull();
          expect(bay.max.z).toBeLessThanOrEqual(d / 2 + 0.005);
          expect(bay.min.z).toBeGreaterThanOrEqual(-d / 2 - 0.005);
          expect(bay.max.x).toBeLessThanOrEqual(w / 2 + 0.005);
        });
      });
});

describe('a counter keeps its keyboard and mouse on the top', () => {
  const counter = FURNITURE_CATALOG.find((i) => i.id === 'reception-counter');

  for (const scale of SCALES)
    it(`reception-counter at ${scale}x`, async () => {
      const w = (counter.widthCm * scale) / 100;
      const d = (counter.depthCm * scale) / 100;
      await inScene(counter, [w, d, counter.heightCm / 100], (scene) => {
        const keys = partIn(scene, 'keyboard');
        if (!keys) return; // too small for a keyboard: better none than one in mid-air
        expect(keys.max.z).toBeLessThanOrEqual(d / 2 + 1e-6);
        expect(keys.min.z).toBeGreaterThanOrEqual(-d / 2 - 1e-6);
        expect(keys.max.x).toBeLessThanOrEqual(w / 2 + 1e-6);
        expect(keys.min.x).toBeGreaterThanOrEqual(-w / 2 - 1e-6);
      });
    });

  it('still lays a keyboard on a desk at its own size', async () => {
    for (const id of ['desk-l-shaped', 'standing-desk', 'reception-counter']) {
      const item = FURNITURE_CATALOG.find((i) => i.id === id);
      const keys = await inScene(
        item,
        [item.widthCm / 100, item.depthCm / 100, item.heightCm / 100],
        (scene) => partIn(scene, 'keyboard')
      );
      expect(keys, id).not.toBeNull();
    }
  });

  it('keeps every desk keyboard on its own top, at every size', async () => {
    for (const id of ['desk-l-shaped', 'standing-desk'])
      for (const scale of SCALES) {
        const item = FURNITURE_CATALOG.find((i) => i.id === id);
        const w = (item.widthCm * scale) / 100;
        const d = (item.depthCm * scale) / 100;
        await inScene(item, [w, d, item.heightCm / 100], (scene) => {
          const keys = partIn(scene, 'keyboard');
          if (!keys) return;
          expect(keys.max.z, `${id} ${scale}x`).toBeLessThanOrEqual(d / 2 + 1e-6);
        });
      }
  });
});
