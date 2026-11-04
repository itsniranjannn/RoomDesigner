import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for IndexedDB, recording the order of writes
const db = new Map();
const log = [];
let activeId = null;

vi.mock('../data/persistence.js', () => ({
  getInitialRoom: async () => null,
  saveRoomToDB: async (room) => {
    log.push(`save:${room.id}:${room.name}`);
    db.set(room.id, room);
    activeId = room.id;
    return room;
  },
  listRoomsFromDB: async () => [...db.values()],
  loadRoomFromDB: async (id) => db.get(id) || null,
  deleteRoomFromDB: async (id) => {
    db.delete(id);
  },
  renameRoomInDB: async (id, name) => {
    log.push(`rename:${id}:${name}`);
    db.set(id, { ...db.get(id), name });
  },
  saveCustomFurnitureToDB: async () => {},
  listCustomFurnitureFromDB: async () => [],
  deleteCustomFurnitureFromDB: async () => {},
  setActiveRoomId: (id) => {
    activeId = id;
  },
  clearActiveRoomId: () => {
    activeId = null;
  },
}));

const { useRoomStore } = await import('./roomStore.js');
const state = () => useRoomStore.getState();

describe('roomStore persistence ordering', () => {
  beforeEach(() => {
    db.clear();
    log.length = 0;
    activeId = null;
  });

  it('writes a pending edit before switching rooms and remembers the new room', async () => {
    await state().createRoom('A', 400, 400);
    const a = state().room.id;
    await state().createRoom('B', 400, 400);
    const b = state().room.id;
    await state().switchRoom(a);
    state().addFurniture('bed-queen', 200, 200);
    await state().switchRoom(b);
    expect(db.get(a).placedFurniture).toHaveLength(1);
    expect(activeId).toBe(b);
    expect(state().room.id).toBe(b);
  });

  it('does not let a stale pending save undo a rename', async () => {
    await state().createRoom('Before', 400, 400);
    const id = state().room.id;
    state().addFurniture('bed-queen', 200, 200);
    await state().renameRoom(id, 'After');
    await new Promise((r) => setTimeout(r, 450));
    expect(db.get(id).name).toBe('After');
    expect(log.indexOf(`save:${id}:Before`)).toBeLessThan(log.indexOf(`rename:${id}:After`));
  });

  it('does not reopen a closed room on the next visit', async () => {
    await state().createRoom('A', 400, 400);
    state().addFurniture('bed-queen', 200, 200);
    state().closeRoom();
    await new Promise((r) => setTimeout(r, 450));
    expect(activeId).toBeNull();
    expect(state().room).toBeNull();
  });
});
