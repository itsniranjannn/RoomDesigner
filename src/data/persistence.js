/**
 * persistence.js
 * IndexedDB storage layer using the `idb` library.
 * Zero-backend, fully local persistence.
 */

import { openDB } from 'idb';

const DB_NAME = 'room_planner_db';
const DB_VERSION = 2;
const STORE_ROOMS = 'rooms';
const STORE_CUSTOM = 'customFurniture';
const STORE_FLATS = 'flats';
const ACTIVE_ROOM_KEY = 'active_room_id';

export async function getDB() {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  return openDB(DB_NAME, DB_VERSION, {
    // v1: rooms. v2: custom (photo-made) furniture and flat plans. Existing rooms are preserved.
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_ROOMS)) {
        db.createObjectStore(STORE_ROOMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM)) {
        db.createObjectStore(STORE_CUSTOM, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FLATS)) {
        db.createObjectStore(STORE_FLATS, { keyPath: 'id' });
      }
    },
  });
}

/** Remembers which room to reopen on the next visit (best effort: storage may be unavailable). */
export function setActiveRoomId(id) {
  try {
    localStorage.setItem(ACTIVE_ROOM_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

export function clearActiveRoomId() {
  try {
    localStorage.removeItem(ACTIVE_ROOM_KEY);
  } catch {
    /* storage unavailable */
  }
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
    setActiveRoomId(room.id);
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
    let activeId = null;
    try {
      activeId = localStorage.getItem(ACTIVE_ROOM_KEY);
    } catch {
      /* storage unavailable */
    }
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
    try {
      if (localStorage.getItem(ACTIVE_ROOM_KEY) === id) clearActiveRoomId();
    } catch {
      /* storage unavailable */
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


// ---------- Custom furniture (made from photos) ----------

export async function saveCustomFurnitureToDB(def) {
  const db = await getDB();
  if (!db) return def;
  await db.put(STORE_CUSTOM, def);
  return def;
}

export async function listCustomFurnitureFromDB() {
  try {
    const db = await getDB();
    if (!db) return [];
    return (await db.getAll(STORE_CUSTOM)) || [];
  } catch (err) {
    if (import.meta.env?.DEV) console.error('Failed to list custom furniture:', err);
    return [];
  }
}

export async function deleteCustomFurnitureFromDB(id) {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_CUSTOM, id);
}

// ---------- Flat plans ----------

export async function saveFlatToDB(flat) {
  const db = await getDB();
  if (!db) return flat;
  const updated = { ...flat, updatedAt: new Date().toISOString() };
  await db.put(STORE_FLATS, updated);
  return updated;
}

export async function listFlatsFromDB() {
  try {
    const db = await getDB();
    if (!db) return [];
    return (await db.getAll(STORE_FLATS)) || [];
  } catch (err) {
    if (import.meta.env?.DEV) console.error('Failed to list flats:', err);
    return [];
  }
}

export async function loadFlatFromDB(id) {
  try {
    const db = await getDB();
    if (!db) return null;
    return (await db.get(STORE_FLATS, id)) || null;
  } catch {
    return null;
  }
}

export async function deleteFlatFromDB(id) {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_FLATS, id);
}
