import { graphqlClient, EPOCHS_PER_DAY } from './client';
import {
  GLOBAL_METRICS_QUERY,
  TOP_PAYERS_QUERY,
  TOP_PAYEES_QUERY,
  TOTAL_SETTLED_QUERY,
  ACTIVE_RAILS_QUERY,
  PAYER_FIRST_ACTIVITY_QUERY,
  DAILY_METRICS_QUERY,
  ACCOUNT_DETAIL_QUERY,
  DAILY_TOKEN_METRICS_QUERY,
  GlobalMetricsResponse,
  TopPayersResponse,
  TopPayeesResponse,
  TotalSettledResponse,
  ActiveRailsResponse,
  PayerFirstActivityResponse,
  DailyMetricsResponse,
  AccountDetailResponse,
  DailyTokenMetricsResponse,
  Account,
  Rail,
} from './queries';
import {
  batchFetchPDPData,
  fetchPDPDataForProvider,
  formatDataSize,
  calculateCostPerGB,
  fetchCorrelatedDataSets,
  aggregateCorrelatedData,
} from '../pdp/fetchers';
import { PDPEnrichment, RailDataSetCorrelation } from '../pdp/types';

// Re-export PDP types and utilities for UI use
export { formatDataSize } from '../pdp/fetchers';
export type { PDPEnrichment } from '../pdp/types';

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

// Fetch settled amount from the last 7 days using DailyTokenMetric
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

// Fetch monthly run rate from active rails
// Monthly Run Rate = Σ(activeRails.paymentRate) × epochs/month
// paymentRate is in wei per EPOCH (not per second!)
// Filecoin epoch = ~30 seconds, so epochs/day = 2880
const EPOCHS_PER_MONTH = 30 * 2880; // 86,400 epochs/month

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

// Transform account to payer display format
export interface PayerDisplay {
  address: string;
  fullAddress: string; // Full address for ENS resolution
  ensName?: string;
  locked: string;
  settled: string;
  runway: string;
  start: string;
  startTimestamp: number; // Unix timestamp in ms for filtering
}

function transformAccountToPayer(account: Account): PayerDisplay {
  // Sum up funds from all userTokens
  let totalFunds = BigInt(0);
  let totalLocked = BigInt(0);
  let totalLockupRate = BigInt(0);

  for (const token of account.userTokens) {
    totalFunds += BigInt(token.funds);
    totalLocked += BigInt(token.lockupCurrent);
    if (token.lockupRate) {
      totalLockupRate += BigInt(token.lockupRate);
    }
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

  // Calculate runway in days based on available funds and lockup rate
  // Rate is per epoch (30 seconds on Filecoin)
  // Days = funds / (rate * epochs_per_day)
  let runway = '-';
  let runwayDays = -1;

  if (totalLockupRate > BigInt(0) && totalFunds > BigInt(0)) {
    const epochsPerDayBigInt = BigInt(Math.floor(EPOCHS_PER_DAY));
    const dailyBurn = totalLockupRate * epochsPerDayBigInt;

    if (dailyBurn > BigInt(0)) {
      const days = Number(totalFunds / dailyBurn);
      runwayDays = days;
      if (days > 365) {
        runway = `${Math.floor(days / 365)}y ${days % 365}d`;
      } else if (days > 0) {
        runway = `${days} days`;
      } else {
        runway = '< 1 day';
      }
    }
  }

  return {
    address: formatAddress(account.address),
    fullAddress: account.address, // Keep full address for ENS resolution
    locked: formatCurrency(weiToUSDC(totalLocked.toString())),
    settled: formatCurrency(weiToUSDC(totalSettled.toString())),
    runway,
    start,
    startTimestamp: earliestDate,
  };
}

// Fetch top payers
// Note: We fetch more accounts than needed because some accounts may be payees-only
export async function fetchTopPayers(limit: number = 10) {
  try {
    // Fetch 5x the limit to ensure we get enough payers after filtering
    const fetchLimit = Math.max(limit * 5, 50);
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: fetchLimit });

    return data.accounts
      .filter(account => account.payerRails.length > 0)
      .map(transformAccountToPayer)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top payers:', error);
    throw error;
  }
}

// Fetch all payers (for payer accounts page)
export async function fetchAllPayers(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: limit });

    return data.accounts
      .filter(account => account.payerRails.length > 0)
      .map(transformAccountToPayer);
  } catch (error) {
    console.error('Error fetching all payers:', error);
    throw error;
  }
}

