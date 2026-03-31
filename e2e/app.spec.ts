import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/10/roller-blinds/alara-alba/738/3802/45/2/5020';

test('3D visualizer loads successfully', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator('app-root')).toBeVisible({ timeout: 15000 });
});

test('page title is set', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test('configurator page renders', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page).toHaveURL(/roller-blinds/, { timeout: 10000 });
});
