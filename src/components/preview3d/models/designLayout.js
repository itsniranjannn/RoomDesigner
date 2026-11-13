/**
 * Layout of the photo-made pieces' details, shared by the 3D models and the 2D plan symbols: where a
 * wardrobe's doors, mirror and drawers go, what holds a desk up, the steps of a terraced arm, where a bed's
 * guard rails stand and how a wrap-around tub chair's shell runs. Plain numbers only (no three.js), in metres.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Corner positions [x, z] of a footprint inset by `inset` metres. */
function corners(widthM, depthM, inset) {
  const x = widthM / 2 - inset;
  const z = depthM / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}

/** Depth of a channel-tufted back (its panel and the channels standing on it), never most of the seat. */
export function channelBackT(depthM) {
  return Math.min(clamp(depthM * 0.24, 0.15, 0.3), depthM * 0.4);
}

/** Heights of terraced arm slabs, outermost first, from the arm height down to just above the seat. */
export function stepTiers({ armW, armH, seatH }) {
  const count = armW >= 0.17 ? 3 : 2;
  const low = Math.min(armH - 0.04, seatH + 0.1);
  const w = armW / count;
  return Array.from({ length: count }, (_, k) => ({
    w,
    // offset of the slab centre from the outer edge of the arm
    off: w * (k + 0.5),
    h: armH - ((armH - low) * k) / Math.max(1, count - 1),
  }));
}

/** How far round from the back (radians) a wrap-around tub chair shell reaches on each side. */
export const WRAP_END = Math.PI * 0.62;

/** Height of a wrap-around shell's top edge (0 at the arm ends, 1 over the back), `u` = angle / WRAP_END. */
export function wrapRise(u) {
  const a = Math.min(1, Math.abs(u));
  return (1 - a ** 2.4) ** 0.55;
}

/**
 * Where the guard rails stand: one on each long side, staggered (one nearer the head, one the foot). A bed
 * resized too short for a 10 cm rail clear of its ends has none.
 */
export function guardRailSpans(depthM) {
  // Clear of the head and foot ends however short the bed is resized
  const len = Math.min(clamp(depthM * 0.46, 0.45, 1.05), depthM - 0.25);
  if (len < 0.1) return [];
  const off = Math.max(0, Math.min(depthM * 0.09, (depthM - len) / 2 - 0.08));
  return [
    { side: -1, z0: -off - len / 2, z1: -off + len / 2 },
    { side: 1, z0: off - len / 2, z1: off + len / 2 },
  ];
}

/**
 * Plan of a wardrobe's front: the door columns (x, width, bottom, top), which door holds the mirror and where
 * the drawers go. Exported for the plan symbol and the tests.
 */
export function wardrobeLayout({ widthM, heightM, traits }) {
  const n = clamp(Math.round(traits.doors ?? Math.round(widthM / 0.55)), 1, 6);
  const plinth = 0.07;
  const top = heightM - (traits.niche ? 0.005 : 0.025);
  const upperH = traits.upper ? clamp(heightM * 0.21, 0.3, 0.6) : 0;
  const tallTop = top - upperH;
  const rows = traits.drawers || 0;
  // Drawers never take more than 60% of the height the doors would have
  const rowH = Math.min(
    clamp(heightM * 0.095, 0.14, 0.24),
    ((tallTop - plinth) * 0.6) / (rows || 1)
  );
  const side = traits.niche ? null : rows ? traits.dside || 'full' : null;
  const doorBottom = plinth + (side === 'full' ? rows * rowH : 0);
  const W = widthM - 0.004;
  let niche = null;
  let cols;
  if (traits.niche) {
    const nL = Math.max(1, Math.ceil(n / 2));
    const nR = Math.max(1, n - nL);
    const nw = Math.min(
      widthM * 0.5,
      Math.max(0.4, Math.min(clamp(widthM * 0.34, 0.5, 1.4), widthM - (nL + nR) * 0.3))
    );
    const dw = (W - nw) / (nL + nR);
    const x0 = -W / 2 + nL * dw;
    const counter = Math.min(0.95, Math.max(0.3, heightM * 0.36));
    niche = {
      x0,
      x1: x0 + nw,
      counter,
      top: traits.upper ? tallTop : clamp(top - 0.3, counter + 0.25, top - 0.02),
      rows: traits.drawers || 3,
    };
    cols = [
      ...Array.from({ length: nL }, (_, i) => ({ x: -W / 2 + dw * (i + 0.5), w: dw })),
      ...Array.from({ length: nR }, (_, i) => ({ x: niche.x1 + dw * (i + 0.5), w: dw })),
    ];
  } else {
    const dw = W / n;
    cols = Array.from({ length: n }, (_, i) => ({ x: -W / 2 + dw * (i + 0.5), w: dw }));
  }
  const count = cols.length;
  cols = cols.map((c, i) => {
    const under = (side === 'left' && i === 0) || (side === 'right' && i === count - 1);
    return {
      ...c,
      bottom: under ? plinth + rows * rowH : doorBottom,
      top: tallTop,
      under,
      // handle on the edge that meets the neighbouring door (the middle door of an odd row: its right edge)
      edge:
        count === 1
          ? 1
          : i < count / 2 - 0.01
            ? 1
            : count % 2 === 1 && i === (count - 1) / 2
              ? 1
              : -1,
    };
  });
  // The mirror goes on the most central door that runs full height (left of centre on a tie)
  let mirrorIdx = -1;
  if (traits.mirror) {
    let best = Infinity;
    cols.forEach((c, i) => {
      if (c.under && cols.length > 1) return;
      const d = Math.abs(c.x) + (c.x > 0 ? 1e-6 : 0);
      if (d < best) {
        best = d;
        mirrorIdx = i;
      }
    });
  }
  // Top cupboards: one above each door column, and across the niche in doors about as wide
  const uppers = [];
  if (upperH) {
    for (const c of cols) uppers.push({ x: c.x, w: c.w });
    if (niche) {
      const k = Math.max(1, Math.round((niche.x1 - niche.x0) / cols[0].w));
      const w = (niche.x1 - niche.x0) / k;
      for (let i = 0; i < k; i++) uppers.push({ x: niche.x0 + w * (i + 0.5), w });
    }
    uppers.sort((a, b) => a.x - b.x);
  }
  return { n, plinth, top, upperH, tallTop, rows, rowH, side, cols, niche, mirrorIdx, uppers };
}

