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

/**
 * A synthetic "photo" taken in a room, drawn on a canvas in the page: a wall with a picture frame, a floor, and
 * furniture standing on it. `layout` is 'pieces' (a teal sofa with two identical armchairs apart from it) or 'bed'
 * (a wooden bed with a tall headboard). With `stackedTwice`, two copies are stacked on a white gutter in one
 * picture, as a listing shows two photos of the same piece. No real photos are used.
 */
async function makeRoomPng(page, layout, stackedTwice = false) {
  const base64 = await page.evaluate(
    ([kind, twice]) => {
      const draw = (g, oy) => {
        const r = (x, y, w, h, c) => {
          g.fillStyle = c;
          g.fillRect(x, y + oy, w, h);
        };
        r(0, 0, 480, 250, '#d0c0ac');
        r(0, 0, 40, 250, '#beac96');
        r(170, 40, 120, 90, '#5a4e46');
        r(176, 46, 108, 78, '#aa9678');
        r(0, 250, 480, 150, '#76665c');
        r(60, 330, 360, 60, '#b4a08c');
        if (kind === 'pieces') {
          r(150, 200, 180, 70, '#226260');
          r(138, 218, 24, 62, '#1e5856');
          r(318, 218, 24, 62, '#1e5856');
          r(150, 256, 180, 24, '#287470');
          r(146, 278, 188, 8, '#6e4628');
          r(150, 286, 8, 20, '#5a381e');
          r(322, 286, 8, 20, '#5a381e');
          for (const x of [62, 358]) {
            r(x, 226, 62, 44, '#246462');
            r(x - 6, 246, 12, 40, '#785032');
            r(x + 56, 246, 12, 40, '#785032');
            r(x, 262, 62, 20, '#2c7470');
            r(x - 4, 284, 8, 24, '#5a381e');
            r(x + 58, 284, 8, 24, '#5a381e');
          }
        } else {
          r(130, 60, 220, 120, '#964c28');
          r(150, 80, 180, 80, '#783c24');
          r(140, 160, 200, 40, '#e8e2d6');
          r(118, 196, 244, 70, '#924a28');
          r(124, 266, 22, 22, '#64321a');
          r(334, 266, 22, 22, '#64321a');
        }
      };
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = twice ? 808 : 400;
      const g = canvas.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      draw(g, 0);
      if (twice) draw(g, 408);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    [layout, stackedTwice]
  );
  return Buffer.from(base64, 'base64');
}

/**
 * A synthetic "photo" of a two-door wardrobe on a light grey backdrop: an oak carcass and left door, a white right
 * door, two upright brass bar handles beside the middle seam and three drawers under the right door. No real
 * photos are used.
 */
async function makeWardrobePng(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 480;
    const g = canvas.getContext('2d');
    const r = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    r(0, 0, 320, 480, '#cfcfcf');
    r(60, 30, 200, 420, '#8a6a4a'); // carcass
    r(66, 36, 90, 408, '#93724f'); // left door
    r(162, 36, 92, 250, '#efefef'); // right door
    for (const y of [292, 344, 396]) r(162, y, 92, 48, '#93724f'); // drawers
    r(156, 36, 6, 408, '#4a3624'); // middle seam
    r(146, 150, 5, 70, '#c9a24a'); // bar handles
    r(167, 150, 5, 70, '#c9a24a');
    for (const y of [314, 366, 418]) r(200, y, 16, 5, '#c9a24a');
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

  test('says plainly when it is not sure, and offers the choices, the cut-out and the details', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    const png = await makeArmchairPng(page);
    await dialog
      .getByLabel('Front photo', { exact: true })
      .setInputFiles({ name: 'armchair.png', mimeType: 'image/png', buffer: png });
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    const notice = dialog.getByRole('status').filter({ hasText: 'Not sure about this one' });
    await expect(notice).toBeVisible({ timeout: 45_000 });
    await expect(notice.getByRole('button', { name: 'Crop or paint the cut-out' })).toBeVisible();
    await expect(dialog.getByRole('group', { name: 'Looks like' })).toBeVisible();
    // the detail controls are open without a click
    await expect(dialog.getByText('Read from your photos.').first()).toBeVisible();
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

  test('finds the separate pieces in a photo taken in a room and saves several at once', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'room.png',
      mimeType: 'image/png',
      buffer: await makeRoomPng(page, 'pieces'),
    });

    // The sofa and the two armchairs are offered as pieces; the identical armchairs come as one with a count
    const pieces = dialog.getByRole('group', { name: 'Pieces found in this photo' });
    await expect(pieces).toBeVisible({ timeout: 45_000 });
    await expect(pieces).toContainText(/This photo has [3-9] pieces/);
    await expect(pieces).toContainText('x2');

    // Build the biggest piece, tick another one and save both as separate items
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    const save = dialog.getByRole('button', { name: /^Save/ });
    await expect(save).toBeEnabled({ timeout: 45_000 });
    await pieces.getByRole('checkbox', { name: 'Also save' }).first().check();
    const saveTwo = dialog.getByRole('button', { name: /Save 2 pieces to My furniture/ });
    await expect(saveTwo).toBeVisible();
    await saveTwo.click();
    await expect(dialog).toBeHidden();
    const mine = catalog.getByRole('region', { name: 'My Furniture' });
    await expect(mine.getByRole('button', { name: /^Add My / })).toHaveCount(2);
  });

  test('splits one picture that holds two photos of the same piece, and can undo it', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'bed-listing.png',
      mimeType: 'image/png',
      buffer: await makeRoomPng(page, 'bed', true),
    });
    const notice = dialog.getByRole('status').filter({ hasText: 'One picture, several views' });
    await expect(notice).toBeVisible({ timeout: 45_000 });
    await expect(notice).toContainText('2 photos of the same piece');
    await expect(
      notice.getByRole('list', { name: 'Views found in the picture' }).getByRole('listitem')
    ).toHaveCount(2);
    // The front view alone is built, and it is a bed
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    await expect(dialog.getByText(/Best guess from one photo:/)).toContainText('Bed', {
      timeout: 45_000,
    });
    // Undo puts the whole picture back as one photo
    await notice.getByRole('button', { name: 'Undo the split' }).click();
    await expect(
      dialog.getByRole('status').filter({ hasText: 'One picture, several views' })
    ).toHaveCount(0);
  });

  test('fixes the cut-out with a crop box and Keep and Remove brushes', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'room.png',
      mimeType: 'image/png',
      buffer: await makeRoomPng(page, 'pieces'),
    });
    await dialog.getByRole('button', { name: 'Fix the cut-out' }).click();
    const fixer = dialog.getByRole('group', { name: /Fix the cut-out of the front photo/ });
    await expect(fixer).toBeVisible({ timeout: 45_000 });
    await expect(fixer.getByRole('radio', { name: 'Keep' })).toBeVisible();
    await expect(fixer.getByRole('radio', { name: 'Remove' })).toBeVisible();
    await fixer.getByRole('radio', { name: 'Crop to the piece' }).click();
    const stage = fixer.getByRole('application');
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.8, { steps: 6 });
    await page.mouse.up();
    await expect(fixer.getByRole('button', { name: 'Clear crop' })).toBeVisible();
    await expect(fixer.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await fixer.getByRole('button', { name: 'Reset' }).click();
    await expect(fixer.getByRole('button', { name: 'Clear crop' })).toHaveCount(0);
    // A Remove stroke with the keyboard: arrow keys move the brush, Space paints
    await fixer.getByRole('radio', { name: 'Remove' }).click();
    await stage.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(fixer.getByRole('button', { name: 'Reset' })).toBeEnabled();
    await fixer.getByRole('button', { name: 'Done' }).click();
    await expect(fixer).toBeHidden();
  });

  test('reads a product sheet added as one photo: it is split into views', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    // the whole sheet of views, dropped on the Front photo slot as one photo
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'bed-sheet.png',
      mimeType: 'image/png',
      buffer: await makeBedPng(page),
    });
    const views = dialog.getByRole('group', { name: 'Views found in the picture' });
    await expect(views).toBeVisible({ timeout: 45_000 });
    await expect(views).toContainText('so it is read as views');
    await expect(views.getByRole('button', { name: 'Use it as one photo' })).toBeVisible();
    await views.getByRole('button', { name: 'Use these views' }).click();
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    await expect(dialog.getByText(/Detected:/)).toContainText('Detected: Bed', { timeout: 45_000 });
  });

  test('reads the doors, drawers, handles and door colour of a wardrobe', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'wardrobe.png',
      mimeType: 'image/png',
      buffer: await makeWardrobePng(page),
    });
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    await expect(dialog.getByText(/Best guess from one photo:/)).toContainText('Wardrobe', {
      timeout: 45_000,
    });
    await dialog.getByText('Adjust details').click();
    const pick = (name) => dialog.getByRole('combobox', { name, exact: true });
    await expect(pick('Doors')).toBeVisible();
    await expect(pick('Drawers')).toHaveValue('3');
    await expect(pick('Drawers under')).toHaveValue('right');
    await expect(pick('Handles')).toHaveValue('bar');
    for (const name of ['Mirror', 'Top cupboards', 'Middle', 'Door faces'])
      await expect(pick(name)).toBeVisible();
    // the white door is its own colour, and the brass handles theirs
    const colours = dialog.getByRole('group', { name: 'Colours found in the photos' });
    await expect(colours.getByLabel('Doors', { exact: true })).toBeVisible();
    await expect(colours.getByLabel('Handles', { exact: true })).toBeVisible();
    await pick('Mirror').selectOption({ label: 'Oval mirror in a door' });
  });

  test('offers the new details of every type to choose by hand', async ({ page }) => {
    // the model is rebuilt for each of four types
    test.slow();
    await openApp(page);
    await createRoomFromPreset(page);
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'wardrobe.png',
      mimeType: 'image/png',
      buffer: await makeWardrobePng(page),
    });
    await dialog.getByRole('button', { name: /Build 3D model|Rebuild model/ }).click();
    await expect(dialog.getByRole('button', { name: 'More types' })).toBeVisible({
      timeout: 45_000,
    });
    await dialog.getByText('Adjust details').click();
    const pick = (name) => dialog.getByRole('combobox', { name, exact: true });
    // (the type list closes once the model is rebuilt)
    const chooseType = async (label) => {
      await dialog.getByRole('button', { name: 'More types' }).click();
      await dialog.getByRole('combobox', { name: 'Type of furniture' }).selectOption({ label });
      await expect(dialog.getByRole('button', { name: 'More types' })).toBeVisible({
        timeout: 45_000,
      });
    };
    await chooseType('Desk');
    for (const name of ['Drawer pedestal', 'Base', 'Front panel'])
      await expect(pick(name)).toBeVisible();
    // the drawer count is offered once there is a pedestal to hold them
    await pick('Drawer pedestal').selectOption({ label: 'On the right' });
    await expect(pick('Drawers in the pedestal')).toBeVisible();
    await pick('Base').selectOption({ label: 'Metal sled (C-shaped) ends' });
    await chooseType('Bed');
    for (const name of ['Frame', 'Side rails', 'Wheels']) await expect(pick(name)).toBeVisible();
    // a tube metal frame has no upholstered headboard to choose
    await pick('Frame').selectOption({ label: 'Metal tubes' });
    await expect(pick('Headboard')).toHaveCount(0);
    await chooseType('Tub chair (round or bucket)');
    await expect(pick('Base').locator('option', { hasText: 'Thin metal legs' })).toHaveCount(1);
    await expect(pick('Sides')).toBeVisible();
    await chooseType('Sofa');
    for (const name of ['Stitching', 'Arm layers']) await expect(pick(name)).toBeVisible();
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
