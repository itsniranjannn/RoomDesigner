/**
 * measure.js
 * Distances for the measure tool and live wall-distance dimensions.
 */

import { getRotatedRectCorners, getAABB } from './geometry.js';
import { distancesToOutline } from './roomShape.js';

export function distanceCm(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function formatCm(cm) {
  if (cm >= 100) return `${(cm / 100).toFixed(2)} m`;
  return `${Math.round(cm)} cm`;
}

/** Gap from an item's bounding box to each of the four room walls. */
export function getWallDistances(item, widthCm, depthCm, roomWidthCm, roomDepthCm, outline = null) {
  const aabb = getAABB(
    getRotatedRectCorners(item.x, item.y, widthCm, depthCm, item.rotationDeg || 0)
  );
  if (outline) return { aabb, ...distancesToOutline(aabb, outline) };
  return {
    aabb,
    left: Math.max(0, aabb.minX),
    right: Math.max(0, roomWidthCm - aabb.maxX),
    top: Math.max(0, aabb.minY),
    bottom: Math.max(0, roomDepthCm - aabb.maxY),
  };
}
