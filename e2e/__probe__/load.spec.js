import { test, expect } from '@playwright/test';

const OUT = 'C:/Users/niranjan.katwal/AppData/Local/Temp/claude/74ef1ad76cd92579/e6359185-faba-461c-aa07-6a8f3d2b096c/scratchpad/sweep';

test.describe.configure({ mode: 'serial' });

async function measure(page, client, label, { cpu = 1, net = null } = {}) {
  const reqs = [];
  page.on('response', async (res) => {
    const req = res.request();
    let len = 0;
    try {
      const h = await res.headerValue('content-length');
      len = h ? Number(h) : 0;
    } catch {
      /* ignore */
    }
    reqs.push({ url: req.url().replace(/^https?:\/\/[^/]+/, ''), type: req.resourceType(), len });
  });

  if (cpu > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (net) {
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: net.latency,
      downloadThroughput: net.down,
      uploadThroughput: net.up,
    });
  }

  const t0 = Date.now();
  await page.goto('/', { waitUntil: 'commit' });
  await page.getByRole('button', { name: 'Start a new room' }).waitFor({ state: 'visible' });
  const interactive = Date.now() - t0;

  const paint = await page.evaluate(() => {
    const p = {};
    for (const e of performance.getEntriesByType('paint')) p[e.name] = Math.round(e.startTime);
    const nav = performance.getEntriesByType('navigation')[0] || {};
    p.domContentLoaded = Math.round(nav.domContentLoadedEventEnd || 0);
    p.loadEvent = Math.round(nav.loadEventEnd || 0);
    p.transferTotal = performance
      .getEntriesByType('resource')
      .reduce((s, r) => s + (r.transferSize || 0), 0);
    p.decodedTotal = performance
      .getEntriesByType('resource')
      .reduce((s, r) => s + (r.decodedBodySize || 0), 0);
    p.resources = performance.getEntriesByType('resource').map((r) => ({
      name: r.name.replace(/^https?:\/\/[^/]+/, ''),
      transfer: r.transferSize,
      decoded: r.decodedBodySize,
      dur: Math.round(r.duration),
    }));
    return p;
  });

  const jsHeap = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

  if (cpu > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if (net)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

  const result = { label, cpu, net: net ? net.name : 'none', interactiveMs: interactive, ...paint, jsHeap };
  console.log('\n=== ' + label + ' ===');
  console.log(
    JSON.stringify(
      {
        label,
        cpu,
        net: result.net,
        fcp: paint['first-contentful-paint'],
        dcl: paint.domContentLoaded,
        load: paint.loadEvent,
        interactiveMs: interactive,
        transferKB: Math.round(paint.transferTotal / 1024),
        decodedKB: Math.round(paint.decodedTotal / 1024),
        jsHeapMB: +(jsHeap / 1048576).toFixed(1),
      },
      null,
      1
    )
  );
  console.log('RESOURCES:');
  for (const r of paint.resources.sort((a, b) => b.decoded - a.decoded)) {
    console.log(`  ${(r.decoded / 1024).toFixed(0).padStart(6)}KB dec ${(r.transfer / 1024).toFixed(0).padStart(6)}KB xfer ${String(r.dur).padStart(6)}ms  ${r.name}`);
  }
  return result;
}

const SCENARIOS = [
  { label: 'fast desktop, no throttling' },
  { label: 'CPU x4 (mid-range phone)', cpu: 4 },
  { label: 'CPU x6 (budget phone)', cpu: 6 },
  {
    label: 'Fast 3G (1.6Mbps, 150ms RTT) + CPU x4',
    cpu: 4,
    net: { name: 'fast3g', latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 },
  },
  {
    label: 'Slow 4G (3Mbps, 100ms RTT)',
    net: { name: 'slow4g', latency: 100, down: (3 * 1024 * 1024) / 8, up: (1.5 * 1024 * 1024) / 8 },
  },
];

test('load timings across network and CPU', async ({ browser }) => {
  const out = [];
  for (const s of SCENARIOS) {
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
    out.push(await measure(page, client, s.label, s));
    await context.close();
  }
  const fs = await import('node:fs');
  fs.writeFileSync(OUT + '/load.json', JSON.stringify(out, null, 2));
  expect(out.length).toBe(SCENARIOS.length);
});
