/**
 * oblique.js
 * Three-quarter photos: the most common product picture shows the front of a piece and one of its sides at once,
 * taken from a little above. Such a photo is not a straight-on front view: its outline is as wide as the front and
 * the side together, and its height includes the top seen from above. This reads the photo as what it is.
 *
 * The cue is the line the piece stands on. Seen straight on (front or side), the feet or the plinth stand on one
 * level line. Seen from three quarters, the near corner stands lowest and the ground line rises from it both ways:
 * along one face and along the other. For a box under a camera at yaw t and pitch p (orthographic), an edge along
 * one face rises with slope tan(t) sin(p) and an edge along the other with slope cot(t) sin(p), so the two slopes
 * give the yaw (tan^2 t = s1 / s2) and the pitch, and from them the real lengths of both faces and the height:
 *
 *   L1 = a1 / cos t,  L2 = a2 / sin t,  H = (T - r1 - r2) / cos p
 *
 * where a is how far each ground line runs across the picture, r how much it rises and T the outline's height.
 * Which face is the front is not in the outline: most pieces are wider than deep (sofas, desks, cabinets), so the
 * longer face is taken as the front, and a bed, which is longer than wide, is read the other way round by the caller.
 */

/**
 * The lowest object row in each column, as a fraction of the view height (1 = the bottom of the outline).
 * @param {{mask: Uint8Array, size: number}} view
 */
function bottomRows(view) {
  const s = view.size;
  const out = new Float32Array(s).fill(-1);
  for (let x = 0; x < s; x++)
    for (let y = s - 1; y >= 0; y--)
      if (view.mask[y * s + x]) {
        out[x] = (y + 1) / s;
        break;
      }
  return out;
}

/** The hull of points from below (image y grows downward): the line the outline would rest on. */
function lowerHull(points) {
  const hull = [];
  for (const p of points) {
    // keep the hull convex seen from below: drop a middle point that lies above the line through its neighbours
    while (hull.length >= 2) {
      const [a, b] = [hull[hull.length - 2], hull[hull.length - 1]];
      const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (cross >= 0) hull.pop();
      else break;
    }
    hull.push(p);
  }
  return hull;
}

/** Follows the ground line from hull point k one way while it stays a gentle, straight line. */
function walkGround(hull, k, dir, aspect) {
  let i = k;
  while (i + dir >= 0 && i + dir < hull.length) {
    const [a, b] = [hull[i], hull[i + dir]];
    const run = Math.abs(b[0] - a[0]);
    if (run <= 0) break;
    const slope = (a[1] - b[1]) / run;
    if (slope > 0.95) break;
    // past the far corner the outline turns up: a segment much steeper than the rising line so far ends it
    const sofar = Math.abs(a[0] - hull[k][0]);
    const sofarSlope = sofar > 0 ? (hull[k][1] - a[1]) / sofar : 0;
    if (sofar >= aspect * 0.08 && sofarSlope >= 0.03 && slope > Math.max(0.18, sofarSlope * 2.5))
      break;
    i += dir;
  }
  return { run: Math.abs(hull[i][0] - hull[k][0]), rise: hull[k][1] - hull[i][1], end: i };
}

/**
 * How far the outline hangs below the straight line between two hull points, over the line's rise. A box
 * corner stands on straight lines (its outline is on the line, or above it between legs); the round base of a
 * tub chair or a pouf, or the curved front of a plan view, sags below it.
 */
function sagOf(pts, a, b) {
  const [p0, p1] = a[0] < b[0] ? [a, b] : [b, a];
  let sag = 0;
  for (const p of pts)
    if (p[0] > p0[0] && p[0] < p1[0]) {
      const onLine = p0[1] + ((p[0] - p0[0]) / (p1[0] - p0[0])) * (p1[1] - p0[1]);
      sag = Math.max(sag, p[1] - onLine);
    }
  return sag;
}

