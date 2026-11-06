/**
 * furniture.js
 * Parametric furniture for the procedural photo corpus: one builder per supported type, each returning a 3D Model
 * (see render3d.js) plus the ground truth the robustness harness scores against. Every builder takes a seeded
 * random source, so the same seed always draws the same piece, in many styles, colours and materials.
 */
import { Model, shadeC, mixc } from './render3d.js';

export const FABRICS = [
  [128, 128, 128],
  [86, 90, 98],
  [196, 190, 178],
  [232, 228, 216],
  [48, 62, 96],
  [28, 44, 74],
  [64, 124, 120],
  [34, 96, 110],
  [188, 140, 62],
  [210, 170, 70],
  [96, 112, 62],
  [142, 76, 54],
  [172, 78, 66],
  [120, 40, 52],
  [208, 150, 150],
  [96, 70, 110],
  [34, 34, 36],
  [160, 130, 100],
  [112, 138, 168],
  [220, 214, 200],
];
export const LEATHERS = [
  [140, 86, 48],
  [96, 58, 36],
  [30, 28, 28],
  [190, 150, 100],
  [168, 70, 44],
  [210, 200, 184],
];
export const WOODS = [
  [196, 150, 100], // oak
  [112, 74, 46], // walnut
  [150, 96, 50], // teak
  [214, 184, 140], // pine / ash
  [236, 230, 220], // whitewash
  [40, 36, 34], // black stain
  [128, 52, 36], // mahogany
  [176, 108, 66], // cherry
  [96, 90, 80], // grey oak
];
export const METALS = [
  [30, 30, 32],
  [196, 160, 80],
  [190, 192, 196],
  [90, 94, 100],
];
export const PAINTS = [
  [240, 238, 232],
  [214, 208, 196],
  [60, 70, 66],
  [120, 150, 140],
  [36, 40, 52],
  [196, 120, 96],
  [236, 214, 160],
];

/** Hands out a fabric or leather colour with its material. */
export function upholstery(r) {
  if (r.chance(0.28)) return { color: r.pick(LEATHERS), mat: 'leather' };
  return { color: r.pick(FABRICS), mat: 'fabric' };
}

const lighten = (c, k = 1.07) => shadeC(c, k);
const DARK = [24, 22, 22];

/** Four legs at the corners of a footprint. */
function legs4(m, x0, y0, x1, y1, h, t, color, mat, round = false) {
  for (const [x, y] of [
    [x0, y0],
    [x1 - t, y0],
    [x0, y1 - t],
    [x1 - t, y1 - t],
  ]) {
    if (round) m.cyl(x + t / 2, y + t / 2, 0, t / 2, h, color, mat, { sides: 14 });
    else m.box(x, y, 0, t, t, h, color, mat);
  }
}

/** Seams between cushions are real gaps showing the dark inside. */
function gap(m, x, y, z, w, d, h) {
  m.box(x, y, z, w, d, h, DARK, 'plain');
}

// ---------- upholstered seating ----------

/**
 * Sofa, loveseat and armchair share one builder: seats across, arms, back, cushions and feet.
 * @param {{seats: number, style?: string, legs?: string, tufted?: boolean}} o
 */
