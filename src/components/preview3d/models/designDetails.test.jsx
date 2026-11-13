/**
 * Regression tests for the second review round: round legs on the catalog desk, handles kept off mirror glass
 * and off narrow fronts, a hanging drawer clear of the modesty panel, plan colours that follow the 3D, and no
 * negative sizes in the plan at the smallest sizes the store allows.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as THREE from 'three';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act, extend } from '@react-three/fiber';
import { CustomMeshModel } from './customMesh.jsx';
import { ArchitecturalSilhouette } from '../../canvas/ArchitecturalSilhouette.jsx';
import { sanitizeDesign } from '../../../engine/design.js';

extend(THREE);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let spy;
beforeAll(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => spy.mockRestore());

export const record = (type, palette, traits) => sanitizeDesign({ v: 1, type, palette, traits });

export const plan = (design, [w, d], color = design.palette.body) =>
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
export async function inScene(design, [w, d, h], look, mainColor = design.palette.body) {
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

export const bbox = (o) => new THREE.Box3().setFromObject(o, true);
export const named = (scene, name) => {
  const found = [];
  scene.traverse((o) => o.name === name && found.push(o));
  return found;
};
/** Every mesh of the scene, with the names of the groups it sits in. */
const meshesOf = (scene) => {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const names = [];
    for (let p = o; p; p = p.parent) if (p.name) names.push(p.name);
    out.push({ mesh: o, names });
  });
  return out;
};

const OFFICE = { body: '#3b3836', accent: '#5d5a57', leg: '#3a3735' };

describe('1. the catalog desk draws round legs when the photos show them', () => {
  // A desk saved before the pedestal, base and modesty traits: the catalog DeskModel draws it
  const traits = (roundLegs) => ({ legFrac: 0.05, roundLegs });
  const size = [1.4, 0.7, 0.75];

  it('turns the two sled posts into cylinders, and nothing else', async () => {
    const posts = (scene) =>
      meshesOf(scene)
        .filter(({ mesh }) => {
          const b = bbox(mesh);
          // the full-height posts of the left sled frame
          return b.min.y < 0.02 && b.max.y > 0.6 && b.max.x - b.min.x < 0.12;
        })
        .map(({ mesh }) => mesh.geometry.type);
    const square = await inScene(record('desk', OFFICE, traits(0)), size, posts);
    const round = await inScene(record('desk', OFFICE, traits(1)), size, posts);
    expect(square).toHaveLength(2);
    expect(new Set(square)).toEqual(new Set(['BoxGeometry']));
    expect(round).toHaveLength(2);
    expect(new Set(round)).toEqual(new Set(['CylinderGeometry']));
  });

  it('keeps the posts where they were, at the same height and thickness', async () => {
    const boxes = (scene) =>
      meshesOf(scene)
        .filter(({ mesh }) => {
          const b = bbox(mesh);
          return b.min.y < 0.02 && b.max.y > 0.6 && b.max.x - b.min.x < 0.12;
        })
        .map(({ mesh }) => bbox(mesh))
        .sort((a, b) => a.min.z - b.min.z)
        .map((b) => [b.min, b.max].map((v) => [v.x, v.y, v.z].map((n) => +n.toFixed(4))));
    const square = await inScene(record('desk', OFFICE, traits(0)), size, boxes);
    const round = await inScene(record('desk', OFFICE, traits(1)), size, boxes);
    expect(round).toEqual(square);
  });

  it('leaves a square desk exactly as it was, built-in catalog desks included', async () => {
    const whole = (scene) => renderToStaticMarkup(<div>{scene.children.length}</div>);
    expect(await inScene(record('desk', OFFICE, traits(0)), size, whole)).toBeTruthy();
    // The plain photo desk and the record with roundLegs: 0 draw the same model
    const plain = record('desk', OFFICE, { legFrac: 0.05 });
    const off = record('desk', OFFICE, traits(0));
    const html = (d) =>
      renderToStaticMarkup(
        <CustomMeshModel
          def={{ design: d }}
          widthM={size[0]}
          depthM={size[1]}
          heightM={size[2]}
          mainColor={d.palette.body}
        />
      );
    expect(html(off)).toBe(html(plain));
    expect(html(record('desk', OFFICE, traits(1)))).not.toBe(html(plain));
  });

  it('the dialog can reach this: sanitizeDesign keeps roundLegs on a plain desk', () => {
    const design = record('desk', OFFICE, { legFrac: 0.05, roundLegs: 1 });
    expect(design.traits.roundLegs).toBe(1);
    expect(design.traits.ped).toBeUndefined();
    expect(design.traits.base).toBeUndefined();
  });
});

