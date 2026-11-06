/**
 * frontModel.js
 * Telling what a piece is from one photo. A lone picture has no side or plan view, so the type has to come from
 * the silhouette and a few internal cues: proportions, space under the piece (legs), the thickness of a top, how
 * wide each band of the outline is (a back above a seat, arms, a headboard over a mattress), seams (doors,
 * drawers, cushions, shelves) and how see-through it is.
 *
 * Each type has a typical value and spread for every cue (frontModel.data.js, written by
 * scripts/photo-harness/synth/train.js from the procedural corpus). A piece is scored against every type, so the
 * answer comes with a ranking and a margin: a close second is what the dialog shows as a low-confidence "Looks
 * like" choice instead of a silent wrong guess.
 */
import { findLines, measureTraits } from './design.js';
import { FRONT_MODEL } from './frontModel.data.js';

const BANDS = [
  [0, 0.08],
  [0.08, 0.25],
  [0.25, 0.45],
  [0.45, 0.65],
  [0.65, 0.85],
  [0.85, 1],
];

export const FEATURE_NAMES = [
  'logWh',
  'gap',
  'slab',
  'fill',
  'w0',
  'w1',
  'w2',
  'w3',
  'w4',
  'w5',
  'span0',
  'span2',
  'span5',
  'edgeUp',
  'edgeLow',
  'centreTop',
  'seamV',
  'seamH',
  'see',
  'topNarrow',
  'sym',
  'layers',
  'light',
  'lightY',
  'wood',
  'darkLow',
  'topBump',
];

const lumaOf = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Colour cues: layers down the middle, very light cloth, wood tones, dark feet. */
function colourCues(view) {
  const s = view.size;
  let n = 0;
  let light = 0;
  let lightY = 0;
  let wood = 0;
  let darkLow = 0;
  let lowN = 0;
  const rows = [];
  for (let y = 0; y < s; y++) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let k = 0;
    for (let x = 0; x < s; x++) {
      const p = y * s + x;
      if (!view.mask[p]) continue;
      const r = view.rgb[p * 3];
      const g = view.rgb[p * 3 + 1];
      const b = view.rgb[p * 3 + 2];
      n++;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const luma = lumaOf(r, g, b);
      if (luma > 200 && (mx - mn) / Math.max(1, mx) < 0.14) {
        light++;
        lightY += y / s;
      }
      // brown, orange and tan: stained wood (hue about 8-48 degrees, moderately saturated)
      if (mx > 40 && mx - mn > 0.3 * mx) {
        const d = mx - mn;
        let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        if (h >= 8 && h <= 48 && (mx - mn) / mx <= 0.9) wood++;
      }
      if (y > s * 0.7) {
        lowN++;
        if (luma < 55) darkLow++;
      }
      if (x > s * 0.3 && x < s * 0.7) {
        sr += r;
        sg += g;
        sb += b;
        k++;
      }
    }
    rows.push(k > 3 ? [sr / k, sg / k, sb / k] : null);
  }
  // distinct colour layers down the centre: headboard, pillows, duvet, sheet, base
  let layers = 0;
  let ref = null;
  let run = 0;
  for (const c of rows) {
    if (!c) continue;
    if (!ref) {
      ref = c;
      continue;
    }
    const d = Math.hypot(c[0] - ref[0], c[1] - ref[1], c[2] - ref[2]);
    if (d > 38) {
      run++;
      if (run >= 3) {
        layers++;
        ref = c;
        run = 0;
      }
    } else {
      run = 0;
      ref = ref.map((v, i) => v * 0.8 + c[i] * 0.2);
    }
  }
  return {
    layers: Math.min(8, layers),
    light: n ? light / n : 0,
    lightY: light ? lightY / light : 0.5,
    wood: n ? wood / n : 0,
    darkLow: lowN ? darkLow / lowN : 0,
  };
}

/**
 * Cue values for a front-ish view.
 * @param {{mask: Uint8Array, size: number, open?: Uint8Array, rgb: Uint8Array}} view
 * @param {number} wh width over height of the picture's cut-out
 */
