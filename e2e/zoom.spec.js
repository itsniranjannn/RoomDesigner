import { test, expect } from './fixtures.js';
import { createRoomFromPreset, openApp } from './helpers.js';

// A browser at 200% zoom halves the room a page has, in CSS pixels, so a 1440 x 900 window
// becomes 720 x 450. The landing and About pages are taller than that, and the whole app used
// to sit under one `overflow: hidden`, so their lower half could not be reached at all.
test.use({ viewport: { width: 720, height: 450 } });

/** Scrolls the way a person does. Setting scrollTop in script works even on a page that has
 *  `overflow: hidden`, so it would pass whether or not anyone could actually scroll. */
async function wheelToBottom(page) {
  await page.mouse.move(360, 225);
  for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      moved: Math.round(
        Math.max(
          document.scrollingElement?.scrollTop || 0,
          document.body.scrollTop || 0,
          root?.scrollTop || 0
        )
      ),
      taller: root ? root.scrollHeight > root.clientHeight + 1 : false,
    };
  });
}

test.describe('at 200% browser zoom', () => {
  test('the landing page and the About page can be scrolled to their end', async ({ page }) => {
    await openApp(page);
    const landing = await wheelToBottom(page);
    expect(landing.taller, 'the landing page should be taller than this window').toBe(true);
    expect(landing.moved, 'a wheel should scroll the landing page').toBeGreaterThan(100);

    await page.getByRole('button', { name: /About/i }).first().click();
    // the landing page has gone, so we are on the other page, whatever it says
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeHidden();
    await page.waitForTimeout(800);
    const about = await wheelToBottom(page);
    expect(about.taller, 'the About page should be taller than this window').toBe(true);
    expect(about.moved, 'a wheel should scroll the About page').toBeGreaterThan(100);
  });

  test('the editor still fills the window exactly, with nothing to scroll', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page);
    await page.waitForTimeout(500);
    const fit = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        overflowsDown: root.scrollHeight > root.clientHeight + 1,
        overflowsAcross: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(fit.overflowsDown, 'the editor should not grow a scrollbar').toBe(false);
    expect(fit.overflowsAcross, 'nothing should overflow sideways').toBe(false);
  });
});
