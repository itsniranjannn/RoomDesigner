/**
 * geometry.js
 * Pure mathematical utilities for 2D room & furniture transformations.
 * 
 * Coordinate system:
 * - Origin (0, 0) is top-left of the room interior.
 * - x-axis points rightwards (positive x).
 * - y-axis points downwards (positive y, standard SVG/canvas convention).
 * - Rotation angles are in degrees, clockwise-positive.
 */

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Normalizes an angle in degrees to the [0, 360) range.
 */
export function normalizeAngle(deg) {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a === -0 ? 0 : a;
}

/**
 * Rotates a point (px, py) around center (cx, cy) by angleDeg clockwise.
 */
export function rotatePoint(px, py, cx, cy, angleDeg) {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = px - cx;
  const dy = py - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/**
 * Computes the 4 corners of a rotated rectangle in room-space (cm).
 * Order before rotation:
 * 0: Top-Left     (-hw, -hd)
 * 1: Top-Right    (+hw, -hd)
 * 2: Bottom-Right (+hw, +hd)
 * 3: Bottom-Left  (-hw, +hd)
 * 
 * @param {number} x - Center X in cm
 * @param {number} y - Center Y in cm
 * @param {number} widthCm - Width in cm (along local x)
 * @param {number} depthCm - Depth in cm (along local y)
 * @param {number} rotationDeg - Rotation in degrees (clockwise)
 * @returns {Array<{x: number, y: number}>} Array of 4 corner points
 */
export function getRotatedRectCorners(x, y, widthCm, depthCm, rotationDeg = 0) {
  const hw = widthCm / 2;
  const hd = depthCm / 2;
  const rad = degToRad(rotationDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    { dx: -hw, dy: -hd }, // Top-Left
    { dx: hw, dy: -hd },  // Top-Right
    { dx: hw, dy: hd },   // Bottom-Right
    { dx: -hw, dy: hd },  // Bottom-Left
  ];

  return localCorners.map(({ dx, dy }) => ({
    x: x + dx * cos - dy * sin,
    y: y + dx * sin + dy * cos,
  }));
}

/**
 * Computes the Axis-Aligned Bounding Box (AABB) of an arbitrary set of points.
 */
export function getAABB(points) {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Extracts normalized perpendicular axes (normals) for each edge of a polygon.
 * For an edge vector (dx, dy), the perpendicular is (-dy, dx).
 */
export function getPolygonNormals(corners) {
  const normals = [];
  const n = corners.length;

  for (let i = 0; i < n; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Normal perpendicular: (-dy, dx)
    const len = Math.hypot(dx, dy);
    if (len > 1e-7) {
      normals.push({
        x: -dy / len,
        y: dx / len,
      });
    }
  }

  return normals;
}

/**
 * Projects a polygon's vertices onto an axis and returns the min and max scalar projection values.
 */
export function projectPolygonOntoAxis(corners, axis) {
  let min = Infinity;
  let max = -Infinity;

  for (const p of corners) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }

  return { min, max };
}

/**
 * Tests if two 1D intervals [minA, maxA] and [minB, maxB] overlap.
 * Uses a small tolerance epsilon to avoid false collisions on flush contact.
 */
export function intervalsOverlap(minA, maxA, minB, maxB, epsilon = 0.05) {
  return !(maxA < minB + epsilon || maxB < minA + epsilon);
}

/**
 * Computes zoom scale and centering offset to fit a room (cm) inside a canvas viewport (px).
 */
export function calculateFitScale(roomWidthCm, roomDepthCm, viewportWidthPx, viewportHeightPx, paddingPx = 48) {
  const availableW = Math.max(100, viewportWidthPx - paddingPx * 2);
  const availableH = Math.max(100, viewportHeightPx - paddingPx * 2);

  const scaleX = availableW / roomWidthCm;
  const scaleY = availableH / roomDepthCm;
  const scale = Math.min(scaleX, scaleY);

  const canvasWidth = roomWidthCm * scale;
  const canvasHeight = roomDepthCm * scale;

  const offsetX = (viewportWidthPx - canvasWidth) / 2;
  const offsetY = (viewportHeightPx - canvasHeight) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    canvasWidth,
    canvasHeight,
  };
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

