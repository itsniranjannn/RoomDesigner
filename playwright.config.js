import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against `vite preview` of the production build on a dedicated port
 * (never the dev server's 5173).
 *
 * Browser: locally the already-installed Chrome is used (channel "chrome", nothing to
 * download). Override with E2E_CHANNEL=msedge, or E2E_CHANNEL= (empty) to use Playwright's
 * own chromium (`npx playwright install chromium`). In CI the bundled chromium is used.
 *
 * E2E_SKIP_BUILD=1 reuses an existing dist/ instead of building first.
 */
const PORT = Number(process.env.E2E_PORT || 4399);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CI = Boolean(process.env.CI);
const channel =
  process.env.E2E_CHANNEL !== undefined
    ? process.env.E2E_CHANNEL || undefined
    : CI
      ? undefined
      : 'chrome';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    channel,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    // Less animation: faster, steadier runs (the app honors this setting)
    reducedMotion: 'reduce',
    // The service worker only adds offline caching; blocking it keeps runs deterministic
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Software WebGL so the 3D views render on machines and runners without a GPU
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `${process.env.E2E_SKIP_BUILD ? '' : 'npm run build && '}npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
