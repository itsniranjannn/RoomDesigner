/**
 * Layout of a kitchen island, shared by its 3D model and its plan symbol so the two cannot drift: where the
 * carcass sits under the worktop, and the bar stools tucked into the overhang in front of it.
 * Plain numbers only (no three.js), in metres, measured from the middle of the footprint.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The cabinet under an island's worktop: the back stays put, the front leaves room for the knees. */
export function islandCarcass(depthM) {
  const depth = depthM * 0.62;
  return { depth, z: -depthM * 0.13, front: -depthM * 0.13 + depth / 2 };
}

/** Narrowest seat still worth drawing as a stool (a toy-sized island keeps a toy-sized stool). */
const SEAT_MIN = 0.03;

/**
 * The bar stools of an island: how many, and the seat radius, height and centre line. They stand in the
 * overhang in front of the cabinet and inside the island's own footprint, so an island snapped against a wall
 * never pushes a seat through it; an island too shallow for a seat has none.
 */
export function islandStools({ widthM, depthM, heightM }) {
  const front = islandCarcass(depthM).front;
  // The band between the cabinet face and the front edge of the worktop
  const band = depthM / 2 - front - 0.01;
  const seatR = Math.min(0.15, band / 2, widthM * 0.16);
  const count = widthM > 1.1 ? 2 : 1;
  const seatY = clamp(heightM * 0.75, 0.3, 0.8);
  return {
    count: seatR >= SEAT_MIN ? count : 0,
    seatR,
    seatY,
    footR: seatR * 0.67,
    z: depthM / 2 - seatR - 0.005,
    spacing: widthM * 0.4,
  };
}
