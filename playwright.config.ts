import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4200',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx serve dist/visualizer -p 4200 -s --no-clipboard',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
