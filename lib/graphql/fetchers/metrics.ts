/**
 * Global metrics fetching functions.
 * Handles aggregated metrics like total settled, run rate, and daily metrics.
 */

import { executeQuery, EPOCHS_PER_DAY } from '../client';
import {
  GLOBAL_METRICS_QUERY,
  TOTAL_SETTLED_QUERY,
  ACTIVE_RAILS_QUERY,
  DAILY_METRICS_QUERY,
  DAILY_TOKEN_METRICS_QUERY,
  ALL_DAILY_TOKEN_METRICS_QUERY,
  TOTAL_LOCKED_QUERY,
  DAILY_TOKEN_METRICS_FOR_ARR_QUERY,
  FIXED_LOCKUP_PENDING_QUERY,
  GlobalMetricsResponse,
  TotalSettledResponse,
  ActiveRailsResponse,
  DailyMetricsResponse,
  DailyTokenMetricsResponse,
  TotalLockedResponse,
  DailyTokenMetricsForARRResponse,
  FixedLockupPendingResponse,
} from '../queries';
import { weiToUSDC, formatCurrency, secondsToMs } from './utils';
import { logError } from '../../errors';

// Monthly run rate calculation constants
// paymentRate is in wei per EPOCH (not per second!)
// Filecoin epoch = ~30 seconds, so epochs/day = 2880
const EPOCHS_PER_MONTH = 30 * 2880; // 86,400 epochs/month

/**
 * Fetch global metrics from the subgraph.
 */
export async function fetchGlobalMetrics() {
  const data = await executeQuery<GlobalMetricsResponse>(
    GLOBAL_METRICS_QUERY,
    undefined,
    { operation: 'fetchGlobalMetrics' }
  );
  const metrics = data.paymentsMetrics[0];

  if (!metrics) {
    return {
      uniquePayers: 0,
      uniquePayees: 0,
      totalTerminations: 0,
      totalActiveRails: 0,
    };
  }

  return {
    uniquePayers: parseInt(metrics.uniquePayers),
    uniquePayees: parseInt(metrics.uniquePayees),
    totalTerminations: parseInt(metrics.totalTerminatedRails),
    totalActiveRails: parseInt(metrics.totalActiveRails),
  };
}

/**
 * Fetch total settled amount from all rails.
 */
export async function fetchTotalSettled() {
  const data = await executeQuery<TotalSettledResponse>(
    TOTAL_SETTLED_QUERY,
    undefined,
    { operation: 'fetchTotalSettled' }
  );

  let totalSettled = BigInt(0);
  let last30DaysSettled = BigInt(0);

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const rail of data.rails) {
    const amount = BigInt(rail.totalSettledAmount);
    totalSettled += amount;

    // Check if rail was created in last 30 days (approximation)
    const createdAt = secondsToMs(rail.createdAt);
    if (createdAt > thirtyDaysAgo) {
      last30DaysSettled += amount;
    }
  }

  return {
    total: weiToUSDC(totalSettled.toString()),
    last30Days: weiToUSDC(last30DaysSettled.toString()),
    totalFormatted: formatCurrency(weiToUSDC(totalSettled.toString())),
    last30DaysFormatted: formatCurrency(weiToUSDC(last30DaysSettled.toString())),
  };
}

/**
 * Fetch settled amount from the last 7 days using DailyTokenMetric.
 */
export async function fetchSettled7d() {
  // Calculate timestamp for 7 days ago (in seconds for BigInt)
  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

  const data = await executeQuery<DailyTokenMetricsResponse>(
    DAILY_TOKEN_METRICS_QUERY,
    { first: 14, since: sevenDaysAgo.toString() },
    { operation: 'fetchSettled7d' }
  );

  let totalSettled7d = BigInt(0);

  for (const metric of data.dailyTokenMetrics) {
    totalSettled7d += BigInt(metric.settledAmount);
  }

  const settled7dValue = weiToUSDC(totalSettled7d.toString());

  return {
    total: settled7dValue,
    formatted: formatCurrency(settled7dValue),
    settlementCount: data.dailyTokenMetrics.length,
  };
}

