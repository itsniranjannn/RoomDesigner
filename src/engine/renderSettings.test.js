import { describe, it, expect } from 'vitest';
import {
  renderSize,
  normalizeRenderPrefs,
  DEFAULT_RENDER_PREFS,
  MAX_RENDER_SIDE,
  MAX_RENDER_PIXELS,
} from './renderSettings.js';

describe('render size', () => {
  it('doubles the screen size for standard', () => {
    expect(renderSize(1000, 600, 'standard')).toMatchObject({ width: 2000, height: 1200 });
  });

  it('triples for large and aims at 4096 px wide for maximum', () => {
    expect(renderSize(1000, 600, 'large')).toMatchObject({ width: 3000, height: 1800 });
    const max = renderSize(1000, 600, 'max');
    expect(max.width).toBe(4096);
    expect(max.height).toBe(Math.round(600 * 4.096));
  });

  it('never goes past the side, pixel or GPU limits', () => {
    for (const [w, h] of [
      [3000, 2000],
      [800, 5000],
      [4000, 4000],
      [1, 1],
    ]) {
      for (const key of ['standard', 'large', 'max']) {
        const s = renderSize(w, h, key);
        expect(Math.max(s.width, s.height)).toBeLessThanOrEqual(MAX_RENDER_SIDE);
        expect(s.width * s.height).toBeLessThanOrEqual(MAX_RENDER_PIXELS * 1.01);
      }
    }
    const small = renderSize(2000, 1000, 'max', 2048);
    expect(Math.max(small.width, small.height)).toBeLessThanOrEqual(2048);
  });

  it('keeps the shape of the view and survives bad input', () => {
    const s = renderSize(900, 450, 'large');
    expect(s.width / s.height).toBeCloseTo(2, 1);
    expect(renderSize(0, NaN, 'unknown').width).toBeGreaterThan(0);
  });
});

describe('render preferences', () => {
  it('falls back to defaults for anything unknown', () => {
    expect(normalizeRenderPrefs(null)).toEqual(DEFAULT_RENDER_PREFS);
    expect(normalizeRenderPrefs({ size: 'huge', background: 'pink', titleBlock: 'yes' })).toEqual(
      DEFAULT_RENDER_PREFS
    );
  });

  it('keeps valid choices', () => {
    expect(
      normalizeRenderPrefs({ size: 'max', background: 'transparent', titleBlock: false })
    ).toEqual({ size: 'max', background: 'transparent', titleBlock: false });
  });
});
