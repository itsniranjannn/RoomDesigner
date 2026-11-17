/**
 * Framing the 3D room: where a perspective camera has to sit, and what it should look at, for the whole room
 * to be in shot. Used by the view on screen (where the floating toolbar covers a band along the bottom) and by
 * the pictures it exports (where nothing covers anything). Plain numbers, so it can be checked on its own;
 * metres and degrees in, metres out.
 */

/** Height of the walls in each mode, which is as high as the picture has to reach. */
export const WALL_HEIGHT_M = { full: 2.4, cutaway: 0.45 };

/** The walls stand outside the room's own size, and their coping caps a little above them. */
export const WALL_THICK_M = 0.14;
export const WALL_CAP_M = 0.05;

/** The box a room fills in 3D: its floor plus the walls standing round it and their caps. */
export function roomBox(widthM, depthM, wallHeightM) {
  return {
    widthM: widthM + 2 * WALL_THICK_M,
    depthM: depthM + 2 * WALL_THICK_M,
    heightM: wallHeightM + WALL_CAP_M,
  };
}

/** The angle the 3D view looks from, in each wall mode. */
export const VIEW_DIRECTION = { full: [0.6, 1.45, 0.8], cutaway: [0.75, 0.85, 0.9] };

const unit = ([x, y, z]) => {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
};

/** The eight corners of a room `widthM` x `depthM` with walls `heightM` high, standing on the floor. */
export function roomCorners(widthM, depthM, heightM) {
  const out = [];
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1]) out.push([(sx * widthM) / 2, sy * heightM, (sz * depthM) / 2]);
  return out;
}

/**
 * Where a point lands on screen, in [-1, 1] across and up, seen from `eye` looking at `target`.
 * `depth` is how far in front of the camera it is; behind the camera it is negative.
 */
export function screenPoint(point, eye, target, fovDeg, aspect) {
  const f = unit([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
  // right = forward x up, then the camera's own up = right x forward
  const r = unit([-f[2], 0, f[0]]);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const v = [point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]];
  const depth = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
  const across = v[0] * r[0] + v[1] * r[1] + v[2] * r[2];
  const upward = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
  const tanV = Math.tan((Math.max(10, fovDeg) * Math.PI) / 360);
  const safe = Math.max(1e-6, depth);
  return { x: across / (safe * tanV * Math.max(0.2, aspect)), y: upward / (safe * tanV), depth };
}

/** How far outside the frame the worst corner is, from a camera `dist` away along `dir`, looking at `lookY`. */
function overflow(corners, dir, dist, lookY, fovDeg, aspect, band) {
  const eye = [dir[0] * dist, lookY + dir[1] * dist, dir[2] * dist];
  const target = [0, lookY, 0];
  let worst = -Infinity;
  for (const c of corners) {
    const p = screenPoint(c, eye, target, fovDeg, aspect);
    if (p.depth <= 0) return Infinity;
    worst = Math.max(worst, Math.abs(p.x) - 1, p.y - 1, -1 + band - p.y);
  }
  return worst;
}

/**
 * The camera spot and look-at height that show the whole of a room `widthM` x `depthM` with walls `heightM`
 * high, seen from `direction`.
 * - `fovDeg` and `aspect` are the camera's; `viewportPx` is the canvas height and `bottomPx` the band at the
 *   bottom that the toolbar floats over (0 for an exported picture, which nothing covers).
 * - `lookY` is where the camera aims.
 * - `margin` leaves a little air around the room.
 * @returns {{ dist: number, lookY: number, spot: [number, number, number] }}
 */
export function fitRoomView({
  widthM,
  depthM,
  heightM,
  direction = VIEW_DIRECTION.cutaway,
  fovDeg = 45,
  aspect = 1,
  viewportPx = 0,
  bottomPx = 0,
  lookY = 0.3,
  margin = 1.06,
}) {
  const w = Math.max(0.2, widthM) * margin;
  const d = Math.max(0.2, depthM) * margin;
  const h = Math.max(0.2, heightM) * margin;
  const corners = roomCorners(w, d, h);
  const dir = unit(direction);
  const band = viewportPx > 0 ? Math.min(0.9, (2 * Math.max(0, bottomPx)) / viewportPx) : 0;
  const far = Math.max(8, Math.hypot(w, d, h) * 12);

  const distanceFor = (aimY) => {
    // The whole room is in shot from far enough away, and the fit only improves with distance
    let lo = 0.2;
    let hi = far;
    for (let i = 0; i < 46; i++) {
      const mid = (lo + hi) / 2;
      if (overflow(corners, dir, mid, aimY, fovDeg, aspect, band) > 0) lo = mid;
      else hi = mid;
    }
    return hi;
  };

  // The camera aims where the mode asks; the band along the bottom is met by standing further back, so the
  // room sits above the toolbar rather than behind it
  const aimY = lookY;
  const dist = distanceFor(aimY);
  return { dist, lookY: aimY, spot: [dir[0] * dist, aimY + dir[1] * dist, dir[2] * dist] };
}

/** Where the camera sits for a fitted view (kept for callers that want the spot on its own). */
export function cameraSpot(direction, fit) {
  const dir = unit(direction);
  return [dir[0] * fit.dist, fit.lookY + dir[1] * fit.dist, dir[2] * fit.dist];
}
