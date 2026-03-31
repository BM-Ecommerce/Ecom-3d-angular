import { defineConfig } from '@playwright/test';

// Local config — points to your already-running ng serve
// Usage: npx playwright test --headed --slow-mo=800 --config=playwright.local.config.ts

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4200/visualizer',
    screenshot: 'on',
    video: 'on',
  },
});
