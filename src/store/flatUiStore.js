/**
 * flatUiStore.js
 * Transient interface state for the flat designer (active tool, cursor, stair being
 * placed, messages). Nothing here is saved with the flat.
 */

import { create } from 'zustand';

const TOOLS = ['select', 'wall', 'eraser', 'door', 'window', 'stairs', 'passage'];

export const useFlatUi = create((set) => ({
  tool: 'select',
  cursor: null, // { x, y } in cm while the pointer is over the plan
  wallStyle: 'solid', // 'solid' | 'open': what the wall tool draws
  stairType: 'straight',
  stairRotation: 0,
  stairWidth: 100,
  stairToLevelId: null, // floor the next staircase climbs to (null = the floor above)
  stairSteps: null, // null picks the fewest comfortable steps
  passage: { lengthCm: 300, widthCm: 120, heading: 0 }, // the passage being placed
  fitNonce: 0, // bump to ask the plan to fit itself to the screen
  zoomPercent: 100,
  zoomRequest: null, // { factor, n }: toolbar buttons ask the plan to zoom about its centre
  notice: null,

  setTool: (tool) => set({ tool: TOOLS.includes(tool) ? tool : 'select', notice: null }),
  setCursor: (cursor) => set({ cursor }),
  setWallStyle: (wallStyle) => set({ wallStyle: wallStyle === 'open' ? 'open' : 'solid' }),
  setStairType: (stairType) => set({ stairType }),
  setStairOptions: (patch) => set(patch),
  setStairRotation: (deg) =>
    set({ stairRotation: (((Math.round(deg / 90) * 90) % 360) + 360) % 360 }),
  setPassage: (patch) => set((s) => ({ passage: { ...s.passage, ...patch } })),
  rotatePassage: () =>
    set((s) => ({ passage: { ...s.passage, heading: (s.passage.heading + 90) % 360 } })),
  rotateStair: () => set((s) => ({ stairRotation: (s.stairRotation + 90) % 360 })),
  requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
  requestZoom: (factor) =>
    set((s) => ({ zoomRequest: { factor, n: (s.zoomRequest?.n || 0) + 1 } })),
  setZoomPercent: (zoomPercent) => set({ zoomPercent }),
  setNotice: (notice) => set({ notice }),
}));

/** Where the plan was panned and zoomed, kept so returning from a room restores it. */
export const flatViewMemory = { flatId: null, levelId: null, view: null };
