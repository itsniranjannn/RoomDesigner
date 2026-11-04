/**
 * flat.js
 * Pure model helpers for the flat designer: kinds of rooms, levels, staircases and
 * the furniture a room starts with.
 *
 * A flat stores walls and openings per level (see flatWalls.js). Rooms are the
 * enclosed regions between walls; each rectangular room is backed by a regular room
 * record (roomId) that holds doors, windows and furniture and is edited in the
 * normal room designer. Wall detection, identity carry-over and migration of old
 * flats live in flatPlan.js.
 */

import { suggestLayout } from './layout.js';

const GRID_CM = 10;
const DEFAULT_FLOOR_HEIGHT_CM = 280;
export const TREAD_CM = 27;
const MAX_RISER_CM = 17.5;
export const FLAT_VERSION = 2;

export const SPACE_KINDS = {
  living: { label: 'Hall / Living', color: '#EFE3CF' },
  bedroom: { label: 'Bedroom', color: '#E7DCEB' },
  kitchen: { label: 'Kitchen', color: '#F1E2C8' },
  bathroom: { label: 'Bathroom', color: '#D9E8EC' },
  dining: { label: 'Dining', color: '#EBD7C4' },
  corridor: { label: 'Corridor', color: '#E9E4DA' },
  store: { label: 'Store', color: '#DDD3C0' },
  room: { label: 'Other', color: '#EAE6DC' },
};

export const kindOptions = () =>
  Object.entries(SPACE_KINDS).map(([value, def]) => ({ value, label: def.label }));

export const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function createFlat(name = 'My Flat') {
  const levelId = 'lvl-0';
  return {
    id: uid('flat'),
    version: FLAT_VERSION,
    name,
    floorHeightCm: DEFAULT_FLOOR_HEIGHT_CM,
    levels: [{ id: levelId, name: 'Ground floor' }],
    walls: { [levelId]: [] },
    openings: { [levelId]: [] },
    spaces: [],
    stairs: [],
    roomCounter: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function addLevel(flat) {
  const n = flat.levels.length;
  const id = `lvl-${n}-${Math.random().toString(36).slice(2, 5)}`;
  return {
    ...flat,
    levels: [...flat.levels, { id, name: `Floor ${n}` }],
    walls: { ...flat.walls, [id]: [] },
    openings: { ...flat.openings, [id]: [] },
  };
}

export function removeLevel(flat, levelId) {
  if (flat.levels.length <= 1) return flat;
  const walls = { ...flat.walls };
  const openings = { ...flat.openings };
  delete walls[levelId];
  delete openings[levelId];
  return {
    ...flat,
    levels: flat.levels.filter((l) => l.id !== levelId),
    walls,
    openings,
    // spaces of the removed floor are dropped (with their room records) by reconcile()
    stairs: flat.stairs.filter((s) => s.levelId !== levelId),
  };
}

export function levelIndex(flat, levelId) {
  return Math.max(
    0,
    flat.levels.findIndex((l) => l.id === levelId)
  );
}

export function snapToGrid(v, step = GRID_CM) {
  return Math.round(v / step) * step;
}

// ---------- starter rooms ----------

/** Furniture ids a room of this kind starts with, chosen for the room's size. */
function starterFurnitureIds(kind, widthCm, depthCm) {
  const areaM2 = (widthCm * depthCm) / 10000;
  switch (kind) {
    case 'bathroom':
      return areaM2 >= 5
        ? ['shower-tray', 'toilet', 'bath-vanity', 'washing-machine']
        : ['shower-tray', 'toilet', 'wash-basin'];
    case 'bedroom':
      return areaM2 >= 11
        ? ['bed-king', 'nightstand', 'nightstand', 'wardrobe-3door']
        : areaM2 >= 8
          ? ['bed-queen', 'nightstand', 'wardrobe-2door']
          : ['bed-single', 'nightstand', 'wardrobe-2door'];
    case 'kitchen':
      return areaM2 >= 10
        ? ['kitchen-counter', 'kitchen-stove', 'sink-unit', 'kitchen-fridge', 'kitchen-island']
        : ['kitchen-counter', 'kitchen-stove', 'sink-unit', 'kitchen-fridge'];
    case 'living':
      return areaM2 >= 16
        ? ['sofa-l-shaped', 'coffee-table', 'tv-unit-low', 'floor-lamp']
        : ['sofa-3seat', 'coffee-table', 'media-console', 'tv-43'];
    case 'dining':
      return areaM2 >= 9
        ? ['dining-table-large', 'sideboard-buffet']
        : ['dining-table-4', 'sideboard-buffet'];
    case 'store':
      return ['pantry-cabinet', 'shoe-rack'];
    default:
      return [];
  }
}

/** A blank room record for a region (no furniture). */
export function buildBlankRoom({ kind = 'room', name, widthCm, depthCm, flatId, spaceId }) {
  return {
    id: uid('room'),
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
}

/** Returns the room with default furniture for its kind (existing pieces stay as obstacles). */
export function furnishRoomRecord(room, kind = room.kind) {
  const ids = starterFurnitureIds(kind, room.widthCm, room.depthCm);
  if (ids.length === 0) return { ...room, kind };
  const { placed } = suggestLayout(room, ids);
  return { ...room, kind, placedFurniture: [...(room.placedFurniture || []), ...placed] };
}

// ---------- stairs ----------

export const STAIR_TYPES = {
  straight: 'Straight',
  L: 'L-shaped (quarter turn)',
  U: 'U-shaped (half turn)',
};

export const STAIR_LIMITS = { widthCm: [70, 200], riseCm: [200, 450] };

function stairStepCount(riseCm) {
  return Math.max(2, Math.ceil(riseCm / MAX_RISER_CM));
}

export function createStair(
  flat,
  { levelId, type = 'straight', widthCm = 100, x = 0, y = 0, rotationDeg = 0 }
) {
  return {
    id: uid('stair'),
    levelId,
    type,
    widthCm,
    rotationDeg,
    riseCm: flat.floorHeightCm,
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
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
      {
        x: 0,
        y: 0,
        widthCm: W,
        lengthCm: b * T,
        dir: 'right',
        firstStep: a + 2,
        treads: b,
        horizontal: true,
      },
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
  const quarter = ((Math.round((stair.rotationDeg || 0) / 90) % 4) + 4) % 4;
  return quarter % 2 === 1
    ? { widthCm: g.localDepthCm, depthCm: g.localWidthCm }
    : { widthCm: g.localWidthCm, depthCm: g.localDepthCm };
}

/** Rectangle occupied by a stair on its own level (and as a void on the level above). */
export function stairRect(stair) {
  const fp = stairFootprint(stair);
  return { x: stair.x, y: stair.y, widthCm: fp.widthCm, depthCm: fp.depthCm };
}

/** Walking length along the stair run (for labels). */
export function stairRunLength(stair) {
  const g = stairGeometry(stair);
  return g.flights.reduce((sum, f) => sum + f.lengthCm, 0);
}

export function flatSummary(flat) {
  const counts = {};
  let areaCm2 = 0;
  for (const s of flat.spaces) {
    areaCm2 += s.areaCm2 || 0;
    counts[s.kind] = (counts[s.kind] || 0) + 1;
  }
  return {
    areaM2: areaCm2 / 10000,
    counts,
    rooms: flat.spaces.length,
    levels: flat.levels.length,
    stairs: flat.stairs.length,
  };
}
