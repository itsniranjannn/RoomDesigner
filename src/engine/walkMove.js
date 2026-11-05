/**
 * walkMove.js
 * Pure movement maths for the first-person walkthrough: speeds, smoothing, sliding along walls
 * and finding clear standing room. Coordinates are metres (x = plan x, z = plan y); yaw 0 looks
 * towards -z and a positive yaw turns left.
 */

/** Walking and running speeds (m/s). */
export const WALK_SPEED = 1.4;
export const RUN_SPEED = 2.6;
/** How quickly the visitor reaches full speed or stops (1/s); about a tenth of a second. */
export const ACCEL = 12;
/** Turning with the left and right arrow keys (rad/s). */
export const TURN_SPEED = 1.9;
/** A tapped key still moves the visitor for this long (s), so a quick press is never lost. */
export const TAP_SECONDS = 0.14;
/** The longest slice of time moved in one go (s), so a body never jumps through a wall. */
const MAX_SUBSTEP = 0.03;
/** The longest frame time simulated (s); a slower frame (tab in the background) is cut short. */
const MAX_FRAME = 0.25;
/** Turns tried (radians, alternating sides) to glide round something straight ahead. */
const GLIDE_TURNS = [0.4, 0.8, 1.2];

/** The unit vector a visitor facing `yaw` moves along for the given forward/strafe intent. */
export function wishDirection(forward, strafe, yaw) {
  const len = Math.hypot(forward, strafe);
  if (len === 0) return { x: 0, z: 0 };
  const f = forward / len;
  const s = strafe / len;
  return {
    x: -Math.sin(yaw) * f + Math.cos(yaw) * s,
    z: -Math.cos(yaw) * f - Math.sin(yaw) * s,
  };
}

/**
 * Advances a walker by `dt` seconds.
 * @param {{ x: number, z: number, vx: number, vz: number }} state
 * @param {{ forward: number, strafe: number, run?: boolean }} input  each -1, 0 or 1
 * @param {number} yaw
 * @param {number} dt
 * @param {(x: number, z: number) => boolean} isFree  false when a position is blocked
 * @returns {{ x, z, vx, vz, moved: boolean }}
 */
export function stepWalker(state, input, yaw, dt, isFree) {
  let { x, z, vx, vz } = state;
  let bias = state.bias || 1;
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  const wish = wishDirection(input.forward, input.strafe, yaw);
  let remaining = Math.min(Math.max(dt, 0), MAX_FRAME);
  let moved = false;
  while (remaining > 1e-6) {
    const h = Math.min(remaining, MAX_SUBSTEP);
    remaining -= h;
    const k = Math.min(1, h * ACCEL);
    vx += (wish.x * speed - vx) * k;
    vz += (wish.z * speed - vz) * k;
    if (Math.abs(vx) < 1e-4 && Math.abs(vz) < 1e-4) continue;
    const nx = x + vx * h;
    const nz = z + vz * h;
    if (!isFree(x, z)) {
      // Standing inside something (a piece was dropped on the visitor): any move is a way out
      x = nx;
      z = nz;
      moved = true;
    } else if (isFree(nx, nz)) {
      x = nx;
      z = nz;
      moved = true;
    } else if (Math.abs(nx - x) > 1e-5 && isFree(nx, z)) {
      // Slide along a wall that runs in x
      x = nx;
      vz = 0;
      moved = true;
    } else if (Math.abs(nz - z) > 1e-5 && isFree(x, nz)) {
      z = nz;
      vx = 0;
      moved = true;
    } else {
      // Head-on against a corner or a flat face: glide round it by turning the move a little
      const speedNow = Math.hypot(vx, vz);
      const ang = Math.atan2(vz, vx);
      let glided = false;
      for (const turn of GLIDE_TURNS) {
        for (const side of [bias, -bias]) {
          const a = ang + turn * side;
          const gx = x + Math.cos(a) * speedNow * h;
          const gz = z + Math.sin(a) * speedNow * h;
          if (!isFree(gx, gz)) continue;
          x = gx;
          z = gz;
          vx = Math.cos(a) * speedNow;
          vz = Math.sin(a) * speedNow;
          bias = side; // keep veering the same way, so a long obstacle is rounded, not dithered
          moved = true;
          glided = true;
          break;
        }
        if (glided) break;
      }
      if (!glided) {
        vx = 0;
        vz = 0;
      }
    }
  }
  return { x, z, vx, vz, bias, moved };
}

/**
 * The closest position to (x, z) that is not blocked, searched in rings out to `maxM`.
 * Returns the point itself when it is already clear, or null when nothing near is free.
 */
export function nearestFree(x, z, isFree, { stepM = 0.1, maxM = 3 } = {}) {
  if (isFree(x, z)) return { x, z };
  const rings = Math.ceil(maxM / stepM);
  for (let r = 1; r <= rings; r++) {
    let best = null;
    let bestD = Infinity;
    const points = Math.max(8, Math.round(2 * Math.PI * r));
    for (let n = 0; n < points; n++) {
      const a = (n / points) * Math.PI * 2;
      const px = x + Math.cos(a) * r * stepM;
      const pz = z + Math.sin(a) * r * stepM;
      if (!isFree(px, pz)) continue;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: px, z: pz };
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * Whether a circular body of `radius` at (px, pz) overlaps a rectangle of half sizes
 * (halfW, halfD) centred at (cx, cz) and turned by `theta` (the rounded corners let a visitor
 * glide past a corner instead of catching on it).
 */
export function circleHitsBox(px, pz, radius, cx, cz, halfW, halfD, theta) {
  const dx = px - cx;
  const dz = pz - cz;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const qx = Math.max(-halfW, Math.min(halfW, lx));
  const qz = Math.max(-halfD, Math.min(halfD, lz));
  return (lx - qx) ** 2 + (lz - qz) ** 2 < radius * radius;
}

/** How far (m, up to `maxM`) a visitor at (x, z) can walk straight along `yaw` before something blocks. */
export function clearAhead(x, z, yaw, isFree, maxM = 3, stepM = 0.1) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  let d = 0;
  while (d < maxM && isFree(x + fx * (d + stepM), z + fz * (d + stepM))) d += stepM;
  return d;
}

/**
 * The yaw to start with: `yaw` itself when there is room to walk (at least `wantM`), otherwise
 * the nearby direction with the most room, so the first W press always gets somewhere.
 */
export function clearestYaw(x, z, yaw, isFree, wantM = 2) {
  if (clearAhead(x, z, yaw, isFree) >= wantM) return yaw;
  let best = yaw;
  let bestD = clearAhead(x, z, yaw, isFree);
  for (const off of [0.25, -0.25, 0.5, -0.5, 0.8, -0.8, 1.1, -1.1]) {
    const d = clearAhead(x, z, yaw + off, isFree);
    if (d > bestD + 1e-6) {
      bestD = d;
      best = yaw + off;
    }
  }
  return best;
}
