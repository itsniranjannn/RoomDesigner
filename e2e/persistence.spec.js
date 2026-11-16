import { test, expect, watchPage } from './fixtures.js';
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

  // Two tabs on the same room: the second tab's work must not vanish when the first saves.
  test('a second tab on the same room is not overwritten', async ({ page, problems }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living Room');
    await addByClick(page, '3-Seater Sofa');
    await waitForSaved(page);

    const second = await page.context().newPage();
    watchPage(second, problems);
    await openApp(second);
    await expect(pieces(second)).toHaveCount(1);
    await addByClick(second, 'Lounge Armchair');
    await waitForSaved(second);
    await expect(pieces(second)).toHaveCount(2);

    // The first tab still shows only the sofa. Saving its own edit must leave the armchair alone.
    await page.bringToFront();
    await addByClick(page, 'Coffee Table');
    const notice = page.getByRole('dialog', { name: 'Changed in another tab' });
    await expect(notice).toBeVisible();
    await expect(page.getByRole('status', { name: /changed in another tab/i })).toBeVisible();
    expect(await storedFurniture(page)).toEqual(['sofa-3seat', 'armchair']);

    // Opening the saved version brings the other tab's work into this one
    await notice.getByRole('button', { name: 'Open the saved version' }).click();
    await expect(notice).toBeHidden();
    await expect(pieces(page)).toHaveCount(2);
    await addByClick(page, 'Coffee Table');
    await waitForSaved(page);
    expect(await storedFurniture(page)).toEqual(['sofa-3seat', 'armchair', 'coffee-table']);
    await second.close();
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

/** The furniture type ids of the one stored room, read straight from IndexedDB. */
async function storedFurniture(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('room_planner_db');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const all = db.transaction('rooms', 'readonly').objectStore('rooms').getAll();
          all.onsuccess = () => {
            db.close();
            resolve((all.result[0]?.placedFurniture || []).map((f) => f.furnitureTypeId));
          };
          all.onerror = () => reject(all.error);
        };
      })
  );
}

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
