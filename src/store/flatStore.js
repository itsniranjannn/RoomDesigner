/**
 * flatStore.js
 * State for the flat designer: walls and openings per floor, the rooms detected from
 * them (rectangular rooms are regular room records edited in the room designer),
 * staircases and undo / redo for every edit.
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
  createStair,
  addLevel,
  removeLevel,
  stairFootprint,
  snapToGrid,
  STAIR_LIMITS,
  uid,
} from '../engine/flat.js';
import {
  addWall,
  eraseWallRun,
  addOpening,
  removeOpening,
  updateOpening,
  setSpaceMeta,
  furnishSpace,
  migrateFlat,
  syncRoomToFlat,
  reconcile,
  levelEdges,
  openingsOf,
} from '../engine/flatPlan.js';
import { buildPresetFlat } from '../engine/flatPresets.js';
import {
  placePassage as placePassageIn,
  editPassage as editPassageIn,
} from '../engine/flatPassage.js';
import { wallRunAt } from '../engine/flatWalls.js';
import { useRoomStore } from './roomStore.js';

const HISTORY_LIMIT = 80;

let saveTimer = null;
let pendingFlat = null;
let writeQueue = Promise.resolve();

const logDev = (label, err) => {
  if (import.meta.env?.DEV) console.error(label, err);
};

function queueWrite(task) {
  writeQueue = writeQueue.then(task).catch((err) => logDev('Flat save failed:', err));
  return writeQueue;
}

function persistFlat(flat) {
  pendingFlat = flat;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushFlat, 300);
}

function flushFlat() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const flat = pendingFlat;
  pendingFlat = null;
  if (flat) queueWrite(() => saveFlatToDB(flat));
  return writeQueue;
}

/** Writes only the room records that differ between two room maps. */
function persistRoomDiff(before, after) {
  for (const [id, room] of Object.entries(after)) {
    if (before[id] !== room) queueWrite(() => saveRoomToDB(room));
  }
  for (const id of Object.keys(before)) {
    if (!after[id]) queueWrite(() => deleteRoomFromDB(id));
  }
}

async function loadFlatRooms(flatId) {
  const rooms = await listRoomsFromDB();
  const map = {};
  for (const r of rooms) if (r.flatId === flatId) map[r.id] = r;
  return map;
}

const emptySession = {
  flat: null,
  rooms: {},
  mode: 'none', // 'none' | 'flat' | 'room' (editing one room in the room designer)
  levelId: null,
  selected: null, // { type: 'space' | 'stair' | 'wall' | 'opening', id }
  viewMode: '2d', // '2d' | '3d'
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
};

