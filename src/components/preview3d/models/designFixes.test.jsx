/**
 * Regression tests for the review of the photo-trait models: narrow desks, hanging desk drawers, metal bed box
 * springs under a recolour, wardrobe handles and mirror sheen, frame precedence on the plan, round desk legs
 * and plan colours after a recolour.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act, extend } from '@react-three/fiber';
import { CustomMeshModel } from './customMesh.jsx';
import { ArchitecturalSilhouette } from '../../canvas/ArchitecturalSilhouette.jsx';
import { sanitizeDesign } from '../../../engine/design.js';
import {
  deskLayout,
  deskLegThick,
  wardrobeLayout,
  placeDoorHandle,
  PULL_MAX,
} from './designLayout.js';
import { effectivePalette } from './designPalette.js';
import { glassOutline, sheenPolygons } from './designCasework.jsx';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

const record = (type, palette, traits) => sanitizeDesign({ v: 1, type, palette, traits });

const markup = (design, [w, d, h], mainColor = design.palette.body) =>
  renderToStaticMarkup(
    <CustomMeshModel def={{ design }} widthM={w} depthM={d} heightM={h} mainColor={mainColor} />
  );

const plan = (design, [w, d], color = design.palette.body) =>
  renderToStaticMarkup(
    <svg>
      <ArchitecturalSilhouette
        item={{ shapeType: 'custom-mesh', color, design }}
        widthCm={w * 100}
        depthCm={d * 100}
      />
    </svg>
  );

/** Builds a design into a real three.js scene (no WebGL) and hands it to `look` before unmounting. */
async function inScene(design, [w, d, h], look, mainColor = design.palette.body) {
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
      <CustomMeshModel def={{ design }} widthM={w} depthM={d} heightM={h} mainColor={mainColor} />
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
// A material colour as the test's renderer stores it (a three.js Color, or the colour string as given)
const colourOf = (c) => (typeof c === 'string' ? c.toLowerCase() : `#${c.getHexString()}`);
const inside = (o, name) => {
  for (let p = o; p; p = p.parent) if (p.name === name) return true;
  return false;
};
const named = (scene, name) => {
  const found = [];
  scene.traverse((o) => o.name === name && found.push(o));
  return found;
};

const OFFICE = { body: '#3b3836', accent: '#5d5a57', leg: '#3a3735' };

const DESK_COMBOS = [];
for (const ped of ['left', 'right', 'both'])
  for (const drawers of [1, 2, 3, 4])
    for (const base of ['legs', 'panel', 'sled']) DESK_COMBOS.push({ ped, drawers, base });

describe('1. desks resized narrow keep sensible pedestals', () => {
  it('never lays out a pedestal under 10 cm or past the top, and something holds each end', () => {
    for (const traits of DESK_COMBOS)
      for (let cm = 10; cm <= 160; cm += 2) {
        const widthM = cm / 100;
        const depthM = Math.min(0.6, Math.max(0.3, widthM));
        for (const legFrac of [0.02, 0.05, 0.12]) {
          const legThick = deskLegThick(widthM, { legFrac });
          const D = deskLayout({ widthM, depthM, heightM: 0.75, traits, legThick });
          const at = `${JSON.stringify(traits)} at ${cm} cm`;
          for (const p of D.pedestals) {
            expect(p.w, at).toBeGreaterThanOrEqual(0.1);
            expect(Math.abs(p.x) + p.w / 2, at).toBeLessThanOrEqual(widthM / 2 + 1e-9);
            expect(p.y1, at).toBeGreaterThan(p.y0);
          }
          if (D.pedestals.length === 2) {
            const [a, b] = D.pedestals;
            expect(a.x + a.w / 2, at).toBeLessThan(b.x - b.w / 2);
          }
          for (const s of [-1, 1]) {
            const held =
              D.base !== 'legs' ||
              D.legs.some(([x]) => Math.sign(x) === s) ||
              D.pedestals.some((p) => p.side === s && !D.hanging);
            expect(held, `${at}: end ${s}`).toBe(true);
          }
        }
      }
  });

  it('lays out desks 1 m and wider exactly as before (full-height pedestals)', () => {
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    for (const traits of DESK_COMBOS.filter((t) => t.drawers > 1))
      for (const widthM of [1.0, 1.1, 1.2, 1.4, 1.6, 2.0]) {
        const D = deskLayout({ widthM, depthM: 0.6, heightM: 0.75, traits });
        const n = traits.ped === 'both' ? 2 : 1;
        const endT = traits.base === 'panel' ? 0.025 : traits.base === 'sled' ? 0.05 : 0;
        const inner = traits.base === 'legs' ? widthM / 2 - 0.02 : widthM / 2 - 0.03 - endT - 0.01;
        const pw = Math.min(clamp(widthM * 0.3, 0.3, 0.45), (widthM - 0.5) / n);
        for (const p of D.pedestals) {
          expect(p.w).toBeCloseTo(pw, 12);
          expect(p.x).toBeCloseTo(p.side * (inner - pw / 2), 12);
        }
      }
  });

  it('draws narrow desks with no inside-out boxes, pulls within their drawers, inside the footprint', async () => {
    for (const w of [0.45, 0.5, 0.55, 0.6, 0.8, 1.2])
      for (const traits of [
        { ped: 'left', drawers: 3 },
        { ped: 'right', drawers: 1 },
        { ped: 'both', drawers: 3 },
        { ped: 'both', drawers: 1, base: 'sled' },
      ]) {
        const design = record('desk', OFFICE, traits);
        const size = [w, 0.5, 0.75];
        const at = `${JSON.stringify(traits)} at ${w} m`;
        await inScene(design, size, (scene) => {
          scene.traverse((o) => {
            if (!o.isMesh || o.geometry.type !== 'BoxGeometry') return;
            const { width, height, depth } = o.geometry.parameters;
            expect(Math.min(width, height, depth), at).toBeGreaterThan(0);
          });
          for (const ped of named(scene, 'pedestal')) {
            const carcass = new THREE.Box3();
            ped.children.filter((c) => c.isMesh).forEach((c) => carcass.union(bbox(c)));
            ped.traverse((h) => {
              if (h.name !== 'handle') return;
              const hb = bbox(h);
              expect(hb.min.x, at).toBeGreaterThanOrEqual(carcass.min.x - 1e-6);
              expect(hb.max.x, at).toBeLessThanOrEqual(carcass.max.x + 1e-6);
            });
          }
          const all = bbox(scene);
          expect(all.min.x, at).toBeGreaterThanOrEqual(-w / 2 - 1e-6);
          expect(all.max.x, at).toBeLessThanOrEqual(w / 2 + 1e-6);
          expect(all.max.z, at).toBeLessThanOrEqual(0.25 + 1e-6);
        });
        expect(plan(design, size), at).not.toMatch(/\s(width|height|r)="-|NaN|Infinity/);
      }
  });
});

describe('2. a single drawer hangs between the legs', () => {
  it('keeps the hanging drawer inside the legs in the layout', () => {
    for (let widthM = 0.6; widthM <= 3.0001; widthM += 0.1)
      for (const legFrac of [0.03, 0.05, 0.08, 0.12])
        for (const ped of ['left', 'right', 'both']) {
          const legThick = deskLegThick(widthM, { legFrac });
          const D = deskLayout({
            widthM,
            depthM: 0.6,
            heightM: 0.75,
            traits: { ped, drawers: 1 },
            legThick,
          });
          expect(D.legs).toHaveLength(4);
          for (const p of D.pedestals)
            expect(Math.abs(p.x) + p.w / 2).toBeLessThan(widthM / 2 - 0.03 - legThick);
        }
  });

  it('draws no leg through the hanging drawer box or its front', async () => {
    for (const [traits, size] of [
      [{ ped: 'right', drawers: 1 }, [1.1, 0.55, 0.75]],
      [{ ped: 'both', drawers: 1 }, [1.4, 0.7, 0.75]],
      [{ ped: 'left', drawers: 1, modesty: 1, legFrac: 0.1 }, [1.2, 0.6, 0.75]],
      [{ ped: 'right', drawers: 1, roundLegs: 1 }, [0.9, 0.5, 0.75]],
    ]) {
      const design = record('desk', OFFICE, traits);
      await inScene(design, size, (scene) => {
        const legs = [];
        scene.traverse((o) => {
          if (!o.isMesh || inside(o, 'pedestal')) return;
          const b = bbox(o);
          if (b.min.y < 0.001 && b.max.y > 0.6 && b.max.x - b.min.x < 0.12) legs.push(b);
        });
        expect(legs).toHaveLength(4);
        const peds = named(scene, 'pedestal').map(bbox);
        expect(peds.length).toBeGreaterThan(0);
        for (const leg of legs)
          for (const ped of peds)
            expect(leg.intersectsBox(ped), JSON.stringify(traits)).toBe(false);
      });
    }
  });
});

describe('3-4. a metal bed box spring', () => {
  const photo = {
    body: '#a27a78',
    base: '#5a4a48',
    sheet: '#f2f0ec',
    pillow: '#c9a8a6',
    accent: '#f0eeea',
  };
  const look = (scene) => {
    const one = (name) => {
      const found = named(scene, name);
      return found.length ? bbox(found[0]) : null;
    };
    return {
      spring: one('box-spring'),
      deck: one('bed-deck'),
      rails: one('side-rails'),
      guard: one('guard-rails'),
      mattress: one('mattress'),
    };
  };

  it('is decided by the photographed colours, so a recolour never adds, removes or moves it', async () => {
    const design = record('bed', photo, { pillows: 1, metal: 1, rails: 1, bodyFrac: 0.5 });
    const size = [1.0, 2.0, 0.95];
    const before = await inScene(design, size, look);
    expect(before.spring).not.toBeNull();
    for (const c of ['#2B2B2B', '#605050', '#5a4a48', '#3a6ea5', '#E6DDCB', '#8B2635']) {
      const after = await inScene(design, size, look, c);
      expect(after.spring, c).not.toBeNull();
      expect(after.spring.min.y).toBeCloseTo(before.spring.min.y, 6);
      expect(after.rails.min.y).toBeCloseTo(before.rails.min.y, 6);
      expect(after.guard.min.y).toBeCloseTo(before.guard.min.y, 6);
    }
    // a bed photographed without one never grows one
    const plain = record(
      'bed',
      { ...photo, body: '#202020', base: '#5c5c5c' },
      { pillows: 2, metal: 1, rails: 1, bodyFrac: 0.5 }
    );
    for (const c of ['#202020', '#067979', '#E6DDCB'])
      expect((await inScene(plain, [1.4, 2.05, 1.05], look, c)).spring, c).toBeNull();
  });

  it('lies on a deck that rests on the side rails, with no gap under it', async () => {
    for (const size of [
      [1.0, 2.0, 0.95],
      [1.6, 2.1, 1.2],
      [0.5, 1.0, 0.6],
    ]) {
      const design = record('bed', photo, { pillows: 1, metal: 1, bodyFrac: 0.5 });
      const r = await inScene(design, size, look);
      expect(r.spring.min.y).toBeCloseTo(r.deck.max.y, 4);
      expect(r.spring.max.y).toBeCloseTo(r.mattress.min.y, 4);
      // the deck reaches over the rails and down into them
      expect(r.rails.max.y).toBeGreaterThan(r.deck.min.y);
      expect(r.deck.max.x).toBeGreaterThan(r.rails.max.x - 0.025);
    }
  });
});

describe('5. wardrobe door handles stay on their doors', () => {
  it('keeps every bar whole on its door, clear of both ends, for any drawers and heights', () => {
    for (const handle of [undefined, 'bar', 'knob', 'ring'])
      for (const drawers of [0, 1, 2, 3, 4])
        for (const dside of drawers ? ['full', 'left', 'right'] : [undefined])
          for (const upper of [0, 1])
            for (let h = 0.6; h <= 3.6; h += 0.05) {
              const traits = { doors: 2 };
              if (drawers) Object.assign(traits, { drawers, dside });
              if (handle) traits.handle = handle;
              if (upper) traits.upper = 1;
              const L = wardrobeLayout({ widthM: 1.2, heightM: h, traits });
              for (const c of L.cols) {
                const style = handle || 'bar';
                const g = placeDoorHandle({ bottom: c.bottom, top: c.top, style, length: 0.6 });
                const half = g.length / 2;
                const at = `${style} drawers=${drawers}/${dside} upper=${upper} h=${h.toFixed(2)}`;
                expect(g.length, at).toBeLessThanOrEqual(PULL_MAX);
                expect(g.y - half, at).toBeGreaterThanOrEqual(c.bottom + 0.004);
                expect(g.y + half, at).toBeLessThanOrEqual(c.top - 0.004);
                // knobs and rings keep their 12 cm inset whenever the door allows it
                if (style !== 'bar' && c.top - c.bottom >= 0.24) {
                  expect(g.y, at).toBeGreaterThanOrEqual(c.bottom + 0.12 - 1e-9);
                  expect(g.y, at).toBeLessThanOrEqual(c.top - 0.12 + 1e-9);
                }
              }
            }
  });

  it('draws no door handle over the drawers under a door', async () => {
    for (const [traits, h] of [
      [{ doors: 2, drawers: 4, dside: 'full', handle: 'bar' }, 2.0],
      [{ doors: 2, drawers: 4, dside: 'full', handle: 'bar' }, 2.2],
      [{ doors: 2, drawers: 4, dside: 'full', handle: 'bar' }, 2.4],
      [{ doors: 2, drawers: 4, dside: 'full' }, 2.1],
      [{ doors: 2, drawers: 4, dside: 'left', handle: 'bar' }, 2.2],
      [{ doors: 3, drawers: 4, dside: 'right', handle: 'bar', upper: 1 }, 2.0],
      [{ doors: 1, drawers: 3, dside: 'full', handle: 'ring' }, 1.8],
    ]) {
      const design = record('wardrobe', { body: '#f1f0ed', trim: '#333333' }, traits);
      const at = `${JSON.stringify(traits)} h=${h}`;
      await inScene(design, [0.6 * traits.doors, 0.6, h], (scene) => {
        const doors = named(scene, 'door');
        expect(doors.length).toBe(traits.doors);
        for (const door of doors) {
          let slab = null;
          door.traverse((o) => {
            if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.depth > 0.01)
              slab = slab || bbox(o);
          });
          const handle = bbox(named(door, 'handle')[0]);
          expect(handle.min.y, at).toBeGreaterThanOrEqual(slab.min.y + 0.002);
          expect(handle.max.y, at).toBeLessThanOrEqual(slab.max.y - 0.002);
        }
      });
    }
  });
});

describe('6. mirror sheen stays on the glass', () => {
  it('cuts the sheen streaks to the glass outline for any size', () => {
    for (const oval of [false, true])
      for (const w of [0.16, 0.3, 0.5, 0.9, 1.4])
        for (const h of [0.31, 0.8, 1.6, 2.2]) {
          const outline = glassOutline(w, h, oval);
          for (const poly of sheenPolygons(outline, w, h))
            for (const [x, y] of poly) {
              if (oval)
                expect(((2 * x) / w) ** 2 + ((2 * y) / h) ** 2).toBeLessThanOrEqual(1 + 1e-9);
              else {
                expect(Math.abs(x)).toBeLessThanOrEqual(w / 2 + 1e-9);
                expect(Math.abs(y)).toBeLessThanOrEqual(h / 2 + 1e-9);
              }
            }
        }
  });

  it('keeps every sheen inside its glass and the wardrobe inside its footprint', async () => {
    for (const [traits, size] of [
      [{ doors: 1, mirror: 1 }, [0.6, 0.55, 1.9]],
      [{ doors: 1, mirror: 1 }, [0.9, 0.6, 2.0]],
      [{ doors: 2, mirror: 1 }, [1.0, 0.6, 2.0]],
      [{ doors: 2, mirror: 1 }, [1.2, 0.55, 2.0]],
      [{ doors: 3, mirror: 1 }, [1.4, 0.55, 1.9]],
      [{ doors: 4, mirror: 1 }, [2.0, 0.6, 2.1]],
      [{ doors: 1, mirror: 2 }, [0.6, 0.55, 1.9]],
      [{ doors: 2, mirror: 2, drawers: 3, dside: 'right' }, [1.0, 0.55, 1.85]],
      [{ doors: 3, mirror: 2 }, [1.5, 0.6, 2.0]],
      [{ doors: 3, niche: 1, upper: 1 }, [3.0, 0.6, 2.7]],
    ]) {
      const design = record('wardrobe', { body: '#9c8a74', door: '#f2f1ee' }, traits);
      const at = `${JSON.stringify(traits)} ${size.join('x')}`;
      await inScene(design, size, (scene) => {
        const sheens = named(scene, 'mirror-sheen');
        expect(sheens.length, at).toBeGreaterThan(0);
        for (const sheen of sheens) {
          const glass = sheen.parent.children.find(
            (c) => c !== sheen && c.isMesh && c.material.metalness >= 0.75
          );
          const g = bbox(glass);
          const oval = glass.geometry.type === 'CircleGeometry';
          const cx = (g.min.x + g.max.x) / 2;
          const cy = (g.min.y + g.max.y) / 2;
          const pos = sheen.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const v = sheen.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, i));
            if (oval) {
              const rx = (g.max.x - g.min.x) / 2;
              const ry = (g.max.y - g.min.y) / 2;
              expect(((v.x - cx) / rx) ** 2 + ((v.y - cy) / ry) ** 2, at).toBeLessThanOrEqual(1);
            } else {
              expect(v.x, at).toBeGreaterThanOrEqual(g.min.x - 1e-6);
              expect(v.x, at).toBeLessThanOrEqual(g.max.x + 1e-6);
              expect(v.y, at).toBeGreaterThanOrEqual(g.min.y - 1e-6);
              expect(v.y, at).toBeLessThanOrEqual(g.max.y + 1e-6);
            }
          }
        }
        const all = bbox(scene);
        expect(all.min.x, at).toBeGreaterThanOrEqual(-size[0] / 2 - 1e-6);
        expect(all.max.x, at).toBeLessThanOrEqual(size[0] / 2 + 1e-6);
      });
    }
  });
});

