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

  // A flat written by version 1 has no walls, no openings and no stairs. Reading one must not
  // take My designs down, because that panel is the only way to any saved design.
  test('a flat saved by an older build is listed and opens', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living Room');
    await waitForSaved(page);
    await page.getByRole('button', { name: 'Back to all rooms' }).click();
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeVisible();

    await putFlatRecord(page, {
      id: 'flat-old-1',
      version: 1,
      name: 'Old flat',
      floorHeightCm: 280,
      levels: [{ id: 'lvl-0', name: 'Ground floor' }],
      spaces: [
        {
          id: 'sp-1',
          levelId: 'lvl-0',
          name: 'Hall',
          x: 0,
          y: 0,
          widthCm: 400,
          depthCm: 300,
          areaCm2: 120000,
          roomId: null,
        },
      ],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await page.reload();
    await page.getByRole('button', { name: 'Open saved sheets panel' }).first().click();
    const panel = page.getByRole('dialog', { name: 'My designs' });
    await expect(panel.getByText('Old flat')).toBeVisible();
    await expect(panel.getByText(/^Flat, 1 floor/)).toBeVisible();
    // The room saved before it is still reachable from the same panel
    await expect(panel.getByText('Living Room')).toBeVisible();

    await panel.getByText('Old flat').click();
    await expect(page.getByRole('application')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Flat name' })).toHaveValue('Old flat');
  });
});

/** Writes a record straight into the flats store, as an older build would have left it. */
async function putFlatRecord(page, record) {
  await page.evaluate(
    (flat) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('room_planner_db');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('flats', 'readwrite');
          tx.objectStore('flats').put(flat);
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    record
  );
}
