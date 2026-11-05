/**
 * renderSettings.js
 * Choices for the high-quality "Render image" export, and the size limits that keep it within what a
 * browser canvas and GPU can produce. Pure, so it is tested without a renderer.
 */

/** Longest side a render may have, whatever the screen: keeps below common GPU and canvas limits. */
export const MAX_RENDER_SIDE = 4096;
/** Most pixels a render may have in total (about 16 megapixels). */
export const MAX_RENDER_PIXELS = 16_000_000;

export const RENDER_SIZES = [
  { value: 'standard', label: 'Standard (2x)', scale: 2, widthPx: 2048 },
  { value: 'large', label: 'Large (3x)', scale: 3, widthPx: 3072 },
  { value: 'max', label: 'Maximum (4096 px wide)', scale: 4, widthPx: 4096 },
];

export const RENDER_BACKGROUNDS = [
  { value: 'scene', label: 'Room colors' },
  { value: 'white', label: 'White' },
  { value: 'transparent', label: 'Transparent' },
];

export const DEFAULT_RENDER_PREFS = { size: 'standard', background: 'scene', titleBlock: true };

/** Render choices from storage, with anything unknown replaced by the default. */
export function normalizeRenderPrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    size: RENDER_SIZES.some((s) => s.value === src.size) ? src.size : DEFAULT_RENDER_PREFS.size,
    background: RENDER_BACKGROUNDS.some((b) => b.value === src.background)
      ? src.background
      : DEFAULT_RENDER_PREFS.background,
    titleBlock:
      typeof src.titleBlock === 'boolean' ? src.titleBlock : DEFAULT_RENDER_PREFS.titleBlock,
  };
}

/**
 * The pixel size of a render of a view that is cssWidth x cssHeight on screen.
 * The picture keeps the view's shape, is as wide as the chosen size (never smaller than the on-screen
 * view's 1x), and is shrunk to respect the side, pixel and GPU limits.
 * @returns {{ width: number, height: number, scale: number }}
 */
export function renderSize(
  cssWidth,
  cssHeight,
  sizeKey = 'standard',
  maxTexture = MAX_RENDER_SIDE
) {
  const w = Math.max(1, Number(cssWidth) || 1);
  const h = Math.max(1, Number(cssHeight) || 1);
  const choice = RENDER_SIZES.find((s) => s.value === sizeKey) || RENDER_SIZES[0];
  // Wanted: the choice's scale, but for "max" aim at the full 4096 px width
  let scale = sizeKey === 'max' ? choice.widthPx / w : choice.scale;
  const side = Math.min(MAX_RENDER_SIDE, Number(maxTexture) || MAX_RENDER_SIDE);
  scale = Math.min(scale, side / Math.max(w, h));
  scale = Math.min(scale, Math.sqrt(MAX_RENDER_PIXELS / (w * h)));
  scale = Math.max(scale, 0.25);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  };
}

const PREFS_KEY = 'room-designer-render-prefs';

export function loadRenderPrefs() {
  try {
    return normalizeRenderPrefs(JSON.parse(window.localStorage.getItem(PREFS_KEY)));
  } catch {
    return { ...DEFAULT_RENDER_PREFS };
  }
}

export function saveRenderPrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(normalizeRenderPrefs(prefs)));
  } catch {
    /* blocked storage: the choice just is not remembered */
  }
}
