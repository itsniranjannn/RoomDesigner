import { test, expect } from './fixtures.js';
import { createRoomFromPreset, openApp, pieces } from './helpers.js';

// These tests are about the first-run tour, so it stays enabled here
test.use({ tourDisabled: false });

const tip = (page) => page.getByRole('dialog', { name: /./ }).filter({ hasText: /Step \d of \d/ });

test.describe('first-run tour', () => {
  test('shows once, works with the keyboard, stays out of the way and is remembered', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);

    const card = tip(page);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Step 1 of 6');
    await expect(card.getByRole('heading', { name: 'Add furniture' })).toBeVisible();

    // The page is still usable while the tip shows: add a piece through the catalog
    await page.getByRole('button', { name: /^Add Loveseat,/ }).click();
    await expect(pieces(page)).toHaveCount(1);
    await expect(card).toBeVisible();

    // Arrow keys move between steps; focus is on the card
    await card.getByRole('button', { name: 'Next' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(card).toContainText('Step 2 of 6');
    await expect(card.getByRole('heading', { name: '2D plan or 3D view' })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(card).toContainText('Step 1 of 6');

    // Escape skips for good
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Room name' })).toBeVisible();
    await page.waitForTimeout(1500); // longer than the tour's start delay: it must stay away
    await expect(card).toBeHidden();
  });

  test('can be taken again from the keyboard shortcuts window and finished', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    const card = tip(page);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Skip tour' }).click();
    await expect(card).toBeHidden();

    await page.getByRole('button', { name: /^Keyboard shortcuts/ }).click();
    const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await shortcuts.getByRole('button', { name: 'Take the tour' }).click();
    await expect(shortcuts).toBeHidden();
    await expect(card).toBeVisible();
    for (let step = 1; step < 6; step += 1) {
      await expect(card).toContainText(`Step ${step} of 6`);
      await card.getByRole('button', { name: 'Next' }).click();
    }
    await expect(card).toContainText('Step 6 of 6');
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(card).toBeHidden();
  });

  test('the flat designer has its own short tour', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Design a flat' }).click();
    await page
      .getByRole('dialog', { name: 'Design a flat' })
      .getByRole('button', { name: 'Create flat' })
      .click();
    const card = tip(page);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Step 1 of 5');
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    // It can be opened again from the help button
    await page.getByRole('button', { name: 'Take the tour' }).click();
    await expect(card).toBeVisible();
  });

  test('?tour=0 switches it off', async ({ page }) => {
    await page.goto('/?tour=0');
    await createRoomFromPreset(page);
    await page.waitForTimeout(1500);
    await expect(tip(page)).toBeHidden();
  });
});