describe('7. a wood or cane frame wins over channels and terraced arms, on the plan as in 3D', () => {
  const pal = { body: '#c9a56a', cushion: '#b89658', leg: '#4b2a17', frame: '#4b2a17' };
  for (const [type, frame, size] of [
    ['sofa', { seats: 3, frame: 1 }, [2.1, 0.95, 0.9]],
    ['sofa', { seats: 3, frame: 2 }, [2.1, 0.95, 1.05]],
    ['sofa', { seats: 3, cane: 1 }, [2.1, 0.95, 0.9]],
    ['sofa', { seats: 2, frame: 1, longSeat: 1 }, [1.7, 0.9, 0.85]],
    ['armchair', { frame: 1 }, [0.85, 0.85, 0.95]],
    ['armchair', { cane: 1 }, [0.85, 0.85, 0.95]],
  ])
    it(`${type} ${JSON.stringify(frame)}`, () => {
      const without = record(type, pal, frame);
      for (const extra of [{ chan: 1 }, { step: 1 }, { chan: 1, step: 1 }]) {
        const withIt = record(type, pal, { ...frame, ...extra });
        expect(markup(withIt, size)).toBe(markup(without, size));
        const p = plan(withIt, size);
        expect(p).toBe(plan(without, size));
        expect(p).not.toContain('name="channel-plan"');
        expect(p).not.toContain('name="arm-tiers"');
      }
    });

  it('still draws channels and terraced arms on the plan without a frame', () => {
    const p = plan(record('sofa', pal, { seats: 3, chan: 1, step: 1 }), [2.1, 0.95]);
    expect(p).toContain('name="channel-plan"');
    expect(p).toContain('name="arm-tiers"');
  });
});

