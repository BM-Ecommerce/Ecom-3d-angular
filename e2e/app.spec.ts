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
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'e2e/screenshots/visualizer.png', fullPage: true });
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(0);
});

test('3D canvas is present', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(4000);
  const canvas = page.locator('canvas');
  const count = await canvas.count();
  expect(count).toBeGreaterThan(0);
});

test('enter width value in configurator', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(4000); // wait for configurator to load

  // Find width input field (Angular Material input)
  const widthInput = page.locator('input').filter({ hasText: '' }).first();
  await widthInput.click({ clickCount: 3 }); // select all existing text
  await widthInput.fill('120');              // type new width
  await page.keyboard.press('Tab');          // confirm input
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'e2e/screenshots/width-entered.png' });
});

test('drag 3D model to rotate', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await page.waitForTimeout(5000); // wait for 3D model to fully load

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Drag left to right to rotate the 3D model
    await page.mouse.move(centerX - 100, centerY);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.move(centerX + 100, centerY, { steps: 20 }); // slow drag
    await page.waitForTimeout(300);
    await page.mouse.up();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/after-drag.png' });
  }

  expect(box).not.toBeNull();
});
