import { test, expect } from '@playwright/test';

const TYPES = [
  'dining-chair',
  'side-table',
  'ottoman',
  'nightstand',
  'bar-stool',
  'floor-plant',
  'floor-lamp',
  'coffee-table',
];

/** Writes a room with `count` pieces straight into IndexedDB, then reloads into it. */
async function seedRoom(page, count, { widthCm = 1500, depthCm = 1500 } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a new room' }).waitFor();
  await page.evaluate(
    async ({ count, widthCm, depthCm, TYPES }) => {
      const open = () =>
        new Promise((res, rej) => {
          const r = indexedDB.open('room_planner_db', 2);
          r.onupgradeneeded = () => {
            const db = r.result;
            for (const s of ['rooms', 'customFurniture', 'flats'])
              if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
          };
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      const db = await open();
      const pieces = [];
      const cols = Math.ceil(Math.sqrt(count));
      const step = Math.floor((widthCm - 200) / cols);
      for (let i = 0; i < count; i += 1) {
        const cx = 100 + (i % cols) * step;
        const cy = 100 + Math.floor(i / cols) * step;
        pieces.push({
          id: `probe-${i}`,
          furnitureTypeId: TYPES[i % TYPES.length],
          x: cx,
          y: cy,
          rotationDeg: (i % 4) * 90,
          elevationCm: 0,
        });
      }
      const room = {
        id: 'probe-room',
        name: `Probe ${count}`,
        widthCm,
        depthCm,
        doors: [
          { id: 'd1', wall: 'bottom', offsetCm: 50, widthCm: 90, swingDirection: 'inward-left' },
        ],
        windows: [{ id: 'w1', wall: 'top', offsetCm: 300, widthCm: 120 }],
        placedFurniture: pieces,
        updatedAt: new Date().toISOString(),
      };
      await new Promise((res, rej) => {
        const tx = db.transaction('rooms', 'readwrite');
        tx.objectStore('rooms').put(room);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
      localStorage.setItem('active_room_id', 'probe-room');
      db.close();
    },
    { count, widthCm, depthCm, TYPES }
  );

  const t0 = Date.now();
  await page.reload();
  await page.getByLabel('Room plan').waitFor();
  await expect(page.getByTestId('furniture-piece')).toHaveCount(count, { timeout: 60000 });
  return Date.now() - t0;
}

/** Instruments requestAnimationFrame so we can read frame timings back. */
async function startFrameProbe(page) {
  await page.evaluate(() => {
    window.__frames = [];
    window.__probing = true;
    let last = performance.now();
    const tick = (now) => {
      window.__frames.push(now - last);
      last = now;
      if (window.__probing) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function readFrameProbe(page) {
  return page.evaluate(() => {
    window.__probing = false;
    const f = window.__frames.slice(1);
    if (!f.length) return { frames: 0 };
    const sorted = f.slice().sort((a, b) => a - b);
    const total = f.reduce((s, x) => s + x, 0);
    return {
      frames: f.length,
      fps: +(1000 / (total / f.length)).toFixed(1),
      medianFrameMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
      p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
      worstFrameMs: +sorted[sorted.length - 1].toFixed(1),
    };
  });
}

async function bench(page, count, cpu, client) {
  if (cpu > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const loadMs = await seedRoom(page, count);

  const plan = page.getByLabel('Room plan');
  const box = await plan.boundingBox();

  // --- select a piece: click -> inspector shows ---
  const target = page.getByTestId('furniture-piece').nth(Math.floor(count / 2));
  const tb = await target.boundingBox();
  const tSel = Date.now();
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page
    .getByRole('complementary', { name: 'Selected piece' })
    .waitFor({ timeout: 30000 });
  const selectMs = Date.now() - tSel;

  // --- drag the selected piece: 24 pointer moves, measure frames and move cost ---
  await startFrameProbe(page);
  const start = { x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const tDrag = Date.now();
  for (let i = 1; i <= 24; i += 1) {
    await page.mouse.move(start.x + i * 3, start.y + i * 2);
  }
  const dragMs = Date.now() - tDrag;
  await page.mouse.up();
  const dragFrames = await readFrameProbe(page);

  // --- nudge with the arrow key: keystroke -> painted position change ---
  const tNudge = Date.now();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    () => true // settle below instead
  );
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const nudgeMs = Date.now() - tNudge;

  // --- undo ---
  await startFrameProbe(page);
  const tUndo = Date.now();
  await page.getByRole('button', { name: /^Undo/ }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const undoMs = Date.now() - tUndo;
  const undoFrames = await readFrameProbe(page);

  // --- select all (Ctrl+A), then move the group one step ---
  await page.mouse.click(box.x + 10, box.y + 10);
  const tAll = Date.now();
  await page.keyboard.press('Control+a');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const selectAllMs = Date.now() - tAll;

  // --- idle frame rate with everything on screen ---
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await startFrameProbe(page);
  await page.waitForTimeout(1500);
  const idleFrames = await readFrameProbe(page);

  const heapMB = await page.evaluate(() =>
    +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)
  );
  const domNodes = await page.evaluate(() => document.getElementsByTagName('*').length);

  if (cpu > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const row = {
    count,
    cpu,
    loadMs,
    selectMs,
    dragMs,
    dragMsPerMove: +(dragMs / 24).toFixed(1),
    dragFps: dragFrames.fps,
    dragP95FrameMs: dragFrames.p95FrameMs,
    dragWorstFrameMs: dragFrames.worstFrameMs,
    nudgeMs,
    undoMs,
    undoWorstFrameMs: undoFrames.worstFrameMs,
    selectAllMs,
    idleFps: idleFrames.fps,
    heapMB,
    domNodes,
  };
  console.log('CANVAS ' + JSON.stringify(row));
  return row;
}

test('plan canvas at 100 / 300 / 600 pieces', async ({ browser }) => {
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
  const rows = [];
  for (const n of [25, 100, 300, 600]) rows.push(await bench(page, n, 1, client));
  console.log('CANVAS TABLE', JSON.stringify(rows, null, 1));
  await context.close();
  expect(rows.length).toBe(4);
});