describe('8. round desk legs', () => {
  it('draws round legs in 3D and on the plan when the photos show them', async () => {
    for (const traits of [
      { ped: 'right', drawers: 3 },
      { base: 'legs', modesty: 1 },
      { ped: 'left', drawers: 1 },
    ]) {
      const size = [1.4, 0.7, 0.75];
      const square = record('desk', OFFICE, { ...traits, roundLegs: 0 });
      const round = record('desk', OFFICE, { ...traits, roundLegs: 1 });
      const legs = (scene) => {
        const types = [];
        scene.traverse((o) => {
          if (!o.isMesh || inside(o, 'pedestal')) return;
          const b = bbox(o);
          if (b.min.y < 0.001 && b.max.y > 0.6 && b.max.x - b.min.x < 0.12)
            types.push(o.geometry.type);
        });
        return types;
      };
      const sq = await inScene(square, size, legs);
      const rd = await inScene(round, size, legs);
      expect(sq.length).toBeGreaterThan(0);
      expect(rd).toHaveLength(sq.length);
      expect(new Set(sq)).toEqual(new Set(['BoxGeometry']));
      expect(new Set(rd)).toEqual(new Set(['CylinderGeometry']));
      const ps = plan(square, size);
      const pr = plan(round, size);
      expect(pr).not.toBe(ps);
      expect((pr.match(/<circle/g) || []).length).toBe(
        (ps.match(/<circle/g) || []).length + rd.length
      );
    }
  });
});