export function upholstered(r, o) {
  const m = new Model();
  const { color, mat } = o.upholstery || upholstery(r);
  const wood = o.wood || r.pick(WOODS);
  const seats = o.seats;
  const style = o.style || r.pick(['modern', 'rolled', 'tuxedo', 'track']);
  const roll = style === 'rolled';
  const armW = roll ? r.range(18, 24) : style === 'track' ? r.range(10, 14) : r.range(12, 20);
  const seatW = seats === 1 ? r.range(52, 62) : r.range(54, 72);
  const W = armW * 2 + seatW * seats;
  const D = o.depth || r.range(82, 100);
  const legStyle = o.legs || r.pick(['tapered', 'block', 'low', 'wood', 'metal']);
  const legH = legStyle === 'low' ? r.range(2, 4) : r.range(10, 18);
  const baseH = r.range(18, 24);
  const seatTop = legH + baseH + r.range(8, 12);
  const H = o.height || r.range(78, 94);
  const backD = r.range(16, 24);
  const armH =
    style === 'tuxedo' ? H - 4 : roll ? seatTop + r.range(14, 22) : seatTop + r.range(10, 20);
  // body
  m.box(0, 0, legH, W, D, baseH + 8, color, mat);
  m.box(armW, D - backD, legH, W - 2 * armW, backD, H - legH, color, mat);
  // arms
  for (const x of [0, W - armW]) {
    if (roll) m.roundBox(x, 0, legH, armW, D, armH - legH, armW / 2, color, mat, { bottom: false });
    else m.box(x, 0, legH, armW, D, armH - legH, color, mat);
  }
  // seat cushions with seam gaps
  const cushion = r.chance(0.5) ? lighten(color) : color;
  const longSeat = seats > 1 && r.chance(0.15);
  const cw = (W - 2 * armW) / (longSeat ? 1 : seats);
  for (let i = 0; i < (longSeat ? 1 : seats); i++)
    m.roundBox(armW + i * cw + 0.5, 4, seatTop - 8, cw - 1, D - backD - 4, 14, 4, cushion, mat);
  // back cushions, leaning slightly
  const bw = (W - 2 * armW) / seats;
  const backTop = H + (style === 'tuxedo' ? 0 : r.range(-6, 2));
  for (let i = 0; i < seats; i++) {
    const x0 = armW + i * bw + 0.5;
    const x1 = x0 + bw - 1;
    m.prismXZ(
      [
        [x0, seatTop + 4],
        [x1, seatTop + 4],
        [x1, backTop - 2],
        [x0, backTop - 2],
      ],
      D - backD - 15,
      D - backD,
      cushion,
      mat
    );
  }
  if (o.tufted ?? r.chance(0.18))
    for (let i = 0; i < seats * 3; i++)
      for (let j = 0; j < 2; j++)
        m.box(
          armW + 6 + i * ((W - 2 * armW - 12) / (seats * 3 - 0.0)),
          D - backD - 15.2,
          seatTop + 14 + j * 16,
          1.6,
          0.6,
          1.6,
          shadeC(color, 0.55),
          'plain'
        );
  // feet
  if (legStyle !== 'low') {
    const t = legStyle === 'block' ? 6 : 3.5;
    legs4(
      m,
      3,
      3,
      W - 3,
      D - 3,
      legH,
      t,
      legStyle === 'metal' ? r.pick(METALS) : wood,
      legStyle === 'metal' ? 'metal' : 'wood',
      legStyle === 'tapered'
    );
  }
  // scatter cushions
  if (seats >= 2 && r.chance(0.5)) {
    const sc = r.pick(FABRICS);
    m.prismXZ(
      [
        [armW + 6, seatTop + 6],
        [armW + 30, seatTop + 6],
        [armW + 28, seatTop + 30],
        [armW + 8, seatTop + 30],
      ],
      D - backD - 20,
      D - backD - 15,
      sc,
      'fabric'
    );
  }
  gap(m, armW, 2, legH + 2, 0.2, 1, 1);
  const palette = { main: color };
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: {
      type: seats === 1 ? 'armchair' : 'sofa',
      traits: { seats: seats === 1 ? undefined : seats },
      color: palette.main,
    },
  };
}

/** L-shaped sofa: a run along the back with a chaise on one side. */
export function cornerSofa(r) {
  const m = new Model();
  const { color, mat } = upholstery(r);
  const side = r.chance(0.5) ? 'left' : 'right';
  const W = r.range(240, 300);
  const D = r.range(150, 170);
  const runD = r.range(86, 96);
  const H = r.range(78, 90);
  const seatTop = r.range(38, 44);
  const chW = r.range(88, 100);
  const legH = r.range(8, 12);
  const wood = r.pick(WOODS);
  m.box(0, D - runD, legH, W, runD, seatTop - legH - 8, color, mat);
  const chX = side === 'left' ? 0 : W - chW;
  m.box(chX, 0, legH, chW, D - runD, seatTop - legH - 8, color, mat);
  m.box(0, D - 22, legH, W, 22, H - legH, color, mat);
  const armX = side === 'left' ? W - 14 : 0;
  m.box(armX, D - runD, legH, 14, runD, seatTop + 14 - legH, color, mat);
  const n = Math.round((W - chW) / 70);
  const sw = (W - 14) / Math.max(1, n + 1);
  for (let i = 0; i < n + 1; i++) {
    const x0 = (side === 'left' ? 0 : 14) + i * sw + 0.5;
    m.roundBox(x0, D - runD + 2, seatTop - 8, sw - 1, runD - 24, 12, 4, lighten(color), mat);
    m.prismXZ(
      [
        [x0, seatTop + 3],
        [x0 + sw - 1, seatTop + 3],
        [x0 + sw - 1, H - 2],
        [x0, H - 2],
      ],
      D - 40,
      D - 22,
      lighten(color),
      mat
    );
  }
  m.roundBox(chX + 0.5, 2, seatTop - 8, chW - 1, D - runD - 2, 12, 4, lighten(color), mat);
  legs4(m, 3, 3, W - 3, D - 3, legH, 5, wood, 'wood');
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'corner-sofa', traits: {}, color },
  };
}

