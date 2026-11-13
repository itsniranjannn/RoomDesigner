import { describe, it, expect } from 'vitest';
import { threeQuarter } from './oblique.js';
import { channelTufting, steppedArms, findPulls, wardrobeDetails, deskDetails } from './details.js';
import { sanitizeDesign, slabOver, classifyFromFront } from './design.js';
import { assignSheetViews } from './sheet.js';
import { splitFlanks } from './foreground.js';
import { detectStackedPhotos } from './stacked.js';

/** A square view drawn by a colour function over (u, v) in 0-1; null is background. */
function view(size, paint) {
  const mask = new Uint8Array(size * size);
  const rgb = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const c = paint((x + 0.5) / size, (y + 0.5) / size);
      if (!c) continue;
      mask[y * size + x] = 1;
      rgb.set(c, (y * size + x) * 3);
    }
  return { mask, rgb, size, fine: null };
}

/**
 * The outline of a box of width w, depth d and height h seen by an orthographic camera turned by `yaw` degrees
 * and looking down by `pitch` degrees, as a normalized view (stretched to its box) and its own aspect.
 */
function boxView(w, d, h, yaw, pitch, size = 96) {
  const t = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  const pts = [];
  for (const x of [0, w])
    for (const z of [0, d])
      for (const y of [0, h]) {
        const sx = x * Math.cos(t) + z * Math.sin(t);
        const depth = -x * Math.sin(t) + z * Math.cos(t);
        pts.push([sx, -(y * Math.cos(p)) + depth * Math.sin(p)]);
      }
  // the convex outline of the eight corners
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out;
  };
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  const xs = hull.map((q) => q[0]);
  const ys = hull.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inside = (u, v) => {
    const q = [x0 + u * (x1 - x0), y0 + v * (y1 - y0)];
    return hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], q) >= -1e-9);
  };
  return {
    view: view(size, (u, v) => (inside(u, v) ? [120, 110, 100] : null)),
    aspect: (x1 - x0) / (y1 - y0),
  };
}

describe('three-quarter photos', () => {
  it('reads the width, depth and height of a box photographed from three quarters', () => {
    // a sofa-like box 220 x 95 x 80, turned 32 degrees, seen from 18 degrees above
    const { view: v, aspect } = boxView(220, 95, 80, 32, 18);
    const q = threeQuarter(v, aspect);
    expect(q).not.toBeNull();
    expect(q.wph).toBeGreaterThan((220 / 80) * 0.8);
    expect(q.wph).toBeLessThan((220 / 80) * 1.25);
    expect(q.dph).toBeGreaterThan((95 / 80) * 0.75);
    expect(q.dph).toBeLessThan((95 / 80) * 1.3);
    expect(q.pitch).toBeGreaterThan(12);
    expect(q.pitch).toBeLessThan(26);
  });

  it('takes the longer face as the front whichever way the piece is turned', () => {
    for (const yaw of [-35, 35, 55]) {
      const { view: v, aspect } = boxView(200, 90, 80, yaw, 20);
      const q = threeQuarter(v, aspect);
      expect(q, String(yaw)).not.toBeNull();
      expect(q.longer / q.shorter).toBeGreaterThan(1.6);
    }
  });

  it('does not read a straight-on photo or a round base as a three-quarter view', () => {
    const front = boxView(200, 90, 80, 0, 10);
    expect(threeQuarter(front.view, front.aspect)).toBeNull();
    const pouf = view(96, (u, v) =>
      (u - 0.5) ** 2 / 0.25 + (v - 0.55) ** 2 / 0.2 <= 1 || (v < 0.55 && u > 0.02 && u < 0.98)
        ? [150, 120, 90]
        : null
    );
    expect(threeQuarter(pouf, 1.4)).toBeNull();
  });
});

