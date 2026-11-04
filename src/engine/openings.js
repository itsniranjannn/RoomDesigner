/**
 * openings.js
 * Pure maths for placing, moving and stretching doors and windows along a wall.
 *
 * Everything here works on one dimension: positions are cm along the wall, an opening
 * covers [start, start + width]. Windows stretch by dragging their end handles; doors
 * have one standard width and only slide along the wall.
 */

export const DOOR_WIDTH_CM = 90;
export const WINDOW_WIDTH_CM = 120;
export const WINDOW_MIN_CM = 40;
export const WINDOW_MAX_CM = 300;
export const OPENING_SNAP_CM = 10;

export const OPENING_LIMITS = {
  door: { minWidth: DOOR_WIDTH_CM, maxWidth: DOOR_WIDTH_CM },
  window: { minWidth: WINDOW_MIN_CM, maxWidth: WINDOW_MAX_CM },
  cornerMargin: 15, // cm from corner
};

/** Standard width of a new opening of this type. */
export const defaultOpeningWidth = (type) => (type === 'door' ? DOOR_WIDTH_CM : WINDOW_WIDTH_CM);

/** Only windows can be stretched. */
export const isResizable = (type) => type === 'window';

const snap = (v, step) => (step > 0 ? Math.round(v / step) * step : v);

/**
 * Clamps an opening's width and offset within a wall segment.
 * Doors always get the standard width.
 */
export function clampOpening(type, offsetCm, widthCm, wallLengthCm) {
  const limits = OPENING_LIMITS[type] || OPENING_LIMITS.window;
  const margin = OPENING_LIMITS.cornerMargin;

  const validWallLen =
    Number.isFinite(wallLengthCm) && wallLengthCm > margin * 2 ? wallLengthCm : 500;
  const rawW = type === 'door' ? DOOR_WIDTH_CM : Number.isFinite(widthCm) ? widthCm : 120;
  const rawOffset = Number.isFinite(offsetCm) ? offsetCm : Math.round(validWallLen / 2 - rawW / 2);

  const maxPossibleWidth = Math.max(limits.minWidth, validWallLen - margin * 2);
  const clampedWidth = Math.max(
    limits.minWidth,
    Math.min(limits.maxWidth, Math.min(maxPossibleWidth, rawW))
  );

  const maxOffset = validWallLen - clampedWidth - margin;
  const clampedOffset = Math.max(margin, Math.min(maxOffset, rawOffset));

  return {
    offsetCm: Math.round(clampedOffset),
    widthCm: Math.round(clampedWidth),
  };
}

/**
 * The room between an opening and its neighbours on the same wall.
 * @param {Array<{start: number, width: number}>} others - the other openings on this wall
 */
function neighbourLimits(start, width, others, lo, hi) {
  const mid = start + width / 2;
  let before = lo;
  let after = hi;
  for (const o of others) {
    const oMid = o.start + o.width / 2;
    if (oMid < mid) before = Math.max(before, o.start + o.width);
    else after = Math.min(after, o.start);
  }
  return { before, after };
}

/**
 * Stretches a window from one end while the other end stays put.
 * The dragged edge snaps to `step`, never crosses a neighbour or the wall ends and keeps the
 * width between `min` and `max`.
 *
 * @param {Object} p
 * @param {'start'|'end'} p.side - which end is being dragged
 * @param {number} p.start - current start along the wall
 * @param {number} p.width - current width
 * @param {number} p.pointer - where the dragged edge should go (cm along the wall)
 * @param {number} p.lo - lowest allowed position (wall start plus margin)
 * @param {number} p.hi - highest allowed position (wall end minus margin)
 * @returns {{ start: number, width: number }}
 */
export function resizeSpan({
  side,
  start,
  width,
  pointer,
  lo,
  hi,
  others = [],
  min = WINDOW_MIN_CM,
  max = WINDOW_MAX_CM,
  step = OPENING_SNAP_CM,
}) {
  const { before, after } = neighbourLimits(start, width, others, lo, hi);
  const target = snap(pointer, step);
  if (side === 'end') {
    const lowest = start + min;
    const highest = Math.min(start + max, after);
    if (lowest > highest) return { start, width };
    const end = Math.max(lowest, Math.min(highest, target));
    return { start, width: Math.round(end - start) };
  }
  const end = start + width;
  const lowest = Math.max(end - max, before);
  const highest = end - min;
  if (lowest > highest) return { start, width };
  const next = Math.max(lowest, Math.min(highest, target));
  return { start: Math.round(next), width: Math.round(end - next) };
}

/**
 * Slides an opening along its wall by `delta`. The result snaps to `step`, stays inside
 * [lo, hi] and stops against its neighbours instead of overlapping them.
 */
export function moveSpan({ start, width, delta, lo, hi, others = [], step = OPENING_SNAP_CM }) {
  const maxStart = hi - width;
  if (maxStart < lo) return Math.round(start);
  const wanted = snap(start + delta, step);
  const clamp = (v) => Math.max(lo, Math.min(maxStart, v));
  const clashes = (s) => others.some((o) => s < o.start + o.width && o.start < s + width);
  const first = clamp(wanted);
  if (!clashes(first)) return Math.round(first);
  // Nearest gap that fits: just before or just after a neighbour
  const candidates = [lo, maxStart];
  for (const o of others) candidates.push(o.start - width, o.start + o.width);
  let best = null;
  for (const c of candidates) {
    const v = clamp(c);
    if (clashes(v)) continue;
    if (best === null || Math.abs(v - wanted) < Math.abs(best - wanted)) best = v;
  }
  return Math.round(best === null ? start : best);
}
