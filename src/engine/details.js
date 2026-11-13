/**
 * details.js
 * The details a photo shows beyond the type and the overall shape, read into the design record's traits:
 * vertical channel tufting and stepped arms on a sofa, a tub chair's thin metal legs and a shell that slopes down
 * to the front, a desk's drawer pedestal, sled base and modesty panel, a tube metal bed with guard rails and
 * castors, and a wardrobe's mirrors, drawers, handles, top cupboards, open niche and fluted doors.
 *
 * Every cue is a plain shape or colour measurement on the normalized views (hull.normalizeView: the piece
 * stretched to a square, `fine` a finer copy for small things), so it works the same on any photo of that kind.
 */
import { findLines, depthProfile, slabOver } from './design.js';
import { threeQuarter } from './oblique.js';

const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const toHex = (rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mean = (list) => {
  const out = [0, 0, 0];
  for (const c of list) for (let k = 0; k < 3; k++) out[k] += c[k] / Math.max(1, list.length);
  return out;
};
const median = (arr) => {
  const a = [...arr].sort((p, q) => p - q);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

/** Hue (0-360), saturation and value (0-1). */
function hsv([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

/** Object pixels of a view inside a region given in 0-1 fractions. */
function pixels(view, x0, y0, x1, y1) {
  const s = view.size;
  const out = [];
  for (let y = Math.max(0, Math.floor(y0 * s)); y < Math.min(s, Math.ceil(y1 * s)); y++)
    for (let x = Math.max(0, Math.floor(x0 * s)); x < Math.min(s, Math.ceil(x1 * s)); x++) {
      const p = y * s + x;
      if (view.mask[p]) out.push([view.rgb[p * 3], view.rgb[p * 3 + 1], view.rgb[p * 3 + 2]]);
    }
  return out;
}

/** Share of a region that is object (with gaps open when the view has an open mask). */
function fill(view, x0, y0, x1, y1, open = false) {
  const s = view.size;
  const mask = (open && view.open) || view.mask;
  let n = 0;
  let t = 0;
  for (let y = Math.max(0, Math.floor(y0 * s)); y < Math.min(s, Math.ceil(y1 * s)); y++)
    for (let x = Math.max(0, Math.floor(x0 * s)); x < Math.min(s, Math.ceil(x1 * s)); x++) {
      t++;
      n += mask[y * s + x];
    }
  return t ? n / t : 0;
}

/** How evenly spaced a set of line positions is: 0 for a perfect comb, larger for uneven seams. */
function unevenness(lines) {
  if (lines.length < 3) return 1;
  const gaps = [];
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i] - lines[i - 1]);
  const m = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - m) ** 2, 0) / gaps.length);
  return sd / Math.max(1e-6, m);
}

// ---------- sofas and armchairs ----------

/**
 * Vertical channel tufting: the back (and usually the seat front and arms) is stitched into many narrow upright
 * channels, a comb of evenly spaced vertical grooves. Plain cushions show one seam per cushion at most.
 */
export function channelTufting(view) {
  const v = view?.fine || view;
  if (!v) return false;
  const back = findLines(v, 'x', [0.06, 0.1, 0.94, 0.4], 4);
  const seat = findLines(v, 'x', [0.06, 0.55, 0.94, 0.85], 4);
  // a comb: many grooves, evenly spaced, across a good part of the width (carving or a printed cloth is not)
  const comb = (lines) =>
    lines.length >= 7 && unevenness(lines) < 0.6 && lines[lines.length - 1] - lines[0] >= 0.35;
  return comb(back) || comb(seat);
}

/**
 * Stepped (terraced) arms: an arm built of stacked slabs, each lower and longer than the one above. Seen from the
 * front or three quarters, an end of the outline shows two or more level grooves one over the other above the seat.
 */
export function steppedArms(view) {
  const v = view?.fine || view;
  if (!v) return false;
  // the shadow lines between the slabs: three or more level grooves, evenly spaced, over one end
  const terraced = (x0, x1) => {
    const lines = findLines(v, 'y', [x0, 0.06, x1, 0.5], 4);
    if (lines.length < 3) return false;
    const gaps = lines.slice(1).map((y, i) => y - lines[i]);
    return gaps.every((g) => g >= 0.04 && g <= 0.13) && unevenness(lines) < 0.45;
  };
  return terraced(0.02, 0.3) || terraced(0.7, 0.98);
}

