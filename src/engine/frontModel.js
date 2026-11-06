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
];

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
  const scale = model.scale || features.map(() => 1);
  const logs = {};
  for (const t of types) {
    let best = -Infinity;
    const parts = [];
    for (const c of model.types[t].clusters) {
      let ll = Math.log(c.w);
      for (let i = 0; i < features.length; i++) {
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
