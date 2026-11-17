// Opens each sweep room (see sweeprooms.js) in the real app and saves what the plan and the 3D view show, so
// every piece a photo can produce can be looked at. Console errors and anything the page logs are collected.
//   node scripts/photo-harness/sweepshots.js <baseUrl> <roomsDir> <outDir> [nameFilter]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const [base, roomsDir, outDir, filter = ''] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
// the filter may name several prefixes, so a long sweep can be split between two runs
const wanted = filter ? filter.split(',').filter(Boolean) : [];
const rooms = fs
  .readdirSync(roomsDir)
  .filter((f) => f.endsWith('.json') && (!wanted.length || wanted.some((w) => f.includes(w))))
  .filter((f) => !fs.existsSync(path.join(outDir, `${f.replace(/\.json$/, '')}-3d.png`)))
  .sort();

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const file of rooms) {
  const name = file.replace(/\.json$/, '');
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
  try {
    await page.goto(base);
    const start = page.getByRole('button', { name: 'Start a new room' });
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      const nd = page.getByRole('dialog', { name: 'New room' });
      await nd.getByRole('button', { name: /Living room/i }).click();
      await nd.getByRole('button', { name: 'Create room' }).click();
      await page.getByLabel('Room plan').waitFor();
    }
    const skipTour = async () => {
      const skip = page.getByRole('button', { name: 'Skip tour' });
      if (await skip.isVisible().catch(() => false)) await skip.click();
    };
    await skipTour();
    await page.getByRole('button', { name: /Share and export|Share & export/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Design file to open').setInputFiles(path.join(roomsDir, file));
    await page.waitForTimeout(2500);
    const close = dialog.getByRole('button', { name: /Close|Done/ }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
    await skipTour();
    // the panels take half the window: the pieces are what this looks at
    for (const name of ['Hide furniture list', 'Hide details panel']) {
      const btn = page.getByRole('button', { name }).first();
      if (await btn.isVisible().catch(() => false)) await btn.click();
    }
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Plan view' }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${name}-plan.png`) });
    await page.getByRole('button', { name: '3D view' }).click();
    await page.waitForTimeout(2500);
    const reset = page.getByRole('button', { name: 'Reset view' });
    if (await reset.isVisible().catch(() => false)) await reset.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, `${name}-3d.png`) });
    report.push({ name, problems: [...new Set(problems)] });
    console.log(
      `${name.padEnd(28)} ok${problems.length ? `  ${problems.length} console messages` : ''}`
    );
  } catch (err) {
    report.push({ name, failed: err.message.split(/\r?\n/)[0], problems: [...new Set(problems)] });
    console.log(`${name.padEnd(28)} FAILED ${err.message.split(/\r?\n/)[0]}`);
  }
  await page.close();
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
const bad = report.filter((r) => r.failed || r.problems.length);
console.log(`${report.length} rooms, ${bad.length} with something to look at`);
for (const r of bad) console.log(`  ${r.name}: ${r.failed || r.problems.slice(0, 3).join(' | ')}`);
await browser.close();
