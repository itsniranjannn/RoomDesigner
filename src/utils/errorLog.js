/**
 * Privacy-friendly local error log.
 *
 * Keeps the last 50 problems (uncaught errors, unhandled promise rejections and
 * error-boundary catches) in localStorage so a user can paste them into a bug report.
 * Nothing leaves the device. An entry holds the message, a trimmed stack, the app version,
 * the route (never the #share payload) and the user agent. Room contents are never recorded.
 *
 * Later wiring to a real service: set `window.__ROOM_STUDIO_ERROR_HOOK__ = (entry) => ...`
 * and every recorded entry is passed to it. The hook is wrapped in try/catch.
 */
import pkg from '../../package.json';

export const ERROR_LOG_KEY = 'rd.errorLog';
export const MAX_ENTRIES = 50;
const MAX_MESSAGE = 300;
const MAX_STACK = 1500;
const DEDUPE_MS = 2000;

export const APP_VERSION = pkg.version;

const trim = (value, max) => {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const agent = () => trim(globalThis.navigator?.userAgent || 'unknown', 200);

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Path plus the kind of hash ("#share"), never the data after "=". */
function currentRoute() {
  try {
    const { pathname = '/', hash = '' } = globalThis.location || {};
    const kind = hash.split('=')[0];
    return `${pathname}${kind && kind !== '#' ? kind : ''}`;
  } catch {
    return '/';
  }
}

export function readErrorLog() {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(ERROR_LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function writeErrorLog(entries) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(ERROR_LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* storage full or blocked: logging must never raise another error */
  }
}

export function clearErrorLog() {
  try {
    storage()?.removeItem(ERROR_LOG_KEY);
  } catch {
    /* ignore */
  }
}

/** Turn anything thrown into a plain { name, message, stack } record. */
export function describeError(error) {
  if (error && typeof error === 'object') {
    return {
      name: trim(error.name || 'Error', 80),
      message: trim(error.message || String(error), MAX_MESSAGE),
      stack: trim(error.stack || '', MAX_STACK),
    };
  }
  return { name: 'Error', message: trim(error, MAX_MESSAGE), stack: '' };
}

/**
 * Record one problem. `source` is 'window.error', 'unhandledrejection' or 'error-boundary'.
 * Returns the stored entry, or null when it repeats the previous one within two seconds.
 */
export function recordError(source, error, extra = {}) {
  try {
    const entry = {
      time: new Date().toISOString(),
      source,
      ...describeError(error),
      ...(extra.componentStack ? { componentStack: trim(extra.componentStack, 800) } : {}),
      version: APP_VERSION,
      route: currentRoute(),
      userAgent: agent(),
    };
    const entries = readErrorLog();
    const last = entries[entries.length - 1];
    if (
      last &&
      last.source === entry.source &&
      last.message === entry.message &&
      last.stack === entry.stack &&
      Date.parse(entry.time) - Date.parse(last.time) < DEDUPE_MS
    ) {
      return null;
    }
    entries.push(entry);
    writeErrorLog(entries);
    try {
      globalThis.__ROOM_STUDIO_ERROR_HOOK__?.(entry);
    } catch {
      /* a broken hook must not break the app */
    }
    return entry;
  } catch {
    return null;
  }
}

/** Plain text for a bug report. */
export function formatErrorLog(entries = readErrorLog()) {
  const header = [
    `Room Designer Studio ${APP_VERSION}`,
    `Route: ${currentRoute()}`,
    `Browser: ${agent()}`,
    `Errors recorded: ${entries.length}`,
  ];
  const body = entries.map((e, i) =>
    [
      '',
      `#${i + 1} ${e.time} [${e.source}] ${e.name}: ${e.message}`,
      `  version ${e.version}, route ${e.route}`,
      e.stack ? `  ${e.stack.split('\n').join('\n  ')}` : '',
      e.componentStack ? `  Component stack:${e.componentStack.split('\n').join('\n  ')}` : '',
    ]
      .filter((line) => line !== '')
      .join('\n')
  );
  return [...header, ...body].join('\n');
}

/** Text for the error screen: the current error with the app version and route. */
export function formatErrorDetails(error, extra = {}) {
  const current = describeError(error);
  return [
    `Room Designer Studio ${APP_VERSION}`,
    `Route: ${currentRoute()}`,
    `Browser: ${agent()}`,
    `${current.name}: ${current.message}`,
    current.stack,
    extra.componentStack ? `Component stack:${trim(extra.componentStack, 800)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

let installed = false;

/** Listen for uncaught errors and unhandled rejections once per page. */
export function installGlobalErrorHandlers(target = globalThis.window) {
  if (installed || !target?.addEventListener) return false;
  installed = true;
  target.addEventListener('error', (event) => {
    recordError('window.error', event.error || event.message || 'Unknown error');
  });
  target.addEventListener('unhandledrejection', (event) => {
    recordError('unhandledrejection', event.reason ?? 'Unhandled promise rejection');
  });
  return true;
}

/** Test helper. */
export function _resetInstalledForTests() {
  installed = false;
}

/** Copy text to the clipboard; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
