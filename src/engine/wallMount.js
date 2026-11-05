/**
 * wallMount.js
 * Pure helpers for pieces that hang on a wall (frames, mirrors, shelves, clocks, curtains). Such a piece
 * has `wallMounted: true` in the catalog and a height above the floor (`elevationCm`, default
 * `mountHeightCm`). Its back sits flush against the nearest wall, turned to face into the room, and it
 * never blocks floor furniture: floor pieces can stand under it.
 *
 * Orientation reminder: a piece's back is at -y in its own frame, and rotating by `rotationDeg`
 * (clockwise on the plan) turns the back from the top wall (0) to the right wall (90), the bottom wall
 * (180) and the left wall (270).
 */

import { getRotatedRectCorners, getAABB, normalizeAngle } from './geometry.js';
import { hasOutline, outlineEdges, nearestEdge } from './roomShape.js';
import { resolveItemDef } from '../data/furnitureCatalog.js';

export const isWallMounted = (def) => !!def?.wallMounted;

/** Where a piece of this type hangs when it is first added (cm above the floor). */
export const defaultMountHeight = (def) => {
  const n = Number(def?.mountHeightCm);
  return Number.isFinite(n) ? n : 0;
};

/** The range a wall piece can be lifted to: from the floor up to just under the full wall height. */
export const MOUNT_LIMITS = { minCm: 0, maxCm: 230, wallHeightCm: 240 };

export const clampMountHeight = (cm, def) => {
  const top = Math.max(0, MOUNT_LIMITS.wallHeightCm - (def?.heightCm || 0));
  const n = Number.isFinite(Number(cm)) ? Number(cm) : defaultMountHeight(def);
  return Math.round(Math.max(0, Math.min(top, n)));
};

const SIDES = {
  top: { rotationDeg: 0 },
  right: { rotationDeg: 90 },
  bottom: { rotationDeg: 180 },
  left: { rotationDeg: 270 },
};

/** Windows of the room on one wall (a rectangle's side name, or an outline edge index), with their centre. */
function windowCentres(room, wallKey) {
  const out = [];
  for (const w of room?.windows || []) {
    const same = typeof wallKey === 'number' ? w.edge === wallKey : (w.wall || 'top') === wallKey;
    if (!same) continue;
    const off = Number.isFinite(w.offsetCm) ? w.offsetCm : 0;
    const width = Number.isFinite(w.widthCm) ? w.widthCm : 120;
    out.push({ centre: off + width / 2, width });
  }
  return out;
}

const WINDOW_REACH_CM = 90;

/** The centre of the window nearest `along`, when a window dressing is within reach; otherwise `along`. */
function snapAlongToWindow(room, wallKey, along, def) {
  if (!def?.windowDressing) return along;
  let best = null;
  for (const w of windowCentres(room, wallKey)) {
    const d = Math.abs(w.centre - along);
    if (d <= WINDOW_REACH_CM + w.width / 2 && (!best || d < best.d)) best = { d, c: w.centre };
  }
  return best ? best.c : along;
}

const clampAlong = (along, half, len) =>
  len <= half * 2 ? len / 2 : Math.max(half, Math.min(len - half, along));

/**
 * Puts a wall piece against the wall nearest to (x, y).
 * @param {object} room - { widthCm, depthCm, outline?, openEdges?, windows? }
 * @param {object} def - the resolved piece definition (widthCm, depthCm, windowDressing?)
 * @param {{x:number,y:number}} at - where the piece is now (or was dropped)
 * @returns {{x:number,y:number,rotationDeg:number,wall:string|number}}
 */
export function snapToNearestWall(room, def, at) {
  const w = def?.widthCm || 50;
  const d = def?.depthCm || 10;
  const x = Number.isFinite(at?.x) ? at.x : room.widthCm / 2;
  const y = Number.isFinite(at?.y) ? at.y : room.depthCm / 2;

  if (hasOutline(room)) {
    const near = nearestEdge(room, x, y);
    const e = near && outlineEdges(room)[near.edge];
    if (e) {
      const along = clampAlong(snapAlongToWindow(room, e.i, near.along, def), w / 2, e.len);
      const rotationDeg = normalizeAngle((Math.atan2(-e.nx, e.ny) * 180) / Math.PI);
      return {
        x: Math.round((e.p0.x + e.dx * along + e.nx * (d / 2)) * 10) / 10,
        y: Math.round((e.p0.y + e.dy * along + e.ny * (d / 2)) * 10) / 10,
        rotationDeg: Math.round(rotationDeg),
        wall: e.i,
        along,
      };
    }
  }

  const W = room.widthCm;
  const D = room.depthCm;
  const dist = { top: y, bottom: D - y, left: x, right: W - x };
  const wall = Object.keys(dist).reduce((a, b) => (dist[b] < dist[a] ? b : a), 'top');
  const horizontal = wall === 'top' || wall === 'bottom';
  const len = horizontal ? W : D;
  const alongRaw = horizontal ? x : y;
  const along = clampAlong(snapAlongToWindow(room, wall, alongRaw, def), w / 2, len);
  const r = (v) => Math.round(v * 10) / 10;
  const pos =
    wall === 'top'
      ? { x: along, y: d / 2 }
      : wall === 'bottom'
        ? { x: along, y: D - d / 2 }
        : wall === 'left'
          ? { x: d / 2, y: along }
          : { x: W - d / 2, y: along };
  return { x: r(pos.x), y: r(pos.y), rotationDeg: SIDES[wall].rotationDeg, wall, along };
}