// Extended payer display with rails count and PDP enrichment
export interface PayerDisplayExtended extends PayerDisplay {
  railsCount: number;
  settledRaw: number;
  lockedRaw: number;
  runwayDays: number;
  settled7d: number;           // Settled in last 7 days
  settled7dFormatted: string;
  // Active status (state=ACTIVE for at least one Rail AND lockupRate > 0)
  isActive: boolean;
  hasActiveRail: boolean;      // At least one rail with state=ACTIVE
  hasPositiveLockupRate: boolean;  // lockupRate > 0
  // PDP data (aggregated from correlated DataSets)
  totalDataSizeGB: number;     // Sum of data size from correlated DataSets
  totalDataSizeFormatted: string;
  proofStatus: 'proven' | 'stale' | 'none';  // 'proven' if no faults
  payeeAddresses: string[];    // List of payee addresses for PDP lookup
  // Rail-DataSet correlation data (payeeAddress:timestamp pairs)
  railCorrelations: { payeeAddress: string; railCreatedAt: string }[];
}

function transformAccountToPayerExtended(account: Account): PayerDisplayExtended {
  const base = transformAccountToPayer(account);

  // Get raw values for sorting/filtering
  let totalSettled = BigInt(0);
  let totalLocked = BigInt(0);
  let totalFunds = BigInt(0);
  let totalLockupRate = BigInt(0);
  const payeeAddresses: string[] = [];
  const railCorrelations: { payeeAddress: string; railCreatedAt: string }[] = [];

  for (const token of account.userTokens) {
    totalFunds += BigInt(token.funds);
    totalLocked += BigInt(token.lockupCurrent);
    if (token.lockupRate) {
      totalLockupRate += BigInt(token.lockupRate);
    }
  }

  // Check for Active status criteria
  // Criteria: state = ACTIVE for at least one Rail AND lockupRate > 0
  let hasActiveRail = false;
  for (const rail of account.payerRails) {
    totalSettled += BigInt(rail.totalSettledAmount);
    // Collect payee addresses for PDP lookup
    if (rail.payee?.address) {
      payeeAddresses.push(rail.payee.address);
      // Also collect Rail-DataSet correlation data (payee + timestamp)
      railCorrelations.push({
        payeeAddress: rail.payee.address,
        railCreatedAt: rail.createdAt,
      });
    }
    // Check if rail is ACTIVE (state can be string 'ACTIVE' or number 0)
    const isRailActive = rail.state === 'ACTIVE' || rail.state === 0;
    if (isRailActive) {
      hasActiveRail = true;
    }
  }

  // Check if lockupRate > 0 (from any userToken)
  const hasPositiveLockupRate = totalLockupRate > BigInt(0);

  // Active = has at least one ACTIVE rail AND lockupRate > 0
  const isActive = hasActiveRail && hasPositiveLockupRate;

  // Calculate runway days for sorting
  let runwayDays = -1;
  if (totalLockupRate > BigInt(0) && totalFunds > BigInt(0)) {
    const epochsPerDayBigInt = BigInt(Math.floor(EPOCHS_PER_DAY));
    const dailyBurn = totalLockupRate * epochsPerDayBigInt;
    if (dailyBurn > BigInt(0)) {
      runwayDays = Number(totalFunds / dailyBurn);
    }
  }

  return {
    ...base,
    railsCount: account.payerRails.length,
    settledRaw: weiToUSDC(totalSettled.toString()),
    lockedRaw: weiToUSDC(totalLocked.toString()),
    runwayDays,
    // Active status
    isActive,
    hasActiveRail,
    hasPositiveLockupRate,
    // Settled 7d will be populated separately
    settled7d: 0,
    settled7dFormatted: '-',
    // PDP data will be populated via enrichment
    totalDataSizeGB: 0,
    totalDataSizeFormatted: '-',
    proofStatus: 'none',
    payeeAddresses: [...new Set(payeeAddresses)], // Deduplicate
    railCorrelations, // For timestamp-based DataSet correlation
  };
}

// Fetch all payers with extended data (for payer accounts page)
export async function fetchAllPayersExtended(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: limit });

    return data.accounts
      .filter(account => account.payerRails.length > 0)
      .map(transformAccountToPayerExtended);
  } catch (error) {
    console.error('Error fetching all payers:', error);
    throw error;
  }
}

