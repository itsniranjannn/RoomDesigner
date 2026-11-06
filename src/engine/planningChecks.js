/**
 * planningChecks.js
 * The "Plan checks" for a room: blocked door and window swings, narrow doors and walking
 * routes, front clearances in front of kitchen and bathroom units, wheelchair turning space,
 * and whether the TV, bed, desk and appliances have a socket or water point close by.
 *
 * Everything here is pure: give it a room, get a list of issues back.
 *
 * An issue is
 *   { id, code, severity: 'error' | 'warning' | 'info', title, message, point: {x, y},
 *     focus: { type: 'item' | 'opening' | 'service' | 'spot', id? }, itemId?, openingId?,
 *     serviceId? }
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB, rotatePoint } from './geometry.js';
import { hasOutline, cornersInOutline } from './roomShape.js';
import { evaluateClearance } from './clearance.js';
import {
  DOOR_FRAME_LOSS_CM,
  SERVICE_KINDS,
  doorGeometry,
  doorZone,
  distanceToPolygon,
  insideRoom,
  polygonsOverlap,
  openingFrame,
  sanitizeServices,
  serviceLabels,
  sectorPolygon,
  snapToWall,
} from './planning.js';
import { buildFloorGrid, cellOf, circleFits, widestRoutes } from './floorGrid.js';

export const MIN_DOOR_CLEAR_CM = 80;
export const TURNING_CIRCLE_CM = 150;
export const POWER_REACH_CM = 200;
export const APPLIANCE_POWER_REACH_CM = 150;
export const WATER_REACH_CM = 150;

/** Walking route widths (cm): the usual comfortable width, and the wider main route. */
export const ROUTE_COMFORT_CM = 90;
export const ROUTE_ACCESSIBLE_CM = 120;

export const SEVERITIES = ['error', 'warning', 'info'];
export const SEVERITY_LABELS = { error: 'Fix this', warning: 'Worth a look', info: 'Tip' };

// ---------- piece catalogue knowledge (by catalog id) ----------

const startsAny = (id, prefixes) => prefixes.some((p) => id.startsWith(p));

export const isTv = (id) => startsAny(id, ['tv-']) && id !== 'tv-unit-low';
export const isBed = (id) => startsAny(id, ['bed-']) && id !== 'bed-pillow';
export const isDesk = (id) => ['desk-executive', 'desk-l-shaped', 'standing-desk'].includes(id);
export const POWERED_APPLIANCES = new Set([
  'kitchen-fridge',
  'dishwasher',
  'oven-unit',
  'microwave-oven',
  'washing-machine',
  'water-heater',
]);
export const WATER_PIECES = new Set([
  'sink-unit',
  'wash-basin',
  'bath-vanity',
  'bathtub',
  'shower-tray',
  'toilet',
  'squat-toilet',
  'washing-machine',
  'dishwasher',
  'water-heater',
]);
export const DRAIN_PIECES = new Set([
  'sink-unit',
  'wash-basin',
  'bath-vanity',
  'bathtub',
  'shower-tray',
  'toilet',
  'squat-toilet',
  'washing-machine',
  'dishwasher',
]);
/** Pieces you stand in front of: minimum free depth in front, normal and accessible (cm). */
const FRONT_CLEARANCE = {
  'kitchen-counter': [90, 120],
  'kitchen-stove': [90, 120],
  'kitchen-fridge': [90, 120],
  'sink-unit': [90, 120],
  dishwasher: [90, 120],
  'oven-unit': [90, 120],
  'kitchen-tall-cabinet': [90, 120],
  'pantry-cabinet': [90, 120],
  'washing-machine': [90, 120],
  'wardrobe-3door': [70, 90],
  'wardrobe-2door': [70, 90],
  'wardrobe-wall': [70, 90],
  toilet: [60, 90],
  'wash-basin': [60, 90],
  'bath-vanity': [60, 90],
};

export const typeId = (entry) => entry.item.furnitureTypeId || entry.def.id || '';

// ---------- gathering pieces ----------

function isFlatDef(def) {
  return (
    !def ||
    def.wallMounted ||
    (def.heightCm ?? 100) < 5 ||
    def.shapeType === 'rug' ||
    def.shapeType === 'rug-runner' ||
    def.shapeType === 'nepali-dhaka-rug'
  );
}

