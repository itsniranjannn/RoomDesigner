/**
 * roomLibrary.test.js
 * Unit tests for Phase 2: Room library management:
 * 1. Rename room updates room name without affecting furniture or layout dimensions.
 * 2. Delete room with fallback to remaining room.
 * 3. Delete room when it is the ONLY room: creates a fresh seeded room without crashing or showing stale data.
 * 4. Room switching verifies clean state separation with zero bleed-over.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRoomStore } from '../roomStore.js';
import * as persistence from '../../data/persistence.js';

describe('Room Library Management (Rename, Delete, Fallback & Switching)', () => {
  let mockDB = {};

  beforeEach(() => {
    mockDB = {
      'room-1': {
        id: 'room-1',
        name: 'Studio Apartment',
        widthCm: 520,
        depthCm: 420,
        doors: [{ id: 'd-1', wall: 'bottom', offsetCm: 50, widthCm: 90 }],
        windows: [{ id: 'w-1', wall: 'top', offsetCm: 150, widthCm: 120 }],
        placedFurniture: [
          { id: 'f-1', furnitureTypeId: 'bed-queen', x: 100, y: 120, rotationDeg: 0 },
        ],
      },
      'room-2': {
        id: 'room-2',
        name: 'Guest Bedroom',
        widthCm: 400,
        depthCm: 350,
        doors: [{ id: 'd-2', wall: 'left', offsetCm: 40, widthCm: 80 }],
        windows: [],
        placedFurniture: [
          { id: 'f-2', furnitureTypeId: 'desk-executive', x: 200, y: 200, rotationDeg: 90 },
          { id: 'f-3', furnitureTypeId: 'nightstand', x: 80, y: 80, rotationDeg: 0 },
        ],
      },
    };

    // Spy / mock persistence methods
    vi.spyOn(persistence, 'listRoomsFromDB').mockImplementation(async () => Object.values(mockDB));
    vi.spyOn(persistence, 'loadRoomFromDB').mockImplementation(async (id) => mockDB[id] || null);
    vi.spyOn(persistence, 'saveRoomToDB').mockImplementation(async (room) => {
      mockDB[room.id] = room;
      return room;
    });
    vi.spyOn(persistence, 'renameRoomInDB').mockImplementation(async (id, name) => {
      if (mockDB[id]) {
        mockDB[id] = { ...mockDB[id], name };
        return mockDB[id];
      }
      return null;
    });
    vi.spyOn(persistence, 'deleteRoomFromDB').mockImplementation(async (id) => {
      delete mockDB[id];
    });

    useRoomStore.setState({
      room: JSON.parse(JSON.stringify(mockDB['room-1'])),
      allRooms: Object.values(mockDB),
      selectedItemId: 'f-1',
      undoStack: [{ placedFurniture: [] }],
      redoStack: [],
      canUndo: true,
      canRedo: false,
    });
  });

  it('renames a room in the store and persistence without touching layout or furniture', async () => {
    await useRoomStore.getState().renameRoom('room-1', 'Modern Loft Master');

    const state = useRoomStore.getState();
    expect(state.room.name).toBe('Modern Loft Master');
    // Furniture, doors, windows, and dimensions remain intact
    expect(state.room.placedFurniture.length).toBe(1);
    expect(state.room.placedFurniture[0].id).toBe('f-1');
    expect(state.room.widthCm).toBe(520);
    expect(state.room.depthCm).toBe(420);
    expect(mockDB['room-1'].name).toBe('Modern Loft Master');
  });

  it('switches between rooms with complete clean state isolation and zero bleed-over', async () => {
    await useRoomStore.getState().switchRoom('room-2');

    const state = useRoomStore.getState();
    expect(state.room.id).toBe('room-2');
    expect(state.room.name).toBe('Guest Bedroom');
    expect(state.room.widthCm).toBe(400);
    expect(state.room.depthCm).toBe(350);
    // Pieces belong strictly to room-2
    expect(state.room.placedFurniture.length).toBe(2);
    expect(state.room.placedFurniture.map((f) => f.id)).toEqual(['f-2', 'f-3']);
    // Selection and undo stacks are cleanly reset
    expect(state.selectedItemId).toBeNull();
    expect(state.undoStack).toEqual([]);
    expect(state.canUndo).toBe(false);
  });

  it('deletes an active room when other rooms exist and falls back to a remaining room', async () => {
    await useRoomStore.getState().deleteRoom('room-1');

    const state = useRoomStore.getState();
    // Switched cleanly to remaining room-2
    expect(state.room.id).toBe('room-2');
    expect(state.room.name).toBe('Guest Bedroom');
    expect(state.allRooms.length).toBe(1);
    expect(mockDB['room-1']).toBeUndefined();
    expect(state.selectedItemId).toBeNull();
  });

  it('deletes the ONLY remaining room and cleanly creates a fresh seeded room without crashing or stale data', async () => {
    // Delete room-2 first
    delete mockDB['room-2'];
    useRoomStore.setState({ allRooms: [mockDB['room-1']] });

    // Now delete the only remaining room (room-1)
    await useRoomStore.getState().deleteRoom('room-1');

    const state = useRoomStore.getState();
    // Confirm stale room-1 is gone
    expect(mockDB['room-1']).toBeUndefined();
    expect(state.room).toBeDefined();
    expect(state.room.id).not.toBe('room-1');
    expect(state.room.name).toBe('My Room');
    expect(state.room.widthCm).toBe(500);
    expect(state.room.depthCm).toBe(400);
    expect(state.room.placedFurniture).toEqual([]);
    expect(state.allRooms.length).toBeGreaterThanOrEqual(1);
    expect(state.selectedItemId).toBeNull();
    expect(state.canUndo).toBe(false);
  });
});

