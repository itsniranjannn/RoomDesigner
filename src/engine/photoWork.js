/**
 * photoWork.js
 * The two jobs the photo dialog runs on a picture: cutting the piece out, and building the design record from
 * the cut-outs. They are plain functions over plain data (pixels and masks in, a record out), so the very same
 * code runs on the main thread, inside the Web Worker (photoWorker.js) and in the tests.
 */
import { extractForeground } from './foreground.js';
import { buildViews, designFromViews } from './photoPipeline.js';
import { threeQuarterProportions } from './design.js';

const JOBS = {
  /** Cut one photo out: { photo: {rgba, width, height}, options } as extractForeground takes them. */
  cut: ({ photo, options }) => extractForeground(photo.rgba, photo.width, photo.height, options),
  /**
   * Build the design record from the cut-out photos in their slots.
   * { photos, cuts: slot -> { mask, scene }, tolerance, labels: slot -> name, options }
   */
  build: ({ photos, cuts, tolerance, labels = {}, options }) => {
    const views = buildViews(photos, cuts, tolerance, (slot) => labels[slot] || slot);
    const built = designFromViews(views, options);
    return {
      design: built.design,
      dims: built.dims,
      candidates: built.candidates,
      // whether the lone photo was read as a three-quarter view (the fit meter says so)
      quarter: Boolean(threeQuarterProportions(views, options.partial || {}, built.design.type)),
    };
  },
};

/** Runs one job here and now. */
export function runPhotoJob(kind, payload) {
  const job = JOBS[kind];
  if (!job) throw new Error(`Unknown photo job: ${kind}`);
  return job(payload);
}