/**
 * Reads a single view as a three-quarter photo when its ground line is a V (the near corner lowest).
 * @param {{mask: Uint8Array, size: number}} view a normalized view (stretched to its bounding box)
 * @param {number} aspect the cut-out's own width over height in the photo
 * @returns {null | { yaw: number, pitch: number, wph: number, dph: number, frontOn: 'left'|'right',
 *   longer: number, shorter: number, near: number }}
 *   yaw (of the front face from straight on) and pitch in degrees; wph and dph are width and depth over height
 *   taking the longer face as the front; longer and shorter are the two face lengths over the height; frontOn
 *   says on which side of the near corner (in the picture) the longer face lies; near is the corner's place
 *   across the view (0-1)
 */
export function threeQuarter(view, aspect) {
  if (!view || !(aspect > 0)) return null;
  const s = view.size;
  const rows = bottomRows(view);
  // Points in units of the outline's height: x across (scaled by the aspect), y down
  const pts = [];
  for (let x = 0; x < s; x++) if (rows[x] >= 0) pts.push([((x + 0.5) / s) * aspect, rows[x]]);
  if (pts.length < s * 0.5) return null;
  const hull = lowerHull(pts);
  if (hull.length < 3) return null;
  // The near corner is one of the lowest hull points: the one from which both lines visibly rise
  const lowest = Math.max(...hull.map((p) => p[1]));
  let best = null;
  hull.forEach((p, k) => {
    if (p[1] < lowest - 0.022) return;
    const left = walkGround(hull, k, -1, aspect);
    const right = walkGround(hull, k, 1, aspect);
    const score = Math.min(left.rise, right.rise);
    if (!best || score > best.score) best = { k, left, right, score };
  });
  const { k, left, right } = best;
  // Both lines must run a good way across the picture and visibly rise
  if (left.run < aspect * 0.1 || right.run < aspect * 0.1) return null;
  const sl = left.rise / left.run;
  const sr = right.rise / right.run;
  if (Math.min(sl, sr) < 0.025 || left.rise < 0.02 || right.rise < 0.02) return null;
  const sags = [left, right].map((c) => sagOf(pts, hull[k], hull[c.end]) / c.rise);
  if (threeQuarter.debug) threeQuarter.debug({ left, right, sags });
  if (Math.max(...sags) > 0.3) return null;
  // tan^2 of the left face's turn from straight on
  const tLeft = Math.atan(Math.sqrt(sl / sr));
  const sinP = Math.min(0.8, Math.sqrt(sl * sr));
  // A product shot from three quarters looks down a little (10-30 degrees). A V that flat is the slight
  // unevenness of a straight-on photo, or the cut-out of a far corner only, and says nothing reliable.
  if (sinP < Math.sin((9 * Math.PI) / 180)) return null;
  const cosP = Math.sqrt(1 - sinP * sinP);
  const clampT = (t) => Math.min((78 * Math.PI) / 180, Math.max((12 * Math.PI) / 180, t));
  const lenLeft = left.run / Math.cos(clampT(tLeft));
  const lenRight = right.run / Math.sin(clampT(tLeft));
  const height = Math.max(0.35, 1 - left.rise - right.rise) / cosP;
  const longer = Math.max(lenLeft, lenRight) / height;
  const shorter = Math.min(lenLeft, lenRight) / height;
  // a cut-out that took in a wide floor shadow or rug is no corner of a piece
  if (longer > 6) return null;
  const frontOn = lenLeft >= lenRight ? 'left' : 'right';
  const yawFront = frontOn === 'left' ? tLeft : Math.PI / 2 - tLeft;
  return {
    yaw: (clampT(yawFront) * 180) / Math.PI,
    pitch: (Math.asin(sinP) * 180) / Math.PI,
    wph: longer,
    dph: shorter,
    longer,
    shorter,
    frontOn,
    near: hull[k][0] / aspect,
  };
}