describe('details read from the front', () => {
  // a sofa front: back above, seat below, arms at the ends, on a plain cloth
  const sofa = (grooves) =>
    view(192, (u, v) => {
      if (v > 0.92) return null;
      const groove = grooves && v < 0.45 && u > 0.12 && u < 0.88 && Math.round(u * 60) % 4 === 0;
      return groove ? [120, 80, 90] : [200, 150, 160];
    });

  it('finds upright channel stitching, and not on a plain back', () => {
    expect(channelTufting(sofa(true))).toBe(true);
    expect(channelTufting(sofa(false))).toBe(false);
  });

  it('finds an arm built of stacked slabs from the grooves between them', () => {
    const stepped = view(192, (u, v) => {
      if (v > 0.92) return null;
      if (u < 0.25 && [0.18, 0.26, 0.34].some((y) => Math.abs(v - y) < 0.008)) return [110, 80, 90];
      return [200, 150, 160];
    });
    expect(steppedArms(stepped)).toBe(true);
    expect(steppedArms(sofa(false))).toBe(false);
  });

  it('finds bar and ring pulls and counts drawers by them', () => {
    const wardrobe = view(192, (u, v) => {
      const bar = (Math.abs(u - 0.45) < 0.01 || Math.abs(u - 0.55) < 0.01) && v > 0.25 && v < 0.4;
      if (bar) return [200, 170, 60];
      // three ring pulls under the right door
      for (const y of [0.66, 0.78, 0.9]) {
        const r = Math.hypot((u - 0.75) * 1.0, v - y);
        if (r < 0.02 && r > 0.011) return [220, 220, 225];
      }
      return [120, 85, 60];
    });
    const { pulls } = findPulls(wardrobe);
    expect(pulls.filter((h) => h.kind === 'bar')).toHaveLength(2);
    expect(pulls.filter((h) => h.kind === 'ring').length).toBeGreaterThanOrEqual(2);
    const { traits, palette } = wardrobeDetails(wardrobe);
    expect(traits.drawers).toBe(3);
    expect(traits.dside).toBe('right');
    expect(palette.trim).toBeUndefined();
  });

  it('reads a desk pedestal, its drawers and a modesty panel', () => {
    const desk = view(192, (u, v) => {
      if (v < 0.1) return [60, 60, 60]; // the top
      if (u > 0.68 && u < 0.95) {
        // the pedestal with three level seams and pulls
        if ([0.38, 0.62].some((y) => Math.abs(v - y) < 0.006)) return [20, 20, 20];
        if (Math.abs(u - 0.81) < 0.04 && [0.26, 0.5, 0.75].some((y) => Math.abs(v - y) < 0.01))
          return [200, 200, 200];
        return [80, 80, 80];
      }
      if (u > 0.05 && u < 0.09) return [70, 70, 70]; // a leg
      if (v < 0.4 && u > 0.09 && u < 0.68) return [75, 75, 75]; // the modesty panel
      return null;
    });
    expect(slabOver(desk).pedestal).toBe('right');
    const d = deskDetails(desk);
    expect(d).toMatchObject({ ped: 'right', modesty: 1 });
    expect(d.drawers).toBeGreaterThanOrEqual(2);
    expect(classifyFromFront(desk, 1.8)).toBe('desk');
  });
});

describe('records for the new details', () => {
  it('keeps plain legs on a desk read from a photo, and older desks as they were', () => {
    const legs = sanitizeDesign({
      v: 1,
      type: 'desk',
      palette: { body: '#333333' },
      traits: { base: 'legs' },
    });
    expect(legs.traits.base).toBe('legs');
    const old = sanitizeDesign({ v: 1, type: 'desk', palette: { body: '#333333' }, traits: {} });
    expect(old.traits.base).toBeUndefined();
  });

  it('keeps no headboard traits on a tube metal bed', () => {
    const bed = sanitizeDesign({
      v: 1,
      type: 'bed',
      palette: { body: '#4f3637', base: '#4f3637', panel: '#ffffff', pillow: '#ffffff' },
      traits: {
        metal: 1,
        rails: 1,
        casters: 1,
        foot: 1,
        head: 'tufted',
        crest: 2,
        framed: 1,
        headW: 0.8,
      },
    });
    expect(bed.traits).toMatchObject({ metal: 1, rails: 1, casters: 1, foot: 1 });
    for (const key of ['head', 'channels', 'crest', 'framed', 'headW'])
      expect(bed.traits[key], key).toBeUndefined();
    expect(bed.palette.panel).toBeUndefined();
  });

  it('keeps every wardrobe, desk, tub chair and sofa detail through a round trip, under 300 characters', () => {
    const records = [
      {
        type: 'wardrobe',
        palette: { body: '#937e6a', door: '#e2e2e0', trim: '#c9a24a' },
        traits: {
          doors: 4,
          mirror: 2,
          drawers: 3,
          dside: 'right',
          handle: 'ring',
          upper: 1,
          niche: 1,
          fluted: 1,
        },
      },
      {
        type: 'desk',
        palette: { body: '#4b4c4b', accent: '#3f3a36', leg: '#322a27' },
        traits: { ped: 'right', drawers: 3, base: 'sled', modesty: 1, topH: 5 },
      },
      {
        type: 'tub-chair',
        palette: { body: '#72552d', leg: '#a1a099' },
        traits: { base: 'metal', wrap: 1 },
      },
      {
        type: 'sofa',
        palette: { body: '#c59895', cushion: '#cc9e9a', leg: '#c9a24a', arm: '#c59895' },
        traits: { seats: 3, longSeat: 1, chan: 1, step: 1, roll: 1 },
      },
    ];
    for (const r of records) {
      const back = sanitizeDesign(JSON.parse(JSON.stringify({ v: 1, ...r })));
      expect(back.traits, r.type).toMatchObject(r.traits);
      expect(back.palette, r.type).toMatchObject(r.palette);
      expect(JSON.stringify(back).length, r.type).toBeLessThan(300);
    }
  });
});

