/**
 * Dashboard-specific data aggregation functions.
 * Combines data from multiple sources for dashboard views.
 */

import { generateDateRange } from './utils';
import {
  fetchGlobalMetrics,
  fetchTotalSettled,
  fetchSettled7d,
  fetchMonthlyRunRate,
  fetchDailySettled,
  fetchTotalLockedUSDFC,
  fetchARR,
  fetchFixedLockupPending,
} from './metrics';
import {
  fetchTopPayers,
  fetchActivePayersCount,
  fetchActivePayersByDate,
} from './payers';

/**
 * Fetch all dashboard data at once (including cumulative chart data).
 */
export async function fetchDashboardData() {
  // Use fetchActivePayersByDate() for chart to match hero metric definition
  const [globalMetrics, totalSettled, settled7d, topPayers, runRate, activePayersByDate, dailySettledMap, activePayersData, totalLockedUSDFC, arr, fixedLockupPending] = await Promise.all([
    fetchGlobalMetrics(),
    fetchTotalSettled(),
    fetchSettled7d(),
    fetchTopPayers(10),
    fetchMonthlyRunRate(),
    fetchActivePayersByDate(),
    fetchDailySettled(),
    fetchActivePayersCount(),
    fetchTotalLockedUSDFC(),
    fetchARR(),
    fetchFixedLockupPending(),
  ]);

  // Generate chart dates (last 30 days)
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);
  const chartDates = generateDateRange(defaultStart, now);

  // Calculate cumulative ACTIVE payers over time
  // Uses activePayersByDate which filters for: ACTIVE rail AND lockupRate > 0
  let priorPayers = 0;
  for (const [dateKey, count] of activePayersByDate) {
    if (dateKey < chartDates[0]) {
      priorPayers += count;
    }
  }

  const cumulativePayers: number[] = [];
  let runningTotal = priorPayers;
  for (const date of chartDates) {
    runningTotal += activePayersByDate.get(date) || 0;
    cumulativePayers.push(runningTotal);
  }

  // Calculate cumulative settled over time
  let priorSettled = 0;
  for (const [dateKey, amount] of dailySettledMap) {
    if (dateKey < chartDates[0]) {
      priorSettled += amount;
    }
  }

  const cumulativeSettled: number[] = [];
  let runningSettled = priorSettled;
  for (const date of chartDates) {
    runningSettled += dailySettledMap.get(date) || 0;
    cumulativeSettled.push(Math.round(runningSettled * 100) / 100);
  }

  return {
    globalMetrics,
    totalSettled,
    settled7d,
    topPayers,
    runRate,
    // Active Payers: at least one ACTIVE rail AND lockupRate > 0
    activePayers: activePayersData.activeCount,
    // Total locked USDFC across all accounts
    totalLockedUSDFC,
    // ARR (Annualized Run Rate) based on 4-week rolling average
    arr,
    // Fixed Lockup Pending (one-time payment rails)
    fixedLockupPending,
    // Cumulative chart data
    cumulativePayers,
    cumulativeSettled,
    chartDates,
  };
}

/**
 * Fetch payer list page metrics with cumulative chart data.
 * Shows total at each point in time (running totals).
 */
export async function fetchPayerListMetrics(startDate?: Date, endDate?: Date) {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() - 30);

    const effectiveStart = startDate || defaultStart;
    const effectiveEnd = endDate || now;

    // Use fetchActivePayersByDate() for chart to match hero metric definition
    const [globalMetrics, totalSettled, settled7d, runRate, activePayersByDate, dailySettledMap, activePayersData] = await Promise.all([
      fetchGlobalMetrics(),
      fetchTotalSettled(),
      fetchSettled7d(),
      fetchMonthlyRunRate(),
      fetchActivePayersByDate(),
      fetchDailySettled(),
      fetchActivePayersCount(),
    ]);

    // Generate continuous date range for chart
    const chartDates = generateDateRange(effectiveStart, effectiveEnd);

    // Calculate cumulative ACTIVE payers over time
    let priorPayers = 0;
    for (const [dateKey, count] of activePayersByDate) {
      if (dateKey < chartDates[0]) {
        priorPayers += count;
      }
    }

    const cumulativePayers: number[] = [];
    let runningTotal = priorPayers;
    for (const date of chartDates) {
      runningTotal += activePayersByDate.get(date) || 0;
      cumulativePayers.push(runningTotal);
    }

    // Calculate cumulative settled over time
    let priorSettled = 0;
    for (const [dateKey, amount] of dailySettledMap) {
      if (dateKey < chartDates[0]) {
        priorSettled += amount;
      }
    }

    const cumulativeSettled: number[] = [];
    let runningSettled = priorSettled;
    for (const date of chartDates) {
      runningSettled += dailySettledMap.get(date) || 0;
      cumulativeSettled.push(Math.round(runningSettled * 100) / 100);
    }

    // Calculate new ACTIVE payers in last 7 days and percentage change vs prior 7 days
    const last7Days = chartDates.slice(-7);
    const prev7Days = chartDates.slice(-14, -7);

    const newPayersLast7d = last7Days.reduce((sum, date) => sum + (activePayersByDate.get(date) || 0), 0);
    const newPayersPrev7d = prev7Days.reduce((sum, date) => sum + (activePayersByDate.get(date) || 0), 0);

    // Calculate percentage change (can be negative)
    const payersLast7dPercentChange = newPayersPrev7d > 0
      ? ((newPayersLast7d - newPayersPrev7d) / newPayersPrev7d * 100).toFixed(1)
      : (newPayersLast7d > 0 ? '100' : '0');

    // Keep legacy field for backwards compatibility
    const payersWoWChange = payersLast7dPercentChange;

    // Calculate goal progress (Goal: 1000 payers)
    const payersGoalProgress = Math.min((globalMetrics.uniquePayers / 1000) * 100, 100);

    // Calculate settled goal progress (Goal: $10M)
    const settledGoalProgress = Math.min((totalSettled.total / 10000000) * 100, 100);

    // Calculate run rate goal progress (Goal: $10M ARR = ~$833K/month)
    const runRateGoalProgress = Math.min((runRate.monthly / 833333) * 100, 100);

    return {
      // Active Payers: at least one ACTIVE rail AND lockupRate > 0
      activePayers: activePayersData.activeCount,
      totalPayers: activePayersData.totalCount,
      payersWoWChange,
      newPayersLast7d,
      newPayersPrev7d,
      payersLast7dPercentChange,
      payersGoalProgress,
      settledTotal: totalSettled.total,
      settledFormatted: totalSettled.totalFormatted,
      settledGoalProgress,
      settled7d: settled7d.total,
      settled7dFormatted: settled7d.formatted,
      monthlyRunRate: runRate.monthly,
      monthlyRunRateFormatted: runRate.monthlyFormatted,
      annualizedRunRate: runRate.annualized,
      annualizedRunRateFormatted: runRate.annualizedFormatted,
      runRateGoalProgress,
      activeRailsCount: runRate.activeRailsCount,
      cumulativePayers,
      cumulativeSettled,
      chartDates,
    };
  } catch (error) {
    console.error('Error fetching payer list metrics:', error);
    throw error;
  }
}
