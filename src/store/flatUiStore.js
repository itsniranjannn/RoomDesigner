/**
 * flatUiStore.js
 * Transient interface state for the flat designer (active tool, cursor, stair being
 * placed, messages). Nothing here is saved with the flat.
 */

import { create } from 'zustand';

export const TOOLS = ['select', 'wall', 'eraser', 'door', 'window', 'stairs'];

export const useFlatUi = create((set) => ({
  tool: 'select',
  cursor: null, // { x, y } in cm while the pointer is over the plan
  stairType: 'straight',
  stairRotation: 0,
  fitNonce: 0, // bump to ask the plan to fit itself to the screen
  zoomPercent: 100,
  notice: null,

  setTool: (tool) => set({ tool: TOOLS.includes(tool) ? tool : 'select', notice: null }),
  setCursor: (cursor) => set({ cursor }),
  setStairType: (stairType) => set({ stairType }),
  rotateStair: () => set((s) => ({ stairRotation: (s.stairRotation + 90) % 360 })),
  requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
  setZoomPercent: (zoomPercent) => set({ zoomPercent }),
  setNotice: (notice) => set({ notice }),
}));
