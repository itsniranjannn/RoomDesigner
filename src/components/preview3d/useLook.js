import { useCallback, useMemo, useState } from 'react';
import { loadQuality, saveQuality, resolveQuality, detectDevice, settingsFor } from './quality.js';
import { normalizeFinish, withFinish } from './materials.js';
import { floorMaterial, wallMaterial } from './surfaceTextures.js';

/** The graphics quality choice (remembered on this device) and what it resolves to right now. */
export function useQuality() {
  const [mode, setModeState] = useState(loadQuality);
  const level = useMemo(() => resolveQuality(mode, detectDevice()), [mode]);
  const setMode = useCallback((m) => {
    setModeState(m);
    saveQuality(m);
  }, []);
  return { mode, level, settings: settingsFor(level), setMode };
}

/** Shared materials for a finish; a null entry means the classic look for that surface. */
export function useSurfaceMaterials(finish) {
  const { floor, wall } = normalizeFinish(finish);
  return useMemo(() => ({ floor: floorMaterial(floor), wall: wallMaterial(wall) }), [floor, wall]);
}

const LOOK_KEY = 'room-designer-flat-look';

function loadLook() {
  try {
    return normalizeFinish(JSON.parse(window.localStorage.getItem(LOOK_KEY)));
  } catch {
    return normalizeFinish(null);
  }
}

/** The floor and wall finish picked in the flat's 3D view (remembered on this device); null = classic. */
export function useFlatLook() {
  const [look, setLook] = useState(loadLook);
  const set = useCallback((patch) => {
    setLook((prev) => {
      const next = withFinish(prev, patch);
      try {
        window.localStorage.setItem(LOOK_KEY, JSON.stringify(next));
      } catch {
        /* blocked storage: the choice just is not remembered */
      }
      return next;
    });
  }, []);
  return { ...look, set };
}
