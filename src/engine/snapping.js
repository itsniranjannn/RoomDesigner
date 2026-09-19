/**
 * snapping.js
 * Intelligent assistive snapping for furniture placement:
 * 1. Snap-to-grid (e.g., 10cm drafting interval)
 * 2. Snap-to-wall (flush against room boundaries when orthogonal)
 */

import { normalizeAngle, getRotatedRectCorners, getAABB } from './geometry.js';

/**
 * Snaps a 1D scalar value to nearest grid step if within threshold.
 * 
 * @param {number} val - Current coordinate in cm
 * @param {number} step - Grid interval in cm (default 10cm)
 * @param {number} threshold - Distance threshold to snap in cm (default 3.5cm)
 * @returns {{ value: number, snapped: boolean }}
 */
export function snapValueToGrid(val, step = 10, threshold = 3.5) {
  const nearest = Math.round(val / step) * step;
  if (Math.abs(val - nearest) <= threshold) {
    return { value: nearest, snapped: true };
  }
  return { value: val, snapped: false };
}

/**
 * Checks if a rotation angle is approximately orthogonal (0, 90, 180, 270 deg).
 * 
 * @param {number} angleDeg - Angle in degrees
 * @param {number} tolerance - Allowed deviation in degrees (default 6°)
 * @returns {{ isOrthogonal: boolean, targetAngle: number }}
 */
export function getOrthogonalAlignment(angleDeg, tolerance = 6) {
  const norm = normalizeAngle(angleDeg);
  const targets = [0, 90, 180, 270, 360];

  for (const target of targets) {
    const diff = Math.abs(norm - target);
    if (diff <= tolerance || Math.abs(diff - 360) <= tolerance) {
      return { isOrthogonal: true, targetAngle: target % 360 };
    }
  }

  return { isOrthogonal: false, targetAngle: norm };
}

/**
 * Snaps furniture flush against room walls if positioned close to a wall
 * and orthogonally oriented.
 * 
 * @param {Object} item - { x, y, widthCm, depthCm, rotationDeg }
 * @param {number} roomWidthCm - Room width in cm
 * @param {number} roomDepthCm - Room depth in cm
 * @param {number} threshold - Wall snap threshold in cm (default 12cm)
 * @returns {{ x: number, y: number, snappedX: boolean, snappedY: boolean }}
 */
export function snapToWalls(item, roomWidthCm, roomDepthCm, threshold = 12) {
  let { x, y, widthCm, depthCm, rotationDeg = 0 } = item;
  let snappedX = false;
  let snappedY = false;

  const { isOrthogonal } = getOrthogonalAlignment(rotationDeg);

  // We only snap flush to walls when the piece is orthogonally aligned
  if (!isOrthogonal) {
    return { x, y, snappedX, snappedY };
  }

  const corners = getRotatedRectCorners(x, y, widthCm, depthCm, rotationDeg);
  const aabb = getAABB(corners);

  // Left wall (x = 0)
  const distLeft = aabb.minX;
  if (distLeft >= -threshold && distLeft <= threshold) {
    x += (0 - aabb.minX);
    snappedX = true;
  }
  // Right wall (x = roomWidthCm)
  else {
    const distRight = roomWidthCm - aabb.maxX;
    if (distRight >= -threshold && distRight <= threshold) {
      x += (roomWidthCm - aabb.maxX);
      snappedX = true;
    }
  }

  // Recalculate AABB if x changed
  const currentCorners = snappedX
    ? getRotatedRectCorners(x, y, widthCm, depthCm, rotationDeg)
    : corners;
  const currentAABB = snappedX ? getAABB(currentCorners) : aabb;

  // Top wall (y = 0)
  const distTop = currentAABB.minY;
  if (distTop >= -threshold && distTop <= threshold) {
    y += (0 - currentAABB.minY);
    snappedY = true;
  }
  // Bottom wall (y = roomDepthCm)
  else {
    const distBottom = roomDepthCm - currentAABB.maxY;
    if (distBottom >= -threshold && distBottom <= threshold) {
      y += (roomDepthCm - currentAABB.maxY);
      snappedY = true;
    }
  }

  return { x, y, snappedX, snappedY };
}

/**
 * Comprehensive snapping pipeline: attempts wall snap first, then falls back to grid snap.
 * 
 * @param {Object} item - { x, y, widthCm, depthCm, rotationDeg }
 * @param {number} roomWidthCm - Room width in cm
 * @param {number} roomDepthCm - Room depth in cm
 * @param {Object} options - { gridStep: 10, gridThreshold: 3.5, wallThreshold: 12 }
 * @returns {{ x: number, y: number, snappedToWall: boolean, snappedToGrid: boolean }}
 */
export function applySnapping(item, roomWidthCm, roomDepthCm, options = {}) {
  const { gridStep = 10, gridThreshold = 3.5, wallThreshold = 12 } = options;

  // 1. Wall snap
  const wallResult = snapToWalls(item, roomWidthCm, roomDepthCm, wallThreshold);
  let finalX = wallResult.x;
  let finalY = wallResult.y;
  let snappedToGrid = false;

  // 2. Grid snap on axes not already snapped to a wall
  if (!wallResult.snappedX) {
    const gridX = snapValueToGrid(finalX, gridStep, gridThreshold);
    finalX = gridX.value;
    if (gridX.snapped) snappedToGrid = true;
  }

  if (!wallResult.snappedY) {
    const gridY = snapValueToGrid(finalY, gridStep, gridThreshold);
    finalY = gridY.value;
    if (gridY.snapped) snappedToGrid = true;
  }

  // 3. Strict room boundary containment: furniture cannot cross outer walls
  const clamped = clampInsideRoom(
    {
      x: finalX,
      y: finalY,
      widthCm: item.widthCm,
      depthCm: item.depthCm,
      rotationDeg: item.rotationDeg || 0,
    },
    roomWidthCm,
    roomDepthCm
  );

  return {
    x: clamped.x,
    y: clamped.y,
    snappedToWall: wallResult.snappedX || wallResult.snappedY,
    snappedToGrid,
  };
}

/**
 * Clamps a piece so its rotated bounding footprint cannot protrude outside room walls.
 */
export function clampInsideRoom(item, roomWidthCm, roomDepthCm) {
  const corners = getRotatedRectCorners(
    item.x,
    item.y,
    item.widthCm,
    item.depthCm,
    item.rotationDeg || 0
  );
  const aabb = getAABB(corners);

  let newX = item.x;
  let newY = item.y;

  if (aabb.minX < 0) {
    newX += -aabb.minX;
  } else if (aabb.maxX > roomWidthCm) {
    newX -= (aabb.maxX - roomWidthCm);
  }

  const cornersAfterX = getRotatedRectCorners(
    newX,
    newY,
    item.widthCm,
    item.depthCm,
    item.rotationDeg || 0
  );
  const aabbAfterX = getAABB(cornersAfterX);

  if (aabbAfterX.minY < 0) {
    newY += -aabbAfterX.minY;
  } else if (aabbAfterX.maxY > roomDepthCm) {
    newY -= (aabbAfterX.maxY - roomDepthCm);
  }

  return {
    x: Math.round(newX * 10) / 10,
    y: Math.round(newY * 10) / 10,
  };
}

