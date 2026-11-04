/**
 * clearance.js
 * Ergonomic clearance checks: door swing zones, window obstruction and
 * tight walking passages between large pieces.
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB } from './geometry.js';
import { checkPolygonCollision } from './collision.js';
import { hasOutline, outlineEdges, outlineOpeningZone } from './roomShape.js';

const MIN_PASSAGE_CM = 60;
// Gaps narrower than this are not mistaken for a passage (pieces simply sit side by side)
const MIN_WALKABLE_GAP_CM = 25;
const WINDOW_DEPTH_CM = 30;
const WINDOW_BLOCK_HEIGHT_CM = 100;

function rectCorners(minX, minY, maxX, maxY) {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/** Interior rectangle of the given depth in front of an opening on a wall. */
function getOpeningZone(wall, offsetCm, widthCm, depthCm, roomWidthCm, roomDepthCm) {
  switch (wall) {
    case 'top':
      return rectCorners(offsetCm, 0, offsetCm + widthCm, depthCm);
    case 'left':
      return rectCorners(0, offsetCm, depthCm, offsetCm + widthCm);
    case 'right':
      return rectCorners(roomWidthCm - depthCm, offsetCm, roomWidthCm, offsetCm + widthCm);
    case 'bottom':
    default:
      return rectCorners(offsetCm, roomDepthCm - depthCm, offsetCm + widthCm, roomDepthCm);
  }
}

/** Zones that should stay free of furniture (door swings, window strips). */
export function getClearanceZones(room) {
  const zones = [];
  if (hasOutline(room)) {
    const solid = new Set(
      outlineEdges(room)
        .filter((e) => !e.open)
        .map((e) => e.i)
    );
    const put = (kind, o, depth) => {
      if (!solid.has(o.edge ?? 0)) return;
      zones.push({ kind, openingId: o.id, corners: outlineOpeningZone(room, o, depth) });
    };
    for (const d of room.doors || [])
      put('door', d, d.swingDirection === 'outward' ? 60 : d.widthCm);
    for (const w of room.windows || []) put('window', w, WINDOW_DEPTH_CM);
    return zones;
  }
  for (const door of room.doors || []) {
    const wall = door.wall || 'bottom';
    const depth = door.swingDirection === 'outward' ? 60 : door.widthCm;
    zones.push({
      kind: 'door',
      openingId: door.id,
      corners: getOpeningZone(wall, door.offsetCm, door.widthCm, depth, room.widthCm, room.depthCm),
    });
  }
  for (const win of room.windows || []) {
    const wall = win.wall || 'top';
    zones.push({
      kind: 'window',
      openingId: win.id,
      corners: getOpeningZone(
        wall,
        win.offsetCm,
        win.widthCm,
        WINDOW_DEPTH_CM,
        room.widthCm,
        room.depthCm
      ),
    });
  }
  return zones;
}

/**
 * Distance between two boxes that face each other across a gap, or null when they
 * do not overlap along either axis by at least 40 cm.
 */
export function facingGap(aabbA, aabbB) {
  const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
  const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);
  if (overlapX >= 40) return -overlapY;
  if (overlapY >= 40) return -overlapX;
  return null;
}

export function isTightPassage(gap) {
  return gap !== null && gap >= MIN_WALKABLE_GAP_CM && gap < MIN_PASSAGE_CM;
}

function isFlat(def) {
  return (
    !def ||
    (def.heightCm ?? 100) < 5 ||
    def.shapeType === 'rug' ||
    def.shapeType === 'rug-runner' ||
    def.shapeType === 'nepali-dhaka-rug'
  );
}

/**
 * Returns a list of clearance issues:
 * { itemId, kind: 'door-swing' | 'window' | 'tight-passage', openingId?, otherId?, gapCm? }
 */
export function evaluateClearance(room) {
  const issues = [];
  if (!room) return issues;
  const items = (room.placedFurniture || [])
    .map((item) => {
      const def = resolveItemDef(item);
      if (!def) return null;
      const corners = getRotatedRectCorners(
        item.x,
        item.y,
        def.widthCm,
        def.depthCm,
        item.rotationDeg || 0
      );
      return { item, def, corners, aabb: getAABB(corners), bottom: item.elevationCm || 0 };
    })
    .filter(Boolean);

  const zones = getClearanceZones(room);
  for (const entry of items) {
    if (isFlat(entry.def)) continue;
    for (const zone of zones) {
      if (
        zone.kind === 'window' &&
        (entry.def.heightCm ?? 0) + entry.bottom <= WINDOW_BLOCK_HEIGHT_CM
      )
        continue;
      if (checkPolygonCollision(entry.corners, zone.corners)) {
        issues.push({
          itemId: entry.item.id,
          kind: zone.kind === 'door' ? 'door-swing' : 'window',
          openingId: zone.openingId,
        });
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (isFlat(a.def) || isFlat(b.def)) continue;
      if (a.def.heightCm < 40 || b.def.heightCm < 40) continue;
      if (a.def.widthCm * a.def.depthCm < 2500 && b.def.widthCm * b.def.depthCm < 2500) continue;
      if (a.bottom !== b.bottom) continue;

      const gap = facingGap(a.aabb, b.aabb);
      if (isTightPassage(gap)) {
        issues.push({
          itemId: a.item.id,
          otherId: b.item.id,
          kind: 'tight-passage',
          gapCm: Math.round(gap),
        });
        issues.push({
          itemId: b.item.id,
          otherId: a.item.id,
          kind: 'tight-passage',
          gapCm: Math.round(gap),
        });
      }
    }
  }
  return issues;
}

export function describeIssue(issue) {
  switch (issue.kind) {
    case 'door-swing':
      return 'Blocks a door swing';
    case 'window':
      return 'Obstructs a window';
    case 'tight-passage':
      return `Only ${issue.gapCm} cm walking gap (min ${MIN_PASSAGE_CM} cm)`;
    default:
      return 'Clearance issue';
  }
}