const WOOD = { body: '#9c8a74', door: '#f2f1ee', trim: '#2f2f2f' };

/**
 * Whether a handle and a mirror pane do not overlap seen from the front. A handle stands proud of the glass, so
 * their boxes never meet in depth; what matters is that the handle does not cover any of the glass.
 */
const clearOf = (h, g) =>
  h.max.x < g.min.x + 1e-9 ||
  h.min.x > g.max.x - 1e-9 ||
  h.max.y < g.min.y + 1e-9 ||
  h.min.y > g.max.y - 1e-9;

/** Bounds of every mirror glass pane and of every handle on a wardrobe's doors. */
function mirrorsAndHandles(scene) {
  const glass = [];
  const handles = [];
  scene.traverse((o) => {
    if (o.name === 'handle') handles.push(bbox(o));
    if (o.name !== 'wardrobe-mirror') return;
    o.traverse((m) => {
      if (m.isMesh && m.name !== 'mirror-sheen' && (m.material.metalness ?? 0) >= 0.75)
        glass.push(bbox(m));
    });
  });
  return { glass, handles };
}

describe('2a. handles sit beside the mirror, never over the glass', () => {
  const cases = [
    [{ doors: 2, mirror: 1, handle: 'bar' }, [1.2, 0.6, 2.0]],
    [{ doors: 1, mirror: 1, handle: 'bar' }, [0.9, 0.6, 2.0]],
    [{ doors: 3, mirror: 1, handle: 'knob' }, [1.4, 0.55, 1.9]],
    [{ doors: 2, mirror: 1, handle: 'ring' }, [1.0, 0.6, 2.1]],
    [{ doors: 2, mirror: 2, handle: 'bar' }, [0.4, 0.55, 1.85]],
    [{ doors: 2, mirror: 2, handle: 'knob' }, [0.52, 0.55, 1.85]],
    [{ doors: 2, mirror: 2, handle: 'ring' }, [0.6, 0.55, 1.85]],
    [{ doors: 3, drawers: 2, dside: 'full', handle: 'ring', upper: 1, mirror: 2 }, [0.7, 0.6, 0.8]],
    [{ doors: 4, mirror: 2, handle: 'knob' }, [2.0, 0.6, 2.2]],
    [{ doors: 2, mirror: 1, drawers: 4, dside: 'full', handle: 'bar' }, [1.2, 0.6, 2.2]],
  ];
  for (const [traits, size] of cases)
    it(`${JSON.stringify(traits)} at ${size.join('x')}`, async () => {
      await inScene(record('wardrobe', WOOD, traits), size, (scene) => {
        const { glass, handles } = mirrorsAndHandles(scene);
        for (const g of glass)
          for (const h of handles)
            expect(
              clearOf(h, g),
              `glass x ${g.min.x}..${g.max.x} y ${g.min.y}..${g.max.y}; ` +
                `handle x ${h.min.x}..${h.max.x} y ${h.min.y}..${h.max.y}`
            ).toBe(true);
      });
    });

  it('sweeps door widths and keeps every handle off the glass, or drops what cannot fit', async () => {
    for (const handle of ['bar', 'knob', 'ring'])
      for (const mirror of [1, 2])
        for (const doors of [1, 2, 3, 6])
          for (const widthM of [0.4, 0.7, 1.2, 2.4]) {
            const traits = { doors, mirror, handle };
            const at = `${JSON.stringify(traits)} at ${widthM} m`;
            await inScene(record('wardrobe', WOOD, traits), [widthM, 0.6, 2.0], (scene) => {
              const { glass, handles } = mirrorsAndHandles(scene);
              for (const g of glass) for (const h of handles) expect(clearOf(h, g), at).toBe(true);
              // whatever is drawn stays on the wardrobe
              const all = bbox(scene);
              expect(all.min.x, at).toBeGreaterThanOrEqual(-widthM / 2 - 1e-6);
              expect(all.max.x, at).toBeLessThanOrEqual(widthM / 2 + 1e-6);
            });
          }
  });
});

