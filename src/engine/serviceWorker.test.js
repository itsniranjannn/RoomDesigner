import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

/** Runs public/sw.js against a fake worker scope and returns its event listeners plus the fake cache. */
function loadWorker({ online = true, cached = {}, manifest = null } = {}) {
  const listeners = {};
  const store = new Map(Object.entries(cached));
  const added = [];
  const cache = {
    put: async (req, res) => store.set(typeof req === 'string' ? req : req.url, res),
    match: async (req) => store.get(typeof req === 'string' ? req : req.url),
    add: async (url) => {
      added.push(url);
    },
    addAll: async (urls) => added.push(...urls),
  };
  // Every cache lookup records the options it was given, so a test can insist on ignoreVary
  const lookups = [];
  const caches = {
    open: async () => cache,
    match: async (req, options) => {
      lookups.push({ url: typeof req === 'string' ? req : req.url, options });
      return cache.match(req);
    },
    keys: async () => [],
    delete: async () => true,
  };
  const fetched = [];
  const fakeFetch = async (req) => {
    const url = typeof req === 'string' ? req : req.url;
    fetched.push(url);
    if (!online) throw new Error('offline');
    if (url.endsWith('asset-manifest.json'))
      return { ok: manifest !== null, json: async () => manifest || [] };
    return { ok: true, clone: () => ({ copy: true }), body: 'network:' + url };
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
  const install = async () => {
    let waited;
    await listeners.install({ waitUntil: (p) => (waited = p) });
    await waited;
  };
  return { listeners, run, fetched, store, added, install, lookups };
}

const req = (url, extra = {}) => ({ url, method: 'GET', mode: 'cors', ...extra });

describe('what the service worker stores when it installs', () => {
  it('stores every file the build lists, so parts loaded on demand work offline', async () => {
    const w = loadWorker({
      cached: { './': { text: async () => '<script src="/assets/index-abc.js"></script>' } },
      manifest: ['./assets/index-abc.js', './assets/three-xyz.js', './assets/Room3DView-1.js'],
    });
    await w.install();
    expect(w.added).toContain('https://app.test/assets/Room3DView-1.js');
    expect(w.added).toContain('https://app.test/assets/three-xyz.js');
    expect(w.added).toContain('./');
  });

  it('still stores what the page itself loads when the list is missing', async () => {
    const w = loadWorker({
      cached: { './': { text: async () => '<script src="/assets/index-abc.js"></script>' } },
    });
    await w.install();
    expect(w.added).toContain('https://app.test/assets/index-abc.js');
  });
});

describe('serving stored files back', () => {
  it('ignores Vary, so files stored on install are still found', async () => {
    // The build's scripts and stylesheet are requested with crossorigin, so the browser sends an
    // Origin header the stored copies were not fetched with. A host answering "Vary: Origin" would
    // turn every one of those into a miss and the app would not start offline.
    const w = loadWorker({ online: false, cached: { 'https://app.test/assets/app.js': { a: 1 } } });
    await w.run(req('https://app.test/assets/app.js'));
    await w.run(req('https://app.test/', { mode: 'navigate' }));
    expect(w.lookups.length).toBeGreaterThanOrEqual(2);
    for (const look of w.lookups) expect(look.options).toEqual({ ignoreVary: true });
  });
});

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
