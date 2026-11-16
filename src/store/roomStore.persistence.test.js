import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for IndexedDB, recording the order of writes
const db = new Map();
const log = [];
let activeId = null;

const stamped = (room) => ({ ...room, updatedAt: new Date().toISOString() });

vi.mock('../data/persistence.js', () => ({
  getInitialRoom: async () => null,
  saveRoomToDB: async (room) => {
    log.push(`save:${room.id}:${room.name}`);
    const saved = stamped(room);
    db.set(room.id, saved);
    activeId = room.id;
    return saved;
  },
  // Mirrors the real conditional write: a stored record written after the one the editor holds
  // belongs to another tab and is left alone.
  saveRoomIfUnchanged: async (room, baseUpdatedAt) => {
    const stored = db.get(room.id);
    const theirs = Date.parse(stored?.updatedAt);
    const ours = Date.parse(baseUpdatedAt);
    if (Number.isFinite(theirs) && Number.isFinite(ours) && theirs > ours) {
      log.push(`refused:${room.id}`);
      return { conflict: stored };
    }
    log.push(`save:${room.id}:${room.name}`);
    const saved = stamped(room);
    db.set(room.id, saved);
    activeId = room.id;
    return { room: saved };
  },
  listRoomsFromDB: async () => [...db.values()],
  loadRoomFromDB: async (id) => db.get(id) || null,
  deleteRoomFromDB: async (id) => {
    db.delete(id);
  },
  renameRoomInDB: async (id, name) => {
    log.push(`rename:${id}:${name}`);
    const renamed = stamped({ ...db.get(id), name });
    db.set(id, renamed);
    return renamed;
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

  it('does not write over a room another tab has saved, and offers the stored version', async () => {
    await state().createRoom('Shared', 400, 400);
    const id = state().room.id;
    state().addFurniture('sofa-3seat', 100, 100);
    await new Promise((r) => setTimeout(r, 450));
    expect(state().saveStatus).toBe('saved');

    // Another tab saves an armchair into the same room, a second later
    const fromOtherTab = {
      ...db.get(id),
      placedFurniture: [
        ...db.get(id).placedFurniture,
        { id: 'item-other-tab', furnitureTypeId: 'armchair', x: 300, y: 300 },
      ],
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };
    db.set(id, fromOtherTab);

    // This tab, still showing the sofa only, adds a coffee table and saves
    state().addFurniture('coffee-table', 200, 200);
    await new Promise((r) => setTimeout(r, 450));

    expect(log).toContain(`refused:${id}`);
    expect(state().saveStatus).toBe('stale');
    // The other tab's armchair is still stored, and nothing was overwritten
    expect(db.get(id).placedFurniture.map((f) => f.furnitureTypeId)).toEqual([
      'sofa-3seat',
      'armchair',
    ]);

    // Opening the saved version brings the other tab's work into this one
    await state().reopenRoom();
    expect(state().room.placedFurniture.map((f) => f.furnitureTypeId)).toEqual([
      'sofa-3seat',
      'armchair',
    ]);
    expect(state().saveStatus).toBe('saved');

    // and editing works again from there
    state().addFurniture('coffee-table', 200, 200);
    await new Promise((r) => setTimeout(r, 450));
    expect(state().saveStatus).toBe('saved');
    expect(db.get(id).placedFurniture).toHaveLength(3);
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
