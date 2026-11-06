// Drives the Create from photos dialog in Chrome (an app served by `vite preview`) with a picture and saves
// screenshots of the 3D preview. ORBIT=dx,dy drags the preview; TAB=Front|Left|... picks the compared photo.
// usage: node scripts/photo-harness/shoot.js <baseUrl> <pngPath> <outPrefix> [sheet | crop:<slot label>:<x0>:<y0>:<x1>:<y1> (fractions)]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const [base, png, outPrefix, mode = 'sheet'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
page.on('pageerror', (e) => console.error('PAGEERR', e.message));
await page.goto(base);
await page.getByRole('button', { name: 'Start a new room' }).click();
const nd = page.getByRole('dialog', { name: 'New room' });
await nd.getByRole('button', { name: /Living Room/ }).click();
await nd.getByRole('button', { name: 'Create room' }).click();
await page.getByLabel('Room plan').waitFor();
await page.getByRole('button', { name: /Create from photos/ }).click();
const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
await dialog.waitFor();
// the first-run guide may be open: close it if there is a dismiss button
const buf = fs.readFileSync(png);
if (mode === 'sheet') {
  await dialog.getByRole('button', { name: /Split one picture into views/ }).waitFor();
  await dialog
    .getByLabel('Picture with several views')
    .setInputFiles({ name: 'sheet.png', mimeType: 'image/png', buffer: buf });
  const use = dialog.getByRole('button', { name: 'Use these views' });
  await use.waitFor({ timeout: 30000 });
  await use.click();
} else {
  const [, slotLabel, x0, y0, x1, y1] = mode.split(':');
  const b64 = await page.evaluate(
    async ({ data, f }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + data;
      await img.decode();
      const c = document.createElement('canvas');
      const sx = f[0] * img.width,
        sy = f[1] * img.height,
        sw = (f[2] - f[0]) * img.width,
        sh = (f[3] - f[1]) * img.height;
      c.width = sw;
      c.height = sh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      return c.toDataURL('image/png').split(',')[1];
    },
    { data: buf.toString('base64'), f: [x0, y0, x1, y1].map(Number) }
  );
  await dialog
    .getByLabel(`${slotLabel} photo`, { exact: true })
    .setInputFiles({ name: 'one.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
}
const build = dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ });
await build.click();
await dialog.getByRole('button', { name: 'Save to My furniture' }).isEnabled();
await page.waitForFunction(
  () => /Detected:|Looks like a|Best guess from one photo:/.test(document.body.innerText),
  null,
  {
    timeout: 60000,
  }
);
await page.waitForTimeout(2500);
const text = await dialog.innerText();
const m = text.match(/(Detected:|Looks like a|Best guess from one photo:)[^\n]*\n?[^\n]*/);
console.log(outPrefix, '=>', (m ? m[0] : 'NO DETECTION').replace(/\n/g, ' | '));
if (process.env.TAB) {
  await dialog
    .getByRole('group', { name: 'Photo to compare with' })
    .getByRole('button', { name: process.env.TAB, exact: true })
    .click();
  await page.waitForTimeout(1500);
}
const prev = dialog.getByLabel('3D model preview');
await prev.screenshot({ path: outPrefix + '-model.png' });
const box = await prev.boundingBox();
if (box && process.env.ORBIT) {
  const [dx, dy] = process.env.ORBIT.split(',').map(Number);
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await prev.screenshot({ path: outPrefix + '-model-orbit.png' });
}
await dialog.screenshot({ path: outPrefix + '-dialog.png' });
await browser.close();
