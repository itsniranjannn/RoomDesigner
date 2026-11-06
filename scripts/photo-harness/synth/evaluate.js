/**
 * evaluate.js
 * Runs corpus cases through the same steps the Create from photos dialog runs and scores them against the ground
 * truth. Shared by the CLI (robustness.js) and the vitest guard (src/engine/photoCorpus.test.js).
 */
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { buildCase } from './corpus.js';
import {
  fitBackground,
  segmentObject,
  maskCoverage,
  normalizeView,
} from '../../../src/engine/hull.js';
import { extractForeground, backdropIsPlain } from '../../../src/engine/foreground.js';
import { detectStackedPhotos, cropRegion, symmetryScores } from '../../../src/engine/stacked.js';
import {
  buildViews,
  designFromViews,
  pieceMask,
  groupPieces,
  pieceLabel,
} from '../../../src/engine/photoPipeline.js';
import { estimatePartialProportions, estimateProportions } from '../../../src/engine/sheet.js';
import { fromSheet, build } from '../../../src/engine/photoTestKit.js';
import { sanitizeDesign, typeCandidates } from '../../../src/engine/design.js';

void normalizeView;
void segmentObject;
void maskCoverage;
void estimateProportions;
void typeCandidates;

const DIMS = { widthCm: 80, depthCm: 50, heightCm: 80 };

/** The dialog's analysis of one photo in the front slot: cut-out, pieces, then each piece read as a design. */
export function analysePhoto(photo, { allPieces = false, crop = null } = {}) {
  const noisy = fitBackground(photo.rgba, photo.width, photo.height).noise > 1.5;
  const tolerance = noisy ? 60 : 16;
  const cut = extractForeground(photo.rgba, photo.width, photo.height, {
    tolerance,
    mode: 'auto',
    crop,
  });
  const scene = cut.mode === 'scene';
  const read = (mask) => {
    const views = buildViews({ front: photo }, { front: { mask, scene } }, tolerance);
    const partial = estimatePartialProportions({
      front: { mask, width: photo.width, height: photo.height },
    });
    return { views, partial, ...designFromViews(views, { dims: DIMS, partial }) };
  };
  const count = scene && cut.pieces.length ? (allPieces ? cut.pieces.length : 1) : 1;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const mask = scene && cut.pieces.length ? pieceMask(cut, i) : cut.mask;
    try {
      pieces.push({ index: i, mask, ...read(mask) });
    } catch (err) {
      pieces.push({ index: i, mask, error: err.message });
    }
  }
  return { cut, scene, pieces, tolerance };
}

const IOU = (a, b, n) => {
  let i = 0;
  let u = 0;
  for (let p = 0; p < n; p++) {
    const x = a[p] ? 1 : 0;
    const y = b[p] ? 1 : 0;
    i += x & y;
    u += x | y;
  }
  return u ? i / u : 0;
};