/** Wood-frame lounge chair: open sides, thin cushions, reclined back. */
export function loungeChair(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const { color, mat } = upholstery(r);
  const W = r.range(62, 78);
  const D = r.range(75, 92);
  const H = r.range(70, 84);
  const seatZ = r.range(26, 34);
  const t = 4;
  for (const x of [0, W - t]) {
    m.box(x, 0, 0, t, t, seatZ + 20, wood, 'wood');
    m.box(x, D - 16, 0, t, t, seatZ + 6, wood, 'wood');
    m.box(x, 0, seatZ + 18, t, D - 6, t, wood, 'wood'); // arm rail
    m.prismXZ(
      [
        [x, seatZ],
        [x + t, seatZ],
        [x + t, H],
        [x, H - 6],
      ].map(([a, b]) => [a, b]),
      D - 12,
      D - 8,
      wood,
      'wood'
    );
  }
  m.box(0, 4, seatZ - 2, W, D - 20, 3, wood, 'wood');
  m.roundBox(t, 6, seatZ + 1, W - 2 * t, D - 28, 9, 3, color, mat);
  m.prismXZ(
    [
      [t + 2, seatZ + 8],
      [W - t - 2, seatZ + 8],
      [W - t - 2, H - 4],
      [t + 2, H - 4],
    ],
    D - 22,
    D - 8,
    lighten(color, 1.05),
    mat
  );
  return { model: m, dims: { w: W, d: D, h: H }, truth: { type: 'lounge', traits: {}, color } };
}

/** Round bucket or tub chair. */
export function tubChair(r) {
  const m = new Model();
  const { color, mat } = upholstery(r);
  const R = r.range(34, 42);
  const H = r.range(72, 82);
  const base = r.pick(['feet', 'pedestal', 'legs']);
  const z0 = base === 'pedestal' ? 16 : 12;
  const wood = r.pick(WOODS);
  // back wall: half ring open to the front
  const sides = 20;
  for (let i = 0; i < sides; i++) {
    const a0 = Math.PI * (0.0 + i / sides);
    const a1 = Math.PI * (0.0 + (i + 1) / sides);
    const q = (rr, a, z) => [R + Math.cos(a) * rr, R + Math.sin(a) * rr, z];
    const am = (a0 + a1) / 2;
    m.polys.push({
      verts: [q(R, a0, z0), q(R, a1, z0), q(R, a1, H), q(R, a0, H)],
      n: [Math.cos(am), Math.sin(am), 0],
      color,
      mat,
    });
    m.polys.push({
      verts: [q(R - 7, a1, z0 + 20), q(R - 7, a0, z0 + 20), q(R - 7, a0, H), q(R - 7, a1, H)],
      n: [-Math.cos(am), -Math.sin(am), 0],
      color: shadeC(color, 0.9),
      mat,
    });
    m.polys.push({
      verts: [q(R, a0, H), q(R, a1, H), q(R - 7, a1, H), q(R - 7, a0, H)],
      n: [0, 0, 1],
      color,
      mat,
    });
  }
  m.cyl(R, R, z0, R * 0.98, 24, color, mat);
  m.cyl(R, R, z0 + 24, R - 6, 8, lighten(color), mat);
  if (base === 'pedestal') {
    m.cyl(R, R, 0, 5, z0, wood, 'metal');
    m.cyl(R, R, 0, 18, 2, wood, 'metal');
  } else legs4(m, R - 22, R - 22, R + 22, R + 22, z0, 3.5, wood, 'wood', true);
  return {
    model: m,
    dims: { w: 2 * R, d: 2 * R, h: H },
    truth: { type: 'tub-chair', traits: {}, color },
  };
}

/** Daybed: low frame with a back and two ends, a mattress and bolsters. */
export function daybed(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const { color, mat } = upholstery(r);
  const W = r.range(190, 206);
  const D = r.range(90, 100);
  const H = r.range(75, 88);
  const legH = r.range(14, 24);
  const slat = r.chance(0.5);
  m.box(0, 0, legH, W, D, 10, wood, 'wood');
  m.box(0, 0, legH, 5, D, H - legH - 15, wood, 'wood');
  m.box(W - 5, 0, legH, 5, D, H - legH - 15, wood, 'wood');
  if (slat)
    for (let i = 0; i < 18; i++)
      m.box(5 + i * ((W - 12) / 18), D - 4, legH + 10, 3, 3, H - legH - 10, wood, 'wood');
  else m.box(0, D - 4, legH, W, 4, H - legH, wood, 'wood');
  m.box(6, 4, legH + 10, W - 12, D - 10, 14, color, mat);
  m.cyl(18, 24, legH + 24, 9, 0.1, color, mat);
  m.roundBox(8, D - 24, legH + 24, 50, 18, 24, 6, lighten(color, 0.9), mat);
  m.roundBox(W - 58, D - 24, legH + 24, 50, 18, 24, 6, lighten(color, 0.9), mat);
  legs4(m, 0, 0, W, D, legH, 5, wood, 'wood');
  return { model: m, dims: { w: W, d: D, h: H }, truth: { type: 'daybed', traits: {}, color } };
}

// ---------- chairs and stools ----------

