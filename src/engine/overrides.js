/**
 * overrides.js
 * Validation of per-piece overrides (custom size and colour) shared by the store and imports.
 */

import { clamp } from './geometry.js';

const SIZE_LIMITS = {
  widthCm: [10, 600],
  depthCm: [10, 600],
  heightCm: [1, 400],
};

/**
 * Keeps only valid per-piece size and colour overrides; returns undefined when none remain.
 * With the piece's catalog `base`, colours are dropped for colour-locked pieces.
 */
export function cleanOverrides(raw, base) {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (SIZE_LIMITS[key]) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      out[key] = clamp(Math.round(n), SIZE_LIMITS[key][0], SIZE_LIMITS[key][1]);
    } else if (base?.colorLocked) {
      continue;
    } else if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}