export function gatherPieces(room) {
  const out = [];
  for (const item of room?.placedFurniture || []) {
    const def = resolveItemDef(item);
    if (!def) continue;
    const corners = getRotatedRectCorners(
      item.x,
      item.y,
      def.widthCm,
      def.depthCm,
      item.rotationDeg || 0
    );
    const bottom = item.elevationCm || 0;
    out.push({
      item,
      def,
      corners,
      aabb: getAABB(corners),
      bottom,
      top: bottom + (def.heightCm ?? 0),
      name: def.name,
      flat: isFlatDef(def),
    });
  }
  return out;
}

/** Pieces that block feet: solid, not a mat, and not hung high on a wall. */
const blocksWalking = (e) => !e.flat && (e.def.heightCm ?? 0) >= 15 && e.bottom < 70;

const lower = (s) => s.toLowerCase();
const roundTo = (v, step) => Math.round(v / step) * step;

// ---------- the checks ----------

let counter = 0;
function makeIssue(base) {
  counter += 1;
  return { id: `${base.code}-${counter}`, ...base };
}

function openingNames(room) {
  const names = {};
  (room.doors || []).forEach((d, i) => (names[d.id] = `Door ${i + 1}`));
  (room.windows || []).forEach((w, i) => (names[w.id] = `Window ${i + 1}`));
  return names;
}

function openingCentre(room, op, type) {
  const frame = openingFrame(room, op, type);
  if (!frame) return { x: room.widthCm / 2, y: room.depthCm / 2 };
  return frame.at(op.offsetCm + op.widthCm / 2, 20);
}

function doorChecks(room, pieces, names, out) {
  const doors = room.doors || [];
  for (const door of doors) {
    const clear = door.widthCm - DOOR_FRAME_LOSS_CM;
    if (clear < MIN_DOOR_CLEAR_CM) {
      out.push(
        makeIssue({
          code: 'door-narrow',
          severity: 'warning',
          title: `${names[door.id]} is narrow`,
          message: `${names[door.id]} is ${door.widthCm} cm wide, which leaves about ${clear} cm to walk through. Aim for ${MIN_DOOR_CLEAR_CM} cm so a wheelchair or a large piece of furniture fits.`,
          point: openingCentre(room, door, 'door'),
          openingId: door.id,
          focus: { type: 'opening', id: door.id },
        })
      );
    }
  }

  // Doors that swing into each other
  const zones = doors.map((d) => ({ d, z: doorZone(room, d) }));
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i];
      const b = zones[j];
      if (!a.z || !b.z || a.z.kind !== 'door' || b.z.kind !== 'door') continue;
      if (polygonsOverlap(a.z.corners, b.z.corners)) {
        out.push(
          makeIssue({
            code: 'door-clash',
            severity: 'warning',
            title: `${names[a.d.id]} and ${names[b.d.id]} collide`,
            message: `${names[a.d.id]} and ${names[b.d.id]} swing into the same space, so they cannot both be open at once. Try flipping the hinge side or opening one outwards.`,
            point: openingCentre(room, a.d, 'door'),
            openingId: a.d.id,
            focus: { type: 'opening', id: a.d.id },
          })
        );
      }
    }
  }

  // Pieces in a door's way
  const byId = new Map(pieces.map((p) => [p.item.id, p]));
  for (const issue of evaluateClearance(room)) {
    if (issue.kind !== 'door-swing') continue;
    const piece = byId.get(issue.itemId);
    const door = doors.find((d) => d.id === issue.openingId);
    if (!piece || !door) continue;
    const outward = door.swingDirection === 'outward';
    out.push(
      makeIssue({
        code: 'door-blocked',
        severity: outward ? 'warning' : 'error',
        title: outward
          ? `${piece.name} is right in front of ${names[door.id]}`
          : `${piece.name} blocks ${names[door.id]}`,
        message: outward
          ? `The ${lower(piece.name)} stands within 60 cm of ${names[door.id]}, so there is little room to step up and open it.`
          : `The ${lower(piece.name)} is in the way of ${names[door.id]}, so the door cannot swing fully open. Move the piece, or change which way the door opens.`,
        point: { x: piece.item.x, y: piece.item.y },
        itemId: piece.item.id,
        openingId: door.id,
        focus: { type: 'item', id: piece.item.id },
      })
    );
  }
}