/** Thickness of a photo-made desk's legs: read from the photo as a share of its width, within sensible limits. */
export function deskLegThick(widthM, traits) {
  return traits.legFrac ? clamp(traits.legFrac * widthM, 0.03, 0.1) : 0.05;
}

/**
 * Where a desk's supports go: the end frames, any pedestals and the legs, from its traits.
 * A pedestal leaves 50 cm of knee space when the desk is wide enough; on a narrower desk the pedestals share
 * half the clear width, and one that would be under 10 cm wide is left out (the desk keeps its legs instead).
 * A single drawer hangs under the top inside the legs.
 */
export function deskLayout({ widthM, depthM, heightM, traits, legThick = 0.05 }) {
  const topT = (traits.topH ?? 3.5) / 100;
  const under = heightM - topT;
  const base = traits.base || 'legs';
  const ped = traits.ped || 'none';
  const drawers = clamp(Math.round(traits.drawers ?? 3), 1, 4);
  const endT = base === 'panel' ? 0.025 : base === 'sled' ? 0.05 : 0;
  const endX = widthM / 2 - 0.03 - endT / 2;
  const wanted = ped === 'both' ? [-1, 1] : ped === 'left' ? [-1] : ped === 'right' ? [1] : [];
  const hanging = drawers === 1;
  // Outer side of a pedestal: inside the end frames, at the edge of the top, or (a hanging drawer) just inside
  // the inner face of the legs, which stand at the corners however the drawer is placed
  const inner =
    base !== 'legs'
      ? endX - endT / 2 - 0.01
      : hanging
        ? widthM / 2 - 0.03 - legThick - 0.002
        : widthM / 2 - 0.02;
  const pw = Math.min(
    clamp(widthM * 0.3, 0.3, 0.45),
    Math.max(widthM - 0.5, inner) / Math.max(1, wanted.length)
  );
  const sides = pw >= 0.1 ? wanted : [];
  const pedestals = sides.map((s) => ({
    side: s,
    x: s * (inner - pw / 2),
    w: pw,
    y0: hanging ? under - 0.16 : 0.035,
    y1: under - 0.004,
  }));
  // Legs stand at the corners of any side not carried by a full-height pedestal
  const legs =
    base === 'legs'
      ? corners(widthM, depthM, 0.03 + legThick / 2).filter(
          ([x]) => hanging || !sides.includes(Math.sign(x))
        )
      : [];
  return { topT, under, base, endT, endX, pedestals, legs, drawers, hanging };
}

/** Longest bar pull there is (the pull itself clamps to this). */
export const PULL_MAX = 0.45;

/**
 * Height and length of the handle on a door running from `bottom` to `top`: at a comfortable 1.05 m where the
 * door allows, with the whole of a bar kept on the door clear of both ends (centred, and shortened, on a door
 * too short for that). Knobs and rings keep 12 cm from the ends. `length` is the bar wanted.
 */
export function placeDoorHandle({ bottom, top, style, length, at = 1.05 }) {
  const doorH = top - bottom;
  const len =
    style === 'bar' ? Math.min(clamp(length, 0.04, PULL_MAX), Math.max(0.04, doorH - 0.1)) : 0;
  const margin = Math.max(0.12, len / 2 + 0.05);
  const lo = bottom + margin;
  const hi = top - margin;
  return { y: lo > hi ? (bottom + top) / 2 : clamp(at, lo, hi), length: len };
}