export function diningChair(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const back = r.pick(['slat', 'solid', 'open', 'upholstered']);
  const upCol = upholstery(r);
  const W = r.range(40, 48);
  const D = r.range(42, 50);
  const H = r.range(84, 96);
  const sh = r.range(44, 48);
  const t = r.range(3, 4.5);
  legs4(m, 0, 0, W, D, sh, t, wood, 'wood', r.chance(0.3));
  m.box(0, 0, sh - 3, W, D, 3.5, wood, 'wood');
  if (r.chance(0.5)) m.roundBox(1, 1, sh, W - 2, D - 2, 4, 1.8, upCol.color, upCol.mat);
  for (const x of [0, W - t]) m.box(x, D - t, sh, t, t, H - sh, wood, 'wood');
  if (back === 'slat')
    for (let i = 0; i < 4; i++)
      m.box(0, D - t, sh + 12 + i * ((H - sh - 18) / 4), W, 1.8, 3, wood, 'wood');
  else if (back === 'solid') m.box(0, D - t, sh + 10, W, 2, H - sh - 10, wood, 'wood');
  else if (back === 'upholstered')
    m.roundBox(2, D - 6, sh + 10, W - 4, 5, H - sh - 12, 5, upCol.color, upCol.mat);
  else {
    m.box(0, D - t, H - 8, W, 2, 8, wood, 'wood');
    m.box(0, D - t, sh + 14, W, 2, 4, wood, 'wood');
  }
  const ar = r.chance(0.2);
  if (ar) for (const x of [0, W - t]) m.box(x, 4, sh + 16, t, D - 8, 3, wood, 'wood');
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'chair', traits: {}, color: back === 'upholstered' ? upCol.color : wood },
  };
}

export function stool(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const bar = r.chance(0.5);
  const H = bar ? r.range(62, 78) : r.range(42, 52);
  const round = r.chance(0.55);
  const S = r.range(30, 40);
  const metal = r.chance(0.35);
  const lc = metal ? r.pick(METALS) : wood;
  const lm = metal ? 'metal' : 'wood';
  const seat = r.chance(0.4) ? upholstery(r) : { color: wood, mat: 'wood' };
  const back = bar && r.chance(0.35);
  if (round) {
    const R = S / 2;
    m.cyl(R, R, H - 6, R, 6, seat.color, seat.mat);
    for (const [x, y] of [
      [4, 4],
      [S - 4, 4],
      [4, S - 4],
      [S - 4, S - 4],
    ])
      m.cyl(x, y, 0, 1.8, H - 6, lc, lm, { sides: 10 });
    if (bar) m.cyl(R, R, H * 0.35, R - 3, 1.5, lc, lm);
  } else {
    m.roundBox(0, 0, H - 6, S, S, 6, 2, seat.color, seat.mat);
    legs4(m, 2, 2, S - 2, S - 2, H - 6, 3.2, lc, lm);
    if (bar) m.box(2, 2, H * 0.35, S - 4, 2, 2, lc, lm);
  }
  if (back) m.box(2, S - 4, H - 2, S - 4, 2, 22, seat.color, seat.mat);
  return {
    model: m,
    dims: { w: S, d: S, h: H + (back ? 22 : 0) },
    truth: { type: 'stool', traits: {}, color: seat.color },
  };
}

export function ottoman(r) {
  const m = new Model();
  const { color, mat } = upholstery(r);
  const round = r.chance(0.45);
  const S = r.range(46, 90);
  const H = r.range(34, 46);
  const feet = r.pick(['none', 'short', 'tall']);
  const fh = feet === 'none' ? 0 : feet === 'short' ? 6 : 14;
  const wood = r.pick(WOODS);
  const D = round ? S : S * r.range(0.7, 1);
  if (round) m.cyl(S / 2, S / 2, fh, S / 2, H - fh, color, mat);
  else m.roundBox(0, 0, fh, S, D, H - fh, 5, color, mat);
  if (feet !== 'none') legs4(m, 3, 3, S - 3, D - 3, fh, 4, wood, 'wood', true);
  if (r.chance(0.3))
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        m.box(
          S * (0.2 + i * 0.3),
          D * 0.1,
          H - 8 - j * 8,
          1.6,
          0.5,
          1.6,
          shadeC(color, 0.55),
          'plain'
        );
  return { model: m, dims: { w: S, d: D, h: H }, truth: { type: 'ottoman', traits: {}, color } };
}

// ---------- tables ----------

export function diningTable(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const W = r.range(130, 200);
  const D = r.range(80, 100);
  const H = r.range(72, 78);
  const th = r.range(3, 6);
  const style = r.pick(['legs', 'round-legs', 'trestle', 'metal']);
  const lc = style === 'metal' ? r.pick(METALS) : wood;
  const lm = style === 'metal' ? 'metal' : 'wood';
  const topColor = r.chance(0.2) ? r.pick(PAINTS) : wood;
  m.box(0, 0, H - th, W, D, th, topColor, topColor === wood ? 'wood' : 'plain');
  if (style === 'trestle') {
    m.box(W * 0.12, 6, 0, 5, D - 12, H - th, lc, lm);
    m.box(W * 0.88 - 5, 6, 0, 5, D - 12, H - th, lc, lm);
    m.box(W * 0.12, D / 2 - 2, H * 0.3, W * 0.76, 4, 4, lc, lm);
  } else {
    const t = style === 'metal' ? 3.5 : r.range(5, 8);
    legs4(m, 4, 4, W - 4, D - 4, H - th, t, lc, lm, style === 'round-legs');
    if (style === 'legs') {
      m.box(4, 4, H - th - 8, W - 8, 2, 8, lc, lm);
      m.box(4, D - 6, H - th - 8, W - 8, 2, 8, lc, lm);
    }
  }
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'table', traits: {}, color: topColor },
  };
}