function windowChecks(room, pieces, names, out) {
  const byId = new Map(pieces.map((p) => [p.item.id, p]));
  const issues = evaluateClearance(room).filter(
    (i) => i.kind === 'window' || i.kind === 'window-swing'
  );
  const swung = new Set(
    issues.filter((i) => i.kind === 'window-swing').map((i) => `${i.itemId}:${i.openingId}`)
  );
  for (const issue of issues) {
    const piece = byId.get(issue.itemId);
    const win = (room.windows || []).find((w) => w.id === issue.openingId);
    if (!piece || !win) continue;
    if (issue.kind === 'window' && swung.has(`${issue.itemId}:${issue.openingId}`)) continue;
    const swings = issue.kind === 'window-swing';
    out.push(
      makeIssue({
        code: swings ? 'window-blocked' : 'window-covered',
        severity: swings ? 'warning' : 'info',
        title: swings
          ? `${piece.name} blocks ${names[win.id]}`
          : `${piece.name} covers ${names[win.id]}`,
        message: swings
          ? `The ${lower(piece.name)} is where ${names[win.id]} swings open, so the window cannot open fully.`
          : `The ${lower(piece.name)} stands in front of ${names[win.id]} and hides it. That is fine if you want it there.`,
        point: { x: piece.item.x, y: piece.item.y },
        itemId: piece.item.id,
        openingId: win.id,
        focus: { type: 'item', id: piece.item.id },
      })
    );
  }
}

function routeSeverity(width, accessible) {
  if (accessible) {
    if (width < 75) return 'error';
    if (width < 90) return 'warning';
    return width < ROUTE_ACCESSIBLE_CM ? 'info' : null;
  }
  if (width < 60) return 'error';
  if (width < 75) return 'warning';
  return width < ROUTE_COMFORT_CM ? 'info' : null;
}

/** Best cell just inside a door, and the corridor width there. */
function doorSeed(grid, room, door) {
  const frame = openingFrame(room, door, 'door');
  if (!frame || frame.open) return null;
  let best = { cell: -1, width: 0 };
  const a = door.offsetCm;
  const b = door.offsetCm + door.widthCm;
  for (let along = a + 5; along <= b - 5; along += grid.cell * 2) {
    for (let inward = 10; inward <= 90; inward += grid.cell * 2) {
      const p = frame.at(along, inward);
      const i = cellOf(grid, p.x, p.y);
      if (i < 0 || !grid.free[i]) continue;
      const w = 2 * grid.dist[i];
      if (w > best.width) best = { cell: i, width: w };
    }
  }
  return best.cell >= 0 ? best : { cell: -1, width: 0 };
}

const REACH_CM = 70;

function reachWidth(grid, routes, piece) {
  const box = piece.aabb;
  const c0 = Math.max(1, Math.floor((box.minX - REACH_CM) / grid.cell));
  const c1 = Math.min(grid.cols - 2, Math.ceil((box.maxX + REACH_CM) / grid.cell) + 1);
  const r0 = Math.max(1, Math.floor((box.minY - REACH_CM) / grid.cell));
  const r1 = Math.min(grid.rows - 2, Math.ceil((box.maxY + REACH_CM) / grid.cell) + 1);
  let best = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * grid.cols + c;
      if (routes[i] <= best) continue;
      const p = { x: grid.cx(c), y: grid.cy(r) };
      if (distanceToPolygon(p, piece.corners) <= REACH_CM) best = routes[i];
    }
  }
  return best;
}

/** Pieces worth walking up to: big enough, on the floor. */
function isDestination(e) {
  if (!blocksWalking(e) || e.bottom > 0) return false;
  return (e.def.widthCm ?? 0) * (e.def.depthCm ?? 0) >= 2500 && (e.def.heightCm ?? 0) >= 40;
}