describe('9. plan colours follow the same recolour rule as the 3D model', () => {
  it('keeps two-tone wardrobe doors in their photographed colour after a recolour', async () => {
    const design = record('wardrobe', { body: '#f1f0ed', door: '#8a6a4a' }, { doors: 2 });
    const size = [1.2, 0.6, 2.0];
    const recolour = '#223355';
    const eff = effectivePalette(design, recolour);
    expect(eff.door).toBe('#8a6a4a');
    const doorColours = await inScene(
      design,
      size,
      (scene) => {
        const out = new Set();
        for (const door of named(scene, 'door'))
          door.traverse((o) => {
            const slab = o.isMesh && o.geometry.type === 'BoxGeometry' && !inside(o, 'handle');
            if (slab && o.geometry.parameters.depth > 0.015) out.add(colourOf(o.material.color));
          });
        return out;
      },
      recolour
    );
    expect([...doorColours]).toEqual(['#8a6a4a']);
    const p = plan(design, size, recolour);
    expect(p).toContain(`fill="${eff.door}"`);
    expect(p).toContain(`fill="${recolour}"`);
  });

  it('paints a bed base the way the 3D model does after a recolour', () => {
    const design = record(
      'bed',
      { body: '#a27a78', base: '#5a4a48', accent: '#f0eeea', sheet: '#f2f0ec' },
      { pillows: 2 }
    );
    for (const recolour of ['#2b7a78', '#a27a78', '#e6ddcb']) {
      const eff = effectivePalette(design, recolour);
      const p = plan(design, [1.6, 2.1], recolour);
      expect(p).toContain(`fill="${eff.base}"`);
      expect(p).toContain(`fill="${eff.body}"`);
    }
    // a base the same material as the headboard follows the recolour
    const same = record('bed', { body: '#8a7a6a', base: '#8a7a6a' }, { pillows: 2 });
    expect(plan(same, [1.6, 2.1], '#2b7a78')).not.toContain('fill="#8a7a6a"');
  });

  it('gives seats the cushion colour the 3D model uses', () => {
    const design = record('sofa', { body: '#f1f0ed', cushion: '#2b3a55' }, { seats: 3 });
    const p = plan(design, [2.1, 0.9], '#c08a90');
    expect(p).toContain('fill="#2b3a55"');
  });
});

