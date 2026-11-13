import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { effectivePalette, colourDistance, shadeColour, linearHSL } from './designPalette.js';
import { shade } from './shared.jsx';

/** The recolour rule as the 3D models first wrote it with three.js colours: the reference to match. */
function threePalette(design, mainColor) {
  const dist = (a, b) => {
    const x = new THREE.Color(a);
    const y = new THREE.Color(b);
    return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b) * 255;
  };
  const base = design.palette.body;
  const out = { ...design.palette };
  if (!mainColor || mainColor.toLowerCase() === base.toLowerCase()) return out;
  const hslOf = (c) => new THREE.Color(c).getHSL({ h: 0, s: 0, l: 0 });
  const baseL = hslOf(base).l;
  out.body = mainColor;
  for (const key of Object.keys(out)) {
    if (key === 'body') continue;
    if (dist(out[key], base) < 70) {
      const dl = hslOf(out[key]).l - baseL;
      out[key] = shade(mainColor, Math.max(-0.3, Math.min(0.3, dl)));
    }
  }
  return out;
}

/** Deterministic pseudo-random hex colours. */
function colours(n, seed = 7) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    // Mostly random, some near-greys and near-neighbours so both sides of the 70 threshold are hit
    const c = Math.floor(next() * 0xffffff);
    out.push(`#${c.toString(16).padStart(6, '0')}`);
  }
  return out;
}

describe('recolouring a photo-made piece (three.js free)', () => {
  it('matches the three.js colour arithmetic exactly', () => {
    const cs = colours(600);
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      const b = cs[(i * 7 + 3) % cs.length];
      expect(colourDistance(a, b)).toBeCloseTo(
        Math.hypot(
          new THREE.Color(a).r - new THREE.Color(b).r,
          new THREE.Color(a).g - new THREE.Color(b).g,
          new THREE.Color(a).b - new THREE.Color(b).b
        ) * 255,
        9
      );
      const hsl = new THREE.Color(a).getHSL({ h: 0, s: 0, l: 0 });
      const mine = linearHSL(a);
      expect([mine.h, mine.s, mine.l]).toEqual([hsl.h, hsl.s, hsl.l]);
      for (const amount of [-0.3, -0.12, -0.05, 0, 0.02, 0.18, 0.3])
        expect(shadeColour(a, amount)).toBe(shade(a, amount));
      // rgb() strings (what shade gives back) read the same way as hex
      expect(shadeColour(shade(a, 0.1), -0.04)).toBe(shade(shade(a, 0.1), -0.04));
    }
  });

  it('gives the same palette as the three.js rule for any recolour', () => {
    const cs = colours(400, 11);
    for (let i = 0; i < 200; i++) {
      const body = cs[i];
      // a slot near the body (it follows) and slots elsewhere (they stay)
      const near = shade(body, 0.04).replace(
        /rgb\((\d+),(\d+),(\d+)\)/,
        (_, r, g, b) => `#${[r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')}`
      );
      const design = {
        palette: {
          body,
          base: near,
          accent: cs[i + 200],
          door: cs[(i * 3) % 400],
          trim: '#c9a24a',
        },
      };
      for (const main of [cs[(i + 17) % 400], '#2b7a78', '#f1f0ed', body.toUpperCase()])
        expect(effectivePalette(design, main)).toEqual(threePalette(design, main));
    }
  });

  it('keeps contrasting slots as photographed and moves matching ones with the body', () => {
    const design = { palette: { body: '#f1f0ed', door: '#8a6a4a', base: '#e9e8e4' } };
    const next = effectivePalette(design, '#223355');
    expect(next.body).toBe('#223355');
    expect(next.door).toBe('#8a6a4a');
    expect(next.base).not.toBe('#e9e8e4');
    expect(effectivePalette(design, '#F1F0ED')).toEqual(design.palette);
  });
});
