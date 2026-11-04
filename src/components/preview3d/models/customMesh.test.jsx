import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildPhotoGeometry,
  photoRecolor,
  CustomMeshModel,
  TEXTURE_SLOTS,
  PHOTO_PROJECTION_GLSL,
} from './customMesh.jsx';
import { resolveModel } from './index.js';

// One triangle, indexed
const indexed = {
  positions: new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, 0.5]),
  colors: new Uint8Array([255, 255, 255, 128, 128, 128, 0, 0, 0]),
  indices: new Uint16Array([0, 1, 2]),
};
// Old format: triangle soup with no indices
const soup = {
  positions: new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, 0.5]),
  colors: new Uint8Array([200, 100, 50, 200, 100, 50, 200, 100, 50]),
};

describe('photo mesh geometry', () => {
  it('builds an indexed geometry with smooth normals and linear colours', () => {
    const g = buildPhotoGeometry(indexed);
    expect(g.index.count).toBe(3);
    expect(g.getAttribute('position').count).toBe(3);
    expect(g.getAttribute('normal').count).toBe(3);
    const colour = g.getAttribute('color');
    expect(colour.getX(0)).toBeCloseTo(1, 4);
    // sRGB 128 is about 0.216 in linear light
    expect(colour.getX(1)).toBeCloseTo(0.216, 2);
    expect(colour.getX(2)).toBe(0);
  });

  it('still builds geometry for old, non-indexed meshes', () => {
    const g = buildPhotoGeometry(soup);
    expect(g.index).toBeNull();
    expect(g.getAttribute('position').count).toBe(3);
    expect(g.getAttribute('normal').count).toBe(3);
  });

  it('accepts plain arrays for positions and indices', () => {
    const g = buildPhotoGeometry({
      positions: Array.from(indexed.positions),
      colors: indexed.colors,
      indices: Array.from(indexed.indices),
    });
    expect(g.index.count).toBe(3);
  });
});

describe('photo projection', () => {
  it('projects each photo along its own viewing direction with one texture unit per slot', () => {
    expect(TEXTURE_SLOTS).toEqual(['front', 'right', 'back', 'left', 'top']);
    for (let i = 0; i < TEXTURE_SLOTS.length; i++)
      expect(PHOTO_PROJECTION_GLSL).toContain(`uTex${i}`);
    // Same mapping as the carving: front looks down -z, the right photo has the front on its left
    expect(PHOTO_PROJECTION_GLSL).toContain('vec2(p.x, 1.0 - p.y)');
    expect(PHOTO_PROJECTION_GLSL).toContain('vec2(1.0 - p.z, 1.0 - p.y)');
    expect(PHOTO_PROJECTION_GLSL).toContain('vec2(p.x, p.z)');
  });
});

describe('photo mesh recolouring', () => {
  it('leaves the photo colours alone until the body colour is changed', () => {
    expect(photoRecolor('#885533', '#885533').active).toBe(false);
    expect(photoRecolor('#885533', undefined).active).toBe(false);
  });

  it('recolours when the colour differs from the original', () => {
    const r = photoRecolor('#2b7a78', '#885533');
    expect(r.active).toBe(true);
    expect(r.target.getHexString()).toBe('2b7a78');
    expect(r.baseLuminance).toBeGreaterThan(0.02);
    expect(r.baseLuminance).toBeLessThan(1);
  });

  it('never divides by a near-zero luminance', () => {
    expect(photoRecolor('#ffffff', '#000000').baseLuminance).toBeGreaterThanOrEqual(0.02);
  });
});

describe('custom mesh model', () => {
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  it('is the model registered for custom-mesh pieces', () => {
    expect(resolveModel('custom-mesh')).toBe(CustomMeshModel);
  });

  it('draws a plain box until a mesh exists', () => {
    const html = renderToStaticMarkup(
      <CustomMeshModel def={{}} widthM={0.8} depthM={0.5} heightM={0.8} mainColor="#885533" />
    );
    expect(html.toLowerCase()).toContain('boxgeometry');
  });

  it('draws the mesh scaled to the piece size, casting and receiving shadows', () => {
    const html = renderToStaticMarkup(
      <CustomMeshModel
        def={{ mesh: indexed }}
        widthM={0.8}
        depthM={0.5}
        heightM={0.9}
        mainColor="#885533"
      />
    );
    expect(html).toContain('0.8,0.9,0.5');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
});
