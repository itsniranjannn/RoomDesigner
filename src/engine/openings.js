/**
 * openings.js
 * Pure mathematical functions for constraining, dragging, and resizing doors and windows
 * within architectural wall boundaries.
 */

export const OPENING_LIMITS = {
  door: { minWidth: 60, maxWidth: 120 },
  window: { minWidth: 60, maxWidth: 240 },
  cornerMargin: 15, // cm from corner
};

/**
 * Clamps an opening's width and offset within a wall segment.
 */
export function clampOpening(type, offsetCm, widthCm, wallLengthCm) {
  const limits = OPENING_LIMITS[type] || OPENING_LIMITS.window;
  const margin = OPENING_LIMITS.cornerMargin;

  const validWallLen = Number.isFinite(wallLengthCm) && wallLengthCm > margin * 2 ? wallLengthCm : 500;
  const rawW = Number.isFinite(widthCm) ? widthCm : (type === 'door' ? 90 : 120);
  const rawOffset = Number.isFinite(offsetCm) ? offsetCm : Math.round(validWallLen / 2 - rawW / 2);

  const maxPossibleWidth = Math.max(limits.minWidth, validWallLen - margin * 2);
  const clampedWidth = Math.max(limits.minWidth, Math.min(limits.maxWidth, Math.min(maxPossibleWidth, rawW)));

  const maxOffset = validWallLen - clampedWidth - margin;
  const clampedOffset = Math.max(margin, Math.min(maxOffset, rawOffset));

  return {
    offsetCm: Math.round(clampedOffset),
    widthCm: Math.round(clampedWidth),
  };
}

/**
 * Returns canonical physical coordinates and dimensions for any opening.
 * Ensures 1:1 mathematical alignment between 2D drafting and 3D Studio.
 */
export function getOpeningGeometry(wall, offsetCm, widthCm, roomWidthCm, roomDepthCm) {
  const normWall = wall || 'top';
  const isHorizontal = normWall === 'top' || normWall === 'bottom';
  const wallLen = isHorizontal ? roomWidthCm : roomDepthCm;
  const safeOffset = Number.isFinite(offsetCm) ? offsetCm : 20;
  const safeWidth = Number.isFinite(widthCm) ? widthCm : 90;

  // 3D coordinates in meters relative to room center
  let centerM = 0;
  if (isHorizontal) {
    centerM = (safeOffset + safeWidth / 2 - roomWidthCm / 2) / 100;
  } else {
    centerM = (safeOffset + safeWidth / 2 - roomDepthCm / 2) / 100;
  }

  return {
    wall: normWall,
    isHorizontal,
    wallLengthCm: wallLen,
    offsetCm: safeOffset,
    widthCm: safeWidth,
    centerM,
  };
}

/**
 * Clamps a reposition drag delta along a wall segment.
 */
export function clampMoveOpening(type, startOffsetCm, widthCm, deltaCm, wallLengthCm) {
  const margin = OPENING_LIMITS.cornerMargin;
  const minOffset = margin;
  const maxOffset = wallLengthCm - widthCm - margin;

  const rawOffset = startOffsetCm + deltaCm;
  const clampedOffset = Math.max(minOffset, Math.min(maxOffset, rawOffset));

  return Math.round(clampedOffset);
}

/**
 * Clamps resizing from the end handle (right/bottom).
 * Left edge remains pinned at startOffsetCm.
 */
export function clampResizeEnd(type, startOffsetCm, rawTargetWidthCm, wallLengthCm) {
  const limits = OPENING_LIMITS[type] || OPENING_LIMITS.window;
  const margin = OPENING_LIMITS.cornerMargin;

  const maxAllowedWidth = Math.min(limits.maxWidth, wallLengthCm - startOffsetCm - margin);
  const clampedWidth = Math.max(limits.minWidth, Math.min(maxAllowedWidth, rawTargetWidthCm));

  return Math.round(clampedWidth);
}

/**
 * Clamps resizing from the start handle (left/top).
 * Right edge remains pinned at startOffsetCm + startWidthCm.
 */
export function clampResizeStart(type, startOffsetCm, startWidthCm, rawTargetOffsetCm, wallLengthCm) {
  const limits = OPENING_LIMITS[type] || OPENING_LIMITS.window;
  const margin = OPENING_LIMITS.cornerMargin;
  const rightEdge = startOffsetCm + startWidthCm;

  const minOffset = Math.max(margin, rightEdge - limits.maxWidth);
  const maxOffset = rightEdge - limits.minWidth;

  const clampedOffset = Math.max(minOffset, Math.min(maxOffset, rawTargetOffsetCm));
  const clampedWidth = rightEdge - clampedOffset;

  return {
    offsetCm: Math.round(clampedOffset),
    widthCm: Math.round(clampedWidth),
  };
}

