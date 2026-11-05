import { describe, it, expect } from 'vitest';
import {
  RUG_PATTERNS,
  CURTAIN_PATTERNS,
  ART_STYLES,
  rugPatternOps,
  curtainPatternOps,
  artOps,
  rugCanvasSize,
  artCanvasSize,
  isPatternId,
  patternOf,
  patternKindOf,
  usesPatternModel,
  mix,
} from './patterns.js';

const COLORS = { main: '#7A1F2B', sub: '#D9B26A', accent: '#1F3552' };

function finite(ops) {
  const nums = [];
  for (const op of ops) {
    for (const [k, v] of Object.entries(op)) {
      if (typeof v === 'number') nums.push(v);
      if (k === 'pts') for (const p of v) nums.push(...p);
    }
  }
  return nums.every(Number.isFinite);
}

describe('rug patterns', () => {
  const size = { width: 512, height: 384 };
  const real = RUG_PATTERNS.filter((x) => x.id !== 'classic');

  it('draws every pattern with finite coordinates', () => {
    for (const p of real) {
      const { ops, width, height } = rugPatternOps(p.id, size, COLORS);
      expect(ops.length, p.id).toBeGreaterThan(3);
      expect(finite(ops), p.id).toBe(true);
      expect(width).toBe(512);
      expect(height).toBe(384);
    }
  });

  it('is deterministic: the same inputs give the same drawing', () => {
    for (const p of real) {
      const a = JSON.stringify(rugPatternOps(p.id, size, COLORS));
      const b = JSON.stringify(rugPatternOps(p.id, size, COLORS));
      expect(a, p.id).toBe(b);
    }
  });

  it('follows the colours and the size', () => {
    const a = JSON.stringify(rugPatternOps('persian', size, COLORS));
    const b = JSON.stringify(rugPatternOps('persian', size, { ...COLORS, main: '#225522' }));
    const c = JSON.stringify(rugPatternOps('persian', { width: 512, height: 256 }, COLORS));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).toContain('#225522');
  });

  it('keeps the shape of the rug in the picture', () => {
    expect(rugCanvasSize(200, 300)).toEqual({ width: 341, height: 512 });
    expect(rugCanvasSize(300, 200)).toEqual({ width: 512, height: 341 });
    expect(rugCanvasSize(150, 150)).toEqual({ width: 512, height: 512 });
    const runner = rugCanvasSize(70, 240);
    expect(runner.height).toBe(512);
    expect(runner.width).toBeLessThan(160);
    expect(rugCanvasSize(0, 0).width).toBeGreaterThan(0);
  });

  it('falls back to a plain weave for an unknown id', () => {
    const { ops } = rugPatternOps('nope', size, COLORS);
    expect(ops[0]).toMatchObject({ k: 'rect', fill: COLORS.main });
  });
});

describe('curtain and art patterns', () => {
  it('draws every curtain fabric as a square tile, deterministically', () => {
    for (const p of CURTAIN_PATTERNS) {
      const a = curtainPatternOps(p.id, COLORS);
      expect(a.width).toBe(256);
      expect(a.height).toBe(256);
      expect(finite(a.ops), p.id).toBe(true);
      expect(JSON.stringify(a)).toBe(JSON.stringify(curtainPatternOps(p.id, COLORS)));
    }
  });

  it('draws every picture style with finite coordinates, deterministically', () => {
    const size = artCanvasSize(80, 55);
    expect(size.width).toBe(384);
    expect(size.height).toBe(Math.round(384 / (80 / 55)));
    for (const style of ART_STYLES) {
      const a = artOps(style, size, { a: '#C97B4A', b: '#3D5A6C' });
      expect(a.ops.length, style).toBeGreaterThan(4);
      expect(finite(a.ops), style).toBe(true);
      expect(JSON.stringify(a)).toBe(
        JSON.stringify(artOps(style, size, { a: '#C97B4A', b: '#3D5A6C' }))
      );
    }
  });
});

describe('pattern ids', () => {
  it('knows the ids of each family', () => {
    expect(isPatternId('rug', 'kilim')).toBe(true);
    expect(isPatternId('rug', 'stripes')).toBe(true);
    expect(isPatternId('curtain', 'kilim')).toBe(false);
    expect(isPatternId('curtain', 'check')).toBe(true);
    expect(isPatternId('sofa', 'plain')).toBe(false);
  });

  it('tells which pieces can be patterned', () => {
    expect(patternKindOf({ shapeType: 'rug' })).toBe('rug');
    expect(patternKindOf({ shapeType: 'rug-round' })).toBe('rug');
    expect(patternKindOf({ shapeType: 'curtain' })).toBe('curtain');
    expect(patternKindOf({ shapeType: 'sofa' })).toBeNull();
    expect(patternOf({ shapeType: 'rug', pattern: 'persian' })).toBe('persian');
    expect(patternOf({ shapeType: 'rug', pattern: 'lava' })).toBeNull();
    expect(patternOf({ shapeType: 'rug' })).toBeNull();
  });

  it('uses the pattern model only for a real pattern, not the original rug', () => {
    expect(usesPatternModel({ shapeType: 'rug' })).toBe(false);
    expect(usesPatternModel({ shapeType: 'rug', pattern: 'classic' })).toBe(false);
    expect(usesPatternModel({ shapeType: 'rug', pattern: 'kilim' })).toBe(true);
  });

  it('mixes colours', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.7)).toBe('#102030');
  });
});