/**
 * The colour of the legs or feet: the thin runs of the outline below the body (gold sockets, chrome tubes, wood
 * feet), not the shadowed underside of the body.
 */
export function legColour(view) {
  const v = view?.fine || view;
  if (!v) return null;
  const s = v.size;
  // Feet and legs are the narrow runs of the outline at its lower edge, column by column (seen from three
  // quarters the lower edge slants, so the body's bottom is found locally): below the body a leg is a short run
  const found = [];
  const taken = new Uint8Array(s * s);
  for (let x = 0; x < s; x++) {
    let b = -1;
    for (let y = s - 1; y >= 0; y--)
      if (v.mask[y * s + x]) {
        b = y;
        break;
      }
    if (b < s * 0.5) continue;
    for (let y = b; y > b - s * 0.08 && y >= 0; y--) {
      if (!v.mask[y * s + x]) break;
      let l = x;
      let r = x;
      while (l > 0 && v.mask[y * s + l - 1]) l--;
      while (r < s - 1 && v.mask[y * s + r + 1]) r++;
      if (r - l + 1 > s * 0.06) break; // the body: a wide run
      const p = y * s + x;
      if (!taken[p]) {
        taken[p] = 1;
        found.push([v.rgb[p * 3], v.rgb[p * 3 + 1], v.rgb[p * 3 + 2]]);
      }
    }
  }
  if (found.length < 6) return null;
  // the lit half: the deep shadow on the inner side of a leg is not its colour
  found.sort((a, b) => luma(b) - luma(a));
  return toHex(mean(found.slice(0, Math.ceil(found.length * 0.6))));
}

// ---------- tub chairs ----------

/** Thin metal legs: slim runs reaching the floor below the shell, grey or black (chrome, steel), not wood. */
export function metalLegs(view, legHex) {
  if (!view || !legHex) return false;
  const v = view.fine || view;
  const s = v.size;
  const row = Math.round(s * 0.96);
  let runs = 0;
  let thin = 0;
  let x = 0;
  while (x < s) {
    if (!v.mask[row * s + x]) {
      x++;
      continue;
    }
    let e = x;
    while (e < s && v.mask[row * s + e]) e++;
    runs++;
    if ((e - x) / s <= 0.05) thin++;
    x = e;
  }
  const [h, sat] = hsv(hexRgb(legHex));
  const wood = h >= 8 && h <= 48 && sat >= 0.3;
  return runs >= 2 && thin === runs && !wood;
}

/**
 * A shell that wraps round the seat and slopes down to the front: seen from the side, the top of the outline falls
 * gradually from the back over most of the depth, instead of dropping to level arms.
 */
export function wrapsDown(views) {
  const profile = depthProfile(views);
  if (!profile) return false;
  const p = Array.from(profile);
  const n = p.length;
  const top = Math.max(...p.slice(0, Math.round(n * 0.4)));
  const front = median(p.slice(Math.round(n * 0.88)));
  if (top - front < 0.2) return false;
  // where the outline is between its top and its front height: falling, not level
  let falling = 0;
  for (let i = 0; i < n; i++) if (p[i] < top - 0.06 && p[i] > front + 0.06) falling++;
  // and it falls steadily: no long level stretch (an arm) half way down
  return falling / n >= 0.35;
}

// ---------- desks ----------

/**
 * A desk's base: which side has a drawer pedestal and how many drawers it holds, whether the other side stands on
 * a sled (a C-shaped tube with a foot running along the floor), and a modesty panel hanging under the top
 * between the supports.
 */
