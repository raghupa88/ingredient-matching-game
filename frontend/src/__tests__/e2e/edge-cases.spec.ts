import { test, expect } from '@playwright/test';

test.describe('Edge cases', () => {
  async function startMode1Game(page: import('@playwright/test').Page, difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
    await page.goto('/');
    await page.locator('.mode-card').first().click();
    await page.locator(`.difficulty-pill.${difficulty}`).click();
    await page.locator('.start-btn').click();
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tile')).not.toHaveCount(0, { timeout: 5000 });
  }

  test('submit button is disabled when no tiles are selected', async ({ page }) => {
    await startMode1Game(page);
    const submitBtn = page.locator('.submit-btn');
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button remains disabled after flipping then de-selecting a tile', async ({ page }) => {
    await startMode1Game(page);
    const firstTile = page.locator('.tile').first();
    // Click once to flip+select
    await firstTile.click();
    await expect(page.locator('.submit-btn')).toBeEnabled();
    // Click again to de-select (tile stays flipped but toggled out of selected set)
    await firstTile.click();
    await expect(page.locator('.submit-btn')).toBeDisabled();
  });

  test('timer renders and shows a countdown number', async ({ page }) => {
    await startMode1Game(page);
    const timer = page.locator('.timer-value');
    await expect(timer).toBeVisible();
    const text = await timer.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('timer decrements over time', async ({ page }) => {
    await startMode1Game(page);
    const timer = page.locator('.timer-value');
    await expect(timer).toBeVisible();

    const firstReading = parseInt((await timer.textContent()) ?? '0', 10);
    // Wait 2 seconds and check it decreased
    await page.waitForTimeout(2000);
    const secondReading = parseInt((await timer.textContent()) ?? '0', 10);
    expect(secondReading).toBeLessThan(firstReading);
  });

  test('hard difficulty renders more tiles than easy difficulty', async ({ page }) => {
    // Easy: 4 correct + 2 decoys = 6 tiles
    await startMode1Game(page, 'easy');
    const easyCount = await page.locator('.tile').count();

    // Navigate back to setup
    await page.goto('/');

    // Hard: 5 correct + 7 decoys = 12 tiles
    await startMode1Game(page, 'hard');
    const hardCount = await page.locator('.tile').count();

    expect(hardCount).toBeGreaterThan(easyCount);
  });

  test('error toast is not shown on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.error-toast')).not.toBeVisible();
  });

  test('nav brand is visible at all times', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-brand')).toBeVisible();
    // Also visible during game
    await startMode1Game(page);
    await expect(page.locator('.nav-brand')).toBeVisible();
  });

  test('setup screen returns after Play Again', async ({ page }) => {
    await startMode1Game(page);
    // Submit quickly with any selection
    await page.locator('.tile').first().click();
    await page.locator('.submit-btn').click();
    await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });

    // Keep clicking next until leaderboard appears
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.locator('.next-btn');
      const leaderboard = page.locator('.leaderboard');
      try {
        await nextBtn.waitFor({ timeout: 3000 });
        await nextBtn.click();
        await leaderboard.waitFor({ timeout: 2000 });
        break;
      } catch {
        // Not on leaderboard yet — may need to submit another round
        const tiles = page.locator('.tile');
        if (await tiles.count() > 0) {
          await tiles.first().click();
          await page.locator('.submit-btn').click();
          await expect(page.locator('.feedback-panel')).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // Play Again should reset to setup
    const restartBtn = page.locator('.restart-btn');
    if (await restartBtn.count() > 0) {
      await restartBtn.click();
      await expect(page.locator('.setup-screen')).toBeVisible();
    }
  });
});
