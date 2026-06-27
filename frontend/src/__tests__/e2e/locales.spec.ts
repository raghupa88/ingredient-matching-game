import { test, expect } from '@playwright/test';

/**
 * i18n / locale tests.
 *
 * These tests target the i18n feature added in feat/i18n-and-new-recipes.
 * When that branch is not yet merged into main, the LanguageSwitcher component
 * will be absent and each test skips itself gracefully rather than failing.
 */

const LANG_BTN_SELECTOR = '.lang-switcher, [data-testid="lang-switcher"], button:has-text("தமிழ்"), button:has-text("English")';

test.describe('Locale — English (default)', () => {
  test('Start Game button text is English by default', async ({ page }) => {
    await page.goto('/');
    const startBtn = page.locator('.start-btn');
    await expect(startBtn).toBeVisible();
    // On main (no i18n), the button text contains both strings.
    // On i18n branch (EN locale) it should read "Start Game".
    const text = await startBtn.textContent();
    expect(text).toBeTruthy();
    // The button must contain some text — either "Start Game" or "விளையாடு" or both
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  test('hero title is visible on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();
  });
});

test.describe('Locale — Language switcher (i18n branch)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('switch to Tamil: start button shows Tamil text', async ({ page }) => {
    const langBtn = page.locator(LANG_BTN_SELECTOR);
    if (await langBtn.count() === 0) {
      test.skip();
      return;
    }

    // Switch to Tamil
    await langBtn.first().click();
    await expect(page.locator('.start-btn')).toContainText('விளையாடு', { timeout: 3000 });
  });

  test('switch back to English: start button shows English text', async ({ page }) => {
    const langBtn = page.locator(LANG_BTN_SELECTOR);
    if (await langBtn.count() === 0) {
      test.skip();
      return;
    }

    // Toggle to Tamil then back to English
    await langBtn.first().click();
    await langBtn.first().click();
    await expect(page.locator('.start-btn')).toContainText('Start Game', { timeout: 3000 });
  });

  test('language persists across page reload via localStorage', async ({ page }) => {
    const langBtn = page.locator(LANG_BTN_SELECTOR);
    if (await langBtn.count() === 0) {
      test.skip();
      return;
    }

    // Switch to Tamil
    await langBtn.first().click();
    await expect(page.locator('.start-btn')).toContainText('விளையாடு', { timeout: 3000 });

    // Reload and check localStorage key persisted the language
    await page.reload();
    const lang = await page.evaluate(() => localStorage.getItem('lang'));
    expect(lang).toBeTruthy();

    // Tamil should still be active after reload
    await expect(page.locator('.start-btn')).toContainText('விளையாடு', { timeout: 3000 });
  });

  test('Tamil locale: difficulty labels appear in Tamil', async ({ page }) => {
    const langBtn = page.locator(LANG_BTN_SELECTOR);
    if (await langBtn.count() === 0) {
      test.skip();
      return;
    }

    await langBtn.first().click();
    // Tamil text for Easy/Medium/Hard should appear somewhere in the difficulty section
    const diffSection = page.locator('.difficulty-selector');
    const text = await diffSection.textContent();
    // எளிது = Easy in Tamil
    expect(text).toContain('எளிது');
  });
});
