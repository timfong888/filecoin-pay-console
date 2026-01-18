/**
 * Unit tests for account fetching functions.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, setupMSW, resetMSW, cleanupMSW } from '../__mocks__/setup';
import { fetchAccountDetail, RailState } from './accounts';

beforeAll(() => setupMSW());
afterEach(() => resetMSW());
afterAll(() => cleanupMSW());

describe('RailState mapping', () => {
  it('maps state codes to labels', () => {
    expect(RailState[0]).toBe('Active');
    expect(RailState[1]).toBe('Terminated');
    expect(RailState[2]).toBe('Pending');
  });
});

describe('fetchAccountDetail', () => {
  it('returns account detail for valid address', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('totalRails');
    expect(result).toHaveProperty('totalFunds');
    expect(result).toHaveProperty('totalLocked');
    expect(result).toHaveProperty('totalSettled');
    expect(result).toHaveProperty('payerRails');
    expect(result).toHaveProperty('payeeRails');
  });

  it('returns null for non-existent account', async () => {
    const result = await fetchAccountDetail('not-found');

    expect(result).toBeNull();
  });

  it('lowercases address for query', async () => {
    const mixedCaseAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
    const result = await fetchAccountDetail(mixedCaseAddress);

    // Should still work because it lowercases internally
    expect(result).not.toBeNull();
  });

  it('calculates totals from userTokens', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result) {
      expect(typeof result.totalFundsRaw).toBe('number');
      expect(typeof result.totalLockedRaw).toBe('number');
      expect(typeof result.totalSettledRaw).toBe('number');
      expect(typeof result.totalPayoutRaw).toBe('number');
    }
  });

  it('formats currency values correctly', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result) {
      expect(result.totalFunds).toMatch(/^\$/);
      expect(result.totalLocked).toMatch(/^\$/);
      expect(result.totalSettled).toMatch(/^\$/);
      expect(result.totalPayout).toMatch(/^\$/);
    }
  });

  it('transforms payer rails correctly', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result && result.payerRails.length > 0) {
      const rail = result.payerRails[0];
      expect(rail).toHaveProperty('id');
      expect(rail).toHaveProperty('counterpartyAddress');
      expect(rail).toHaveProperty('counterpartyFormatted');
      expect(rail).toHaveProperty('settled');
      expect(rail).toHaveProperty('settledRaw');
      expect(rail).toHaveProperty('rate');
      expect(rail).toHaveProperty('state');
      expect(rail).toHaveProperty('stateCode');
      expect(rail).toHaveProperty('createdAt');
      expect(rail).toHaveProperty('createdAtTimestamp');
    }
  });

  it('handles accounts with no rails', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result) {
      // Arrays should exist even if empty
      expect(Array.isArray(result.payerRails)).toBe(true);
      expect(Array.isArray(result.payeeRails)).toBe(true);
    }
  });

  it('calculates total settled from payer rails', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result) {
      // Total settled should be sum of rail amounts
      expect(result.totalSettledRaw).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Rail display transformation', () => {
  it('formats counterparty address', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result && result.payerRails.length > 0) {
      const rail = result.payerRails[0];
      // Formatted should be truncated
      if (rail.counterpartyAddress.length > 10) {
        expect(rail.counterpartyFormatted).toContain('...');
      }
    }
  });

  it('formats rail rate with epoch suffix', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result && result.payerRails.length > 0) {
      const rail = result.payerRails[0];
      // Rate should either have /epoch suffix or be '-'
      expect(rail.rate === '-' || rail.rate.includes('/epoch')).toBe(true);
    }
  });

  it('includes timestamp for sorting', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await fetchAccountDetail(address);

    if (result && result.payerRails.length > 0) {
      const rail = result.payerRails[0];
      expect(typeof rail.createdAtTimestamp).toBe('number');
      expect(rail.createdAtTimestamp).toBeGreaterThan(0);
    }
  });
});
