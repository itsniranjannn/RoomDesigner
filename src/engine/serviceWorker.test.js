import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

/** Runs public/sw.js against a fake worker scope and returns its event listeners plus the fake cache. */
function loadWorker({ online = true, cached = {} } = {}) {
  const listeners = {};
  const store = new Map(Object.entries(cached));
  const cache = {
    put: async (req, res) => store.set(typeof req === 'string' ? req : req.url, res),
    match: async (req) => store.get(typeof req === 'string' ? req : req.url),
    add: async () => {},
    addAll: async () => {},
  };
  const caches = {
    open: async () => cache,
    match: async (req) => cache.match(req),
    keys: async () => [],
    delete: async () => true,
  };
  const fetched = [];
  const fakeFetch = async (req) => {
    fetched.push(req.url);
    if (!online) throw new Error('offline');
    return { ok: true, clone: () => ({ copy: true }), body: 'network:' + req.url };
  };
  const self = {
    addEventListener: (type, fn) => (listeners[type] = fn),
    location: { origin: 'https://app.test' },
    registration: { scope: 'https://app.test/' },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const code = fs.readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(code, { self, caches, fetch: fakeFetch, URL, Promise, console });
  const run = async (request) => {
    let answer;
    let handled = false;
    await listeners.fetch({
      request,
      respondWith: (p) => {
        handled = true;
        answer = p;
      },
    });
    return { handled, response: handled ? await answer : undefined };
  };
  return { listeners, run, fetched, store };
}

const req = (url, extra = {}) => ({ url, method: 'GET', mode: 'cors', ...extra });

describe('service worker routing', () => {
  it('leaves cross-origin and non-GET requests to the browser', async () => {
    const w = loadWorker();
    expect((await w.run(req('https://other.test/x.js'))).handled).toBe(false);
    expect((await w.run(req('https://app.test/x', { method: 'POST' }))).handled).toBe(false);
  });

  it('serves navigations from the network and falls back to the cached shell offline', async () => {
    const online = loadWorker();
    const ok = await online.run(req('https://app.test/', { mode: 'navigate' }));
    expect(ok.response.body).toContain('network:');
    const shell = { shell: true };
    const offline = loadWorker({ online: false, cached: { './': shell } });
    // caches.match('./') looks up the shell stored under the same key
    const res = await offline.run(req('https://app.test/room/3', { mode: 'navigate' }));
    expect(res.response).toBe(shell);
  });

  it('answers assets from the cache at once and refreshes them in the background', async () => {
    const cachedAsset = { cachedAsset: true };
    const w = loadWorker({ cached: { 'https://app.test/assets/app.js': cachedAsset } });
    const res = await w.run(req('https://app.test/assets/app.js'));
    expect(res.response).toBe(cachedAsset);
    expect(w.fetched).toContain('https://app.test/assets/app.js');
  });

  it('fetches uncached assets and keeps working offline for cached ones', async () => {
    const w = loadWorker();
    const res = await w.run(req('https://app.test/assets/new.js'));
    expect(res.response.body).toContain('network:');
    const offline = loadWorker({ online: false, cached: { 'https://app.test/a.css': { c: 1 } } });
    expect((await offline.run(req('https://app.test/a.css'))).response).toEqual({ c: 1 });
  });
});
