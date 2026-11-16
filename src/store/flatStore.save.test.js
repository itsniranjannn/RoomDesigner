import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for IndexedDB. `failWrites` makes every write throw, as a full device does.
const flats = new Map();
const rooms = new Map();
let failWrites = false;

const write = (store, record) => {
  if (failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
  const stored = { ...record, updatedAt: new Date().toISOString() };
  store.set(record.id, stored);
  return stored;
};

vi.mock('../data/persistence.js', () => ({
  saveFlatToDB: async (flat) => write(flats, flat),
  listFlatsFromDB: async () => [...flats.values()],
  loadFlatFromDB: async (id) => flats.get(id) || null,
  deleteFlatFromDB: async (id) => {
    flats.delete(id);
  },
  saveRoomToDB: async (room) => write(rooms, room),
  listRoomsFromDB: async () => [...rooms.values()],
  deleteRoomFromDB: async (id) => {
    rooms.delete(id);
  },
  getInitialRoom: async () => null,
  loadRoomFromDB: async (id) => rooms.get(id) || null,
  renameRoomInDB: async () => null,
  saveCustomFurnitureToDB: async () => {},
  listCustomFurnitureFromDB: async () => [],
  deleteCustomFurnitureFromDB: async () => {},
  setActiveRoomId: () => {},
  clearActiveRoomId: () => {},
  saveRoomIfUnchanged: async (room) => ({ room: write(rooms, room) }),
}));

const { useFlatStore } = await import('./flatStore.js');
const st = () => useFlatStore.getState();
const settle = () => new Promise((r) => setTimeout(r, 400));

describe('the flat designer says whether the plan was really saved', () => {
  beforeEach(async () => {
    failWrites = false;
    flats.clear();
    rooms.clear();
    await st().createNewFlat('Save status flat');
    await settle();
  });

  it('shows Saved once the write is through', async () => {
    expect(st().saveStatus).toBe('saved');
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    // The edit is not stored yet, so it must not claim to be
    expect(st().saveStatus).toBe('saving');
    await settle();
    expect(st().saveStatus).toBe('saved');
    expect([...flats.values()][0].spaces).toHaveLength(1);
  });

  it('does not say Saved when every write fails', async () => {
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    await settle();
    expect(st().saveStatus).toBe('saved');

    failWrites = true;
    st().addWall(200, 0, 200, 300);
    await settle();
    expect(st().saveStatus).toBe('error');

    // and it recovers once the device can store again
    failWrites = false;
    st().addWall(0, 150, 200, 150);
    await settle();
    expect(st().saveStatus).toBe('saved');
  });
});
