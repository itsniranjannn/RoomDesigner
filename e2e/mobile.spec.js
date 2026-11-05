import { test, expect } from './fixtures.js';
import { createRoomFromPreset, openApp, pieces } from './helpers.js';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

test.describe('mobile viewport (375 x 812)', () => {
  test('landing page fits the screen', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('catalog drawer opens, adds a piece and closes; the toolbar is reachable', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);

    // On a phone the furniture list is a drawer, closed at first
    await expect(page.getByRole('complementary', { name: 'Furniture' })).toBeHidden();
    await page.getByRole('button', { name: 'Show furniture list' }).click();
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await expect(catalog).toBeVisible();
    await catalog.getByRole('button', { name: /^Add Coffee Table,/ }).click();

    // Placing a piece closes the drawer and the piece is on the plan
    await expect(catalog).toBeHidden();
    await expect(pieces(page)).toHaveCount(1);

    // The plan toolbar lies flat along the screen and holds Undo / Redo on a phone
    const toolbar = page.getByRole('toolbar', { name: 'Plan tools' });
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
    const undo = toolbar.getByRole('button', { name: /^Undo/ });
    await expect(undo).toBeEnabled();
    await undo.tap();
    await expect(pieces(page)).toHaveCount(0);

    // The drawer closes with Escape too
    await page.getByRole('button', { name: 'Show furniture list' }).click();
    await expect(catalog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(catalog).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
