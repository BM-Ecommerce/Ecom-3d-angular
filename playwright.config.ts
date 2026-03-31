import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4200/visualizer/',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx serve dist -p 4200',
    url: 'http://localhost:4200/visualizer/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
