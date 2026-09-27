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
    if (import.meta.env?.DEV) {
      console.error('Failed to save room to IndexedDB:', error);
    }
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
    if (import.meta.env?.DEV) {
      console.error('Failed to load room from IndexedDB:', error);
    }
    return null;
  }
}

export async function listRoomsFromDB() {
  try {
    const db = await getDB();
    if (!db) return [];
    const rooms = await db.getAll(STORE_ROOMS);
    return rooms || [];
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('Failed to list rooms from IndexedDB:', error);
    }
    return [];
  }
}

export async function getInitialRoom() {
  try {
    const activeId = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_ROOM_KEY) : null;
    if (activeId) {
      const room = await loadRoomFromDB(activeId);
      if (room) return room;
    }
    // If no explicit active room selected (or deleted), return null to display the landing page
    return null;
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.error('Error getting initial room:', err);
    }
    return null;
  }
}

export async function deleteRoomFromDB(id) {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(STORE_ROOMS, id);
    if (typeof localStorage !== 'undefined') {
      const activeId = localStorage.getItem(ACTIVE_ROOM_KEY);
      if (activeId === id) {
        localStorage.removeItem(ACTIVE_ROOM_KEY);
      }
    }
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.error('Failed to delete room from IndexedDB:', err);
    }
    throw err;
  }
}

export async function renameRoomInDB(id, newName) {
  try {
    const db = await getDB();
    if (!db) return null;
    const room = await db.get(STORE_ROOMS, id);
    if (!room) return null;
    const updatedRoom = {
      ...room,
      name: newName,
      updatedAt: new Date().toISOString(),
    };
    await db.put(STORE_ROOMS, updatedRoom);
    return updatedRoom;
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.error('Failed to rename room in IndexedDB:', err);
    }
    throw err;
  }
}

/**
 * Exports room data structure as a downloadable JSON file.
 */
export function exportRoomToJSON(room) {
  if (!room) return;
  const data = JSON.stringify(room, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (room.name || 'Room')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  link.download = `${safeName}-sheet.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates and parses imported JSON room data.
 */
export function validateAndParseRoomJSON(jsonString) {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format');
    }
    const widthCm = Number(parsed.widthCm) || 500;
    const depthCm = Number(parsed.depthCm) || 400;
    const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Imported Room';
    const doors = Array.isArray(parsed.doors) ? parsed.doors : [];
    const windows = Array.isArray(parsed.windows) ? parsed.windows : [];
    const placedFurniture = Array.isArray(parsed.placedFurniture) ? parsed.placedFurniture : [];

    return {
      id: `room-${Date.now()}`,
      name,
      widthCm: Math.max(200, Math.min(1500, widthCm)),
      depthCm: Math.max(200, Math.min(1500, depthCm)),
      doors,
      windows,
      placedFurniture,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error('Invalid room JSON file structure');
  }
}


