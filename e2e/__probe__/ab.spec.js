import { test, expect } from '@playwright/test';

/** Network-bound A/B: Fast 3G, no CPU throttling, 3 cold loads, report median. */
test('cold load on Fast 3G x3', async ({ browser }) => {
  const runs = [];
  for (let i = 0; i < 3; i += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('rd.tour.disabled', '1');
      } catch {
        /* ignore */
      }
    });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'commit' });
    await page.getByRole('button', { name: 'Start a new room' }).waitFor({ state: 'visible' });
    const interactive = Date.now() - t0;
    const m = await page.evaluate(() => ({
      transferKB: Math.round(
        performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024
      ),
      decodedKB: Math.round(
        performance.getEntriesByType('resource').reduce((s, r) => s + (r.decodedBodySize || 0), 0) /
          1024
      ),
      requests: performance.getEntriesByType('resource').length,
      three: window.__THREE__ ?? null,
    }));
    runs.push({ interactive, ...m });
    await context.close();
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log('AB RUNS:', JSON.stringify(runs));
  console.log(
    'AB MEDIAN interactiveMs=' + med(runs.map((r) => r.interactive)),
    'transferKB=' + runs[0].transferKB,
    'decodedKB=' + runs[0].decodedKB,
    'threeExecuted=' + runs[0].three
  );
  expect(runs.length).toBe(3);
});