function pathChecks(room, pieces, names, grid, accessible, out) {
  const doors = room.doors || [];
  if (doors.length === 0) return;
  const seeds = doors.map((door) => ({
    door,
    ...(doorSeed(grid, room, door) || { cell: -1, width: 0 }),
  }));
  const open = seeds.filter((s) => s.cell >= 0 && s.width >= 60);
  const usable = open.length ? open : [];

  if (usable.length === 0) {
    out.push(
      makeIssue({
        code: 'entrance-blocked',
        severity: 'error',
        title: 'Nobody can walk in',
        message:
          'Something stands in front of every door, so there is no way to step into the room. Clear a path from a door.',
        point: openingCentre(room, doors[0], 'door'),
        openingId: doors[0].id,
        focus: { type: 'opening', id: doors[0].id },
      })
    );
    return;
  }
  for (const s of seeds) {
    if (s.cell >= 0 && s.width >= 60) continue;
    out.push(
      makeIssue({
        code: 'door-access',
        severity: 'warning',
        title: `${names[s.door.id]} is hard to reach`,
        message: `There is hardly any free floor in front of ${names[s.door.id]}. Leave room to step through.`,
        point: openingCentre(room, s.door, 'door'),
        openingId: s.door.id,
        focus: { type: 'opening', id: s.door.id },
      })
    );
  }

  const routes = widestRoutes(
    grid,
    usable.map((s) => s.cell)
  );
  for (const piece of pieces.filter(isDestination)) {
    const raw = reachWidth(grid, routes, piece);
    const width = Math.max(0, roundTo(raw, 5));
    let severity = routeSeverity(raw, accessible);
    if (!severity) continue;
    const blocked = raw < 45;
    if (blocked) severity = 'error';
    const need = accessible ? ROUTE_ACCESSIBLE_CM : ROUTE_COMFORT_CM;
    out.push(
      makeIssue({
        code: blocked ? 'path-blocked' : 'path-narrow',
        severity,
        title: blocked
          ? `Can't reach the ${lower(piece.name)}`
          : `Tight path to the ${lower(piece.name)}`,
        message: blocked
          ? `There is no way to walk up to the ${lower(piece.name)} from a door: other pieces or walls block the way.`
          : `The way from a door to the ${lower(piece.name)} narrows to about ${width} cm. ${need} cm is ${accessible ? 'what a wheelchair needs on a main route' : 'comfortable for walking'}.`,
        point: { x: piece.item.x, y: piece.item.y },
        itemId: piece.item.id,
        focus: { type: 'item', id: piece.item.id },
      })
    );
  }

  // Accessible mode: the route between doors is the main route and wants 120 cm
  if (accessible && usable.length >= 2) {
    const first = usable[0];
    const one = widestRoutes(grid, [first.cell]);
    for (const other of usable.slice(1)) {
      const w = roundTo(one[other.cell], 5);
      if (w < ROUTE_ACCESSIBLE_CM) {
        out.push(
          makeIssue({
            code: 'route-narrow',
            severity: w < 45 ? 'error' : w < 90 ? 'warning' : 'info',
            title: `Route between ${names[first.door.id]} and ${names[other.door.id]} is tight`,
            message:
              w < 45
                ? `There is no way to walk from ${names[first.door.id]} to ${names[other.door.id]} without squeezing past furniture.`
                : `The main route between these doors narrows to about ${w} cm. ${ROUTE_ACCESSIBLE_CM} cm lets a wheelchair user and a walker pass each other.`,
            point: openingCentre(room, other.door, 'door'),
            openingId: other.door.id,
            focus: { type: 'opening', id: other.door.id },
          })
        );
      }
    }
  }
}

/** Free depth in front of a piece (cm), up to `maxCm`, measured in a strip as wide as the piece centre. */
export function freeDepthInFront(room, piece, others, maxCm = 150) {
  const w = Math.min(piece.def.widthCm, 70);
  const rot = piece.item.rotationDeg || 0;
  const step = 5;
  // Local frame: +y is the front of the piece
  const half = piece.def.depthCm / 2;
  for (let d = 0; d < maxCm; d += step) {
    const local = [
      { x: -w / 2, y: half + d + 0.5 },
      { x: w / 2, y: half + d + 0.5 },
      { x: w / 2, y: half + d + step },
      { x: -w / 2, y: half + d + step },
    ];
    const strip = local.map((p) => {
      const q = rotatePoint(
        piece.item.x + p.x,
        piece.item.y + p.y,
        piece.item.x,
        piece.item.y,
        rot
      );
      return { x: q.x, y: q.y };
    });
    const inside = hasOutline(room)
      ? cornersInOutline(strip, room.outline, 0.5)
      : strip.every((p) => insideRoom(room, p.x, p.y, 0.5));
    if (!inside) return d;
    for (const o of others) if (polygonsOverlap(strip, o.corners, 0.01)) return d;
  }
  return maxCm;
}

