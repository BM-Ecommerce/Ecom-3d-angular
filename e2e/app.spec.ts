import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/10/roller-blinds/alara-alba/738/3802/45/2/5020';

test('Angular app bootstraps successfully', async ({ page }) => {
  await page.goto(PRODUCT_URL);
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

// ── Visual tests — run locally with ng serve ────────────────────
test('3D visualizer page renders content', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(4000); // wait for 3D + API to load
  await page.screenshot({ path: 'e2e/screenshots/visualizer.png', fullPage: true });
  // Page should have loaded something visible
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(0);
});

test('3D canvas is present', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(4000);
  const canvas = page.locator('canvas');
  const count = await canvas.count();
  expect(count).toBeGreaterThan(0); // Three.js renders a <canvas>
});
