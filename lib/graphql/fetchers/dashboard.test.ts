/**
 * Unit tests for dashboard data aggregation functions.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, setupMSW, resetMSW, cleanupMSW } from '../__mocks__/setup';
import { fetchDashboardData, fetchPayerListMetrics } from './dashboard';

beforeAll(() => setupMSW());
afterEach(() => resetMSW());
afterAll(() => cleanupMSW());

describe('fetchDashboardData', () => {
  it('returns complete dashboard data', async () => {
    const result = await fetchDashboardData();

    expect(result).toHaveProperty('globalMetrics');
    expect(result).toHaveProperty('totalSettled');
    expect(result).toHaveProperty('settled7d');
    expect(result).toHaveProperty('topPayers');
    expect(result).toHaveProperty('runRate');
    expect(result).toHaveProperty('activePayers');
    expect(result).toHaveProperty('cumulativePayers');
    expect(result).toHaveProperty('cumulativeSettled');
    expect(result).toHaveProperty('chartDates');
  });

  it('returns 31 days of chart data', async () => {
    const result = await fetchDashboardData();

    // Last 30 days + today = 31 dates
    expect(result.chartDates.length).toBe(31);
    expect(result.cumulativePayers.length).toBe(31);
    expect(result.cumulativeSettled.length).toBe(31);
  });

  it('returns chart dates in YYYY-MM-DD format', async () => {
    const result = await fetchDashboardData();

    for (const date of result.chartDates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns chart dates in chronological order', async () => {
    const result = await fetchDashboardData();

    for (let i = 1; i < result.chartDates.length; i++) {
      const prev = new Date(result.chartDates[i - 1]);
      const curr = new Date(result.chartDates[i]);
      expect(prev.getTime()).toBeLessThan(curr.getTime());
    }
  });

  it('returns cumulative payers as increasing sequence', async () => {
    const result = await fetchDashboardData();

    for (let i = 1; i < result.cumulativePayers.length; i++) {
      expect(result.cumulativePayers[i]).toBeGreaterThanOrEqual(result.cumulativePayers[i - 1]);
    }
  });

  it('returns cumulative settled as increasing sequence', async () => {
    const result = await fetchDashboardData();

    for (let i = 1; i < result.cumulativeSettled.length; i++) {
      expect(result.cumulativeSettled[i]).toBeGreaterThanOrEqual(result.cumulativeSettled[i - 1]);
    }
  });

  it('includes global metrics', async () => {
    const result = await fetchDashboardData();

    expect(result.globalMetrics).toHaveProperty('uniquePayers');
    expect(result.globalMetrics).toHaveProperty('uniquePayees');
    expect(result.globalMetrics).toHaveProperty('totalActiveRails');
  });

  it('includes settled metrics', async () => {
    const result = await fetchDashboardData();

    expect(result.totalSettled).toHaveProperty('total');
    expect(result.totalSettled).toHaveProperty('totalFormatted');
    expect(result.settled7d).toHaveProperty('total');
    expect(result.settled7d).toHaveProperty('formatted');
  });

  it('includes run rate metrics', async () => {
    const result = await fetchDashboardData();

    expect(result.runRate).toHaveProperty('monthly');
    expect(result.runRate).toHaveProperty('annualized');
    expect(result.runRate).toHaveProperty('activeRailsCount');
  });

  it('returns top payers array', async () => {
    const result = await fetchDashboardData();

    expect(Array.isArray(result.topPayers)).toBe(true);
    expect(result.topPayers.length).toBeLessThanOrEqual(10);
  });
});

describe('fetchPayerListMetrics', () => {
  it('returns payer list metrics', async () => {
    const result = await fetchPayerListMetrics();

    expect(result).toHaveProperty('activePayers');
    expect(result).toHaveProperty('totalPayers');
    expect(result).toHaveProperty('payersWoWChange');
    expect(result).toHaveProperty('settledTotal');
    expect(result).toHaveProperty('settledFormatted');
    expect(result).toHaveProperty('settled7d');
    expect(result).toHaveProperty('settled7dFormatted');
    expect(result).toHaveProperty('monthlyRunRate');
    expect(result).toHaveProperty('annualizedRunRate');
  });

  it('includes goal progress percentages', async () => {
    const result = await fetchPayerListMetrics();

    expect(result).toHaveProperty('payersGoalProgress');
    expect(result).toHaveProperty('settledGoalProgress');
    expect(result).toHaveProperty('runRateGoalProgress');
    expect(typeof result.payersGoalProgress).toBe('number');
    expect(result.payersGoalProgress).toBeGreaterThanOrEqual(0);
    expect(result.payersGoalProgress).toBeLessThanOrEqual(100);
  });

  it('includes week-over-week change metrics', async () => {
    const result = await fetchPayerListMetrics();

    expect(result).toHaveProperty('newPayersLast7d');
    expect(result).toHaveProperty('newPayersPrev7d');
    expect(result).toHaveProperty('payersLast7dPercentChange');
    expect(typeof result.newPayersLast7d).toBe('number');
    expect(typeof result.newPayersPrev7d).toBe('number');
  });

  it('includes cumulative chart data', async () => {
    const result = await fetchPayerListMetrics();

    expect(Array.isArray(result.cumulativePayers)).toBe(true);
    expect(Array.isArray(result.cumulativeSettled)).toBe(true);
    expect(Array.isArray(result.chartDates)).toBe(true);
  });

  it('accepts custom date range', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    const endDate = new Date();

    const result = await fetchPayerListMetrics(startDate, endDate);

    // Should have 15 days of data (14 days ago to today)
    expect(result.chartDates.length).toBe(15);
  });

  it('defaults to 30-day date range', async () => {
    const result = await fetchPayerListMetrics();

    expect(result.chartDates.length).toBe(31); // 30 days + today
  });

  it('formats currency values', async () => {
    const result = await fetchPayerListMetrics();

    expect(result.settledFormatted).toMatch(/^\$/);
    expect(result.settled7dFormatted).toMatch(/^\$/);
    expect(result.monthlyRunRateFormatted).toMatch(/^\$/);
  });

  it('includes active rails count', async () => {
    const result = await fetchPayerListMetrics();

    expect(result).toHaveProperty('activeRailsCount');
    expect(typeof result.activeRailsCount).toBe('number');
  });
});
