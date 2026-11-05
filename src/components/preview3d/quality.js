/**
 * quality.js
 * Graphics quality of the 3D views. "Auto" picks Low or High from what the device reports; Low keeps
 * phones and older laptops smooth (smaller shadows, no reflections, fewer lights), High turns on soft
 * shadows, a light environment and a sharper picture.
 */

export const QUALITY_MODES = ['auto', 'low', 'high'];
export const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto', ariaLabel: 'Automatic quality' },
  { value: 'low', label: 'Low', ariaLabel: 'Low quality' },
  { value: 'high', label: 'High', ariaLabel: 'High quality' },
];

export const normalizeQuality = (value) => (QUALITY_MODES.includes(value) ? value : 'auto');

/**
 * Low or High for this device.
 * @param {{ coarsePointer?: boolean, width?: number, memoryGb?: number, cores?: number, saveData?: boolean }} env
 */
export function resolveQuality(mode, env = {}) {
  const m = normalizeQuality(mode);
  if (m !== 'auto') return m;
  const { coarsePointer = false, width = 1280, memoryGb, cores, saveData = false } = env;
  if (saveData || coarsePointer || width < 760) return 'low';
  if (Number.isFinite(memoryGb) && memoryGb < 4) return 'low';
  if (Number.isFinite(cores) && cores < 4) return 'low';
  return 'high';
}

/** Reads the current device; safe where there is no window. */
export function detectDevice() {
  if (typeof window === 'undefined') return {};
  const nav = window.navigator || {};
  let coarsePointer = false;
  try {
    coarsePointer = !!window.matchMedia?.('(pointer: coarse)').matches;
  } catch {
    coarsePointer = false;
  }
  return {
    coarsePointer,
    width: window.innerWidth,
    memoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: !!nav.connection?.saveData,
  };
}

/** What each level turns on. */
export const QUALITY_SETTINGS = {
  low: {
    dpr: [1, 1.25],
    shadowType: 'percentage',
    shadowMap: 1024,
    contactShadows: false,
    environment: false,
    maxLamps: 2,
  },
  high: {
    dpr: [1, 2],
    shadowType: 'soft',
    shadowMap: 2048,
    contactShadows: true,
    environment: true,
    maxLamps: 4,
  },
};

export const settingsFor = (level) => QUALITY_SETTINGS[level] || QUALITY_SETTINGS.low;

const KEY = 'room-designer-3d-quality';

export function loadQuality() {
  try {
    return normalizeQuality(window.localStorage.getItem(KEY));
  } catch {
    return 'auto';
  }
}

export function saveQuality(mode) {
  try {
    window.localStorage.setItem(KEY, normalizeQuality(mode));
  } catch {
    /* private mode or blocked storage: the choice just is not remembered */
  }
}
