/**
 * Smoke tests for the public website (thegoldenunicorns.com).
 *
 * Read-only: navigation + content assertions only. Catches:
 *   - A bad deploy that 404s or blanks a key page
 *   - The homepage failing to render (title/hero gone)
 *   - The website → apply funnel link breaking (the main conversion path)
 *   - The custom 404 page regressing
 *
 * These run after each Pages deploy and nightly (see .github/workflows/e2e-smoke.yml).
 */

import { test, expect } from '@playwright/test';

// Key pages and a distinguishing fragment of each page's <title>.
const PAGES: { path: string; titleContains: string }[] = [
  { path: '/',            titleContains: 'The Golden Unicorns' },
  { path: '/about/',      titleContains: 'The Golden Unicorns' },
  { path: '/manifesto/',  titleContains: 'The Golden Unicorns' },
  { path: '/membership/', titleContains: 'Membership' },
  { path: '/app/',        titleContains: 'The Golden Unicorns' },
  { path: '/contact/',    titleContains: 'The Golden Unicorns' },
  { path: '/events/',     titleContains: 'The Golden Unicorns' },
];

test.describe('Public website — thegoldenunicorns.com', () => {
  test('homepage loads with the brand title and body content', async ({ page }) => {
    const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), 'homepage should return 200').toBe(200);
    await expect(page).toHaveTitle(/The Golden Unicorns/i);
    // Body should have real content, not a blank/error shell.
    const text = (await page.locator('body').innerText()).trim();
    expect(text.length, 'homepage body should not be empty').toBeGreaterThan(100);
  });

  for (const { path, titleContains } of PAGES) {
    test(`page loads: ${path}`, async ({ page }) => {
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${path} should return 200`).toBe(200);
      await expect(page).toHaveTitle(new RegExp(titleContains, 'i'));
    });
  }

  test('membership page links to the apply funnel (the conversion path)', async ({ page }) => {
    await page.goto('/membership/', { waitUntil: 'domcontentloaded' });
    const applyLink = page.locator('a[href*="membership.thegoldenunicorns.com/apply"]');
    await expect(
      applyLink.first(),
      'membership page must link to the apply funnel',
    ).toHaveCount(1, { timeout: 5000 }).catch(async () => {
      // Some layouts render more than one CTA — accept >= 1.
      expect(await applyLink.count()).toBeGreaterThan(0);
    });
  });

  test('apply funnel link is reachable (200, real form)', async ({ request }) => {
    const resp = await request.get('https://membership.thegoldenunicorns.com/apply/');
    expect(resp.status(), 'apply funnel should return 200').toBe(200);
    const body = await resp.text();
    expect(body, 'apply page should contain the wizard steps').toContain('data-step');
  });

  test('primary nav links resolve (no broken top-level links)', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Collect same-origin nav hrefs (skip anchors, mailto, external, assets).
    const hrefs = await page.locator('a[href]').evaluateAll((els) =>
      els
        .map((e) => (e as HTMLAnchorElement).getAttribute('href') || '')
        .filter(
          (h) =>
            h &&
            !h.startsWith('#') &&
            !h.startsWith('mailto:') &&
            !h.startsWith('http') &&
            !/\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(h),
        ),
    );
    const unique = [...new Set(hrefs)];
    expect(unique.length, 'homepage should have internal nav links').toBeGreaterThan(0);
    for (const href of unique) {
      const url = new URL(href, 'https://thegoldenunicorns.com').toString();
      const resp = await request.get(url);
      expect(resp.status(), `nav link ${href} should not be broken`).toBeLessThan(400);
    }
  });

  test('custom 404 page is served for unknown paths', async ({ page }) => {
    const resp = await page.goto('/this-path-does-not-exist-zzz/', {
      waitUntil: 'domcontentloaded',
    });
    expect(resp?.status(), 'unknown path should 404').toBe(404);
    // The custom 404 should still render branded content, not a bare error.
    const text = (await page.locator('body').innerText()).trim();
    expect(text.length).toBeGreaterThan(20);
  });
});
