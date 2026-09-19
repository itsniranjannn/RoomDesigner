/**
 * roomStore.js
 * Zustand state store managing active room, furniture placements,
 * live collision evaluation, selection, and debounced IndexedDB persistence.
 */

import { create } from 'zustand';
import { getInitialRoom, saveRoomToDB, listRoomsFromDB, loadRoomFromDB } from '../data/persistence.js';
import { getFurnitureType } from '../data/furnitureCatalog.js';
import { evaluateAllCollisions } from '../engine/collision.js';
import { normalizeAngle } from '../engine/geometry.js';
import { clampInsideRoom } from '../engine/snapping.js';
import { clampOpening } from '../engine/openings.js';

let saveDebounceTimer = null;

export const useRoomStore = create((set, get) => ({
  room: null,
  allRooms: [],
  selectedItemId: null,
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
      const def = getFurnitureType(item.furnitureTypeId);
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
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: nextUndoStack.length > 0,
      canRedo: true,
      saveStatus: 'saving',
    });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await saveRoomToDB(updatedRoom);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Error saving undo state to IndexedDB:', err);
      }
    }, 350);
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
      const def = getFurnitureType(item.furnitureTypeId);
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
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      canUndo: true,
      canRedo: nextRedoStack.length > 0,
      saveStatus: 'saving',
    });

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await saveRoomToDB(updatedRoom);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Error saving redo state to IndexedDB:', err);
      }
    }, 350);
  },

  // Initialize store and load room from IndexedDB
  initStore: async () => {
    try {
      const initialRoom = await getInitialRoom();
      const allRooms = await listRoomsFromDB();

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
    } catch (err) {
      console.error('Failed to init store:', err);
    }
  },

  setInitialAnimationDone: (done) => set({ isInitialAnimationDone: done }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  selectItem: (id) => set({ selectedItemId: id }),
  deselectItem: () => set({ selectedItemId: null }),

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

    let targetX = customX !== null ? customX : Math.round(room.widthCm / 2 + offsetX);
    let targetY = customY !== null ? customY : Math.round(room.depthCm / 2 + offsetY);

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
    };

    const updatedFurniture = [...(room.placedFurniture || []), newItem];
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
        const def = getFurnitureType(item.furnitureTypeId);
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
        const def = getFurnitureType(item.furnitureTypeId);
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

    const def = getFurnitureType(target.furnitureTypeId);
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
      set({ selectedItemId: null });
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
        const targetWall = updates.wall !== undefined ? updates.wall : (item.wall || (type === 'door' ? 'bottom' : 'top'));
        const wallLen = (targetWall === 'left' || targetWall === 'right') ? room.depthCm : room.widthCm;

        const targetW = updates.widthCm !== undefined ? updates.widthCm : item.widthCm;
        let targetOffset = updates.offsetCm !== undefined ? updates.offsetCm : item.offsetCm;

        // If the wall changed and no explicit offset was passed, ensure the opening does not overflow the new wall
        if (updates.wall !== undefined && updates.wall !== item.wall && updates.offsetCm === undefined) {
          if (targetOffset + targetW > wallLen - 15) {
            targetOffset = Math.max(15, Math.min(wallLen - targetW - 15, Math.round(wallLen / 2 - targetW / 2)));
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

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await saveRoomToDB(updatedRoom);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Error saving opening to IndexedDB:', err);
      }
    }, 350);
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
    const wallLength = (wall === 'left' || wall === 'right') ? room.depthCm : room.widthCm;

    // Position comfortably on the wall avoiding overlap if possible
    const existingOnWall = [
      ...(room.doors || []).filter((d) => (d.wall || 'bottom') === wall),
      ...(room.windows || []).filter((w) => (w.wall || 'top') === wall),
    ];

    let defaultOffset = Math.max(20, Math.min(wallLength - defaultWidth - 20, Math.round(wallLength / 2 - defaultWidth / 2)));
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
    saveRoomToDB(updatedRoom);
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
    saveRoomToDB(updatedRoom);
  },

  // Create a new custom room
  createRoom: async (name, widthCm, depthCm) => {
    const newRoom = {
      id: `room-${Date.now()}`,
      name: name || 'Custom Room',
      widthCm: Math.max(200, Math.min(1500, widthCm)),
      depthCm: Math.max(200, Math.min(1500, depthCm)),
      doors: [
        { id: `door-${Date.now()}`, wall: 'bottom', offsetCm: 50, widthCm: 90, swingDirection: 'inward-left' },
      ],
      windows: [
        { id: `win-${Date.now()}`, wall: 'top', offsetCm: Math.round(widthCm / 2 - 60), widthCm: 120 },
      ],
      placedFurniture: [],
      updatedAt: new Date().toISOString(),
    };

    await saveRoomToDB(newRoom);
    const allRooms = await listRoomsFromDB();

    set({
      room: newRoom,
      allRooms,
      selectedItemId: null,
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
    const loaded = await loadRoomFromDB(roomId);
    if (!loaded) return;

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      loaded.placedFurniture || [],
      loaded.widthCm,
      loaded.depthCm
    );

    set({
      room: loaded,
      selectedItemId: null,
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      isInitialAnimationDone: false,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Internal helper to update furniture list, evaluate collisions, and queue persistence
  _commitFurnitureUpdate: (updatedFurniture, activeId = null) => {
    const { room } = get();
    if (!room) return;

    const enrichedItems = updatedFurniture.map((item) => {
      const def = getFurnitureType(item.furnitureTypeId);
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

    set({
      room: updatedRoom,
      selectedItemId: activeId !== undefined ? activeId : get().selectedItemId,
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saving',
    });

    // Debounced persist to IndexedDB
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await saveRoomToDB(updatedRoom);
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Error saving to IndexedDB:', err);
      }
    }, 350);
  },
}));