export function roundTable(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const R = r.range(44, 65);
  const H = r.range(72, 76);
  const th = r.range(3, 5);
  const style = r.pick(['pedestal', 'legs', 'tulip']);
  const lm = style === 'tulip' ? 'plain' : 'wood';
  const top = r.chance(0.3) ? r.pick(PAINTS) : wood;
  m.cyl(R, R, H - th, R, th, top, top === wood ? 'wood' : 'plain', { sides: 36 });
  if (style === 'legs') {
    const a = R * 0.62;
    for (const [x, y] of [
      [R - a, R - a],
      [R + a, R - a],
      [R - a, R + a],
      [R + a, R + a],
    ])
      m.cyl(x, y, 0, 3, H - th, wood, 'wood', { sides: 12 });
  } else {
    m.cyl(R, R, 0, style === 'tulip' ? 4 : 6, H - th, wood, lm);
    m.cyl(R, R, 0, R * 0.55, 3, wood, lm, { sides: 24 });
  }
  return {
    model: m,
    dims: { w: 2 * R, d: 2 * R, h: H },
    truth: { type: 'table-round', traits: {}, color: top },
  };
}

export function coffeeTable(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const kind = r.pick(['legs', 'glass', 'glass-gold', 'drawers', 'shelf', 'round', 'slab']);
  const W = kind === 'round' ? r.range(70, 90) : r.range(85, 125);
  const D = kind === 'round' ? W : r.range(48, 70);
  const H = r.range(34, 48);
  const th = kind.startsWith('glass') ? 1.6 : r.range(3, 5);
  const frame =
    kind === 'glass-gold' ? METALS[1] : kind === 'glass' ? r.pick([METALS[0], METALS[2]]) : wood;
  const fm = kind.startsWith('glass') ? 'metal' : 'wood';
  if (kind === 'round') {
    m.cyl(W / 2, W / 2, H - th, W / 2, th, wood, 'wood', { sides: 36 });
    for (const [x, y] of [
      [W * 0.25, W * 0.25],
      [W * 0.75, W * 0.25],
      [W * 0.25, W * 0.75],
      [W * 0.75, W * 0.75],
    ])
      m.cyl(x, y, 0, 2.2, H - th, wood, 'wood', { sides: 10 });
  } else if (kind === 'glass' || kind === 'glass-gold') {
    m.box(0, 0, H - th, W, D, th, [150, 190, 200], 'glass', { alpha: 0.35 });
    // frame under the glass
    m.box(0, 0, H - th - 2, W, 2.4, 2, frame, fm);
    m.box(0, D - 2.4, H - th - 2, W, 2.4, 2, frame, fm);
    m.box(0, 0, H - th - 2, 2.4, D, 2, frame, fm);
    m.box(W - 2.4, 0, H - th - 2, 2.4, D, 2, frame, fm);
    legs4(m, 1, 1, W - 1, D - 1, H - th - 2, 2.6, frame, fm);
    m.box(1, 1, H * 0.25, W - 2, D - 2, 1.4, [150, 190, 200], 'glass', { alpha: 0.3 });
  } else if (kind === 'drawers') {
    m.box(0, 0, 8, W, D, H - 8, wood, 'wood');
    gap(m, W * 0.05, -0.1, H * 0.45, W * 0.9, 0.3, 0.7);
    m.box(W * 0.45, -0.5, H * 0.62, W * 0.1, 1, 1.4, METALS[1], 'metal');
    legs4(m, 3, 3, W - 3, D - 3, 8, 3.5, wood, 'wood');
  } else if (kind === 'slab') {
    m.box(0, 0, H - th - 4, W, D, th + 4, wood, 'wood');
    m.box(6, 6, 0, W - 12, D - 12, H - th - 4, shadeC(wood, 0.7), 'wood');
  } else {
    m.box(0, 0, H - th, W, D, th, wood, 'wood');
    legs4(m, 3, 3, W - 3, D - 3, H - th, 4.5, wood, 'wood', r.chance(0.4));
    if (kind === 'shelf') m.box(4, 4, H * 0.25, W - 8, D - 8, 2.5, wood, 'wood');
  }
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'coffee-table', traits: {}, color: kind.startsWith('glass') ? frame : wood },
  };
}

