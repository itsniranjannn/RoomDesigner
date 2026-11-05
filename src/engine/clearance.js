/**
 * clearance.js
 * Ergonomic clearance checks: door swing zones, window obstruction and
 * tight walking passages between large pieces.
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB } from './geometry.js';
import {
  doorZone,
  openingFrame,
  polygonsOverlap,
  windowSwingZones,
  WINDOW_SILL_CM,
} from './planning.js';

const MIN_PASSAGE_CM = 60;
// Gaps narrower than this are not mistaken for a passage (pieces simply sit side by side)
const MIN_WALKABLE_GAP_CM = 25;
const WINDOW_DEPTH_CM = 30;
const WINDOW_BLOCK_HEIGHT_CM = 100;

/** Zones that should stay free of furniture (door swings, window strips and swings). */
export function getClearanceZones(room) {
  const zones = [];
  for (const door of room.doors || []) {
    const zone = doorZone(room, door);
    if (zone) zones.push({ kind: 'door', openingId: door.id, corners: zone.corners });
  }
  for (const win of room.windows || []) {
    const frame = openingFrame(room, win, 'window');
    if (!frame || frame.open) continue;
    const a = win.offsetCm;
    const b = win.offsetCm + win.widthCm;
    zones.push({
      kind: 'window',
      openingId: win.id,
      corners: [
        frame.at(a, 0),
        frame.at(b, 0),
        frame.at(b, WINDOW_DEPTH_CM),
        frame.at(a, WINDOW_DEPTH_CM),
      ],
    });
    windowSwingZones(room, win).forEach((corners) =>
      zones.push({ kind: 'window-swing', openingId: win.id, corners })
    );
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
 * { itemId, kind: 'door-swing' | 'window' | 'window-swing' | 'tight-passage', openingId?, otherId?, gapCm? }
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
      const top = (entry.def.heightCm ?? 0) + entry.bottom;
      if (zone.kind === 'window' && top <= WINDOW_BLOCK_HEIGHT_CM) continue;
      if (zone.kind === 'window-swing' && top <= WINDOW_SILL_CM) continue;
      if (polygonsOverlap(entry.corners, zone.corners)) {
        const kind =
          zone.kind === 'door'
            ? 'door-swing'
            : zone.kind === 'window-swing'
              ? 'window-swing'
              : 'window';
        // One window can sweep two leaves: report the piece once per opening
        if (
          issues.some(
            (i) => i.itemId === entry.item.id && i.openingId === zone.openingId && i.kind === kind
          )
        )
          continue;
        issues.push({ itemId: entry.item.id, kind, openingId: zone.openingId });
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
    case 'window-swing':
      return 'Blocks a window from opening';
    case 'tight-passage':
      return `Only ${issue.gapCm} cm walking gap (min ${MIN_PASSAGE_CM} cm)`;
    default:
      return 'Clearance issue';
  }
}