export function deskDetails(view) {
  const v = view?.fine || view;
  if (!v) return {};
  const flat = slabOver(v);
  const out = {};
  // The top itself: the rows as wide as the widest (a top overhangs its base; a modesty panel set between the
  // legs is a little narrower, so it is not taken for part of the top)
  const s0 = v.size;
  const widths = [];
  for (let y = 0; y < s0; y++) {
    let n = 0;
    for (let x = 0; x < s0; x++) n += v.mask[y * s0 + x];
    widths.push(n);
  }
  const widest = Math.max(...widths);
  let topEnd = widths.findIndex((n) => n >= widest * 0.95);
  while (topEnd + 1 < s0 && widths[topEnd + 1] >= widest * 0.95) topEnd++;
  const under = Math.min(0.9, Math.min(flat.first + flat.slab, (topEnd + 1) / s0) + 0.02);
  if (flat.pedestal === 'left' || flat.pedestal === 'right' || flat.pedestal === 'both') {
    out.ped = flat.pedestal;
    // drawers: the pulls one over the other on the pedestal, else the level seams between its drawers
    const [x0, x1] =
      flat.pedestal === 'left' ? [0, 0.55] : flat.pedestal === 'right' ? [0.35, 1] : [0, 1];
    const col = pullColumn(findPulls(v).pulls, x0, x1, under);
    const lines = findLines(v, 'y', [x0 + 0.04, under + 0.04, x1 - 0.04, 0.95], 4);
    out.drawers = Math.max(1, Math.min(4, col.length || lines.length + 1));
  }
  // The open side's support. Four legs touch the floor at a few points (the outline's lower edge jumps between
  // leg feet and the apron); a sled's foot runs along the floor (a long unbroken lower edge low down) with open
  // space above it; a panel end is solid from the top to the floor.
  const s = v.size;
  if (out.ped !== 'both') {
    const [a, b] = out.ped === 'left' ? [0.62, 1] : out.ped === 'right' ? [0, 0.38] : [0, 0.3];
    const bottoms = [];
    for (let x = Math.round(a * s); x < Math.round(b * s); x++) {
      let low = -1;
      for (let y = s - 1; y >= 0; y--)
        if (v.mask[y * s + x]) {
          low = y / s;
          break;
        }
      bottoms.push(low);
    }
    const floor = Math.max(...bottoms);
    const legLow = under + (floor - under) * 0.6;
    let run = 0;
    let longest = 0;
    let at = 0;
    for (let i = 0; i < bottoms.length; i++) {
      const ok = bottoms[i] >= legLow && (i === 0 || Math.abs(bottoms[i] - bottoms[i - 1]) < 0.025);
      run = ok ? run + 1 : 0;
      if (run > longest) ((longest = run), (at = i));
    }
    if (longest / s >= 0.14) {
      // what stands above the foot run, under the top: open for a sled, solid for a panel
      const x0 = a + (at - longest + 1) / s;
      const x1 = a + (at + 1) / s;
      const above = fill(v, x0, under + 0.03, x1, legLow - 0.04, true);
      out.base = above >= 0.8 ? 'panel' : 'sled';
    }
  }
  // a modesty panel: under the top, between the supports, the upper part is solid and the lower part open
  const mid = out.ped === 'left' ? [0.45, 0.8] : out.ped === 'right' ? [0.2, 0.55] : [0.3, 0.7];
  const span = 0.95 - under;
  const upper = fill(v, mid[0], under + 0.02, mid[1], under + span * 0.3, true);
  const lower = fill(v, mid[0], under + span * 0.7, mid[1], 0.97, true);
  if (upper >= 0.75 && lower <= 0.35) out.modesty = 1;
  // nothing but legs under the top: said so, so the model is a plain four-legged desk
  if (!out.ped && !out.base && !out.modesty) out.base = 'legs';
  return out;
}

// ---------- beds ----------

/**
 * A tube metal bed: head and foot ends of thin spindles you can see through, side guard rails above the mattress,
 * and castors under the legs.
 */
