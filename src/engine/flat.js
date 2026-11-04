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
  passage: { label: 'Passage', color: '#DCE4D6' },
  // Older flats and presets call a passage a corridor; it reads and behaves the same
  corridor: { label: 'Passage', color: '#DCE4D6', legacy: true },
  store: { label: 'Store', color: '#DDD3C0' },
  room: { label: 'Other', color: '#EAE6DC' },
};

export const kindOptions = () =>
  Object.entries(SPACE_KINDS)
    .filter(([, def]) => !def.legacy)
    .map(([value, def]) => ({ value, label: def.label }));

export const isPassageKind = (kind) => kind === 'passage' || kind === 'corridor';

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

export const STAIR_LIMITS = { widthCm: [70, 200], riseCm: [200, 1200] };
const MIN_RISER_CM = 12;

/** Steps in a staircase: the one the user chose when it gives a comfortable riser, else the fewest that do. */
export function stairStepCount(stair) {
  const auto = Math.max(2, Math.ceil(stair.riseCm / MAX_RISER_CM));
  const chosen = Number(stair.steps);
  if (!Number.isFinite(chosen)) return auto;
  const lo = Math.max(2, Math.ceil(stair.riseCm / 22));
  const hi = Math.max(lo, Math.floor(stair.riseCm / MIN_RISER_CM));
  return Math.max(lo, Math.min(hi, Math.round(chosen)));
}

/** Range of step counts a rise allows. */
export function stairStepRange(riseCm) {
  const lo = Math.max(2, Math.ceil(riseCm / 22));
  return [lo, Math.max(lo, Math.floor(riseCm / MIN_RISER_CM))];
}

/** Index of the floor a staircase climbs to (default: the floor above), or -1 when there is none. */
export function stairTargetIndex(flat, stair) {
  const from = levelIndex(flat, stair.levelId);
  const target = stair.toLevelId ? flat.levels.findIndex((l) => l.id === stair.toLevelId) : -1;
  if (target > from) return target;
  return from + 1 < flat.levels.length ? from + 1 : -1;
}

/** Whether a staircase opens a hole in the floor of a level (the floors it arrives on). */
export function stairOpensOn(flat, stair, levelId) {
  const from = levelIndex(flat, stair.levelId);
  const to = stairTargetIndex(flat, stair);
  const idx = flat.levels.findIndex((l) => l.id === levelId);
  return to > from && idx > from && idx <= to;
}

/** Floor to floor height for climbing from one level to another. */
export function stairRiseBetween(flat, fromId, toId) {
  const span = Math.max(1, levelIndex(flat, toId) - levelIndex(flat, fromId));
  return flat.floorHeightCm * span;
}

