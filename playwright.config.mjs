import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['junit', { outputFile: 'test-results/results.xml' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:8888', trace: 'retain-on-failure', screenshot: 'on', video: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 8888 --bind 127.0.0.1', url: 'http://127.0.0.1:8888', reuseExistingServer: !process.env.CI, timeout: 30000 }
});