// Count active payers (at least one ACTIVE rail AND lockupRate > 0)
export async function fetchActivePayersCount(): Promise<{ activeCount: number; totalCount: number }> {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: 1000 });

    const payers = data.accounts.filter(account => account.payerRails.length > 0);
    const activePayers = payers.map(transformAccountToPayerExtended).filter(p => p.isActive);

    return {
      activeCount: activePayers.length,
      totalCount: payers.length,
    };
  } catch (error) {
    console.error('Error fetching active payers count:', error);
    return { activeCount: 0, totalCount: 0 };
  }
}

// Enrich payers with PDP data using timestamp-based Rail ↔ DataSet correlation
// This shows only the data funded by each payer's specific rails,
// not the total data stored by their payees.
export async function enrichPayersWithPDP(payers: PayerDisplayExtended[]): Promise<PayerDisplayExtended[]> {
  // Collect all rail correlations across all payers
  const allCorrelations: RailDataSetCorrelation[] = [];
  for (const payer of payers) {
    for (const corr of payer.railCorrelations) {
      allCorrelations.push(corr);
    }
  }

  if (allCorrelations.length === 0) {
    return payers;
  }

  // Batch fetch correlated DataSets (matched by address + timestamp)
  const correlatedDataSets = await fetchCorrelatedDataSets(allCorrelations);

  // Enrich each payer with aggregated data from their correlated DataSets
  return payers.map(payer => {
    const result = aggregateCorrelatedData(payer.railCorrelations, correlatedDataSets);

    // Determine proof status based on faults
    let proofStatus: 'proven' | 'stale' | 'none' = 'none';
    if (result.isStorageProvider) {
      proofStatus = result.hasFaults ? 'stale' : 'proven';
    }

    return {
      ...payer,
      totalDataSizeGB: result.totalDataSizeGB,
      totalDataSizeFormatted: result.totalDataSizeGB > 0 ? formatDataSize(result.totalDataSizeGB) : '-',
      proofStatus,
    };
  });
}

// Enrich payers with settled 7d data
// Note: Per-payer 7d breakdown is not available in the current subgraph schema
// The Settlement type lacks a timestamp field for time-based filtering
// For now, we return payers unchanged - the hero metric uses DailyTokenMetric for total 7d
export async function enrichPayersWithSettled7d(payers: PayerDisplayExtended[]): Promise<PayerDisplayExtended[]> {
  // Per-payer 7d data would require a timestamp field on Settlement type
  // which is not currently available in the subgraph schema
  // Return payers unchanged - they already have settled7d: 0 from initial transform
  return payers;
}

// Fetch payer first activity dates bucketed by day
async function fetchPayersByDate(): Promise<Map<string, number>> {
  try {
    const data = await graphqlClient.request<PayerFirstActivityResponse>(PAYER_FIRST_ACTIVITY_QUERY);
    const payersByDate = new Map<string, number>();

    for (const account of data.accounts) {
      if (account.payerRails.length > 0) {
        const createdAtMs = parseInt(account.payerRails[0].createdAt) * 1000;
        const date = new Date(createdAtMs);
        const dateKey = date.toISOString().split('T')[0];
        payersByDate.set(dateKey, (payersByDate.get(dateKey) || 0) + 1);
      }
    }

    return payersByDate;
  } catch (error) {
    console.error('Error fetching payers by date:', error);
    return new Map();
  }
}

// Fetch settled amounts bucketed by day for cumulative calculations
async function fetchDailySettled(): Promise<Map<string, number>> {
  try {
    const data = await graphqlClient.request<TotalSettledResponse>(TOTAL_SETTLED_QUERY);
    const dailySettled = new Map<string, number>();

    for (const rail of data.rails) {
      const createdAtMs = parseInt(rail.createdAt) * 1000;
      const date = new Date(createdAtMs);
      const dateKey = date.toISOString().split('T')[0];

      const amount = weiToUSDC(rail.totalSettledAmount);
      dailySettled.set(dateKey, (dailySettled.get(dateKey) || 0) + amount);
    }

    return dailySettled;
  } catch (error) {
    console.error('Error fetching daily settled:', error);
    return new Map();
  }
}

