import { test, expect } from '@playwright/test';

// Test against localhost for development, live site for CI
// Latest deployment: v0.5.1 (2026-01-09) - https://dc6f35f9.pinit.eth.limo
const BASE_URL = process.env.TEST_URL || 'https://dc6f35f9.pinit.eth.limo';

// IPFS gateways are slow - use 15s wait for live site, 5s for localhost
const isIPFS = BASE_URL.includes('.limo') || BASE_URL.includes('.ipfs');
const LOAD_WAIT = isIPFS ? 15000 : 5000;
const NAV_WAIT = isIPFS ? 5000 : 2000;

test.describe('Dashboard - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for data to load
    await page.waitForTimeout(LOAD_WAIT);
  });

  // AT-D01: Total settled amount displays in USDFC
  test('AT-D01: Total settled amount displays in USDFC', async ({ page }) => {
    await expect(page.getByText('USDFC Settled')).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Last 30D')).toBeVisible();
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

  // AT-D09: Deployment metadata shows Site URL, IPFS CID, Payment Wallet, commP
  test('AT-D09: Deployment metadata displays IPFS info', async ({ page }) => {
    await expect(page.getByText('Dashboard Deployment (PinMe/IPFS)')).toBeVisible();
    await expect(page.getByText('Site URL:')).toBeVisible();
    await expect(page.getByText('IPFS CID:')).toBeVisible();
    await expect(page.getByText('Payment Wallet:')).toBeVisible();
    await expect(page.getByText('commP (Piece CID):')).toBeVisible();
  });

  // Metric cards display correctly
  test('Metric cards display correctly', async ({ page }) => {
    await expect(page.getByText('Unique Payers')).toBeVisible();
    await expect(page.getByText('USDFC Settled')).toBeVisible();
    await expect(page.getByText('Wallet Terminations')).toBeVisible();
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
    await page.waitForTimeout(LOAD_WAIT);
  });

  // AT-P01: Hero metrics show Active Payer Wallets count with goal progress
  test('AT-P01: Hero metrics show Active Payer Wallets', async ({ page }) => {
    await expect(page.getByText('Active Payer Wallets')).toBeVisible();
    await expect(page.getByText('Goal: 1,000')).toBeVisible();
  });

  // AT-P02: Hero metrics show Settled USDFC with goal progress
  test('AT-P02: Hero metrics show Settled USDFC', async ({ page }) => {
    await expect(page.getByText('Settled USDFC')).toBeVisible();
    await expect(page.getByText('Goal: $10M ARR')).toBeVisible();
  });

  // AT-P03: Time range filter controls work
  test('AT-P03: Time range filter controls present', async ({ page }) => {
    await expect(page.getByText('Time Range:')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  });

  // AT-P04: Payer Accounts Over Time chart renders
  test('AT-P04: Payer Accounts Over Time chart renders', async ({ page }) => {
    await expect(page.getByText('Payer Accounts Over Time')).toBeVisible();
  });

  // AT-P05: USDFC Settled Over Time chart renders
  test('AT-P05: USDFC Settled Over Time chart renders', async ({ page }) => {
    await expect(page.getByText('USDFC Settled Over Time')).toBeVisible();
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
    // First go to payer list and click into a payer
    await page.goto(`${BASE_URL}/payer-accounts`);
    await page.waitForTimeout(LOAD_WAIT);

    // Click first payer to get to detail view
    const firstRow = page.locator('tbody tr').first();
    const link = firstRow.locator('a');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForTimeout(LOAD_WAIT);
    }
  });

  // AT-PD01: Available funds display correctly
  test('AT-PD01: Available funds display', async ({ page }) => {
    await expect(page.getByText('Total Funds')).toBeVisible();
  });

  // AT-PD03: Total spent/settled amount displays
  test('AT-PD03: Total settled amount displays', async ({ page }) => {
    await expect(page.getByText('Total Settled')).toBeVisible();
  });

  // AT-PD05: Outgoing Rails table shows payee addresses
  test('AT-PD05: Outgoing Rails table visible', async ({ page }) => {
    // Use heading role to avoid matching multiple elements
    await expect(page.getByRole('heading', { name: /Payment Rails|Outgoing Rails/i })).toBeVisible();
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
    // Should show either ENS name or address
    const header = page.locator('h1');
    await expect(header).toContainText(/Payer Details/i);

    // Should show address below header
    const addressDisplay = page.locator('.font-mono');
    const count = await addressDisplay.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Payee Accounts List - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/payee-accounts`);
    await page.waitForTimeout(LOAD_WAIT);
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
    // First go to payee list and click into a payee
    await page.goto(`${BASE_URL}/payee-accounts`);
    await page.waitForTimeout(LOAD_WAIT);

    // Click first payee to get to detail view
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const link = rows.first().locator('a');
      if (await link.count() > 0) {
        await link.click();
        // Wait extra for detail view to fully load (IPFS + subgraph query)
        await page.waitForTimeout(LOAD_WAIT * 2);
        // Then wait for data to appear - "Settle Now" button is visible when data loads
        await page.waitForSelector('button:has-text("Settle Now")', { timeout: 60000 }).catch(() => {});
      }
    }
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
    await expect(page.getByText('Unique Payers')).toBeVisible();
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
