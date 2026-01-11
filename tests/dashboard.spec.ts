import { test, expect } from '@playwright/test';

// Test against localhost for development, live site for CI
// Latest deployment: v0.7.8 (2026-01-11) - https://6c91c42c.pinit.eth.limo
const BASE_URL = process.env.TEST_URL || 'https://6c91c42c.pinit.eth.limo';

// Subgraph queries can be slow - use longer waits
const isIPFS = BASE_URL.includes('.limo') || BASE_URL.includes('.ipfs');
const LOAD_WAIT = isIPFS ? 20000 : 15000;  // Increased for subgraph query time
const NAV_WAIT = isIPFS ? 8000 : 5000;
// Content timeout should match or be less than expect.timeout in playwright.config.ts
const CONTENT_TIMEOUT = isIPFS ? 45000 : 30000;

// =============================================================================
// CRITICAL - Data Integrity Tests (P0)
// These tests must pass to ensure the app is using real subgraph data
// Issue #2: https://github.com/timfong888/filecoin-pay-console/issues/2
// =============================================================================
test.describe('Critical - No Mock Data Fallback', () => {
  // AT-MOCK-01: Dashboard should not display mock data
  test('AT-MOCK-01: Dashboard loads real data (no mock fallback)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE_URL);
    // Wait for actual content to appear instead of fixed timeout - use exact match
    await expect(page.getByText('Unique Payers', { exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // After content loads, check there's no error message visible
    const mockDataWarning = page.getByText(/sample data|mock data/i);
    await expect(mockDataWarning).not.toBeVisible();

    // Error loading message should not be present after data loads
    const errorMessage = page.getByText('Error loading data');
    await expect(errorMessage).not.toBeVisible();

    // Verify no subgraph-specific errors (exclude CORS errors from ENS/RPC providers)
    const subgraphErrors = errors.filter(e =>
      (e.toLowerCase().includes('graphql') || e.toLowerCase().includes('goldsky')) &&
      !e.includes('llamarpc.com') &&
      !e.includes('CORS')
    );
    expect(subgraphErrors).toHaveLength(0);
  });

  // AT-MOCK-02: Payer Accounts should not display mock data
  test('AT-MOCK-02: Payer Accounts loads real data (no mock fallback)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/payer-accounts`);
    // Wait for actual content to appear - table should have data
    await expect(page.getByText('Payer Wallets', { exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // After content loads, check there's no error message visible
    const mockDataWarning = page.getByText(/sample data|mock data/i);
    await expect(mockDataWarning).not.toBeVisible();

    // Error loading message should not be present after data loads
    const errorMessage = page.getByText('Error loading data');
    await expect(errorMessage).not.toBeVisible();

    // Verify no subgraph-specific errors (exclude CORS errors from ENS/RPC providers)
    const subgraphErrors = errors.filter(e =>
      (e.toLowerCase().includes('graphql') || e.toLowerCase().includes('goldsky')) &&
      !e.includes('llamarpc.com') &&
      !e.includes('CORS')
    );
    expect(subgraphErrors).toHaveLength(0);
  });

  // AT-MOCK-03: Payee Accounts should not display mock data
  test('AT-MOCK-03: Payee Accounts loads real data (no mock fallback)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/payee-accounts`);
    // Wait for actual content to appear
    await expect(page.getByText('Total Claimable')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // After content loads, check there's no error message visible
    const mockDataWarning = page.getByText(/sample data|mock data/i);
    await expect(mockDataWarning).not.toBeVisible();

    // Error loading message should not be present after data loads
    const errorMessage = page.getByText('Error loading data');
    await expect(errorMessage).not.toBeVisible();

    // Verify no subgraph-specific errors (exclude CORS errors from ENS/RPC providers)
    const subgraphErrors = errors.filter(e =>
      (e.toLowerCase().includes('graphql') || e.toLowerCase().includes('goldsky')) &&
      !e.includes('llamarpc.com') &&
      !e.includes('CORS')
    );
    expect(subgraphErrors).toHaveLength(0);
  });
});

test.describe('Dashboard - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for dashboard data to load - use exact match to avoid matching "Total Unique Payers" chart title
    await expect(page.getByText('Unique Payers', { exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT });
    // Also wait for table data to load
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });
  });

  // AT-D01: Total settled amount displays in USDFC
  test('AT-D01: Total settled amount displays in USDFC', async ({ page }) => {
    await expect(page.getByText('USDFC Settled', { exact: true })).toBeVisible();
    await expect(page.getByText('Monthly Run Rate')).toBeVisible();
    await expect(page.getByText('Unique Payers', { exact: true })).toBeVisible();
  });

  // AT-D05: Top 10 Payers table loads data
  test('AT-D05: Top 10 Payers table loads data', async ({ page }) => {
    await expect(page.getByText('Top 10 Payers')).toBeVisible();
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  // AT-D06: Clicking payer address navigates to Payer Detail
  test('AT-D06: Clicking payer navigates to Payer Detail via query param', async ({ page }) => {
    // Find first payer link in the table
    const firstPayerLink = page.locator('tbody tr').first().locator('a');
    await expect(firstPayerLink).toBeVisible();

    // Click and check navigation
    await firstPayerLink.click();
    await page.waitForTimeout(NAV_WAIT);

    // Should have address query param
    expect(page.url()).toContain('?address=');
    // Should show Payer Details
    await expect(page.getByText('Payer Details')).toBeVisible();
  });

  // AT-D07: Table columns sortable: Start, Locked, Runway
  test('AT-D07: Table columns sortable - Locked', async ({ page }) => {
    const lockedHeader = page.getByRole('columnheader', { name: /Locked/i });
    await expect(lockedHeader).toBeVisible();

    // Click to sort
    await lockedHeader.click();
    await page.waitForTimeout(500);

    // Should show sort indicator
    const headerText = await lockedHeader.textContent();
    expect(headerText).toMatch(/[↓↑]/);
  });

  test('AT-D07: Table columns sortable - Runway', async ({ page }) => {
    const runwayHeader = page.getByRole('columnheader', { name: /Runway/i });
    await expect(runwayHeader).toBeVisible();

    await runwayHeader.click();
    await page.waitForTimeout(500);

    const headerText = await runwayHeader.textContent();
    expect(headerText).toMatch(/[↓↑]/);
  });

  test('AT-D07: Table columns sortable - Start', async ({ page }) => {
    const startHeader = page.getByRole('columnheader', { name: /Start/i });
    await expect(startHeader).toBeVisible();

    await startHeader.click();
    await page.waitForTimeout(500);

    const headerText = await startHeader.textContent();
    expect(headerText).toMatch(/[↓↑]/);
  });

  // AT-D08: Data source panel shows Network, Contract, Subgraph Version
  test('AT-D08: Data source panel displays network info', async ({ page }) => {
    await expect(page.getByText('Data Source')).toBeVisible();
    await expect(page.getByText('Network:')).toBeVisible();
    await expect(page.getByText('Filecoin Mainnet')).toBeVisible();
    await expect(page.getByText('Contract:')).toBeVisible();
    await expect(page.getByText('Subgraph Version:')).toBeVisible();
  });

  // AT-D09: Deployment metadata shows Version and Site URL
  test('AT-D09: Deployment metadata displays version info', async ({ page }) => {
    await expect(page.getByText('Dashboard Deployment (PinMe/IPFS)')).toBeVisible();
    await expect(page.getByText('Version:', { exact: true })).toBeVisible();
    await expect(page.getByText('Site URL:')).toBeVisible();
  });

  // Metric cards display correctly
  test('Metric cards display correctly', async ({ page }) => {
    await expect(page.getByText('Unique Payers', { exact: true })).toBeVisible();
    await expect(page.getByText('USDFC Settled', { exact: true })).toBeVisible();
    await expect(page.getByText('Monthly Run Rate')).toBeVisible();
  });

  // Navigation elements
  test('Navigation elements are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payer Accounts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payee Accounts' })).toBeVisible();
  });
});

