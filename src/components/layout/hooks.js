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
