/**
 * Global metrics fetching functions.
 * Handles aggregated metrics like total settled, run rate, and daily metrics.
 */

import { graphqlClient, EPOCHS_PER_DAY } from '../client';
import {
  GLOBAL_METRICS_QUERY,
  TOTAL_SETTLED_QUERY,
  ACTIVE_RAILS_QUERY,
  DAILY_METRICS_QUERY,
  DAILY_TOKEN_METRICS_QUERY,
  ALL_DAILY_TOKEN_METRICS_QUERY,
  GlobalMetricsResponse,
  TotalSettledResponse,
  ActiveRailsResponse,
  DailyMetricsResponse,
  DailyTokenMetricsResponse,
} from '../queries';
import { weiToUSDC, formatCurrency } from './utils';

// Monthly run rate calculation constants
// paymentRate is in wei per EPOCH (not per second!)
// Filecoin epoch = ~30 seconds, so epochs/day = 2880
const EPOCHS_PER_MONTH = 30 * 2880; // 86,400 epochs/month

/**
 * Fetch global metrics from the subgraph.
 */
export async function fetchGlobalMetrics() {
  try {
    const data = await graphqlClient.request<GlobalMetricsResponse>(GLOBAL_METRICS_QUERY);
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
  } catch (error) {
    console.error('Error fetching global metrics:', error);
    throw error;
  }
}

/**
 * Fetch total settled amount from all rails.
 */
export async function fetchTotalSettled() {
  try {
    const data = await graphqlClient.request<TotalSettledResponse>(TOTAL_SETTLED_QUERY);

    let totalSettled = BigInt(0);
    let last30DaysSettled = BigInt(0);

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const rail of data.rails) {
      const amount = BigInt(rail.totalSettledAmount);
      totalSettled += amount;

      // Check if rail was created in last 30 days (approximation)
      const createdAt = parseInt(rail.createdAt) * 1000;
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
  } catch (error) {
    console.error('Error fetching total settled:', error);
    throw error;
  }
}

/**
 * Fetch settled amount from the last 7 days using DailyTokenMetric.
 */
export async function fetchSettled7d() {
  try {
    // Calculate timestamp for 7 days ago (in seconds for BigInt)
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const data = await graphqlClient.request<DailyTokenMetricsResponse>(
      DAILY_TOKEN_METRICS_QUERY,
      { first: 14, since: sevenDaysAgo.toString() }
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
  } catch (error) {
    console.error('Error fetching settled 7d:', error);
    throw error;
  }
}

/**
 * Fetch monthly run rate from active rails.
 * Monthly Run Rate = Σ(activeRails.paymentRate) × epochs/month
 */
export async function fetchMonthlyRunRate() {
  try {
    const data = await graphqlClient.request<ActiveRailsResponse>(ACTIVE_RAILS_QUERY);

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
  } catch (error) {
    console.error('Error fetching monthly run rate:', error);
    throw error;
  }
}

/**
 * Fetch daily metrics for sparklines.
 */
export async function fetchDailyMetrics(days: number = 30) {
  try {
    const data = await graphqlClient.request<DailyMetricsResponse>(DAILY_METRICS_QUERY, { first: days });

    // Reverse to get chronological order (oldest first)
    const metrics = [...data.dailyMetrics].reverse();

    return {
      uniquePayers: metrics.map(m => parseInt(m.uniquePayers)),
      terminations: metrics.map(m => parseInt(m.railsTerminated)),
      activeRails: metrics.map(m => parseInt(m.activeRailsCount)),
      dates: metrics.map(m => m.date),
    };
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    throw error;
  }
}

/**
 * Fetch settled amounts bucketed by day for cumulative calculations.
 * Uses DailyTokenMetric with timestamp conversion (not the buggy date field).
 */
export async function fetchDailySettled(): Promise<Map<string, number>> {
  try {
    // Fetch all daily token metrics (up to 100 days of history)
    const data = await graphqlClient.request<DailyTokenMetricsResponse>(
      ALL_DAILY_TOKEN_METRICS_QUERY,
      { first: 100 }
    );
    const dailySettled = new Map<string, number>();

    for (const metric of data.dailyTokenMetrics) {
      // Convert timestamp to date key (timestamp is in seconds)
      // Use timestamp instead of buggy date field
      const timestampMs = parseInt(metric.timestamp) * 1000;
      const date = new Date(timestampMs);
      const dateKey = date.toISOString().split('T')[0];

      const amount = weiToUSDC(metric.settledAmount);
      // Add to existing amount for this date (shouldn't happen but be safe)
      dailySettled.set(dateKey, (dailySettled.get(dateKey) || 0) + amount);
    }

    return dailySettled;
  } catch (error) {
    console.error('Error fetching daily settled:', error);
    return new Map();
  }
}
