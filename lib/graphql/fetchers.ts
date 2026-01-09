import { graphqlClient } from './client';
import {
  GLOBAL_METRICS_QUERY,
  TOP_PAYERS_QUERY,
  TOTAL_SETTLED_QUERY,
  DAILY_METRICS_QUERY,
  GlobalMetricsResponse,
  TopPayersResponse,
  TotalSettledResponse,
  DailyMetricsResponse,
  Account,
} from './queries';

// Convert wei (18 decimals) to human readable number
export function weiToUSDC(wei: string): number {
  const value = BigInt(wei);
  // USDFC has 18 decimals
  const divisor = BigInt(10 ** 18);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  // Get 2 decimal places
  const decimals = Number((fractionalPart * BigInt(100)) / divisor);
  return Number(wholePart) + decimals / 100;
}

// Format number as currency
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Format address for display
export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate runway in days based on funds and burn rate
export function calculateRunway(funds: string, lockupRate: string): string {
  const fundsValue = BigInt(funds);
  const rateValue = BigInt(lockupRate || '0');

  if (rateValue === BigInt(0) || fundsValue === BigInt(0)) {
    return '-';
  }

  // Rate is per epoch (30 seconds on Filecoin)
  // Days = funds / (rate * epochs_per_day)
  // epochs_per_day = 24 * 60 * 2 = 2880
  const epochsPerDay = BigInt(2880);
  const dailyBurn = rateValue * epochsPerDay;

  if (dailyBurn === BigInt(0)) return '-';

  const days = Number(fundsValue / dailyBurn);
  return days > 0 ? `${days} days` : '< 1 day';
}

// Fetch global metrics
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

// Fetch total settled amount from all rails
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

// Transform account to payer display format
interface PayerDisplay {
  address: string;
  ensName?: string;
  locked: string;
  settled: string;
  runway: string;
  start: string;
}

function transformAccountToPayer(account: Account): PayerDisplay {
  // Sum up funds from all userTokens
  let totalFunds = BigInt(0);
  let totalLocked = BigInt(0);

  for (const token of account.userTokens) {
    totalFunds += BigInt(token.funds);
    totalLocked += BigInt(token.lockupCurrent);
  }

  // Sum up settled from all rails
  let totalSettled = BigInt(0);
  let earliestDate = Date.now();

  for (const rail of account.payerRails) {
    totalSettled += BigInt(rail.totalSettledAmount);
    const createdAt = parseInt(rail.createdAt) * 1000;
    if (createdAt < earliestDate) {
      earliestDate = createdAt;
    }
  }

  // Format start date
  const startDate = new Date(earliestDate);
  const start = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).replace(',', " '");

  return {
    address: formatAddress(account.address),
    locked: formatCurrency(weiToUSDC(totalLocked.toString())),
    settled: formatCurrency(weiToUSDC(totalSettled.toString())),
    runway: '-', // Would need payment rate to calculate
    start,
  };
}

// Fetch top payers
export async function fetchTopPayers(limit: number = 10) {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: limit });

    return data.accounts
      .filter(account => account.payerRails.length > 0)
      .map(transformAccountToPayer);
  } catch (error) {
    console.error('Error fetching top payers:', error);
    throw error;
  }
}

// Fetch daily metrics for sparklines
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

// Fetch all dashboard data at once
export async function fetchDashboardData() {
  const [globalMetrics, totalSettled, topPayers, dailyMetrics] = await Promise.all([
    fetchGlobalMetrics(),
    fetchTotalSettled(),
    fetchTopPayers(10),
    fetchDailyMetrics(30),
  ]);

  return {
    globalMetrics,
    totalSettled,
    topPayers,
    dailyMetrics,
  };
}
