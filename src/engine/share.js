/**
 * share.js
 * Share a design as a compressed link (data lives in the URL hash, nothing is uploaded)
 * and import/export designs as JSON files.
 */

import { cleanOverrides } from './overrides.js';
import { clamp } from './geometry.js';
import { sanitizeOutline } from './roomShape.js';
import { getFurnitureType, registerPlaceholderFurniture } from '../data/furnitureCatalog.js';

const HASH_KEY = 'share=';
const MAX_HASH_CHARS = 60000;

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Fields that make up a shareable design (images and meshes excluded to keep links short). */
function toShareableRoom(room) {
  const { id, name, widthCm, depthCm, doors, windows, placedFurniture, outline, openEdges } = room;
  // Photo-made pieces: only name, size and colour travel, so the receiver sees a box of the right size
  const customTypes = [];
  const seen = new Set();
  for (const f of placedFurniture || []) {
    const id = f.furnitureTypeId;
    if (typeof id !== 'string' || !id.startsWith('custom-') || seen.has(id)) continue;
    seen.add(id);
    const def = getFurnitureType(id);
    if (def)
      customTypes.push({
        id,
        name: def.name,
        widthCm: def.widthCm,
        depthCm: def.depthCm,
        heightCm: def.heightCm,
        color: def.color,
      });
  }
  return {
    v: 1,
    id,
    name,
    widthCm,
    depthCm,
    doors,
    windows,
    placedFurniture,
    ...(outline ? { outline, ...(openEdges?.length ? { openEdges } : {}) } : {}),
    ...(customTypes.length ? { customTypes } : {}),
  };
}

export async function encodeRoomToHash(room) {
  const json = JSON.stringify(toShareableRoom(room));
  const bytes = new TextEncoder().encode(json);
  const packed = await pipe(bytes, new CompressionStream('deflate'));
  const hash = HASH_KEY + toBase64Url(packed);
  if (hash.length > MAX_HASH_CHARS)
    throw new Error('Design is too large for a link. Export JSON instead.');
  return hash;
}

export async function decodeRoomFromHash(hash) {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw.startsWith(HASH_KEY)) return null;
  const packed = fromBase64Url(raw.slice(HASH_KEY.length));
  const bytes = await pipe(packed, new DecompressionStream('deflate'));
  return sanitizeImportedRoom(JSON.parse(new TextDecoder().decode(bytes)));
}

/** Validates and normalizes imported room data (from a link or a JSON file). */
export function sanitizeImportedRoom(data) {
  if (!data || typeof data !== 'object') throw new Error('Not a valid room file.');
  const num = (v, min, max, fallback) => (Number.isFinite(v) ? clamp(v, min, max) : fallback);
  const stamp = Date.now();
  const isObject = (v) => v && typeof v === 'object';
  const openings = (list, fallbackWall) =>
    (Array.isArray(list) ? list : [])
      .filter(isObject)
      .slice(0, 40)
      .map((o, i) => ({
        id: String(o.id || `${fallbackWall}-${i}-${stamp}`),
        wall: ['top', 'bottom', 'left', 'right'].includes(o.wall) ? o.wall : fallbackWall,
        ...(Number.isInteger(o.edge) && o.edge >= 0 && o.edge < 200 ? { edge: o.edge } : {}),
        offsetCm: num(o.offsetCm, 0, 2000, 20),
        widthCm: num(o.widthCm, 40, 400, 90),
        ...(o.swingDirection ? { swingDirection: String(o.swingDirection) } : {}),
      }));
  const furniture = (Array.isArray(data.placedFurniture) ? data.placedFurniture : [])
    .filter((f) => isObject(f) && typeof f.furnitureTypeId === 'string')
    .slice(0, 500)
    .map((f, i) => ({
      id: String(f.id || `item-import-${i}-${stamp}`),
      furnitureTypeId: f.furnitureTypeId,
      x: num(f.x, 0, 2000, 100),
      y: num(f.y, 0, 2000, 100),
      rotationDeg: num(f.rotationDeg, 0, 360, 0),
      elevationCm: num(f.elevationCm, 0, 400, 0),
      ...(cleanOverrides(f.overrides, getFurnitureType(f.furnitureTypeId))
        ? { overrides: cleanOverrides(f.overrides, getFurnitureType(f.furnitureTypeId)) }
        : {}),
    }))
    .map((f, i, all) =>
      all.findIndex((g) => g.id === f.id) === i ? f : { ...f, id: `${f.id}-dup${i}` }
    );
  (Array.isArray(data.customTypes) ? data.customTypes : [])
    .filter(isObject)
    .slice(0, 100)
    .forEach((t) => registerPlaceholderFurniture(t));
  const widthCm = num(data.widthCm, 200, 1500, 400);
  const depthCm = num(data.depthCm, 200, 1500, 400);
  // A room that is not a rectangle keeps its outline, pulled inside the room's box
  const cleaned = sanitizeOutline(data.outline);
  const outline = cleaned
    ? cleaned.map(([x, y]) => [Math.min(x, widthCm), Math.min(y, depthCm)])
    : null;
  const openEdges = outline
    ? (Array.isArray(data.openEdges) ? data.openEdges : []).filter(
        (e) => Number.isInteger(e) && e >= 0 && e < outline.length
      )
    : [];
  const fitOpenings = (list, fallbackWall) =>
    openings(list, fallbackWall).map((o) => {
      if (!outline) {
        const { edge: _edge, ...rest } = o;
        return rest;
      }
      const { wall: _wall, ...rest } = o;
      return { ...rest, edge: (o.edge ?? 0) % outline.length };
    });
  return {
    id: `room-${stamp}`,
    name: String(data.name || 'Imported Room').slice(0, 80),
    widthCm,
    depthCm,
    ...(outline ? { outline, ...(openEdges.length ? { openEdges } : {}) } : {}),
    doors: fitOpenings(data.doors, 'bottom'),
    windows: fitOpenings(data.windows, 'top'),
    placedFurniture: furniture,
    updatedAt: new Date().toISOString(),
  };
}

export function roomToJson(room) {
  return JSON.stringify({ app: 'room-designer-studio', ...toShareableRoom(room) }, null, 2);
}
