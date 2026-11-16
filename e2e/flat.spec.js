import { test, expect, watchPage } from './fixtures.js';
import { openApp } from './helpers.js';

async function newFlat(page, startFrom) {
  await page.getByRole('button', { name: 'Design a flat' }).click();
  const dialog = page.getByRole('dialog', { name: 'Design a flat' });
  if (startFrom) await dialog.getByRole('combobox', { name: 'Start from' }).selectOption(startFrom);
  await dialog.getByRole('button', { name: 'Create flat' }).click();
  await expect(page.getByRole('application')).toBeVisible();
}

const stat = (page, label) =>
  page.getByRole('complementary', { name: 'Details' }).getByText(label, { exact: true });

/** The value shown next to a label in the Details panel's fact list. */
const statValue = (page, label) => stat(page, label).locator('xpath=following-sibling::*[1]');

test.describe('flat designer', () => {
  test('draws walls, closes a room, adds a door, opens 3D and walks', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: 'Blank' });
    await page.getByRole('button', { name: 'Start with a blank plan' }).click();
    await expect(page.getByRole('button', { name: 'Draw wall (W)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Four drags make a closed box; the room appears by itself
    const box = await page.getByRole('application').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const corners = [
      [-200, -150],
      [200, -150],
      [200, 150],
      [-200, 150],
      [-200, -150],
    ];
    for (let i = 0; i < 4; i += 1) {
      const [x1, y1] = corners[i];
      const [x2, y2] = corners[i + 1];
      await page.mouse.move(cx + x1, cy + y1);
      await page.mouse.down();
      await page.mouse.move(cx + x2, cy + y2, { steps: 8 });
      await page.mouse.up();
    }
    await expect(page.getByRole('region', { name: 'Flat plan' }).getByText('1 room')).toBeVisible();

    // A door on the top wall
    await page.getByRole('button', { name: 'Door (D)' }).click();
    await page.mouse.click(cx, cy - 150);
    await page.getByRole('button', { name: 'Select (V)' }).click();
    await page.keyboard.press('Escape');
    await expect(statValue(page, 'Doors on this floor')).toHaveText('1');
    await expect(statValue(page, 'Windows on this floor')).toHaveText('0');

    // 3D, then a walkthrough
    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D view of the flat')).toBeVisible();
    await page.getByRole('button', { name: 'Walk through the flat' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
  });

  test('a ready-made flat can be walked through a door', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: 'Two-bedroom flat' });
    await expect(stat(page, 'Rooms in the flat')).toBeVisible();

    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D view of the flat')).toBeVisible();
    await page.getByRole('button', { name: 'Walk through the flat' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();

    // Walk forward for a few seconds, through the hall and on toward the doors
    await page.keyboard.down('w');
    await page.waitForTimeout(1500); // held key: there is no event to wait for
    await page.keyboard.up('w');
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();

    await page.getByRole('button', { name: 'Stop walking (Esc)' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
    await page.getByRole('button', { name: 'Plan view' }).click();
    await expect(page.getByRole('application')).toBeVisible();
  });

  // Two tabs on the same flat: the second tab's work must not vanish when the first saves
  test('a second tab on the same flat is not overwritten', async ({ page, problems }) => {
    await openApp(page);
    await newFlat(page, { label: 'Two-bedroom flat' });
    const titleA = page.getByRole('textbox', { name: 'Flat name' });
    await titleA.fill('Tab A flat');
    await titleA.press('Enter');
    await expect(page.getByRole('status', { name: /all changes saved/i })).toBeVisible();

    // The second tab reopens the same flat by itself, as a reload does
    const second = await page.context().newPage();
    watchPage(second, problems);
    await second.goto('/');
    await expect(second.getByRole('application')).toBeVisible();
    const titleB = second.getByRole('textbox', { name: 'Flat name' });
    await expect(titleB).toHaveValue('Tab A flat');
    await titleB.fill('Renamed in B');
    await titleB.press('Enter');
    await expect(second.getByRole('status', { name: /all changes saved/i })).toBeVisible();

    // The first tab, still showing the old name, now edits as well
    await page.bringToFront();
    await page.getByRole('button', { name: 'Add a floor' }).click();
    const notice = page.getByRole('dialog', { name: 'Changed in another tab' });
    await expect(notice).toBeVisible();
    await expect(titleA).toHaveValue('Tab A flat');

    await notice.getByRole('button', { name: 'Open the saved version' }).click();
    await expect(notice).toBeHidden();
    await expect(titleA).toHaveValue('Renamed in B');
    await expect(page.getByRole('status', { name: /all changes saved/i })).toBeVisible();
    await second.close();
  });

  // The README promised a design could be shared as a link, but only a room can be
  test('the flat export menu says a flat cannot be shared as a link yet', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: 'Two-bedroom flat' });
    await expect(stat(page, 'Rooms in the flat')).toBeVisible();
    await page.getByRole('button', { name: 'Export this floor' }).click();
    const menu = page.getByRole('menu', { name: 'Export this floor' });
    await expect(menu.getByRole('menuitem', { name: 'Printable plan (PDF)' })).toBeEnabled();
    const link = menu.getByRole('menuitem', { name: /cannot be shared as a link/ });
    await expect(link).toBeVisible();
    await expect(link).toBeDisabled();
  });

  // Reloading while designing a flat used to drop the user back on the landing page, while
  // reloading inside a room correctly reopened it.
  test('a reload comes back to the flat being designed', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: 'Two-bedroom flat' });
    await expect(stat(page, 'Rooms in the flat')).toBeVisible();
    const title = page.getByRole('textbox', { name: 'Flat name' });
    await title.fill('Reload flat');
    await title.press('Enter');
    await expect(page.getByRole('status', { name: /all changes saved/i })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('application')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Flat name' })).toHaveValue('Reload flat');
    await expect(stat(page, 'Rooms in the flat')).toBeVisible();

    // Going back to the studio is remembered too: a reload then starts there
    await page.getByRole('button', { name: 'Back to your studio' }).click();
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeVisible();
    await expect(page.getByRole('application')).toBeHidden();
  });

  // A flat whose writes all fail used to keep saying "Saved" over work that was already gone
  test('says the flat is not saved when the device will not store it', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: 'Two-bedroom flat' });
    await expect(stat(page, 'Rooms in the flat')).toBeVisible();
    await expect(page.getByRole('status', { name: /all changes saved/i })).toBeVisible();

    // Every write fails from here on, as a device with no room left would
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = function put() {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
    });

    await page.getByRole('button', { name: 'Add a floor' }).click();
    await expect(page.getByRole('status', { name: /could not be saved/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /all changes saved/i })).toBeHidden();
  });
});
