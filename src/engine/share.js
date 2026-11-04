/**
 * share.js
 * Share a design as a compressed link (data lives in the URL hash, nothing is uploaded)
 * and import/export designs as JSON files.
 */

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
  const { id, name, widthCm, depthCm, doors, windows, placedFurniture } = room;
  return { v: 1, id, name, widthCm, depthCm, doors, windows, placedFurniture };
}

export async function encodeRoomToHash(room) {
  const json = JSON.stringify(toShareableRoom(room));
  const bytes = new TextEncoder().encode(json);
  const packed = await pipe(bytes, new CompressionStream('deflate'));
  const hash = HASH_KEY + toBase64Url(packed);
  if (hash.length > MAX_HASH_CHARS) throw new Error('Design is too large for a link. Export JSON instead.');
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
  const num = (v, min, max, fallback) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback);
  const openings = (list, fallbackWall) =>
    (Array.isArray(list) ? list : []).slice(0, 40).map((o, i) => ({
      id: String(o.id || `${fallbackWall}-${i}-${Date.now()}`),
      wall: ['top', 'bottom', 'left', 'right'].includes(o.wall) ? o.wall : fallbackWall,
      offsetCm: num(o.offsetCm, 0, 2000, 20),
      widthCm: num(o.widthCm, 40, 400, 90),
      ...(o.swingDirection ? { swingDirection: String(o.swingDirection) } : {}),
    }));
  const furniture = (Array.isArray(data.placedFurniture) ? data.placedFurniture : [])
    .slice(0, 500)
    .filter((f) => f && typeof f.furnitureTypeId === 'string')
    .map((f, i) => ({
      id: String(f.id || `item-import-${i}-${Date.now()}`),
      furnitureTypeId: f.furnitureTypeId,
      x: num(f.x, 0, 2000, 100),
      y: num(f.y, 0, 2000, 100),
      rotationDeg: num(f.rotationDeg, 0, 360, 0),
      elevationCm: num(f.elevationCm, 0, 400, 0),
      ...(f.overrides && typeof f.overrides === 'object' ? { overrides: f.overrides } : {}),
    }));
  return {
    id: `room-${Date.now()}`,
    name: String(data.name || 'Imported Room').slice(0, 80),
    widthCm: num(data.widthCm, 200, 1500, 400),
    depthCm: num(data.depthCm, 200, 1500, 400),
    doors: openings(data.doors, 'bottom'),
    windows: openings(data.windows, 'top'),
    placedFurniture: furniture,
    updatedAt: new Date().toISOString(),
  };
}

export function roomToJson(room) {
  return JSON.stringify({ app: 'room-designer-studio', ...toShareableRoom(room) }, null, 2);
}
