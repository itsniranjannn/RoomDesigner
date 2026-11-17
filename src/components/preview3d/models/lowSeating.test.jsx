/**
 * Seating resized low keeps its back: the back cushion used to be the height left over above a fixed seat, so
 * a sofa or armchair lowered towards 50 cm lost its back altogether and its tufting collapsed to nothing.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { createRoot, act, extend } from '@react-three/fiber';
import { CustomMeshModel } from './customMesh.jsx';
import { sanitizeDesign } from '../../../engine/design.js';
import { seatProportions } from './shared.jsx';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

const PAL = {
  body: '#7a8a9a',
  cushion: '#8a9aaa',
  leg: '#2a2622',
  frame: '#4b2a17',
  scatter: '#c9b98f',
};

async function inScene(design, [w, d, h], look) {
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
        def={{ design }}
        widthM={w}
        depthM={d}
        heightM={h}
        mainColor={design.palette.body}
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
/** Every mesh of the scene with its own bounds and the smallest side of its geometry. */
function meshes(scene) {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const b = bbox(o);
    out.push({ o, b, span: Math.min(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) });
  });
  return out;
}

const RECORDS = [
  ['sofa', { seats: 3, tufted: 1 }, 2.1, 0.9],
  ['sofa', { seats: 2, tufted: 1, roll: 1, longSeat: 1 }, 1.6, 0.85],
  ['armchair', { tufted: 1 }, 0.85, 0.85],
  ['armchair', { tufted: 1, taper: 1 }, 0.8, 0.8],
  ['sofa', { seats: 3, frame: 1, tufted: 1, scat: 2 }, 2.1, 0.95],
  ['armchair', { frame: 2, cane: 1, tufted: 1 }, 0.9, 0.9],
  ['sofa', { seats: 3 }, 2.1, 0.9],
];
const LOW = [0.5, 0.55, 0.6, 0.65, 0.7, 0.8];

describe('seating resized low', () => {
  for (const [type, traits, widthM, depthM] of RECORDS)
    for (const heightM of LOW)
      it(`${type} ${JSON.stringify(traits)} at ${heightM} m keeps a back and sound geometry`, async () => {
        const design = sanitizeDesign({ v: 1, type, palette: PAL, traits });
        await inScene(design, [widthM, depthM, heightM], (scene) => {
          const all = meshes(scene);
          expect(all.length).toBeGreaterThan(3);
          for (const { o, span } of all) {
            // nothing collapsed to a zero or inside-out size
            expect(span, o.geometry.type).toBeGreaterThan(0);
            for (const v of o.geometry.attributes.position.array)
              expect(Number.isFinite(v)).toBe(true);
          }
          // something stands above the seat: the piece still has a back
          const seat = seatProportions(heightM, 0.44, 0.62).seatH;
          const above = all.filter(({ b }) => b.max.y > seat + 0.05 && b.min.z < 0);
          expect(above.length).toBeGreaterThan(0);
          const whole = new THREE.Box3();
          all.forEach(({ b }) => whole.union(b));
          // the piece fills its height; a carved crest's finials stand a little above it, as they always have
          expect(whole.max.y).toBeLessThanOrEqual(heightM + 0.12);
          expect(whole.max.y).toBeGreaterThan(heightM * 0.8);
          // a splayed leg's tip dips a hair into the floor, as it does at every height
          expect(whole.min.y).toBeGreaterThan(-0.012);
        });
      });

  it('brings the seat and arms down with the piece, and keeps them where they were at a normal height', () => {
    // every catalog seat and every piece at a usual height is untouched
    for (const [heightM, seatH, armH] of [
      [0.76, 0.42, 0.58],
      [0.78, 0.44, 0.62],
      [0.82, 0.44, 0.62],
      [0.84, 0.44, 0.62],
      [0.9, 0.44, 0.62],
      [1.0, 0.42, 0.58],
      [1.05, 0.44, 0.62],
    ]) {
      const p = seatProportions(heightM, seatH, armH);
      expect(p.seatH, `${heightM}`).toBe(seatH);
      expect(p.armH, `${heightM}`).toBe(armH);
      expect(p.backH, `${heightM}`).toBeCloseTo(heightM - seatH - 0.06, 9);
    }
    // and a low piece gets a lower seat with a back that is still there
    for (let heightM = 0.3; heightM <= 0.75; heightM += 0.05) {
      const p = seatProportions(heightM, 0.44, 0.62);
      expect(p.seatH, `${heightM}`).toBeLessThan(heightM * 0.6);
      expect(p.armH, `${heightM}`).toBeLessThanOrEqual(heightM * 0.82 + 1e-9);
      expect(p.armH, `${heightM}`).toBeGreaterThan(p.seatH);
      expect(p.backH, `${heightM}`).toBeGreaterThanOrEqual(0.08);
      expect(p.seatH + p.backH, `${heightM}`).toBeLessThanOrEqual(heightM + 1e-9);
    }
  });

  it('keeps the tufting on a low back instead of collapsing it', async () => {
    const design = sanitizeDesign({
      v: 1,
      type: 'sofa',
      palette: PAL,
      traits: { seats: 3, tufted: 1 },
    });
    const tufts = (heightM) =>
      inScene(design, [2.1, 0.9, heightM], (scene) => {
        let found = null;
        scene.traverse((o) => {
          if (o.name === 'tufting' && !found) found = bbox(o);
        });
        return found;
      });
    for (const heightM of [0.5, 0.6, 0.75, 0.9]) {
      const b = await tufts(heightM);
      expect(b, `${heightM}`).not.toBeNull();
      expect(b.max.y - b.min.y, `${heightM}`).toBeGreaterThan(0.02);
      expect(b.max.x - b.min.x, `${heightM}`).toBeGreaterThan(0.05);
    }
  });
});
