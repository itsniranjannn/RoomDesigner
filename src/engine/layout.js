/**
 * layout.js
 * Greedy auto-layout: proposes positions for a list of furniture types inside a room
 * while respecting boundaries, collisions and door/window clearance zones.
 */

import { getFurnitureType, resolveItemDef } from '../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB } from './geometry.js';
import { checkPolygonCollision } from './collision.js';
import { canRestOn, surfaceTopOf } from './stacking.js';
import { getClearanceZones, facingGap, isTightPassage } from './clearance.js';
import {
  hasOutline,
  outlineEdges,
  pointOnEdge,
  cornersInOutline,
  nudgeIntoOutline,
} from './roomShape.js';

const WALL_GAP = 2;
const STEP = 20;
// Rotation at which the item's back (top edge) faces each wall
const WALL_ROTATION = { top: 0, right: 90, bottom: 180, left: 270 };
const WALL_ORDER = ['top', 'right', 'left', 'bottom'];
const CENTER_SHAPES = new Set(['table', 'table-round', 'coffee-table', 'kitchen-island']);
const COMPANION_SHAPES = new Set(['nightstand', 'side-table', 'lamp', 'plant']);
const ANCHOR_SHAPES = new Set(['bed', 'sofa', 'armchair']);

function isRug(def) {
  return (
    def.shapeType === 'rug' ||
    def.shapeType === 'rug-runner' ||
    def.shapeType === 'nepali-dhaka-rug'
  );
}

function makeEntry(typeId, def, x, y, rotationDeg, id) {
  return {
    item: {
      id,
      furnitureTypeId: typeId,
      x: Math.round(x),
      y: Math.round(y),
      rotationDeg,
      elevationCm: 0,
    },
    def,
    corners: getRotatedRectCorners(x, y, def.widthCm, def.depthCm, rotationDeg),
  };
}

/** A free support for a resting piece, preferring the types it lists in `stackableOn`. */
function pickBase(def, placed) {
  const supports = placed.filter((p) => canRestOn(def, p.def));
  const taken = (p) =>
    placed.some(
      (o) => o !== p && o.def.restsOnTop && o.item.x === p.item.x && o.item.y === p.item.y
    );
  const free = supports.filter((p) => !taken(p));
  const pool = free.length ? free : supports;
  const listed = pool.find((p) => def.stackableOn?.includes(p.item.furnitureTypeId));
  if (listed) return listed;
  // A piece that names its supports waits for one; any other small piece takes a free surface
  return def.stackableOn?.length ? null : free[0] || null;
}

function tightWithAny(entry, placed) {
  if (entry.def.heightCm < 40) return false;
  const box = getAABB(entry.corners);
  return placed.some(
    (other) =>
      !isRug(other.def) &&
      other.def.heightCm >= 40 &&
      isTightPassage(facingGap(box, getAABB(other.corners)))
  );
}

function fits(entry, placed, zones, room, strict = false) {
  if (hasOutline(room)) {
    if (!cornersInOutline(entry.corners, room.outline)) return false;
  } else {
    for (const c of entry.corners) {
      if (c.x < 0 || c.x > room.widthCm || c.y < 0 || c.y > room.depthCm) return false;
    }
  }
  for (const other of placed) {
    if (isRug(other.def)) continue;
    if (checkPolygonCollision(entry.corners, other.corners)) return false;
  }
  for (const zone of zones) {
    if (zone.kind === 'window' && entry.def.heightCm <= 100) continue;
    if (checkPolygonCollision(entry.corners, zone.corners)) return false;
  }
  if (strict && tightWithAny(entry, placed)) return false;
  return true;
}

/** Spots flush against every walled edge of an outline, backs to the wall. */
function outlineWallCandidates(def, room) {
  const out = [];
  for (const e of outlineEdges(room)) {
    if (e.open) continue;
    const rot = e.ny > 0 ? 0 : e.nx < 0 ? 90 : e.ny < 0 ? 180 : 270;
    const aabb = getAABB(getRotatedRectCorners(0, 0, def.widthCm, def.depthCm, rot));
    const halfAlong = (e.dx !== 0 ? aabb.maxX - aabb.minX : aabb.maxY - aabb.minY) / 2;
    const halfAcross = (e.dx !== 0 ? aabb.maxY - aabb.minY : aabb.maxX - aabb.minX) / 2;
    for (let t = halfAlong + WALL_GAP; t <= e.len - halfAlong - WALL_GAP; t += STEP) {
      const p = pointOnEdge(e, t, halfAcross + WALL_GAP);
      out.push({ x: p.x, y: p.y, rot, wall: 'edge' });
    }
  }
  return out;
}

