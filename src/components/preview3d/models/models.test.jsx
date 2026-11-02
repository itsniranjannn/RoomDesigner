import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FURNITURE_CATALOG } from '../../../data/furnitureCatalog.js';
import { SILHOUETTES } from '../../canvas/silhouettes/index.js';
import { MODELS, resolveModel } from './index.js';
import { FallbackBoxModel } from './fallback.jsx';
import { corners, strutTransform } from './shared.jsx';

const SCALES = [0.4, 1, 2.5];

function modelProps(item, scale) {
  return {
    def: item,
    widthM: (item.widthCm * scale) / 100,
    depthM: (item.depthCm * scale) / 100,
    heightM: item.heightCm / 100,
    mainColor: item.color,
    fabricColor: item.fabricColor || '#FAF6EE',
    headboardColor: item.headboardColor || '#5A554E',
    accentColor: item.accentColor || '#C4B8A5',
    cushionColor: item.cushionColor || item.color,
    legColor: item.legColor || '#242321',
    handleColor: item.handleColor || '#C4A869',
    subColor: item.subColor || '#D4A359',
  };
}

describe('catalog shape registries', () => {
  it('has a dedicated 3D model for every catalog item', () => {
    const missing = FURNITURE_CATALOG.filter((item) => !MODELS[item.shapeType]).map((item) => `${item.id}:${item.shapeType}`);
    expect(missing).toEqual([]);
  });

  it('has a 2D plan symbol for every catalog item', () => {
    const missing = FURNITURE_CATALOG.filter((item) => !SILHOUETTES[item.shapeType]).map((item) => `${item.id}:${item.shapeType}`);
    expect(missing).toEqual([]);
  });

  it('registers the same shape types in 2D and 3D', () => {
    expect(Object.keys(MODELS).sort()).toEqual(Object.keys(SILHOUETTES).sort());
  });

  it('falls back to a plain box for unknown shapes', () => {
    expect(resolveModel('does-not-exist')).toBe(FallbackBoxModel);
  });
});

describe('3D model markup', () => {
  // The DOM renderer warns about three.js element names; only the generated props matter here.
  let spy;
  beforeAll(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  for (const item of FURNITURE_CATALOG) {
    it(`${item.id} builds finite geometry at 0.4x, 1x and 2.5x width and depth`, () => {
      const Model = resolveModel(item.shapeType);
      for (const scale of SCALES) {
        const html = renderToStaticMarkup(<Model {...modelProps(item, scale)} />);
        expect(html.length).toBeGreaterThan(20);
        expect(html).not.toMatch(/NaN|Infinity|undefined/);
      }
    });
  }
});

describe('model helpers', () => {
  it('corners returns the four inset footprint corners', () => {
    expect(corners(1, 0.5, 0.1)).toEqual([[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]]);
  });

  it('strutTransform centres a rod between two points and measures its length', () => {
    const t = strutTransform([0, 0, 0], [0, 2, 0]);
    expect(t.position).toEqual([0, 1, 0]);
    expect(t.length).toBeCloseTo(2);
    expect(t.quaternion.w).toBeCloseTo(1);
  });

  it('strutTransform tilts the rod towards the end point', () => {
    const t = strutTransform([0, 0, 0], [1, 0, 0]);
    expect(t.length).toBeCloseTo(1);
    expect(t.position).toEqual([0.5, 0, 0]);
    expect(Math.abs(t.quaternion.z)).toBeGreaterThan(0.5);
  });
});
