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

/**
 * A synthetic bed "product sheet" drawn on a canvas in the page: front, side, plan and three-quarter views of
 * a taupe headboard, white pillows and sheet, and a dark duvet, on white. With `only`, one view alone on its
 * own white picture. No real photos are used.
 */
async function makeBedPng(page, only) {
  const base64 = await page.evaluate((view) => {
    const poly = (g, color, pts) => {
      g.fillStyle = color;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    };
    const blob = (g, color, x, y, rx, ry) => {
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    };
    const head = '#aaa19a';
    const duvet = '#706862';
    const sheet = '#ecebe9';
    const pillow = '#f6f5f3';
    const base = '#aca39c';
    const views = {
      front: (g, ox, oy) => {
        g.save();
        g.translate(ox, oy);
        g.fillStyle = head;
        g.fillRect(40, 10, 150, 80);
        g.fillStyle = pillow;
        g.fillRect(52, 62, 52, 22);
        g.fillRect(110, 62, 52, 22);
        g.fillStyle = sheet;
        g.fillRect(34, 80, 162, 14);
        poly(g, duvet, [
          [30, 90],
          [200, 90],
          [206, 132],
          [24, 132],
        ]);
        g.fillStyle = base;
        g.fillRect(30, 130, 170, 14);
        g.restore();
      },
      side: (g, ox, oy) => {
        g.save();
        g.translate(ox, oy);
        g.fillStyle = head;
        g.fillRect(8, 10, 24, 132);
        g.fillStyle = base;
        g.fillRect(32, 88, 250, 54);
        g.fillStyle = sheet;
        g.fillRect(32, 70, 112, 20);
        blob(g, pillow, 52, 60, 22, 14);
        blob(g, pillow, 74, 66, 24, 12);
        poly(g, duvet, [
          [144, 72],
          [282, 90],
          [282, 120],
          [144, 120],
        ]);
        g.restore();
      },
      top: (g, ox, oy) => {
        g.save();
        g.translate(ox, oy);
        g.fillStyle = head;
        g.fillRect(8, 6, 174, 22);
        g.fillStyle = sheet;
        g.fillRect(18, 28, 154, 180);
        blob(g, pillow, 52, 52, 36, 20);
        blob(g, pillow, 138, 52, 36, 20);
        blob(g, pillow, 95, 82, 26, 12);
        g.fillStyle = duvet;
        g.fillRect(10, 100, 170, 104);
        g.fillStyle = base;
        g.fillRect(14, 204, 162, 8);
        g.restore();
      },
      threeQuarter: (g, ox, oy) => {
        g.save();
        g.translate(ox, oy);
        g.fillStyle = head;
        g.fillRect(6, 6, 150, 82);
        poly(g, base, [
          [6, 88],
          [156, 70],
          [282, 96],
          [282, 128],
          [24, 140],
          [6, 130],
        ]);
        poly(g, duvet, [
          [40, 86],
          [150, 74],
          [278, 98],
          [150, 118],
        ]);
        blob(g, pillow, 70, 74, 24, 12);
        blob(g, pillow, 112, 70, 24, 12);
        g.restore();
      },
    };
    const canvas = document.createElement('canvas');
    const g = canvas.getContext('2d');
    if (view) {
      canvas.width = 340;
      canvas.height = 260;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 340, 260);
      views[view](g, 25, 40);
    } else {
      canvas.width = 640;
      canvas.height = 470;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 640, 470);
      views.front(g, 40, 24);
      views.side(g, 330, 24);
      views.top(g, 50, 220);
      views.threeQuarter(g, 330, 250);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, only);
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

  test('detects a bed from a generated bed sheet and shows its adjustable details', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await expect(dialog).toBeVisible();

    // One sheet with the front, side, plan and three-quarter views
    await dialog.getByLabel('Picture with several views').setInputFiles({
      name: 'bed-sheet.png',
      mimeType: 'image/png',
      buffer: await makeBedPng(page),
    });
    await dialog.getByRole('button', { name: 'Use these views' }).click();
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    const detected = dialog.getByText(/Detected:/);
    await expect(detected).toContainText('Detected: Bed', { timeout: 45_000 });
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('My bed');

    // Bed details read from the picture show up as adjustable choices
    await dialog.getByText('Adjust details').click();
    await expect(dialog.getByRole('combobox', { name: 'Headboard', exact: true })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Pillows', exact: true })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Footboard' })).toBeVisible();
    await expect(dialog.getByLabel('Duvet', { exact: true })).toBeVisible();
    await dialog
      .getByRole('combobox', { name: 'Headboard width' })
      .selectOption({ label: 'As wide as the bed' });
  });

  for (const [view, slot] of [
    ['front', 'Front'],
    ['side', 'Right side'],
    ['top', 'Top'],
    ['threeQuarter', 'Front'],
  ]) {
    test(`calls a lone ${view} picture of a bed a bed`, async ({ page }) => {
      await openApp(page);
      await createRoomFromPreset(page);
      const catalog = page.getByRole('complementary', { name: 'Furniture' });
      await catalog.getByRole('button', { name: /Create from photos/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
      await dialog.getByLabel(`${slot} photo`, { exact: true }).setInputFiles({
        name: `bed-${view}.png`,
        mimeType: 'image/png',
        buffer: await makeBedPng(page, view),
      });
      await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
      await expect(dialog.getByText(/Best guess from one photo:/)).toContainText('Bed', {
        timeout: 45_000,
      });
      await expect(
        dialog
          .getByRole('group', { name: 'Looks like' })
          .getByRole('button', { name: 'Bed', exact: true })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  }
});
