import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the public website (thegoldenunicorns.com).
 *
 * Read-only smoke tests — they only navigate and assert content, never
 * submit anything, so they are safe to run against production.
 *
 * Override the target with WEBSITE_BASE_URL (e.g. a preview URL):
 *   WEBSITE_BASE_URL=https://staging.thegoldenunicorns.com npx playwright test
 */
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 1, // a single retry absorbs transient CDN/Pages hiccups
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.WEBSITE_BASE_URL ?? 'https://thegoldenunicorns.com',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
