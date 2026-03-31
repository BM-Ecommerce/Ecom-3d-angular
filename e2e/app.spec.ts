import { test, expect } from '@playwright/test';

const PRODUCT_URL = '/visualizer/10/roller-blinds/alara-alba/738/3802/45/2/5020';

// ── 🎯 FULL CONFIGURATOR JOURNEY ────────────────────────────────
test('Full 3D Configurator Journey - Roller Blinds Order', async ({ page }) => {

  await test.step('1️⃣ Open 3D Visualizer and wait for page to load', async () => {
    await page.goto(PRODUCT_URL);
    await expect(page.getByRole('heading', { name: 'Roller Blinds - Alara Alba' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Please enter your measurements')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible(); // 3D model loaded
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e/screenshots/step1-page-loaded.png' });
  });

  await test.step('2️⃣ Select unit type — cm', async () => {
    await page.getByRole('button', { name: 'cm' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'e2e/screenshots/step2-unit-cm.png' });
  });

  await test.step('3️⃣ Enter Width measurement — 120 cm', async () => {
    const widthInput = page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input');
    await widthInput.click();
    await widthInput.selectText();
    await widthInput.pressSequentially('120', { delay: 300 }); // type slowly — no shake
    await page.waitForTimeout(1500); // let 3D settle
    await page.screenshot({ path: 'e2e/screenshots/step3-width-entered.png' });
    expect(await widthInput.inputValue()).toBe('120');
  });

  await test.step('4️⃣ Enter Drop measurement — 150 cm', async () => {
    const dropInput = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
    await dropInput.click();
    await dropInput.selectText();
    await dropInput.pressSequentially('150', { delay: 300 }); // type slowly — no shake
    await page.waitForTimeout(1500); // let 3D settle
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

  await test.step('8️⃣ Verify Add to Cart is disabled without Control Side', async () => {
    const addToCart = page.locator('button').filter({ hasText: /Add to Cart/ });
    await addToCart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    // Button should be disabled — Control Side not selected yet
    await expect(addToCart).toBeDisabled();
    await page.screenshot({ path: 'e2e/screenshots/step8-cart-disabled.png' });
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
    await page.waitForTimeout(5000); // keep browser open to see result
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
  await widthInput.selectText();
  await widthInput.pressSequentially('1200', { delay: 300 });
  await page.waitForTimeout(1500);

  // Enter Drop
  const dropInput = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
  await dropInput.click();
  await dropInput.selectText();
  await dropInput.pressSequentially('1500', { delay: 300 });
  await page.waitForTimeout(1500);

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
  const w = page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input');
  await w.click(); await w.selectText(); await w.pressSequentially('1200', { delay: 300 });
  await page.waitForTimeout(1500);
  const d = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
  await d.click(); await d.selectText(); await d.pressSequentially('1500', { delay: 300 });
  await page.waitForTimeout(1500);

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

// ── TC04: Change Fabric and Color — 3D model should update ───────
test('TC04 - Change Fabric and Color updates 3D model', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator('text=Please enter your measurements')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2500);

  await test.step('Take screenshot of default fabric/color', async () => {
    await page.screenshot({ path: 'e2e/screenshots/tc04-before-change.png' });
  });

  await test.step('Change Fabric dropdown', async () => {
    const fabricSelect = page.locator('mat-form-field').filter({ hasText: /^Fabric/ }).locator('mat-select');
    await fabricSelect.click();
    await page.waitForTimeout(600);
    // Select the second option (different from current)
    const options = page.locator('mat-option');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
    } else {
      await options.first().click();
    }
    await page.waitForTimeout(1500); // wait for 3D to update
    await page.screenshot({ path: 'e2e/screenshots/tc04-fabric-changed.png' });
  });

  await test.step('Change Color dropdown', async () => {
    const colorSelect = page.locator('mat-form-field').filter({ hasText: /^Color/ }).locator('mat-select');
    await colorSelect.click();
    await page.waitForTimeout(600);
    const options = page.locator('mat-option');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
    } else {
      await options.first().click();
    }
    await page.waitForTimeout(1500); // wait for 3D to update
    await page.screenshot({ path: 'e2e/screenshots/tc04-color-changed.png' });
  });

  // 3D canvas should still be visible after changes
  await expect(page.locator('canvas')).toBeVisible();
});

// ── TC05: Validate measurements above max value ───────────────────
test('TC05 - Validate max measurement boundary (above 3500)', async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator('text=Please enter your measurements')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  await test.step('Enter Width above max (9999)', async () => {
    const widthInput = page.locator('mat-form-field').filter({ hasText: /Width/ }).locator('input');
    await widthInput.click();
    await widthInput.selectText();
    await widthInput.pressSequentially('9999', { delay: 300 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/tc05-width-over-max.png' });
  });

  await test.step('Enter Drop above max (9999)', async () => {
    const dropInput = page.locator('mat-form-field').filter({ hasText: /Drop/ }).locator('input');
    await dropInput.click();
    await dropInput.selectText();
    await dropInput.pressSequentially('9999', { delay: 300 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/tc05-drop-over-max.png' });
  });

  await test.step('Verify validation error is shown', async () => {
    // Form should show error message for out-of-range values
    const errorMsg = page.locator('mat-error, .error, text=/max|invalid|exceed/i');
    const hasError = await errorMsg.count() > 0;
    await page.screenshot({ path: 'e2e/screenshots/tc05-validation-shown.png' });
    expect(hasError).toBeTruthy();
  });
});
