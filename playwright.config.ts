import { defineConfig, devices } from '@playwright/test';

// IPFS gateways are slow, increase timeout significantly
const isIPFS = (process.env.TEST_URL || '').includes('.limo') ||
               (process.env.TEST_URL || '').includes('.ipfs') ||
               !process.env.TEST_URL;

export default defineConfig({
  testDir: './tests',
  // Subgraph can be rate-limited - limit parallelism to avoid failures
  fullyParallel: false,  // Run tests sequentially to avoid subgraph rate limiting
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,  // Single retry for local, 2 for CI
  workers: 1,  // Single worker to avoid overwhelming the subgraph
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
  // Subgraph queries can be slow - use longer timeouts for all environments
  timeout: isIPFS ? 120000 : 60000,  // Increased localhost timeout for subgraph queries
  expect: {
    timeout: isIPFS ? 45000 : 30000,  // Increased expect timeout for content loading
  },
});