export function frontFeatures(view, wh) {
  const s = view.size;
  const count = new Float32Array(s);
  const span = new Float32Array(s);
  for (let y = 0; y < s; y++) {
    let n = 0;
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < s; x++)
      if (view.mask[y * s + x]) {
        n++;
        if (lo < 0) lo = x;
        hi = x;
      }
    count[y] = n / s;
    span[y] = lo < 0 ? 0 : (hi - lo + 1) / s;
  }
  const band = (arr, [a, b]) => {
    let sum = 0;
    let k = 0;
    for (let y = Math.floor(a * s); y < Math.max(Math.floor(a * s) + 1, Math.ceil(b * s)); y++) {
      sum += arr[Math.min(s - 1, y)];
      k++;
    }
    return sum / Math.max(1, k);
  };
  let total = 0;
  for (let p = 0; p < s * s; p++) total += view.mask[p];
  const region = (x0, y0, x1, y1, mask = view.mask) => {
    let n = 0;
    let t = 0;
    for (let y = Math.floor(y0 * s); y < Math.ceil(y1 * s); y++)
      for (let x = Math.floor(x0 * s); x < Math.ceil(x1 * s); x++) {
        t++;
        n += mask[y * s + x];
      }
    return t ? n / t : 0;
  };
  const traits = measureTraits({ front: view });
  const seamsV = findLines(view, 'x', [0.1, 0.2, 0.9, 0.8]).length;
  const seamsH = findLines(view, 'y', [0.12, 0.1, 0.88, 0.9], 5).length;
  const see = view.open ? region(0.1, 0.1, 0.9, 0.9, view.open) : region(0.1, 0.1, 0.9, 0.9);
  const w = BANDS.map((b) => band(count, b));
  const colour = colourCues(view);
  // left-right symmetry of the outline: a straight-on picture mirrors onto itself, a three-quarter one does not
  let both = 0;
  let either = 0;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const a = view.mask[y * s + x];
      const b = view.mask[y * s + (s - 1 - x)];
      both += a & b;
      either += a | b;
    }
  // how much the middle of the top edge stands above its shoulders (a crest, a headboard, a back)
  const topAt = (x) => {
    for (let y = 0; y < s; y++) if (view.mask[y * s + x]) return y / s;
    return 1;
  };
  const mid = Math.min(
    topAt(Math.floor(s * 0.45)),
    topAt(Math.floor(s * 0.5)),
    topAt(Math.floor(s * 0.55))
  );
  const shoulder = (topAt(Math.floor(s * 0.12)) + topAt(Math.floor(s * 0.88))) / 2;
  return [
    Math.log(Math.min(6, Math.max(0.15, wh))),
    Math.min(0.9, traits.gapFrac),
    traits.slabFrac,
    total / (s * s),
    ...w,
    band(span, BANDS[0]),
    band(span, BANDS[2]),
    band(span, BANDS[5]),
    region(0, 0, 0.1, 0.5) + region(0.9, 0, 1, 0.5),
    region(0, 0.5, 0.1, 1) + region(0.9, 0.5, 1, 1),
    region(0.3, 0, 0.7, 0.15),
    Math.min(6, seamsV),
    Math.min(6, seamsH),
    see,
    Math.max(0, w[3] - w[0]),
    either ? both / either : 0,
    colour.layers,
    colour.light,
    colour.lightY,
    colour.wood,
    colour.darkLow,
    Math.max(0, shoulder - mid),
  ];
}

/**
 * Scores a feature vector against every type: each type is a few clusters of typical cue values, scored as
 * independent Gaussians (spread widened a little, since real photos vary more than the corpus).
 * @returns {{ ranked: string[], prob: Record<string, number> } | null} null when no trained model is present
 */
