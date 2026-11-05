import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ERROR_LOG_KEY,
  MAX_ENTRIES,
  recordError,
  readErrorLog,
  clearErrorLog,
  formatErrorLog,
  formatErrorDetails,
  installGlobalErrorHandlers,
  _resetInstalledForTests,
} from './errorLog.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('location', { pathname: '/app/', hash: '#share=SECRETROOMDATA' });
  vi.stubGlobal('navigator', { userAgent: 'TestAgent/1.0' });
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete globalThis.__ROOM_STUDIO_ERROR_HOOK__;
  _resetInstalledForTests();
});

describe('error log', () => {
  it('records message, version, route without share data, and user agent', () => {
    const entry = recordError('window.error', new TypeError('boom'));
    expect(entry.name).toBe('TypeError');
    expect(entry.message).toBe('boom');
    expect(entry.userAgent).toBe('TestAgent/1.0');
    expect(entry.version).toMatch(/\d/);
    expect(entry.route).toBe('/app/#share');
    expect(JSON.stringify(readErrorLog())).not.toContain('SECRETROOMDATA');
  });

  it('keeps only the last 50 entries', () => {
    for (let i = 0; i < MAX_ENTRIES + 10; i += 1) {
      vi.advanceTimersByTime(5000);
      recordError('window.error', new Error(`e${i}`));
    }
    const log = readErrorLog();
    expect(log).toHaveLength(MAX_ENTRIES);
    expect(log[0].message).toBe('e10');
    expect(log.at(-1).message).toBe(`e${MAX_ENTRIES + 9}`);
  });

  it('ignores an identical repeat within two seconds', () => {
    const err = new Error('same');
    expect(recordError('window.error', err)).not.toBeNull();
    expect(recordError('window.error', err)).toBeNull();
    vi.advanceTimersByTime(3000);
    expect(recordError('window.error', err)).not.toBeNull();
    expect(readErrorLog()).toHaveLength(2);
  });

  it('accepts non-Error values and truncates long text', () => {
    const entry = recordError('unhandledrejection', 'x'.repeat(1000));
    expect(entry.message.length).toBeLessThan(400);
    vi.advanceTimersByTime(5000);
    expect(recordError('unhandledrejection', undefined).message).toBe('');
  });

  it('calls the optional hook and survives a throwing hook', () => {
    const hook = vi.fn(() => {
      throw new Error('hook failed');
    });
    globalThis.__ROOM_STUDIO_ERROR_HOOK__ = hook;
    expect(recordError('error-boundary', new Error('a'))).not.toBeNull();
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook.mock.calls[0][0].source).toBe('error-boundary');
  });

  it('clears the log and tolerates corrupt or blocked storage', () => {
    recordError('window.error', new Error('a'));
    clearErrorLog();
    expect(readErrorLog()).toEqual([]);
    localStorage.setItem(ERROR_LOG_KEY, '{not json');
    expect(readErrorLog()).toEqual([]);
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', {
      getItem: blocked,
      setItem: blocked,
      removeItem: blocked,
    });
    expect(() => recordError('window.error', new Error('b'))).not.toThrow();
    expect(readErrorLog()).toEqual([]);
  });

  it('formats a report for pasting', () => {
    recordError('error-boundary', new Error('render failed'), { componentStack: '\n  at Foo' });
    const text = formatErrorLog();
    expect(text).toContain('Errors recorded: 1');
    expect(text).toContain('render failed');
    expect(text).toContain('at Foo');
    expect(formatErrorDetails(new Error('now'))).toContain('Error: now');
  });

  it('installs window listeners once', () => {
    const handlers = {};
    const target = { addEventListener: (type, fn) => (handlers[type] = fn) };
    expect(installGlobalErrorHandlers(target)).toBe(true);
    expect(installGlobalErrorHandlers(target)).toBe(false);
    handlers.error({ error: new Error('uncaught') });
    handlers.unhandledrejection({ reason: new Error('rejected') });
    expect(readErrorLog().map((e) => e.source)).toEqual(['window.error', 'unhandledrejection']);
  });
});