export function desk(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const W = r.range(110, 160);
  const D = r.range(55, 75);
  const H = r.range(72, 78);
  const style = r.pick(['legs', 'pedestal', 'trestle', 'metal']);
  const th = 3.5;
  const lc = style === 'metal' ? r.pick(METALS) : wood;
  const lm = style === 'metal' ? 'metal' : 'wood';
  m.box(0, 0, H - th, W, D, th, wood, 'wood');
  if (style === 'pedestal') {
    const side = r.chance(0.5) ? 0 : W - 40;
    m.box(side, 2, 0, 40, D - 4, H - th, wood, 'wood');
    for (let i = 0; i < 3; i++) {
      gap(m, side + 2, 1.7, 6 + i * ((H - th - 10) / 3) - 0.4, 36, 0.4, 0.5);
      m.box(side + 15, 1.2, 12 + i * ((H - th - 10) / 3), 10, 1, 1.4, METALS[1], 'metal');
    }
    const lx = side === 0 ? W - 5 : 0;
    m.box(lx, 2, 0, 5, 5, H - th, wood, 'wood');
    m.box(lx, D - 7, 0, 5, 5, H - th, wood, 'wood');
  } else if (style === 'trestle') {
    m.box(6, 3, 0, 4, D - 6, H - th, lc, lm);
    m.box(W - 10, 3, 0, 4, D - 6, H - th, lc, lm);
    m.box(6, D - 8, H * 0.5, W - 12, 2, 18, lc, lm);
  } else {
    legs4(m, 3, 3, W - 3, D - 3, H - th, style === 'metal' ? 3.2 : 5, lc, lm);
    if (r.chance(0.5)) m.box(W * 0.3, 2, H - th - 7, W * 0.4, D - 6, 7, wood, 'wood');
  }
  return { model: m, dims: { w: W, d: D, h: H }, truth: { type: 'desk', traits: {}, color: wood } };
}

// ---------- storage ----------

export function wardrobe(r) {
  const m = new Model();
  const body = r.chance(0.45) ? r.pick(PAINTS) : r.pick(WOODS);
  const mat = PAINTS.includes(body) ? 'plain' : 'wood';
  const doors = r.pick([2, 2, 3, 4]);
  const W = doors * r.range(45, 62);
  const D = r.range(50, 62);
  const H = r.range(190, 230);
  const legH = r.chance(0.3) ? 10 : 3;
  m.box(0, 0, legH, W, D, H - legH, shadeC(body, 0.45), 'plain');
  const dw = W / doors;
  const mirror = r.chance(0.2);
  for (let i = 0; i < doors; i++) {
    m.box(
      i * dw + 0.5,
      -1,
      legH + 2,
      dw - 1,
      1.5,
      H - legH - 4,
      mirror && i === 0 ? [176, 190, 196] : body,
      mirror && i === 0 ? 'metal' : mat
    );
    const hx = i % 2 === 0 ? i * dw + dw - 7 : i * dw + 5;
    m.box(hx, -2.2, H * 0.5, 1.6, 1.4, 14, METALS[r.int(0, 1)], 'metal');
  }
  if (r.chance(0.3)) m.box(-1, -1.5, H - 3, W + 2, D + 1, 3, body, mat);
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'wardrobe', traits: { doors }, color: body },
  };
}

export function bookshelf(r) {
  const m = new Model();
  const wood = r.chance(0.4) ? r.pick(PAINTS) : r.pick(WOODS);
  const mat = PAINTS.includes(wood) ? 'plain' : 'wood';
  const W = r.range(60, 100);
  const D = r.range(26, 36);
  const H = r.range(160, 200);
  const shelves = r.int(4, 6);
  const t = 2.5;
  m.box(0, 0, 0, t, D, H, wood, mat);
  m.box(W - t, 0, 0, t, D, H, wood, mat);
  m.box(0, D - 1.5, 0, W, 1.5, H, shadeC(wood, 0.8), mat);
  const step = (H - t) / shelves;
  for (let i = 0; i <= shelves; i++) {
    m.box(0, 0, i === 0 ? 4 : i * step, W, D, t, wood, mat);
    if (i < shelves && r.chance(0.8) && i > 0) {
      let x = t + 1;
      while (x < W - t - 4) {
        const bw = r.range(2, 5);
        const bh = r.range(step * 0.5, step - 6);
        m.box(
          x,
          3,
          i * step + t,
          bw,
          D - 8,
          bh,
          [r.int(40, 220), r.int(40, 200), r.int(40, 200)],
          'plain'
        );
        x += bw + 0.2;
        if (r.chance(0.08)) x += r.range(8, 20);
      }
    }
  }
  m.box(0, 0, 0, W, D, 4, wood, mat);
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'bookshelf', traits: { shelves: shelves + 1 }, color: wood },
  };
}

export function etagere(r) {
  const m = new Model();
  const metal = r.chance(0.5);
  const frame = metal ? r.pick(METALS) : r.pick(WOODS);
  const fm = metal ? 'metal' : 'wood';
  const W = r.range(60, 90);
  const D = r.range(28, 38);
  const H = r.range(150, 185);
  const shelves = r.int(4, 6);
  const t = metal ? 2.4 : 3;
  legs4(m, 0, 0, W, D, H, t, frame, fm);
  const step = (H - 4) / shelves;
  for (let i = 0; i <= shelves; i++) {
    const wood = r.pick(WOODS);
    m.box(0, 0, i === 0 ? 12 : i * step, W, D, 2.4, metal ? wood : frame, metal ? 'wood' : fm);
    if (i > 0 && i < shelves && r.chance(0.5))
      m.cyl(
        r.range(12, W - 12),
        D / 2,
        i * step + 2.4,
        5,
        r.range(8, 20),
        r.pick(FABRICS),
        'plain'
      );
  }
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'etagere', traits: {}, color: frame },
  };
}