export function scoreFront(features, model = FRONT_MODEL) {
  const types = Object.keys(model.types || {}).filter((t) => model.types[t].clusters);
  if (!types.length) return null;
  // a model trained on other cues (an old data file) cannot score these
  if ((model.features?.length ?? features.length) !== features.length) return null;
  const scale = model.scale || features.map(() => 1);
  const logs = {};
  for (const t of types) {
    let best = -Infinity;
    const parts = [];
    for (const c of model.types[t].clusters) {
      let ll = Math.log(c.w);
      for (let i = 0; i < features.length; i++) {
        if (!Number.isFinite(features[i])) continue; // a cue this photo set cannot show
        const sd = Math.max(0.14 * scale[i], c.s[i]) * (model.widen ?? 1.3);
        const z = (features[i] - c.m[i]) / sd;
        // a heavy-tailed penalty, so one odd cue cannot rule a type out
        ll += -Math.min(z * z, 10) * 0.5 - Math.log(sd);
      }
      parts.push(ll);
      best = Math.max(best, ll);
    }
    logs[t] = best + Math.log(parts.reduce((a, v) => a + Math.exp(v - best), 0));
  }
  const max = Math.max(...Object.values(logs));
  const T = model.temperature ?? 6;
  let sum = 0;
  const prob = {};
  for (const t of types) {
    prob[t] = Math.exp((logs[t] - max) / T);
    sum += prob[t];
  }
  for (const t of types) prob[t] /= sum;
  const ranked = types.sort((x, y) => logs[y] - logs[x]);
  return { ranked, prob };
}

export const MULTI_NAMES = [...FEATURE_NAMES, 'logDph', 'logRise', 'bodyFrac', 'round', 'lShape'];

/**
 * Cues for a front view together with what other photos add: how deep the piece is (from a side or plan view),
 * how much a back or headboard rises (side view) and whether the plan is round or L-shaped. A cue the photos
 * cannot show is NaN and is left out of the scoring.
 */
export function multiFeatures(views, hints, traits) {
  const front = views.front || views.back;
  if (!front) return null;
  const wph = hints.widthPerHeight || 1;
  const base = frontFeatures(front, wph);
  const side = views.left || views.right;
  let dph = hints.depthPerHeight;
  if (!dph && hints.widthPerDepth && hints.widthPerHeight)
    dph = hints.widthPerHeight / hints.widthPerDepth;
  return [
    ...base,
    dph ? Math.log(Math.min(6, Math.max(0.15, dph))) : NaN,
    side ? Math.log(Math.min(4, Math.max(0.6, traits.rise))) : NaN,
    side ? traits.bodyFrac : NaN,
    views.top ? (traits.round ? 1 : 0) : NaN,
    views.top ? (traits.lShape ? 1 : 0) : NaN,
  ];
}

/** The proportions the photos fix: from their own cut-outs when known, else from the size in hand. */
export function knownProportions(views, hints, dims) {
  const side = views.left || views.right;
  return {
    widthPerHeight: hints.widthPerHeight ?? dims.widthCm / dims.heightCm,
    depthPerHeight: hints.depthPerHeight ?? (side ? dims.depthCm / dims.heightCm : null),
    widthPerDepth: hints.widthPerDepth ?? (views.top ? dims.widthCm / dims.depthCm : null),
  };
}

/** Types ranked when more than the front photo is known. */
export function rankMulti(views, hints, traits) {
  const model = FRONT_MODEL.multi;
  if (!model) return null;
  const f = multiFeatures(views, hints, traits);
  if (!f) return null;
  const scored = scoreFront(f, model);
  return scored
    ? {
        list: scored.ranked.slice(0, 3),
        top: scored.ranked[0],
        p: scored.prob[scored.ranked[0]],
        prob: scored.prob,
      }
    : null;
}

/** Types ranked for a front view: best first, with the probability of the first. */
export function rankFront(view, wh) {
  if (!view) return null;
  const scored = scoreFront(frontFeatures(view, wh));
  return scored
    ? {
        list: scored.ranked.slice(0, 3),
        top: scored.ranked[0],
        p: scored.prob[scored.ranked[0]],
        prob: scored.prob,
      }
    : null;
}
