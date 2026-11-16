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
  APP_MARKER,
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

describe('opening a file that is not a design', () => {
  // Any JSON at all used to open as an empty room called "Imported Room"
  it('is refused, whatever JSON it holds', () => {
    const others = [
      { hello: 'world' },
      { app: 'some-other-app', name: 'Not ours', rooms: 3 },
      { name: 'A name is not a design' },
      [],
      [1, 2, 3],
      'a string',
      42,
      null,
    ];
    for (const other of others)
      expect(() => sanitizeImportedRoom(other), JSON.stringify(other)).toThrow(
        /not a Room Designer design/
      );
  });

  it('still opens a file this app wrote and a design from a share link', () => {
    const written = JSON.parse(roomToJson(room));
    expect(written.app).toBe(APP_MARKER);
    expect(sanitizeImportedRoom(written).name).toBe('Den');
    // A design packed into a share link carries no marker, but always carries its size
    const { app: _marker, ...fromLink } = written;
    expect(sanitizeImportedRoom(fromLink).widthCm).toBe(400);
    // and the marker alone is enough for a file that lost the rest
    expect(sanitizeImportedRoom({ app: APP_MARKER }).widthCm).toBe(400);
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
