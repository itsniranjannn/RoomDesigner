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

    // The hint under the plan names what a phone has, not keys it has not got
    await pieces(page).first().tap();
    const hint = page.getByText(/^Drag to move\./);
    await expect(hint).toContainText('Open the details panel to turn it or remove it.');
    await expect(hint).not.toContainText('Arrow keys');

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

test.describe('landscape phone (640 x 360)', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true });

  test('the furniture drawer shows pieces without scrolling', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await page.getByRole('button', { name: 'Show furniture list' }).click();
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await expect(catalog).toBeVisible();

    // The whole first row of pieces is inside the drawer before anything is scrolled
    const cards = catalog.getByRole('button', { name: /^Add .*centimetres$/ });
    const drawer = await catalog.boundingBox();
    for (const card of await cards.all().then((all) => all.slice(0, 2))) {
      const box = await card.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(drawer.y);
      expect(box.y + box.height).toBeLessThanOrEqual(drawer.y + drawer.height);
    }

    // The category chips are folded behind a button that names the category in use
    const chips = catalog.getByRole('group', { name: 'Category' });
    await expect(chips).toBeHidden();
    await catalog.getByRole('button', { name: /^Category: All/ }).click();
    await expect(chips).toBeVisible();
    await chips.getByRole('button', { name: 'Bedroom' }).click();
    await expect(chips).toBeHidden();
    await expect(catalog.getByRole('button', { name: /^Category: Bedroom/ })).toBeVisible();

    // "Create from photos" is still there, below the pieces rather than on top of them
    await catalog.getByRole('button', { name: /^Category: Bedroom/ }).click();
    await chips.getByRole('button', { name: 'All', exact: true }).click();
    const photo = catalog.getByRole('button', { name: 'Create from photos' });
    const photoBox = await photo.boundingBox();
    const firstCard = await cards.first().boundingBox();
    expect(photoBox.y).toBeGreaterThan(firstCard.y);

    // A piece can be added straight away, with no scrolling first
    await cards.first().click();
    await expect(pieces(page)).toHaveCount(1);
  });
});
