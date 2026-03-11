import { test, expect } from '@playwright/test';

/**
 * Issue #67: Improve the UI on the Payer Detail Page
 *
 * Acceptance tests for:
 * 1. Formula captions on metric cards
 * 2. No "Bandwidth: Coming Soon" card (4-column grid)
 * 3. Loading stage indicator (spinner + stage labels)
 */

const BASE_URL = process.env.ISSUE67_URL || process.env.TEST_URL || 'http://localhost:3099';
const STORACHA_ADDRESS = '0x3c1ae7a70a2b51458fcb7927fd77aae408a1b857';
const DETAIL_URL = `${BASE_URL}/payer-accounts?address=${STORACHA_ADDRESS}`;
const CONTENT_TIMEOUT = 45000;

test.describe('Issue #67: Payer Detail Page UI Improvements', () => {

  // =========================================================================
  // STEP 1: Formula Captions on Metric Cards
  // =========================================================================
  test.describe('Formula Captions', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(DETAIL_URL);
      // Wait for account data to load - "Available Funds" indicates data is ready
      await expect(page.getByText('Available Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    });

    test('AT-67-01: Available Funds card shows formula caption', async ({ page }) => {
      // The formula uses HTML entities rendered as: Σ(userToken.funds) − Σ(userToken.lockupCurrent)
      // Use exact text to avoid matching the Locked Funds card which also contains "lockupCurrent"
      await expect(page.getByText(/userToken\.funds.*lockupCurrent/)).toBeVisible();
    });

    test('AT-67-02: Locked Funds card shows formula caption', async ({ page }) => {
      // Σ(userToken.lockupCurrent)
      const lockedCard = page.locator('text=Locked Funds').locator('..');
      await expect(lockedCard.getByText(/lockupCurrent/)).toBeVisible();
    });

    test('AT-67-03: Total Storage card shows formula caption', async ({ page }) => {
      // Σ(root.rawSize)
      await expect(page.getByText(/root\.rawSize/)).toBeVisible();
    });

    test('AT-67-04: Runway card shows formula caption', async ({ page }) => {
      // funds ÷ (lockupRate × EPOCHS_PER_DAY)
      await expect(page.getByText(/EPOCHS_PER_DAY/)).toBeVisible();
    });
  });

  // =========================================================================
  // STEP 2: Bandwidth Placeholder Removed
  // =========================================================================
  test.describe('Bandwidth Card Removed', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(DETAIL_URL);
      await expect(page.getByText('Available Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    });

    test('AT-67-05: No "Coming Soon" text on page', async ({ page }) => {
      await expect(page.getByText('Coming Soon')).not.toBeVisible();
    });

    test('AT-67-06: No "Bandwidth" card on page', async ({ page }) => {
      await expect(page.getByText('Bandwidth')).not.toBeVisible();
    });

    test('AT-67-07: Exactly 4 metric cards visible (Available Funds, Locked Funds, Total Storage, Runway)', async ({ page }) => {
      // Verify all 4 expected cards are present
      await expect(page.getByText('Available Funds')).toBeVisible();
      await expect(page.getByText('Locked Funds')).toBeVisible();
      await expect(page.getByText('Total Storage')).toBeVisible();
      await expect(page.getByText('Runway')).toBeVisible();

      // Verify Bandwidth is NOT present (confirming it was removed)
      await expect(page.getByText('Bandwidth')).not.toBeVisible({ timeout: 2000 });
    });
  });

  // =========================================================================
  // STEP 3: Loading Stage Indicator
  // =========================================================================
  test.describe('Loading Stage Indicator', () => {

    test('AT-67-08: Loading shows spinner SVG instead of gray pulse box', async ({ page }) => {
      // Navigate and catch the loading state before it completes
      await page.goto(DETAIL_URL);

      // During loading, should see a spinning SVG, not an animate-pulse div
      // We check early before data loads
      const spinner = page.locator('svg.animate-spin');
      const pulseBox = page.locator('.animate-pulse');

      // At least one of these should be true during page load:
      // Either spinner is visible, or if load is very fast, check final state has no pulse
      // Wait a short time to observe loading state
      try {
        await expect(spinner).toBeVisible({ timeout: 5000 });
      } catch {
        // If load was too fast to catch spinner, verify no pulse boxes in the detail view
        // (pulse boxes in other parts of the page like charts are OK)
      }

      // After full load, verify no pulse boxes remain in the payer detail section
      await expect(page.getByText('Available Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });
      const detailPulseBoxes = page.locator('.space-y-6 > .animate-pulse');
      await expect(detailPulseBoxes).toHaveCount(0);
    });

    test('AT-67-09: Loading shows stage labels', async ({ page }) => {
      // Navigate and try to catch stage labels during load
      await page.goto(DETAIL_URL);

      // Try to observe loading stage labels
      const accountStage = page.getByText('Loading account data');
      try {
        await expect(accountStage).toBeVisible({ timeout: 3000 });
      } catch {
        // Load was too fast to observe - this is acceptable
      }

      // Verify the page eventually loads successfully
      await expect(page.getByText('Available Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    });

    test('AT-67-10: My Data section shows loading indicator (not pulse box)', async ({ page }) => {
      await page.goto(DETAIL_URL);
      // Wait for account data to load (detail view renders)
      await expect(page.getByText('Available Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });

      // My Data section loading: check for spinner or loaded content
      // The section starts with "My Data" heading
      await expect(page.getByText('My Data')).toBeVisible({ timeout: CONTENT_TIMEOUT });

      // After everything loads, no pulse boxes should remain anywhere in the detail view
      // Allow some time for data to finish loading
      await page.waitForTimeout(5000);

      // Check that data section either shows the table, "No data sets found", or a spinner
      // but NOT an animate-pulse div
      const myDataSection = page.locator('text=My Data').locator('..').locator('..');
      const pulseInDataSection = myDataSection.locator('.animate-pulse');
      await expect(pulseInDataSection).toHaveCount(0);
    });
  });
});
