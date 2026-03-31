import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });
});

test('page title is set', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
