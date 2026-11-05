import { test, expect } from './fixtures.js';
import { createRoomFromPreset, openApp } from './helpers.js';

/**
 * A synthetic "photo" of an armchair drawn on a canvas inside the page: a light backdrop and a
 * solid piece with a back, two arms and a seat. No real photos are used.
 */
async function makeArmchairPng(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const g = canvas.getContext('2d');
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, 640, 480);
    g.fillStyle = '#7a4b2a'; // back
    g.fillRect(170, 90, 300, 150);
    g.fillStyle = '#8e5a34'; // arms
    g.fillRect(130, 170, 60, 170);
    g.fillRect(450, 170, 60, 170);
    g.fillStyle = '#a5693c'; // seat
    g.fillRect(180, 230, 280, 110);
    g.fillStyle = '#3a2a1c'; // feet
    g.fillRect(140, 340, 24, 40);
    g.fillRect(476, 340, 24, 40);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

test.describe('create furniture from photos', () => {
  test('builds a model from a generated photo and saves it to My furniture', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);

    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await expect(dialog).toBeVisible();
    const build = dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ });
    const save = dialog.getByRole('button', { name: 'Save to My furniture' });
    await expect(build).toBeDisabled();
    await expect(save).toBeDisabled();

    const png = await makeArmchairPng(page);
    await dialog
      .getByLabel('Front photo', { exact: true })
      .setInputFiles({ name: 'armchair.png', mimeType: 'image/png', buffer: png });
    await expect(build).toBeEnabled();

    await dialog.getByRole('textbox', { name: 'Name' }).fill('Test armchair');
    await build.click();
    // Building runs on this device and can take a few seconds
    await expect(save).toBeEnabled({ timeout: 45_000 });
    await save.click();
    await expect(dialog).toBeHidden();

    // The piece is now in the catalog under My furniture
    const mine = catalog.getByRole('region', { name: 'My Furniture' });
    await expect(mine.getByRole('button', { name: /^Add Test armchair,/ })).toBeVisible();
    await expect(catalog.getByRole('button', { name: 'My furniture', exact: true })).toBeVisible();
  });
});
