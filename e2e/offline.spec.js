import { test, expect } from './fixtures.js';
import { openApp } from './helpers.js';

// The app is meant to keep working with no connection. Everywhere else the service worker is
// switched off so runs stay predictable; here it is the thing being tested.
//
// What is checked is that the worker has stored every file the build makes before anything goes
// wrong, which is what offline use rests on. The parts that load only when they are first needed
// (3D, the photo dialog, printable plans) used to be left out, so going offline without opening
// them first meant "Something went wrong". Cutting the connection for real cannot be tested here:
// the browser's offline switch and request blocking both cut in before the service worker, so
// even files it holds are refused, which is not how a real offline visit behaves.
test.use({ serviceWorkers: 'allow' });

test.describe('offline use', () => {
  test('the worker stores every built file, the parts loaded on demand included', async ({
    page,
  }) => {
    test.setTimeout(120000);
    await openApp(page);

    // Read the worker's state and what it holds in one go, over and over until it has everything.
    // Two readings would not do: the worker can install again between them and start a new store.
    const look = async () =>
      page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        const have = [];
        for (const key of await caches.keys())
          for (const r of await (await caches.open(key)).keys()) have.push(r.url);
        const want = await fetch('./asset-manifest.json')
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []);
        return {
          ready: reg?.active?.state === 'activated' && Boolean(navigator.serviceWorker.controller),
          have,
          want,
          missing: want.filter((f) => !have.includes(new URL(f, location.href).href)),
        };
      });

    let seen = await look();
    const until = Date.now() + 90000;
    while (Date.now() < until && (!seen.ready || !seen.want.length || seen.missing.length)) {
      await page.waitForTimeout(500);
      seen = await look();
    }
    expect(seen.ready, 'the worker should be in charge of the page').toBe(true);
    expect(seen.want.length, 'the build should list the files it made').toBeGreaterThan(0);
    expect(seen.missing, 'every built file should be stored').toEqual([]);
    const { have, want } = seen;

    // the shell itself, and the files that are only fetched when a feature is first opened
    expect(have).toContain(new URL('./', page.url()).href);
    for (const part of ['Room3DView', 'Flat3DView', 'PhotoModelModal', 'PlanSheets']) {
      expect(
        want.some((f) => f.includes(part)),
        `the build should make a separate ${part} file`
      ).toBe(true);
      expect(
        have.some((url) => url.includes(part)),
        `${part} should be stored for offline use`
      ).toBe(true);
    }

    // and every one of them really can be answered from the store, with no network. Asked of
    // each file the build lists rather than of chunk names: what Rollup calls the chunk that
    // carries the 3D library is its own business and has changed before now.
    const scripts = want.filter((f) => f.endsWith('.js'));
    expect(scripts.length, 'the build should make JavaScript files').toBeGreaterThan(3);
    const refused = await page.evaluate(async (files) => {
      const out = [];
      for (const f of files) {
        const res = await caches.match(new URL(f, location.href).href, { ignoreVary: true });
        if (!res || !res.ok) out.push(f);
      }
      return out;
    }, scripts);
    expect(refused, 'every built script should be answered from the store').toEqual([]);
  });
});
