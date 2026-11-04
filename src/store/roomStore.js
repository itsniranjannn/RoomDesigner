/**
 * roomStore.js
 * Zustand state store managing active room, furniture placements,
 * live collision evaluation, selection, and debounced IndexedDB persistence.
 */

import { create } from 'zustand';
import {
  getInitialRoom,
  saveRoomToDB,
  listRoomsFromDB,
  loadRoomFromDB,
  deleteRoomFromDB,
  renameRoomInDB,
  saveCustomFurnitureToDB,
  listCustomFurnitureFromDB,
  setActiveRoomId,
  clearActiveRoomId,
  deleteCustomFurnitureFromDB,
} from '../data/persistence.js';
import {
  getFurnitureType,
  resolveItemDef,
  registerCustomFurniture,
  unregisterCustomFurniture,
} from '../data/furnitureCatalog.js';
import { sanitizeImportedRoom } from '../engine/share.js';
import { cleanOverrides } from '../engine/overrides.js';
import { evaluateAllCollisions } from '../engine/collision.js';
import { reconcileStacking, pickDefaultSupport } from '../engine/stacking.js';
import { clamp, normalizeAngle } from '../engine/geometry.js';
import { clampInsideRoom } from '../engine/snapping.js';
import { clampOpening } from '../engine/openings.js';

const SAVE_DEBOUNCE_MS = 350;
let saveDebounceTimer = null;

async function listStandaloneRooms() {
  return (await listRoomsFromDB()).filter((r) => !r.flatId);
}

// Resizing stays within a believable range of the catalog size (also keeps 2D symbols well-formed)
export const RESIZE_MIN_RATIO = 0.4;
export const RESIZE_MAX_RATIO = 2.5;

function clampToBase(overrides, base) {
  if (!overrides || !base) return overrides;
  const out = { ...overrides };
  for (const key of ['widthCm', 'depthCm', 'heightCm']) {
    if (out[key] === undefined || !Number.isFinite(base[key])) continue;
    const min = Math.max(key === 'heightCm' ? 1 : 20, Math.ceil(base[key] * RESIZE_MIN_RATIO));
    const max = Math.min(key === 'heightCm' ? 400 : 600, Math.floor(base[key] * RESIZE_MAX_RATIO));
    out[key] = Math.max(min, Math.min(Math.max(min, max), out[key]));
  }
  return out;
}

const newItemId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/** The latest unsaved room, written after a short pause or as soon as the open room changes. */
let pendingSave = null;

async function writePending(set) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = null;
  const room = pendingSave;
  pendingSave = null;
  if (!room) return;
  try {
    await saveRoomToDB(room);
    if (!pendingSave) set({ saveStatus: 'saved' });
  } catch (err) {
    set({ saveStatus: 'error' });
    if (import.meta.env?.DEV) console.error('Error saving to IndexedDB:', err);
  }
}

function persistDebounced(updatedRoom, set) {
  pendingSave = updatedRoom;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => writePending(set), SAVE_DEBOUNCE_MS);
}

/** Writes any unsaved edit now. Call before the open room is switched, closed, renamed or deleted. */
const flushPendingSave = (set) => writePending(set);