export function cabinet(r) {
  const m = new Model();
  const body = r.chance(0.35) ? r.pick(PAINTS) : r.pick(WOODS);
  const mat = PAINTS.includes(body) ? 'plain' : 'wood';
  const n = r.pick([2, 3, 3, 4]);
  const W = n * r.range(38, 50);
  const D = r.range(38, 50);
  const H = r.range(68, 90);
  const legH = r.pick([0, 12, 16, 20]);
  const front = r.pick(['doors', 'drawers', 'mixed']);
  m.box(0, 0, legH, W, D, H - legH, shadeC(body, 0.5), 'plain');
  const sw = W / n;
  for (let i = 0; i < n; i++) {
    const doorSec = front === 'doors' || (front === 'mixed' && i % 2 === 0);
    if (doorSec) {
      m.box(i * sw + 0.5, -1, legH + 1.5, sw - 1, 1.5, H - legH - 3, body, mat);
      m.box(i * sw + sw * 0.5 - 0.6, -2, legH + (H - legH) * 0.55, 1.2, 1.2, 8, METALS[1], 'metal');
    } else {
      const rows = 3;
      const rh = (H - legH - 3) / rows;
      for (let k = 0; k < rows; k++) {
        m.box(i * sw + 0.5, -1, legH + 1.5 + k * rh + 0.5, sw - 1, 1.5, rh - 1, body, mat);
        m.box(
          i * sw + sw * 0.5 - 4,
          -2,
          legH + 1.5 + k * rh + rh * 0.5,
          8,
          1.2,
          1.2,
          METALS[1],
          'metal'
        );
      }
    }
  }
  if (legH) legs4(m, 3, 3, W - 3, D - 3, legH, 4, body, mat);
  m.box(-1, -1.5, H, W + 2, D + 2, 2, body, mat);
  return {
    model: m,
    dims: { w: W, d: D, h: H + 2 },
    truth: { type: 'cabinet', traits: { n }, color: body },
  };
}

export function nightstand(r) {
  const m = new Model();
  const body = r.chance(0.3) ? r.pick(PAINTS) : r.pick(WOODS);
  const mat = PAINTS.includes(body) ? 'plain' : 'wood';
  const chest = r.chance(0.3);
  const W = chest ? r.range(70, 100) : r.range(40, 56);
  const D = r.range(36, 46);
  const H = chest ? r.range(80, 105) : r.range(44, 62);
  const legH = r.pick([0, 8, 14, 18]);
  const drawers = chest ? r.int(3, 4) : r.int(1, 3);
  m.box(0, 0, legH, W, D, H - legH, shadeC(body, 0.5), 'plain');
  const rh = (H - legH - 3) / drawers;
  for (let k = 0; k < drawers; k++) {
    m.box(1, -1, legH + 1.5 + k * rh + 0.4, W - 2, 1.5, rh - 0.8, body, mat);
    m.box(W / 2 - 3, -2, legH + 1.5 + k * rh + rh / 2, 6, 1.2, 1.2, METALS[1], 'metal');
  }
  if (legH) legs4(m, 2, 2, W - 2, D - 2, legH, 3.6, body, mat);
  return {
    model: m,
    dims: { w: W, d: D, h: H },
    truth: { type: 'nightstand', traits: { drawers }, color: body },
  };
}

// ---------- beds ----------

