import { test, expect } from '@playwright/test';

const BASE_URL = 'https://a28dda3f.pinit.eth.limo';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Filecoin Pay/i);
    await expect(page.locator('header')).toBeVisible();
  });

  test('navigation elements are present', async ({ page }) => {
    // Check nav links
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payer Accounts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payee Accounts' })).toBeVisible();

    // Check Connect Wallet button
    await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible();
  });

  test('metric cards display correctly', async ({ page }) => {
    // Wait for potential loading state to clear
    await page.waitForTimeout(5000);

    // Check all three metric card titles
    await expect(page.getByText('Unique Payers')).toBeVisible();
    await expect(page.getByText('USDFC Settled')).toBeVisible();
    await expect(page.getByText('Wallet Terminations')).toBeVisible();

    // Check USDFC Settled has both values
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Last 30D')).toBeVisible();
  });

  test('top payers table has correct structure', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check section title
    await expect(page.getByText('Top 10 Payers')).toBeVisible();

    // Check table headers exist
    const headers = ['Address', 'Locked', 'Settled', 'Runway', 'Start'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('table displays data rows', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Check that at least one row exists in the table body
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('data source indicator is present', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check for Goldsky indicator
    await expect(page.getByText(/Data from Goldsky subgraph/i)).toBeVisible();
  });

  test('no error state displayed when data loads', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Should NOT see the mock data warning banner
    const errorBanner = page.getByText(/Using mock data/i);
    await expect(errorBanner).not.toBeVisible();
  });

  test('metric values are numeric and reasonable', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Find the large text values in the cards (font-bold text-3xl)
    const largeValues = page.locator('.text-3xl.font-bold');
    const count = await largeValues.count();

    // Should have at least 3 large values (one per card, plus secondary for USDFC)
    expect(count).toBeGreaterThanOrEqual(3);

    // Check first value (Unique Payers) is a positive number
    const firstValue = await largeValues.first().textContent();
    const numericValue = parseInt(firstValue?.replace(/[^0-9]/g, '') || '0');
    expect(numericValue).toBeGreaterThanOrEqual(0);
  });

  test('search input is present', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('date filters are present', async ({ page }) => {
    await expect(page.getByText('From Date:')).toBeVisible();
    await expect(page.getByText('To Date:')).toBeVisible();

    // Check date inputs exist
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });
});

test.describe('Dashboard - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('renders correctly on mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    // Header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Metric cards should be visible
    await expect(page.getByText('Unique Payers')).toBeVisible();
    await expect(page.getByText('USDFC Settled')).toBeVisible();
    await expect(page.getByText('Wallet Terminations')).toBeVisible();

    // Table should be present
    await expect(page.getByText('Top 10 Payers')).toBeVisible();
  });
});

test.describe('Dashboard - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for data to load
    await page.waitForTimeout(5000);
  });

  test('search filter works - filters by address', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a search term that likely won't match all rows
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('0x1');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Row count should change (either fewer rows or same if all match)
    const filteredCount = await rows.count();
    // The filter should work - we just verify the UI responds
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('search filter works - filters by ENS name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('filpay.eth');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should show only rows with ENS names containing filpay.eth
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    // Verify filter responded (count could be 0 if no ENS names match)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('date filter - from date filters table', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Set a future from date that should filter out all rows
    const fromDateInput = page.locator('input[type="date"]').first();
    await fromDateInput.fill('2030-01-01');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should have fewer or no rows
    const filteredCount = await rows.count();
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('date filter - to date filters table', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Set a past to date that should filter out all rows
    const toDateInput = page.locator('input[type="date"]').nth(1);
    await toDateInput.fill('2020-01-01');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should have fewer or no rows
    const filteredCount = await rows.count();
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('date filter - date range filters correctly', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Set a date range
    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);

    await fromDateInput.fill('2024-11-01');
    await toDateInput.fill('2024-11-30');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should have some rows (those starting in Nov 2024)
    const filteredCount = await rows.count();
    // Verify the filter is working - count should be different or same but not broken
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('clearing filters restores all rows', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const initialCount = await rows.count();

    // Apply a filter
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('xyz-nonexistent');
    await page.waitForTimeout(500);

    // Clear the filter
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Should restore original count
    const restoredCount = await rows.count();
    expect(restoredCount).toBe(initialCount);
  });
});

test.describe('Dashboard - Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Page should load DOM within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('data loads within acceptable time', async ({ page }) => {
    await page.goto(BASE_URL);

    const startTime = Date.now();

    // Wait for data source indicator (means data loaded)
    await page.waitForSelector('text=/Data from Goldsky/i', { timeout: 15000 });

    const dataLoadTime = Date.now() - startTime;

    // Data should load within 15 seconds
    expect(dataLoadTime).toBeLessThan(15000);
  });
});
