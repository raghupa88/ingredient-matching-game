import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium-en', use: { ...devices['Desktop Chrome'], locale: 'en-US' } },
    { name: 'chromium-ta', use: { ...devices['Desktop Chrome'], locale: 'ta-IN' } },
  ],
  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      url: 'http://localhost:3002/api/game/scores',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npm run dev --workspace=frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
