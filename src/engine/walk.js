/**
 * walk.js
 * Pure helpers for the first-person walkthrough: entry point and furniture blocking.
 * Coordinates are metres, origin at the room centre (x = plan x, z = plan y).
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { degToRad } from './geometry.js';
import { circleHitsBox } from './walkMove.js';
import { hasOutline, outlineEdges, pointOnEdge, pointInOutline } from './roomShape.js';

export const PLAYER_RADIUS = 0.22;

/** Where the visitor enters: just inside the first door, facing the room centre. */
export function getWalkStart(room) {
  const W = room.widthCm / 100;
  const D = room.depthCm / 100;
  const door = (room.doors || [])[0];
  let x = 0;
  let z = D / 2 - 0.9;
  if (door && hasOutline(room)) {
    const e = outlineEdges(room)[door.edge ?? 0];
    if (e) {
      const p = pointOnEdge(e, door.offsetCm + door.widthCm / 2, 90);
      x = (p.x - room.widthCm / 2) / 100;
      z = (p.y - room.depthCm / 2) / 100;
    }
  } else if (door) {
    const along = (door.offsetCm + door.widthCm / 2) / 100;
    switch (door.wall || 'bottom') {
      case 'top':
        x = along - W / 2;
        z = -D / 2 + 0.9;
        break;
      case 'left':
        x = -W / 2 + 0.9;
        z = along - D / 2;
        break;
      case 'right':
        x = W / 2 - 0.9;
        z = along - D / 2;
        break;
      default:
        x = along - W / 2;
        z = D / 2 - 0.9;
    }
  }
  return { x, z, yaw: Math.atan2(x, z) };
}

/** Furniture footprints the visitor cannot walk through. */
export function buildBlockers(room) {
  const list = (room.placedFurniture || [])
    .map((item) => {
      const def = resolveItemDef(item);
      if (!def) return null;
      const flat =
        (def.heightCm ?? 50) < 15 ||
        def.shapeType === 'rug' ||
        def.shapeType === 'rug-runner' ||
        def.shapeType === 'nepali-dhaka-rug';
      if (flat) return null;
      return {
        x: (item.x - room.widthCm / 2) / 100,
        z: (item.y - room.depthCm / 2) / 100,
        halfW: def.widthCm / 200,
        halfD: def.depthCm / 200,
        theta: -degToRad(item.rotationDeg || 0),
        bottom: (item.elevationCm || 0) / 100,
      };
    })
    .filter((b) => b && b.bottom < 1.2);
  // A room that is not a rectangle also blocks everything off its floor
  if (hasOutline(room)) list.floorRoom = room;
  return list;
}

export function isBlocked(px, pz, blockers) {
  const floor = blockers.floorRoom;
  if (floor) {
    const r = PLAYER_RADIUS;
    for (const [dx, dz] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
    ])
      if (!isOnFloor(floor, px + dx, pz + dz)) return true;
  }
  for (const b of blockers) {
    if (circleHitsBox(px, pz, PLAYER_RADIUS, b.x, b.z, b.halfW, b.halfD, b.theta)) return true;
  }
  return false;
}

/** Whether a walking position (metres from the room centre) is on the floor of an outline room. */
export function isOnFloor(room, px, pz) {
  if (!hasOutline(room)) return true;
  return pointInOutline(px * 100 + room.widthCm / 2, pz * 100 + room.depthCm / 2, room.outline, 0);
}
