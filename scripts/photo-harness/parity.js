// Checks that the photo dialog in Chrome builds exactly what the engine's tests build from the same picture: each
// photo is added to the Front slot of the real dialog (an app served by `vite preview`), the record it builds is
// read from the preview (data-design, data-dims), and compared with photoTestKit.dialogPhoto in node.
// usage: node scripts/photo-harness/parity.js <baseUrl> <fixturesDir> <name.png> [more.png ...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { readLikeDialog } from './png.js';
import { dialogPhoto } from '../../src/engine/photoTestKit.js';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const [base, dir, ...names] = process.argv.slice(2);

/** The record the real dialog builds from a picture added to its Front slot. */
async function inDialog(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  await page.goto(base);
  await page.getByRole('button', { name: 'Start a new room' }).click();
  const nd = page.getByRole('dialog', { name: 'New room' });
  await nd.getByRole('button', { name: /Living Room/ }).click();
  await nd.getByRole('button', { name: 'Create room' }).click();
  await page.getByLabel('Room plan').waitFor();
  await page.getByRole('button', { name: /Create from photos/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
  await dialog
    .getByLabel('Front photo', { exact: true })
    .setInputFiles({
      name: path.basename(file),
      mimeType: 'image/png',
      buffer: fs.readFileSync(file),
    });
  const use = dialog.getByRole('button', { name: 'Use these views' });
  const ready = dialog.locator('button:has-text("Build 3D model"):not([disabled])');
  await Promise.race([use.waitFor({ timeout: 120000 }), ready.waitFor({ timeout: 120000 })]);
  await page.waitForTimeout(300);
  if (await use.isVisible()) await use.click();
  await ready.click();
  const preview = dialog.getByLabel('3D model preview');
  await page.waitForFunction(
    () => document.querySelector('[aria-label="3D model preview"][data-design]'),
    null,
    { timeout: 120000 }
  );
  const design = JSON.parse(await preview.getAttribute('data-design'));
  const dims = JSON.parse(await preview.getAttribute('data-dims'));
  await page.close();
  return { design, dims };
}

const browser = await chromium.launch({ channel: 'chrome' });
let same = 0;
for (const name of names) {
  const file = path.join(dir, name);
  const node = dialogPhoto(readLikeDialog(file));
  const chrome = await inDialog(browser, file);
  const a = JSON.stringify(node.design);
  const b = JSON.stringify(chrome.design);
  const ok = a === b && JSON.stringify(node.dims) === JSON.stringify(chrome.dims);
  if (ok) same++;
  console.log(`${ok ? 'same' : 'DIFF'} ${name}`);
  if (!ok)
    console.log(
      `  node   ${a} ${JSON.stringify(node.dims)}\n  chrome ${b} ${JSON.stringify(chrome.dims)}`
    );
}
console.log(`${same}/${names.length} built the same in the dialog and in node`);
await browser.close();