describe('product sheets with three-quarter views', () => {
  const box = (w, h) => ({ box: { x: 0, y: 0, w, h } });
  const straight = (sym, legs = 0.1) => ({ sym, oblique: null, legs });
  const quarter = (yaw) => ({ sym: 0.5, oblique: { yaw }, legs: 0.1 });

  it('reads the squarest three-quarter view when the sheet has nothing else', () => {
    const roles = assignSheetViews([box(200, 120), box(200, 120)], [quarter(50), quarter(30)]);
    expect(roles).toEqual([null, 'front']);
  });

  it('never uses a three-quarter view as the side or the plan', () => {
    const roles = assignSheetViews(
      [box(130, 130), box(134, 147), box(138, 149), box(129, 150)],
      [straight(0.97, 0.01), straight(0.98, 0.17), quarter(40), straight(0.61, 0.17)]
    );
    expect(roles[2]).toBeNull();
    expect(roles[1]).toBe('front');
    expect(roles[0]).toBe('top');
    expect(roles[3]).toBe('right');
  });

  it('takes one picture far bigger than the others as the main photo', () => {
    const roles = assignSheetViews(
      [box(300, 160), box(120, 70), box(120, 70)],
      [straight(0.9), straight(0.9), straight(0.9)]
    );
    expect(roles).toEqual(['front', null, null]);
  });
});

describe('pieces in a room photo', () => {
  it('splits the side tables off a bed, and leaves the arms on a sofa', () => {
    const w = 120;
    const h = 80;
    const draw = (inside) => {
      const labels = new Int32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) if (inside(x, y)) labels[y * w + x] = 1;
      return labels;
    };
    // a bed: headboard over the middle, the foot reaching the bottom, nightstands beside it standing further back
    const bed = draw(
      (x, y) =>
        (x >= 25 && x < 95 && y >= 5) || // headboard and bed
        ((x < 25 || x >= 95) && y >= 35 && y < 60) // the nightstands, their feet well above the bed's foot
    );
    const split = splitFlanks(bed, w, h);
    expect(new Set(Array.from(split).filter(Boolean)).size).toBe(3);
    // a sofa: the back over the middle, the arms lower but reaching the floor where the sofa does
    const sofa = draw(
      (x, y) => (x >= 18 && x < 102 && y >= 10) || ((x < 18 || x >= 102) && y >= 35)
    );
    expect(new Set(Array.from(splitFlanks(sofa, w, h)).filter(Boolean)).size).toBe(1);
  });

  it('splits a listing collage at a hairline', () => {
    const w = 200;
    const h = 120;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const line = y === 70;
        // two photos of one piece on a busy brown backdrop, split by one light line
        const noise = ((x * 7 + y * 13) % 17) * 3;
        const piece = x > 60 && x < 140 && (y < 70 ? y > 20 && y < 60 : y > 80 && y < 112);
        const c = line ? [218, 200, 185] : piece ? [200, 170, 120] : [120 + noise, 95 + noise, 70];
        rgba.set([...c, 255], i);
      }
    const found = detectStackedPhotos(rgba, w, h);
    expect(found).not.toBeNull();
    expect(found.axis).toBe('y');
    expect(found.parts).toHaveLength(2);
  });
});