function frontChecks(room, pieces, accessible, out) {
  for (const piece of pieces) {
    const spec = FRONT_CLEARANCE[typeId(piece)];
    if (!spec || piece.bottom > 0) continue;
    const need = spec[accessible ? 1 : 0];
    const others = pieces.filter(
      (o) => o !== piece && blocksWalking(o) && !polygonsOverlap(o.corners, piece.corners, 0.5)
    );
    const free = freeDepthInFront(room, piece, others, need + 40);
    if (free >= need) continue;
    out.push(
      makeIssue({
        code: 'front-tight',
        severity: free < need * 0.75 ? 'warning' : 'info',
        title: `Little room in front of the ${lower(piece.name)}`,
        message: `There is about ${roundTo(free, 5)} cm of free floor in front of the ${lower(piece.name)}. Leave ${need} cm so you can stand there and open doors and drawers${accessible ? ', and so a wheelchair can pull up' : ''}.`,
        point: { x: piece.item.x, y: piece.item.y },
        itemId: piece.item.id,
        focus: { type: 'item', id: piece.item.id },
      })
    );
  }
}

/** Where a 150 cm circle fits on the free floor (for the turning-space overlay and check). */
export function turningSpace(room, pieces = gatherPieces(room)) {
  const grid = buildFloorGrid(
    room,
    pieces.filter(blocksWalking).map((p) => p.corners)
  );
  const { runs, best } = circleFits(grid, TURNING_CIRCLE_CM);
  return { fits: runs.length > 0, runs, best, cell: grid.cell, radius: TURNING_CIRCLE_CM / 2 };
}

// ---------- service points ----------

/** Corners of a service symbol footprint, for "is something covering it" tests. */
export function serviceFootprint(s, extraDepth = 0) {
  const { w, d } = SERVICE_KINDS[s.kind].size;
  const top = SERVICE_KINDS[s.kind].mount === 'wall' ? 0 : -d / 2;
  const bottom = SERVICE_KINDS[s.kind].mount === 'wall' ? d + extraDepth : d / 2 + extraDepth;
  const local = [
    { x: -w / 2, y: top },
    { x: w / 2, y: top },
    { x: w / 2, y: bottom },
    { x: -w / 2, y: bottom },
  ];
  return local.map((p) => {
    const q = rotatePoint(s.x + p.x, s.y + p.y, s.x, s.y, s.rotationDeg || 0);
    return { x: q.x, y: q.y };
  });
}

function nearest(services, kinds, piece) {
  let best = Infinity;
  for (const s of services) {
    if (!kinds.includes(s.kind)) continue;
    best = Math.min(best, distanceToPolygon({ x: s.x, y: s.y }, piece.corners));
  }
  return best;
}