export function metalBed(views) {
  const F = views.front || views.back;
  const S = views.left || views.right;
  const out = {};
  const thinFrame = (v, y0, y1) => {
    if (!v) return false;
    const see = 1 - fill(v, 0.05, y0, 0.95, y1, true);
    // members are thin: in the end's rows, the runs of object are short
    const f = v.fine || v;
    const s = f.size;
    let runs = 0;
    let thin = 0;
    for (let y = Math.round(y0 * s); y < Math.round(y1 * s); y += 2) {
      let x = 0;
      while (x < s) {
        if (!f.mask[y * s + x]) {
          x++;
          continue;
        }
        let e = x;
        while (e < s && f.mask[y * s + e]) e++;
        runs++;
        if ((e - x) / s <= 0.06) thin++;
        x = e;
      }
    }
    return see >= 0.3 && runs >= 6 && thin / runs >= 0.6;
  };
  // Spindles: a comb of thin dark uprights over the pale mattress or backdrop (a small photo fills the gaps
  // between them in, but the rods still show as dark lines)
  const spindles = (v) => {
    const f = v?.fine || v;
    if (!f) return 0;
    const lines = findLines(f, 'x', [0.04, 0.1, 0.96, 0.7], 3);
    const dark = lines.filter((x) => {
      const col = pixels(f, x - 0.004, 0.1, x + 0.004, 0.7);
      const side = [
        ...pixels(f, x - 0.03, 0.1, x - 0.015, 0.7),
        ...pixels(f, x + 0.015, 0.1, x + 0.03, 0.7),
      ];
      return col.length && side.length && luma(mean(col)) < luma(mean(side)) - 12;
    });
    return dark.length >= 4 && unevenness(dark) < 0.7 ? dark.length : 0;
  };
  const frameHex = F ? pixels(F, 0.05, 0.8, 0.95, 1) : [];
  const [fh, fs] = frameHex.length ? hsv(mean(frameHex)) : [0, 0];
  const woodFrame = fh >= 8 && fh <= 48 && fs >= 0.3;
  if (thinFrame(F, 0.04, 0.4) || (spindles(F) && !woodFrame)) out.metal = 1;
  // guard rails: a longer comb of spindles over the mattress, seen along the side of the bed
  const railed = [F, S].some((v) => v && spindles(v) >= 5);
  if (out.metal && (thinFrame(S, 0.05, 0.35) || railed)) out.rails = 1;
  // a tube bed has rails at both ends
  if (out.metal) out.foot = 1;
  // castors: each leg ends in a blob wider than the leg just above it
  const v = F?.fine || F;
  if (out.metal && v) {
    const s = v.size;
    const runs = (yf) => {
      const y = Math.min(s - 1, Math.round(yf * s));
      const list = [];
      let x = 0;
      while (x < s) {
        if (!v.mask[y * s + x]) {
          x++;
          continue;
        }
        let e = x;
        while (e < s && v.mask[y * s + e]) e++;
        list.push(e - x);
        x = e;
      }
      return list;
    };
    const foot = runs(0.97);
    const leg = runs(0.88);
    if (foot.length >= 2 && leg.length >= 2 && median(foot) >= median(leg) * 1.6) out.casters = 1;
  }
  return out;
}

// ---------- wardrobes ----------