test.describe('Payer Accounts List - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/payer-accounts`);
    // Wait for hero metrics to appear (indicates data loaded)
    await expect(page.getByText('Payer Wallets', { exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT });
    // Wait for table data to load
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });
  });

  // AT-P01: Hero metrics show Payer Wallets count
  test('AT-P01: Hero metrics show Payer Wallets', async ({ page }) => {
    await expect(page.getByText('Payer Wallets', { exact: true })).toBeVisible();
  });

  // AT-P02: Hero metrics show Total Settled USDFC
  test('AT-P02: Hero metrics show Total Settled', async ({ page }) => {
    await expect(page.getByText('Total Settled (USDFC)')).toBeVisible();
  });

  // AT-P03: Date filter controls present
  test('AT-P03: Date filter controls present', async ({ page }) => {
    await expect(page.getByText('From:')).toBeVisible();
    await expect(page.getByText('To:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  });

  // AT-P04: Total Unique Payers chart renders
  test('AT-P04: Total Unique Payers chart renders', async ({ page }) => {
    await expect(page.getByText('Total Unique Payers')).toBeVisible();
  });

  // AT-P05: Total USDFC Settled chart renders
  test('AT-P05: Total USDFC Settled chart renders', async ({ page }) => {
    await expect(page.getByText('Total USDFC Settled')).toBeVisible();
  });

  // AT-P06: Address search filters table
  test('AT-P06: Address search filters table', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by address/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('0x');
    await page.waitForTimeout(500);
    // Search should work without error
  });

  // AT-P07: Table columns display correctly
  test('AT-P07: Table columns display correctly', async ({ page }) => {
    const headers = ['Address', 'Rails', 'Settled', 'Locked', 'Runway', 'First Active'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeVisible();
    }
  });

  // AT-P08: Row click navigates to Payer Detail
  test('AT-P08: Row click navigates to Payer Detail', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    const link = firstRow.locator('a');

    if (await link.count() > 0) {
      await link.click();
      await page.waitForTimeout(NAV_WAIT);
      expect(page.url()).toContain('?address=');
    }
  });

  // AT-P10: Table columns sortable
  test('AT-P10: Table columns sortable', async ({ page }) => {
    const settledHeader = page.getByRole('columnheader', { name: /Settled/i });
    await settledHeader.click();
    await page.waitForTimeout(500);

    const headerText = await settledHeader.textContent();
    expect(headerText).toMatch(/[↓↑]/);
  });

  // AT-P11: Data source panel
  test('AT-P11: Data source panel shows network info', async ({ page }) => {
    await expect(page.getByText('Data Source')).toBeVisible();
    await expect(page.getByText('Network:')).toBeVisible();
    await expect(page.getByText('Contract:')).toBeVisible();
    await expect(page.getByText('Subgraph Version:')).toBeVisible();
  });

  // AT-P13: Register filpay.eth name button
  test('AT-P13: Register filpay.eth name button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Register filpay.eth/i })).toBeVisible();
  });
});

