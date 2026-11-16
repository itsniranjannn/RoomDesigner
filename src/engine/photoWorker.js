/**
 * The Web Worker the photo dialog hands its reading to, so the page keeps painting while a photo is read.
 * It runs the same functions as the tests (photoWork.js); only the thread is different.
 */
import { runPhotoJob } from './photoWork.js';

self.onmessage = (event) => {
  const { id, kind, payload } = event.data || {};
  try {
    self.postMessage({ id, result: runPhotoJob(kind, payload) });
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
