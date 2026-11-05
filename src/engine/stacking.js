/**
 * stacking.js
 * Pure helpers for pieces that rest on top of other pieces (a TV on a console, a lamp on a
 * nightstand). A piece with `restsOnTop` sits on the highest `supportsTop` piece under its
 * footprint centre; the surface is the support's `surfaceHeightCm`, or its full height.
 * Elevation is always derived from where a piece stands, so moving it off a support drops it to
 * the floor again and deleting the support does the same.
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { getRotatedRectCorners, normalizeAngle } from './geometry.js';

/** A rider counts as resting when its base is within this of the surface (cm). */
const SURFACE_TOLERANCE_CM = 0.75;
/** Movement smaller than this is treated as "did not move" (cm / degrees). */
const MOVE_EPS = 0.01;

export function canRestOnTop(def) {
  return !!def?.restsOnTop;
}

export function offersSurface(def) {
  return !!def?.supportsTop && !def?.restsOnTop;
}

/** Rugs and carpets lie on the floor: they never lift a piece and always draw underneath. */
export function isFloorCovering(def) {
  return !!def && (def.shapeType?.startsWith('rug') || def.shapeType === 'nepali-dhaka-rug');
}

/** Footprints may overshoot a little (a pillow hanging over a bed edge) but a sofa is not a shelf item. */
const FIT_SLACK = 1.1;

/**
 * True when a piece with `riderDef` may rest on a piece with `supportDef`: the rider is a small
 * item, the support has a flat top, a hard appliance does not sink into a soft surface (bed,
 * sofa) and the rider is not bigger than the top it sits on.
 */
export function canRestOn(riderDef, supportDef) {
  if (!canRestOnTop(riderDef) || !offersSurface(supportDef)) return false;
  if (isFloorCovering(supportDef)) return false;
  if (supportDef.supportKind === 'soft' && riderDef.needsHardTop) return false;
  const [rMin, rMax] = [riderDef.widthCm, riderDef.depthCm].sort((a, b) => a - b);
  const [sMin, sMax] = [supportDef.widthCm, supportDef.depthCm].sort((a, b) => a - b);
  return rMin <= sMin * FIT_SLACK + 1 && rMax <= sMax * FIT_SLACK + 1;
}

/** Paint order for the plan: floor coverings first, then by height, then by layer order. */
export function drawOrder(items) {
  return items
    .map((item, index) => ({ item, index, rug: isFloorCovering(resolveItemDef(item)) ? 0 : 1 }))
    .sort(
      (a, b) =>
        a.rug - b.rug || (a.item.elevationCm || 0) - (b.item.elevationCm || 0) || a.index - b.index
    )
    .map((e) => e.item);
}

/** Height of the usable top surface above the support's own base, in cm. */
export function surfaceHeightOf(def) {
  if (!def) return 0;
  return def.surfaceHeightCm ?? def.heightCm ?? 0;
}

/** True when (x, y) lies within the item's (rotated) footprint. */
export function pointInFootprint(item, def, x, y) {
  const rad = (-(item.rotationDeg || 0) * Math.PI) / 180;
  const dx = x - item.x;
  const dy = y - item.y;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= def.widthCm / 2 + 1e-6 && Math.abs(ly) <= def.depthCm / 2 + 1e-6;
}

/** World height of a support's top surface, in cm. */
export function surfaceTopOf(item, def) {
  return (item.elevationCm || 0) + surfaceHeightOf(def);
}

/**
 * Finds the piece a resting-capable item would sit on: the highest support whose footprint
 * contains the item's centre. Returns { item, def, topCm } or null.
 */
export function findSupport(item, items) {
  const own = resolveItemDef(item);
  if (!canRestOnTop(own)) return null;
  let best = null;
  for (const other of items) {
    if (other.id === item.id) continue;
    const def = resolveItemDef(other);
    if (!canRestOn(own, def)) continue;
    if (!pointInFootprint(other, def, item.x, item.y)) continue;
    const topCm = surfaceTopOf(other, def);
    if (!best || topCm > best.topCm) best = { item: other, def, topCm };
  }
  return best;
}

/** The support a piece would rest on if it stood at (x, y) now; drives the drop highlight. */
export function dropTargetAt(item, x, y, items) {
  return findSupport({ ...item, x, y }, items);
}