/** Runs a case through the pipeline and returns what came out, with timing. */
export function runCase(spec) {
  const c = buildCase(spec);
  const photo = { rgba: c.img.rgba, width: c.img.width, height: c.img.height };
  const t0 = Date.now();
  const out = {
    spec,
    kind: spec.kind,
    truthType: c.truth.type,
    truth: c.truth,
    view: spec.view || null,
    case: c,
  };
  try {
    if (spec.kind === 'sheet') {
      const s = fromSheet(photo);
      out.views = s.detection.views.length;
      out.expectedViews = c.nViews;
      out.slots = s.slots;
      out.expected = c.expected;
      if (!Object.keys(s.photos).length) throw new Error('no views found');
      const r = build(s.photos, { sheet: true });
      out.design = r.design;
      out.dims = r.dims;
      out.candidates = r.candidates;
    } else if (spec.kind === 'stacked') {
      const st = detectStackedPhotos(photo.rgba, photo.width, photo.height);
      out.stackedFound = Boolean(st);
      if (st) {
        const imgs = st.parts.map((p) => {
          const crop = cropRegion(photo.rgba, photo.width, p);
          return { rgba: crop.rgba, width: crop.width, height: crop.height };
        });
        const masks = imgs.map((img) => {
          const cut = extractForeground(img.rgba, img.width, img.height, { mode: 'scene' });
          return cut.pieces.length ? pieceMask(cut, 0) : cut.mask;
        });
        const sym = symmetryScores(masks, imgs);
        const a = analysePhoto(imgs[sym.indexOf(Math.max(...sym))]);
        Object.assign(out, a.pieces[0]);
        out.design = a.pieces[0].design;
      } else {
        const a = analysePhoto(photo);
        out.design = a.pieces[0].design;
      }
    } else {
      // a single picture: the stacked-photo check must not split it
      const plain = backdropIsPlain(photo.rgba, photo.width, photo.height).plain;
      const st = detectStackedPhotos(photo.rgba, photo.width, photo.height);
      out.falseSplit = Boolean(st && !plain && st.similarity >= 0.35);
      const a = analysePhoto(photo, { allPieces: spec.kind === 'lifestyle' });
      out.scene = a.scene;
      out.nPieces = a.cut.pieces.length;
      const first = a.pieces[0];
      if (first.error) throw new Error(first.error);
      out.design = first.design;
      out.dims = first.dims;
      out.candidates = first.candidates;
      out.coverage = a.cut.coverage;
      if (spec.kind === 'lifestyle') {
        // match each detected piece to a truth piece by overlap
        out.matches = a.pieces
          .filter((p) => !p.error)
          .map((p) => {
            let best = { id: 0, iou: 0 };
            for (const t of c.pieces) {
              const tm = new Uint8Array(c.img.ids.length);
              for (let q = 0; q < tm.length; q++) tm[q] = c.img.ids[q] === t.id ? 1 : 0;
              const iou = IOU(p.mask, tm, tm.length);
              if (iou > best.iou) best = { id: t.id, iou, truth: t };
            }
            return { type: p.design.type, ...best };
          });
        // pieces that are copies of each other build once with a count
        out.groups =
          a.cut.pieces.length > 1
            ? groupPieces(
                photo,
                a.cut,
                a.pieces.map((_, i) => i)
              ).length
            : 1;
      }
    }
    const d = out.design;
    out.type = d.type;
    out.recordLen = JSON.stringify(d).length;
    out.roundTrip = sanitizeDesign(JSON.parse(JSON.stringify(d)))?.type === d.type;
    out.label = pieceLabel(d);
  } catch (err) {
    out.error = err.message;
  }
  out.ms = Date.now() - t0;
  return out;
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Is the photo's main colour close to the true one? (hue for chromatic colours, lightness for greys) */
export function colourOk(hex, truth) {
  if (!hex || !truth) return null;
  const a = hexRgb(hex);
  const b = truth;
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return d <= 95;
}

/** Scores one run: type right, type in the top 3, traits right. */
export function score(run) {
  const s = { kind: run.kind, type: run.truthType, view: run.view, ok: false, top3: false };
  if (run.error || !run.design) {
    s.error = run.error || 'no design';
    return s;
  }
  s.got = run.design.type;
  s.ok = run.design.type === run.truthType;
  s.top3 = Boolean(run.candidates?.list?.includes(run.truthType)) || s.ok;
  s.colour = colourOk(run.design.palette.body, run.truth.color);
  const tr = run.truth.traits || {};
  const dt = run.design.traits || {};
  s.traits = {};
  if (s.ok) {
    if (tr.seats) s.traits.seats = dt.seats === tr.seats || (tr.seats === 4 && dt.seats >= 3);
    if (tr.doors) s.traits.doors = dt.doors === tr.doors;
    if (tr.shelves) s.traits.shelves = Math.abs((dt.shelves ?? 0) - tr.shelves) <= 1;
    if (tr.drawers) s.traits.drawers = Math.abs((dt.drawers ?? 0) - tr.drawers) <= 1;
    if (tr.n) s.traits.sections = Math.abs((dt.n ?? 0) - tr.n) <= 1;
    if (tr.pillows) s.traits.pillows = Math.abs((dt.pillows ?? 0) - Math.min(tr.pillows, 4)) <= 1;
  }
  return s;
}

/**
 * Runs specs across worker threads (the pipeline is plain JS, so cores help linearly).
 * @returns {Promise<Array<{run: object, sc: object}>>} in the order of the specs
 */
export async function runParallel(
  specs,
  {
    workers = Math.max(1, Math.min(8, (os.availableParallelism?.() ?? 4) - 1)),
    keepPhotos = false,
  } = {}
) {
  const n = Math.min(workers, specs.length);
  const slices = Array.from({ length: n }, () => []);
  specs.forEach((s, i) => slices[i % n].push({ s, i }));
  const results = new Array(specs.length);
  await Promise.all(
    slices.map(
      (slice) =>
        new Promise((resolve, reject) => {
          const w = new Worker(new URL('./worker.js', import.meta.url), {
            workerData: { specs: slice.map((x) => x.s), keepPhotos },
          });
          w.once('message', (rows) => {
            rows.forEach((r, k) => (results[slice[k].i] = r));
            resolve();
          });
          w.once('error', reject);
        })
    )
  );
  return results;
}

/**
 * The user's real photographs as extra cases, when a folder of them is given (PHOTO_FIXTURES): 5.png (bed sheet),
 * 8.png (loveseat sheet), 10.png (lounge chair sheet), new-bed.png (two stacked photos of a carved bed),
 * new-teal.png (teal sofa and two cane armchairs) and new-sofa.png (ornate sofa set), each with the type it must give.
 * @returns {Array<{ name: string, expect: string, got: string|null, ok: boolean, note?: string }>}
 */
export function runFixtures(dir, { decodePng, shrink, exists }) {
  const out = [];
  const sheetCase = (name, expectType) => {
    if (!exists(name)) return;
    try {
      const img = shrink(decodePng(`${dir}/${name}`), 1800);
      const s = fromSheet(img);
      const small = Object.fromEntries(
        Object.entries(s.photos).map(([k, p]) => [k, { ...shrink(p, 480), fromSheet: true }])
      );
      const r = build(small, { sheet: true });
      out.push({ name, expect: expectType, got: r.design.type, ok: r.design.type === expectType });
    } catch (err) {
      out.push({ name, expect: expectType, got: null, ok: false, note: err.message });
    }
  };
  sheetCase('5.png', 'bed');
  sheetCase('8.png', 'sofa');
  sheetCase('10.png', 'lounge');
  // A room photo: read automatically, and as the dialog reads it once the user has cropped to the piece
  const sceneCase = (name, expectType, { edge = 480, crop = null, stacked = false } = {}) => {
    if (!exists(name)) return;
    const label = crop ? name + ' (cropped)' : stacked ? name + ' (split)' : name + ' (auto)';
    try {
      let img = shrink(decodePng(`${dir}/${name}`), edge);
      if (stacked) {
        const found = detectStackedPhotos(img.rgba, img.width, img.height);
        if (!found) throw new Error('no stacked photos found');
        const part = cropRegion(img.rgba, img.width, found.parts[0]);
        img = shrink({ rgba: part.rgba, width: part.width, height: part.height }, 480);
      }
      const a = analysePhoto(img, { allPieces: true, crop });
      const types = a.pieces.map((p) => p.design?.type);
      out.push({
        name: label,
        expect: expectType,
        got: types[0] ?? null,
        ok: types.includes(expectType),
        note: types.join(','),
        info: !crop && !stacked,
      });
    } catch (err) {
      out.push({ name: label, expect: expectType, got: null, ok: false, note: err.message });
    }
  };
  sceneCase('new-teal.png', 'sofa');
  sceneCase('new-teal.png', 'sofa', {
    edge: 480,
    crop: { x0: 0.255, y0: 0.47, x1: 0.72, y1: 0.8 },
  });
  sceneCase('new-teal.png', 'armchair', {
    edge: 480,
    crop: { x0: 0, y0: 0.5, x1: 0.28, y1: 0.85 },
  });
  sceneCase('new-bed.png', 'bed', { edge: 1000, stacked: true });
  return out;
}
