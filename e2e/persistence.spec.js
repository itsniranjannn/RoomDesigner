import { test, expect } from './fixtures.js';
import { addByClick, createRoomFromPreset, openApp, pieces, waitForSaved } from './helpers.js';

test.describe('persistence', () => {
  test('the open room and its furniture survive a reload (IndexedDB)', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Kids Bedroom');
    await addByClick(page, 'Single Bed');
    await addByClick(page, 'Nightstand');
    await expect(pieces(page)).toHaveCount(2);
    await waitForSaved(page);

    await page.reload();
    // The editor reopens on the room that was open
    await expect(page.getByRole('textbox', { name: 'Room name' })).toHaveValue('Kids Bedroom');
    await expect(pieces(page)).toHaveCount(2);
  });

  test('a saved room is listed under My designs and a rename sticks', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const name = page.getByRole('textbox', { name: 'Room name' });
    await name.fill('Guest Room');
    await name.press('Enter');
    await waitForSaved(page);

    await page.getByRole('button', { name: 'Back to all rooms' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Open saved sheets panel' }).first().click();
    const panel = page.getByRole('dialog', { name: 'My designs' });
    await expect(panel.getByText('Guest Room').first()).toBeVisible();
    await panel.getByText('Guest Room').first().click();
    await expect(page.getByRole('textbox', { name: 'Room name' })).toHaveValue('Guest Room');
  });
});
