import { expect } from '@playwright/test';

/** Open the app and wait until the landing page or editor is interactive. */
export async function openApp(page, path = '/') {
  await page.goto(path);
  await expect(
    page.getByRole('button', { name: 'Start a new room' }).or(page.getByLabel('Room plan'))
  ).toBeVisible();
}

/** Landing page, New room, pick a starting size by name, create. Leaves the editor open. */
export async function createRoomFromPreset(page, preset = 'Living Room') {
  await page.getByRole('button', { name: 'Start a new room' }).click();
  const dialog = page.getByRole('dialog', { name: 'New room' });
  await dialog.getByRole('button', { name: new RegExp(preset) }).click();
  await dialog.getByRole('button', { name: 'Create room' }).click();
  await expect(page.getByLabel('Room plan')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Room name' })).toHaveValue(preset);
}

export const pieces = (page) => page.getByTestId('furniture-piece');

/** Click a catalog card ("3-Seater Sofa") to add it. */
export async function addByClick(page, name) {
  await page.getByRole('button', { name: new RegExp(`^Add ${name},`) }).click();
}

/** Center of a locator in page coordinates. */
export async function centerOf(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The inspector's "From left wall / From top wall" readout of the selected piece, in cm. */
export async function piecePosition(page) {
  const panel = page.getByRole('complementary', { name: 'Selected piece' });
  const left = await panel
    .getByText('From left wall')
    .locator('xpath=following-sibling::*[1]')
    .innerText();
  const top = await panel
    .getByText('From top wall')
    .locator('xpath=following-sibling::*[1]')
    .innerText();
  return { x: parseInt(left, 10), y: parseInt(top, 10) };
}

/** Wait for the "Saved" status so a reload will find the work in IndexedDB. */
export async function waitForSaved(page) {
  await expect(page.getByRole('status', { name: /saved on this device/i })).toBeVisible();
}
