import { test, expect } from './fixtures.js';
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
    await expect(
      page.getByRole('complementary', { name: 'Details' }).getByText('1 / 0', { exact: true })
    ).toBeVisible(); // one door, no windows

    // 3D, then a walkthrough
    await page.getByRole('button', { name: '3D' }).click();
    await expect(page.getByLabel('3D view of the flat')).toBeVisible();
    await page.getByRole('button', { name: 'Walk through the flat' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
  });

  test('a ready-made flat can be walked through a door', async ({ page }) => {
    await openApp(page);
    await newFlat(page, { label: '2BHK' });
    await expect(stat(page, 'Rooms')).toBeVisible();

    await page.getByRole('button', { name: '3D' }).click();
    await expect(page.getByLabel('3D view of the flat')).toBeVisible();
    await page.getByRole('button', { name: 'Walk through the flat' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();

    // Walk forward for a few seconds, through the hall and on toward the doors
    await page.keyboard.down('w');
    await page.waitForTimeout(1500); // held key: there is no event to wait for
    await page.keyboard.up('w');
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();

    await page.getByRole('button', { name: 'Leave the walkthrough' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('application')).toBeVisible();
  });
});
