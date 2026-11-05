/**
 * flatWalk.js
 * Pure helpers for walking through a whole flat in first person: where the visitor
 * starts, what blocks them (walls with their door gaps, furniture of every room) and how
 * staircases carry them between floors.
 *
 * Coordinates are metres in the flat's plan space (x = plan x, z = plan y).
 */

import { buildBlockers, PLAYER_RADIUS } from './walk.js';
import { circleHitsBox, nearestFree, clearestYaw } from './walkMove.js';
import { wallPieces } from './flatWalls.js';
import { analyzeLevel, levelSolidEdges, openingsOf, entranceOf } from './flatPlan.js';
import { levelIndex, stairHeightAt, stairTopTread, stairTargetIndex, stairRect } from './flat.js';

/** How far inside the door the visitor first stands. */
const ENTRY_DEPTH_CM = 90;
/** Walls only block the body: heights between the shin and the head. */
const BODY_LOW_CM = 20;
const BODY_HIGH_CM = 170;

/** Wall boxes of a level that block walking, as axis-aligned rectangles in metres. */
export function wallObstacles(flat, levelId) {
  const analysis = analyzeLevel(flat, levelId);
  const { boxes } = wallPieces(
    levelSolidEdges(flat, levelId),
    analysis.isExteriorEdge,
    openingsOf(flat, levelId),
    { fullHeight: true, outsideCell: analysis.isOutsideCell || null }
  );
  const out = [];
  for (const b of boxes) {
    if (b.z0 >= BODY_HIGH_CM || b.z1 <= BODY_LOW_CM) continue;
    const lo = (b.line + b.off - b.thick / 2) / 100;
    const hi = (b.line + b.off + b.thick / 2) / 100;
    out.push(
      b.axis === 'h'
        ? { x0: b.a / 100, x1: b.b / 100, z0: lo, z1: hi }
        : { x0: lo, x1: hi, z0: b.a / 100, z1: b.b / 100 }
    );
  }
  return out;
}

/** Furniture of every room on a level as obstacles in flat coordinates (see walk.js buildBlockers). */
export function furnitureObstacles(flat, rooms, levelId) {
  const out = [];
  for (const space of flat.spaces) {
    if (space.levelId !== levelId || !space.furnishable) continue;
    const room = rooms[space.roomId];
    if (!room) continue;
    const cx = (space.x + space.widthCm / 2) / 100;
    const cz = (space.y + space.depthCm / 2) / 100;
    for (const b of buildBlockers(room)) out.push({ ...b, x: b.x + cx, z: b.z + cz });
  }
  return out;
}

/** Everything that stops a visitor on one level. */
export function levelObstacles(flat, rooms, levelId) {
  const analysis = analyzeLevel(flat, levelId);
  return {
    walls: wallObstacles(flat, levelId),
    furniture: furnitureObstacles(flat, rooms, levelId),
    isOutside: analysis.isOutsideCell || null,
  };
}

/** Whether a visitor standing at (px, pz) metres would be inside a wall, furniture or outside the flat. */
export function isFlatBlocked(px, pz, obstacles) {
  const r = PLAYER_RADIUS;
  if (obstacles.isOutside && obstacles.isOutside(Math.floor(px * 10), Math.floor(pz * 10)))
    return true;
  for (const w of obstacles.walls) {
    const nx = Math.max(w.x0, Math.min(w.x1, px));
    const nz = Math.max(w.z0, Math.min(w.z1, pz));
    if ((px - nx) ** 2 + (pz - nz) ** 2 < r * r) return true;
  }
  for (const b of obstacles.furniture) {
    if (circleHitsBox(px, pz, r, b.x, b.z, b.halfW, b.halfD, b.theta)) return true;
  }
  return false;
}

/**
 * Where a walkthrough begins: just inside the main entrance (or the first outer door) facing
 * into the flat. Without any outer door it starts in the middle of the first room.
 * @returns {{ x, z, yaw, levelIdx, levelId, entranceId: string|null } | null}
 */
export function flatWalkStart(flat, rooms = {}) {
  if (!flat) return null;
  const entrance = entranceOf(flat);
  if (entrance) {
    const { opening, inward, levelId } = entrance;
    const along = opening.start + opening.widthCm / 2;
    const obstacles = levelObstacles(flat, rooms, levelId);
    for (const depth of [ENTRY_DEPTH_CM, 70, 120, 50, 160]) {
      const cx = opening.axis === 'h' ? along : opening.line;
      const cz = opening.axis === 'h' ? opening.line : along;
      const x = (cx + inward.dx * depth) / 100;
      const z = (cz + inward.dy * depth) / 100;
      if (isFlatBlocked(x, z, obstacles)) continue;
      const free = (px, pz) => !isFlatBlocked(px, pz, obstacles);
      return {
        x,
        z,
        // Facing in, turned a little when furniture stands straight ahead
        yaw: clearestYaw(x, z, Math.atan2(-inward.dx, -inward.dy), free),
        levelIdx: levelIndex(flat, levelId),
        levelId,
        entranceId: opening.id,
      };
    }
  }
  const space = flat.spaces[0];
  if (!space) return null;
  // The middle of the first room, nudged to clear floor when furniture stands there
  const mid = { x: (space.x + space.widthCm / 2) / 100, z: (space.y + space.depthCm / 2) / 100 };
  const obstacles = levelObstacles(flat, rooms, space.levelId);
  const clear = nearestFree(mid.x, mid.z, (x, z) => !isFlatBlocked(x, z, obstacles)) || mid;
  return {
    x: clear.x,
    z: clear.z,
    yaw: 0,
    levelIdx: levelIndex(flat, space.levelId),
    levelId: space.levelId,
    entranceId: null,
  };
}

/**
 * The floor under a visitor: which floor they stand on and how high it is (metres above the
 * ground floor), following staircases up and down.
 * @returns {{ levelIdx: number, floorM: number, blocked?: boolean }}
 */
export function walkSurface(flat, levelIdx, px, pz) {
  const floorH = flat.floorHeightCm;
  const x = px * 100;
  const y = pz * 100;
  let result = { levelIdx, floorM: (levelIdx * floorH) / 100 };
  for (const stair of flat.stairs) {
    const from = levelIndex(flat, stair.levelId);
    const to = stairTargetIndex(flat, stair);
    if (to < 0 || (levelIdx !== from && levelIdx !== to)) continue;
    const r = stairRect(stair);
    if (x < r.x || x > r.x + r.widthCm || y < r.y || y > r.y + r.depthCm) continue;
    const h = stairHeightAt(stair, x, y);
    const top = stairTopTread(stair);
    const base = (from * floorH) / 100;
    if (levelIdx === from) {
      if (h === null) continue;
      if (h >= top - 0.5) return { levelIdx: to, floorM: (to * floorH) / 100 };
      return { levelIdx: from, floorM: base + h / 100 };
    }
    // On the upper floor, over the opening: step down onto the stair, never into the void
    if (h === null) return { ...result, blocked: true };
    if (h >= top - 0.5) return result;
    return { levelIdx: from, floorM: base + h / 100 };
  }
  return result;
}
