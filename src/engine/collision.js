/**
 * collision.js
 * Separating Axis Theorem (SAT) collision detection for rotated rectangles
 * and room boundary containment checks.
 */

import {
  getRotatedRectCorners,
  getAABB,
  getPolygonNormals,
  projectPolygonOntoAxis,
  intervalsOverlap,
} from './geometry.js';

/**
 * Checks if two convex polygons collide using the Separating Axis Theorem (SAT).
 * 
 * @param {Array<{x: number, y: number}>} cornersA - 4 vertices of polygon A
 * @param {Array<{x: number, y: number}>} cornersB - 4 vertices of polygon B
 * @param {number} epsilon - Overlap tolerance in cm (prevents false positives on flush contact)
 * @returns {boolean} True if intersecting, false otherwise
 */
export function checkPolygonCollision(cornersA, cornersB, epsilon = 0.5) {
  // Broad-phase AABB test for fast rejection
  const aabbA = getAABB(cornersA);
  const aabbB = getAABB(cornersB);

  if (
    aabbA.maxX < aabbB.minX + epsilon ||
    aabbB.maxX < aabbA.minX + epsilon ||
    aabbA.maxY < aabbB.minY + epsilon ||
    aabbB.maxY < aabbA.minY + epsilon
  ) {
    return false;
  }

  // Narrow-phase SAT test
  // For rectangles, we only need 2 adjacent edge normals per rectangle (4 unique axes total)
  const normalsA = getPolygonNormals(cornersA).slice(0, 2);
  const normalsB = getPolygonNormals(cornersB).slice(0, 2);
  const axes = [...normalsA, ...normalsB];

  for (const axis of axes) {
    const projA = projectPolygonOntoAxis(cornersA, axis);
    const projB = projectPolygonOntoAxis(cornersB, axis);

    if (!intervalsOverlap(projA.min, projA.max, projB.min, projB.max, epsilon)) {
      // Found separating axis -> no collision
      return false;
    }
  }

  return true;
}

/**
 * Checks collision between two furniture items with arbitrary position, dimensions, and rotation.
 */
export function checkFurnitureCollision(itemA, itemB, epsilon = 0.5) {
  const cornersA = getRotatedRectCorners(
    itemA.x,
    itemA.y,
    itemA.widthCm,
    itemA.depthCm,
    itemA.rotationDeg || 0
  );
  const cornersB = getRotatedRectCorners(
    itemB.x,
    itemB.y,
    itemB.widthCm,
    itemB.depthCm,
    itemB.rotationDeg || 0
  );

  return checkPolygonCollision(cornersA, cornersB, epsilon);
}

/**
 * Checks if a furniture item intersects or protrudes outside the room boundaries.
 * 
 * @param {Object} item - { x, y, widthCm, depthCm, rotationDeg }
 * @param {number} roomWidthCm - Room width in cm
 * @param {number} roomDepthCm - Room depth in cm
 * @param {number} epsilon - Permitted edge tolerance in cm
 * @returns {boolean} True if the furniture is out of bounds or colliding with outer walls
 */
export function checkRoomBoundaryCollision(item, roomWidthCm, roomDepthCm, epsilon = 0.1) {
  const corners = getRotatedRectCorners(
    item.x,
    item.y,
    item.widthCm,
    item.depthCm,
    item.rotationDeg || 0
  );

  for (const c of corners) {
    if (
      c.x < -epsilon ||
      c.x > roomWidthCm + epsilon ||
      c.y < -epsilon ||
      c.y > roomDepthCm + epsilon
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates collisions across all placed furniture items and room boundaries.
 * 
 * @param {Array<Object>} placedFurniture - List of placed items
 * @param {number} roomWidthCm - Room width in cm
 * @param {number} roomDepthCm - Room depth in cm
 * @returns {{ collidingIds: Set<string>, boundaryCollidingIds: Set<string> }}
 */
export function evaluateAllCollisions(placedFurniture, roomWidthCm, roomDepthCm) {
  const collidingIds = new Set();
  const boundaryCollidingIds = new Set();

  const n = placedFurniture.length;

  // Pre-calculate corners for each item
  const cornersMap = new Map();
  for (const item of placedFurniture) {
    cornersMap.set(
      item.id,
      getRotatedRectCorners(
        item.x,
        item.y,
        item.widthCm,
        item.depthCm,
        item.rotationDeg || 0
      )
    );
  }

  // Check boundary violations
  for (const item of placedFurniture) {
    const corners = cornersMap.get(item.id);
    for (const c of corners) {
      if (
        c.x < -0.1 ||
        c.x > roomWidthCm + 0.1 ||
        c.y < -0.1 ||
        c.y > roomDepthCm + 0.1
      ) {
        boundaryCollidingIds.add(item.id);
        collidingIds.add(item.id);
        break;
      }
    }
  }

  // Check pairwise furniture collisions
  for (let i = 0; i < n; i++) {
    const itemA = placedFurniture[i];
    const cornersA = cornersMap.get(itemA.id);

    for (let j = i + 1; j < n; j++) {
      const itemB = placedFurniture[j];
      const cornersB = cornersMap.get(itemB.id);

      if (checkPolygonCollision(cornersA, cornersB)) {
        collidingIds.add(itemA.id);
        collidingIds.add(itemB.id);
      }
    }
  }

  return {
    collidingIds,
    boundaryCollidingIds,
  };
}

