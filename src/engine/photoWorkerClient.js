/**
 * Hands a photo job to the Web Worker and waits for the answer. Where there is no worker (the tests, an old
 * browser) or it will not start, the job is run here instead, so the result is always the same — only the
 * dialog's smoothness differs.
 */
import { runPhotoJob } from './photoWork.js';

let worker = null;
let unavailable = false;
let nextId = 0;
const waiting = new Map();

function failAll(message) {
  for (const { reject } of waiting.values()) reject(new Error(message));
  waiting.clear();
}

function ensureWorker() {
  if (unavailable) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') {
    unavailable = true;
    return null;
  }
  try {
    worker = new Worker(new URL('./photoWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { id, result, error } = event.data || {};
      const pending = waiting.get(id);
      if (!pending) return;
      waiting.delete(id);
      if (error) pending.reject(new Error(error));
      else pending.resolve(result);
    };
    worker.onerror = () => {
      unavailable = true;
      worker = null;
      failAll('worker-unavailable');
    };
  } catch {
    unavailable = true;
    worker = null;
  }
  return worker;
}

/** Starts the worker early (when the dialog opens), so the first photo does not wait for it. */
export function warmPhotoWorker() {
  ensureWorker();
}

/**
 * Runs one photo job off the main thread when that is possible.
 * @param {'cut'|'build'} kind
 * @param {object} payload plain data only (pixels, masks, numbers)
 */
export async function photoJob(kind, payload) {
  const w = ensureWorker();
  if (!w) return runPhotoJob(kind, payload);
  try {
    return await new Promise((resolve, reject) => {
      const id = ++nextId;
      waiting.set(id, { resolve, reject });
      w.postMessage({ id, kind, payload });
    });
  } catch (err) {
    // the worker could not be used after all: do the work here rather than leave the user with nothing
    if (unavailable || err.message === 'worker-unavailable') return runPhotoJob(kind, payload);
    throw err;
  }
}
