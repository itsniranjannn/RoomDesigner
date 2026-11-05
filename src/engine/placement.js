/**
 * placement.js
 * Where a new piece lands when the user adds it without choosing a spot: the free place nearest the middle
 * of the room, so adding a second piece does not pile it on the first.
 */
import { checkFurnitureCollision } from './collision.js';
import { clampInsideRoom } from './snapping.js';

const STEP_CM = 25;

/**
 * @param {{widthCm:number, depthCm:number}} def size of the piece to add
 * @param {Array<{x:number,y:number,widthCm:number,depthCm:number,rotationDeg?:number}>} others pieces already there,
 *   with their sizes
 * @param {{x:number,y:number}} start preferred position (the room's middle)
 * @returns {{x:number,y:number}} a free position, or the start when the room has none
 */
export function findFreePosition(def, others, roomWidthCm, roomDepthCm, outline, start) {
  const fits = (x, y) => {
    const spot = {
      x,
      y,
      widthCm: def.widthCm,
      depthCm: def.depthCm,
      rotationDeg: 0,
      furnitureTypeId: def.id,
    };
    const at = clampInsideRoom(spot, roomWidthCm, roomDepthCm, outline);
    if (Math.abs(at.x - x) > 1 || Math.abs(at.y - y) > 1) return false;
    return !others.some((o) => checkFurnitureCollision(spot, o, 0.5));
  };
  if (fits(start.x, start.y)) return start;
  const maxRing = Math.ceil(Math.max(roomWidthCm, roomDepthCm) / STEP_CM);
  let best = null;
  for (let ring = 1; ring <= maxRing && !best; ring++) {
    let bestD = Infinity;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = Math.round(start.x + dx * STEP_CM);
        const y = Math.round(start.y + dy * STEP_CM);
        const d = dx * dx + dy * dy;
        if (d < bestD && fits(x, y)) {
          best = { x, y };
          bestD = d;
        }
      }
    }
  }
  return best || start;
}
