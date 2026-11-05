import { test as base, expect } from '@playwright/test';

/**
 * Known harmless console noise. Everything else that reaches console.error or an uncaught
 * page error fails the test. Keep this list short and explain each entry.
 */
export const ALLOWED_CONSOLE_ERRORS = [
  // Offline support registers /sw.js in production builds. The e2e config blocks service
  // workers, so the registration is refused and the browser may say so.
  /service ?worker/i,
  /\bsw\.js\b/,
];

const isAllowed = (text) => ALLOWED_CONSOLE_ERRORS.some((re) => re.test(text));

/** Collects console errors and uncaught errors from a page into `problems`. */
export function watchPage(page, problems) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isAllowed(msg.text())) {
      problems.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    if (!isAllowed(String(err?.message))) problems.push(`pageerror: ${err.message}`);
  });
}

export const test = base.extend({
  // Set `test.use({ tourDisabled: false })` to see the first-run tour
  tourDisabled: [true, { option: true }],

  // Pages opened by a test (page, plus any made through `openPage`) are all watched
  problems: async ({}, use) => {
    await use([]);
  },

  page: async ({ page, problems, tourDisabled }, use) => {
    if (tourDisabled) {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('rd.tour.disabled', '1');
        } catch {
          /* storage blocked */
        }
      });
    }
    watchPage(page, problems);
    await use(page);
    expect(problems, 'no console errors or uncaught page errors').toEqual([]);
  },
});

export { expect };
