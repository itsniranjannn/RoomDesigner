/**
 * serviceLinks.js
 * "Service links": for every piece that relies on a service point (a sink on water and a
 * drain, a stove on gas, a TV on a socket ...), the link to the nearest matching point.
 *
 * A link is
 *   { id, itemId, name, need, status: 'ok' | 'far' | 'missing', reachCm, distanceCm | null,
 *     serviceId | null, from: {x, y} | null (the service point), to: {x, y} (on the piece),
 *     center: {x, y} (the piece), tagAt: {x, y}, tag: string | null }
 *
 * `ok`: a matching point is within reach. `far`: the nearest one is out of reach.
 * `missing`: the room has points of that group but none of this kind.
 *
 * The reach distances are the same ones the Plan checks use, so a link is `far` or `missing`
 * exactly when the checks report "No socket / water / drain / gas point near ...".
 * Everything here is pure.
 */

import { distanceToPolygon, sanitizeServices } from './planning.js';
import {
  APPLIANCE_POWER_REACH_CM,
  DRAIN_PIECES,
  POWERED_APPLIANCES,
  POWER_REACH_CM,
  WATER_PIECES,
  WATER_REACH_CM,
  gatherPieces,
  isBed,
  isDesk,
  isTv,
  typeId,
} from './planningChecks.js';

/** What each need is called, the service kind that answers it and the words for a tag. */
export const LINK_NEEDS = {
  socket: { kind: 'socket', noun: 'socket', label: 'Power' },
  water: { kind: 'water', noun: 'water', label: 'Water' },
  drain: { kind: 'drain', noun: 'drain', label: 'Drain' },
  gas: { kind: 'gas', noun: 'gas', label: 'Gas' },
};

export const LINK_STATUS_LABELS = {
  ok: 'Within reach',
  far: 'Too far',
  missing: 'Nothing marked',
};

const LAMPS = new Set([
  'desk-lamp',
  'floor-lamp',
  'floor-lamp-torchiere',
  'floor-lamp-tripod',
  'table-lamp',
]);
const ELECTRICAL = ['socket', 'switch', 'light', 'ceiling', 'data'];
const PLUMBING = ['water', 'drain', 'gas'];

/** What a piece (by catalog id) relies on: [{ need, reachCm }]. */
export function needsOf(id) {
  const out = [];
  if (isTv(id) || isBed(id) || isDesk(id) || LAMPS.has(id)) {
    out.push({ need: 'socket', reachCm: POWER_REACH_CM });
  } else if (POWERED_APPLIANCES.has(id)) {
    out.push({ need: 'socket', reachCm: APPLIANCE_POWER_REACH_CM });
  }
  if (WATER_PIECES.has(id)) out.push({ need: 'water', reachCm: WATER_REACH_CM });
  if (DRAIN_PIECES.has(id)) out.push({ need: 'drain', reachCm: WATER_REACH_CM });
  if (id === 'kitchen-stove') out.push({ need: 'gas', reachCm: WATER_REACH_CM });
  return out;
}

/** The point of a polygon's outline closest to p (p itself when it is inside). */
export function closestPointOnPolygon(p, corners) {
  if (distanceToPolygon(p, corners) === 0) return { x: p.x, y: p.y };
  let best = null;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    const q = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!best || d < best.d) best = { x: q.x, y: q.y, d };
  }
  return best ? { x: best.x, y: best.y } : { x: p.x, y: p.y };
}

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Every service link of a room, in piece order. Empty when no service point is marked.
 * Like the Plan checks, a group of needs (power, or water gas and drains) is only judged
 * once the room has at least one point of that group, and gas only once a gas point exists.
 */
export function computeServiceLinks(room) {
  const services = sanitizeServices(room?.services);
  if (services.length === 0) return [];
  const has = (kinds) => services.some((s) => kinds.includes(s.kind));
  const judged = {
    socket: has(ELECTRICAL),
    water: has(PLUMBING),
    drain: has(PLUMBING),
    gas: has(['gas']),
  };

  const links = [];
  for (const piece of gatherPieces(room)) {
    for (const { need, reachCm } of needsOf(typeId(piece))) {
      if (!judged[need]) continue;
      const { kind, noun } = LINK_NEEDS[need];
      let best = null;
      for (const s of services) {
        if (s.kind !== kind) continue;
        const d = distanceToPolygon({ x: s.x, y: s.y }, piece.corners);
        if (!best || d < best.d) best = { s, d };
      }
      const center = { x: piece.item.x, y: piece.item.y };
      const base = {
        id: `${piece.item.id}:${need}`,
        itemId: piece.item.id,
        name: piece.name,
        need,
        reachCm,
        center,
        // Where a tag sits: just under the piece, clear of its number badge
        tagAt: { x: center.x, y: Math.min(piece.aabb.maxY + 3, (room.depthCm || 0) - 14) },
      };
      if (!best) {
        links.push({
          ...base,
          status: 'missing',
          distanceCm: null,
          serviceId: null,
          from: null,
          to: center,
          tag: `no ${noun} nearby`,
        });
        continue;
      }
      const from = { x: best.s.x, y: best.s.y };
      const to = closestPointOnPolygon(from, piece.corners);
      const ok = best.d <= reachCm;
      links.push({
        ...base,
        status: ok ? 'ok' : 'far',
        distanceCm: round1(best.d),
        serviceId: best.s.id,
        from,
        to,
        tag: ok ? null : `no ${noun} nearby`,
      });
    }
  }
  return links;
}

/** Counts by status, for the panel summary and the exported key. */
export function summarizeLinks(links) {
  const out = { ok: 0, far: 0, missing: 0, total: links.length };
  for (const l of links) out[l.status] += 1;
  return out;
}
