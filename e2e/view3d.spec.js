import { test, expect } from './fixtures.js';
import { addByClick, createRoomFromPreset, openApp } from './helpers.js';

test.describe('3D view', () => {
  test('toggles 3D, opens the Materials popover and starts a walkthrough', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await addByClick(page, '3-Seater Sofa');

    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D room preview')).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '3D view' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Materials popover: pick a wall finish, then close with Escape
    await page.getByRole('button', { name: 'Materials' }).click();
    const materials = page.getByRole('dialog', { name: 'Materials and quality' });
    await expect(materials).toBeVisible();
    const walls = materials.getByRole('radiogroup', { name: 'Walls' });
    const options = walls.getByRole('radio');
    await expect(options.first()).toBeVisible();
    await options.nth(1).click();
    await expect(options.nth(1)).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(materials).toBeHidden();

    // Walkthrough starts, shows the controls, and Escape leaves it
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await expect(catalog).toBeVisible();
    await page.getByRole('button', { name: 'Walk through the room' }).click();
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();
    // A walkthrough is a first-person view: the furniture list used to stay docked over a fifth
    // of the window, and a card clicked there added a piece with no sign of it anywhere.
    await expect(catalog).toBeHidden();
    await expect(page.getByRole('button', { name: /furniture list/ })).toBeHidden();
    await page.keyboard.down('w');
    await page.waitForTimeout(400); // hold the key a moment; there is no event to wait for
    await page.keyboard.up('w');
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
    await expect(catalog).toBeVisible();

    // And back to the plan
    await page.getByRole('button', { name: 'Plan view' }).click();
    await expect(page.getByLabel('Room plan')).toBeVisible();
  });
});