/** Pieces currently resting on `support` (derived from geometry and elevation). */
export function ridersOf(support, items) {
  const out = [];
  for (const other of items) {
    if (other.id === support.id) continue;
    if (!canRestOnTop(resolveItemDef(other))) continue;
    if (findSupport(other, items)?.item.id === support.id) out.push(other);
  }
  return out;
}

/** True if `rider` is resting on `support` in the given item list. */
export function isRestingOn(rider, support, items) {
  const found = findSupport(rider, items);
  if (!found || found.item.id !== support.id) return false;
  return Math.abs((rider.elevationCm || 0) - found.topCm) <= SURFACE_TOLERANCE_CM;
}

/** The piece `item` rests on right now (name lookups, inspector), or null. */
export function supportOf(item, items) {
  const found = findSupport(item, items);
  if (!found) return null;
  return Math.abs((item.elevationCm || 0) - found.topCm) <= SURFACE_TOLERANCE_CM ? found : null;
}

/**
 * Sets elevation for every resting-capable piece: onto its support, or back to the floor.
 * Returns the same array when nothing changes. Pieces that cannot rest keep their elevation.
 */
export function settleStacking(items) {
  let changed = false;
  const next = items.map((item) => {
    if (!canRestOnTop(resolveItemDef(item))) return item;
    const found = findSupport(item, items);
    const target = found ? found.topCm : 0;
    if (Math.abs((item.elevationCm || 0) - target) < MOVE_EPS) return item;
    changed = true;
    return { ...item, elevationCm: target };
  });
  return changed ? next : items;
}

function moved(a, b) {
  return (
    Math.abs(a.x - b.x) > MOVE_EPS ||
    Math.abs(a.y - b.y) > MOVE_EPS ||
    Math.abs((a.rotationDeg || 0) - (b.rotationDeg || 0)) > MOVE_EPS
  );
}

/**
 * Brings a furniture list up to date after an edit: pieces that moved or turned take the pieces
 * resting on them along (unless those were edited too), then every resting piece is settled onto
 * whatever it now stands over. `prev` is the list before the edit, `next` after it.
 */
export function reconcileStacking(prev, next) {
  const before = new Map((prev || []).map((i) => [i.id, i]));
  const after = new Map(next.map((i) => [i.id, i]));
  const carried = new Map();

  for (const item of next) {
    const old = before.get(item.id);
    if (!old || !moved(old, item)) continue;
    if (!offersSurface(resolveItemDef(old))) continue;
    const dRot = (item.rotationDeg || 0) - (old.rotationDeg || 0);
    const rad = (dRot * Math.PI) / 180;
    for (const rider of ridersOf(old, prev)) {
      const riderNow = after.get(rider.id);
      if (!riderNow || carried.has(rider.id)) continue;
      // The rider was dragged or edited by itself in the same step: leave it where it was put
      if (moved(rider, riderNow)) continue;
      const rx = rider.x - old.x;
      const ry = rider.y - old.y;
      carried.set(rider.id, {
        ...riderNow,
        x: item.x + rx * Math.cos(rad) - ry * Math.sin(rad),
        y: item.y + rx * Math.sin(rad) + ry * Math.cos(rad),
        rotationDeg: normalizeAngle((riderNow.rotationDeg || 0) + dRot),
      });
    }
  }

  const carriedList = carried.size ? next.map((i) => carried.get(i.id) || i) : next;
  return settleStacking(carriedList);
}

/** Footprint corners helper for callers that only have an item. */
export function footprintOf(item) {
  const def = resolveItemDef(item);
  return def
    ? getRotatedRectCorners(item.x, item.y, def.widthCm, def.depthCm, item.rotationDeg || 0)
    : null;
}

/**
 * Where a new resting piece should land by default: the centre of a free support, preferring the
 * types the piece lists in `stackableOn`. Returns the support item or null.
 */
export function pickDefaultSupport(def, items) {
  const candidates = items.filter((i) => canRestOn(def, resolveItemDef(i)));
  const free = candidates.filter((c) => ridersOf(c, items).length === 0);
  const preferred = free.find((c) => def.stackableOn?.includes(c.furnitureTypeId));
  if (preferred) return preferred;
  // A piece that names its supports (a TV, a cushion) is better on the floor than on the wrong surface
  if (def.stackableOn?.length) return null;
  return free[0] || candidates[0] || null;
}
