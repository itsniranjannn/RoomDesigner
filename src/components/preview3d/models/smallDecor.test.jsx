/**
 * Small decor that was drawn as the wrong thing or lost its detail when resized: the candle holder (drawn as a
 * vase of flowers) and the ceramic vase (whose belly swallowed its neck, stems and flowers once widened).
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act, extend } from '@react-three/fiber';
import { ArchitecturalSilhouette } from '../../canvas/ArchitecturalSilhouette.jsx';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { resolveModel } from './index.js';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

const piece = (id) => FURNITURE_CATALOG.find((i) => i.id === id);

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
const named = (scene, name) => {
  const out = [];
  scene.traverse((o) => o.name === name && out.push(o));
  return out;
};
const plan = (item, widthCm, depthCm) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette item={item} widthCm={widthCm} depthCm={depthCm} />
    </svg>
  );

describe('the candle holder is a candle holder', () => {
  const candles = piece('candle-set');

  it('is not mapped to the flower vase', () => {
    expect(candles.shapeType).toBe('candle-set');
    expect(piece('ceramic-vase')?.shapeType ?? 'vase').toBe('vase');
  });

  it('draws a tray of candles with their flames, at every size', async () => {
    for (const [w, d, h] of [
      [0.04, 0.04, 0.06],
      [0.1, 0.1, 0.16],
      [0.25, 0.25, 0.4],
    ])
      await inScene(candles, [w, d, h], (scene) => {
        const lit = named(scene, 'candle');
        expect(lit.length, `${w}`).toBe(3);
        const whole = bbox(scene);
        expect(whole.max.y, `${w}`).toBeLessThanOrEqual(h + 0.03);
        expect(whole.max.y, `${w}`).toBeGreaterThan(h * 0.6);
        for (const c of lit) {
          const b = bbox(c);
          expect(Math.max(-b.min.x, b.max.x), `${w}`).toBeLessThanOrEqual(w / 2 + 1e-6);
          expect(Math.max(-b.min.z, b.max.z), `${w}`).toBeLessThanOrEqual(d / 2 + 1e-6);
        }
        // no flowers anywhere
        expect(named(scene, 'vase')).toHaveLength(0);
      });
  });

  it('shows candles on the plan rather than flower heads', () => {
    const html = plan(candles, 10, 10);
    expect(html).toContain(candles.subColor);
    expect(html).not.toContain('#4F7A47'); // the vase's green stems
  });
});

describe('the ceramic vase keeps its flowers when it is enlarged', () => {
  const vase = FURNITURE_CATALOG.find((i) => i.shapeType === 'vase');

  it('has a vase in the catalog', () => {
    expect(vase).toBeTruthy();
  });

  for (const scale of [0.4, 1, 1.8, 2.5])
    it(`at ${scale}x the belly does not swallow the stems`, async () => {
      const w = (vase.widthCm * scale) / 100;
      const d = (vase.depthCm * scale) / 100;
      const h = vase.heightCm / 100;
      await inScene(vase, [w, d, h], (scene) => {
        let belly = null;
        const flowers = [];
        scene.traverse((o) => {
          if (!o.isMesh) return;
          if (o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius > 0.02)
            belly = bbox(o);
          if (o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius <= 0.02)
            flowers.push(bbox(o));
        });
        expect(belly, `${scale}`).not.toBeNull();
        expect(flowers.length, `${scale}`).toBeGreaterThan(0);
        // every flower head stands clear above the belly
        for (const f of flowers) expect(f.min.y, `${scale}`).toBeGreaterThan(belly.max.y);
        expect(belly.max.y, `${scale}`).toBeLessThan(h);
      });
    });
});
