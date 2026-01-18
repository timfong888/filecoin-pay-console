/**
 * Payer-related data fetching and transformation functions.
 */

import { graphqlClient, EPOCHS_PER_DAY } from '../client';
import {
  TOP_PAYERS_QUERY,
  PAYER_FIRST_ACTIVITY_QUERY,
  TopPayersResponse,
  PayerFirstActivityResponse,
  Account,
} from '../queries';
import {
  fetchCorrelatedDataSets,
  aggregateCorrelatedData,
  formatDataSize,
} from '../../pdp/fetchers';
import { RailDataSetCorrelation } from '../../pdp/types';
import {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  calculateRunwayDays,
  formatRunwayDays,
  formatDate,
  secondsToMs,
} from './utils';

/**
 * Basic payer display interface for tables.
 */
export interface PayerDisplay {
  address: string;
  fullAddress: string;
  ensName?: string;
  locked: string;
  settled: string;
  runway: string;
  start: string;
  startTimestamp: number;
}

/**
 * Extended payer display with rails count and PDP enrichment.
 */
export interface PayerDisplayExtended extends PayerDisplay {
  railsCount: number;
  settledRaw: number;
  lockedRaw: number;
  runwayDays: number;
  settled7d: number;
  settled7dFormatted: string;
  isActive: boolean;
  hasActiveRail: boolean;
  hasPositiveLockupRate: boolean;
  totalDataSizeGB: number;
  totalDataSizeFormatted: string;
  proofStatus: 'proven' | 'stale' | 'none';
  payeeAddresses: string[];
  railCorrelations: { payeeAddress: string; railCreatedAt: string }[];
}

/**
 * Transform account to basic payer display format.
 */
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
    const createdAt = secondsToMs(rail.createdAt);
    if (createdAt < earliestDate) {
      earliestDate = createdAt;
    }
  }

  // Calculate runway
  const runwayDays = calculateRunwayDays(totalFunds, totalLockupRate);
  const runway = formatRunwayDays(runwayDays);

  return {
    address: formatAddress(account.address),
    fullAddress: account.address,
    locked: formatCurrency(weiToUSDC(totalLocked.toString())),
    settled: formatCurrency(weiToUSDC(totalSettled.toString())),
    runway,
    start: formatDate(earliestDate),
    startTimestamp: earliestDate,
  };
}

/**
 * Transform account to extended payer display format.
 */
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
  const runwayDays = calculateRunwayDays(totalFunds, totalLockupRate);

  return {
    ...base,
    railsCount: account.payerRails.length,
    settledRaw: weiToUSDC(totalSettled.toString()),
    lockedRaw: weiToUSDC(totalLocked.toString()),
    runwayDays,
    isActive,
    hasActiveRail,
    hasPositiveLockupRate,
    settled7d: 0,
    settled7dFormatted: '-',
    totalDataSizeGB: 0,
    totalDataSizeFormatted: '-',
    proofStatus: 'none',
    payeeAddresses: [...new Set(payeeAddresses)],
    railCorrelations,
  };
}

/**
 * Fetch top payers.
 * Note: We fetch more accounts than needed because some accounts may be payees-only.
 */
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

/**
 * Fetch all payers (for payer accounts page).
 */
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

/**
 * Fetch all payers with extended data (for payer accounts page).
 */
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

/**
 * Count active payers (at least one ACTIVE rail AND lockupRate > 0).
 */
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

/**
 * Count churned wallets (payers where ALL rails are TERMINATED).
 * Used in GA mode instead of Settled 7d metric.
 */
export async function fetchChurnedWalletsCount(): Promise<number> {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: 1000 });

    let churnedCount = 0;

    for (const account of data.accounts) {
      // Only consider accounts that have payer rails
      if (account.payerRails.length === 0) continue;

      // Check if ALL rails are terminated
      const allTerminated = account.payerRails.every(rail => {
        // Rail state can be string 'TERMINATED' or number 1
        return rail.state === 'TERMINATED' || rail.state === 1;
      });

      if (allTerminated) {
        churnedCount++;
      }
    }

    return churnedCount;
  } catch (error) {
    console.error('Error fetching churned wallets count:', error);
    return 0;
  }
}

/**
 * Fetch ACTIVE payer first activity dates bucketed by day.
 * Active = at least 1 ACTIVE rail AND lockupRate > 0
 * This matches the hero metric "Active Payers" definition.
 */
export async function fetchActivePayersByDate(): Promise<Map<string, number>> {
  try {
    const data = await graphqlClient.request<TopPayersResponse>(TOP_PAYERS_QUERY, { first: 1000 });
    const activePayersByDate = new Map<string, number>();

    for (const account of data.accounts) {
      if (account.payerRails.length === 0) continue;

      // Check if this payer meets Active criteria
      let hasActiveRail = false;
      let earliestCreatedAt = Infinity;

      for (const rail of account.payerRails) {
        const isRailActive = rail.state === 'ACTIVE' || rail.state === 0;
        if (isRailActive) {
          hasActiveRail = true;
        }
        const createdAt = parseInt(rail.createdAt);
        if (createdAt < earliestCreatedAt) {
          earliestCreatedAt = createdAt;
        }
      }

      // Check if lockupRate > 0
      let hasPositiveLockupRate = false;
      for (const token of account.userTokens) {
        if (token.lockupRate && BigInt(token.lockupRate) > BigInt(0)) {
          hasPositiveLockupRate = true;
          break;
        }
      }

      // Only count if ACTIVE (both criteria met)
      if (hasActiveRail && hasPositiveLockupRate) {
        const createdAtMs = earliestCreatedAt * 1000;
        const date = new Date(createdAtMs);
        const dateKey = date.toISOString().split('T')[0];
        activePayersByDate.set(dateKey, (activePayersByDate.get(dateKey) || 0) + 1);
      }
    }

    return activePayersByDate;
  } catch (error) {
    console.error('Error fetching active payers by date:', error);
    return new Map();
  }
}

/**
 * Enrich payers with PDP data using timestamp-based Rail ↔ DataSet correlation.
 * This shows only the data funded by each payer's specific rails.
 */
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

/**
 * Enrich payers with settled 7d data.
 * Note: Per-payer 7d breakdown is not available in the current subgraph schema.
 */
export async function enrichPayersWithSettled7d(payers: PayerDisplayExtended[]): Promise<PayerDisplayExtended[]> {
  // Per-payer 7d data would require a timestamp field on Settlement type
  // which is not currently available in the subgraph schema
  return payers;
}
