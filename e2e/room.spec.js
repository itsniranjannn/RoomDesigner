import { test, expect } from './fixtures.js';
import {
  addByClick,
  centerOf,
  createRoomFromPreset,
  openApp,
  pieces,
  piecePosition,
} from './helpers.js';

test.describe('room editor', () => {
  test('landing page starts a new room from a preset', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await createRoomFromPreset(page, 'Master Bedroom');
    await expect(page.getByRole('complementary', { name: 'Furniture' })).toBeVisible();
    await expect(pieces(page)).toHaveCount(0);
  });

  test('adds furniture by click and by dragging from the catalog', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);

    await addByClick(page, '3-Seater Sofa');
    await expect(pieces(page)).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'Selected piece' })).toBeVisible();

    // Pointer drag: the card follows the pointer and drops where it is released
    const card = page.getByRole('button', { name: /^Add Coffee Table,/ });
    await card.scrollIntoViewIfNeeded();
    const from = await centerOf(card);
    const to = await centerOf(page.getByLabel('Room plan'));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 10, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(pieces(page)).toHaveCount(2);
  });

  test('moves, rotates and deletes a piece with undo and redo', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await addByClick(page, 'Coffee Table');
    await expect(pieces(page)).toHaveCount(1);
    const panel = page.getByRole('complementary', { name: 'Selected piece' });

    // Move by dragging the piece on the plan
    const before = await piecePosition(page);
    const piece = pieces(page).first();
    const c = await centerOf(piece);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 60, c.y + 40, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await piecePosition(page)).x).toBeGreaterThan(before.x);
    const moved = await piecePosition(page);

    // Undo puts it back, redo moves it again
    const undo = page.getByRole('button', { name: /^Undo/ });
    const redo = page.getByRole('button', { name: /^Redo/ });
    await undo.click();
    await expect.poll(async () => (await piecePosition(page)).x).toBe(before.x);
    await redo.click();
    await expect.poll(async () => (await piecePosition(page)).x).toBe(moved.x);

    // Rotate to 90 degrees
    await panel
      .getByRole('group', { name: 'Quick rotation' })
      .getByRole('button', { name: '90°' })
      .click();
    await expect(panel.getByRole('slider', { name: 'Rotation' })).toHaveValue('90');
    await undo.click();
    await expect(panel.getByRole('slider', { name: 'Rotation' })).toHaveValue('0');

    // Delete, then bring it back with undo
    await panel.getByRole('button', { name: 'Delete' }).click();
    await expect(pieces(page)).toHaveCount(0);
    await undo.click();
    await expect(pieces(page)).toHaveCount(1);
    await redo.click();
    await expect(pieces(page)).toHaveCount(0);
  });

  test('resizes a piece and adds a door and a window', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await addByClick(page, 'Writing Desk');
    const panel = page.getByRole('complementary', { name: 'Selected piece' });
    const width = panel.getByRole('spinbutton', { name: 'Width' });
    await width.fill('180');
    await width.press('Enter');
    await expect(width).toHaveValue('180');

    // Back to the room overview to add openings
    await panel.getByRole('button', { name: 'Room overview' }).click();
    const room = page.getByRole('complementary', { name: 'Room details' });
    await expect(room.getByText('Door 1')).toBeVisible();
    await room.getByRole('button', { name: 'Add door' }).click();
    await expect(room.getByText('Door 2')).toBeVisible();
    await room.getByRole('button', { name: 'Add window' }).click();
    await expect(room.getByText('Window 2')).toBeVisible();
  });
});
