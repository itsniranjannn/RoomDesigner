/**
 * materials.js
 * The floor and wall finishes a room can have. Pure data and helpers (no three.js), so the choices can be
 * tested and shared by the room view, the flat view and the picker. How each finish is drawn lives in
 * surfaceTextures.js. A room keeps only the ids: `room.finish = { floor, wall }`. A missing id means the
 * classic look the app always had, so rooms saved before finishes existed look the same as before.
 */

/** Floors. `tileM` is the size in metres of one repeat of the picture. */
export const FLOORS = [
  {
    id: 'plank',
    label: 'Wood plank',
    swatch: '#B98B5E',
    texture: 'plank',
    tileM: 1.2,
    roughness: 0.62,
  },
  { id: 'oak', label: 'Light oak', swatch: '#D9BC91', texture: 'oak', tileM: 1.2, roughness: 0.6 },
  {
    id: 'walnut',
    label: 'Dark wood',
    swatch: '#5A3B29',
    texture: 'walnut',
    tileM: 1.2,
    roughness: 0.55,
  },
  { id: 'tile', label: 'Tile', swatch: '#D8D4CB', texture: 'tile', tileM: 1.2, roughness: 0.4 },
  {
    id: 'concrete',
    label: 'Concrete',
    swatch: '#9A9893',
    texture: 'concrete',
    tileM: 2,
    roughness: 0.85,
  },
  {
    id: 'marble',
    label: 'Marble',
    swatch: '#ECE9E4',
    texture: 'marble',
    tileM: 1.6,
    roughness: 0.22,
  },
  { id: 'carpet', label: 'Carpet', swatch: '#A59A8C', texture: 'carpet', tileM: 0.8, roughness: 1 },
];

/** Wall finishes: paints (a plain colour) first, then textured surfaces. */
export const WALLS = [
  {
    id: 'warm-white',
    label: 'Warm white',
    swatch: '#F4EFE6',
    texture: null,
    tileM: 1,
    roughness: 0.9,
    paint: true,
  },
  {
    id: 'cream',
    label: 'Cream',
    swatch: '#EEDFC0',
    texture: null,
    tileM: 1,
    roughness: 0.9,
    paint: true,
  },
  {
    id: 'sage',
    label: 'Sage',
    swatch: '#A9B79F',
    texture: null,
    tileM: 1,
    roughness: 0.9,
    paint: true,
  },
  {
    id: 'blue-gray',
    label: 'Blue-gray',
    swatch: '#9DB0BD',
    texture: null,
    tileM: 1,
    roughness: 0.9,
    paint: true,
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    swatch: '#C9805F',
    texture: null,
    tileM: 1,
    roughness: 0.9,
    paint: true,
  },
  { id: 'brick', label: 'Brick', swatch: '#A4553F', texture: 'brick', tileM: 1, roughness: 0.92 },
  {
    id: 'plaster',
    label: 'Plaster',
    swatch: '#E4DDD0',
    texture: 'plaster',
    tileM: 1.5,
    roughness: 0.95,
  },
  {
    id: 'panel',
    label: 'Wood panel',
    swatch: '#A57B52',
    texture: 'panel',
    tileM: 1,
    roughness: 0.6,
  },
];

/** What a room without a chosen finish looks like (kept exactly as before finishes existed). */
export const CLASSIC_FLOOR = { label: 'Classic', color: '#E5DDCF' };
export const CLASSIC_WALL = { label: 'Classic', color: '#F2EDE4' };

const byId = (list, id) => list.find((f) => f.id === id) || null;

export const getFloor = (id) => byId(FLOORS, id);
export const getWall = (id) => byId(WALLS, id);

/** A finish value from storage or a link, reduced to `{ floor, wall }` with unknown or missing ids as null. */
export function normalizeFinish(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    floor: getFloor(src.floor) ? src.floor : null,
    wall: getWall(src.wall) ? src.wall : null,
  };
}

/** True when the room still has the classic look (no floor and no wall chosen). */
export const isClassicFinish = (raw) => {
  const f = normalizeFinish(raw);
  return !f.floor && !f.wall;
};

/** Applies a change ({ floor } and/or { wall }) to a finish. A null or unknown id goes back to classic. */
export function withFinish(raw, patch) {
  const next = { ...normalizeFinish(raw) };
  if (patch && 'floor' in patch) next.floor = getFloor(patch.floor) ? patch.floor : null;
  if (patch && 'wall' in patch) next.wall = getWall(patch.wall) ? patch.wall : null;
  return next;
}

/** The finish to keep on a room record: nothing at all when it is classic, so old rooms stay unchanged. */
export function finishForStorage(raw) {
  const f = normalizeFinish(raw);
  if (!f.floor && !f.wall) return undefined;
  return { ...(f.floor ? { floor: f.floor } : {}), ...(f.wall ? { wall: f.wall } : {}) };
}

/** The room with a finish change applied; a room that goes back to classic loses the field entirely. */
export function applyFinish(room, patch) {
  const { finish: current, ...rest } = room;
  const finish = finishForStorage(withFinish(current, patch));
  return finish ? { ...rest, finish } : rest;
}
