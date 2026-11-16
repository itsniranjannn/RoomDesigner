/**
 * planningStore.js
 * Editor-only state for the planning tools: which panel is open, which service point is
 * being placed or selected, the highlight shown by a "Show" button, the check options and
 * the keyboard crosshair the drawing surfaces share. Nothing here is saved with the room.
 */

import { create } from 'zustand';

// ---------- keyboard crosshair ----------
// The drawing surfaces are transparent SVG rectangles with pointer handlers, so without a
// crosshair there is no way to say "here" with a keyboard. One crosshair serves the room
// plan (service points, measuring) and the flat plan (walls, doors, windows, stairs).

/** One arrow-key step, in centimetres. */
export const CROSSHAIR_STEP_CM = 10;
/** One arrow-key step with Shift held, in centimetres. */
export const CROSSHAIR_BIG_STEP_CM = 50;

const ARROW_DELTAS = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/** True when this key is one of the four arrows the crosshair answers to. */
export const isCrosshairKey = (key) => Object.hasOwn(ARROW_DELTAS, key);

/** Keeps a point inside bounds = { minX, minY, maxX, maxY }, rounded to whole centimetres. */
export function clampCrosshair(point, bounds) {
  const lowX = Math.min(bounds.minX, bounds.maxX);
  const highX = Math.max(bounds.minX, bounds.maxX);
  const lowY = Math.min(bounds.minY, bounds.maxY);
  const highY = Math.max(bounds.minY, bounds.maxY);
  return {
    x: Math.round(Math.max(lowX, Math.min(highX, point.x))),
    y: Math.round(Math.max(lowY, Math.min(highY, point.y))),
  };
}

/** Where an arrow key takes the crosshair. Shift moves a long step instead of a short one. */
export function nudgeCrosshair(point, key, shiftKey, bounds) {
  const delta = ARROW_DELTAS[key];
  if (!delta) return clampCrosshair(point, bounds);
  const step = shiftKey ? CROSSHAIR_BIG_STEP_CM : CROSSHAIR_STEP_CM;
  return clampCrosshair({ x: point.x + delta.dx * step, y: point.y + delta.dy * step }, bounds);
}

/**
 * Where the crosshair appears on the first arrow key: the middle of the plan, moved onto the
 * step grid so the far walls stay exactly reachable.
 */
export function crosshairHome(bounds) {
  const onGrid = (v) => Math.round(v / CROSSHAIR_STEP_CM) * CROSSHAIR_STEP_CM;
  return clampCrosshair(
    { x: onGrid((bounds.minX + bounds.maxX) / 2), y: onGrid((bounds.minY + bounds.maxY) / 2) },
    bounds
  );
}

/** "250 cm across, 200 cm down" — how a crosshair position is read out. */
export const crosshairWords = (point) => `${point.x} cm across, ${point.y} cm down`;

export const usePlanningStore = create((set, get) => ({
  // 'services' | 'checks' | null: one floating panel at a time
  panel: null,
  // Which side of the plan the floating panel sits on ('right' | 'left')
  panelSide: 'right',
  // Kind of service point the next click on the plan places (null: just selecting)
  placeKind: null,
  selectedServiceId: null,
  // Drawn ring on the plan: { x, y, key } (key changes so the pulse restarts)
  highlight: null,
  // Stricter widths, 120 cm routes and the turning circle check
  accessible: false,
  // Draw where a 150 cm circle fits
  showTurning: false,
  // Draw the service points on the plan
  showServices: true,
  // Draw dashed links from pieces to the service points they rely on
  showLinks: true,
  // { x, y } in cm while a keyboard is driving the plan, otherwise null. Drawn on the plan,
  // so it is set only by the arrow keys and never by the pointer.
  crosshair: null,
  // What the role="status" lines say about the crosshair: where it is, or what it just did
  crosshairStatus: '',

  openPanel: (panel) => {
    set({ panel, ...(panel === 'services' ? {} : { placeKind: null }) });
  },
  closePanel: () =>
    set({ panel: null, placeKind: null, highlight: null, crosshair: null, crosshairStatus: '' }),
  togglePanel: (panel) => {
    if (get().panel === panel) get().closePanel();
    else get().openPanel(panel);
  },

  startPlacing: (kind) =>
    set({
      panel: 'services',
      placeKind: kind,
      selectedServiceId: null,
      crosshair: null,
      crosshairStatus: '',
    }),
  stopPlacing: () => set({ placeKind: null, crosshair: null, crosshairStatus: '' }),

  // The crosshair and the line read out about it always move together
  setCrosshair: (crosshair, crosshairStatus = '') => set({ crosshair, crosshairStatus }),
  sayCrosshair: (crosshairStatus) => set({ crosshairStatus }),
  clearCrosshair: () => {
    const { crosshair, crosshairStatus } = get();
    if (crosshair || crosshairStatus) set({ crosshair: null, crosshairStatus: '' });
  },

  selectService: (id) => set({ selectedServiceId: id, placeKind: null }),
  clearServiceSelection: () => set({ selectedServiceId: null }),

  showHighlight: (x, y) => set({ highlight: { x, y, key: Date.now() } }),
  clearHighlight: () => set({ highlight: null }),

  setAccessible: (accessible) => set({ accessible: !!accessible }),
  setShowTurning: (showTurning) => set({ showTurning: !!showTurning }),
  setShowServices: (showServices) => set({ showServices: !!showServices }),
  setPanelSide: (panelSide) => set({ panelSide: panelSide === 'left' ? 'left' : 'right' }),
  setShowLinks: (showLinks) => set({ showLinks: !!showLinks }),

  // Escape: step back one level (stop placing, then deselect). True when something changed.
  // The crosshair goes with the step, so one press clears both the mark and the mode.
  escape: () => {
    const { placeKind, selectedServiceId } = get();
    if (placeKind) {
      set({ placeKind: null, crosshair: null, crosshairStatus: '' });
      return true;
    }
    if (selectedServiceId) {
      set({ selectedServiceId: null, crosshair: null, crosshairStatus: '' });
      return true;
    }
    return false;
  },
}));
