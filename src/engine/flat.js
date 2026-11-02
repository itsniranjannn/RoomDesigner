/**
 * flat.js
 * Pure model helpers for multi-room flat plans: spaces (rooms, bathrooms, corridors),
 * staircases, placement/snapping and per-kind starter rooms.
 *
 * A flat stores layout only. Each space points at a regular room record (roomId)
 * that holds doors, windows and furniture and is edited in the normal room designer.
 */

import { suggestLayout } from './layout.js';

export const GRID_CM = 10;
export const SNAP_CM = 15;
export const DEFAULT_FLOOR_HEIGHT_CM = 280;
export const TREAD_CM = 27;
export const MAX_RISER_CM = 17.5;

export const SPACE_KINDS = {
  living: { label: 'Living room', widthCm: 420, depthCm: 380, color: '#EFE3CF' },
  bedroom: { label: 'Bedroom', widthCm: 360, depthCm: 340, color: '#E7DCEB' },
  kitchen: { label: 'Kitchen', widthCm: 300, depthCm: 260, color: '#F1E2C8' },
  bathroom: { label: 'Bathroom', widthCm: 200, depthCm: 240, color: '#D9E8EC' },
  corridor: { label: 'Corridor', widthCm: 120, depthCm: 400, color: '#E9E4DA' },
  room: { label: 'Room', widthCm: 340, depthCm: 320, color: '#EAE6DC' },
};

