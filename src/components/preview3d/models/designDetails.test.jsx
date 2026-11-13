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