/** Connected regions of a boolean grid (4-neighbour), with their boxes and pixel counts. */
function regions(on, s) {
  const seen = new Uint8Array(s * s);
  const out = [];
  for (let p = 0; p < on.length; p++) {
    if (!on[p] || seen[p]) continue;
    const stack = [p];
    seen[p] = 1;
    const r = { n: 0, x0: s, y0: s, x1: 0, y1: 0, cells: [] };
    while (stack.length) {
      const q = stack.pop();
      const x = q % s;
      const y = (q - x) / s;
      r.n++;
      r.cells.push(q);
      r.x0 = Math.min(r.x0, x);
      r.x1 = Math.max(r.x1, x);
      r.y0 = Math.min(r.y0, y);
      r.y1 = Math.max(r.y1, y);
      for (const nb of [q - 1, q + 1, q - s, q + s]) {
        if (nb < 0 || nb >= on.length || seen[nb] || !on[nb]) continue;
        if (Math.abs((nb % s) - x) > 1) continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    out.push(r);
  }
  return out;
}

/**
 * Pulls and handles on a front: small marks that stand out in colour from the surface they sit on (brass on
 * teal, chrome on oak; wood grain only differs a little in brightness). Long thin ones are bars; small round
 * ones are rings when hollow (the rim stands out, the middle shows the door) and knobs when solid.
 * @returns {{ pulls: Array<{x: number, y: number, size: number, kind: 'bar'|'ring'|'knob', c: number[]}> }}
 */
export function findPulls(v) {
  const s = v.size;
  const at = (p) => [v.rgb[p * 3], v.rgb[p * 3 + 1], v.rgb[p * 3 + 2]];
  const marks = new Uint8Array(s * s);
  const R = Math.max(4, Math.round(s * 0.025));
  for (let y = R; y < s - R; y++)
    for (let x = R; x < s - R; x++) {
      const p = y * s + x;
      if (!v.mask[p]) continue;
      // the local surface: the median colour of a ring of pixels a little way off
      const ring = [];
      for (const [dx, dy] of [
        [-R, 0],
        [R, 0],
        [0, -R],
        [0, R],
        [-R, -R],
        [R, R],
        [-R, R],
        [R, -R],
      ]) {
        const q = (y + dy) * s + x + dx;
        if (v.mask[q]) ring.push(at(q));
      }
      if (ring.length < 6) continue;
      const surface = [0, 1, 2].map((k) => median(ring.map((r) => r[k])));
      if (dist(at(p), surface) > 48) marks[p] = 1;
    }
  // join the pieces of one handle (a ring breaks up into its rim) before reading shapes
  let joined = marks;
  for (let pass = 0; pass < 2; pass++) {
    const next = Uint8Array.from(joined);
    for (let p = s; p < s * s - s; p++)
      if (!joined[p] && joined[p - 1] + joined[p + 1] + joined[p - s] + joined[p + s] >= 2)
        next[p] = 1;
    joined = next;
  }
  const pulls = [];
  for (const r of regions(joined, s)) {
    if (r.n < 5 || r.x1 - r.x0 + 1 > s * 0.14 || r.y1 - r.y0 + 1 > s * 0.3) continue;
    const bw = r.x1 - r.x0 + 1;
    const bh = r.y1 - r.y0 + 1;
    const long = Math.max(bw, bh) / Math.min(bw, bh);
    const x = (r.x0 + r.x1) / 2 / s;
    const y = (r.y0 + r.y1) / 2 / s;
    const c = mean(r.cells.filter((q) => marks[q]).map(at));
    if (long >= 2.8 && Math.max(bw, bh) >= s * 0.06)
      pulls.push({ x, y, size: Math.max(bw, bh) / s, kind: 'bar', across: bw > bh, c });
    else if (long <= 1.9 && Math.max(bw, bh) <= s * 0.08 && Math.min(bw, bh) >= s * 0.02) {
      const raw = r.cells.filter((q) => marks[q]).length;
      // two pieces of one pull close together are one pull
      const near = pulls.find(
        (h) => h.kind !== 'bar' && Math.abs(h.x - x) < 0.05 && Math.abs(h.y - y) < 0.05
      );
      if (near) {
        near.size = Math.max(near.size, Math.hypot(near.x - x, near.y - y) + Math.max(bw, bh) / s);
        continue;
      }
      pulls.push({ x, y, size: Math.max(bw, bh) / s, fill: raw / (bw * bh), kind: 'knob', c });
    } else continue;
  }
  for (const h of pulls) if (h.kind === 'knob' && h.fill < 0.7 && h.size >= 0.04) h.kind = 'ring';
  return { pulls };
}

/** Pulls one over the other, evenly spaced (one per drawer of a stack): the longest such column. */
function pullColumn(pulls, x0, x1, y0) {
  const low = pulls.filter((h) => h.x >= x0 && h.x <= x1 && h.y > y0).sort((a, b) => a.y - b.y);
  let best = [];
  for (const h of low) {
    const col = low.filter((g) => Math.abs(g.x - h.x) < 0.06);
    if (col.length > best.length) best = col;
  }
  const even =
    best.length >= 2 &&
    best.slice(1).every((g, i) => g.y - best[i].y >= 0.07 && g.y - best[i].y <= 0.3);
  return even ? best : [];
}
/** k-means colour clusters of a view's object pixels: [{ c: [r, g, b], n }] biggest first. */
function colourClusters(v, k) {
  const s = v.size;
  const list = [];
  for (let p = 0; p < s * s; p += 2)
    if (v.mask[p]) list.push([v.rgb[p * 3], v.rgb[p * 3 + 1], v.rgb[p * 3 + 2]]);
  if (!list.length) return [];
  // spread the starting centres: each next one is the colour farthest from those chosen
  const centres = [mean(list)];
  while (centres.length < k) {
    let far = list[0];
    let fd = -1;
    for (const c of list) {
      const d = Math.min(...centres.map((m) => dist(c, m)));
      if (d > fd) ((fd = d), (far = c));
    }
    if (fd < 20) break;
    centres.push(far);
  }
  let groups = [];
  for (let it = 0; it < 8; it++) {
    groups = centres.map(() => []);
    for (const c of list) {
      let best = 0;
      for (let i = 1; i < centres.length; i++)
        if (dist(c, centres[i]) < dist(c, centres[best])) best = i;
      groups[best].push(c);
    }
    groups.forEach((g, i) => g.length && (centres[i] = mean(g)));
  }
  return centres
    .map((c, i) => ({ c, n: groups[i].length * 2 }))
    .filter((g) => g.n)
    .sort((a, b) => b.n - a.n);
}

/**
 * A wardrobe's details from its front: the colour of its doors when they differ from the carcass, an oval mirror
 * set in a door or a full-height mirror door, a stack of drawers under one door or across the bottom, the kind of
 * handles and their colour, a row of top cupboards, an open niche with a mirror and counter, and fluted doors.
 */
export function wardrobeDetails(view, front = [0, 1]) {
  const v = view?.fine || view;
  if (!v) return { traits: {}, palette: {} };
  const s = v.size;
  const traits = {};
  const palette = {};
  const at = (p) => [v.rgb[p * 3], v.rgb[p * 3 + 1], v.rgb[p * 3 + 2]];
  // The main surface colours (carcass, doors): a few colour clusters of the front, biggest first
  const ranked = colourClusters(v, 4);
  const total = ranked.reduce((a, b) => a + b.n, 0);
  if (!ranked.length) return { traits, palette };
  // the carcass is what frames the front: the colour along the top and the sides of the outline
  const rim = [
    ...pixels(v, 0.02, 0.0, 0.98, 0.04),
    ...pixels(v, 0.0, 0.05, 0.04, 0.95),
    ...pixels(v, 0.96, 0.05, 1, 0.95),
  ];
  const rimC = rim.length ? mean(rim) : ranked[0].c;
  const main = ranked.reduce((b, g) => (dist(g.c, rimC) < dist(b.c, rimC) ? g : b), ranked[0]).c;
  // a second big surface far from the first, laid out as an upright door-sized block: two-tone doors
  const second = ranked.find((b) => dist(b.c, main) > 70 && b.n / total >= 0.1);
  if (second) {
    const on = new Uint8Array(s * s);
    for (let p = 0; p < s * s; p++) if (v.mask[p] && dist(at(p), second.c) < 45) on[p] = 1;
    const block = regions(on, s).sort((a, b) => b.n - a.n)[0];
    if (block) {
      const bw = (block.x1 - block.x0 + 1) / s;
      const bh = (block.y1 - block.y0 + 1) / s;
      const solid = block.n / ((block.x1 - block.x0 + 1) * (block.y1 - block.y0 + 1));
      if (bh >= 0.35 && bw >= 0.18 && bw <= 0.75 && solid >= 0.7) {
        palette.door = toHex(second.c);
        palette.body = toHex(main);
      }
    }
  }
  // Mirrors: a region unlike the carcass around it. An oval one is an upright ellipse (its box about 78% full);
  // a mirror door is a tall rectangle full of reflected room (it varies far more than a plain door)
  const off = new Uint8Array(s * s);
  for (let y = Math.round(s * 0.04); y < Math.round(s * 0.96); y++)
    for (let x = Math.round(s * 0.04); x < Math.round(s * 0.96); x++) {
      const p = y * s + x;
      if (v.mask[p] && dist(at(p), main) > 55) off[p] = 1;
    }
  for (const r of regions(off, s)) {
    const bw = (r.x1 - r.x0 + 1) / s;
    const bh = (r.y1 - r.y0 + 1) / s;
    const boxFill = r.n / ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1));
    if (bh >= 0.35 && bw >= 0.1 && bw <= 0.45 && bh / bw >= 1.6) {
      if (boxFill >= 0.62 && boxFill <= 0.88) {
        // an ellipse: its box's corners are empty while its middle row is full
        const mid = Math.round((r.y0 + r.y1) / 2);
        let midRun = 0;
        for (let x = r.x0; x <= r.x1; x++) midRun += off[mid * s + x];
        const corner = r.cells.filter((q) => {
          const x = q % s;
          const y = (q - x) / s;
          const fx = (x - r.x0) / Math.max(1, r.x1 - r.x0) - 0.5;
          const fy = (y - r.y0) / Math.max(1, r.y1 - r.y0) - 0.5;
          return fx * fx + fy * fy > 0.3;
        }).length;
        if (midRun >= (r.x1 - r.x0 + 1) * 0.8 && corner <= r.n * 0.06) traits.mirror = 2;
      } else if (boxFill > 0.88 && bh >= 0.5) {
        const lum = r.cells.map((q) => luma(at(q)));
        const m = lum.reduce((a, b) => a + b, 0) / lum.length;
        const sd = Math.sqrt(lum.reduce((a, b) => a + (b - m) ** 2, 0) / lum.length);
        if (sd >= 24) traits.mirror = traits.mirror || 1;
      }
    }
  }
  // Drawers: a stack of level seams in the lower part of one door column (the columns are split at the upright
  // door seams), under one door or across the whole width
  const seams = findLines(v, 'x', [0.03, 0.15, 0.97, 0.6], 4);
  const edges = [0, ...seams, 1];
  const stacks = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const [x0, x1] = [edges[i] + 0.03, edges[i + 1] - 0.03];
    if (x1 - x0 < 0.14) continue;
    const lines = findLines(v, 'y', [x0, 0.4, x1, 0.97], 4).filter((y) => y > 0.42);
    const regular =
      lines.length >= 2 &&
      lines.slice(1).every((y, k) => y - lines[k] >= 0.06 && y - lines[k] <= 0.24);
    if (regular) stacks.push({ x: (x0 + x1) / 2, n: lines.length, span: x1 - x0 });
  }
  if (stacks.length) {
    const n = Math.round(stacks.reduce((a, b) => a + b.n, 0) / stacks.length);
    traits.drawers = Math.max(1, Math.min(4, n));
    const span = stacks.reduce((a, b) => a + b.span, 0);
    const mid = (front[0] + front[1]) / 2;
    const onLeft = stacks.every((st) => st.x < mid);
    const onRight = stacks.every((st) => st.x >= mid);
    traits.dside = span >= 0.6 || (!onLeft && !onRight) ? 'full' : onLeft ? 'left' : 'right';
  }
  // Handles: small marks that stand out from the door they sit on (see findPulls)
  const { pulls } = findPulls(v);
  const kinds = { bar: 0, ring: 0, knob: 0 };
  for (const h of pulls) kinds[h.kind]++;
  const best = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0];
  if (wardrobeDetails.debug)
    wardrobeDetails.debug({
      kinds,
      pulls,
      main,
      second: second && [second.c, second.n / total],
      off: regions(off, s)
        .filter((r) => r.n > 40)
        .map((r) => [r.x0, r.y0, r.x1 - r.x0 + 1, r.y1 - r.y0 + 1, r.n]),
    });
  if (best[1] >= 2) traits.handle = best[0];
  // Drawers counted by their handles when the seams are too faint: round pulls one over the other in the lower
  // part, evenly spaced, one per drawer
  if (!traits.drawers) {
    const bestCol = pullColumn(
      pulls.filter((h) => h.kind !== 'bar' || h.across),
      0,
      1,
      0.5
    );
    if (bestCol.length) {
      traits.drawers = Math.min(4, bestCol.length);
      // where the pulls sit across the front face (a three-quarter view shows a side face beside it)
      const x = (bestCol[0].x - front[0]) / Math.max(0.2, front[1] - front[0]);
      traits.dside = x < 0.4 ? 'left' : x > 0.6 ? 'right' : 'full';
    }
  }
  // Gold or brass handles: two or more of the pulls of the kind found are a saturated warm yellow
  const goldPulls = pulls.filter((h) => {
    if (h.kind !== traits.handle) return false;
    const [hue, sat, val] = hsv(h.c);
    return hue >= 28 && hue <= 58 && sat >= 0.28 && val >= 0.4;
  });
  if (goldPulls.length >= 2) palette.trim = toHex(mean(goldPulls.map((h) => h.c)));
  // Top cupboards: a level seam across most of the width high up
  const high = findLines(v, 'y', [0.08, 0.1, 0.92, 0.34], 4);
  if (high.length) {
    const y = high[0];
    let across = 0;
    let n = 0;
    for (let x = Math.round(s * 0.08); x < Math.round(s * 0.92); x++) {
      const p = Math.round(y * s) * s + x;
      if (!v.mask[p]) continue;
      n++;
      const above = luma(at(Math.max(0, p - 2 * s)));
      const below = luma(at(Math.min(s * s - 1, p + 2 * s)));
      if (luma(at(p)) < Math.min(above, below) - 6 || luma(at(p)) > Math.max(above, below) + 6)
        across++;
    }
    if (n && across / n >= 0.55) traits.upper = 1;
  }
  // An open niche: the middle of the front, between tall side columns, unlike the doors (mirror, shelf, room seen
  // in the glass) above a light counter
  const leftCol = pixels(v, 0.04, 0.3, 0.22, 0.6);
  const rightCol = pixels(v, 0.78, 0.3, 0.96, 0.6);
  const sides = [...leftCol, ...rightCol];
  const middle = pixels(v, 0.32, 0.3, 0.68, 0.55);
  // (both side columns are plain carcass-coloured doors; two-tone doors are not a niche)
  const plainSides =
    leftCol.length > 10 &&
    rightCol.length > 10 &&
    dist(mean(leftCol), main) < 40 &&
    dist(mean(rightCol), main) < 40 &&
    !palette.door;
  if (plainSides && middle.length > 20) {
    const sd = (list) => {
      const l = list.map(luma);
      const m = l.reduce((a, b) => a + b, 0) / l.length;
      return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length);
    };
    const counter = pixels(v, 0.3, 0.55, 0.7, 0.68).filter((c) => luma(c) > luma(main) + 40);
    if (
      (dist(mean(middle), mean(sides)) > 30 || sd(middle) > sd(sides) * 1.8) &&
      counter.length >= middle.length * 0.08
    )
      traits.niche = 1;
  }
  // Fluted doors: a fine comb of evenly spaced upright grooves on the door faces
  const flutes = findLines(v, 'x', [0.04, 0.08, 0.96, 0.4], 2);
  if (flutes.length >= 10 && unevenness(flutes) < 0.8) traits.fluted = 1;
  return { traits, palette };
}

