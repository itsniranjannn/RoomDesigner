import { test, expect } from './fixtures.js';
import { addByClick, centerOf, createRoomFromPreset, openApp } from './helpers.js';

test.describe('planning tools', () => {
  test('marks a service point and reads the Plan checks panel', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);

    // Services: pick a socket, click the plan, one point is marked
    await page.getByRole('button', { name: /^Services/ }).click();
    const services = page.getByRole('dialog', { name: 'Services' });
    await expect(services.getByText('Nothing marked yet.')).toBeVisible();
    await services.getByRole('button', { name: 'Socket' }).click();
    await expect(services.getByRole('status')).toContainText('Click the plan to place a socket');
    const c = await centerOf(page.getByLabel('Room plan'));
    await page.mouse.click(c.x, c.y);
    await page.keyboard.press('Escape');
    await expect(services.getByText(/1 point marked/)).toBeVisible();
    await services.getByRole('button', { name: 'Close Services' }).click();
    await expect(services).toBeHidden();

    // Plan checks: a summary line is always shown; the accessibility switch re-runs the checks
    await addByClick(page, 'King Bed');
    await page.getByRole('button', { name: /^Plan checks/ }).click();
    const checks = page.getByRole('dialog', { name: 'Plan checks' });
    await expect(checks).toBeVisible();
    await expect(checks.getByRole('status').first()).toBeVisible();
    const access = checks.getByRole('switch', { name: 'Check for wheelchair access' });
    await access.click();
    await expect(access).toBeChecked();
    await expect(checks.getByRole('status').first()).toBeVisible();
    await checks.getByRole('button', { name: 'Close Plan checks' }).click();
    await expect(checks).toBeHidden();
  });

  // The marks on the plan raised an alarm on the piece just placed and gave no way to ask what
  // it was about: they could not be pointed at, tapped or read out, and the words sat in a panel
  // with nothing to connect them to the mark.
  test('a mark on the plan carries the words for what is wrong', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, "Kids' bedroom");
    // A king bed in a small room blocks the door, which is the clearest check there is
    await addByClick(page, 'King Bed');
    await page.getByRole('button', { name: /^Plan checks/ }).click();
    const checks = page.getByRole('dialog', { name: 'Plan checks' });
    await expect(checks).toBeVisible();

    const mark = page.locator('[data-issue="door-blocked"]').first();
    await expect(mark).toBeAttached();
    // Pointing at it raises these words; a screen reader reads out the same
    await expect(mark.locator('title')).toContainText('blocks');
    expect(await mark.getAttribute('aria-label')).toContain('blocks');

    // And the pointer reaches it: the layer these marks live on refuses pointer events, and the
    // mark used to inherit that, so there was no way at all to point at one and be told.
    expect(await mark.evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe('none');
  });

  test('draws service links between a sink and the water point, and can hide them', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await page.getByRole('button', { name: /^Services/ }).click();
    const services = page.getByRole('dialog', { name: 'Services' });
    await services.getByRole('button', { name: 'Water supply' }).click();
    const c = await centerOf(page.getByLabel('Room plan'));
    await page.mouse.click(c.x - 150, c.y - 40);
    await page.keyboard.press('Escape');
    await services.getByRole('button', { name: 'Close Services' }).click();

    await addByClick(page, 'Sink Unit');
    const links = page.locator('[data-service-links]');
    await expect(links).toHaveCount(1);
    await expect(page.locator('[data-link="water"]')).toHaveCount(1);
    // Water is marked but no drain, so the sink's drain link is amber with a tag
    await expect(page.locator('[data-link="drain"][data-link-status="missing"]')).toHaveCount(1);
    await expect(page.getByText('no drain nearby')).toBeVisible();
    await page.getByRole('button', { name: /^Plan checks/ }).click();
    const checks = page.getByRole('dialog', { name: 'Plan checks' });
    const toggle = checks.getByRole('switch', { name: 'Show service links' });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(links).toHaveCount(0);
    await toggle.click();
    await expect(links).toHaveCount(1);
  });
});