function serviceChecks(room, pieces, out) {
  const services = sanitizeServices(room.services);
  const labels = serviceLabels(services);
  const has = (kinds) => services.some((s) => kinds.includes(s.kind));
  const hasPower = has(['socket']);
  const hasWater = has(['water']);
  const hasDrain = has(['drain']);
  const hasGas = has(['gas']);

  const powered = pieces.filter((p) => {
    const id = typeId(p);
    return isTv(id) || isBed(id) || isDesk(id) || POWERED_APPLIANCES.has(id);
  });
  const wet = pieces.filter((p) => WATER_PIECES.has(typeId(p)));
  const drained = pieces.filter((p) => DRAIN_PIECES.has(typeId(p)));

  if (services.length === 0) {
    if (powered.length + wet.length > 0) {
      out.push(
        makeIssue({
          code: 'services-unmarked',
          severity: 'info',
          title: 'No sockets or pipes marked yet',
          message: `Mark where the sockets, switches, water and drains are with the Services tool, and I will check that your ${listNames([...powered, ...wet])} can reach them.`,
          point: { x: room.widthCm / 2, y: room.depthCm / 2 },
          focus: { type: 'spot' },
        })
      );
    }
    return;
  }

  if (hasPower || has(['switch', 'light', 'ceiling', 'data'])) {
    for (const p of powered) {
      const id = typeId(p);
      const appliance = POWERED_APPLIANCES.has(id);
      const reach = appliance ? APPLIANCE_POWER_REACH_CM : POWER_REACH_CM;
      if (nearest(services, ['socket'], p) <= reach) continue;
      const near = hasPower ? '' : ' There are no sockets marked in this room yet.';
      out.push(
        makeIssue({
          code: 'no-socket',
          severity: isBed(id) || isDesk(id) ? 'info' : 'warning',
          title: `No socket near the ${lower(p.name)}`,
          message: `The ${lower(p.name)} has no socket within ${reach / 100} m, so it would need a long cable or an extension lead.${near}`,
          point: { x: p.item.x, y: p.item.y },
          itemId: p.item.id,
          focus: { type: 'item', id: p.item.id },
        })
      );
    }
  } else if (powered.length > 0) {
    out.push(
      makeIssue({
        code: 'no-sockets-marked',
        severity: 'info',
        title: 'No sockets marked',
        message: `No sockets are marked in this room, so I cannot tell whether the ${listNames(powered)} can be plugged in. Add some with the Services tool.`,
        point: { x: room.widthCm / 2, y: room.depthCm / 2 },
        focus: { type: 'spot' },
      })
    );
  }

  if (hasWater || hasDrain || hasGas) {
    for (const p of wet) {
      if (nearest(services, ['water'], p) <= WATER_REACH_CM) continue;
      out.push(
        makeIssue({
          code: 'no-water',
          severity: 'warning',
          title: `No water supply near the ${lower(p.name)}`,
          message: `The ${lower(p.name)} needs water, but there is no supply point within ${WATER_REACH_CM / 100} m. Add one, or move the piece closer to the pipes.`,
          point: { x: p.item.x, y: p.item.y },
          itemId: p.item.id,
          focus: { type: 'item', id: p.item.id },
        })
      );
    }
    for (const p of drained) {
      if (nearest(services, ['drain'], p) <= WATER_REACH_CM) continue;
      out.push(
        makeIssue({
          code: 'no-drain',
          severity: 'warning',
          title: `No drain near the ${lower(p.name)}`,
          message: `The ${lower(p.name)} needs a drain, but there is none within ${WATER_REACH_CM / 100} m. Add a drain point, or move the piece.`,
          point: { x: p.item.x, y: p.item.y },
          itemId: p.item.id,
          focus: { type: 'item', id: p.item.id },
        })
      );
    }
    if (hasGas) {
      for (const p of pieces.filter((q) => typeId(q) === 'kitchen-stove')) {
        if (nearest(services, ['gas'], p) <= WATER_REACH_CM) continue;
        out.push(
          makeIssue({
            code: 'no-gas',
            severity: 'info',
            title: `No gas point near the ${lower(p.name)}`,
            message: `This room has a gas point, but it is more than ${WATER_REACH_CM / 100} m from the ${lower(p.name)}. If the stove runs on gas, move one of them closer.`,
            point: { x: p.item.x, y: p.item.y },
            itemId: p.item.id,
            focus: { type: 'item', id: p.item.id },
          })
        );
      }
    }
  } else if (wet.length > 0) {
    out.push(
      makeIssue({
        code: 'no-plumbing-marked',
        severity: 'info',
        title: 'No water or drain points marked',
        message: `No water or drain points are marked, so I cannot check the ${listNames(wet)}. Add them with the Services tool.`,
        point: { x: room.widthCm / 2, y: room.depthCm / 2 },
        focus: { type: 'spot' },
      })
    );
  }

  // Radiators and air conditioners that something stands in front of
  for (const s of services) {
    if (s.kind !== 'radiator' && s.kind !== 'ac') continue;
    const zone = serviceFootprint(s, s.kind === 'radiator' ? 25 : 40);
    const hit = pieces.find(
      (p) => !p.flat && p.bottom < 100 && p.top > 25 && polygonsOverlap(p.corners, zone, 0.5)
    );
    if (!hit) continue;
    out.push(
      makeIssue({
        code: 'service-covered',
        severity: 'info',
        title: `${hit.name} covers ${labels[s.id]}`,
        message: `The ${lower(hit.name)} stands in front of ${labels[s.id].toLowerCase()}, so the ${s.kind === 'ac' ? 'air' : 'heat'} cannot spread into the room.`,
        point: { x: s.x, y: s.y },
        itemId: hit.item.id,
        serviceId: s.id,
        focus: { type: 'service', id: s.id },
      })
    );
  }

  // Wall points that no longer sit on a wall (the room's shape changed)
  for (const s of services) {
    if (SERVICE_KINDS[s.kind].mount !== 'wall') continue;
    const snap = snapToWall(room, s.x, s.y);
    if (!snap || snap.dist > 30 || !insideRoom(room, s.x, s.y, 20)) {
      out.push(
        makeIssue({
          code: 'service-off-wall',
          severity: 'info',
          title: `${labels[s.id]} is not on a wall`,
          message: `${labels[s.id]} should sit on a wall but it is out in the room. Drag it back to a wall.`,
          point: { x: s.x, y: s.y },
          serviceId: s.id,
          focus: { type: 'service', id: s.id },
        })
      );
    }
  }
}