/**
 * Fetch monthly run rate from active rails.
 * Monthly Run Rate = Σ(activeRails.paymentRate) × epochs/month
 */
export async function fetchMonthlyRunRate() {
  const data = await executeQuery<ActiveRailsResponse>(
    ACTIVE_RAILS_QUERY,
    undefined,
    { operation: 'fetchMonthlyRunRate' }
  );

  // Sum all active rails' payment rates (wei per epoch)
  let totalPaymentRate = BigInt(0);
  let activeRailsCount = 0;

  for (const rail of data.rails) {
    if (rail.paymentRate) {
      totalPaymentRate += BigInt(rail.paymentRate);
      activeRailsCount++;
    }
  }

  // Calculate monthly run rate: rate/epoch × epochs/month
  const monthlyRunRateWei = totalPaymentRate * BigInt(EPOCHS_PER_MONTH);
  const monthlyRunRate = weiToUSDC(monthlyRunRateWei.toString());

  // Annualized run rate for reference
  const annualizedRunRate = monthlyRunRate * 12;

  return {
    monthly: monthlyRunRate,
    monthlyFormatted: formatCurrency(monthlyRunRate),
    annualized: annualizedRunRate,
    annualizedFormatted: formatCurrency(annualizedRunRate),
    activeRailsCount,
  };
}

/**
 * Fetch daily metrics for sparklines.
 */
export async function fetchDailyMetrics(days: number = 30) {
  const data = await executeQuery<DailyMetricsResponse>(
    DAILY_METRICS_QUERY,
    { first: days },
    { operation: 'fetchDailyMetrics' }
  );

  // Reverse to get chronological order (oldest first)
  const metrics = [...data.dailyMetrics].reverse();

  return {
    uniquePayers: metrics.map(m => parseInt(m.uniquePayers)),
    terminations: metrics.map(m => parseInt(m.railsTerminated)),
    activeRails: metrics.map(m => parseInt(m.activeRailsCount)),
    dates: metrics.map(m => m.date),
  };
}

/**
 * Fetch settled amounts bucketed by day for cumulative calculations.
 * Uses DailyTokenMetric with timestamp conversion (not the buggy date field).
 */
export async function fetchDailySettled(): Promise<Map<string, number>> {
  try {
    // Fetch all daily token metrics (up to 100 days of history)
    const data = await executeQuery<DailyTokenMetricsResponse>(
      ALL_DAILY_TOKEN_METRICS_QUERY,
      { first: 100 },
      { operation: 'fetchDailySettled' }
    );
    const dailySettled = new Map<string, number>();

    for (const metric of data.dailyTokenMetrics) {
      // Convert timestamp to date key (timestamp is in seconds)
      // Use timestamp instead of buggy date field
      const timestampMs = secondsToMs(metric.timestamp);
      const date = new Date(timestampMs);
      const dateKey = date.toISOString().split('T')[0];

      const amount = weiToUSDC(metric.settledAmount);
      // Add to existing amount for this date (shouldn't happen but be safe)
      dailySettled.set(dateKey, (dailySettled.get(dateKey) || 0) + amount);
    }

    return dailySettled;
  } catch (error) {
    // Return empty map for graceful degradation on charts
    logError(error, 'fetchDailySettled');
    return new Map();
  }
}

/**
 * Fetch total locked USDFC across all accounts.
 * Locked USDFC = Σ(account.userTokens.lockupCurrent) for all accounts
 */
export async function fetchTotalLockedUSDFC() {
  const data = await executeQuery<TotalLockedResponse>(
    TOTAL_LOCKED_QUERY,
    undefined,
    { operation: 'fetchTotalLockedUSDFC' }
  );

  let totalLocked = BigInt(0);

  for (const account of data.accounts) {
    for (const userToken of account.userTokens) {
      if (userToken.lockupCurrent) {
        totalLocked += BigInt(userToken.lockupCurrent);
      }
    }
  }

  const totalLockedValue = weiToUSDC(totalLocked.toString());

  return {
    total: totalLockedValue,
    formatted: formatCurrency(totalLockedValue),
  };
}

/**
 * ARR (Annualized Run Rate) result interface.
 */
