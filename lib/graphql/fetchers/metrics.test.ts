/**
 * Unit tests for metrics fetching functions.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, setupMSW, resetMSW, cleanupMSW } from '../__mocks__/setup';
import { createEmptyHandler, createErrorHandler } from '../__mocks__/handlers';
import {
  fetchGlobalMetrics,
  fetchTotalSettled,
  fetchSettled7d,
  fetchMonthlyRunRate,
  fetchDailyMetrics,
  fetchDailySettled,
} from './metrics';

beforeAll(() => setupMSW());
afterEach(() => resetMSW());
afterAll(() => cleanupMSW());

describe('fetchGlobalMetrics', () => {
  it('returns global metrics successfully', async () => {
    const result = await fetchGlobalMetrics();

    expect(result).toHaveProperty('uniquePayers');
    expect(result).toHaveProperty('uniquePayees');
    expect(result).toHaveProperty('totalTerminations');
    expect(result).toHaveProperty('totalActiveRails');
    expect(typeof result.uniquePayers).toBe('number');
    expect(typeof result.uniquePayees).toBe('number');
  });

  it('returns zeros when no metrics exist', async () => {
    server.use(createEmptyHandler('GlobalMetrics'));

    const result = await fetchGlobalMetrics();

    expect(result.uniquePayers).toBe(0);
    expect(result.uniquePayees).toBe(0);
    expect(result.totalTerminations).toBe(0);
    expect(result.totalActiveRails).toBe(0);
  });

  it('throws on GraphQL error', async () => {
    server.use(createErrorHandler('GlobalMetrics', 'Test error'));

    await expect(fetchGlobalMetrics()).rejects.toThrow();
  });
});

describe('fetchTotalSettled', () => {
  it('returns total settled amount', async () => {
    const result = await fetchTotalSettled();

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('last30Days');
    expect(result).toHaveProperty('totalFormatted');
    expect(result).toHaveProperty('last30DaysFormatted');
    expect(typeof result.total).toBe('number');
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('returns zero when no rails exist', async () => {
    server.use(createEmptyHandler('TotalSettled'));

    const result = await fetchTotalSettled();

    expect(result.total).toBe(0);
    expect(result.last30Days).toBe(0);
  });

  it('formats currency correctly', async () => {
    const result = await fetchTotalSettled();

    expect(result.totalFormatted).toMatch(/^\$/);
  });
});

describe('fetchSettled7d', () => {
  it('returns 7-day settled amount', async () => {
    const result = await fetchSettled7d();

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('formatted');
    expect(result).toHaveProperty('settlementCount');
    expect(typeof result.total).toBe('number');
    expect(result.settlementCount).toBeGreaterThanOrEqual(0);
  });

  it('returns zero when no settlements in last 7 days', async () => {
    server.use(createEmptyHandler('DailyTokenMetrics'));

    const result = await fetchSettled7d();

    expect(result.total).toBe(0);
    expect(result.settlementCount).toBe(0);
  });
});

describe('fetchMonthlyRunRate', () => {
  it('returns monthly and annualized run rates', async () => {
    const result = await fetchMonthlyRunRate();

    expect(result).toHaveProperty('monthly');
    expect(result).toHaveProperty('monthlyFormatted');
    expect(result).toHaveProperty('annualized');
    expect(result).toHaveProperty('annualizedFormatted');
    expect(result).toHaveProperty('activeRailsCount');
    expect(typeof result.monthly).toBe('number');
    expect(result.annualized).toBe(result.monthly * 12);
  });

  it('returns zero when no active rails', async () => {
    server.use(createEmptyHandler('ActiveRails'));

    const result = await fetchMonthlyRunRate();

    expect(result.monthly).toBe(0);
    expect(result.activeRailsCount).toBe(0);
  });
});

describe('fetchDailyMetrics', () => {
  it('returns daily metrics arrays', async () => {
    const result = await fetchDailyMetrics(30);

    expect(result).toHaveProperty('uniquePayers');
    expect(result).toHaveProperty('terminations');
    expect(result).toHaveProperty('activeRails');
    expect(result).toHaveProperty('dates');
    expect(Array.isArray(result.uniquePayers)).toBe(true);
    expect(Array.isArray(result.dates)).toBe(true);
  });

  it('returns metrics in chronological order (oldest first)', async () => {
    const result = await fetchDailyMetrics(7);

    if (result.dates.length > 1) {
      const firstDate = new Date(result.dates[0]);
      const lastDate = new Date(result.dates[result.dates.length - 1]);
      expect(firstDate.getTime()).toBeLessThanOrEqual(lastDate.getTime());
    }
  });

  it('returns empty arrays when no daily metrics', async () => {
    server.use(createEmptyHandler('DailyMetrics'));

    const result = await fetchDailyMetrics(30);

    expect(result.uniquePayers).toEqual([]);
    expect(result.dates).toEqual([]);
  });
});

describe('fetchDailySettled', () => {
  it('returns Map of daily settled amounts', async () => {
    const result = await fetchDailySettled();

    expect(result instanceof Map).toBe(true);
  });

  it('returns date keys in YYYY-MM-DD format', async () => {
    const result = await fetchDailySettled();

    for (const key of result.keys()) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns empty Map on error', async () => {
    server.use(createEmptyHandler('AllDailyTokenMetrics'));

    const result = await fetchDailySettled();

    expect(result.size).toBe(0);
  });
});
