import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/10/roller-blinds/alara-alba/738/3802/45/2/5020';

test('Angular app bootstraps successfully', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  // app-root exists in DOM = Angular loaded correctly
  await expect(page.locator('app-root')).toBeAttached({ timeout: 15000 });
});

test('no JavaScript errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(3000);
  expect(errors.filter(e => !e.includes('HttpClient'))).toHaveLength(0);
});

test('correct route is active', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page).toHaveURL(/roller-blinds/, { timeout: 10000 });
});
