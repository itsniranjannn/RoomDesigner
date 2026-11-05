/**
 * State logic for the first-run tour: where "seen" is remembered, how the tour is switched
 * off (for automated tests and for people who never want it), and the step reducer.
 * Everything that touches storage is wrapped in try/catch because storage can be blocked.
 */

export const TOUR_SEEN_PREFIX = 'rd.tour.seen.';
export const TOUR_DISABLED_KEY = 'rd.tour.disabled';
export const TOUR_EVENT = 'rd:start-tour';
export const TOUR_KINDS = ['room', 'flat'];

function store() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** True when `?tour=0` is in the address or the "disabled" flag is "1" in localStorage. */
export function isTourDisabled(search = globalThis.location?.search || '') {
  try {
    if (new URLSearchParams(search).get('tour') === '0') return true;
  } catch {
    /* malformed search string: treat as not disabled */
  }
  try {
    return store()?.getItem(TOUR_DISABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasSeenTour(kind) {
  try {
    return store()?.getItem(TOUR_SEEN_PREFIX + kind) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen(kind) {
  try {
    store()?.setItem(TOUR_SEEN_PREFIX + kind, '1');
  } catch {
    /* if storage is blocked the tour may show again next visit */
  }
}

export function resetTour(kind) {
  try {
    store()?.removeItem(TOUR_SEEN_PREFIX + kind);
  } catch {
    /* ignore */
  }
}

/** The tour starts by itself only on a first visit and only when not switched off. */
export function shouldAutoStart(kind) {
  return !isTourDisabled() && !hasSeenTour(kind);
}

/**
 * Ask the tour for `kind` to open (from a Help menu, say). Returns true when a tour was
 * mounted to answer. Works even when the automatic tour is disabled.
 */
export function requestTour(kind) {
  if (typeof window === 'undefined') return false;
  const detail = { kind, handled: false };
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail }));
  return detail.handled;
}

export const initialTourState = { open: false, index: 0, count: 0, finished: false };

/**
 * Pure reducer for the open/step state. `finished` is true when the tour was completed or
 * skipped, which is the moment to remember it.
 */
export function tourReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { open: action.count > 0, index: 0, count: action.count, finished: false };
    case 'next':
      if (!state.open) return state;
      if (state.index >= state.count - 1) return { ...state, open: false, finished: true };
      return { ...state, index: state.index + 1 };
    case 'prev':
      if (!state.open) return state;
      return { ...state, index: Math.max(0, state.index - 1) };
    case 'close':
      if (!state.open) return state;
      return { ...state, open: false, finished: true };
    default:
      return state;
  }
}
