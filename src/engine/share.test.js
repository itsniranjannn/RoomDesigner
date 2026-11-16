import { describe, it, expect, afterEach } from 'vitest';
import {
  registerCustomFurniture,
  unregisterCustomFurniture,
  getFurnitureType,
  resolveItemDef,
  listCustomFurniture,
} from '../data/furnitureCatalog.js';
import {
  encodeRoomToHash,
  decodeRoomFromHash,
  sanitizeImportedRoom,
  roomToJson,
  roomSideCm,
  STORED_ROOM_SIDE_CM,
} from './share.js';

const piece = { id: 'item-1', furnitureTypeId: 'custom-abc', x: 100, y: 100, rotationDeg: 0 };
const room = {
  id: 'r1',
  name: 'Den',
  widthCm: 400,
  depthCm: 300,
  doors: [],
  windows: [],
  placedFurniture: [piece],
};

afterEach(() => unregisterCustomFurniture('custom-abc'));

describe('sharing photo-made furniture', () => {
  it('sends name and size but never the photos or model', async () => {
    registerCustomFurniture({
      id: 'custom-abc',
      name: 'Grandma chair',
      widthCm: 60,
      depthCm: 70,
      heightCm: 90,
      color: '#884422',
      mesh: { positions: [0, 0, 0], colors: [1, 2, 3] },
      planImage: 'data:image/png;base64,SECRETPHOTO',
      topImage: 'data:image/png;base64,SECRETTOP',
    });
    const json = roomToJson(room);
    expect(json).toContain('Grandma chair');
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain('positions');
    expect((await encodeRoomToHash(room)).length).toBeLessThan(800);
  });

  it('shows the receiver a right-sized box instead of dropping the piece', async () => {
    registerCustomFurniture({
      id: 'custom-abc',
      name: 'Grandma chair',
      widthCm: 60,
      depthCm: 70,
      heightCm: 90,
      color: '#884422',
    });
    const hash = await encodeRoomToHash(room);
    unregisterCustomFurniture('custom-abc');
    const got = await decodeRoomFromHash(hash);
    expect(got.placedFurniture).toHaveLength(1);
    const def = resolveItemDef(got.placedFurniture[0]);
    expect(def.name).toBe('Grandma chair');
    expect([def.widthCm, def.depthCm, def.heightCm]).toEqual([60, 70, 90]);
    expect(def.mesh).toBeUndefined();
    expect(def.placeholder).toBe(true);
    expect(listCustomFurniture().some((d) => d.id === 'custom-abc')).toBe(false);
  });

  it('falls back to a generic box for unknown photo pieces and ignores bad metadata', () => {
    const got = sanitizeImportedRoom({
      ...room,
      customTypes: [{ id: 'custom-abc', name: 5, widthCm: 'x', color: 'red' }, null, 7],
    });
    expect(got.placedFurniture).toHaveLength(1);
    const def = getFurnitureType('custom-abc');
    expect(def.widthCm).toBe(80);
    expect(def.color).toBe('#a8a29a');
    expect(getFurnitureType('nope')).toBeNull();
  });
});

describe('a room side with a damaged measurement', () => {
  it('repairs what is missing, and holds an imported design to the designer limits', () => {
    for (const bad of [undefined, null, NaN, Infinity, 'wide']) {
      expect(roomSideCm(bad)).toBe(400);
      expect(roomSideCm(bad, STORED_ROOM_SIDE_CM)).toBe(400);
    }
    // An imported design is kept inside what the room designer can build
    expect(roomSideCm(80)).toBe(200);
    expect(roomSideCm(90000)).toBe(1500);
    const imported = sanitizeImportedRoom({ ...room, widthCm: undefined, depthCm: null });
    expect(imported.widthCm).toBe(400);
    expect(imported.depthCm).toBe(400);
  });

  it('leaves a stored room its own size, even a flat passage narrower than that limit', () => {
    // Rooms detected from a flat's walls are not held to the room designer's own range
    expect(roomSideCm(80, STORED_ROOM_SIDE_CM)).toBe(80);
    expect(roomSideCm(2400, STORED_ROOM_SIDE_CM)).toBe(2400);
  });
});
