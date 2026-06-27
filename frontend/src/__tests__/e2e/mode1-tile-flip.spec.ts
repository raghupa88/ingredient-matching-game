import { test, expect } from '@playwright/test';

test.describe('Mode 1 — Tile Flip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Select Mode 1 (first card — Tile Flip)
    await page.locator('.mode-card').first().click();
    // Select easy difficulty for predictable tile count
    await page.locator('.difficulty-pill.easy').click();
    // Start game
    await page.locator('.start-btn').click();
    // Wait for the game board to appear
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 10000 });
  });

  test('tiles render with hidden faces showing "?"', async ({ page }) => {
    await expect(page.locator('.tile')).not.toHaveCount(0);
    const fronts = page.locator('.tile-front');
    const count = await fronts.count();
    for (let i = 0; i < count; i++) {
      await expect(fronts.nth(i)).toContainText('?');
    }
  });

  test('clicking a tile flips it and shows ingredient name', async ({ page }) => {
    const firstTile = page.locator('.tile').first();
    await expect(firstTile).not.toHaveClass(/flipped/);
    await firstTile.click();
    await expect(firstTile).toHaveClass(/flipped/);
    // The tile-back should now be visible with ingredient text (non-empty)
    const back = firstTile.locator('.tile-back');
    await expect(back).not.toBeEmpty();
  });

  test('submit button is disabled when no tiles selected', async ({ page }) => {
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeDisabled();
  });

  test('selecting a tile enables the submit button', async ({ page }) => {
    await page.locator('.tile').first().click();
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeEnabled();
  });

  test('submitting selection shows feedback panel', async ({ page }) => {
    // Flip and select all tiles, then submit
    const tiles = page.locator('.tile');
    const count = await tiles.count();
    for (let i = 0; i < count; i++) {
      await tiles.nth(i).click();
    }
    await page.locator('.submit-btn').click();
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });
  });

  test('score area is visible during play', async ({ page }) => {
    await expect(page.locator('.score-board, .nav-score, [class*="score"]').first()).toBeVisible();
  });

  test('"Next Round" button appears in feedback and advances the game', async ({ page }) => {
    // Submit with any selection to trigger feedback
    await page.locator('.tile').first().click();
    await page.locator('.submit-btn').click();
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });

    const nextBtn = page.locator('.next-btn');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // After clicking Next Round, we should either be in the next round (game-board visible)
    // or if it was the last round, the leaderboard appears
    await expect(
      page.locator('.game-board, .leaderboard')
    ).toBeVisible({ timeout: 10000 });
  });

  test('timer renders and shows a countdown number', async ({ page }) => {
    const timer = page.locator('.timer-value');
    await expect(timer).toBeVisible();
    const text = await timer.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('leaderboard appears after 5 rounds and Play Again resets', async ({ page }) => {
    for (let round = 0; round < 5; round++) {
      // Wait for tiles to be present (game in playing phase)
      await expect(page.locator('.tile')).not.toHaveCount(0, { timeout: 10000 });

      // Click first tile to enable submit
      await page.locator('.tile').first().click();
      await page.locator('.submit-btn').click();
      await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });

      const nextBtn = page.locator('.next-btn');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
    }

    // After 5 rounds, leaderboard should appear
    await expect(page.locator('.leaderboard')).toBeVisible({ timeout: 10000 });

    // Play Again resets to setup
    await page.locator('.restart-btn').click();
    await expect(page.locator('.setup-screen')).toBeVisible();
  });
});
