# Playwright Test & Acceptance Plan

## Test URL

## Acceptance Criteria

### AC1: Page Load & Navigation
- [ ] Page loads within 10 seconds
- [ ] No console errors on load
- [ ] Header displays with correct navigation items
- [ ] "Connect Wallet" button is visible

### AC2: Metric Cards Display
- [ ] "Unique Payers" card is visible with numeric value
- [ ] "USDFC Settled" card shows Total and Last 30D values
- [ ] "Wallet Terminations" card is visible with numeric value
- [ ] All three cards render without layout issues

### AC3: Data Loading
- [ ] Loading skeleton appears initially (or data loads quickly)
- [ ] Real data replaces loading state (no mock data warning)
- [ ] Data source indicator shows "Data from Goldsky subgraph"

### AC4: Top Payers Table
- [ ] Table header shows: Address, Locked, Settled, Runway, Start
- [ ] Table displays at least 1 row of data
- [ ] Addresses are formatted correctly (truncated or ENS)
- [ ] Currency values display with $ prefix

### AC5: Responsive Layout
- [ ] Dashboard renders correctly on desktop (1280px)
- [ ] Metric cards stack on mobile (375px)
- [ ] Table is scrollable on mobile

---

## Playwright Test Specs

### Test 1: Page Load
```typescript
test('dashboard loads successfully', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');
  await expect(page).toHaveTitle(/Filecoin Pay/i);
  await expect(page.locator('header')).toBeVisible();
});
```

### Test 2: Navigation Elements
```typescript
test('navigation elements are present', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');

  // Check nav links
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Payer Accounts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Payee Accounts' })).toBeVisible();

  // Check Connect Wallet button
  await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible();
});
```

### Test 3: Metric Cards
```typescript
test('metric cards display data', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');

  // Wait for data to load (no loading skeletons)
  await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Check Unique Payers card
  await expect(page.getByText('Unique Payers')).toBeVisible();

  // Check USDFC Settled card
  await expect(page.getByText('USDFC Settled')).toBeVisible();
  await expect(page.getByText('Total')).toBeVisible();
  await expect(page.getByText('Last 30D')).toBeVisible();

  // Check Wallet Terminations card
  await expect(page.getByText('Wallet Terminations')).toBeVisible();
});
```

### Test 4: Top Payers Table
```typescript
test('top payers table displays correctly', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');

  // Wait for data load
  await page.waitForTimeout(3000);

  // Check table header
  await expect(page.getByText('Top 10 Payers')).toBeVisible();

  // Check table columns
  await expect(page.getByRole('columnheader', { name: 'Address' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Locked' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Settled' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Runway' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Start' })).toBeVisible();

  // Check at least one data row exists
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount({ minimum: 1 });
});
```

### Test 5: Data Source Indicator
```typescript
test('data source indicator is present', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');
  await page.waitForTimeout(3000);

  await expect(page.getByText(/Data from Goldsky subgraph/i)).toBeVisible();
});
```

### Test 6: No Error States
```typescript
test('no error messages displayed', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');
  await page.waitForTimeout(5000);

  // Should NOT see mock data warning
  await expect(page.getByText(/Using mock data/i)).not.toBeVisible();
});
```

### Test 7: Responsive - Mobile
```typescript
test('mobile layout works', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://3ae62f46.pinit.eth.limo/');

  // Header should be visible
  await expect(page.locator('header')).toBeVisible();

  // Cards should stack vertically
  const cards = page.locator('[class*="Card"]');
  await expect(cards).toHaveCount({ minimum: 3 });
});
```

### Test 8: Values Are Numeric
```typescript
test('metric values are numeric', async ({ page }) => {
  await page.goto('https://3ae62f46.pinit.eth.limo/');
  await page.waitForTimeout(5000);

  // Get the Unique Payers value and verify it's a number
  const uniquePayersCard = page.locator('text=Unique Payers').locator('..');
  const value = await uniquePayersCard.locator('.text-3xl').textContent();
  expect(parseInt(value || '0')).toBeGreaterThan(0);
});
```

