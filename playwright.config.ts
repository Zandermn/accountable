import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  use: {
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:15173',
    viewport: { width: 1440, height: 960 },
  },
  reporter: 'list',
});
