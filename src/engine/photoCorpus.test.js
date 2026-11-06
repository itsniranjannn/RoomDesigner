import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { corpusSpecs, ALL_TYPES } from '../../scripts/photo-harness/synth/corpus.js';
import { runParallel } from '../../scripts/photo-harness/synth/evaluate.js';
import { CustomMeshModel } from '../components/preview3d/models/customMesh.jsx';
import { ArchitecturalSilhouette } from '../components/canvas/ArchitecturalSilhouette.jsx';
import { sanitizeDesign, DESIGN_TYPES } from './design.js';

/**
 * Generalization guard. The procedural corpus (scripts/photo-harness/synth) draws every supported type in many
 * styles and colours as studio photos, multi-view sheets and busy room photos, with colour casts, vignettes,
 * shadows, JPEG blocks, tilt, mirroring, crops and low resolution. Every picture goes through the steps the
 * Create from photos dialog runs. The thresholds are set a little under what the engine reaches today, so a
 * change that makes the engine worse on pieces it was never tuned for fails here. `node
 * scripts/photo-harness/synth/robustness.js` prints the full tables (confusion matrix, per-type and per-view accuracy).
 */

const specs = corpusSpecs({ single: 3, sheet: 1, lifestyle: 1 });
let rows = [];

beforeAll(async () => {
  rows = await runParallel(specs);
}, 240000);

const rate = (list, pick = (r) => r.sc.ok) =>
  list.length ? list.filter(pick).length / list.length : 1;
const kind = (k) => rows.filter((r) => r.sc.kind === k);

describe('the generalization corpus', () => {
  it('covers every supported type in every kind of picture', () => {
    expect(rows.length).toBe(specs.length);
    expect(rows.length).toBeGreaterThanOrEqual(90);
    for (const type of ALL_TYPES) {
      for (const k of ['single', 'sheet', 'lifestyle'])
        expect(
          rows.some((r) => r.sc.type === type && r.sc.kind === k),
          `${k} ${type}`
        ).toBe(true);
    }
    expect(new Set(DESIGN_TYPES.map((t) => t.id))).toEqual(new Set(ALL_TYPES));
  });

  it('never throws, and always builds a short record that survives JSON and sharing', () => {
    const errors = rows.filter((r) => r.sc.error);
    // a picture with nothing to find may say so, but only a few of the hard ones
    expect(errors.length / rows.length).toBeLessThanOrEqual(0.04);
    for (const { run } of rows.filter((r) => r.run.design)) {
      expect(run.recordLen, run.spec.id).toBeLessThan(300);
      expect(run.roundTrip, run.spec.id).toBe(true);
    }
  });

  it('does not split one photo as if it were two stacked ones', () => {
    const checked = rows.filter((r) => r.run.falseSplit != null);
    expect(checked.length).toBeGreaterThan(50);
    expect(checked.filter((r) => r.run.falseSplit).length / checked.length).toBeLessThanOrEqual(
      0.05
    );
  });

  it('finds the views of a product sheet and builds the right type from them', () => {
    const sheets = kind('sheet').filter((r) => r.run.views != null);
    expect(rate(sheets, (r) => r.run.views === r.run.expectedViews)).toBeGreaterThanOrEqual(0.8);
    expect(rate(kind('sheet'))).toBeGreaterThanOrEqual(0.35);
    expect(rate(kind('sheet'), (r) => r.sc.top3)).toBeGreaterThanOrEqual(0.5);
  });

  it('reads one studio photo, and offers the right type among the "Looks like" choices', () => {
    const single = kind('single');
    // straight-on and three-quarter pictures are what people take; side and plan views alone are ambiguous
    const usual = single.filter((r) => ['front', 'front2', 'three', 'three2'].includes(r.run.view));
    expect(rate(usual)).toBeGreaterThanOrEqual(0.3);
    expect(rate(usual, (r) => r.sc.top3)).toBeGreaterThanOrEqual(0.5);
    expect(rate(single, (r) => r.sc.top3)).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps most colours: the main colour of the piece is found under casts and shadows', () => {
    const coloured = rows.filter((r) => r.sc.colour != null);
    expect(rate(coloured, (r) => r.sc.colour)).toBeGreaterThanOrEqual(0.5);
  });

  it('flags a guess as a guess: the right type is in the choices more often than it is the first answer', () => {
    expect(rate(rows, (r) => r.sc.top3)).toBeGreaterThan(rate(rows));
  });

  it('reads most of the nineteen types right at least once, and room photos at least sometimes', () => {
    const solved = new Set(rows.filter((r) => r.sc.ok).map((r) => r.sc.type));
    expect(solved.size).toBeGreaterThanOrEqual(13);
    // a busy room is the hardest case: the right type is at least among the choices for a fifth of them
    expect(rate(kind('lifestyle'), (r) => r.sc.top3)).toBeGreaterThanOrEqual(0.2);
  });
});

describe('every design the corpus produces builds a 3D model and a plan symbol', () => {
  it('renders without throwing or producing bad numbers', () => {
    const designs = rows.filter((r) => r.run.design).map((r) => sanitizeDesign(r.run.design));
    expect(designs.length).toBeGreaterThanOrEqual(80);
    for (const design of designs) {
      const [w, d, h] = { bed: [1.6, 2, 1], corner: [2.6, 1.6, 0.85] }.bed;
      const html = renderToStaticMarkup(
        React.createElement(CustomMeshModel, {
          def: { design },
          widthM: w,
          depthM: d,
          heightM: h,
          mainColor: design.palette.body,
        })
      );
      expect(html, design.type).not.toMatch(/NaN|Infinity/);
      const plan = renderToStaticMarkup(
        React.createElement(
          'svg',
          null,
          React.createElement(ArchitecturalSilhouette, {
            item: { shapeType: 'custom-mesh', color: design.palette.body, design },
            widthCm: 160,
            depthCm: 90,
          })
        )
      );
      expect(plan, design.type).not.toMatch(/NaN|Infinity/);
    }
  });
});
