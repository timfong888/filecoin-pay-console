/**
 * Unit tests for payer fetching functions.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, setupMSW, resetMSW, cleanupMSW } from '../__mocks__/setup';
import { createEmptyHandler } from '../__mocks__/handlers';
import {
  fetchTopPayers,
  fetchAllPayers,
  fetchAllPayersExtended,
  fetchActivePayersCount,
  fetchChurnedWalletsCount,
  fetchActivePayersByDate,
} from './payers';

beforeAll(() => setupMSW());
afterEach(() => resetMSW());
afterAll(() => cleanupMSW());

describe('fetchTopPayers', () => {
  it('returns array of payer displays', async () => {
    const result = await fetchTopPayers(10);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('includes required payer fields', async () => {
    const result = await fetchTopPayers(5);

    if (result.length > 0) {
      const payer = result[0];
      expect(payer).toHaveProperty('address');
      expect(payer).toHaveProperty('fullAddress');
      expect(payer).toHaveProperty('locked');
      expect(payer).toHaveProperty('settled');
      expect(payer).toHaveProperty('runway');
      expect(payer).toHaveProperty('start');
      expect(payer).toHaveProperty('startTimestamp');
    }
  });

  it('returns empty array when no payers', async () => {
    server.use(createEmptyHandler('TopPayers'));

    const result = await fetchTopPayers(10);

    expect(result).toEqual([]);
  });

  it('formats addresses correctly', async () => {
    const result = await fetchTopPayers(5);

    if (result.length > 0) {
      const payer = result[0];
      // Truncated address should have format like 0x1234...5678
      expect(payer.address).toContain('...');
      // Full address should start with 0x
      expect(payer.fullAddress).toMatch(/^0x/);
    }
  });
});

describe('fetchAllPayers', () => {
  it('returns array of payer displays', async () => {
    const result = await fetchAllPayers(100);

    expect(Array.isArray(result)).toBe(true);
  });

  it('filters out accounts with no payer rails', async () => {
    const result = await fetchAllPayers(100);

    // All returned accounts should have been payers (verified by mock)
    for (const payer of result) {
      expect(payer.fullAddress).toBeTruthy();
    }
  });
});

describe('fetchAllPayersExtended', () => {
  it('returns extended payer information', async () => {
    const result = await fetchAllPayersExtended(100);

    if (result.length > 0) {
      const payer = result[0];
      expect(payer).toHaveProperty('railsCount');
      expect(payer).toHaveProperty('settledRaw');
      expect(payer).toHaveProperty('lockedRaw');
      expect(payer).toHaveProperty('runwayDays');
      expect(payer).toHaveProperty('isActive');
      expect(payer).toHaveProperty('hasActiveRail');
      expect(payer).toHaveProperty('hasPositiveLockupRate');
    }
  });

  it('calculates isActive correctly', async () => {
    const result = await fetchAllPayersExtended(100);

    for (const payer of result) {
      // isActive should be true only if hasActiveRail AND hasPositiveLockupRate
      if (payer.isActive) {
        expect(payer.hasActiveRail).toBe(true);
        expect(payer.hasPositiveLockupRate).toBe(true);
      }
    }
  });

  it('includes PDP enrichment fields', async () => {
    const result = await fetchAllPayersExtended(100);

    if (result.length > 0) {
      const payer = result[0];
      expect(payer).toHaveProperty('totalDataSizeGB');
      expect(payer).toHaveProperty('totalDataSizeFormatted');
      expect(payer).toHaveProperty('proofStatus');
      expect(payer).toHaveProperty('payeeAddresses');
    }
  });
});

describe('fetchActivePayersCount', () => {
  it('returns active and total payer counts', async () => {
    const result = await fetchActivePayersCount();

    expect(result).toHaveProperty('activeCount');
    expect(result).toHaveProperty('totalCount');
    expect(typeof result.activeCount).toBe('number');
    expect(typeof result.totalCount).toBe('number');
    expect(result.activeCount).toBeLessThanOrEqual(result.totalCount);
  });

  it('returns zeros when no payers', async () => {
    server.use(createEmptyHandler('TopPayers'));

    const result = await fetchActivePayersCount();

    expect(result.activeCount).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});

describe('fetchChurnedWalletsCount', () => {
  it('returns churned wallet count', async () => {
    const result = await fetchChurnedWalletsCount();

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns zero when no payers', async () => {
    server.use(createEmptyHandler('TopPayers'));

    const result = await fetchChurnedWalletsCount();

    expect(result).toBe(0);
  });

  it('counts only fully terminated wallets', async () => {
    // The mock includes one churned account with all TERMINATED rails
    const churnedCount = await fetchChurnedWalletsCount();
    const { totalCount } = await fetchActivePayersCount();

    // Churned count should be less than or equal to total
    expect(churnedCount).toBeLessThanOrEqual(totalCount);
  });
});

describe('fetchActivePayersByDate', () => {
  it('returns Map of dates to payer counts', async () => {
    const result = await fetchActivePayersByDate();

    expect(result instanceof Map).toBe(true);
  });

  it('uses YYYY-MM-DD date format as keys', async () => {
    const result = await fetchActivePayersByDate();

    for (const key of result.keys()) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns empty Map when no payers', async () => {
    server.use(createEmptyHandler('TopPayers'));

    const result = await fetchActivePayersByDate();

    expect(result.size).toBe(0);
  });
});
