import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for IndexedDB. `failWrites` makes every write throw, as a full device does.
const flats = new Map();
const rooms = new Map();
let failWrites = false;
let activeFlatId = null;

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
  setActiveFlatId: (id) => {
    activeFlatId = id;
  },
  clearActiveFlatId: () => {
    activeFlatId = null;
  },
  getActiveFlatId: () => activeFlatId,
}));

const { useFlatStore } = await import('./flatStore.js');
const st = () => useFlatStore.getState();
const settle = () => new Promise((r) => setTimeout(r, 400));

describe('the flat designer says whether the plan was really saved', () => {
  beforeEach(async () => {
    failWrites = false;
    activeFlatId = null;
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

describe('the flat that was open comes back on the next visit', () => {
  beforeEach(async () => {
    failWrites = false;
    activeFlatId = null;
    flats.clear();
    rooms.clear();
  });

  it('reopens the plan that was being drawn, and forgets it once it is closed', async () => {
    await st().createNewFlat('Half-drawn flat');
    st().applyPreset('shell', { widthCm: 500, depthCm: 400 });
    await settle();
    const id = st().flat.id;
    expect(activeFlatId).toBe(id);

    // As a reload leaves it: nothing in memory, only what was stored
    useFlatStore.setState({ flat: null, rooms: {}, mode: 'none', levelId: null });
    await st().restoreOpenFlat();
    expect(st().mode).toBe('flat');
    expect(st().flat.id).toBe(id);
    expect(st().flat.spaces).toHaveLength(1);
    expect(st().levelId).toBe(st().flat.levels[0].id);

    // Leaving for the studio is remembered too: the next visit starts there
    await st().closeFlat();
    expect(activeFlatId).toBeNull();
    await st().restoreOpenFlat();
    expect(st().mode).toBe('none');
    expect(st().flat).toBeNull();
  });

  it('forgets a flat that is no longer stored', async () => {
    activeFlatId = 'flat-that-went-away';
    await st().restoreOpenFlat();
    expect(st().flat).toBeNull();
    expect(activeFlatId).toBeNull();
  });
});