---

## Filter Tests

### AC6: Search & Date Filters
- [ ] Search input filters table by address
- [ ] Search input filters table by ENS name
- [ ] From Date filter excludes earlier rows
- [ ] To Date filter excludes later rows
- [ ] Date range filter works correctly
- [ ] Clearing filters restores all rows

### Test 9: Search Filter - Address
```typescript
test('search filter works - filters by address', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  const searchInput = page.getByPlaceholder(/search/i);
  await searchInput.fill('0x1');
  await page.waitForTimeout(500);

  const filteredCount = await rows.count();
  expect(filteredCount).toBeGreaterThanOrEqual(0);
});
```

### Test 10: Search Filter - ENS Name
```typescript
test('search filter works - filters by ENS name', async ({ page }) => {
  const searchInput = page.getByPlaceholder(/search/i);
  await searchInput.fill('filpay.eth');
  await page.waitForTimeout(500);

  const rows = page.locator('tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(0);
});
```

### Test 11: Date Filter - From Date
```typescript
test('date filter - from date filters table', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  // Set a future from date that should filter out all rows
  const fromDateInput = page.locator('input[type="date"]').first();
  await fromDateInput.fill('2030-01-01');
  await page.waitForTimeout(500);

  const filteredCount = await rows.count();
  expect(filteredCount).toBeLessThan(initialCount);
});
```

### Test 12: Date Filter - To Date
```typescript
test('date filter - to date filters table', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  // Set a past to date that should filter out all rows
  const toDateInput = page.locator('input[type="date"]').nth(1);
  await toDateInput.fill('2020-01-01');
  await page.waitForTimeout(500);

  const filteredCount = await rows.count();
  expect(filteredCount).toBeLessThan(initialCount);
});
```

### Test 13: Date Filter - Date Range
```typescript
test('date filter - date range filters correctly', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  const fromDateInput = page.locator('input[type="date"]').first();
  const toDateInput = page.locator('input[type="date"]').nth(1);

  await fromDateInput.fill('2024-11-01');
  await toDateInput.fill('2024-11-30');
  await page.waitForTimeout(500);

  const filteredCount = await rows.count();
  expect(filteredCount).toBeGreaterThanOrEqual(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
});
```

### Test 14: Clearing Filters
```typescript
test('clearing filters restores all rows', async ({ page }) => {
  const rows = page.locator('tbody tr');
  const initialCount = await rows.count();

  const searchInput = page.getByPlaceholder(/search/i);
  await searchInput.fill('xyz-nonexistent');
  await page.waitForTimeout(500);

  await searchInput.fill('');
  await page.waitForTimeout(500);

  const restoredCount = await rows.count();
  expect(restoredCount).toBe(initialCount);
});
```

---

## Test Execution Plan

### Phase 1: Smoke Tests (Manual)
1. Open https://3ae62f46.pinit.eth.limo/ in browser
2. Verify page loads without errors
3. Check all three metric cards display values
4. Verify table has data rows
5. Check browser console for errors

### Phase 2: Automated Tests (Playwright)
```bash
# Install Playwright
npm init playwright@latest

# Run tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test dashboard.spec.ts
```

### Phase 3: Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 5s | TBD |
| Data Load Time | < 10s | TBD |
| Console Errors | 0 | TBD |
| Test Pass Rate | 100% | TBD |

---

## Known Issues / Risks

1. **IPFS Gateway Latency**: eth.limo gateway may have variable response times
2. **Subgraph Availability**: Dashboard degrades to mock data if Goldsky is unavailable
3. **CORS**: Browser may block subgraph requests (mitigated by client-side fetch)

---

## Sign-off Checklist

- [ ] All Playwright tests pass
- [ ] Manual smoke test completed
- [ ] No console errors
- [ ] Data displays correctly from subgraph
- [ ] Responsive layout verified
- [ ] Stakeholder review completed
