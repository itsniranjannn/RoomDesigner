import { test, expect } from '@playwright/test';

test('three.js executes on the landing page (chunking check)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('rd.tour.disabled', '1');
    } catch {
      /* ignore */
    }
    window.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.__longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
      }).observe({ entryTypes: ['longtask'] });
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a new room' }).waitFor();
  const info = await page.evaluate(() => ({
    threeRevision: window.__THREE__ ?? null,
    longTasks: window.__longTasks,
    totalBlockingLike: window.__longTasks.reduce((s, t) => s + Math.max(0, t.dur - 50), 0),
    heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
  }));
  console.log('LANDING PAGE:', JSON.stringify(info, null, 1));

  // Now with CPU x4
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const page2 = await context.newPage();
  const c2 = await context.newCDPSession(page2);
  await c2.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page2.goto('/');
  await page2.getByRole('button', { name: 'Start a new room' }).waitFor();
  const info2 = await page2.evaluate(() => ({
    threeRevision: window.__THREE__ ?? null,
    longTasks: window.__longTasks,
    totalBlockingLike: window.__longTasks.reduce((s, t) => s + Math.max(0, t.dur - 50), 0),
    heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
  }));
  console.log('LANDING PAGE CPUx4:', JSON.stringify(info2, null, 1));

  await context.close();
  expect(true).toBe(true);
});

test('landing page without the three chunk', async ({ browser }) => {
  // Block the three chunk entirely: if the landing page still works, three is not needed
  // at first paint. If it breaks, the entry really does depend on it.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('rd.tour.disabled', '1');
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/assets/three-*.js', (r) => r.abort());
  await page.goto('/');
  await page.waitForTimeout(3000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('WITHOUT THREE CHUNK -> errors:', JSON.stringify(errors.slice(0, 3)));
  console.log('WITHOUT THREE CHUNK -> visible text:', JSON.stringify(bodyText));
  await context.close();
});
