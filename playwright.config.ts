import { defineConfig, devices } from '@playwright/test';

// IPFS gateways are slow, increase timeout significantly
const isIPFS = (process.env.TEST_URL || '').includes('.limo') ||
               (process.env.TEST_URL || '').includes('.ipfs') ||
               !process.env.TEST_URL;

export default defineConfig({
  testDir: './tests',
  // IPFS gateways are slow and flaky - limit parallelism and add retries
  fullyParallel: !isIPFS,
  forbidOnly: !!process.env.CI,
  retries: isIPFS ? 2 : (process.env.CI ? 2 : 0),
  workers: isIPFS ? 2 : (process.env.CI ? 1 : undefined),
  reporter: 'html',
  use: {
    baseURL: 'https://b5ff14b9.pinit.eth.limo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // IPFS needs longer timeouts - detail pages have multiple navigations
  timeout: isIPFS ? 120000 : 30000,
  expect: {
    timeout: isIPFS ? 30000 : 10000,
  },
});