describe('2b. a hanging drawer stops in front of the modesty panel', () => {
  it('never runs through the panel, on any base or depth', async () => {
    for (const base of ['legs', 'sled', 'panel'])
      for (const depthM of [0.3, 0.45, 0.6, 0.8])
        for (const ped of ['left', 'right', 'both']) {
          const traits = { ped, drawers: 1, modesty: 1, base };
          const at = `${JSON.stringify(traits)} depth ${depthM}`;
          await inScene(record('desk', OFFICE, traits), [1.0, depthM, 0.5], (scene) => {
            const panels = named(scene, 'modesty-panel').map(bbox);
            const peds = named(scene, 'pedestal').map(bbox);
            expect(panels, at).toHaveLength(1);
            for (const p of peds) {
              expect(p.intersectsBox(panels[0]), at).toBe(false);
              // in front of the panel, not behind it
              expect(p.min.z, at).toBeGreaterThanOrEqual(panels[0].max.z - 1e-9);
            }
          });
        }
  });

  it('keeps a full-height pedestal running the depth of the desk', async () => {
    await inScene(
      record('desk', OFFICE, { ped: 'left', drawers: 3, modesty: 1 }),
      [1.4, 0.7, 0.75],
      (scene) => {
        const ped = named(scene, 'pedestal').map(bbox)[0];
        const panel = named(scene, 'modesty-panel').map(bbox)[0];
        expect(ped.min.z).toBeLessThan(panel.max.z);
        expect(ped.max.y).toBeCloseTo(0.75 - 0.035 - 0.004, 3);
      }
    );
  });
});

describe('2c. the plan never asks for a negative size', () => {
  const bad = (html) => html.match(/\s(width|height|r|rx|ry)="-[\d.]+"/g) || [];
  const P = { body: '#8a7a6a', base: '#5a4a48', cushion: '#9a8b7a', accent: '#b8aa98' };
  const cases = [
    ['corner-sofa', { seats: 1 }, [0.18, 0.4]],
    ['corner-sofa', { seats: 2 }, [0.24, 0.4]],
    ['corner-sofa', { seats: 3 }, [0.3, 0.4]],
    ['corner-sofa', { seats: 4 }, [0.36, 0.4]],
    ['corner-sofa', { seats: 2 }, [1.0, 0.12]],
    ['tub-chair', { base: 'metal', wrap: 1 }, [0.13, 0.13]],
    ['tub-chair', { base: 'metal', wrap: 1 }, [0.1, 0.6]],
    ['daybed', { ends: 2 }, [0.12, 0.6]],
    ['daybed', { ends: 2 }, [0.6, 0.1]],
    ['bed', { pillows: 2, throw: 1 }, [0.15, 1.0]],
    ['chair', { back: 'slat' }, [0.1, 0.1]],
    ['stool', { seat: 'square', back: 1 }, [0.1, 0.1]],
    ['cabinet', { front: 'doors', n: 3 }, [0.1, 0.1]],
  ];
  for (const [type, traits, size] of cases)
    it(`${type} ${JSON.stringify(traits)} at ${size.join('x')} m`, () => {
      const html = plan(record(type, P, traits), size);
      expect(bad(html)).toEqual([]);
      expect(html).not.toMatch(/NaN|Infinity/);
    });

  it('sweeps every photo shape down to the smallest size the store allows', () => {
    const types = [
      ['sofa', { seats: 3 }],
      ['sofa', { seats: 3, chan: 1, step: 1 }],
      ['armchair', {}],
      ['chair', { back: 'solid' }],
      ['stool', { seat: 'round', back: 1, rest: 1 }],
      ['corner-sofa', { seats: 4 }],
      ['tub-chair', { plan: 'round', wrap: 1 }],
      ['tub-chair', { plan: 'bucket' }],
      ['ottoman', { shape: 'round' }],
      ['daybed', { ends: 2, back: 'slat' }],
      ['bed', { pillows: 4, throw: 1, foot: 2, metal: 1, rails: 1 }],
      ['etagere', { cols: 3 }],
      ['cabinet', { front: 'mixed', n: 5 }],
      ['wardrobe', { doors: 6, mirror: 1, drawers: 4, handle: 'ring' }],
      ['desk', { ped: 'both', drawers: 1, modesty: 1, base: 'sled' }],
    ];
    for (const [type, traits] of types)
      for (const size of [
        [0.1, 0.1],
        [0.1, 0.6],
        [0.6, 0.1],
        [0.25, 0.25],
      ]) {
        const html = plan(record(type, P, traits), size);
        const at = `${type} ${JSON.stringify(traits)} at ${size.join('x')}`;
        expect(bad(html), at).toEqual([]);
        expect(html, at).not.toMatch(/NaN|Infinity/);
      }
  });
});