export const SPACE_LIMITS = { minCm: 100, maxCm: 1500 };

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function createFlat(name = 'My Flat') {
  return {
    id: uid('flat'),
    name,
    floorHeightCm: DEFAULT_FLOOR_HEIGHT_CM,
    levels: [{ id: 'lvl-0', name: 'Ground floor' }],
    spaces: [],
    stairs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function addLevel(flat) {
  const n = flat.levels.length;
  return { ...flat, levels: [...flat.levels, { id: `lvl-${n}-${Math.random().toString(36).slice(2, 5)}`, name: `Floor ${n}` }] };
}

export function removeLevel(flat, levelId) {
  if (flat.levels.length <= 1) return flat;
  return {
    ...flat,
    levels: flat.levels.filter((l) => l.id !== levelId),
    spaces: flat.spaces.filter((s) => s.levelId !== levelId),
    stairs: flat.stairs.filter((s) => s.levelId !== levelId),
  };
}

export function levelIndex(flat, levelId) {
  return Math.max(0, flat.levels.findIndex((l) => l.id === levelId));
}

// ---------- rectangles ----------

export function rectsOverlap(a, b, eps = 1) {
  return (
    a.x < b.x + b.widthCm - eps &&
    b.x < a.x + a.widthCm - eps &&
    a.y < b.y + b.depthCm - eps &&
    b.y < a.y + a.depthCm - eps
  );
}

export function snapToGrid(v, step = GRID_CM) {
  return Math.round(v / step) * step;
}

/** Rectangle occupied by a stair on its own level (and as a void on the level above). */
export function stairRect(stair) {
  const fp = stairFootprint(stair);
  return { x: stair.x, y: stair.y, widthCm: fp.widthCm, depthCm: fp.depthCm };
}

/** Obstacles on a level: spaces on the level plus stairs that start there. */
export function levelObstacles(flat, levelId, ignore = {}) {
  const rects = [];
  for (const s of flat.spaces) {
    if (s.levelId === levelId && s.id !== ignore.spaceId) rects.push({ id: s.id, x: s.x, y: s.y, widthCm: s.widthCm, depthCm: s.depthCm });
  }
  for (const st of flat.stairs) {
    if (st.levelId === levelId && st.id !== ignore.stairId) rects.push({ id: st.id, ...stairRect(st) });
  }
  return rects;
}

/**
 * Snaps a rectangle to the grid and flushes its edges to nearby neighbours.
 */
export function snapRect(rect, neighbours, threshold = SNAP_CM) {
  let x = snapToGrid(rect.x);
  let y = snapToGrid(rect.y);
  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  let adjX = x;
  let adjY = y;

  for (const n of neighbours) {
    const xCandidates = [n.x - rect.widthCm, n.x + n.widthCm, n.x, n.x + n.widthCm - rect.widthCm];
    for (const cx of xCandidates) {
      const d = Math.abs(cx - rect.x);
      if (d < bestDx && d <= threshold) {
        bestDx = d;
        adjX = cx;
      }
    }
    const yCandidates = [n.y - rect.depthCm, n.y + n.depthCm, n.y, n.y + n.depthCm - rect.depthCm];
    for (const cy of yCandidates) {
      const d = Math.abs(cy - rect.y);
      if (d < bestDy && d <= threshold) {
        bestDy = d;
        adjY = cy;
      }
    }
  }
  if (bestDx <= threshold) x = adjX;
  if (bestDy <= threshold) y = adjY;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

/** Finds the first free spot (scanning rows) for a rectangle of the given size. */
export function findFreeSpot(flat, levelId, widthCm, depthCm) {
  const obstacles = levelObstacles(flat, levelId);
  for (let y = 0; y < 3000; y += 50) {
    for (let x = 0; x < 3000; x += 50) {
      const candidate = { x, y, widthCm, depthCm };
      if (!obstacles.some((o) => rectsOverlap(candidate, o))) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

export function canPlace(flat, levelId, rect, ignore = {}) {
  return !levelObstacles(flat, levelId, ignore).some((o) => rectsOverlap(rect, o));
}

// ---------- spaces ----------

export function createSpace(flat, { kind, levelId, roomId, name, widthCm, depthCm }) {
  const def = SPACE_KINDS[kind] || SPACE_KINDS.room;
  const w = widthCm ?? def.widthCm;
  const d = depthCm ?? def.depthCm;
  const pos = findFreeSpot(flat, levelId, w, d);
  return {
    id: uid('space'),
    kind: SPACE_KINDS[kind] ? kind : 'room',
    levelId,
    roomId,
    name: name || def.label,
    x: pos.x,
    y: pos.y,
    widthCm: w,
    depthCm: d,
  };
}

export function clampSpaceSize(v) {
  return Math.max(SPACE_LIMITS.minCm, Math.min(SPACE_LIMITS.maxCm, Math.round(v)));
}

/**
 * Builds the starter room record for a space kind (doors, windows and fixtures).
 */
const OPPOSITE_WALL = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function wallLength(wall, widthCm, depthCm) {
  return wall === 'left' || wall === 'right' ? depthCm : widthCm;
}

export function buildStarterRoom({ kind, name, widthCm, depthCm, flatId, spaceId, doorWall = 'bottom' }) {
  const stamp = Date.now();
  const room = {
    id: `room-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    kind,
    flatId,
    spaceId,
    widthCm,
    depthCm,
    doors: [],
    windows: [],
    placedFurniture: [],
    updatedAt: new Date().toISOString(),
  };

  if (kind === 'corridor') {
    const vertical = depthCm >= widthCm;
    const doorW = Math.min(90, (vertical ? widthCm : depthCm) - 40);
    const off = Math.round(((vertical ? widthCm : depthCm) - doorW) / 2);
    room.doors = vertical
      ? [
          { id: `door-${stamp}-a`, wall: 'top', offsetCm: off, widthCm: doorW, swingDirection: 'inward-left' },
          { id: `door-${stamp}-b`, wall: 'bottom', offsetCm: off, widthCm: doorW, swingDirection: 'inward-left' },
        ]
      : [
          { id: `door-${stamp}-a`, wall: 'left', offsetCm: off, widthCm: doorW, swingDirection: 'inward-left' },
          { id: `door-${stamp}-b`, wall: 'right', offsetCm: off, widthCm: doorW, swingDirection: 'inward-left' },
        ];
    return room;
  }

  const doorW = kind === 'bathroom' ? 75 : 90;
  room.doors = [{ id: `door-${stamp}`, wall: doorWall, offsetCm: 30, widthCm: doorW, swingDirection: 'inward-left' }];

  const windowWall = OPPOSITE_WALL[doorWall] || 'top';
  const winLen = wallLength(windowWall, widthCm, depthCm);
  if (kind !== 'bathroom' || winLen >= 160) {
    const winW = kind === 'bathroom' ? 60 : 120;
    room.windows = [{ id: `win-${stamp}`, wall: windowWall, offsetCm: Math.round(winLen / 2 - winW / 2), widthCm: winW }];
  }

  const starter = {
    bathroom: ['shower-tray', 'toilet', 'wash-basin'],
    bedroom: ['bed-queen', 'nightstand', 'wardrobe-2door'],
    kitchen: ['kitchen-counter', 'kitchen-stove', 'kitchen-fridge'],
    living: ['sofa-3seat', 'coffee-table', 'media-console', 'tv-43'],
  }[kind];
  if (starter) {
    room.placedFurniture = suggestLayout(room, starter).placed;
  }
  return room;
}

/** Moves a room's first door to another wall, keeping it inside the wall's length. */
export function moveDoorToWall(room, wall) {
  const doors = (room.doors || []).map((door, i) => {
    if (i !== 0) return door;
    const len = wallLength(wall, room.widthCm, room.depthCm);
    const offsetCm = Math.max(15, Math.min(len - door.widthCm - 15, Math.round(len / 2 - door.widthCm / 2)));
    return { ...door, wall, offsetCm };
  });
  return { ...room, doors };
}

/** Resizes a space and returns the fitted room (furniture and openings kept inside). */
export function fitRoomToSize(room, widthCm, depthCm) {
  const clampOff = (o, len, ow) => Math.max(15, Math.min(len - ow - 15, o.offsetCm));
  const fixOpenings = (list, fallbackWall) =>
    (list || []).map((o) => {
      const wall = o.wall || fallbackWall;
      const len = wall === 'left' || wall === 'right' ? depthCm : widthCm;
      const ow = Math.min(o.widthCm, Math.max(60, len - 30));
      return { ...o, widthCm: ow, offsetCm: Math.round(clampOff(o, len, ow)) };
    });
  return {
    ...room,
    widthCm,
    depthCm,
    doors: fixOpenings(room.doors, 'bottom'),
    windows: fixOpenings(room.windows, 'top'),
    placedFurniture: (room.placedFurniture || []).map((f) => ({
      ...f,
      x: Math.max(0, Math.min(widthCm, f.x)),
      y: Math.max(0, Math.min(depthCm, f.y)),
    })),
  };
}

// ---------- stairs ----------

export const STAIR_TYPES = {
  straight: 'Straight',
  L: 'L-shaped (quarter turn)',
  U: 'U-shaped (half turn)',
};

export function stairStepCount(riseCm) {
  return Math.max(2, Math.ceil(riseCm / MAX_RISER_CM));
}

export function createStair(flat, { levelId, type = 'straight', widthCm = 100 }) {
  const draft = {
    id: uid('stair'),
    levelId,
    type,
    widthCm,
    rotationDeg: 0,
    riseCm: flat.floorHeightCm,
    x: 0,
    y: 0,
  };
  const fp = stairFootprint(draft);
  const pos = findFreeSpot(flat, levelId, fp.widthCm, fp.depthCm);
  return { ...draft, x: pos.x, y: pos.y };
}

/**
 * Local (unrotated) geometry. Flights ascend in `dir` ('up' = toward -y, 'right' = +x, 'down' = +y).
 * @returns {{ steps: number, riserCm: number, localWidthCm: number, localDepthCm: number,
 *             flights: Array, landing: Object|null }}
 */
export function stairGeometry(stair) {
  const W = stair.widthCm;
  const N = stairStepCount(stair.riseCm);
  const riserCm = stair.riseCm / N;
  const T = TREAD_CM;

  if (stair.type === 'L') {
    const treads = Math.max(2, N - 2);
    const a = Math.ceil(treads / 2);
    const b = treads - a;
    const flights = [
      { x: b * T, y: W, widthCm: W, lengthCm: a * T, dir: 'up', firstStep: 1, treads: a },
      { x: 0, y: 0, widthCm: W, lengthCm: b * T, dir: 'right', firstStep: a + 2, treads: b, horizontal: true },
    ];
    return {
      steps: N,
      riserCm,
      localWidthCm: W + b * T,
      localDepthCm: W + a * T,
      flights,
      landing: { x: b * T, y: 0, widthCm: W, depthCm: W, stepIndex: a + 1 },
    };
  }

  if (stair.type === 'U') {
    const treads = Math.max(2, N - 2);
    const a = Math.ceil(treads / 2);
    const b = treads - a;
    const gap = 10;
    const flights = [
      { x: 0, y: W, widthCm: W, lengthCm: a * T, dir: 'up', firstStep: 1, treads: a },
      { x: W + gap, y: W, widthCm: W, lengthCm: b * T, dir: 'down', firstStep: a + 2, treads: b },
    ];
    return {
      steps: N,
      riserCm,
      localWidthCm: W * 2 + gap,
      localDepthCm: W + Math.max(a, b) * T,
      flights,
      landing: { x: 0, y: 0, widthCm: W * 2 + gap, depthCm: W, stepIndex: a + 1 },
    };
  }

  const treads = N - 1;
  return {
    steps: N,
    riserCm,
    localWidthCm: W,
    localDepthCm: treads * T,
    flights: [{ x: 0, y: 0, widthCm: W, lengthCm: treads * T, dir: 'up', firstStep: 1, treads }],
    landing: null,
  };
}

/** Bounding footprint after rotation (multiples of 90°). */
export function stairFootprint(stair) {
  const g = stairGeometry(stair);
  const quarter = (((Math.round((stair.rotationDeg || 0) / 90) % 4) + 4) % 4);
  return quarter % 2 === 1
    ? { widthCm: g.localDepthCm, depthCm: g.localWidthCm }
    : { widthCm: g.localWidthCm, depthCm: g.localDepthCm };
}

/** Walking length along the stair run (for labels). */
export function stairRunLength(stair) {
  const g = stairGeometry(stair);
  return g.flights.reduce((sum, f) => sum + f.lengthCm, 0);
}

export function flatSummary(flat, rooms = []) {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  let areaCm2 = 0;
  const counts = {};
  for (const s of flat.spaces) {
    areaCm2 += s.widthCm * s.depthCm;
    counts[s.kind] = (counts[s.kind] || 0) + 1;
  }
  const furnitureCount = flat.spaces.reduce((n, s) => n + (roomById.get(s.roomId)?.placedFurniture?.length || 0), 0);
  return { areaM2: areaCm2 / 10000, counts, furnitureCount, levels: flat.levels.length, stairs: flat.stairs.length };
}

/**
 * A ready-made 2-bedroom flat: living room and kitchen on top, a hallway, then two
 * bedrooms and a bathroom below. Returns the flat plus the room records to save.
 */
export function buildTemplateFlat(name = 'Two-bedroom flat') {
  let flat = createFlat(name);
  const rooms = [];
  const levelId = flat.levels[0].id;
  const plan = [
    { kind: 'living', name: 'Living room', x: 0, y: 0, widthCm: 420, depthCm: 380, doorWall: 'bottom' },
    { kind: 'kitchen', name: 'Kitchen', x: 420, y: 0, widthCm: 300, depthCm: 380, doorWall: 'bottom' },
    { kind: 'corridor', name: 'Hallway', x: 0, y: 380, widthCm: 720, depthCm: 120 },
    { kind: 'bedroom', name: 'Master bedroom', x: 0, y: 500, widthCm: 360, depthCm: 340, doorWall: 'top' },
    { kind: 'bathroom', name: 'Bathroom', x: 360, y: 500, widthCm: 160, depthCm: 240, doorWall: 'top' },
    { kind: 'bedroom', name: 'Second bedroom', x: 520, y: 500, widthCm: 300, depthCm: 340, doorWall: 'top' },
  ];
  for (const p of plan) {
    const spaceId = uid('space');
    const room = buildStarterRoom({
      kind: p.kind,
      name: p.name,
      widthCm: p.widthCm,
      depthCm: p.depthCm,
      flatId: flat.id,
      spaceId,
      doorWall: p.doorWall,
    });
    rooms.push(room);
    flat = {
      ...flat,
      spaces: [
        ...flat.spaces,
        { id: spaceId, kind: p.kind, levelId, roomId: room.id, name: p.name, x: p.x, y: p.y, widthCm: p.widthCm, depthCm: p.depthCm },
      ],
    };
  }
  return { flat, rooms };
}
