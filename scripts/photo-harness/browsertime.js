// How long the real dialog takes on each photo in Chrome, and whether the page can still paint while it works.
// Each photo is added to the Front slot of the app served by `vite preview`; the script times the wait for the
// cut-out (from dropping the photo to the Build button coming alive) and the build (from the click to the model
// preview), and counts the animation frames the page manages in between. A frozen page paints no frames.
// Pass --vs <otherUrl> to measure each photo on two builds one after the other, which is the only fair way to
// compare them on a machine that is busy with other work.
// usage: node scripts/photo-harness/browsertime.js <baseUrl> <fixturesDir> [--vs <url>] [name.png ...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURE_FILES } from './fixtures.js';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const argv = process.argv.slice(2);
const vsAt = argv.indexOf('--vs');
const other = vsAt >= 0 ? argv[vsAt + 1] : null;
const rest = argv.filter((a, i) => vsAt < 0 || (i !== vsAt && i !== vsAt + 1));
const [base, dir, ...given] = rest;
const names = (given.length ? given : FIXTURE_FILES).filter((n) =>
  fs.existsSync(path.join(dir, n))
);

const COUNT_FRAMES = `(() => {
  window.__frames = 0;
  const tick = () => { window.__frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})()`;

async function timePhoto(browser, file, where) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  await page.goto(where);
  await page.getByRole('button', { name: 'Start a new room' }).click();
  const nd = page.getByRole('dialog', { name: 'New room' });
  await nd.getByRole('button', { name: /Living Room/ }).click();
  await nd.getByRole('button', { name: 'Create room' }).click();
  await page.getByLabel('Room plan').waitFor();
  await page.getByRole('button', { name: /Create from photos/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
  await page.evaluate(COUNT_FRAMES);
  const use = dialog.getByRole('button', { name: 'Use these views' });
  const ready = dialog.locator('button:has-text("Build 3D model"):not([disabled])');
  const t0 = Date.now();
  await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
    name: path.basename(file),
    mimeType: 'image/png',
    buffer: fs.readFileSync(file),
  });
  const failed = dialog.getByText('No object found', { exact: false });
  await Promise.race([
    use.waitFor({ timeout: 180000 }),
    ready.waitFor({ timeout: 180000 }),
    failed.waitFor({ timeout: 180000 }),
  ]);
  const read = Date.now() - t0;
  const readFrames = await page.evaluate(() => window.__frames);
  if (await use.isVisible()) {
    await use.click();
    await ready.waitFor({ timeout: 180000 });
  }
  await page.evaluate(COUNT_FRAMES);
  const t1 = Date.now();
  await ready.click({ timeout: 180000 });
  // the photo may also be one the dialog cannot read: that answer counts as the end of the work too
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="3D model preview"][data-design]') ||
      document.body.textContent.includes('No object found'),
    null,
    { timeout: 180000 }
  );
  const build = Date.now() - t1;
  if (!(await page.locator('[aria-label="3D model preview"][data-design]').count())) {
    await page.close();
    return { read, readFrames, build, buildFrames: 0, type: 'no object found' };
  }
  const design = JSON.parse(
    await dialog.getByLabel('3D model preview').getAttribute('data-design')
  );
  const buildFrames = await page.evaluate(() => window.__frames);
  await page.close();
  return { read, readFrames, build, buildFrames, type: design.type };
}

const browser = await chromium.launch({ channel: 'chrome' });
const fps = (n, ms) => (ms > 0 ? ((n * 1000) / ms).toFixed(0) : '-');
const show = (r) =>
  `read ${String(r.read).padStart(6)} ms (${fps(r.readFrames, r.read).padStart(3)} fps)  build ${String(r.build).padStart(6)} ms (${fps(r.buildFrames, r.build).padStart(3)} fps)`;
const rows = [];
for (const name of names) {
  const one = async (where) => {
    try {
      return await timePhoto(browser, path.join(dir, name), where);
    } catch (err) {
      return { failed: err.message.split(/\r?\n/)[0] };
    }
  };
  const a = await one(base);
  const b = other ? await one(other) : null;
  if (!a.failed) rows.push({ name, ...a });
  console.log(`${name.padEnd(32)} ${a.failed ? `FAILED ${a.failed}` : `${show(a)}  ${a.type}`}`);
  if (b) console.log(`${''.padEnd(32)} vs ${b.failed ? `FAILED ${b.failed}` : show(b)}`);
}
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log(`total read ${sum('read')} ms, build ${sum('build')} ms over ${rows.length} photos`);
await browser.close();
