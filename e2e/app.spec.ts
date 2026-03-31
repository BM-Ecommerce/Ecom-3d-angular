import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/visualizer/10/roller-blinds/alara-alba/738/3802/45/2/5020';

// ── Test 1: Wait for page to load and enter Width + Drop ────────
test('TC01 - Enter Width and Drop measurements', async ({ page }) => {
  await page.goto(PRODUCT_URL);

  // Wait for the configurator form to fully load
  await expect(page.locator('text=Please enter your measurements')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Enter Width
  const widthInput = page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input');
  await widthInput.click();
  await widthInput.fill('1200');
  await page.waitForTimeout(800);

  // Enter Drop
  const dropInput = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
  await dropInput.click();
  await dropInput.fill('1500');
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'e2e/screenshots/tc01-width-drop.png' });

  expect(await widthInput.inputValue()).toBe('1200');
  expect(await dropInput.inputValue()).toBe('1500');
});

// ── Test 2: Select all mandatory dropdown fields ─────────────────
test('TC02 - Select mandatory fields', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator('text=Please enter your measurements')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Enter Width and Drop first
  await page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input').fill('1200');
  await page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input').fill('1500');
  await page.waitForTimeout(500);

  // Select Blind or Recess
  await page.locator('mat-form-field').filter({ hasText: /Blind or Recess/ }).locator('mat-select').click();
  await page.waitForTimeout(500);
  await page.locator('mat-option').first().click();
  await page.waitForTimeout(500);

  // Enter Room name
  const roomInput = page.locator('mat-form-field').filter({ hasText: /Room/ }).locator('input');
  await roomInput.click();
  await roomInput.fill('Living Room');
  await page.waitForTimeout(500);

  // Select Control Type
  await page.locator('mat-form-field').filter({ hasText: /Control Type/ }).locator('mat-select').click();
  await page.waitForTimeout(500);
  await page.locator('mat-option').first().click();
  await page.waitForTimeout(500);

  // Select Control Side
  await page.locator('mat-form-field').filter({ hasText: /Control Side/ }).locator('mat-select').click();
  await page.waitForTimeout(500);
  await page.locator('mat-option').first().click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'e2e/screenshots/tc02-mandatory-fields.png' });
});

// ── Test 3: Scroll down and click Add to Cart ────────────────────
test('TC03 - Scroll and click Add to Cart', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator('text=Please enter your measurements')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Fill all fields
  await page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input').fill('1200');
  await page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input').fill('1500');

  await page.locator('mat-form-field').filter({ hasText: /Blind or Recess/ }).locator('mat-select').click();
  await page.waitForTimeout(400);
  await page.locator('mat-option').first().click();

  await page.locator('mat-form-field').filter({ hasText: /Room/ }).locator('input').fill('Living Room');

  await page.locator('mat-form-field').filter({ hasText: /Control Type/ }).locator('mat-select').click();
  await page.waitForTimeout(400);
  await page.locator('mat-option').first().click();

  await page.locator('mat-form-field').filter({ hasText: /Control Side/ }).locator('mat-select').click();
  await page.waitForTimeout(400);
  await page.locator('mat-option').first().click();
  await page.waitForTimeout(500);

  // Scroll down on the right panel to reveal Add to Cart
  await page.locator('text=Add to Cart').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'e2e/screenshots/tc03-before-cart.png' });

  // Click Add to Cart
  await page.locator('text=Add to Cart').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'e2e/screenshots/tc03-after-cart.png' });
});
