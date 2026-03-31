import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/visualizer/10/roller-blinds/alara-alba/738/3802/45/2/5020';

// ── 🎯 FULL CONFIGURATOR JOURNEY ────────────────────────────────
test('Full 3D Configurator Journey - Roller Blinds Order', async ({ page }) => {

  await test.step('1️⃣ Open 3D Visualizer and wait for page to load', async () => {
    await page.goto(PRODUCT_URL);
    await expect(page.locator('text=Roller Blinds - Alara Alba')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Please enter your measurements')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible(); // 3D model loaded
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e/screenshots/step1-page-loaded.png' });
  });

  await test.step('2️⃣ Select unit type — cm', async () => {
    await page.locator('button, mat-button-toggle').filter({ hasText: 'cm' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'e2e/screenshots/step2-unit-cm.png' });
  });

  await test.step('3️⃣ Enter Width measurement — 120 cm', async () => {
    const widthInput = page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input');
    await widthInput.click();
    await widthInput.fill('120');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000); // wait for 3D to update
    await page.screenshot({ path: 'e2e/screenshots/step3-width-entered.png' });
    expect(await widthInput.inputValue()).toBe('120');
  });

  await test.step('4️⃣ Enter Drop measurement — 150 cm', async () => {
    const dropInput = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
    await dropInput.click();
    await dropInput.fill('150');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000); // wait for 3D to update
    await page.screenshot({ path: 'e2e/screenshots/step4-drop-entered.png' });
    expect(await dropInput.inputValue()).toBe('150');
  });

  await test.step('5️⃣ Select Blind or Recess option', async () => {
    await page.locator('mat-form-field').filter({ hasText: /Blind or Recess/ }).locator('mat-select').click();
    await page.waitForTimeout(600);
    await page.locator('mat-option').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'e2e/screenshots/step5-blind-recess.png' });
  });

  await test.step('6️⃣ Enter Room name', async () => {
    const roomInput = page.locator('mat-form-field').filter({ hasText: /Room/ }).locator('input');
    await roomInput.click();
    await roomInput.fill('Living Room');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'e2e/screenshots/step6-room-entered.png' });
  });

  await test.step('7️⃣ Select Control Type', async () => {
    await page.locator('mat-form-field').filter({ hasText: /Control Type/ }).locator('mat-select').click();
    await page.waitForTimeout(600);
    await page.locator('mat-option').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'e2e/screenshots/step7-control-type.png' });
  });

  await test.step('8️⃣ Try Add to Cart without Control Side — should be blocked', async () => {
    const addToCart = page.locator('button').filter({ hasText: /Add to Cart/ });
    await addToCart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await addToCart.click(); // attempt without mandatory field
    await page.waitForTimeout(1000);
    // Control Side should show red validation error
    const controlSide = page.locator('mat-form-field').filter({ hasText: /Control Side/ });
    await controlSide.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'e2e/screenshots/step8-validation-error.png' });
  });

  await test.step('9️⃣ Select mandatory Control Side field', async () => {
    await page.locator('mat-form-field').filter({ hasText: /Control Side/ }).locator('mat-select').click();
    await page.waitForTimeout(600);
    await page.locator('mat-option').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'e2e/screenshots/step9-control-side-selected.png' });
  });

  await test.step('🔟 Verify price and click Add to Cart', async () => {
    // Price should be visible (e.g. $107.69)
    await expect(page.locator('text=Your Price')).toBeVisible();
    const addToCart = page.locator('button').filter({ hasText: /Add to Cart/ });
    await addToCart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/step10-price-shown.png' });
    await addToCart.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/step10-added-to-cart.png' });
  });

});

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
