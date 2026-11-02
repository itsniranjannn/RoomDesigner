/**
 * flatStore.js
 * State for the flat designer: a multi-room plan whose spaces (rooms, bathrooms,
 * corridors) are regular rooms edited in the room designer, plus staircases.
 */

import { create } from 'zustand';
import {
  saveFlatToDB,
  listFlatsFromDB,
  loadFlatFromDB,
  deleteFlatFromDB,
  saveRoomToDB,
  listRoomsFromDB,
  deleteRoomFromDB,
} from '../data/persistence.js';
import {
  createFlat,
  createSpace,
  createStair,
  buildStarterRoom,
  buildTemplateFlat,
  moveDoorToWall,
  fitRoomToSize,
  clampSpaceSize,
  canPlace,
  snapRect,
  levelObstacles,
  addLevel,
  removeLevel,
  stairFootprint,
  SPACE_KINDS,
} from '../engine/flat.js';
import { useRoomStore } from './roomStore.js';

let saveTimer = null;

function persistFlat(flat) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveFlatToDB(flat).catch((err) => {
      if (import.meta.env?.DEV) console.error('Failed to save flat:', err);
    });
  }, 300);
}

async function loadFlatRooms(flatId) {
  const rooms = await listRoomsFromDB();
  const map = {};
  for (const r of rooms) if (r.flatId === flatId) map[r.id] = r;
  return map;
}

