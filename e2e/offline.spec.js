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

    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || reg.active?.state !== 'activated' || !navigator.serviceWorker.controller)
          return false;
        const have = [];
        for (const key of await caches.keys())
          for (const r of await (await caches.open(key)).keys()) have.push(r.url);
        const want = await fetch('./asset-manifest.json').then((r) => (r.ok ? r.json() : []));
        if (!want.length) return false;
        return want.every((file) => have.includes(new URL(file, location.href).href));
      },
      null,
      { timeout: 90000 }
    );
    const { have, want } = await page.evaluate(async () => {
      const have = [];
      for (const key of await caches.keys())
        for (const r of await (await caches.open(key)).keys()) have.push(r.url);
      return { have, want: await fetch('./asset-manifest.json').then((r) => r.json()) };
    });

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

    // and each one really can be answered from the store, with no network
    const served = await page.evaluate(
      async (names) => {
        const all = [];
        for (const key of await caches.keys())
          for (const r of await (await caches.open(key)).keys()) all.push(r);
        const out = {};
        for (const name of names) {
          const hit = all.find((r) => r.url.includes(name));
          const res = hit ? await caches.match(hit) : null;
          out[name] = Boolean(res && res.ok);
        }
        return out;
      },
      ['Room3DView', 'PhotoModelModal', 'three-']
    );
    expect(served).toEqual({ Room3DView: true, PhotoModelModal: true, 'three-': true });
  });
});