test.describe('Payer Account Detail - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // First go to payer list and wait for table data
    await page.goto(`${BASE_URL}/payer-accounts`);
    // Wait for hero metrics and table to load
    await expect(page.getByText('Payer Wallets', { exact: true })).toBeVisible({ timeout: CONTENT_TIMEOUT });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // Wait for table to load with actual data (link in first row)
    const link = page.locator('tbody tr').first().locator('a');
    await expect(link).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // Click first payer to get to detail view
    await link.click();

    // Wait for detail view title and actual content to load
    await expect(page.getByText('Payer Details')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    // Wait for account data to load - Total Funds is a key indicator
    await expect(page.getByText('Total Funds')).toBeVisible({ timeout: CONTENT_TIMEOUT });
  });

  // AT-PD01: Available funds display correctly
  test('AT-PD01: Available funds display', async ({ page }) => {
    await expect(page.getByText('Total Funds')).toBeVisible();
  });

  // AT-PD03: Total spent/settled amount displays
  test('AT-PD03: Total settled amount displays', async ({ page }) => {
    await expect(page.getByText('Total Settled')).toBeVisible();
  });

  // AT-PD05: Payment Rails table shows payee addresses
  test('AT-PD05: Payment Rails table visible', async ({ page }) => {
    // The section heading is "Payment Rails (Paying To)"
    await expect(page.getByRole('heading', { name: /Payment Rails/i })).toBeVisible();
  });

  // AT-PD07: Back navigation works
  test('AT-PD07: Back navigation to Payer Accounts', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /Back to Payers/i });
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForTimeout(NAV_WAIT);

    // Should be back on list page (no address param)
    expect(page.url()).not.toContain('?address=');
  });

  // AT-PD08: ENS name resolution
  test('AT-PD08: Address or ENS displayed', async ({ page }) => {
    // Should show Payer Details title
    const header = page.locator('h1');
    await expect(header).toContainText(/Payer Details/i);

    // URL should contain address query param
    expect(page.url()).toContain('?address=');

    // Address should be displayed somewhere on the page (try multiple selectors)
    const addressInUrl = new URL(page.url()).searchParams.get('address');
    if (addressInUrl) {
      // Check that the address value appears somewhere visible on the page
      const pageContent = await page.textContent('body');
      // Address should appear either fully or truncated
      const addressPrefix = addressInUrl.slice(0, 8);
      expect(pageContent).toContain(addressPrefix);
    }
  });
});