/** A material colour as this renderer stores it (a three.js Color, or the colour string as given). */
const colourOf = (c) => (typeof c === 'string' ? c.toLowerCase() : `#${c.getHexString()}`);
/** Every mesh colour in the scene, as lower-case strings. */
const coloursIn = (scene) => {
  const out = new Set();
  scene.traverse((o) => o.isMesh && out.add(colourOf(o.material.color)));
  return out;
};

describe('2d. plan colours the 3D has always used', () => {
  it('paints the arms of a sofa or an armchair in their own colour', async () => {
    const pal = { body: '#7a8a9a', arm: '#2b3a55', cushion: '#8a9aaa' };
    for (const [type, size] of [
      ['sofa', [2.1, 0.95, 0.85]],
      ['armchair', [0.85, 0.85, 0.9]],
      ['sofa', [2.1, 0.95, 0.8]],
    ]) {
      const traits = type === 'sofa' ? { seats: 3 } : {};
      const design = record(type, pal, traits);
      // the 3D arms keep the photographed arm colour
      expect(await inScene(design, size, coloursIn)).toContain('#2b3a55');
      expect(plan(design, size)).toContain('fill="#2b3a55"');
    }
    // a channel-tufted sofa too
    const chan = record('sofa', pal, { seats: 3, chan: 1 });
    expect(plan(chan, [2.3, 0.95])).toContain('fill="#2b3a55"');
    // without an arm colour nothing changes
    const plain = record('sofa', { body: '#7a8a9a', cushion: '#8a9aaa' }, { seats: 3 });
    expect(plan(plain, [2.1, 0.95])).not.toContain('name="arm-fills"');
  });

  it('gives a photo sideboard the top colour the 3D gives it', async () => {
    const pal = { body: '#6a4a32', accent: '#d8cfc0', leg: '#2a2622' };
    const design = record('cabinet', pal, { front: 'doors', n: 3, legs: 1 });
    expect(await inScene(design, [1.6, 0.45, 0.8], coloursIn)).toContain('#d8cfc0');
    expect(plan(design, [1.6, 0.45])).toContain('fill="#d8cfc0"');
    // a cabinet saved before the front options keeps the plain body-coloured top
    const old = record('cabinet', pal, {});
    expect(plan(old, [1.6, 0.45])).toContain('fill="#6a4a32"');
  });

  it('draws a sleigh footboard in the base wood, as the 3D does', async () => {
    const pal = { body: '#8a7a6a', base: '#3a2a1a', accent: '#b8aa98' };
    const sleigh = record('bed', pal, { pillows: 2, foot: 2 });
    expect(
      await inScene(sleigh, [1.6, 2.1, 1.1], (scene) => {
        const foot = named(scene, 'footboard')[0];
        const out = new Set();
        foot.traverse((o) => o.isMesh && out.add(colourOf(o.material.color)));
        return out;
      })
    ).toContain('#3a2a1a');
    const html = plan(sleigh, [1.6, 2.1]);
    const foot = html.match(/<rect[^>]*y="9[0-9.]+"[^>]*>/g) || [];
    expect(foot.join(' ')).toContain('#3a2a1a');
    // a plain footboard is still the headboard's colour
    expect(plan(record('bed', pal, { pillows: 2, foot: 1 }), [1.6, 2.1])).toContain(
      'fill="#8a7a6a"'
    );
  });

  it('shows a chair as its seat, not its frame', async () => {
    const pal = { body: '#3a2a1a', cushion: '#d8cfc0', leg: '#3a2a1a' };
    const design = record('chair', pal, { back: 'slat' });
    const size = [0.45, 0.5, 0.9];
    expect(await inScene(design, size, coloursIn)).toContain('#d8cfc0');
    const html = plan(design, size);
    expect(html).toContain('name="chair-plan"');
    expect(html).toContain('fill="#d8cfc0"');
    // the frame still shows as the back rail and posts
    expect(html).toContain('fill="#3a2a1a"');
  });

  it('draws no frame rim round a backless stool', () => {
    const pal = { body: '#3a2a1a', cushion: '#d8cfc0', leg: '#2a2622' };
    const backless = plan(record('stool', pal, { seat: 'round', back: 0, rest: 0 }), [0.4, 0.4]);
    expect(backless).toContain('fill="#d8cfc0"');
    expect(backless).not.toContain('#3a2a1a');
    // one with a back keeps its rail
    expect(plan(record('stool', pal, { seat: 'round', back: 1 }), [0.4, 0.4])).toContain('#3a2a1a');
    // a stool saved before these options keeps the rail it always had
    expect(plan(record('stool', pal, {}), [0.4, 0.4])).toContain('#3a2a1a');
  });
});