function wallCandidates(def, room) {
  if (hasOutline(room)) return outlineWallCandidates(def, room);
  const out = [];
  for (const wall of WALL_ORDER) {
    const rot = WALL_ROTATION[wall];
    const aabb = getAABB(getRotatedRectCorners(0, 0, def.widthCm, def.depthCm, rot));
    const halfX = (aabb.maxX - aabb.minX) / 2;
    const halfY = (aabb.maxY - aabb.minY) / 2;
    if (wall === 'top' || wall === 'bottom') {
      const y = wall === 'top' ? halfY + WALL_GAP : room.depthCm - halfY - WALL_GAP;
      for (let x = halfX + WALL_GAP; x <= room.widthCm - halfX - WALL_GAP; x += STEP)
        out.push({ x, y, rot, wall });
    } else {
      const x = wall === 'left' ? halfX + WALL_GAP : room.widthCm - halfX - WALL_GAP;
      for (let y = halfY + WALL_GAP; y <= room.depthCm - halfY - WALL_GAP; y += STEP)
        out.push({ x, y, rot, wall });
    }
  }
  return out;
}

function centerCandidates(room) {
  const cx = room.widthCm / 2;
  const cy = room.depthCm / 2;
  const out = [{ x: cx, y: cy, rot: 0 }];
  const reach = Math.max(room.widthCm, room.depthCm) * (hasOutline(room) ? 0.75 : 0.5);
  for (let r = STEP; r < reach; r += STEP) {
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      out.push({ x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r, rot: 0 });
    }
  }
  return out;
}

function companionCandidates(def, anchor) {
  const out = [];
  const rot = anchor.item.rotationDeg;
  const rad = (rot * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const offset = anchor.def.widthCm / 2 + def.widthCm / 2 + 3;
  for (const side of [1, -1]) {
    out.push({ x: anchor.item.x + ux * offset * side, y: anchor.item.y + uy * offset * side, rot });
  }
  return out;
}

/**
 * @param {Object} room - { widthCm, depthCm, doors, windows, placedFurniture }
 * @param {string[]} typeIds - furniture type ids to place
 * @returns {{ placed: Array<Object>, unplaced: string[] }}
 */
export function suggestLayout(room, typeIds) {
  const zones = getClearanceZones(room);
  const defs = typeIds.map((id) => ({ id, def: getFurnitureType(id) })).filter((e) => e.def);

  const rank = (e) => {
    if (isRug(e.def)) return -1;
    if (ANCHOR_SHAPES.has(e.def.shapeType)) return 0;
    if (COMPANION_SHAPES.has(e.def.shapeType)) return 3;
    return 1;
  };
  defs.sort(
    (a, b) => rank(a) - rank(b) || b.def.widthCm * b.def.depthCm - a.def.widthCm * a.def.depthCm
  );

  // Pieces already in the room act as obstacles; only new pieces are returned
  const placed = (room.placedFurniture || [])
    .map((item) => {
      const def = resolveItemDef(item);
      if (!def) return null;
      return {
        item,
        def,
        corners: getRotatedRectCorners(
          item.x,
          item.y,
          def.widthCm,
          def.depthCm,
          item.rotationDeg || 0
        ),
      };
    })
    .filter(Boolean);
  const existingCount = placed.length;
  const unplaced = [];
  let counter = 0;
  const nextId = () => `item-auto-${Date.now()}-${counter++}`;

  for (const { id, def } of defs) {
    // Small pieces rest on a free surface (TV on its console) instead of taking floor space
    if (def.restsOnTop) {
      const base = pickBase(def, placed);
      if (base) {
        const entry = makeEntry(id, def, base.item.x, base.item.y, base.item.rotationDeg, nextId());
        entry.item.elevationCm = surfaceTopOf(base.item, base.def);
        placed.push(entry);
        continue;
      }
    }

    let candidates;
    if (isRug(def)) {
      const middle = {
        x: room.widthCm / 2,
        y: room.depthCm / 2,
        widthCm: def.widthCm,
        depthCm: def.depthCm,
      };
      const at = hasOutline(room) ? nudgeIntoOutline(middle, room.outline) : middle;
      candidates = [{ x: at.x, y: at.y, rot: 0 }];
    } else if (CENTER_SHAPES.has(def.shapeType)) candidates = centerCandidates(room);
    else if (COMPANION_SHAPES.has(def.shapeType)) {
      const anchor = placed.find((p) => ANCHOR_SHAPES.has(p.def.shapeType));
      candidates = [
        ...(anchor ? companionCandidates(def, anchor) : []),
        ...wallCandidates(def, room),
      ];
    } else candidates = wallCandidates(def, room);

    let chosen = null;
    // First pass avoids cramped passages; second pass accepts any legal spot
    for (const strict of [true, false]) {
      for (const c of candidates) {
        const entry = makeEntry(id, def, c.x, c.y, c.rot, nextId());
        if (isRug(def) || fits(entry, placed, zones, room, strict)) {
          chosen = entry;
          break;
        }
      }
      if (chosen) break;
    }
    if (!chosen) {
      // Last resort: scan the floor for any free spot
      for (let y = 40; y < room.depthCm && !chosen; y += STEP) {
        for (let x = 40; x < room.widthCm && !chosen; x += STEP) {
          const entry = makeEntry(id, def, x, y, 0, nextId());
          if (fits(entry, placed, zones, room)) chosen = entry;
        }
      }
    }
    if (chosen) placed.push(chosen);
    else unplaced.push(id);
  }

  return { placed: placed.slice(existingCount).map((p) => p.item), unplaced };
}
