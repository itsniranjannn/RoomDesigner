import { test, expect } from './fixtures.js';
import { openApp, createRoomFromPreset } from './helpers.js';

// The app is meant to keep working with no connection. Everywhere else the service worker is
// switched off so runs stay predictable; here it is the thing being tested.
test.use({ serviceWorkers: 'allow' });

/** Waits until the service worker has installed and stored the parts that load only when needed. */
async function waitUntilStored(page) {
  await page.waitForFunction(
    async () => {
      if (!navigator.serviceWorker.controller) return false;
      for (const key of await caches.keys()) {
        const stored = await (await caches.open(key)).keys();
        if (stored.some((r) => /Room3DView|PhotoModelModal/.test(r.url))) return true;
      }
      return false;
    },
    null,
    { timeout: 60000 }
  );
}

test.describe('with no connection', () => {
  test('the 3D view and the photo dialog still open', async ({ page, context }) => {
    test.setTimeout(150000);
    await openApp(page);
    await waitUntilStored(page);
    await createRoomFromPreset(page);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByLabel('Room plan')).toBeVisible({ timeout: 30000 });

    // 3D is a separate file, fetched only when it is first needed
    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D room preview')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Something went wrong')).toBeHidden();

    // The photo dialog is another
    await page.getByRole('button', { name: '2D plan' }).click();
    await expect(page.getByLabel('Room plan')).toBeVisible();
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    await expect(page.getByRole('dialog', { name: 'Create furniture from photos' })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Something went wrong')).toBeHidden();
  });
});
