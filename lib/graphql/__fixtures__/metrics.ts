/**
 * Mock metrics fixtures for testing.
 * Provides global metrics, daily metrics, and token metrics.
 */

import { PaymentsMetric, DailyMetric, DailyTokenMetric } from '../queries';

/**
 * Create mock global payments metrics.
 */
export function createMockPaymentsMetric(
  overrides: Partial<PaymentsMetric> = {}
): PaymentsMetric {
  return {
    id: 'payments',
    totalRails: '25',
    totalAccounts: '15',
    uniquePayers: '10',
    uniquePayees: '8',
    totalActiveRails: '18',
    totalTerminatedRails: '7',
    totalFilBurned: '1000000000000000000', // 1 FIL
    ...overrides,
  };
}

/**
 * Create a mock daily metric entry.
 */
export function createMockDailyMetric(
  date: string,
  overrides: Partial<DailyMetric> = {}
): DailyMetric {
  const timestamp = new Date(date).getTime() / 1000;
  return {
    id: `daily-${date}`,
    timestamp: timestamp.toString(),
    date: date,
    uniquePayers: '5',
    uniquePayees: '3',
    railsCreated: '2',
    railsTerminated: '1',
    activeRailsCount: '10',
    ...overrides,
  };
}

/**
 * Create a mock daily token metric entry (for settled amounts).
 */
export function createMockDailyTokenMetric(
  date: string,
  settledAmount: string = '1000000000000000000' // 1 USDFC
): DailyTokenMetric {
  const timestamp = new Date(date).getTime() / 1000;
  return {
    id: `token-daily-${date}`,
    date: date,
    timestamp: timestamp.toString(),
    settledAmount: settledAmount,
    token: {
      symbol: 'USDFC',
    },
  };
}

/**
 * Generate daily metrics for a date range.
 */
export function generateDailyMetrics(startDate: Date, days: number): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    metrics.push(
      createMockDailyMetric(dateStr, {
        uniquePayers: (5 + i).toString(),
        railsCreated: (1 + (i % 3)).toString(),
        activeRailsCount: (10 + i).toString(),
      })
    );
  }
  return metrics;
}

/**
 * Generate daily token metrics for a date range.
 */
export function generateDailyTokenMetrics(
  startDate: Date,
  days: number
): DailyTokenMetric[] {
  const metrics: DailyTokenMetric[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    // Vary the settled amount
    const settled = BigInt(1000000000000000000) * BigInt(i + 1);
    metrics.push(createMockDailyTokenMetric(dateStr, settled.toString()));
  }
  return metrics;
}

/**
 * Mock responses for standard test scenarios.
 */
export const mockMetricResponses = {
  globalMetrics: {
    paymentsMetrics: [createMockPaymentsMetric()],
  },
  emptyMetrics: {
    paymentsMetrics: [],
  },
  dailyMetrics: {
    dailyMetrics: generateDailyMetrics(new Date(), 30),
  },
  emptyDailyMetrics: {
    dailyMetrics: [],
  },
  dailyTokenMetrics: {
    dailyTokenMetrics: generateDailyTokenMetrics(new Date(), 7),
  },
};
