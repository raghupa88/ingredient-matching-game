import { test, expect } from '@playwright/test';

test.describe('Setup screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero title is visible', async ({ page }) => {
    // The hero title is always rendered (in Tamil or via i18n key)
    const hero = page.locator('.hero-title');
    await expect(hero).toBeVisible();
  });

  test('hero subtitle is visible', async ({ page }) => {
    const subtitle = page.locator('.hero-subtitle');
    await expect(subtitle).toBeVisible();
  });

  test('mode selector has 2 mode cards', async ({ page }) => {
    const cards = page.locator('.mode-card');
    await expect(cards).toHaveCount(2);
  });

  test('difficulty selector has 3 options', async ({ page }) => {
    const pills = page.locator('.difficulty-pill');
    await expect(pills).toHaveCount(3);
    // Verify easy/medium/hard are all present
    await expect(page.locator('.difficulty-pill.easy')).toBeVisible();
    await expect(page.locator('.difficulty-pill.medium')).toBeVisible();
    await expect(page.locator('.difficulty-pill.hard')).toBeVisible();
  });

  test('start button is visible and enabled', async ({ page }) => {
    const startBtn = page.locator('.start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test('language switcher button visible when i18n is present', async ({ page }) => {
    // LanguageSwitcher is added by the i18n PR (feat/i18n-and-new-recipes).
    // If it is present, verify it works; otherwise skip.
    const langBtn = page.locator('.lang-switcher, [data-testid="lang-switcher"], button:has-text("தமிழ்"), button:has-text("English")');
    const count = await langBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await expect(langBtn.first()).toBeVisible();
  });

  test('language switch toggles page text when i18n is present', async ({ page }) => {
    const langBtn = page.locator('.lang-switcher, [data-testid="lang-switcher"], button:has-text("தமிழ்"), button:has-text("English")');
    const count = await langBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Click to switch to Tamil
    await langBtn.first().click();
    // Tamil start button text should appear
    await expect(page.locator('.start-btn')).toContainText('விளையாடு');

    // Click again to return to English
    await langBtn.first().click();
    await expect(page.locator('.start-btn')).toContainText('Start Game');
  });

  test('mode 1 is selected by default', async ({ page }) => {
    const mode1Card = page.locator('.mode-card').first();
    await expect(mode1Card).toHaveClass(/selected/);
  });

  test('easy difficulty is selected by default', async ({ page }) => {
    const easyPill = page.locator('.difficulty-pill.easy');
    await expect(easyPill).toHaveClass(/selected/);
  });
});