export const useFlatStore = create((set, get) => ({
  flats: [],
  ...emptySession,

  loadFlats: async () => {
    set({ flats: await listFlatsFromDB() });
  },

  /**
   * Applies the result of an engine edit as one undo step.
   * @param {{flat, rooms}} result
   * @param {Object} extra - extra state to set alongside
   * @param {boolean} history - false for edits that should not be undoable
   */
  _apply: (result, extra = {}, history = true) => {
    const { flat, rooms, past } = get();
    const nextPast = history ? [...past, { flat, rooms }].slice(-HISTORY_LIMIT) : past;
    persistRoomDiff(rooms, result.rooms);
    persistFlat(result.flat);
    set({
      flat: result.flat,
      rooms: result.rooms,
      past: nextPast,
      future: history ? [] : get().future,
      canUndo: nextPast.length > 0,
      canRedo: history ? false : get().future.length > 0,
      ...extra,
    });
    return true;
  },

  _begin: async (flat, rooms) => {
    set({
      ...emptySession,
      flat,
      rooms,
      mode: 'flat',
      levelId: flat.levels[0].id,
    });
  },

  createNewFlat: async (name, preset = 'blank', options = {}) => {
    const { flat, rooms } = buildPresetFlat(preset, { name: name || undefined, ...options });
    const named = { ...flat, name: name || flat.name };
    await flushFlat();
    for (const room of Object.values(rooms)) await queueWrite(() => saveRoomToDB(room));
    await queueWrite(() => saveFlatToDB(named));
    await get()._begin(named, rooms);
    set({ flats: await listFlatsFromDB() });
    return named;
  },

  /** Fills an empty plan with a starting point (undoable). */
  applyPreset: (preset, options = {}) => {
    const { flat, rooms: oldRooms } = get();
    if (!flat) return false;
    const hasWalls = flat.levels.some((l) => (flat.walls?.[l.id] || []).length > 0);
    if (hasWalls) return false;
    const built = buildPresetFlat(preset, { name: flat.name, flatId: flat.id, ...options });
    // The preset's single floor lands on the flat's first floor
    const presetLevel = built.flat.levels[0].id;
    const levelId = flat.levels[0].id;
    const next = {
      ...flat,
      walls: { ...flat.walls, [levelId]: built.flat.walls[presetLevel] },
      openings: { ...flat.openings, [levelId]: built.flat.openings[presetLevel] },
      spaces: built.flat.spaces.map((s) => ({ ...s, levelId })),
      roomCounter: built.flat.roomCounter,
    };
    get()._apply(
      { flat: next, rooms: { ...oldRooms, ...built.rooms }, removedRoomIds: [] },
      { selected: null, levelId }
    );
    return true;
  },

  openFlat: async (id) => {
    const stored = await loadFlatFromDB(id);
    if (!stored) return;
    const loaded = await loadFlatRooms(id);
    const { flat, rooms, migrated, removedRoomIds } = migrateFlat(stored, loaded);
    if (migrated) {
      // Old rectangle flats are upgraded once and saved in the new format
      persistRoomDiff(loaded, rooms);
      for (const roomId of removedRoomIds) queueWrite(() => deleteRoomFromDB(roomId));
      persistFlat(flat);
    }
    await get()._begin(flat, rooms);
  },

  closeFlat: async () => {
    await flushFlat();
    set({ ...emptySession });
    set({ flats: await listFlatsFromDB() });
  },

  deleteFlat: async (id) => {
    await flushFlat();
    const rooms = await loadFlatRooms(id);
    for (const roomId of Object.keys(rooms)) await deleteRoomFromDB(roomId);
    await deleteFlatFromDB(id);
    if (get().flat?.id === id) set({ ...emptySession });
    set({ flats: await listFlatsFromDB() });
  },

  renameFlat: (name) => {
    const { flat } = get();
    const trimmed = (name || '').trim();
    if (!flat || !trimmed || trimmed === flat.name) return;
    get()._apply({ flat: { ...flat, name: trimmed.slice(0, 80) }, rooms: get().rooms }, {}, false);
  },

  select: (selected) => set({ selected }),
  setViewMode: (viewMode) => set({ viewMode }),

  // ---------- undo / redo ----------
  undo: () => {
    const { past, future, flat, rooms } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    persistRoomDiff(rooms, prev.rooms);
    persistFlat(prev.flat);
    const nextFuture = [{ flat, rooms }, ...future].slice(0, HISTORY_LIMIT);
    const levelId = prev.flat.levels.some((l) => l.id === get().levelId)
      ? get().levelId
      : prev.flat.levels[0].id;
    set({
      flat: prev.flat,
      rooms: prev.rooms,
      past: past.slice(0, -1),
      future: nextFuture,
      canUndo: past.length > 1,
      canRedo: true,
      levelId,
      selected: null,
    });
  },

  redo: () => {
    const { past, future, flat, rooms } = get();
    if (future.length === 0) return;
    const next = future[0];
    persistRoomDiff(rooms, next.rooms);
    persistFlat(next.flat);
    const nextPast = [...past, { flat, rooms }].slice(-HISTORY_LIMIT);
    const levelId = next.flat.levels.some((l) => l.id === get().levelId)
      ? get().levelId
      : next.flat.levels[0].id;
    set({
      flat: next.flat,
      rooms: next.rooms,
      past: nextPast,
      future: future.slice(1),
      canUndo: true,
      canRedo: future.length > 1,
      levelId,
      selected: null,
    });
  },

  // ---------- levels ----------
  setLevel: (levelId) => set({ levelId, selected: null }),

  addLevel: () => {
    const { flat, rooms } = get();
    if (!flat || flat.levels.length >= 6) return;
    const next = addLevel(flat);
    get()._apply(
      { flat: next, rooms },
      { levelId: next.levels[next.levels.length - 1].id, selected: null }
    );
  },

  renameLevel: (levelId, name) => {
    const { flat, rooms } = get();
    const trimmed = (name || '').trim();
    if (!flat || !trimmed) return;
    get()._apply(
      {
        flat: {
          ...flat,
          levels: flat.levels.map((l) =>
            l.id === levelId ? { ...l, name: trimmed.slice(0, 40) } : l
          ),
        },
        rooms,
      },
      {}
    );
  },

  removeLevel: (levelId) => {
    const { flat, rooms } = get();
    if (!flat || flat.levels.length <= 1) return;
    const result = reconcile(removeLevel(flat, levelId), rooms);
    get()._apply(result, { levelId: result.flat.levels[0].id, selected: null });
  },

  // ---------- walls ----------
  addWall: (x1, y1, x2, y2) => {
    const { flat, rooms, levelId } = get();
    if (!flat || !levelId) return false;
    const result = addWall(flat, rooms, levelId, x1, y1, x2, y2);
    if (JSON.stringify(flat.walls[levelId]) === JSON.stringify(result.flat.walls[levelId]))
      return false;
    return get()._apply(result, {});
  },

  /** Removes the wall run (between junctions) that contains an edge key. */
  eraseWall: (key) => {
    const { flat, rooms, levelId } = get();
    if (!flat || !levelId) return false;
    const result = eraseWallRun(flat, rooms, levelId, key);
    if (!result) return false;
    return get()._apply(result, { selected: null });
  },

  // ---------- doors and windows ----------
  placeOpening: (op) => {
    const { flat, rooms, levelId } = get();
    if (!flat) return null;
    const opening = {
      ...op,
      id: op.id && op.id !== 'ghost' ? op.id : uid(op.type === 'door' ? 'door' : 'win'),
    };
    const result = addOpening(flat, rooms, levelId, opening);
    if (!result) return null;
    get()._apply(result, { selected: { type: 'opening', id: opening.id } });
    return opening;
  },

  removeOpening: (id) => {
    const { flat, rooms, levelId } = get();
    if (!flat || !openingsOf(flat, levelId).some((o) => o.id === id)) return false;
    return get()._apply(removeOpening(flat, rooms, levelId, id), { selected: null });
  },

  updateOpening: (id, patch) => {
    const { flat, rooms, levelId } = get();
    if (!flat) return false;
    const result = updateOpening(flat, rooms, levelId, id, patch);
    if (!result) return false;
    return get()._apply(result, {});
  },

  // ---------- rooms ----------
  setSpaceMeta: (id, patch) => {
    const { flat, rooms } = get();
    if (!flat) return false;
    const result = setSpaceMeta(flat, rooms, id, patch);
    if (!result) return false;
    return get()._apply(result, {});
  },

  furnishSpace: (id) => {
    const { flat, rooms } = get();
    if (!flat) return false;
    const result = furnishSpace(flat, rooms, id);
    if (!result) return false;
    return get()._apply(result, {});
  },

  // ---------- passages ----------
  /**
   * Builds a passage with its top-left corner at (x, y).
   * @returns {{ ok: true, spaceId, connected, shift } | { error: string }}
   * `shift` is how far the plan slid when the passage started left of or above it.
   */
  placePassage: (spec) => {
    const { flat, rooms, levelId } = get();
    if (!flat || !levelId) return { error: 'Open a flat first.' };
    const result = placePassageIn(flat, rooms, levelId, spec);
    if (result.error) return { error: result.error };
    get()._apply(result, { selected: { type: 'space', id: result.spaceId } });
    return { ok: true, spaceId: result.spaceId, connected: result.connected, shift: result.shift };
  },

  /** Changes a passage's length or width, or turns it (`turns` quarter turns clockwise). */
  editPassage: (spaceId, patch) => {
    const { flat, rooms } = get();
    if (!flat) return { error: 'Open a flat first.' };
    const result = editPassageIn(flat, rooms, spaceId, patch);
    if (result.error) return { error: result.error };
    if (result.flat === flat && result.rooms === rooms) return { ok: true, spaceId };
    get()._apply(result, { selected: { type: 'space', id: result.spaceId } });
    return { ok: true, spaceId: result.spaceId };
  },

  // ---------- stairs ----------
  addStair: (type = 'straight', x, y, rotationDeg = 0) => {
    const { flat, rooms, levelId } = get();
    if (!flat || !levelId) return null;
    const draft = createStair(flat, { levelId, type, x: x ?? 100, y: y ?? 100, rotationDeg });
    get()._apply(
      { flat: { ...flat, stairs: [...flat.stairs, draft] }, rooms },
      { selected: { type: 'stair', id: draft.id } }
    );
    return draft;
  },

  updateStair: (id, patch) => {
    const { flat, rooms } = get();
    const stair = flat?.stairs.find((s) => s.id === id);
    if (!stair) return false;
    const next = { ...stair };
    if (patch.type)
      next.type = ['straight', 'L', 'U'].includes(patch.type) ? patch.type : next.type;
    if (patch.widthCm !== undefined) {
      const [lo, hi] = STAIR_LIMITS.widthCm;
      next.widthCm = Math.max(lo, Math.min(hi, Math.round(patch.widthCm)));
    }
    if (patch.rotationDeg !== undefined)
      next.rotationDeg = (((Math.round(patch.rotationDeg / 90) * 90) % 360) + 360) % 360;
    if (patch.riseCm !== undefined) {
      const [lo, hi] = STAIR_LIMITS.riseCm;
      next.riseCm = Math.max(lo, Math.min(hi, Math.round(patch.riseCm)));
    }
    if (patch.x !== undefined) next.x = Math.max(0, snapToGrid(patch.x));
    if (patch.y !== undefined) next.y = Math.max(0, snapToGrid(patch.y));
    if (JSON.stringify(next) === JSON.stringify(stair)) return true;
    // Footprint is read here so a bad value fails loudly in tests
    stairFootprint(next);
    return get()._apply(
      { flat: { ...flat, stairs: flat.stairs.map((s) => (s.id === id ? next : s)) }, rooms },
      {}
    );
  },

  removeStair: (id) => {
    const { flat, rooms } = get();
    if (!flat) return;
    get()._apply(
      { flat: { ...flat, stairs: flat.stairs.filter((s) => s.id !== id) }, rooms },
      { selected: null }
    );
  },

  /** Deletes whatever is selected (wall run, door or window, staircase). */
  deleteSelected: () => {
    const { selected, flat } = get();
    if (!selected || !flat) return false;
    if (selected.type === 'wall') return get().eraseWall(selected.id);
    if (selected.type === 'opening') return get().removeOpening(selected.id);
    if (selected.type === 'stair') {
      get().removeStair(selected.id);
      return true;
    }
    return false;
  },

  // ---------- jump into a room with the room designer ----------
  openSpace: async (spaceId) => {
    const { flat } = get();
    const space = flat?.spaces.find((s) => s.id === spaceId);
    if (!space || !space.furnishable || !space.roomId) return;
    await flushFlat();
    await writeQueue;
    await useRoomStore.getState().switchRoom(space.roomId);
    if (useRoomStore.getState().room?.id !== space.roomId) return;
    useRoomStore.getState().setViewMode('2d');
    set({ mode: 'room', levelId: space.levelId, selected: { type: 'space', id: spaceId } });
  },

  backToFlat: async () => {
    const { flat, rooms, selected } = get();
    if (!flat) return;
    // The room designer saves with a delay; make sure its latest edit is written first
    await useRoomStore.getState().flushSave();
    const spaceId = selected?.type === 'space' ? selected.id : null;
    useRoomStore.getState().closeRoom();
    const loaded = await loadFlatRooms(flat.id);
    const merged = { ...rooms };
    for (const id of Object.keys(rooms)) if (loaded[id]) merged[id] = loaded[id];
    const space = spaceId ? flat.spaces.find((s) => s.id === spaceId) : null;
    const edited = space?.roomId ? merged[space.roomId] : null;
    if (edited) {
      const result = syncRoomToFlat(flat, merged, spaceId, edited);
      get()._apply(result, { mode: 'flat' });
    } else {
      set({ rooms: merged, mode: 'flat' });
    }
  },

  /** Jumps from the room being designed straight to another room of the same flat. */
  switchSpace: async (spaceId) => {
    const { mode, selected } = get();
    if (mode !== 'room') return;
    if (selected?.type === 'space' && selected.id === spaceId) return;
    // Saves the current room and folds its doors and windows back into the plan first
    await get().backToFlat();
    await get().openSpace(spaceId);
  },

  /** Finds the straight run of wall under an edge key, for the inspector. */
  wallRunFor: (key) => {
    const { flat, levelId } = get();
    if (!flat) return [];
    return wallRunAt(levelEdges(flat, levelId), key);
  },
}));