export function bed(r) {
  const m = new Model();
  const wood = r.chance(0.2) ? r.pick(PAINTS) : r.pick(WOODS);
  const wm = PAINTS.includes(wood) ? 'plain' : 'wood';
  const headStyle = r.pick(['panel', 'tufted', 'slat', 'wing', 'leather', 'low']);
  const W = r.pick([140, 150, 160, 180, 190]);
  const D = r.range(200, 214);
  const legH = r.pick([0, 6, 14, 20]);
  const baseH = r.range(22, 32);
  const headH =
    headStyle === 'low'
      ? r.range(75, 90)
      : headStyle === 'wing'
        ? r.range(120, 140)
        : r.range(95, 125);
  const duvet = upholstery(r);
  const upCol =
    headStyle === 'tufted' || headStyle === 'wing' ? upholstery(r) : { color: wood, mat: wm };
  const headCol = headStyle === 'leather' ? r.pick(LEATHERS) : upCol.color;
  const headMat = headStyle === 'leather' ? 'leather' : upCol.mat;
  const hw = headStyle === 'wing' ? W + 24 : r.pick([W + 6, W + 6, W * 0.9, W + 16]);
  const hx = (W - hw) / 2;
  const mattressTop = legH + baseH + 22;
  // frame
  m.box(0, 0, legH, W, D, baseH, wood, wm);
  if (r.chance(0.25)) {
    const rows = 2;
    for (let k = 0; k < rows; k++) {
      m.box(2 + k * (W / rows), -1, legH + 2, W / rows - 3, 1.5, baseH - 4, shadeC(wood, 0.95), wm);
      m.box(
        W / (2 * rows) - 3 + k * (W / rows),
        -2,
        legH + baseH / 2,
        6,
        1.2,
        1.2,
        METALS[1],
        'metal'
      );
    }
  }
  if (legH) legs4(m, 0, 0, W, D, legH, 6, wood, wm);
  // headboard
  m.box(hx, D - 7, legH, hw, 7, headH, headCol, headMat);
  if (headStyle === 'wing')
    for (const x of [hx - 0.01, hx + hw - 14])
      m.box(x, D - 24, legH + baseH, 14, 22, headH - baseH - 30, headCol, headMat);
  if (headStyle === 'leather')
    m.box(
      hx + hw * 0.1,
      D - 8,
      legH + baseH + 20,
      hw * 0.8,
      1.2,
      headH - baseH - 30,
      shadeC(r.pick(LEATHERS), 1),
      'leather'
    );
  if (headStyle === 'slat')
    for (let i = 1; i < 14; i++)
      gap(m, hx + i * (hw / 14), D - 7.4, legH + baseH + 10, 0.6, 0.5, headH - baseH - 14);
  if (headStyle === 'tufted')
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++)
        m.box(
          hx + hw * (0.12 + i * 0.15),
          D - 7.8,
          legH + baseH + 24 + j * 18,
          2,
          0.8,
          2,
          shadeC(headCol, 0.55),
          'plain'
        );
  // footboard
  const foot = r.chance(0.25);
  if (foot) m.box(0, 0, legH, W, 6, baseH + 14, wood, wm);
  // mattress, sheet, duvet and pillows
  m.box(3, 3, legH + baseH, W - 6, D - 12, 22, [236, 234, 228], 'fabric');
  const dc = duvet.color;
  m.box(-2, D * 0.28, mattressTop - 6, W + 4, D * 0.7 - 6, 8, dc, duvet.mat);
  m.box(
    -3,
    D * 0.28,
    legH + baseH + 6,
    3,
    D * 0.7 - 6,
    mattressTop - legH - baseH - 8,
    dc,
    duvet.mat
  );
  m.box(
    W,
    D * 0.28,
    legH + baseH + 6,
    3,
    D * 0.7 - 6,
    mattressTop - legH - baseH - 8,
    dc,
    duvet.mat
  );
  const pillows = r.int(2, 4);
  const pc = r.chance(0.7) ? [244, 242, 238] : r.pick(FABRICS);
  const pw = Math.min(72, (W - 8) / Math.min(pillows, 2));
  for (let i = 0; i < Math.min(pillows, 2); i++)
    m.roundBox(
      4 + (i * (W - 8)) / 2 + ((W - 8) / 2 - pw) / 2,
      D - 38,
      mattressTop - 6,
      pw,
      26,
      16,
      6,
      pc,
      'fabric'
    );
  if (pillows > 2)
    m.roundBox(W / 2 - 30, D - 62, mattressTop - 6, 60, 22, 12, 5, shadeC(pc, 0.96), 'fabric');
  return {
    model: m,
    dims: { w: Math.max(W, hw), d: D, h: Math.max(headH, mattressTop) },
    truth: { type: 'bed', traits: { pillows }, color: headCol, bedW: W },
  };
}

export const BUILDERS = {
  bed: (r) => bed(r),
  daybed: (r) => daybed(r),
  sofa: (r) => upholstered(r, { seats: r.pick([2, 3, 3, 4]) }),
  'corner-sofa': (r) => cornerSofa(r),
  armchair: (r) => upholstered(r, { seats: 1, depth: r.range(78, 95), height: r.range(76, 92) }),
  'tub-chair': (r) => tubChair(r),
  lounge: (r) => loungeChair(r),
  chair: (r) => diningChair(r),
  stool: (r) => stool(r),
  ottoman: (r) => ottoman(r),
  table: (r) => diningTable(r),
  'table-round': (r) => roundTable(r),
  'coffee-table': (r) => coffeeTable(r),
  desk: (r) => desk(r),
  wardrobe: (r) => wardrobe(r),
  bookshelf: (r) => bookshelf(r),
  etagere: (r) => etagere(r),
  cabinet: (r) => cabinet(r),
  nightstand: (r) => nightstand(r),
};

export const ALL_TYPES = Object.keys(BUILDERS);

/** Tones for props that live around the furniture (lamps, side tables). */
export function sideTable(r) {
  const m = new Model();
  const wood = r.pick(WOODS);
  const R = r.range(20, 28);
  const H = r.range(45, 60);
  m.cyl(R, R, H - 3, R, 3, wood, 'wood');
  m.cyl(R, R, 0, 2.5, H - 3, wood, 'wood');
  m.cyl(R, R, 0, R * 0.6, 2, wood, 'wood');
  return {
    model: m,
    dims: { w: 2 * R, d: 2 * R, h: H },
    truth: { type: 'nightstand', traits: {}, color: wood },
  };
}

export { mixc };