export function createStair(
  flat,
  { levelId, type = 'straight', widthCm = 100, x = 0, y = 0, rotationDeg = 0, toLevelId, steps }
) {
  const stair = {
    id: uid('stair'),
    levelId,
    type,
    widthCm,
    rotationDeg,
    riseCm: flat.floorHeightCm,
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
  const from = levelIndex(flat, levelId);
  const to = toLevelId ? flat.levels.findIndex((l) => l.id === toLevelId) : -1;
  if (to > from) {
    stair.toLevelId = toLevelId;
    stair.riseCm = flat.floorHeightCm * (to - from);
  }
  if (steps !== undefined && steps !== null) {
    const [lo, hi] = stairStepRange(stair.riseCm);
    stair.steps = Math.max(lo, Math.min(hi, Math.round(steps)));
  }
  return stair;
}

/**
 * Local (unrotated) geometry. Flights ascend in `dir` ('up' = toward -y, 'left' = -x, 'right' = +x, 'down' = +y).
 * @returns {{ steps: number, riserCm: number, localWidthCm: number, localDepthCm: number,
 *             flights: Array, landing: Object|null }}
 */
export function stairGeometry(stair) {
  const W = stair.widthCm;
  const N = stairStepCount(stair);
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
        dir: 'left',
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

/** The stair with its rise matched to the floors it joins (flat.floorHeightCm per floor climbed). */
export function normalizeStair(flat, stair) {
  const to = stairTargetIndex(flat, stair);
  if (to < 0) return stair;
  const rise = flat.floorHeightCm * (to - levelIndex(flat, stair.levelId));
  const toLevelId = flat.levels[to].id;
  if (stair.riseCm === rise && stair.toLevelId === toLevelId) return stair;
  const next = { ...stair, riseCm: rise, toLevelId };
  if (next.steps !== undefined) next.steps = stairStepCount(next);
  return next;
}

/** Stairs of a flat with their rise matched to the floors; the same flat when nothing changes. */
export function normalizeStairs(flat) {
  const stairs = flat.stairs.map((s) => normalizeStair(flat, s));
  return stairs.every((s, i) => s === flat.stairs[i]) ? flat : { ...flat, stairs };
}

// ---------- stair surfaces (3D, walking) ----------

const quarterTurns = (stair) => ((Math.round((stair.rotationDeg || 0) / 90) % 4) + 4) % 4;

/** Rotates a point about a centre by quarter turns clockwise on the plan (y points down). */
function turnQuarter(px, py, cx, cy, quarters) {
  const dx = px - cx;
  const dy = py - cy;
  switch (quarters) {
    case 1:
      return { x: cx - dy, y: cy + dx };
    case 2:
      return { x: cx - dx, y: cy - dy };
    case 3:
      return { x: cx + dy, y: cy - dx };
    default:
      return { x: px, y: py };
  }
}

/**
 * Every tread of a staircase as a rectangle on the plan (flat coordinates, cm) with the
 * height of its top above the floor the stair starts on. Landings are included.
 * @returns {Array<{ x0, y0, x1, y1, top, landing?: boolean }>}
 */
export function stairTreads(stair) {
  const g = stairGeometry(stair);
  const fp = stairFootprint(stair);
  const q = quarterTurns(stair);
  const cx = stair.x + fp.widthCm / 2;
  const cy = stair.y + fp.depthCm / 2;
  const lcx = g.localWidthCm / 2;
  const lcy = g.localDepthCm / 2;
  const out = [];
  const push = (lx0, ly0, lx1, ly1, top, landing = false, extra = {}) => {
    // Local box centred on the footprint, then turned and moved onto the plan
    const a = turnQuarter(lx0 - lcx, ly0 - lcy, 0, 0, q);
    const b = turnQuarter(lx1 - lcx, ly1 - lcy, 0, 0, q);
    out.push({
      x0: cx + Math.min(a.x, b.x),
      y0: cy + Math.min(a.y, b.y),
      x1: cx + Math.max(a.x, b.x),
      y1: cy + Math.max(a.y, b.y),
      top,
      landing,
      ...extra,
    });
  };
  const T = TREAD_CM;
  g.flights.forEach((f, flight) => {
    const local =
      f.dir === 'up' ? [0, -1] : f.dir === 'down' ? [0, 1] : f.dir === 'left' ? [-1, 0] : [1, 0];
    const turned = turnQuarter(local[0], local[1], 0, 0, q);
    const extra = { flight, dirX: turned.x, dirY: turned.y };
    for (let i = 0; i < f.treads; i++) {
      const top = (f.firstStep + i) * g.riserCm;
      const meta = { ...extra, index: i };
      if (f.dir === 'up')
        push(
          f.x,
          f.y + f.lengthCm - (i + 1) * T,
          f.x + f.widthCm,
          f.y + f.lengthCm - i * T,
          top,
          false,
          meta
        );
      else if (f.dir === 'down')
        push(f.x, f.y + i * T, f.x + f.widthCm, f.y + (i + 1) * T, top, false, meta);
      else if (f.dir === 'left')
        push(
          f.x + f.lengthCm - (i + 1) * T,
          f.y,
          f.x + f.lengthCm - i * T,
          f.y + f.widthCm,
          top,
          false,
          meta
        );
      else push(f.x + i * T, f.y, f.x + (i + 1) * T, f.y + f.widthCm, top, false, meta);
    }
  });
  if (g.landing) {
    const L = g.landing;
    push(L.x, L.y, L.x + L.widthCm, L.y + L.depthCm, L.stepIndex * g.riserCm, true);
  }
  return out;
}

/** Height (cm above the start floor) of the staircase surface at a plan point, or null when it is not on a tread. */
export function stairHeightAt(stair, x, y) {
  let best = null;
  for (const t of stairTreads(stair)) {
    if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) best = Math.max(best ?? 0, t.top);
  }
  return best;
}

/** Height of the highest tread: standing here you step straight onto the floor above. */
export function stairTopTread(stair) {
  const g = stairGeometry(stair);
  return (g.steps - 1) * g.riserCm;
}