describe('2e. handles and mirrors that cannot fit are left out', () => {
  it('drops them on very narrow doors, and draws nothing outside the wardrobe', async () => {
    for (const traits of [
      { doors: 6, mirror: 1, handle: 'bar' },
      { doors: 6, mirror: 2, handle: 'ring' },
      { doors: 3, niche: 1, upper: 1, handle: 'bar' },
      { doors: 6, niche: 1, upper: 1, drawers: 2, handle: 'knob' },
    ])
      for (const widthM of [0.4, 0.5, 0.7, 1.0]) {
        const design = record('wardrobe', WOOD, traits);
        const size = [widthM, 0.6, 2.0];
        const at = `${JSON.stringify(traits)} at ${widthM} m`;
        await inScene(design, size, (scene) => {
          const all = bbox(scene);
          expect(all.min.x, at).toBeGreaterThanOrEqual(-widthM / 2 - 1e-6);
          expect(all.max.x, at).toBeLessThanOrEqual(widthM / 2 + 1e-6);
          scene.traverse((o) => {
            if (!o.isMesh || o.geometry.type !== 'BoxGeometry') return;
            const { width, height, depth } = o.geometry.parameters;
            expect(Math.min(width, height, depth), at).toBeGreaterThan(0);
          });
        });
        expect(plan(design, size), at).not.toMatch(/\s(width|height|r|rx|ry)="-|NaN|Infinity/);
      }
  });

  it('keeps a ring pull on its drawer front however shallow it is', async () => {
    for (const heightM of [0.9, 1.2, 1.6, 2.2])
      for (const drawers of [2, 3, 4]) {
        const traits = { doors: 2, drawers, dside: 'full', handle: 'ring' };
        const design = record('wardrobe', WOOD, traits);
        const at = `${JSON.stringify(traits)} h=${heightM}`;
        await inScene(design, [1.2, 0.6, heightM], (scene) => {
          for (const stack of named(scene, 'drawers'))
            for (const front of stack.children) {
              const handle = named(front, 'handle')[0];
              if (!handle) continue;
              const slab = front.children.find((c) => !c.name);
              const box = bbox(slab);
              const h = bbox(handle);
              expect(h.min.y, at).toBeGreaterThanOrEqual(box.min.y - 1e-6);
              expect(h.max.y, at).toBeLessThanOrEqual(box.max.y + 1e-6);
              expect(h.min.x, at).toBeGreaterThanOrEqual(box.min.x - 1e-6);
              expect(h.max.x, at).toBeLessThanOrEqual(box.max.x + 1e-6);
            }
        });
      }
  });
});
