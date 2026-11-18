/**
 * roomStore.js
 * Zustand state store managing active room, furniture placements,
 * live collision evaluation, selection, and debounced IndexedDB persistence.
 */

import { create } from 'zustand';
import {
  getInitialRoom,
  saveRoomToDB,
  saveRoomIfUnchanged,
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
import {
  reconcileStacking,
  pickDefaultSupport,
  settleStacking,
  supportOf,
} from '../engine/stacking.js';
import { findFreePosition } from '../engine/placement.js';
import { applyFinish } from '../components/preview3d/materials.js';
import { applyStyleToRoom, resetStyleOnRoom } from '../data/stylePresets.js';
import {
  snapToNearestWall,
  defaultWallSpot,
  defaultMountHeight,
  clampMountHeight,
} from '../engine/wallMount.js';
import { clamp, normalizeAngle } from '../engine/geometry.js';
import { clampInsideRoom } from '../engine/snapping.js';
import { clampOpening, DOOR_WIDTH_CM, defaultOpeningWidth } from '../engine/openings.js';
import { hasOutline, openingWallLength, longestSolidEdge } from '../engine/roomShape.js';
import {
  MAX_SERVICES,
  SERVICE_KINDS,
  newServiceId,
  positionService,
  snapToWall,
} from '../engine/planning.js';

const SAVE_DEBOUNCE_MS = 350;
let saveDebounceTimer = null;

async function listStandaloneRooms() {
  return (await listRoomsFromDB()).filter((r) => !r.flatId);
}

// Resizing stays within a believable range of the catalog size (also keeps 2D symbols well-formed)
export const RESIZE_MIN_RATIO = 0.4;
export const RESIZE_MAX_RATIO = 2.5;

// How big a room may be, in centimetres. The New room dialog and the Room details panel both
// hold to this, so a room cannot be made a size it could not have been created at.
export const ROOM_MIN_CM = 200;
export const ROOM_MAX_CM = 1500;

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

/** Service points come back with undo and redo; rooms that never had any stay as they were. */
const restoredServices = (room, snapshot) =>
  snapshot.services && (snapshot.services.length > 0 || room.services)
    ? { services: snapshot.services }
    : {};

/**
 * Pieces that hang on a wall (frames, mirrors, shelves, curtains) always sit against the nearest wall:
 * moved, turned or resized, they snap back flush and face into the room. Other pieces are untouched.
 */
function snapWallPieces(room, items) {
  let changed = false;
  const next = items.map((item) => {
    const def = resolveItemDef(item);
    if (!def?.wallMounted) return item;
    const spot = snapToNearestWall(room, def, item);
    const elevationCm = Number.isFinite(item.elevationCm)
      ? item.elevationCm
      : defaultMountHeight(def);
    if (
      Math.abs(spot.x - item.x) < 0.05 &&
      Math.abs(spot.y - item.y) < 0.05 &&
      (item.rotationDeg || 0) === spot.rotationDeg &&
      item.elevationCm === elevationCm
    )
      return item;
    changed = true;
    return { ...item, x: spot.x, y: spot.y, rotationDeg: spot.rotationDeg, elevationCm };
  });
  return changed ? next : items;
}

/** The part of a room a style changes (finish and style record), kept in undo snapshots of style steps. */
const lookOf = (room) => ({
  finish: room.finish ? JSON.parse(JSON.stringify(room.finish)) : null,
  styleApplied: room.styleApplied ? JSON.parse(JSON.stringify(room.styleApplied)) : null,
});

/** The room with the finish and style record of a snapshot, when the snapshot kept them. */
function withSnapshotLook(room, snapshot) {
  if (!snapshot.look) return room;
  const { finish: _f, styleApplied: _s, ...rest } = room;
  return {
    ...rest,
    ...(snapshot.look.finish ? { finish: snapshot.look.finish } : {}),
    ...(snapshot.look.styleApplied ? { styleApplied: snapshot.look.styleApplied } : {}),
  };
}

const newItemId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Photo-made types deleted from My furniture in this session. Their photos and their 3D model are
 * gone for good, so undo and redo must never put a copy back: it would come back as a nameless
 * grey box that nothing can restore.
 */
const removedCustomTypes = new Set();

const withoutRemovedTypes = (items) =>
  removedCustomTypes.size === 0 || !Array.isArray(items)
    ? items
    : items.filter((item) => !removedCustomTypes.has(item.furnitureTypeId));

/** A history snapshot with any copy of a deleted photo-made piece taken out. */
const scrubSnapshot = (snapshot) => ({
  ...snapshot,
  placedFurniture: withoutRemovedTypes(snapshot.placedFurniture),
});

/** The latest unsaved room, written after a short pause or as soon as the open room changes. */
let pendingSave = null;

/**
 * The stored stamp of the open room: what it was loaded with, or what the last save wrote. A
 * write that would land on top of a newer stamp belongs to another tab and is refused.
 */
let savedBase = { id: null, updatedAt: null };

/** Remembers the stamp a room was loaded or saved with, so later writes can be checked. */
function noteStoredRoom(room) {
  savedBase = room ? { id: room.id, updatedAt: room.updatedAt ?? null } : { id: null };
}

const baseStampFor = (id) => (savedBase.id === id ? savedBase.updatedAt : null);

/**
 * Saves run one after another, like the flat designer's. Two overlapping writes of the same room
 * would both start from the stamp the first one is about to replace, so the second would be
 * refused as another tab's work: the edit would be dropped and the header would say "Not saved".
 */
let writeQueue = Promise.resolve();

function writePending(set) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = null;
  // Nothing in the chain may reject: one bad write must not stop every save after it
  writeQueue = writeQueue.then(() => writeOnce(set)).catch(() => {});
  return writeQueue;
}