function listNames(pieces) {
  const names = [...new Set(pieces.map((p) => lower(p.name)))];
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

// ---------- everything together ----------

const CHECKS = [
  { id: 'doors', label: 'Doors and swings', codes: ['door-narrow', 'door-clash', 'door-blocked'] },
  { id: 'windows', label: 'Windows', codes: ['window-blocked', 'window-covered'] },
  {
    id: 'paths',
    label: 'Walking paths',
    codes: ['entrance-blocked', 'door-access', 'path-blocked', 'path-narrow', 'route-narrow'],
  },
  { id: 'fronts', label: 'Space in front of units', codes: ['front-tight'] },
  { id: 'turning', label: 'Turning space', codes: ['no-turning-circle'] },
  {
    id: 'power',
    label: 'Sockets',
    codes: ['no-socket', 'no-sockets-marked', 'services-unmarked'],
  },
  {
    id: 'plumbing',
    label: 'Water and drains',
    codes: ['no-water', 'no-drain', 'no-gas', 'no-plumbing-marked'],
  },
  { id: 'points', label: 'Service points', codes: ['service-covered', 'service-off-wall'] },
];

/**
 * Runs every check. Options: `accessible` (stricter widths and the turning-circle check).
 * Returns { issues, counts, checked }.
 */
export function runPlanChecks(room, { accessible = false } = {}) {
  counter = 0;
  const empty = { issues: [], counts: { error: 0, warning: 0, info: 0, total: 0 }, checked: [] };
  if (!room) return empty;
  const pieces = gatherPieces(room);
  const names = openingNames(room);
  const out = [];

  doorChecks(room, pieces, names, out);
  windowChecks(room, pieces, names, out);

  if ((room.doors || []).length > 0 || accessible) {
    const grid = buildFloorGrid(
      room,
      pieces.filter(blocksWalking).map((p) => p.corners)
    );
    pathChecks(room, pieces, names, grid, accessible, out);
    if (accessible) {
      const { runs } = circleFits(grid, TURNING_CIRCLE_CM);
      if (runs.length === 0) {
        out.push(
          makeIssue({
            code: 'no-turning-circle',
            severity: 'warning',
            title: 'No room to turn a wheelchair',
            message: `A ${TURNING_CIRCLE_CM} cm circle does not fit anywhere on the free floor, so a wheelchair user could not turn around. Clear some floor, or turn on the turning-space view to see how close it is.`,
            point: { x: room.widthCm / 2, y: room.depthCm / 2 },
            focus: { type: 'spot' },
          })
        );
      }
    }
  }
  frontChecks(room, pieces, accessible, out);
  serviceChecks(room, pieces, out);

  const rank = { error: 0, warning: 1, info: 2 };
  const issues = out
    .map((issue, i) => ({ issue, i }))
    .sort((a, b) => rank[a.issue.severity] - rank[b.issue.severity] || a.i - b.i)
    .map(({ issue }) => issue);
  const counts = { error: 0, warning: 0, info: 0, total: issues.length };
  for (const i of issues) counts[i.severity] += 1;
  const checked = CHECKS.filter((c) => accessible || c.id !== 'turning').map((c) => ({
    id: c.id,
    label: c.label,
    issues: issues.filter((i) => c.codes.includes(i.code)).length,
  }));
  return { issues, counts, checked };
}

export { doorGeometry, sectorPolygon };
