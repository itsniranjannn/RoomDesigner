import { test, expect } from './fixtures.js';
import { createRoomFromPreset, openApp } from './helpers.js';

test.describe('diagnostics', () => {
  test('uncaught errors are logged locally and can be copied and cleared', async ({
    page,
    context,
    problems,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await createRoomFromPreset(page);

    // Provoke an uncaught error and an unhandled rejection on purpose
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('e2e uncaught boom');
      }, 0);
      Promise.reject(new Error('e2e rejected boom'));
    });
    await expect
      .poll(() => problems.filter((p) => /e2e (uncaught|rejected) boom/.test(p)).length)
      .toBeGreaterThan(0);
    // They are expected here, so they do not count as failures
    for (let i = problems.length - 1; i >= 0; i -= 1) {
      if (/e2e (uncaught|rejected) boom/.test(problems[i])) problems.splice(i, 1);
    }

    await page.getByRole('button', { name: /^Keyboard shortcuts/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const diagnostics = dialog.getByRole('region', { name: 'Diagnostics' });
    await expect(diagnostics).toContainText(/\d+ problems? recorded/);

    await diagnostics.getByRole('button', { name: 'Copy' }).click();
    await expect(diagnostics.getByRole('status')).toContainText('Copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Room Designer Studio');
    expect(copied).toContain('e2e uncaught boom');
    // The report holds no room contents
    expect(copied).not.toContain('placedFurniture');

    await diagnostics.getByRole('button', { name: 'Clear' }).click();
    await expect(diagnostics).toContainText('No problems recorded on this device.');
  });
});
