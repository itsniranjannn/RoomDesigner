/**
 * walk.js
 * Pure helpers for the first-person walkthrough: entry point and furniture blocking.
 * Coordinates are metres, origin at the room centre (x = plan x, z = plan y).
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { degToRad } from './geometry.js';

export const PLAYER_RADIUS = 0.22;

/** Where the visitor enters: just inside the first door, facing the room centre. */
export function getWalkStart(room) {
  const W = room.widthCm / 100;
  const D = room.depthCm / 100;
  const door = (room.doors || [])[0];
  let x = 0;
  let z = D / 2 - 0.9;
  if (door) {
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
  return (room.placedFurniture || [])
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
}

export function isBlocked(px, pz, blockers) {
  for (const b of blockers) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const c = Math.cos(b.theta);
    const s = Math.sin(b.theta);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) < b.halfW + PLAYER_RADIUS && Math.abs(lz) < b.halfD + PLAYER_RADIUS)
      return true;
  }
  return false;
}