/**
 * The details for a type, merged into the design record by buildDesign.
 * @param {{widthPerHeight?: number|null}} [hints] the photos' proportions (to read a three-quarter front)
 */
export function detailTraits(type, views, palette, hints = {}) {
  const F = views.front || views.back || null;
  const out = { traits: {}, palette: {} };
  if (!F) return out;
  // A three-quarter view shows the front face on one side of the near corner and a side face on the other
  const q =
    !views.left && !views.right && hints.widthPerHeight
      ? threeQuarter(F, hints.widthPerHeight)
      : null;
  const front = q ? (q.frontOn === 'left' ? [0, q.near] : [q.near, 1]) : [0, 1];
  if (type === 'sofa' || type === 'armchair') {
    if (channelTufting(F)) {
      out.traits.chan = 1;
      // channel stitching is the back's upholstery: the dimples between its channels are no buttons
      out.traits.tufted = 0;
      // channel-stitched sofas sit on one long bench cushion
      if (type === 'sofa') out.traits.longSeat = 1;
    }
    if (type === 'sofa' && steppedArms(F)) out.traits.step = 1;
  } else if (type === 'tub-chair') {
    const leg = legColour(F);
    if (leg) out.palette.leg = leg;
    if (metalLegs(F, leg)) out.traits.base = 'metal';
    if (wrapsDown(views)) out.traits.wrap = 1;
  } else if (type === 'desk') {
    Object.assign(out.traits, deskDetails(F));
  } else if (type === 'bed') {
    Object.assign(out.traits, metalBed(views));
    // the tubes are one colour, head to foot: the frame's colour as read along the base
    if (out.traits.metal && palette.base) out.palette.body = palette.base;
  } else if (type === 'wardrobe') {
    const w = wardrobeDetails(F, front);
    Object.assign(out.traits, w.traits);
    Object.assign(out.palette, w.palette);
  }
  if (type === 'sofa' || type === 'armchair') {
    const leg = legColour(F);
    if (leg && palette.leg && !palette.frame) out.palette.leg = leg;
  }
  return out;
}
