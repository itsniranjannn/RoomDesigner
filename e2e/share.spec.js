import { readFile } from 'node:fs/promises';
import { test, expect, watchPage } from './fixtures.js';
import { addByClick, createRoomFromPreset, openApp, pieces } from './helpers.js';

test.describe('share and export', () => {
  test('a share link restores the room when opened', async ({ page, context, problems }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await createRoomFromPreset(page, 'Home Office');
    await addByClick(page, 'Writing Desk');
    await addByClick(page, 'Office Swivel Chair');

    await page.getByRole('button', { name: 'Share and export' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share & export' });
    await dialog.getByRole('button', { name: 'Copy link' }).click();
    await expect(dialog.getByText(/Link copied/)).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('#share=');

    // A new tab in the same browser profile opens the link
    const other = await context.newPage();
    watchPage(other, problems);
    await other.addInitScript(() => window.localStorage.setItem('rd.tour.disabled', '1'));
    await other.goto(link);
    const prompt = other.getByRole('dialog', { name: 'Open shared design?' });
    await expect(prompt).toBeVisible();
    await expect(prompt.getByText(/"Home Office" with 2 pieces/)).toBeVisible();
    await prompt.getByRole('button', { name: 'Open as new room' }).click();
    await expect(prompt).toBeHidden();
    await expect(other.getByRole('textbox', { name: 'Room name' })).toHaveValue('Home Office');
    await expect(pieces(other)).toHaveCount(2);
    // The hash is cleared so a reload does not ask again
    expect(new URL(other.url()).hash).toBe('');
    await other.close();
  });

  test('a damaged share link shows a clear message', async ({ page }) => {
    await page.goto('/#share=not-a-real-design');
    const dialog = page.getByRole('dialog', { name: 'Link could not be opened' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test('exporting the plan as PNG triggers a download', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await addByClick(page, 'Coffee Table');
    await page.getByRole('button', { name: 'Share and export' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share & export' });
    const row = dialog.getByRole('listitem').filter({ hasText: 'Floor plan picture' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.getByRole('button', { name: 'PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
    const bytes = await readFile(await download.path());
    // PNG signature
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(bytes.length).toBeGreaterThan(2000);
    await expect(dialog.getByText(/Saved as/)).toBeVisible();
  });
});
