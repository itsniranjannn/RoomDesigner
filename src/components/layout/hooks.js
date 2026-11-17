import { useCallback, useState, useSyncExternalStore } from 'react';

/** True while the viewport matches the media query (updates on resize). */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Boolean kept in localStorage so panel layout survives reloads. */
export function usePersistentFlag(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch {
      /* storage can be blocked; fall back to the default */
    }
    return initial;
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          window.localStorage.setItem(key, resolved ? '1' : '0');
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, update];
}

/**
 * Moves focus to the first element matching `selector` once it appears, and only while focus
 * has been lost.
 *
 * Several controls here remove themselves by doing their job: "Create room" closes the
 * landing page, a row in the Pieces list is replaced by that piece's panel, "Back to all
 * rooms" takes the whole top bar away. The browser drops focus onto <body> when that
 * happens, so the next Tab restarts at the top of the page.
 *
 * It watches for a stretch of time rather than a count of frames. A screen with animation on
 * it can take far longer than ten frames to settle on a slow or busy machine, and the frame
 * clock itself slows down exactly then, so a frame budget runs out soonest when it is needed
 * most. It stops early once the focus has landed somewhere that is staying.
 */
export function focusWhenReady(selector, withinMs = 2000) {
  const until = Date.now() + withinMs;
  let moved = false;
  const attempt = () => {
    const target = document.querySelector(selector);
    const active = document.activeElement;
    const lost = !active || active === document.body || !document.contains(active);
    // Anything still on the page keeps the focus it was given
    if (target && lost) {
      target.focus();
      moved = true;
    }
    // Keep watching: what is going away may not have gone yet — a dialog hands the focus back to
    // whatever opened it as it unmounts, a frame or two after it was asked to close — and what
    // replaces it may itself be replaced as the new screen settles, dropping the focus again.
    // Once focus has been placed and is still held, there is nothing left to wait for.
    if (moved && !lost) return;
    if (Date.now() < until) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
