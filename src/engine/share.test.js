import { describe, it, expect, afterEach } from 'vitest';
import {
  registerCustomFurniture,
  unregisterCustomFurniture,
  getFurnitureType,
  resolveItemDef,
  listCustomFurniture,
} from '../data/furnitureCatalog.js';
import { encodeRoomToHash, decodeRoomFromHash, sanitizeImportedRoom, roomToJson } from './share.js';

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
