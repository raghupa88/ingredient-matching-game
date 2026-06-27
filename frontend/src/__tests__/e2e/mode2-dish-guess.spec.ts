import { test, expect } from '@playwright/test';

test.describe('Mode 2 — Dish Guess', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Select Mode 2 (Dish Guess — second card)
    await page.locator('.mode-card').nth(1).click();
    await page.locator('.difficulty-pill.easy').click();
    await page.locator('.start-btn').click();
    // Wait for the game board to appear
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 10000 });
    // Wait for ingredient list to be rendered
    await expect(page.locator('.dish-guesser')).toBeVisible({ timeout: 5000 });
  });

  test('ingredient list is displayed', async ({ page }) => {
    const ingredients = page.locator('.ingredient-chip');
    await expect(ingredients).not.toHaveCount(0);
  });

  test('guess input is present and accepts text', async ({ page }) => {
    const input = page.locator('.guess-input');
    await expect(input).toBeVisible();
    await input.fill('Idli');
    await expect(input).toHaveValue('Idli');
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    const submitBtn = page.locator('.dish-guesser .btn-primary');
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables when guess is typed', async ({ page }) => {
    const input = page.locator('.guess-input');
    await input.fill('Dosa');
    await expect(page.locator('.dish-guesser .btn-primary')).toBeEnabled();
  });

  test('submitting a guess shows feedback panel', async ({ page }) => {
    const input = page.locator('.guess-input');
    await input.fill('Idli');
    await page.locator('.dish-guesser .btn-primary').click();
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });
  });

  test('"Next Round" button in feedback advances the round', async ({ page }) => {
    await page.locator('.guess-input').fill('Sambar');
    await page.locator('.dish-guesser .btn-primary').click();
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });

    const nextBtn = page.locator('.next-btn');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Next round or leaderboard should appear
    await expect(
      page.locator('.dish-guesser, .leaderboard')
    ).toBeVisible({ timeout: 10000 });
  });

  test('pressing Enter submits the guess form', async ({ page }) => {
    const input = page.locator('.guess-input');
    await input.fill('Pongal');
    await input.press('Enter');
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });
  });
});
