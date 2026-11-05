import { degToRad } from './geometry.js';

/**
 * In the flat 3D view interior walls are drawn centred on the room edge, so a piece placed
 * flush against that edge in the room designer would sink a few centimetres into the wall.
 * This pushes such a piece out of the wall (never by more than a shallow overlap, so pieces
 * that really are inside a wall are left alone).
 */
const MAX_PUSH_CM = 8;
const GAP_CM = 0.2;

/** Half extents (cm) of a piece's turned footprint. */
export function footprintHalf(def, rotationDeg = 0) {
  const r = degToRad(rotationDeg || 0);
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return {
    hx: (def.widthCm * c + def.depthCm * s) / 2,
    hy: (def.widthCm * s + def.depthCm * c) / 2,
  };
}

/**
 * @param {{x:number,y:number,rotationDeg?:number}} item centre in room coordinates
 * @param {{x:number,y:number,widthCm:number,depthCm:number}} space the room's place on the plan
 * @param {{widthCm:number,depthCm:number}} room
 * @param {Array} boxes wall boxes ({axis,line,off,a,b,thick,glass})
 * @returns {{x:number,y:number}} the position to draw at, in room coordinates
 */
export function pushOffInteriorWalls(item, space, room, boxes, def) {
  const half = footprintHalf(def, item.rotationDeg);
  const ox = space.x + space.widthCm / 2 - room.widthCm / 2;
  const oy = space.y + space.depthCm / 2 - room.depthCm / 2;
  let px = item.x + ox;
  let py = item.y + oy;
  for (const b of boxes) {
    if (b.glass || b.thick > 12) continue;
    const mid = b.line + (b.off || 0);
    const across0 = mid - b.thick / 2;
    const across1 = mid + b.thick / 2;
    if (b.axis === 'h') {
      if (px + half.hx <= b.a || px - half.hx >= b.b) continue;
      const lo = Math.max(py - half.hy, across0);
      const hi = Math.min(py + half.hy, across1);
      const depth = hi - lo;
      if (depth <= 0 || depth > MAX_PUSH_CM) continue;
      py += py < mid ? across0 - (py + half.hy) - GAP_CM : across1 - (py - half.hy) + GAP_CM;
    } else {
      if (py + half.hy <= b.a || py - half.hy >= b.b) continue;
      const lo = Math.max(px - half.hx, across0);
      const hi = Math.min(px + half.hx, across1);
      const depth = hi - lo;
      if (depth <= 0 || depth > MAX_PUSH_CM) continue;
      px += px < mid ? across0 - (px + half.hx) - GAP_CM : across1 - (px - half.hx) + GAP_CM;
    }
  }
  return { x: px - ox, y: py - oy };
}
