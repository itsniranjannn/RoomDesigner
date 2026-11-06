// Drives the real Create from photos dialog in Chrome with a generated photo of each furniture type and saves a
// screenshot of the dialog (photo, cut-out and built 3D model side by side) per type.
// usage: node scripts/photo-harness/synth/screens.js <baseUrl> <outDir> [type,type,...]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { buildCase, ALL_TYPES } from './corpus.js';
import { writePng } from '../pngout.js';

const [base, outDir, only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const types = only ? only.split(',') : ALL_TYPES;
const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const type of types) {
  const view = ['bed', 'sofa', 'corner-sofa', 'daybed', 'armchair', 'tub-chair', 'lounge', 'ottoman'].includes(type) ? 'three' : 'front';
  const c = buildCase({ kind: 'single', type, seed: 3, view, level: 'clean', bg: 'white' });
  const file = path.join(outDir, `_input-${type}.png`);
  writePng(file, c.img.rgba, c.img.width, c.img.height);
  const page = await browser.newPage({ viewport: { width: 1360, height: 1500 } });
  try {
    await page.addInitScript(() => window.localStorage.setItem('rd.tour.disabled', '1'));
    await page.goto(base);
    await page.getByRole('button', { name: 'Start a new room' }).click();
    const room = page.getByRole('dialog', { name: 'New room' });
    await room.getByRole('button', { name: /Living Room/ }).click();
    await room.getByRole('button', { name: 'Create room' }).click();
    await page.getByLabel('Room plan').waitFor();
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles(file);
    const build = dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ });
    await build.click();
    await dialog.getByRole('button', { name: 'Save to My furniture' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(4000);
    const line = await dialog.getByText(/Detected:|Looks like a|Best guess from one photo:/).first().innerText().catch(() => '');
    const unsure = await dialog.getByText('Not sure about this one').count();
    await dialog.screenshot({ path: path.join(outDir, `${type}.png`) });
    report.push({ type, detected: line.split('\n')[0], unsure: unsure > 0 });
    console.log(type.padEnd(13), '->', line.split('\n')[0], unsure ? '(not sure notice shown)' : '');
  } catch (err) {
    console.log(type, 'ERROR', err.message.split('\n')[0]);
    await page.screenshot({ path: path.join(outDir, `${type}-error.png`) }).catch(() => {});
  } finally {
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, '_report.json'), JSON.stringify(report, null, 2));