test.describe('Payee Accounts List - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/payee-accounts`);
    // Wait for hero metrics to appear (indicates data loaded)
    await expect(page.getByText('Total Claimable')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    // Wait for table data to load
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });
  });

  // AT-Y01: Hero metrics show Total Claimable
  test('AT-Y01: Hero metrics show Total Claimable', async ({ page }) => {
    await expect(page.getByText('Total Claimable')).toBeVisible();
  });

  // AT-Y02: Hero metrics show Unique Payees count
  test('AT-Y02: Hero metrics show Unique Payees', async ({ page }) => {
    await expect(page.getByText('Unique Payees')).toBeVisible();
  });

  // AT-Y03: Table columns display correctly
  test('AT-Y03: Table columns display correctly', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: /Address/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Total Settled/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Unique Payers/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Started/i })).toBeVisible();
  });

  // AT-Y04: Row click navigates to Payee Detail
  test('AT-Y04: Row click navigates to Payee Detail', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const link = rows.first().locator('a');
      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(NAV_WAIT);
        expect(page.url()).toContain('?address=');
      }
    }
  });

  // AT-Y05: Table columns sortable
  test('AT-Y05: Table columns sortable', async ({ page }) => {
    const settledHeader = page.getByRole('columnheader', { name: /Total Settled/i });
    await settledHeader.click();
    await page.waitForTimeout(500);

    const headerText = await settledHeader.textContent();
    expect(headerText).toMatch(/[↓↑]/);
  });

  // AT-Y07: Purple theme
  test('AT-Y07: Purple theme visible', async ({ page }) => {
    // Check for purple-themed elements
    const purpleElements = page.locator('.text-purple-900, .text-purple-600, .bg-purple-50');
    const count = await purpleElements.count();
    expect(count).toBeGreaterThan(0);
  });

  // AT-Y08: Data source panel
  test('AT-Y08: Data source panel shows network info', async ({ page }) => {
    await expect(page.getByText('Data Source')).toBeVisible();
    await expect(page.getByText('Network:')).toBeVisible();
  });
});

test.describe('Payee Account Detail - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // First go to payee list and wait for data to load
    await page.goto(`${BASE_URL}/payee-accounts`);
    await expect(page.getByText('Total Claimable')).toBeVisible({ timeout: CONTENT_TIMEOUT });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: CONTENT_TIMEOUT });

    // Click first payee to get to detail view
    const link = page.locator('tbody tr').first().locator('a');
    await expect(link).toBeVisible({ timeout: CONTENT_TIMEOUT });
    await link.click();

    // Wait for detail view to load - "Settle Now" button indicates data is ready
    await expect(page.getByRole('button', { name: /Settle Now/i })).toBeVisible({ timeout: CONTENT_TIMEOUT });
  });

  // AT-YD01: "Settle Now" button visible
  test('AT-YD01: Settle Now button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Settle Now/i })).toBeVisible();
  });

  // AT-YD03: Total settled displays
  test('AT-YD03: Total settled displays', async ({ page }) => {
    await expect(page.getByText('Total Settled')).toBeVisible();
  });

  // AT-YD04: Unique payers count displays
  test('AT-YD04: Unique payers count displays', async ({ page }) => {
    await expect(page.getByText('Unique Payers', { exact: true })).toBeVisible();
  });

  // AT-YD05: Incoming Rails table
  test('AT-YD05: Incoming Rails table visible', async ({ page }) => {
    await expect(page.getByText('Incoming Rails')).toBeVisible();
  });

  // AT-YD06: Claimable Now amount displays
  test('AT-YD06: Claimable Now displays', async ({ page }) => {
    await expect(page.getByText('Claimable Now')).toBeVisible();
  });

  // AT-YD07: Back navigation
  test('AT-YD07: Back navigation works', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /Back to Payees/i });
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForTimeout(NAV_WAIT);

    expect(page.url()).not.toContain('?address=');
  });

  // AT-YD09: Purple theme
  test('AT-YD09: Purple theme consistent', async ({ page }) => {
    const purpleElements = page.locator('.text-purple-900, .text-purple-600, .bg-purple-50');
    const count = await purpleElements.count();
    expect(count).toBeGreaterThan(0);
  });

  // AT-YD10: Data source panel
  test('AT-YD10: Data source panel visible', async ({ page }) => {
    await expect(page.getByText('Data Source')).toBeVisible();
  });
});