export const useRoomStore = create((set, get) => ({
  room: null,
  allRooms: [],
  selectedItemId: null,
  selectedItemIds: [],
  clipboard: [],
  pasteCount: 0,
  measureActive: false,
  showClearance: true,
  showDimensions: true,
  customVersion: 0,
  activeModal: null, // 'shortcuts' | 'layout' | 'share' | 'photo' | null
  viewMode: '2d', // '2d' | '3d'
  saveStatus: 'saved', // 'saved' | 'saving'
  collidingItemIds: new Set(),
  boundaryCollidingIds: new Set(),
  isInitialAnimationDone: false,

  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  // Helper to obtain a deep snapshot of the active design entities
  getCurrentSnapshot: () => {
    const { room, selectedItemId } = get();
    if (!room) return null;
    return {
      placedFurniture: JSON.parse(JSON.stringify(room.placedFurniture || [])),
      doors: JSON.parse(JSON.stringify(room.doors || [])),
      windows: JSON.parse(JSON.stringify(room.windows || [])),
      selectedItemId: selectedItemId || null,
    };
  },

  // Record a history snapshot before an atomic action
  _recordHistory: () => {
    const snapshot = get().getCurrentSnapshot();
    if (!snapshot) return;
    const { undoStack } = get();
    const nextUndoStack = [...undoStack.slice(-49), snapshot];
    set({
      undoStack: nextUndoStack,
      redoStack: [],
      canUndo: true,
      canRedo: false,
    });
  },

  // Record an explicit pre-gesture snapshot (e.g. from pointer drag / scrub end)
  pushExplicitSnapshot: (preGestureSnapshot) => {
    if (!preGestureSnapshot) return;
    const { undoStack } = get();
    const nextUndoStack = [...undoStack.slice(-49), preGestureSnapshot];
    set({
      undoStack: nextUndoStack,
      redoStack: [],
      canUndo: true,
      canRedo: false,
    });
  },

  // Clear session-only history (on init, create, or switch room)
  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Undo step
  undo: () => {
    const { undoStack, redoStack, room } = get();
    if (undoStack.length === 0 || !room) return;

    const currentSnapshot = get().getCurrentSnapshot();
    const prevSnapshot = undoStack[undoStack.length - 1];
    const nextUndoStack = undoStack.slice(0, -1);
    const nextRedoStack = [...redoStack, currentSnapshot];

    // Apply snapshot to active room
    const updatedRoom = {
      ...room,
      placedFurniture: prevSnapshot.placedFurniture,
      doors: prevSnapshot.doors,
      windows: prevSnapshot.windows,
    };

    const enrichedItems = (updatedRoom.placedFurniture || []).map((item) => {
      const def = resolveItemDef(item);
      return {
        ...item,
        widthCm: def ? def.widthCm : 50,
        depthCm: def ? def.depthCm : 50,
      };
    });

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      enrichedItems,
      room.widthCm,
      room.depthCm
    );

    set({
      room: updatedRoom,
      selectedItemId: prevSnapshot.selectedItemId,
      selectedItemIds: prevSnapshot.selectedItemId ? [prevSnapshot.selectedItemId] : [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: nextUndoStack.length > 0,
      canRedo: true,
      saveStatus: 'saving',
    });

    persistDebounced(updatedRoom, set);
  },

  // Redo step
  redo: () => {
    const { undoStack, redoStack, room } = get();
    if (redoStack.length === 0 || !room) return;

    const currentSnapshot = get().getCurrentSnapshot();
    const nextSnapshot = redoStack[redoStack.length - 1];
    const nextRedoStack = redoStack.slice(0, -1);
    const nextUndoStack = [...undoStack, currentSnapshot];

    const updatedRoom = {
      ...room,
      placedFurniture: nextSnapshot.placedFurniture,
      doors: nextSnapshot.doors,
      windows: nextSnapshot.windows,
    };

    const enrichedItems = (updatedRoom.placedFurniture || []).map((item) => {
      const def = resolveItemDef(item);
      return {
        ...item,
        widthCm: def ? def.widthCm : 50,
        depthCm: def ? def.depthCm : 50,
      };
    });

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      enrichedItems,
      room.widthCm,
      room.depthCm
    );

    set({
      room: updatedRoom,
      selectedItemId: nextSnapshot.selectedItemId,
      selectedItemIds: nextSnapshot.selectedItemId ? [nextSnapshot.selectedItemId] : [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: true,
      canRedo: nextRedoStack.length > 0,
      saveStatus: 'saving',
    });

    persistDebounced(updatedRoom, set);
  },

  // Close active room and return to Studio Overview landing page
  // Resolves once any unsaved edit has been written
  flushSave: () => flushPendingSave(set),

  closeRoom: () => {
    // Save any unsaved edit first: saving marks a room as the one to reopen next time
    flushPendingSave(set).then(clearActiveRoomId);
    set({
      room: null,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: new Set(),
      boundaryCollidingIds: new Set(),
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Initialize store and load room from IndexedDB
  initStore: async () => {
    try {
      await get().loadCustomFurniture();
      let initialRoom = await getInitialRoom();
      if (initialRoom?.flatId) initialRoom = null;
      const allRooms = await listStandaloneRooms();

      if (initialRoom) {
        const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
          initialRoom.placedFurniture || [],
          initialRoom.widthCm,
          initialRoom.depthCm
        );

        set({
          room: initialRoom,
          allRooms,
          collidingItemIds: collidingIds,
          boundaryCollidingIds,
          saveStatus: 'saved',
          undoStack: [],
          redoStack: [],
          canUndo: false,
          canRedo: false,
        });
      } else {
        set({
          room: null,
          allRooms,
          collidingItemIds: new Set(),
          boundaryCollidingIds: new Set(),
          saveStatus: 'saved',
          undoStack: [],
          redoStack: [],
          canUndo: false,
          canRedo: false,
        });
      }
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.error('Failed to init store:', err);
      }
    }
  },

  setInitialAnimationDone: (done) => set({ isInitialAnimationDone: done }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  // additive = shift/ctrl click toggles membership of the multi-selection
  selectItem: (id, additive = false) => {
    if (!additive) {
      set({ selectedItemId: id, selectedItemIds: id ? [id] : [] });
      return;
    }
    const ids = get().selectedItemIds;
    const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
    set({ selectedItemIds: next, selectedItemId: next.length ? next[next.length - 1] : null });
  },
  deselectItem: () => set({ selectedItemId: null, selectedItemIds: [] }),
  selectMany: (ids) =>
    set({ selectedItemIds: ids, selectedItemId: ids.length ? ids[ids.length - 1] : null }),
  selectAll: () => {
    const { room } = get();
    if (!room) return;
    get().selectMany((room.placedFurniture || []).map((i) => i.id));
  },

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  toggleMeasure: () => set((state) => ({ measureActive: !state.measureActive })),
  toggleClearance: () => set((state) => ({ showClearance: !state.showClearance })),
  toggleDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

  // Add new furniture piece into room and select it automatically
  addFurniture: (furnitureTypeId, customX = null, customY = null) => {
    const { room } = get();
    if (!room) return;

    const catalogDef = getFurnitureType(furnitureTypeId);
    if (!catalogDef) return;

    // Record snapshot before adding furniture
    get()._recordHistory();

    // If center is already crowded, add a small staggered offset
    const count = (room.placedFurniture || []).length;
    const offsetX = (count % 4) * 20 - 30;
    const offsetY = ((count * 2) % 5) * 15 - 30;

    // Small pieces dropped without a position land on a free surface (TV on its console)
    const stackBase =
      catalogDef.restsOnTop && customX === null
        ? pickDefaultSupport(catalogDef, room.placedFurniture || [])
        : null;
    let targetX =
      customX !== null ? customX : stackBase ? stackBase.x : Math.round(room.widthCm / 2 + offsetX);
    let targetY =
      customY !== null ? customY : stackBase ? stackBase.y : Math.round(room.depthCm / 2 + offsetY);

    // Strictly clamp within room boundaries
    const clamped = clampInsideRoom(
      {
        x: targetX,
        y: targetY,
        widthCm: catalogDef.widthCm,
        depthCm: catalogDef.depthCm,
        rotationDeg: 0,
      },
      room.widthCm,
      room.depthCm
    );

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      furnitureTypeId,
      x: clamped.x,
      y: clamped.y,
      rotationDeg: 0,
      elevationCm: 0,
    };

    let updatedFurniture = [...(room.placedFurniture || []), newItem];
    if (catalogDef.id === 'media-console') {
      updatedFurniture = updatedFurniture.map((item) =>
        item.furnitureTypeId === 'tv-43' ? { ...item, x: clamped.x, y: clamped.y } : item
      );
    }
    get()._commitFurnitureUpdate(updatedFurniture, newItem.id);
  },

  // Update item position during or after drag
  // If recordHistory is true, captures a history snapshot before updating
  updateFurniturePosition: (id, x, y, recordHistory = false) => {
    const { room } = get();
    if (!room) return;

    if (recordHistory) {
      get()._recordHistory();
    }

    const updatedFurniture = (room.placedFurniture || []).map((item) => {
      if (item.id === id) {
        const def = resolveItemDef(item);
        const clamped = clampInsideRoom(
          {
            x,
            y,
            widthCm: def ? def.widthCm : 50,
            depthCm: def ? def.depthCm : 50,
            rotationDeg: item.rotationDeg || 0,
          },
          room.widthCm,
          room.depthCm
        );
        return { ...item, x: clamped.x, y: clamped.y };
      }
      return item;
    });

    get()._commitFurnitureUpdate(updatedFurniture, id);
  },

  // Update item rotation with strict boundary clamping
  // If recordHistory is true, captures a history snapshot before updating
  updateFurnitureRotation: (id, rotationDeg, recordHistory = false) => {
    const { room } = get();
    if (!room) return;

    if (recordHistory) {
      get()._recordHistory();
    }

    const normDeg = normalizeAngle(rotationDeg);
    const updatedFurniture = (room.placedFurniture || []).map((item) => {
      if (item.id === id) {
        const def = resolveItemDef(item);
        const w = def ? def.widthCm : 50;
        const d = def ? def.depthCm : 50;
        const clamped = clampInsideRoom(
          {
            x: item.x,
            y: item.y,
            widthCm: w,
            depthCm: d,
            rotationDeg: normDeg,
          },
          room.widthCm,
          room.depthCm
        );
        return { ...item, x: clamped.x, y: clamped.y, rotationDeg: normDeg };
      }
      return item;
    });

    get()._commitFurnitureUpdate(updatedFurniture, id);
  },

  // Keyboard nudge (arrow keys)
  nudgeFurniture: (id, dx, dy) => {
    const { room } = get();
    if (!room) return;

    const target = (room.placedFurniture || []).find((item) => item.id === id);
    if (!target) return;

    // Record history snapshot for keyboard nudge
    get()._recordHistory();

    const def = resolveItemDef(target);
    const clamped = clampInsideRoom(
      {
        x: target.x + dx,
        y: target.y + dy,
        widthCm: def ? def.widthCm : 50,
        depthCm: def ? def.depthCm : 50,
        rotationDeg: target.rotationDeg || 0,
      },
      room.widthCm,
      room.depthCm
    );

    get().updateFurniturePosition(id, clamped.x, clamped.y, false);
  },

  // Remove furniture item
  removeFurniture: (id) => {
    const { room, selectedItemId } = get();
    if (!room) return;

    // Record snapshot before removal
    get()._recordHistory();

    const updatedFurniture = (room.placedFurniture || []).filter((item) => item.id !== id);
    if (selectedItemId === id) {
      set({ selectedItemId: null, selectedItemIds: [] });
    }

    get()._commitFurnitureUpdate(updatedFurniture, null);
  },

  // Duplicate furniture item
  duplicateFurniture: (id) => {
    const { room } = get();
    if (!room) return;

    const target = (room.placedFurniture || []).find((item) => item.id === id);
    if (!target) return;

    // Record snapshot before duplicate
    get()._recordHistory();

    const newItem = {
      ...target,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: Math.min(room.widthCm - 30, target.x + 20),
      y: Math.min(room.depthCm - 30, target.y + 20),
    };

    const updatedFurniture = [...(room.placedFurniture || []), newItem];
    get()._commitFurnitureUpdate(updatedFurniture, newItem.id);
  },

  // Update door or window offset or width
  updateOpening: (type, id, updates, recordHistory = false) => {
    const { room } = get();
    if (!room) return;

    if (recordHistory) {
      get()._recordHistory();
    }

    const key = type === 'door' ? 'doors' : 'windows';
    const list = room[key] || [];

    const updatedList = list.map((item) => {
      if (item.id === id) {
        const targetWall =
          updates.wall !== undefined
            ? updates.wall
            : item.wall || (type === 'door' ? 'bottom' : 'top');
        const wallLen =
          targetWall === 'left' || targetWall === 'right' ? room.depthCm : room.widthCm;

        const targetW = updates.widthCm !== undefined ? updates.widthCm : item.widthCm;
        let targetOffset = updates.offsetCm !== undefined ? updates.offsetCm : item.offsetCm;

        // If the wall changed and no explicit offset was passed, ensure the opening does not overflow the new wall
        if (
          updates.wall !== undefined &&
          updates.wall !== item.wall &&
          updates.offsetCm === undefined
        ) {
          if (targetOffset + targetW > wallLen - 15) {
            targetOffset = Math.max(
              15,
              Math.min(wallLen - targetW - 15, Math.round(wallLen / 2 - targetW / 2))
            );
          }
        }

        const clamped = clampOpening(type, targetOffset, targetW, wallLen);

        return {
          ...item,
          ...updates,
          wall: targetWall,
          widthCm: clamped.widthCm,
          offsetCm: clamped.offsetCm,
        };
      }
      return item;
    });

    const updatedRoom = {
      ...room,
      [key]: updatedList,
    };

    set({ room: updatedRoom, saveStatus: 'saving' });

    persistDebounced(updatedRoom, set);
  },

  // Add a new door or window
  addOpening: (type, wall = 'top') => {
    const { room } = get();
    if (!room) return;

    // Record history snapshot before adding opening
    get()._recordHistory();

    const key = type === 'door' ? 'doors' : 'windows';
    const list = room[key] || [];
    const id = `${type}-${Date.now()}`;

    const defaultWidth = type === 'door' ? 90 : 120;
    const wallLength = wall === 'left' || wall === 'right' ? room.depthCm : room.widthCm;

    // Position comfortably on the wall avoiding overlap if possible
    const existingOnWall = [
      ...(room.doors || []).filter((d) => (d.wall || 'bottom') === wall),
      ...(room.windows || []).filter((w) => (w.wall || 'top') === wall),
    ];

    let defaultOffset = Math.max(
      20,
      Math.min(wallLength - defaultWidth - 20, Math.round(wallLength / 2 - defaultWidth / 2))
    );
    if (existingOnWall.length > 0) {
      const last = existingOnWall[existingOnWall.length - 1];
      const proposed = last.offsetCm + last.widthCm + 25;
      if (proposed + defaultWidth <= wallLength - 20) {
        defaultOffset = proposed;
      } else {
        const proposedBefore = last.offsetCm - defaultWidth - 25;
        if (proposedBefore >= 20) {
          defaultOffset = proposedBefore;
        }
      }
    }

    const newOpening = {
      id,
      wall,
      offsetCm: defaultOffset,
      widthCm: defaultWidth,
    };

    const updatedRoom = {
      ...room,
      [key]: [...list, newOpening],
    };

    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  // Remove a door or window
  removeOpening: (type, id) => {
    const { room } = get();
    if (!room) return;

    // Record history snapshot before removing opening
    get()._recordHistory();

    const key = type === 'door' ? 'doors' : 'windows';
    const list = room[key] || [];

    const updatedRoom = {
      ...room,
      [key]: list.filter((item) => item.id !== id),
    };

    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  // ---------- Group operations ----------

  copySelection: () => {
    const { room, selectedItemIds } = get();
    if (!room || selectedItemIds.length === 0) return;
    const chosen = (room.placedFurniture || []).filter((i) => selectedItemIds.includes(i.id));
    set({ clipboard: JSON.parse(JSON.stringify(chosen)), pasteCount: 0 });
  },

  pasteClipboard: () => {
    const { room, clipboard, pasteCount } = get();
    if (!room || clipboard.length === 0) return;

    get()._recordHistory();
    const shift = 25 * (pasteCount + 1);
    const pasted = clipboard.map((item) => {
      const def = resolveItemDef(item);
      const clamped = clampInsideRoom(
        {
          x: item.x + shift,
          y: item.y + shift,
          widthCm: def ? def.widthCm : 50,
          depthCm: def ? def.depthCm : 50,
          rotationDeg: item.rotationDeg || 0,
        },
        room.widthCm,
        room.depthCm
      );
      return { ...item, id: newItemId(), x: clamped.x, y: clamped.y };
    });
    const ids = pasted.map((i) => i.id);
    set({ pasteCount: pasteCount + 1 });
    get()._commitFurnitureUpdate([...(room.placedFurniture || []), ...pasted], ids[ids.length - 1]);
    get().selectMany(ids);
  },

  duplicateSelection: () => {
    get().copySelection();
    get().pasteClipboard();
  },

  removeSelection: () => {
    const { room, selectedItemIds } = get();
    if (!room || selectedItemIds.length === 0) return;
    get()._recordHistory();
    const doomed = new Set(selectedItemIds);
    get()._commitFurnitureUpdate(
      (room.placedFurniture || []).filter((i) => !doomed.has(i.id)),
      null
    );
  },

  nudgeSelection: (dx, dy) => {
    const { room, selectedItemIds } = get();
    if (!room || selectedItemIds.length === 0) return;
    get()._recordHistory();
    const moving = new Set(selectedItemIds);
    const updated = (room.placedFurniture || []).map((item) => {
      if (!moving.has(item.id)) return item;
      const def = resolveItemDef(item);
      const clamped = clampInsideRoom(
        {
          x: item.x + dx,
          y: item.y + dy,
          widthCm: def ? def.widthCm : 50,
          depthCm: def ? def.depthCm : 50,
          rotationDeg: item.rotationDeg || 0,
        },
        room.widthCm,
        room.depthCm
      );
      return { ...item, x: clamped.x, y: clamped.y };
    });
    get()._commitFurnitureUpdate(updated, get().selectedItemId);
  },

  // Group drag: positions are start positions keyed by id, moved by a shared delta
  moveSelectionFrom: (startPositions, dx, dy) => {
    const { room } = get();
    if (!room) return;
    const updated = (room.placedFurniture || []).map((item) => {
      const start = startPositions[item.id];
      if (!start) return item;
      const def = resolveItemDef(item);
      const clamped = clampInsideRoom(
        {
          x: start.x + dx,
          y: start.y + dy,
          widthCm: def ? def.widthCm : 50,
          depthCm: def ? def.depthCm : 50,
          rotationDeg: item.rotationDeg || 0,
        },
        room.widthCm,
        room.depthCm
      );
      return { ...item, x: clamped.x, y: clamped.y };
    });
    get()._commitFurnitureUpdate(updated, get().selectedItemId);
  },

  // ---------- Customization ----------

  // patch values of null/'' remove that override (reset to catalog default)
  updateItemOverrides: (id, patch, recordHistory = true) => {
    const { room } = get();
    if (!room) return;
    const target = (room.placedFurniture || []).find((i) => i.id === id);
    if (!target) return;
    if (recordHistory) get()._recordHistory();

    const merged = { ...(target.overrides || {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === '') delete merged[key];
      else merged[key] = value;
    }
    const overrides = clampToBase(cleanOverrides(merged), getFurnitureType(target.furnitureTypeId));

    const updated = (room.placedFurniture || []).map((item) => {
      if (item.id !== id) return item;
      const next = { ...item };
      if (overrides) next.overrides = overrides;
      else delete next.overrides;
      const def = resolveItemDef(next);
      const clamped = clampInsideRoom(
        {
          x: next.x,
          y: next.y,
          widthCm: def ? def.widthCm : 50,
          depthCm: def ? def.depthCm : 50,
          rotationDeg: next.rotationDeg || 0,
        },
        room.widthCm,
        room.depthCm
      );
      return { ...next, x: clamped.x, y: clamped.y };
    });
    get()._commitFurnitureUpdate(updated, id);
  },

  // ---------- Room-level tools ----------

  _commitRoom: (updatedRoom) => {
    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  setTraceImage: (image) => {
    const { room } = get();
    if (!room) return;
    const next = { ...room };
    if (image) {
      next.traceImage = {
        dataUrl: image.dataUrl,
        aspect: image.aspect || 1,
        opacity: 0.45,
        x: 0,
        y: 0,
        widthCm: room.widthCm,
      };
    } else {
      delete next.traceImage;
    }
    get()._commitRoom(next);
  },

  updateTraceImage: (patch) => {
    const { room } = get();
    if (!room?.traceImage) return;
    get()._commitRoom({ ...room, traceImage: { ...room.traceImage, ...patch } });
  },

  applyLayout: (items, mode = 'replace') => {
    const { room } = get();
    if (!room) return;
    get()._recordHistory();
    const base = mode === 'add' ? room.placedFurniture || [] : [];
    get()._commitFurnitureUpdate([...base, ...items], null);
  },

  importRoomData: async (data) => {
    const imported = sanitizeImportedRoom(data);
    await flushPendingSave(set);
    await saveRoomToDB(imported);
    const allRooms = await listStandaloneRooms();
    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      imported.placedFurniture,
      imported.widthCm,
      imported.depthCm
    );
    set({
      room: imported,
      allRooms,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      isInitialAnimationDone: false,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
    return imported;
  },

  // ---------- Custom (photo-made) furniture ----------

  loadCustomFurniture: async () => {
    const list = await listCustomFurnitureFromDB();
    list.forEach(registerCustomFurniture);
    set((state) => ({ customVersion: state.customVersion + 1 }));
  },

  addCustomFurniture: async (def) => {
    registerCustomFurniture(def);
    try {
      await saveCustomFurnitureToDB(def);
    } catch (err) {
      unregisterCustomFurniture(def.id);
      throw err;
    }
    set((state) => ({ customVersion: state.customVersion + 1 }));
  },

  removeCustomFurniture: async (id) => {
    unregisterCustomFurniture(id);
    await deleteCustomFurnitureFromDB(id);
    set((state) => ({ customVersion: state.customVersion + 1 }));
  },

  // Create a new custom room
  createRoom: async (name, widthCm, depthCm) => {
    const newRoom = {
      id: `room-${Date.now()}`,
      name: name || 'Custom Room',
      widthCm: clamp(widthCm, 200, 1500),
      depthCm: clamp(depthCm, 200, 1500),
      doors: [
        {
          id: `door-${Date.now()}`,
          wall: 'bottom',
          offsetCm: 50,
          widthCm: 90,
          swingDirection: 'inward-left',
        },
      ],
      windows: [
        {
          id: `win-${Date.now()}`,
          wall: 'top',
          offsetCm: Math.round(widthCm / 2 - 60),
          widthCm: 120,
        },
      ],
      placedFurniture: [],
      updatedAt: new Date().toISOString(),
    };

    await flushPendingSave(set);
    await saveRoomToDB(newRoom);
    const allRooms = await listStandaloneRooms();

    set({
      room: newRoom,
      allRooms,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: new Set(),
      boundaryCollidingIds: new Set(),
      isInitialAnimationDone: false, // will trigger blueprint draw-in
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Switch to another room
  switchRoom: async (roomId) => {
    await flushPendingSave(set);
    const loaded = await loadRoomFromDB(roomId);
    if (!loaded) return;
    setActiveRoomId(loaded.id);

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      loaded.placedFurniture || [],
      loaded.widthCm,
      loaded.depthCm
    );

    set({
      room: loaded,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      isInitialAnimationDone: false,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Rename a room
  renameRoom: async (roomId, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;

    await flushPendingSave(set);
    await renameRoomInDB(roomId, trimmed);
    const allRooms = await listStandaloneRooms();
    const { room } = get();

    if (room && room.id === roomId) {
      set({
        room: { ...room, name: trimmed },
        allRooms,
      });
    } else {
      set({ allRooms });
    }
  },

  // Delete a room with fallback logic
  deleteRoom: async (roomId) => {
    await flushPendingSave(set);
    await deleteRoomFromDB(roomId);
    const remainingRooms = await listStandaloneRooms();
    const { room } = get();

    // If we deleted a room that wasn't active, just refresh allRooms
    if (room && room.id !== roomId) {
      set({ allRooms: remainingRooms });
      return;
    }

    // If the currently open room was deleted:
    if (remainingRooms && remainingRooms.length > 0) {
      // Fall back to first available room
      const nextRoom = remainingRooms[0];
      const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
        nextRoom.placedFurniture || [],
        nextRoom.widthCm,
        nextRoom.depthCm
      );

      set({
        room: nextRoom,
        allRooms: remainingRooms,
        selectedItemId: null,
        selectedItemIds: [],
        collidingItemIds: collidingIds,
        boundaryCollidingIds,
        isInitialAnimationDone: false,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      });
    } else {
      // All rooms were deleted — transition cleanly to Studio Overview landing page
      set({
        room: null,
        allRooms: [],
        selectedItemId: null,
        selectedItemIds: [],
        collidingItemIds: new Set(),
        boundaryCollidingIds: new Set(),
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      });
    }
  },

  // Move furniture up / down in visual stacking order
  reorderFurniture: (id, direction) => {
    const { room } = get();
    if (!room) return;

    const list = [...(room.placedFurniture || [])];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    // Record history snapshot before reorder
    get()._recordHistory();

    const [item] = list.splice(index, 1);
    list.splice(newIndex, 0, item);

    get()._commitFurnitureUpdate(list, id);
  },

  // Move furniture to arbitrary index (e.g. from drag & drop reorder)
  moveFurnitureToIndex: (fromIndex, toIndex) => {
    const { room } = get();
    if (!room) return;

    const list = [...(room.placedFurniture || [])];
    if (
      fromIndex < 0 ||
      fromIndex >= list.length ||
      toIndex < 0 ||
      toIndex >= list.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    get()._recordHistory();

    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);

    get()._commitFurnitureUpdate(list, item.id);
  },

  // Internal helper to update furniture list, evaluate collisions, and queue persistence
  _commitFurnitureUpdate: (editedFurniture, activeId = null) => {
    const { room } = get();
    if (!room) return;

    // Pieces resting on a moved support travel with it; orphaned ones drop to the floor
    const updatedFurniture = reconcileStacking(room.placedFurniture || [], editedFurniture);

    const enrichedItems = updatedFurniture.map((item) => {
      const def = resolveItemDef(item);
      return {
        ...item,
        widthCm: def ? def.widthCm : 50,
        depthCm: def ? def.depthCm : 50,
      };
    });

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      enrichedItems,
      room.widthCm,
      room.depthCm
    );

    const updatedRoom = {
      ...room,
      placedFurniture: updatedFurniture,
    };

    const existing = new Set(updatedFurniture.map((i) => i.id));
    let nextIds = get().selectedItemIds.filter((id) => existing.has(id));
    if (activeId === null) nextIds = [];
    else if (activeId && existing.has(activeId) && !nextIds.includes(activeId))
      nextIds = [activeId];

    set({
      room: updatedRoom,
      selectedItemId: activeId !== undefined ? activeId : get().selectedItemId,
      selectedItemIds: nextIds,
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saving',
    });

    // Debounced persist to IndexedDB
    persistDebounced(updatedRoom, set);
  },
}));
