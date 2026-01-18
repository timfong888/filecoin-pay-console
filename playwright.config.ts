import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Supports both local and deployed testing:
 *
 * Local testing (TDD workflow):
 *   npm run test:e2e:ga:local      - Test localhost in GA mode
 *   npm run test:e2e:prototype:local - Test localhost in Prototype mode
 *
 * Deployed testing (verification):
 *   npm run test:e2e:ga:deployed   - Test filpay-ga.pinit.eth.limo
 *   npm run test:e2e:prototype:deployed - Test filpay-prototype.pinit.eth.limo
 *
 * Environment variables:
 *   TEST_URL - Override the base URL (e.g., http://localhost:3000)
 */

// Deployed subdomain URLs
const DEPLOYED_GA_URL = 'https://filpay-ga.pinit.eth.limo';
const DEPLOYED_PROTOTYPE_URL = 'https://filpay-prototype.pinit.eth.limo';
const LOCAL_URL = 'http://localhost:3000';

// Determine base URL from environment
function getBaseURL(): string {
  // Explicit TEST_URL takes priority
  if (process.env.TEST_URL) {
    return process.env.TEST_URL;
  }

  // Check for deployed mode flags
  if (process.env.TEST_DEPLOYED === 'ga') {
    return DEPLOYED_GA_URL;
  }
  if (process.env.TEST_DEPLOYED === 'prototype') {
    return DEPLOYED_PROTOTYPE_URL;
  }

  // Default to localhost for local TDD
  return LOCAL_URL;
}

const baseURL = getBaseURL();

// IPFS gateways are slow, increase timeout significantly
const isIPFS = baseURL.includes('.limo') || baseURL.includes('.ipfs');
const isLocal = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

export default defineConfig({
  testDir: './tests',
  // Subgraph can be rate-limited - limit parallelism to avoid failures
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
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
  // Timeouts: longer for IPFS, shorter for localhost
  timeout: isIPFS ? 120000 : 60000,
  expect: {
    timeout: isIPFS ? 45000 : 30000,
  },
  // For local testing, start dev server automatically
  webServer: isLocal ? {
    command: `NEXT_PUBLIC_CONSOLE_MODE=${process.env.CONSOLE_MODE || 'ga'} npm run dev`,
    url: LOCAL_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  } : undefined,
});