/** The walls of a room as lines to hang things on: key, length and a point `inward` cm in from the wall. */
function wallLines(room) {
  if (hasOutline(room)) {
    return outlineEdges(room)
      .filter((e) => !e.open)
      .map((e) => ({
        key: e.i,
        len: e.len,
        at: (along, inward) => ({
          x: e.p0.x + e.dx * along + e.nx * inward,
          y: e.p0.y + e.dy * along + e.ny * inward,
        }),
      }));
  }
  const W = room.widthCm;
  const D = room.depthCm;
  return [
    { key: 'top', len: W, at: (a, i) => ({ x: a, y: i }) },
    { key: 'right', len: D, at: (a, i) => ({ x: W - i, y: a }) },
    { key: 'bottom', len: W, at: (a, i) => ({ x: a, y: D - i }) },
    { key: 'left', len: D, at: (a, i) => ({ x: i, y: a }) },
  ];
}

/** Doors and windows on one wall as [from, to] stretches along it. */
function openingSpans(room, key) {
  const same = (o, fallback) =>
    typeof key === 'number' ? o.edge === key : (o.wall || fallback) === key;
  const span = (o, w) => {
    const a = Number.isFinite(o.offsetCm) ? o.offsetCm : 0;
    return [a, a + (Number.isFinite(o.widthCm) ? o.widthCm : w)];
  };
  return [
    ...(room.windows || []).filter((o) => same(o, 'top')).map((o) => span(o, 120)),
    ...(room.doors || []).filter((o) => same(o, 'bottom')).map((o) => span(o, 90)),
  ];
}

const STEP_CM = 10;
const GAP_CM = 6;

/**
 * A free stretch of wall for a new piece: the longest wall first, from its middle outwards, clear of doors,
 * windows and pieces already hung there. Falls back to the middle of the longest wall.
 */
export function freeWallSpot(room, def, existing = []) {
  const w = def?.widthCm || 50;
  const d = def?.depthCm || 10;
  const lines = wallLines(room);
  if (!lines.length) return { x: room.widthCm / 2, y: d / 2 };
  const used = new Map();
  for (const it of existing) {
    const ed = resolveItemDef(it);
    if (!ed?.wallMounted || ed.windowDressing !== def?.windowDressing) continue;
    const sp = snapToNearestWall(room, ed, it);
    if (!used.has(sp.wall)) used.set(sp.wall, []);
    used.get(sp.wall).push([sp.along - ed.widthCm / 2, sp.along + ed.widthCm / 2]);
  }
  const blocked = (key, from, to) =>
    [...(used.get(key) || []), ...(def?.windowDressing ? [] : openingSpans(room, key))].some(
      ([a, b]) => from < b + GAP_CM && to > a - GAP_CM
    );
  const byLength = [...lines].sort((a, b) => b.len - a.len);
  for (const line of byLength) {
    if (line.len < w) continue;
    const mid = line.len / 2;
    for (let k = 0; k <= line.len / STEP_CM; k++) {
      for (const sign of k === 0 ? [0] : [-1, 1]) {
        const p = mid + sign * k * STEP_CM;
        if (p - w / 2 < 0 || p + w / 2 > line.len) continue;
        if (!blocked(line.key, p - w / 2, p + w / 2)) return line.at(p, d / 2);
      }
    }
  }
  return byLength[0].at(byLength[0].len / 2, d / 2);
}

/** The point on the wall just behind a window's centre. */
function windowSpot(room, win) {
  const off = Number.isFinite(win.offsetCm) ? win.offsetCm : 0;
  const width = Number.isFinite(win.widthCm) ? win.widthCm : 120;
  const centre = off + width / 2;
  if (hasOutline(room)) {
    const e = outlineEdges(room)[win.edge ?? 0];
    if (e) return { x: e.p0.x + e.dx * centre + e.nx * 5, y: e.p0.y + e.dy * centre + e.ny * 5 };
  }
  const wall = win.wall || 'top';
  if (wall === 'top') return { x: centre, y: 0 };
  if (wall === 'bottom') return { x: centre, y: room.depthCm };
  if (wall === 'left') return { x: 0, y: centre };
  return { x: room.widthCm, y: centre };
}

/**
 * Where a new wall piece goes when no spot was chosen: a curtain on the first window that has no curtain
 * yet (`existing` is the room's placed pieces), anything else in the middle of the top wall.
 */
export function defaultWallSpot(room, def, existing = []) {
  const windows = room?.windows || [];
  if (def?.windowDressing && windows.length) {
    const dressed = existing
      .map((it) => ({ it, d: resolveItemDef(it) }))
      .filter(({ d }) => d?.windowDressing)
      .map(({ it }) => it);
    const spots = windows.map((w) => snapToNearestWall(room, def, windowSpot(room, w)));
    const free = spots.find(
      (sp) => !dressed.some((it) => Math.hypot(it.x - sp.x, it.y - sp.y) < 40)
    );
    return free || spots[0];
  }
  return freeWallSpot(room, def, existing);
}

/** The wall piece as it should be stored: moved to its wall and given a hanging height. */
export function mountItem(room, item, def) {
  const spot = snapToNearestWall(room, def, item);
  return {
    ...item,
    x: spot.x,
    y: spot.y,
    rotationDeg: spot.rotationDeg,
    elevationCm: Number.isFinite(item.elevationCm) ? item.elevationCm : defaultMountHeight(def),
  };
}

/** True when a wall piece's footprint is flush against a wall (used by tests and the plan checks). */
export function isFlushToWall(room, item, def, eps = 1.5) {
  const corners = getRotatedRectCorners(
    item.x,
    item.y,
    def.widthCm,
    def.depthCm,
    item.rotationDeg || 0
  );
  const box = getAABB(corners);
  if (hasOutline(room)) return true;
  return (
    box.minX <= eps ||
    box.minY <= eps ||
    box.maxX >= room.widthCm - eps ||
    box.maxY >= room.depthCm - eps
  );
}