async function writeOnce(set) {
  const room = pendingSave;
  pendingSave = null;
  if (!room) return;
  try {
    const result = await saveRoomIfUnchanged(room, baseStampFor(room.id));
    if (result.conflict) {
      // Another tab has saved this room since it was opened here. Its work stays.
      set({ saveStatus: 'stale' });
      return;
    }
    noteStoredRoom(result.room);
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
  // Short message about the last piece that could not be placed as asked (shown over the plan)
  placeNotice: null,
  clearPlaceNotice: () => set({ placeNotice: null }),
  activeModal: null, // 'shortcuts' | 'layout' | 'share' | 'photo' | null
  viewMode: '2d', // '2d' | '3d'
  // Walking through the room in 3D: the whole window is the view, so the side panels step aside
  walkActive: false,
  setWalkActive: (on) => set({ walkActive: !!on }),
  // 'saved' | 'saving' | 'error' (the write failed) | 'stale' (another tab saved this room)
  saveStatus: 'saved',
  collidingItemIds: new Set(),
  // Piece a dragged item would come to rest on if dropped now (drives the plan highlight)
  dropTargetId: null,
  setDropTarget: (id) => {
    if (get().dropTargetId !== id) set({ dropTargetId: id });
  },
  boundaryCollidingIds: new Set(),
  isInitialAnimationDone: false,

  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  // Helper to obtain a deep snapshot of the active design entities
  getCurrentSnapshot: (includeLook = false) => {
    const { room, selectedItemId } = get();
    if (!room) return null;
    return {
      ...(includeLook ? { look: lookOf(room) } : {}),
      // The size is part of a step, so undoing a resize brings the old walls back with the
      // furniture and openings that were refitted to them
      widthCm: room.widthCm,
      depthCm: room.depthCm,
      placedFurniture: JSON.parse(JSON.stringify(room.placedFurniture || [])),
      doors: JSON.parse(JSON.stringify(room.doors || [])),
      windows: JSON.parse(JSON.stringify(room.windows || [])),
      services: JSON.parse(JSON.stringify(room.services || [])),
      selectedItemId: selectedItemId || null,
    };
  },

  // Record a history snapshot before an atomic action
  _recordHistory: (includeLook = false) => {
    const snapshot = get().getCurrentSnapshot(includeLook);
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

    const prevSnapshot = undoStack[undoStack.length - 1];
    // A style step also keeps the finish, so undoing and redoing it brings the floor and walls back too
    const currentSnapshot = get().getCurrentSnapshot(!!prevSnapshot.look);
    const nextUndoStack = undoStack.slice(0, -1);
    const nextRedoStack = [...redoStack, currentSnapshot];

    // Apply snapshot to active room
    const updatedRoom = withSnapshotLook(
      {
        ...room,
        // Snapshots taken before the size became part of a step have no size of their own
        widthCm: prevSnapshot.widthCm ?? room.widthCm,
        depthCm: prevSnapshot.depthCm ?? room.depthCm,
        placedFurniture: withoutRemovedTypes(prevSnapshot.placedFurniture),
        doors: prevSnapshot.doors,
        windows: prevSnapshot.windows,
        ...restoredServices(room, prevSnapshot),
      },
      prevSnapshot
    );

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
      updatedRoom.widthCm,
      updatedRoom.depthCm,
      updatedRoom.outline
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

    const nextSnapshot = redoStack[redoStack.length - 1];
    const currentSnapshot = get().getCurrentSnapshot(!!nextSnapshot.look);
    const nextRedoStack = redoStack.slice(0, -1);
    const nextUndoStack = [...undoStack, currentSnapshot];

    const updatedRoom = withSnapshotLook(
      {
        ...room,
        widthCm: nextSnapshot.widthCm ?? room.widthCm,
        depthCm: nextSnapshot.depthCm ?? room.depthCm,
        placedFurniture: withoutRemovedTypes(nextSnapshot.placedFurniture),
        doors: nextSnapshot.doors,
        windows: nextSnapshot.windows,
        ...restoredServices(room, nextSnapshot),
      },
      nextSnapshot
    );

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
      updatedRoom.widthCm,
      updatedRoom.depthCm,
      updatedRoom.outline
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
    flushPendingSave(set).then(() => {
      noteStoredRoom(null);
      clearActiveRoomId();
    });
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

      noteStoredRoom(initialRoom);
      if (initialRoom) {
        const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
          initialRoom.placedFurniture || [],
          initialRoom.widthCm,
          initialRoom.depthCm,
          initialRoom.outline
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
    // Leaving the 3D view ends any walkthrough with it, so the panels come back
    set({ viewMode: mode, ...(mode === '3d' ? null : { walkActive: false }) });
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

    // A piece bigger than the room in both turns cannot be placed: say so instead of overflowing
    const fitsAsIs = catalogDef.widthCm <= room.widthCm && catalogDef.depthCm <= room.depthCm;
    const fitsTurned = catalogDef.depthCm <= room.widthCm && catalogDef.widthCm <= room.depthCm;
    if (!fitsAsIs && !fitsTurned) {
      set({
        placeNotice: `${catalogDef.name} (${catalogDef.widthCm} x ${catalogDef.depthCm} cm) is bigger than this room (${room.widthCm} x ${room.depthCm} cm). Make the room larger or pick a smaller piece.`,
      });
      return;
    }
    const startRotation = fitsAsIs ? 0 : 90;

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
    // Wall pieces go on a wall: a curtain on a window that has none yet, anything else mid-wall
    const wallSpot = catalogDef.wallMounted
      ? customX === null
        ? defaultWallSpot(room, catalogDef, room.placedFurniture || [])
        : { x: customX, y: customY }
      : null;
    if (wallSpot) {
      targetX = wallSpot.x;
      targetY = wallSpot.y;
    }
    // Added without choosing a spot: take the free place nearest the middle instead of piling on a piece
    if (customX === null && !stackBase && !wallSpot) {
      const others = (room.placedFurniture || [])
        .filter((item) => !item.elevationCm)
        .map((item) => {
          const d = resolveItemDef(item);
          return d
            ? {
                x: item.x,
                y: item.y,
                widthCm: d.widthCm,
                depthCm: d.depthCm,
                rotationDeg: item.rotationDeg || 0,
                furnitureTypeId: item.furnitureTypeId,
              }
            : null;
        })
        .filter(Boolean);
      const spot = findFreePosition(catalogDef, others, room.widthCm, room.depthCm, room.outline, {
        x: targetX,
        y: targetY,
      });
      targetX = spot.x;
      targetY = spot.y;
    }

    // Strictly clamp within room boundaries
    const clamped = clampInsideRoom(
      {
        x: targetX,
        y: targetY,
        widthCm: catalogDef.widthCm,
        depthCm: catalogDef.depthCm,
        rotationDeg: startRotation,
      },
      room.widthCm,
      room.depthCm,
      room.outline
    );

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      furnitureTypeId,
      x: clamped.x,
      y: clamped.y,
      rotationDeg: startRotation,
      elevationCm: catalogDef.wallMounted ? defaultMountHeight(catalogDef) : 0,
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
          room.depthCm,
          room.outline
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
          room.depthCm,
          room.outline
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
      room.depthCm,
      room.outline
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

    const outlined = hasOutline(room);
    const updatedList = list.map((item) => {
      if (item.id === id) {
        const defaultWall = type === 'door' ? 'bottom' : 'top';
        const targetEdge = updates.edge !== undefined ? updates.edge : (item.edge ?? 0);
        const targetWall = outlined
          ? `e${targetEdge}`
          : updates.wall !== undefined
            ? updates.wall
            : item.wall || defaultWall;
        const wallLen = outlined
          ? openingWallLength(room, { edge: targetEdge })
          : targetWall === 'left' || targetWall === 'right'
            ? room.depthCm
            : room.widthCm;
        const wallChanged = outlined
          ? updates.edge !== undefined && updates.edge !== item.edge
          : updates.wall !== undefined && updates.wall !== item.wall;

        // Doors keep the standard width; only windows stretch
        const targetW =
          type === 'door'
            ? DOOR_WIDTH_CM
            : updates.widthCm !== undefined
              ? updates.widthCm
              : item.widthCm;
        let targetOffset = updates.offsetCm !== undefined ? updates.offsetCm : item.offsetCm;

        // If the wall changed and no explicit offset was passed, ensure the opening does not overflow the new wall
        if (wallChanged && updates.offsetCm === undefined) {
          if (targetOffset + targetW > wallLen - 15) {
            targetOffset = Math.max(
              15,
              Math.min(wallLen - targetW - 15, Math.round(wallLen / 2 - targetW / 2))
            );
          }
        }

        const clamped = clampOpening(type, targetOffset, targetW, wallLen);
        const { wall: _wall, edge: _edge, ...rest } = { ...item, ...updates };

        return {
          ...rest,
          ...(outlined ? { edge: targetEdge } : { wall: targetWall }),
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

  /**
   * Changes the size of the open room. A room can be made bigger or smaller at any time, so
   * furniture and openings that no longer fit have to be dealt with rather than lost: a piece
   * outside the new walls is brought back inside (wall pieces stay flush against their wall),
   * and a door or window on a wall that is now shorter is slid, and a window narrowed, until it
   * fits. The counts come back so the panel can say what had to move.
   *
   * @returns {{ widthCm, depthCm, movedPieces, movedOpenings, movedServices } | null}
   *   null when there is nothing to do, or when the room's shape is not this panel's to change
   */
  resizeRoom: (widthCm, depthCm) => {
    const { room } = get();
    if (!room) return null;
    // A room that is not a plain rectangle takes its shape from the walls it was drawn with in the
    // flat designer, and its openings sit on numbered edges rather than on a named wall: resizing
    // the box around it would refit them against the wrong walls. Refused here as in the panel,
    // which offers no boxes for such a room.
    if (hasOutline(room)) return null;
    // Nothing asked for keeps the side it is: an empty box must not be read as a 0 cm wall
    const asked = (raw, fallback) => {
      if (raw === null || raw === undefined || raw === '') return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? clamp(Math.round(n), ROOM_MIN_CM, ROOM_MAX_CM) : fallback;
    };
    const nextW = asked(widthCm, room.widthCm);
    const nextD = asked(depthCm, room.depthCm);
    if (nextW === room.widthCm && nextD === room.depthCm) return null;

    get()._recordHistory();

    // Doors and windows keep their place on their wall where they can; clampOpening slides them
    // off the corners and narrows a window that no longer spans the wall, as a drag would.
    let movedOpenings = 0;
    const refitOpenings = (list, type) =>
      (list || []).map((op) => {
        const wall = op.wall || (type === 'door' ? 'bottom' : 'top');
        const wallLen = wall === 'left' || wall === 'right' ? nextD : nextW;
        const fitted = clampOpening(type, op.offsetCm, op.widthCm, wallLen);
        if (fitted.offsetCm === op.offsetCm && fitted.widthCm === op.widthCm) return op;
        movedOpenings += 1;
        return { ...op, ...fitted };
      });

    const resized = {
      ...room,
      widthCm: nextW,
      depthCm: nextD,
      doors: refitOpenings(room.doors, 'door'),
      windows: refitOpenings(room.windows, 'window'),
    };

    // Only the right and bottom walls actually travel when the size changes; a thing hung on one of
    // them travels with it, so that the wall nearest to it afterwards is still its own wall and not
    // the one it now happens to sit closer to. Without this a clock on the right wall of a room made
    // 40 cm wider is re-hung on the top wall, far from where its owner put it.
    const carryDx = nextW - room.widthCm;
    const carryDy = nextD - room.depthCm;
    const carry = (wall, x, y) => ({
      x: wall === 'right' ? x + carryDx : x,
      y: wall === 'bottom' ? y + carryDy : y,
    });

    // Pieces are measured at their real size, so one half outside the new wall comes back in whole
    const was = room.placedFurniture || [];
    const carried = was.map((item) => {
      const def = resolveItemDef(item);
      if (!def?.wallMounted) return item;
      const { wall } = snapToNearestWall(room, def, item);
      const at = carry(wall, item.x, item.y);
      return at.x === item.x && at.y === item.y ? item : { ...item, ...at };
    });
    const bringIn = (item) => {
      const def = resolveItemDef(item);
      const sized = {
        ...item,
        widthCm: def ? def.widthCm : 50,
        depthCm: def ? def.depthCm : 50,
      };
      const spot = clampInsideRoom(sized, nextW, nextD, room.outline || null);
      if (Math.abs(spot.x - item.x) < 0.05 && Math.abs(spot.y - item.y) < 0.05) return item;
      return { ...item, x: Math.round(spot.x), y: Math.round(spot.y) };
    };
    // A piece standing on another is left exactly where it is here, so that it can travel with its
    // support below. Pulling it in first looks to reconcileStacking like someone having moved it by
    // itself, which is the one case where it is deliberately left behind -- the laptop would stay
    // put while the console it sits on slides out from under it.
    const riders = new Set(was.filter((item) => supportOf(item, was)).map((item) => item.id));
    const broughtIn = carried.map((item) => (riders.has(item.id) ? item : bringIn(item)));
    // Pictures, mirrors and curtains belong against a wall, and the walls have just moved; a piece
    // standing on another (a laptop on a desk) travels with it and is then settled onto whatever it
    // now stands over, exactly as it is when that desk is dragged
    const settled = reconcileStacking(was, snapWallPieces(resized, broughtIn));
    // Only now, with everything carried, is a piece still sticking out brought in -- a rider whose
    // support could not be saved either, most often. Anything moved at this point is settled again,
    // since it may have left the surface it was resting on.
    const clamped = settled.map((item) => (riders.has(item.id) ? bringIn(item) : item));
    const placedFurniture = clamped.some((item, i) => item !== settled[i])
      ? settleStacking(clamped)
      : settled;
    // Counted against where a piece would be having simply followed its own wall: riding the wall it
    // was hung on is not something the person has to be told about
    const before = new Map(carried.map((item) => [item.id, item]));
    const movedPieces = placedFurniture.filter((item) => {
      const old = before.get(item.id);
      return old && (Math.abs(item.x - old.x) > 0.05 || Math.abs(item.y - old.y) > 0.05);
    }).length;

    // Sockets, taps and drains sit on a wall or on the floor, and the walls have just moved: they
    // are put back onto them rather than left floating outside the room
    let movedServices = 0;
    const services = (room.services || []).map((point) => {
      const onWall = SERVICE_KINDS[point.kind]?.mount === 'wall';
      const held = onWall ? snapToWall(room, point.x, point.y) : null;
      const from = held ? carry(held.wall, point.x, point.y) : { x: point.x, y: point.y };
      const at = positionService(resized, point.kind, from.x, from.y, point.rotationDeg || 0);
      if (!at || (Math.abs(at.x - from.x) < 0.05 && Math.abs(at.y - from.y) < 0.05)) {
        return at && (at.x !== point.x || at.y !== point.y) ? { ...point, ...at } : point;
      }
      movedServices += 1;
      return { ...point, ...at };
    });

    const updatedRoom = {
      ...resized,
      placedFurniture,
      ...(room.services ? { services } : {}),
    };
    const enriched = placedFurniture.map((item) => {
      const def = resolveItemDef(item);
      return { ...item, widthCm: def ? def.widthCm : 50, depthCm: def ? def.depthCm : 50 };
    });
    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      enriched,
      nextW,
      nextD,
      updatedRoom.outline
    );

    set({
      room: updatedRoom,
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saving',
    });
    persistDebounced(updatedRoom, set);
    return {
      widthCm: nextW,
      depthCm: nextD,
      movedPieces,
      movedOpenings,
      movedServices,
      // A piece wider than the room it is in cannot be brought inside: it is reported instead of
      // being described as dealt with
      stillOutside: boundaryCollidingIds.size,
    };
  },

  // Floor and wall finish of the 3D view (ids from preview3d/materials.js); classic = none chosen
  setRoomFinish: (patch) => {
    const { room } = get();
    if (!room) return;
    const updatedRoom = applyFinish(room, patch);
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

    const defaultWidth = defaultOpeningWidth(type);
    const outlined = hasOutline(room);
    const edge = outlined ? longestSolidEdge(room) : null;
    const wallLength = outlined
      ? openingWallLength(room, { edge })
      : wall === 'left' || wall === 'right'
        ? room.depthCm
        : room.widthCm;

    // Position comfortably on the wall avoiding overlap if possible
    const existingOnWall = outlined
      ? [...(room.doors || []), ...(room.windows || [])].filter((o) => (o.edge ?? 0) === edge)
      : [
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
      ...(outlined ? { edge } : { wall }),
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

  // ---------- Service points (sockets, switches, water, drains ...) ----------

  // Adds a service point; wall points snap to the nearest wall. Returns the new id.
  addService: (kind, x, y) => {
    const { room } = get();
    if (!room) return null;
    const placed = positionService(room, kind, x, y);
    if (!placed) return null;
    const existing = room.services || [];
    if (existing.length >= MAX_SERVICES) return null;
    get()._recordHistory();
    const service = { id: newServiceId(), kind, ...placed };
    const updatedRoom = { ...room, services: [...existing, service] };
    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
    return service.id;
  },

  // Moves a point (wall points stay on a wall). Pass recordHistory=false while dragging and
  // push the pre-drag snapshot when the drag ends.
  moveService: (id, x, y, recordHistory = false) => {
    const { room } = get();
    const target = (room?.services || []).find((s) => s.id === id);
    if (!target) return;
    const placed = positionService(room, target.kind, x, y, target.rotationDeg);
    if (!placed) return;
    if (recordHistory) get()._recordHistory();
    const services = room.services.map((s) => (s.id === id ? { ...s, ...placed } : s));
    const updatedRoom = { ...room, services };
    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  // Turns a floor or ceiling point by a quarter turn (wall points follow their wall)
  rotateService: (id, deltaDeg = 90) => {
    const { room } = get();
    const target = (room?.services || []).find((s) => s.id === id);
    if (!target || SERVICE_KINDS[target.kind]?.mount === 'wall') return;
    get()._recordHistory();
    const rotationDeg = ((((target.rotationDeg || 0) + deltaDeg) % 360) + 360) % 360;
    const services = room.services.map((s) => (s.id === id ? { ...s, rotationDeg } : s));
    const updatedRoom = { ...room, services };
    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  // Edits a point's note
  updateService: (id, updates) => {
    const { room } = get();
    if (!(room?.services || []).some((s) => s.id === id)) return;
    get()._recordHistory();
    const services = room.services.map((s) => {
      if (s.id !== id) return s;
      const next = { ...s };
      if (typeof updates.note === 'string') {
        const note = updates.note.trim().slice(0, 80);
        if (note) next.note = note;
        else delete next.note;
      }
      return next;
    });
    const updatedRoom = { ...room, services };
    set({ room: updatedRoom, saveStatus: 'saving' });
    persistDebounced(updatedRoom, set);
  },

  removeService: (id) => {
    const { room } = get();
    if (!(room?.services || []).some((s) => s.id === id)) return;
    get()._recordHistory();
    const updatedRoom = { ...room, services: room.services.filter((s) => s.id !== id) };
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
        room.depthCm,
        room.outline
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
        room.depthCm,
        room.outline
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
        room.depthCm,
        room.outline
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
    const baseDef = getFurnitureType(target.furnitureTypeId);
    const overrides = clampToBase(cleanOverrides(merged, baseDef), baseDef);

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
        room.depthCm,
        room.outline
      );
      return { ...next, x: clamped.x, y: clamped.y };
    });
    get()._commitFurnitureUpdate(updated, id);
  },

  // How high a wall piece hangs (cm above the floor); pieces on a shelf follow it
  setItemElevation: (id, elevationCm) => {
    const { room } = get();
    if (!room) return;
    const target = (room.placedFurniture || []).find((i) => i.id === id);
    const def = resolveItemDef(target);
    if (!target || !def?.wallMounted) return;
    const next = clampMountHeight(elevationCm, def);
    if (next === Math.round(target.elevationCm || 0)) return;
    get()._recordHistory();
    get()._commitFurnitureUpdate(
      (room.placedFurniture || []).map((i) => (i.id === id ? { ...i, elevationCm: next } : i)),
      id
    );
  },

  // One-click style: floor, walls and recoloured pieces in a single undo step (see data/stylePresets.js)
  applyStyle: (styleId, options) => {
    const { room } = get();
    if (!room) return;
    const next = applyStyleToRoom(room, styleId, options);
    if (next === room) return;
    get()._recordHistory(true);
    set({ room: next, saveStatus: 'saving' });
    persistDebounced(next, set);
  },

  // Puts the pieces and finish back as they were before any style
  resetStyle: () => {
    const { room } = get();
    if (!room?.styleApplied) return;
    get()._recordHistory(true);
    const next = resetStyleOnRoom(room);
    set({ room: next, saveStatus: 'saving' });
    persistDebounced(next, set);
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
    noteStoredRoom(await saveRoomToDB(imported));
    const allRooms = await listStandaloneRooms();
    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      imported.placedFurniture,
      imported.widthCm,
      imported.depthCm,
      imported.outline
    );
    set({
      room: imported,
      allRooms,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saved',
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
    removedCustomTypes.delete(def.id);
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
    removedCustomTypes.add(id);
    unregisterCustomFurniture(id);
    await deleteCustomFurnitureFromDB(id);
    // Copies placed in rooms go too, as the confirmation promises (otherwise they stay as
    // pieces nobody can draw)
    const openId = get().room?.id;
    try {
      for (const stored of await listRoomsFromDB()) {
        if (stored.id === openId) continue;
        const kept = (stored.placedFurniture || []).filter((i) => i.furnitureTypeId !== id);
        if (kept.length !== (stored.placedFurniture || []).length)
          await saveRoomToDB({ ...stored, placedFurniture: kept });
      }
    } catch {
      // The catalog entry is already gone; a room that could not be cleaned is cleaned on its next save
    }
    const open = get().room;
    if (open && (open.placedFurniture || []).some((i) => i.furnitureTypeId === id)) {
      // One history step for the deletion, so an undo does not jump back past it
      get()._recordHistory();
      get()._commitFurnitureUpdate(
        open.placedFurniture.filter((i) => i.furnitureTypeId !== id),
        null
      );
      set({ selectedItemId: null, selectedItemIds: [] });
    }
    // The piece is gone from every snapshot too, so no undo can replay a copy of it
    set((state) => ({
      customVersion: state.customVersion + 1,
      undoStack: state.undoStack.map(scrubSnapshot),
      redoStack: state.redoStack.map(scrubSnapshot),
    }));
  },

  // Create a new custom room
  createRoom: async (name, widthCm, depthCm) => {
    const newRoom = {
      id: `room-${Date.now()}`,
      name: name || 'Custom Room',
      widthCm: clamp(widthCm, ROOM_MIN_CM, ROOM_MAX_CM),
      depthCm: clamp(depthCm, ROOM_MIN_CM, ROOM_MAX_CM),
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
    noteStoredRoom(await saveRoomToDB(newRoom));
    const allRooms = await listStandaloneRooms();

    set({
      room: newRoom,
      allRooms,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: new Set(),
      boundaryCollidingIds: new Set(),
      // The status describes the room that is open, so it starts afresh with each one
      saveStatus: 'saved',
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
    noteStoredRoom(loaded);

    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      loaded.placedFurniture || [],
      loaded.widthCm,
      loaded.depthCm,
      loaded.outline
    );

    set({
      room: loaded,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saved',
      isInitialAnimationDone: false,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  },

  /**
   * Opens the stored copy of the room again, after another tab saved over it. The edit this tab
   * was holding is dropped: it was never written, and writing it would undo the other tab's work.
   */
  reopenRoom: async () => {
    const roomId = get().room?.id;
    if (!roomId) return;
    pendingSave = null;
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
    const loaded = await loadRoomFromDB(roomId);
    if (!loaded) {
      set({ saveStatus: 'error' });
      return;
    }
    noteStoredRoom(loaded);
    const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
      loaded.placedFurniture || [],
      loaded.widthCm,
      loaded.depthCm,
      loaded.outline
    );
    set({
      room: loaded,
      selectedItemId: null,
      selectedItemIds: [],
      collidingItemIds: collidingIds,
      boundaryCollidingIds,
      saveStatus: 'saved',
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
    const renamed = await renameRoomInDB(roomId, trimmed);
    const allRooms = await listStandaloneRooms();
    const { room } = get();

    if (room && room.id === roomId) {
      // The rename wrote a new stamp; later edits here are not a clash with another tab
      if (renamed) noteStoredRoom(renamed);
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

    // Another room was deleted, or none was open at all (the designs list on the landing
    // page): only the list changes. Opening a room nobody asked for would be a surprise.
    if (!room || room.id !== roomId) {
      set({ allRooms: remainingRooms });
      return;
    }

    // If the currently open room was deleted:
    if (remainingRooms && remainingRooms.length > 0) {
      // Fall back to first available room
      const nextRoom = remainingRooms[0];
      noteStoredRoom(nextRoom);
      const { collidingIds, boundaryCollidingIds } = evaluateAllCollisions(
        nextRoom.placedFurniture || [],
        nextRoom.widthCm,
        nextRoom.depthCm,
        nextRoom.outline
      );

      set({
        room: nextRoom,
        allRooms: remainingRooms,
        selectedItemId: null,
        selectedItemIds: [],
        collidingItemIds: collidingIds,
        boundaryCollidingIds,
        saveStatus: 'saved',
        isInitialAnimationDone: false,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      });
    } else {
      // All rooms were deleted — transition cleanly to Studio Overview landing page
      noteStoredRoom(null);
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
    const updatedFurniture = reconcileStacking(
      room.placedFurniture || [],
      snapWallPieces(room, editedFurniture)
    );

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
      room.depthCm,
      room.outline
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
