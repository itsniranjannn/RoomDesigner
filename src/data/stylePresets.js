/**
 * stylePresets.js
 * One-click room styles: modern, minimal, Nepali traditional, Scandinavian, industrial and warm boho. A
 * style sets the room's floor and wall finish and recolours the pieces that can be recoloured (never
 * colour-locked ones such as lamps, glass, appliances, mirrors and pictures) to one harmonious palette.
 *
 * Everything here is pure: a style turns a room into a new room. The room remembers what it looked like
 * before in `room.styleApplied = { id, original: { finish, items } }` so "Reset to original" can put every
 * piece and finish back exactly, however many styles were tried in between. A room that never had a style
 * has no such field, so older rooms and shared links are unchanged.
 */

import { getFurnitureType } from './furnitureCatalog.js';
import { applyFinish, getFloor, getWall } from '../components/preview3d/materials.js';
import { mix } from '../components/preview3d/patterns.js';
import { cleanOverrides } from '../engine/overrides.js';

/** Keys a style writes on a piece; anything else the person set (size) is left alone. */
const STYLE_KEYS = ['color', 'subColor', 'accentColor', 'pattern'];

export const STYLE_PRESETS = [
  {
    id: 'modern',
    label: 'Modern',
    note: 'Dark wood, blue-gray walls, slate and burnt orange',
    floor: 'walnut',
    wall: 'blue-gray',
    palette: {
      seating: '#3B4652',
      bed: '#8E98A3',
      wood: '#7A6048',
      accent: '#D2693C',
      curtain: '#C8CDD2',
      curtainPattern: 'plain',
      rug: { color: '#2F3A45', sub: '#C8CDD2', accent: '#D2693C', pattern: 'stripes' },
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    note: 'Pale tile, white walls and soft stone tones',
    floor: 'tile',
    wall: 'warm-white',
    palette: {
      seating: '#CFC8BC',
      bed: '#EAE5DB',
      wood: '#C9B392',
      accent: '#8E9A8B',
      curtain: '#F0ECE4',
      curtainPattern: 'plain',
      rug: { color: '#E6E0D4', sub: '#CFC8BC', accent: '#B9AE9C', pattern: 'plain' },
    },
  },
  {
    id: 'nepali',
    label: 'Nepali traditional',
    note: 'Sal wood, terracotta walls, maroon and marigold',
    floor: 'walnut',
    wall: 'terracotta',
    palette: {
      seating: '#7B1E2E',
      bed: '#8B2635',
      wood: '#5A3825',
      accent: '#D9A441',
      curtain: '#9C3F2A',
      curtainPattern: 'trellis',
      rug: { color: '#9B2D3A', sub: '#D9A441', accent: '#22353F', pattern: 'dhaka' },
    },
  },
  {
    id: 'scandinavian',
    label: 'Scandinavian',
    note: 'Light oak, white walls, dusty blue and linen',
    floor: 'oak',
    wall: 'warm-white',
    palette: {
      seating: '#8FA3B3',
      bed: '#E9E6DF',
      wood: '#D8BF98',
      accent: '#9DB0A0',
      curtain: '#E8E4DA',
      curtainPattern: 'stripes',
      rug: { color: '#EDE8DD', sub: '#8FA3B3', accent: '#2F3E4A', pattern: 'stripes' },
    },
  },
  {
    id: 'industrial',
    label: 'Industrial',
    note: 'Concrete floor, brick walls, leather and steel',
    floor: 'concrete',
    wall: 'brick',
    palette: {
      seating: '#4A3A30',
      bed: '#555B61',
      wood: '#3E342C',
      accent: '#B5651D',
      curtain: '#4A4F55',
      curtainPattern: 'plain',
      rug: { color: '#4A4F55', sub: '#B5651D', accent: '#1F2326', pattern: 'kilim' },
    },
  },
  {
    id: 'boho',
    label: 'Warm boho',
    note: 'Plank floor, cream walls, terracotta, sage and ochre',
    floor: 'plank',
    wall: 'cream',
    palette: {
      seating: '#B8683F',
      bed: '#E3D3B5',
      wood: '#9B7248',
      accent: '#6E8B6B',
      curtain: '#E3D3B5',
      curtainPattern: 'trellis',
      rug: { color: '#C8794A', sub: '#E3B960', accent: '#2E4A5C', pattern: 'kilim' },
    },
  },
];

export const getStyle = (id) => STYLE_PRESETS.find((s) => s.id === id) || null;

/** A style's colours in a row, for small swatches: floor, wall, seating, wood, accent, rug. */
export function styleSwatches(style) {
  if (!style) return [];
  return [
    getFloor(style.floor)?.swatch,
    getWall(style.wall)?.swatch,
    style.palette.seating,
    style.palette.wood,
    style.palette.accent,
    style.palette.rug.color,
  ].filter(Boolean);
}

// ---------- which colour a piece takes ----------

const SEATING = new Set([
  'sofa',
  'sofa-l',
  'armchair',
  'ottoman',
  'bean-bag',
  'bench',
  'chair',
  'desk-chair',
  'bar-stool',
  'nepali-gadda',
  'nepali-pirka',
]);
const BEDS = new Set(['bed', 'bed-bunk', 'crib']);
const RUGS = new Set(['rug', 'rug-runner', 'rug-round', 'nepali-dhaka-rug']);
const SOFT_ACCENTS = new Set(['cushion', 'folded']);
/** Small objects keep the colours they were designed with. */
const KEEP = new Set([
  'book-stack',
  'photo-frame',
  'table-lamp',
  'lamp',
  'lamp-tripod',
  'lamp-torchiere',
  'vase',
  'bowl',
  'basket',
  'custom-mesh',
  'planter',
  'plant',
]);

/** The palette role of a piece, or null when a style must not recolour it. */
export function roleOf(def) {
  if (!def || def.colorLocked || def.placeholder) return null;
  const shape = def.shapeType;
  if (KEEP.has(shape) || def.category === 'custom') return null;
  if (SEATING.has(shape)) return 'seating';
  if (BEDS.has(shape)) return 'bed';
  if (RUGS.has(shape)) return 'rug';
  if (shape === 'curtain') return 'curtain';
  if (SOFT_ACCENTS.has(shape)) return 'accent';
  return 'wood';
}

/** What a style writes on one catalog piece (overrides keys), or null when it leaves the piece alone. */
export function recolourFor(style, def) {
  const role = roleOf(def);
  if (!role || !style) return null;
  const p = style.palette;
  if (role === 'rug') {
    // A round rug only suits rings; every other rug takes the style's pattern
    const pattern = def.shapeType === 'rug-round' ? 'rings' : p.rug.pattern;
    return { color: p.rug.color, subColor: p.rug.sub, accentColor: p.rug.accent, pattern };
  }
  if (role === 'curtain')
    return {
      color: def.sheer ? mix(p.curtain, '#FFFFFF', 0.55) : p.curtain,
      pattern: p.curtainPattern,
    };
  return { color: p[role] };
}

const sameOverrides = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The room with a style applied: finish plus recoloured pieces, remembering the original look once.
 * `options.floor` / `options.wall` (default true) say which finishes the style sets.
 * Returns the same room when nothing would change.
 */
export function applyStyleToRoom(room, styleId, { floor = true, wall = true } = {}) {
  const style = getStyle(styleId);
  if (!room || !style) return room;
  const prior = room.styleApplied?.original;
  const original = {
    finish: prior ? prior.finish : (room.finish ?? null),
    items: { ...(prior?.items || {}) },
  };

  const items = (room.placedFurniture || []).map((item) => {
    const base = getFurnitureType(item.furnitureTypeId);
    const patch = recolourFor(style, base);
    if (!patch) return item;
    const kept = {};
    for (const [k, v] of Object.entries(item.overrides || {}))
      if (!STYLE_KEYS.includes(k)) kept[k] = v;
    const overrides = cleanOverrides({ ...kept, ...patch }, base);
    if (sameOverrides(overrides, item.overrides)) return item;
    if (!(item.id in original.items)) original.items[item.id] = item.overrides ?? null;
    const { overrides: _old, ...rest } = item;
    return overrides ? { ...rest, overrides } : rest;
  });

  const finishPatch = {};
  if (floor) finishPatch.floor = style.floor;
  if (wall) finishPatch.wall = style.wall;
  const finished = applyFinish({ ...room, placedFurniture: items }, finishPatch);
  // Already wearing this style and nothing would change: keep the very same room
  const unchanged =
    room.styleApplied?.id === style.id &&
    items.every((item, i) => item === room.placedFurniture[i]) &&
    JSON.stringify(finished.finish ?? null) === JSON.stringify(room.finish ?? null);
  if (unchanged) return room;
  return { ...finished, styleApplied: { id: style.id, original } };
}

/** The room as it was before any style: pieces and finish restored; pieces added since are left as they are. */
export function resetStyleOnRoom(room) {
  const applied = room?.styleApplied;
  if (!applied) return room;
  const { styleApplied: _gone, finish: _finish, ...rest } = room;
  const items = (room.placedFurniture || []).map((item) => {
    if (!(item.id in applied.original.items)) return item;
    const back = applied.original.items[item.id];
    const { overrides: _o, ...plain } = item;
    return back ? { ...plain, overrides: back } : plain;
  });
  const out = { ...rest, placedFurniture: items };
  return applied.original.finish ? { ...out, finish: applied.original.finish } : out;
}

/** The style a room currently wears (its id), or null. */
export const styleOfRoom = (room) =>
  getStyle(room?.styleApplied?.id) ? room.styleApplied.id : null;

/** Applies a style to some or all rooms of a flat (`rooms` is the flat's id-to-room map). Others stay as they are. */
export function applyStyleToRooms(rooms, styleId, roomIds = null, options) {
  const out = {};
  for (const [id, room] of Object.entries(rooms)) {
    out[id] = !roomIds || roomIds.includes(id) ? applyStyleToRoom(room, styleId, options) : room;
  }
  return out;
}

/** Resets some or all rooms of a flat to the look before any style. */
export function resetStyleOnRooms(rooms, roomIds = null) {
  const out = {};
  for (const [id, room] of Object.entries(rooms)) {
    out[id] = !roomIds || roomIds.includes(id) ? resetStyleOnRoom(room) : room;
  }
  return out;
}

/**
 * The most common floor or wall id (`key` is 'floor' or 'wall') chosen across some rooms, or null when
 * none has one. The flat 3D view draws one wall finish for the whole flat, so it uses the rooms' choice.
 */
export function dominantFinish(rooms, key) {
  const counts = new Map();
  for (const room of rooms) {
    const id = room?.finish?.[key];
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  let best = null;
  for (const [id, n] of counts) if (!best || n > best.n) best = { id, n };
  return best ? best.id : null;
}

/** The style id shared by all of these rooms, or null when they differ or have none. */
export function sharedStyle(rooms) {
  const ids = new Set(rooms.map((r) => styleOfRoom(r)));
  return ids.size === 1 ? [...ids][0] : null;
}