export interface ARRResult {
  fourWeekTotal: number;
  weeklyAverage: number;
  annualized: number;
  annualizedFormatted: string;
  weeklyAverageFormatted: string;
  weeklyBreakdown: number[];
  weeksUsed: number;
}

/**
 * Fetch ARR (Annualized Run Rate) based on 4-week rolling average.
 * ARR = (sum of last 4 complete weeks) / 4 * 52
 *
 * Uses dailyTokenMetrics and aggregates by week client-side.
 * Skips the most recent week as it may be incomplete, then takes the next 4 weeks.
 */
export async function fetchARR(): Promise<ARRResult> {
  // Fetch 35 days to ensure we have 4 complete weeks + buffer
  const data = await executeQuery<DailyTokenMetricsForARRResponse>(
    DAILY_TOKEN_METRICS_FOR_ARR_QUERY,
    { first: 35 },
    { operation: 'fetchARR' }
  );

  const days = data.dailyTokenMetrics;

  // Group by week number (using Unix timestamp / seconds per week)
  const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;
  const weeklyTotals = new Map<number, bigint>();

  for (const day of days) {
    const weekNum = Math.floor(parseInt(day.timestamp) / SECONDS_PER_WEEK);
    const current = weeklyTotals.get(weekNum) || BigInt(0);
    weeklyTotals.set(weekNum, current + BigInt(day.settledAmount));
  }

  // Sort weeks descending, skip most recent (potentially incomplete), take next 4
  const sortedWeeks = Array.from(weeklyTotals.entries())
    .sort((a, b) => b[0] - a[0])
    .slice(1, 5);

  // Calculate 4-week total
  const fourWeekTotal = sortedWeeks.reduce((sum, [, amt]) => sum + amt, BigInt(0));
  const weeksUsed = sortedWeeks.length;
  const fourWeekTotalUSDC = weiToUSDC(fourWeekTotal.toString());

  // Calculate weekly average (handle case where we have fewer than 4 weeks)
  const weeklyAverage = weeksUsed > 0 ? fourWeekTotalUSDC / weeksUsed : 0;

  // Annualize: weekly average * 52 weeks
  const annualized = weeklyAverage * 52;

  // Build weekly breakdown for display
  const weeklyBreakdown = sortedWeeks.map(([, amt]) => weiToUSDC(amt.toString()));

  return {
    fourWeekTotal: fourWeekTotalUSDC,
    weeklyAverage,
    annualized,
    annualizedFormatted: formatCurrency(annualized),
    weeklyAverageFormatted: formatCurrency(weeklyAverage),
    weeklyBreakdown,
    weeksUsed,
  };
}

/**
 * Fixed Lockup Pending result interface.
 */
export interface FixedLockupPendingResult {
  total: number;
  formatted: string;
  railCount: number;
  settledCount: number;
}

/**
 * Fetch fixed lockup pending from one-time payment rails.
 * Fixed Lockup Pending = Σ(rail.lockupFixed - rail.totalSettledAmount) where paymentRate = 0
 *
 * One-time payment rails (ZERORATE) have paymentRate=0 and use lockupFixed
 * for pre-allocated lump-sum payments executed via modifyRailPayment().
 */
export async function fetchFixedLockupPending(): Promise<FixedLockupPendingResult> {
  const data = await executeQuery<FixedLockupPendingResponse>(
    FIXED_LOCKUP_PENDING_QUERY,
    undefined,
    { operation: 'fetchFixedLockupPending' }
  );

  let totalPending = BigInt(0);
  let settledCount = 0;

  for (const rail of data.rails) {
    const lockupFixed = BigInt(rail.lockupFixed);
    const settled = BigInt(rail.totalSettledAmount);

    // Pending = lockupFixed minus what's already settled
    const pending = lockupFixed - settled;
    if (pending > BigInt(0)) {
      totalPending += pending;
    }
    if (settled > BigInt(0)) {
      settledCount++;
    }
  }

  return {
    total: weiToUSDC(totalPending.toString()),
    formatted: formatCurrency(weiToUSDC(totalPending.toString())),
    railCount: data.rails.length,
    settledCount,
  };
}