// Generate date range array
function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Fetch payer list page metrics with cumulative chart data
// Shows total at each point in time (running totals)
export async function fetchPayerListMetrics(startDate?: Date, endDate?: Date) {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() - 30);

    const effectiveStart = startDate || defaultStart;
    const effectiveEnd = endDate || now;

    const [globalMetrics, totalSettled, settled7d, runRate, payersByDate, dailySettledMap, activePayersData] = await Promise.all([
      fetchGlobalMetrics(),
      fetchTotalSettled(),
      fetchSettled7d(),
      fetchMonthlyRunRate(),
      fetchPayersByDate(),
      fetchDailySettled(),
      fetchActivePayersCount(),
    ]);

    // Generate continuous date range for chart
    const chartDates = generateDateRange(effectiveStart, effectiveEnd);

    // Calculate cumulative payers over time
    // First, get all payers before the start date
    let priorPayers = 0;
    for (const [dateKey, count] of payersByDate) {
      if (dateKey < chartDates[0]) {
        priorPayers += count;
      }
    }

    // Then build cumulative array
    const cumulativePayers: number[] = [];
    let runningTotal = priorPayers;
    for (const date of chartDates) {
      runningTotal += payersByDate.get(date) || 0;
      cumulativePayers.push(runningTotal);
    }

    // Calculate cumulative settled over time
    // First, get all settled before the start date
    let priorSettled = 0;
    for (const [dateKey, amount] of dailySettledMap) {
      if (dateKey < chartDates[0]) {
        priorSettled += amount;
      }
    }

    // Then build cumulative array
    const cumulativeSettled: number[] = [];
    let runningSettled = priorSettled;
    for (const date of chartDates) {
      runningSettled += dailySettledMap.get(date) || 0;
      cumulativeSettled.push(Math.round(runningSettled * 100) / 100);
    }

    // Calculate WoW change (based on new payers in last 7 days vs previous 7)
    const last7Days = chartDates.slice(-7);
    const prev7Days = chartDates.slice(-14, -7);

    const recentNewPayers = last7Days.reduce((sum, date) => sum + (payersByDate.get(date) || 0), 0);
    const prevNewPayers = prev7Days.reduce((sum, date) => sum + (payersByDate.get(date) || 0), 0);

    const payersWoWChange = prevNewPayers > 0
      ? ((recentNewPayers - prevNewPayers) / prevNewPayers * 100).toFixed(1)
      : '0';

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
      payersGoalProgress,
      settledTotal: totalSettled.total,
      settledFormatted: totalSettled.totalFormatted,
      settledGoalProgress,
      // Settled in last 7 days
      settled7d: settled7d.total,
      settled7dFormatted: settled7d.formatted,
      // Monthly run rate (kept for reference but not displayed in hero)
      monthlyRunRate: runRate.monthly,
      monthlyRunRateFormatted: runRate.monthlyFormatted,
      annualizedRunRate: runRate.annualized,
      annualizedRunRateFormatted: runRate.annualizedFormatted,
      runRateGoalProgress,
      activeRailsCount: runRate.activeRailsCount,
      // Cumulative data for charts
      cumulativePayers,
      cumulativeSettled,
      chartDates,
    };
  } catch (error) {
    console.error('Error fetching payer list metrics:', error);
    throw error;
  }
}

// Transform account to payee display format
export interface PayeeDisplay {
  address: string;
  fullAddress: string;
  ensName?: string;
  received: string; // Total received from all rails
  receivedRaw: number; // Raw value for sorting
  payers: number; // Number of unique payers
  start: string;
  startTimestamp: number;
  // PDP data (storage provider metrics)
  pdp: PDPEnrichment | null;
  dataSize: string; // Formatted data size (e.g., "1.23 TB")
  isStorageProvider: boolean;
}

function transformAccountToPayee(account: Account, pdpData?: PDPEnrichment | null): PayeeDisplay {
  // Sum up received from all payee rails
  // Use totalNetPayeeAmount (net after fees) for accurate payee totals
  let totalReceived = BigInt(0);
  let earliestDate = Date.now();
  const uniquePayers = new Set<string>();

  for (const rail of account.payeeRails || []) {
    // Prefer totalNetPayeeAmount (net to payee after fees)
    // Fall back to totalSettledAmount if not available
    const amount = rail.totalNetPayeeAmount || rail.totalSettledAmount;
    totalReceived += BigInt(amount);
    const createdAt = parseInt(rail.createdAt) * 1000;
    if (createdAt < earliestDate) {
      earliestDate = createdAt;
    }
    if (rail.payer?.address) {
      uniquePayers.add(rail.payer.address);
    }
  }

  // Format start date
  const startDate = new Date(earliestDate);
  const start = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).replace(',', " '");

  const receivedValue = weiToUSDC(totalReceived.toString());

  return {
    address: formatAddress(account.address),
    fullAddress: account.address,
    received: formatCurrency(receivedValue),
    receivedRaw: receivedValue,
    payers: uniquePayers.size,
    start,
    startTimestamp: earliestDate,
    // PDP data
    pdp: pdpData || null,
    dataSize: pdpData ? formatDataSize(pdpData.datasetSizeGB) : '-',
    isStorageProvider: pdpData?.isStorageProvider || false,
  };
}