describe('extreme sizes', () => {
  const P = {
    body: '#8a7a6a',
    base: '#5a4a48',
    cushion: '#9a8b7a',
    leg: '#9a9a98',
    accent: '#b8aa98',
    door: '#f2f1ee',
    trim: '#c8a96a',
  };
  const RECORDS = [
    ['sofa', { seats: 5, chan: 1, step: 1, longSeat: 1 }],
    ['sofa', { seats: 3, step: 1, arm: 0.04 }],
    ['armchair', { chan: 1, taper: 1 }],
    ['tub-chair', { plan: 'round', base: 'metal', wrap: 1, tufted: 1 }],
    ['tub-chair', { plan: 'bucket', base: 'metal' }],
    ['bed', { pillows: 4, metal: 1, rails: 1, casters: 1, foot: 1 }],
    ['bed', { pillows: 2, rails: 1, casters: 1, legs: 2, store: 1 }],
    ['wardrobe', { doors: 6, mirror: 1, drawers: 4, dside: 'left', handle: 'ring', fluted: 1 }],
    [
      'wardrobe',
      { doors: 6, niche: 1, upper: 1, drawers: 4, mirror: 2, fluted: 1, handle: 'knob' },
    ],
    ['wardrobe', { doors: 1, mirror: 2, drawers: 4, dside: 'full' }],
    ['desk', { ped: 'both', drawers: 4, base: 'panel', modesty: 1 }],
    ['desk', { ped: 'left', drawers: 1, base: 'sled', modesty: 1 }],
    ['desk', { ped: 'right', drawers: 3, modesty: 1, topH: 8, roundLegs: 1 }],
  ];
  const SIZES = [
    [0.1, 0.1, 0.01],
    [0.1, 0.1, 4],
    [0.3, 0.3, 0.3],
    [0.45, 0.4, 0.6],
    [6, 6, 4],
    [6, 0.1, 0.5],
    [0.1, 6, 2],
  ];

  it('draws every new trait at the smallest and largest sizes without bad numbers', () => {
    for (const [type, traits] of RECORDS) {
      const design = record(type, P, traits);
      for (const s of SIZES) {
        const at = `${type} ${JSON.stringify(traits)} @${s}`;
        expect(markup(design, s), at).not.toMatch(/NaN|Infinity/);
        const p = plan(design, s);
        expect(p, at).not.toMatch(/NaN|Infinity/);
        expect(p, at).not.toMatch(/\s(width|height|r)="-/);
      }
    }
  });

  it('builds finite geometry at tiny and huge sizes', async () => {
    const bad = [];
    for (const [type, traits] of RECORDS)
      for (const s of [
        [0.2, 0.2, 0.05],
        [0.3, 0.3, 0.3],
        [6, 6, 4],
      ]) {
        const design = record(type, P, traits);
        await inScene(design, s, (scene) =>
          scene.traverse((o) => {
            if (!o.isMesh) return;
            const a = o.geometry.attributes.position.array;
            for (let i = 0; i < a.length; i++)
              if (!Number.isFinite(a[i])) {
                bad.push(`${type} ${JSON.stringify(traits)} @${s}`);
                break;
              }
          })
        );
      }
    expect(bad).toEqual([]);
  }, 120000);
});
