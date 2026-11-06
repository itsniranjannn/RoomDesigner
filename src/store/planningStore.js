/**
 * planningStore.js
 * Editor-only state for the planning tools: which panel is open, which service point is
 * being placed or selected, the highlight shown by a "Show" button, and the check options.
 * Nothing here is saved with the room.
 */

import { create } from 'zustand';

export const usePlanningStore = create((set, get) => ({
  // 'services' | 'checks' | null: one floating panel at a time
  panel: null,
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

  openPanel: (panel) => {
    set({ panel, ...(panel === 'services' ? {} : { placeKind: null }) });
  },
  closePanel: () => set({ panel: null, placeKind: null, highlight: null }),
  togglePanel: (panel) => {
    if (get().panel === panel) get().closePanel();
    else get().openPanel(panel);
  },

  startPlacing: (kind) => set({ panel: 'services', placeKind: kind, selectedServiceId: null }),
  stopPlacing: () => set({ placeKind: null }),

  selectService: (id) => set({ selectedServiceId: id, placeKind: null }),
  clearServiceSelection: () => set({ selectedServiceId: null }),

  showHighlight: (x, y) => set({ highlight: { x, y, key: Date.now() } }),
  clearHighlight: () => set({ highlight: null }),

  setAccessible: (accessible) => set({ accessible: !!accessible }),
  setShowTurning: (showTurning) => set({ showTurning: !!showTurning }),
  setShowServices: (showServices) => set({ showServices: !!showServices }),
  setShowLinks: (showLinks) => set({ showLinks: !!showLinks }),

  // Escape: step back one level (stop placing, then deselect). True when something changed.
  escape: () => {
    const { placeKind, selectedServiceId } = get();
    if (placeKind) {
      set({ placeKind: null });
      return true;
    }
    if (selectedServiceId) {
      set({ selectedServiceId: null });
      return true;
    }
    return false;
  },
}));