// Fetch all payees (for payee accounts page)
// Enriches with PDP data to show storage provider metrics
export async function fetchAllPayees(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayeesResponse>(TOP_PAYEES_QUERY, { first: limit });

    // Filter to only accounts with payee rails
    const payeeAccounts = data.accounts.filter(
      account => account.payeeRails && account.payeeRails.length > 0
    );

    // Batch fetch PDP data for all payee addresses
    const payeeAddresses = payeeAccounts.map(a => a.address);
    const pdpDataMap = await batchFetchPDPData(payeeAddresses);

    // Transform with PDP enrichment
    return payeeAccounts.map(account => {
      const pdpData = pdpDataMap.get(account.address.toLowerCase());
      return transformAccountToPayee(account, pdpData);
    });
  } catch (error) {
    console.error('Error fetching all payees:', error);
    throw error;
  }
}

// Fetch all payees without PDP data (faster, for initial load)
export async function fetchAllPayeesBasic(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayeesResponse>(TOP_PAYEES_QUERY, { first: limit });

    return data.accounts
      .filter(account => account.payeeRails && account.payeeRails.length > 0)
      .map(account => transformAccountToPayee(account, null));
  } catch (error) {
    console.error('Error fetching all payees:', error);
    throw error;
  }
}

// Enrich existing payees with PDP data (for progressive loading)
export async function enrichPayeesWithPDP(payees: PayeeDisplay[]): Promise<PayeeDisplay[]> {
  const addresses = payees.map(p => p.fullAddress);
  const pdpDataMap = await batchFetchPDPData(addresses);

  return payees.map(payee => {
    const pdpData = pdpDataMap.get(payee.fullAddress.toLowerCase());
    if (pdpData) {
      return {
        ...payee,
        pdp: pdpData,
        dataSize: formatDataSize(pdpData.datasetSizeGB),
        isStorageProvider: pdpData.isStorageProvider,
      };
    }
    return payee;
  });
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

// Fetch all dashboard data at once (including cumulative chart data)
export async function fetchDashboardData() {
  const [globalMetrics, totalSettled, settled7d, topPayers, runRate, payersByDate, dailySettledMap] = await Promise.all([
    fetchGlobalMetrics(),
    fetchTotalSettled(),
    fetchSettled7d(),
    fetchTopPayers(10),
    fetchMonthlyRunRate(),
    fetchPayersByDate(),
    fetchDailySettled(),
  ]);

  // Generate chart dates (last 30 days)
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);
  const chartDates = generateDateRange(defaultStart, now);

  // Calculate cumulative payers over time
  let priorPayers = 0;
  for (const [dateKey, count] of payersByDate) {
    if (dateKey < chartDates[0]) {
      priorPayers += count;
    }
  }

  const cumulativePayers: number[] = [];
  let runningTotal = priorPayers;
  for (const date of chartDates) {
    runningTotal += payersByDate.get(date) || 0;
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
    // Cumulative chart data
    cumulativePayers,
    cumulativeSettled,
    chartDates,
  };
}

// Rail state enum
export const RailState = {
  0: 'Active',
  1: 'Terminated',
  2: 'Pending',
} as const;

// Rail display format for detail pages
export interface RailDisplay {
  id: string;
  counterpartyAddress: string;
  counterpartyFormatted: string;
  counterpartyEnsName?: string;
  settled: string;
  settledRaw: number;
  netPayeeAmount: string;       // Net amount to payee after fees
  netPayeeAmountRaw: number;
  commission: string;           // Operator commission
  commissionRaw: number;
  rate: string;
  rateRaw: number;
  state: string;
  stateCode: number;
  createdAt: string;
  createdAtTimestamp: number;
}

// Account detail display format
export interface AccountDetail {
  address: string;
  ensName?: string;
  totalRails: number;
  totalFunds: string;
  totalFundsRaw: number;
  totalLocked: string;
  totalLockedRaw: number;
  totalSettled: string;
  totalSettledRaw: number;
  totalPayout: string;
  totalPayoutRaw: number;
  payerRails: RailDisplay[];
  payeeRails: RailDisplay[];
}

