// Worker thread: runs a slice of corpus specs through the pipeline and posts back the (small) results.
import { parentPort, workerData } from 'node:worker_threads';
import { runCase, score } from './evaluate.js';
import { FRONT_MODEL } from '../../../src/engine/frontModel.data.js';
import { setRuleTrust } from '../../../src/engine/design.js';

// experiments: PH_TEMP=<n> sets the ranking's temperature, RULE_TRUST=<n> how far the rules are trusted
if (process.env.PH_TEMP) {
  FRONT_MODEL.temperature = Number(process.env.PH_TEMP);
  if (FRONT_MODEL.multi) FRONT_MODEL.multi.temperature = Number(process.env.PH_TEMP);
}
if (process.env.RULE_TRUST) setRuleTrust(Number(process.env.RULE_TRUST));

const out = [];
for (const spec of workerData.specs) {
  const run = runCase(spec);
  const sc = score(run);
  const { case: c, ...lite } = run;
  // keep the photo only when asked for (failure dumps), as plain arrays the main thread can write out
  lite.photo = workerData.keepPhotos
    ? { rgba: c.img.rgba, width: c.img.width, height: c.img.height }
    : null;
  lite.pieces = c.pieces;
  out.push({ run: lite, sc });
}
parentPort.postMessage(out);
