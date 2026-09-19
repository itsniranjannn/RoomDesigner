/**
 * persistence.js
 * IndexedDB storage layer using the `idb` library.
 * Zero-backend, fully local persistence.
 */

import { openDB } from 'idb';

const DB_NAME = 'room_planner_db';
const DB_VERSION = 1;
const STORE_ROOMS = 'rooms';
const ACTIVE_ROOM_KEY = 'active_room_id';

export const DEFAULT_ROOM = {
  id: 'room-default-studio',
  name: 'Studio Apartment',
  widthCm: 520,
  depthCm: 420,
  doors: [
    { id: 'door-1', wall: 'bottom', offsetCm: 60, widthCm: 90, swingDirection: 'inward-left' },
  ],
  windows: [
    { id: 'win-1', wall: 'top', offsetCm: 190, widthCm: 140 },
  ],
  placedFurniture: [
    {
      id: 'item-bed',
      furnitureTypeId: 'bed-queen',
      x: 100,
      y: 125,
      rotationDeg: 0,
    },
    {
      id: 'item-nightstand',
      furnitureTypeId: 'nightstand',
      x: 205,
      y: 50,
      rotationDeg: 0,
    },
    {
      id: 'item-desk',
      furnitureTypeId: 'desk-executive',
      x: 435,
      y: 110,
      rotationDeg: 90,
    },
  ],
  updatedAt: new Date().toISOString(),
};

export async function getDB() {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_ROOMS)) {
        db.createObjectStore(STORE_ROOMS, { keyPath: 'id' });
      }
    },
  });
}

export async function saveRoomToDB(room) {
  try {
    const db = await getDB();
    if (!db) return room;
    const updatedRoom = {
      ...room,
      updatedAt: new Date().toISOString(),
    };
    await db.put(STORE_ROOMS, updatedRoom);
    localStorage.setItem(ACTIVE_ROOM_KEY, room.id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_ROOM_KEY, room.id);
    }
    return updatedRoom;
  } catch (error) {
    console.error('Failed to save room to IndexedDB:', error);
    throw error;
  }
}

export async function loadRoomFromDB(id) {
  try {
    const db = await getDB();
    if (!db) return null;
    const room = await db.get(STORE_ROOMS, id);
    return room || null;
  } catch (error) {
    console.error('Failed to load room from IndexedDB:', error);
    return null;
  }
}

export async function listRoomsFromDB() {
  try {
    const db = await getDB();
    if (!db) return [DEFAULT_ROOM];
    const rooms = await db.getAll(STORE_ROOMS);
    if (!rooms || rooms.length === 0) {
      // Seed with default room
      await saveRoomToDB(DEFAULT_ROOM);
      return [DEFAULT_ROOM];
    }
    return rooms;
  } catch (error) {
    console.error('Failed to list rooms from IndexedDB:', error);
    return [DEFAULT_ROOM];
  }
}

export async function getInitialRoom() {
  try {
    const activeId = localStorage.getItem(ACTIVE_ROOM_KEY);
    if (activeId) {
      const room = await loadRoomFromDB(activeId);
      if (room) return room;
    }
    const rooms = await listRoomsFromDB();
    return rooms[0] || DEFAULT_ROOM;
  } catch (err) {
    console.error('Error getting initial room:', err);
    return DEFAULT_ROOM;
  }
}