function transformRailToDisplay(rail: Rail, isPayer: boolean): RailDisplay {
  const counterparty = isPayer ? rail.payee?.address : rail.payer?.address;
  const settledValue = weiToUSDC(rail.totalSettledAmount);
  const netPayeeValue = rail.totalNetPayeeAmount ? weiToUSDC(rail.totalNetPayeeAmount) : settledValue;
  const commissionValue = rail.totalCommission ? weiToUSDC(rail.totalCommission) : 0;
  const rateValue = rail.paymentRate ? weiToUSDC(rail.paymentRate) : 0;
  const createdAtMs = parseInt(rail.createdAt) * 1000;
  const createdDate = new Date(createdAtMs);

  // Convert state to number or use string directly (GraphQL may return either)
  let stateNum: number;
  let stateLabel: string;
  if (typeof rail.state === 'string') {
    // Handle string enum values from subgraph
    const stateMap: Record<string, number> = { 'ACTIVE': 0, 'TERMINATED': 1, 'FINALIZED': 2, 'ZERORATE': 3 };
    stateNum = stateMap[rail.state] ?? parseInt(rail.state) ?? -1;
    stateLabel = rail.state === 'ZERORATE' ? 'Zero Rate' :
                 rail.state.charAt(0) + rail.state.slice(1).toLowerCase();
  } else {
    stateNum = rail.state;
    stateLabel = RailState[stateNum as keyof typeof RailState] || 'Unknown';
  }

  return {
    id: rail.id,
    counterpartyAddress: counterparty || 'Unknown',
    counterpartyFormatted: counterparty ? formatAddress(counterparty) : 'Unknown',
    settled: formatCurrency(settledValue),
    settledRaw: settledValue,
    netPayeeAmount: formatCurrency(netPayeeValue),
    netPayeeAmountRaw: netPayeeValue,
    commission: formatCurrency(commissionValue),
    commissionRaw: commissionValue,
    rate: rateValue > 0 ? `${formatCurrency(rateValue)}/epoch` : '-',
    rateRaw: rateValue,
    state: stateLabel,
    stateCode: stateNum,
    createdAt: createdDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    }).replace(',', " '"),
    createdAtTimestamp: createdAtMs,
  };
}

// Fetch individual account details
export async function fetchAccountDetail(address: string): Promise<AccountDetail | null> {
  try {
    // The subgraph uses lowercase address as the ID
    const id = address.toLowerCase();
    const data = await graphqlClient.request<AccountDetailResponse>(ACCOUNT_DETAIL_QUERY, { id });

    if (!data.account) {
      return null;
    }

    const account = data.account;

    // Sum up funds from all userTokens
    let totalFunds = BigInt(0);
    let totalLocked = BigInt(0);
    let totalPayout = BigInt(0);

    for (const token of account.userTokens) {
      totalFunds += BigInt(token.funds);
      totalLocked += BigInt(token.lockupCurrent);
      totalPayout += BigInt(token.payout);
    }

    // Sum up settled from payer rails
    let totalSettled = BigInt(0);
    for (const rail of account.payerRails) {
      totalSettled += BigInt(rail.totalSettledAmount);
    }

    const totalFundsValue = weiToUSDC(totalFunds.toString());
    const totalLockedValue = weiToUSDC(totalLocked.toString());
    const totalSettledValue = weiToUSDC(totalSettled.toString());
    const totalPayoutValue = weiToUSDC(totalPayout.toString());

    return {
      address: account.address,
      totalRails: parseInt(account.totalRails),
      totalFunds: formatCurrency(totalFundsValue),
      totalFundsRaw: totalFundsValue,
      totalLocked: formatCurrency(totalLockedValue),
      totalLockedRaw: totalLockedValue,
      totalSettled: formatCurrency(totalSettledValue),
      totalSettledRaw: totalSettledValue,
      totalPayout: formatCurrency(totalPayoutValue),
      totalPayoutRaw: totalPayoutValue,
      payerRails: account.payerRails.map(rail => transformRailToDisplay(rail, true)),
      payeeRails: (account.payeeRails || []).map(rail => transformRailToDisplay(rail, false)),
    };
  } catch (error) {
    console.error('Error fetching account detail:', error);
    throw error;
  }
}