export const useFlatStore = create((set, get) => ({
  flats: [],
  flat: null,
  rooms: {}, // roomId -> room record for the active flat
  mode: 'none', // 'none' | 'flat' | 'room' (editing one space in the room designer)
  levelId: null,
  selected: null, // { type: 'space' | 'stair', id }
  viewMode: '2d', // '2d' | '3d'

  loadFlats: async () => {
    set({ flats: await listFlatsFromDB() });
  },

  _commit: (flat, extra = {}) => {
    set({ flat, ...extra });
    persistFlat(flat);
  },

  createNewFlat: async (name, template = 'empty') => {
    let flat;
    let rooms = [];
    if (template === '2bhk') {
      ({ flat, rooms } = buildTemplateFlat(name || 'Two-bedroom flat'));
    } else {
      flat = createFlat(name || 'My Flat');
    }
    flat = { ...flat, name: name || flat.name };
    for (const r of rooms) await saveRoomToDB(r);
    await saveFlatToDB(flat);
    const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
    set({
      flat,
      rooms: roomMap,
      mode: 'flat',
      levelId: flat.levels[0].id,
      selected: null,
      viewMode: '2d',
      flats: await listFlatsFromDB(),
    });
    return flat;
  },

  openFlat: async (id) => {
    const flat = await loadFlatFromDB(id);
    if (!flat) return;
    set({
      flat,
      rooms: await loadFlatRooms(id),
      mode: 'flat',
      levelId: flat.levels[0].id,
      selected: null,
      viewMode: '2d',
    });
  },

  closeFlat: async () => {
    set({ mode: 'none', flat: null, rooms: {}, selected: null });
    set({ flats: await listFlatsFromDB() });
  },

  deleteFlat: async (id) => {
    const rooms = await loadFlatRooms(id);
    for (const roomId of Object.keys(rooms)) await deleteRoomFromDB(roomId);
    await deleteFlatFromDB(id);
    if (get().flat?.id === id) set({ mode: 'none', flat: null, rooms: {}, selected: null });
    set({ flats: await listFlatsFromDB() });
  },

  renameFlat: (name) => {
    const { flat } = get();
    const trimmed = (name || '').trim();
    if (!flat || !trimmed) return;
    get()._commit({ ...flat, name: trimmed.slice(0, 80) });
  },

  select: (selected) => set({ selected }),
  setViewMode: (viewMode) => set({ viewMode }),

  // ---------- levels ----------
  setLevel: (levelId) => set({ levelId, selected: null }),

  addLevel: () => {
    const { flat } = get();
    if (!flat || flat.levels.length >= 6) return;
    const next = addLevel(flat);
    get()._commit(next, { levelId: next.levels[next.levels.length - 1].id, selected: null });
  },

  renameLevel: (levelId, name) => {
    const { flat } = get();
    const trimmed = (name || '').trim();
    if (!flat || !trimmed) return;
    get()._commit({
      ...flat,
      levels: flat.levels.map((l) => (l.id === levelId ? { ...l, name: trimmed.slice(0, 40) } : l)),
    });
  },

  removeLevel: async (levelId) => {
    const { flat, rooms } = get();
    if (!flat || flat.levels.length <= 1) return;
    const doomed = flat.spaces.filter((s) => s.levelId === levelId);
    for (const s of doomed) await deleteRoomFromDB(s.roomId);
    const next = removeLevel(flat, levelId);
    const remaining = { ...rooms };
    for (const s of doomed) delete remaining[s.roomId];
    get()._commit(next, { levelId: next.levels[0].id, selected: null, rooms: remaining });
  },

  // ---------- spaces ----------
  addSpace: async (kind) => {
    const { flat, levelId } = get();
    if (!flat || !levelId) return null;
    const def = SPACE_KINDS[kind] || SPACE_KINDS.room;
    const draft = createSpace(flat, { kind, levelId, roomId: 'pending' });
    const room = buildStarterRoom({
      kind: draft.kind,
      name: draft.name,
      widthCm: draft.widthCm,
      depthCm: draft.depthCm,
      flatId: flat.id,
      spaceId: draft.id,
    });
    const space = { ...draft, roomId: room.id, name: def.label };
    room.name = space.name;
    await saveRoomToDB(room);
    get()._commit(
      { ...flat, spaces: [...flat.spaces, space] },
      { rooms: { ...get().rooms, [room.id]: room }, selected: { type: 'space', id: space.id } }
    );
    return space;
  },

  moveSpace: (id, x, y) => {
    const { flat } = get();
    const space = flat?.spaces.find((s) => s.id === id);
    if (!space) return false;
    const snapped = snapRect(
      { x, y, widthCm: space.widthCm, depthCm: space.depthCm },
      levelObstacles(flat, space.levelId, { spaceId: id })
    );
    const rect = { ...snapped, widthCm: space.widthCm, depthCm: space.depthCm };
    if (!canPlace(flat, space.levelId, rect, { spaceId: id })) return false;
    get()._commit({ ...flat, spaces: flat.spaces.map((s) => (s.id === id ? { ...s, x: snapped.x, y: snapped.y } : s)) });
    return true;
  },

  resizeSpace: async (id, widthCm, depthCm) => {
    const { flat, rooms } = get();
    const space = flat?.spaces.find((s) => s.id === id);
    if (!space) return false;
    const w = clampSpaceSize(widthCm);
    const d = clampSpaceSize(depthCm);
    if (!canPlace(flat, space.levelId, { x: space.x, y: space.y, widthCm: w, depthCm: d }, { spaceId: id })) return false;
    const room = rooms[space.roomId];
    const nextRoom = room ? fitRoomToSize(room, w, d) : null;
    if (nextRoom) await saveRoomToDB(nextRoom);
    get()._commit(
      { ...flat, spaces: flat.spaces.map((s) => (s.id === id ? { ...s, widthCm: w, depthCm: d } : s)) },
      nextRoom ? { rooms: { ...rooms, [nextRoom.id]: nextRoom } } : {}
    );
    return true;
  },

  renameSpace: async (id, name) => {
    const { flat, rooms } = get();
    const space = flat?.spaces.find((s) => s.id === id);
    const trimmed = (name || '').trim().slice(0, 60);
    if (!space || !trimmed) return;
    const room = rooms[space.roomId];
    let nextRooms = rooms;
    if (room) {
      const renamed = { ...room, name: trimmed };
      await saveRoomToDB(renamed);
      nextRooms = { ...rooms, [room.id]: renamed };
    }
    get()._commit({ ...flat, spaces: flat.spaces.map((s) => (s.id === id ? { ...s, name: trimmed } : s)) }, { rooms: nextRooms });
  },

  setSpaceDoorWall: async (id, wall) => {
    const { flat, rooms } = get();
    const space = flat?.spaces.find((s) => s.id === id);
    const room = space && rooms[space.roomId];
    if (!room || !['top', 'bottom', 'left', 'right'].includes(wall) || space.kind === 'corridor') return;
    const moved = moveDoorToWall(room, wall);
    await saveRoomToDB(moved);
    set({ rooms: { ...rooms, [moved.id]: moved } });
  },

  removeSpace: async (id) => {
    const { flat, rooms } = get();
    const space = flat?.spaces.find((s) => s.id === id);
    if (!space) return;
    await deleteRoomFromDB(space.roomId);
    const nextRooms = { ...rooms };
    delete nextRooms[space.roomId];
    get()._commit({ ...flat, spaces: flat.spaces.filter((s) => s.id !== id) }, { rooms: nextRooms, selected: null });
  },

  // ---------- stairs ----------
  addStair: (type = 'straight') => {
    const { flat, levelId } = get();
    if (!flat || !levelId) return null;
    const stair = createStair(flat, { levelId, type });
    get()._commit({ ...flat, stairs: [...flat.stairs, stair] }, { selected: { type: 'stair', id: stair.id } });
    return stair;
  },

  updateStair: (id, patch) => {
    const { flat } = get();
    const stair = flat?.stairs.find((s) => s.id === id);
    if (!stair) return false;
    const next = { ...stair };
    if (patch.type) next.type = ['straight', 'L', 'U'].includes(patch.type) ? patch.type : next.type;
    if (patch.widthCm !== undefined) next.widthCm = Math.max(70, Math.min(200, Math.round(patch.widthCm)));
    if (patch.rotationDeg !== undefined) next.rotationDeg = ((Math.round(patch.rotationDeg / 90) * 90) % 360 + 360) % 360;
    if (patch.riseCm !== undefined) next.riseCm = Math.max(200, Math.min(450, Math.round(patch.riseCm)));
    if (patch.x !== undefined || patch.y !== undefined) {
      const fp = stairFootprint(next);
      const snapped = snapRect(
        { x: patch.x ?? next.x, y: patch.y ?? next.y, widthCm: fp.widthCm, depthCm: fp.depthCm },
        levelObstacles(flat, stair.levelId, { stairId: id })
      );
      next.x = snapped.x;
      next.y = snapped.y;
    }
    const fp = stairFootprint(next);
    if (!canPlace(flat, stair.levelId, { x: next.x, y: next.y, widthCm: fp.widthCm, depthCm: fp.depthCm }, { stairId: id })) return false;
    get()._commit({ ...flat, stairs: flat.stairs.map((s) => (s.id === id ? next : s)) });
    return true;
  },

  removeStair: (id) => {
    const { flat } = get();
    if (!flat) return;
    get()._commit({ ...flat, stairs: flat.stairs.filter((s) => s.id !== id) }, { selected: null });
  },

  // ---------- jump into a space with the room designer ----------
  openSpace: async (spaceId) => {
    const { flat } = get();
    const space = flat?.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    await useRoomStore.getState().switchRoom(space.roomId);
    if (useRoomStore.getState().room?.id !== space.roomId) return;
    useRoomStore.getState().setViewMode('2d');
    set({ mode: 'room', selected: { type: 'space', id: spaceId } });
  },

  backToFlat: async () => {
    const { flat } = get();
    if (!flat) return;
    // The room designer saves with a delay; flush by waiting for it to settle
    await new Promise((resolve) => setTimeout(resolve, 450));
    useRoomStore.getState().closeRoom();
    set({ rooms: await loadFlatRooms(flat.id), mode: 'flat' });
  },
}));
