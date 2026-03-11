/**
 * PDP Explorer Subgraph client for fetching storage proof data.
 *
 * Correlates Filecoin Pay Rails with PDP ProofSets by matching:
 * - Rail.payee address == PDP Provider.address
 *
 * This enables showing dataset sizes alongside payment metrics.
 */

import { GraphQLClient } from 'graphql-request';
import {
  PDPProvider,
  PDPProvidersResponse,
  PDPEnrichment,
  PDPEnrichmentMap,
  RailDataSetCorrelation,
  CorrelatedDataSet,
  PDPDataSetsResponse,
  PDPDataSetWithRoots,
  PieceDisplayData,
  PayerStorageSummary,
  DataSetDisplayData,
} from './types';

// PDP Explorer Subgraph endpoint (mainnet)
export const PDP_SUBGRAPH_ENDPOINT =
  'https://api.goldsky.com/api/public/project_cmdfaaxeuz6us01u359yjdctw/subgraphs/pdp-explorer/mainnet311/gn';

// GraphQL client for PDP subgraph
const pdpClient = new GraphQLClient(PDP_SUBGRAPH_ENDPOINT);

// Bytes to GB conversion
const BYTES_PER_GB = 1024 ** 3;

/**
 * GraphQL query to fetch providers by addresses.
 * Uses the `where` filter with `address_in` for batch lookups.
 */
const PROVIDERS_BY_ADDRESSES_QUERY = `
  query ProvidersByAddresses($addresses: [Bytes!]!) {
    providers(where: { address_in: $addresses }) {
      address
      totalProofSets
      totalRoots
      totalDataSize
      totalFaultedPeriods
      createdAt
    }
  }
`;

/**
 * GraphQL query to fetch a single provider by address.
 */
const PROVIDER_BY_ADDRESS_QUERY = `
  query ProviderByAddress($address: Bytes!) {
    providers(where: { address: $address }) {
      address
      totalProofSets
      totalRoots
      totalDataSize
      totalFaultedPeriods
      createdAt
    }
  }
`;

/**
 * Transform raw provider data to enrichment format for UI display.
 */
function transformProviderToEnrichment(provider: PDPProvider): PDPEnrichment {
  const datasetSizeBytes = BigInt(provider.totalDataSize);
  const datasetSizeGB = Number(datasetSizeBytes) / BYTES_PER_GB;
  const faultedPeriods = parseInt(provider.totalFaultedPeriods);

  return {
    datasetSizeGB: Math.round(datasetSizeGB * 100) / 100, // Round to 2 decimal places
    datasetSizeBytes,
    proofSetCount: parseInt(provider.totalProofSets),
    totalRoots: parseInt(provider.totalRoots),
    hasFaults: faultedPeriods > 0,
    faultedPeriods,
    providerSince: parseInt(provider.createdAt) * 1000, // Convert to ms
    isStorageProvider: true,
  };
}

/**
 * Create a "no PDP data" enrichment object for addresses that aren't storage providers.
 */
function createEmptyEnrichment(): PDPEnrichment {
  return {
    datasetSizeGB: 0,
    datasetSizeBytes: BigInt(0),
    proofSetCount: 0,
    totalRoots: 0,
    hasFaults: false,
    faultedPeriods: 0,
    providerSince: 0,
    isStorageProvider: false,
  };
}

/**
 * Fetch PDP data for a single provider address.
 *
 * @param address - The provider/payee address to look up
 * @returns PDPEnrichment or null if provider not found
 */
export async function fetchPDPDataForProvider(
  address: string
): Promise<PDPEnrichment | null> {
  try {
    const normalizedAddress = address.toLowerCase();
    const data = await pdpClient.request<PDPProvidersResponse>(
      PROVIDER_BY_ADDRESS_QUERY,
      { address: normalizedAddress }
    );

    if (!data.providers || data.providers.length === 0) {
      return null;
    }

    return transformProviderToEnrichment(data.providers[0]);
  } catch (error) {
    console.error('PDP API error for address', address, ':', error);
    return null;
  }
}

/**
 * Batch fetch PDP data for multiple payee addresses.
 *
 * This is more efficient than individual lookups when displaying
 * lists of rails or payees.
 *
 * @param payeeAddresses - Array of payee addresses to look up
 * @returns Map of lowercase address -> PDPEnrichment
 */
export async function batchFetchPDPData(
  payeeAddresses: string[]
): Promise<PDPEnrichmentMap> {
  const results: PDPEnrichmentMap = new Map();

  if (payeeAddresses.length === 0) {
    return results;
  }

  // Normalize and deduplicate addresses
  const uniqueAddresses = [...new Set(payeeAddresses.map(a => a.toLowerCase()))];

  // Batch in groups of 100 to avoid query limits
  const BATCH_SIZE = 100;

  for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
    const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);

    try {
      const data = await pdpClient.request<PDPProvidersResponse>(
        PROVIDERS_BY_ADDRESSES_QUERY,
        { addresses: batch }
      );

      if (data.providers) {
        for (const provider of data.providers) {
          const enrichment = transformProviderToEnrichment(provider);
          results.set(provider.address.toLowerCase(), enrichment);
        }
      }
    } catch (error) {
      console.error('PDP batch fetch error:', error);
      // Continue with other batches even if one fails
    }
  }

  return results;
}

/**
 * Format data size for display.
 *
 * @param sizeGB - Size in gigabytes
 * @returns Formatted string (e.g., "1.23 GB", "456.78 TB")
 */
export function formatDataSize(sizeGB: number): string {
  if (sizeGB >= 1024) {
    return `${(sizeGB / 1024).toFixed(2)} TB`;
  } else if (sizeGB >= 1) {
    return `${sizeGB.toFixed(2)} GB`;
  } else if (sizeGB > 0) {
    return `${(sizeGB * 1024).toFixed(2)} MB`;
  }
  return '-';
}

/**
 * Calculate cost per GB based on payment rate and data size.
 *
 * @param paymentRateWeiPerSecond - Payment rate in wei/second
 * @param dataSizeGB - Data size in GB
 * @returns Cost per GB per month in USDFC, or null if not calculable
 */
export function calculateCostPerGB(
  paymentRateWeiPerSecond: bigint,
  dataSizeGB: number
): number | null {
  if (dataSizeGB <= 0 || paymentRateWeiPerSecond <= BigInt(0)) {
    return null;
  }

  // Convert to monthly cost
  const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
  const monthlyRateWei = paymentRateWeiPerSecond * BigInt(SECONDS_PER_MONTH);

  // Convert wei to USDFC (18 decimals)
  const monthlyRateUSDFC = Number(monthlyRateWei) / 10 ** 18;

  // Cost per GB
  const costPerGB = monthlyRateUSDFC / dataSizeGB;

  return Math.round(costPerGB * 100) / 100;
}

/**
 * GraphQL query to fetch DataSets by owner addresses and timestamps.
 * Used for Rail ↔ DataSet correlation.
 */
const DATASETS_BY_ADDRESSES_QUERY = `
  query DataSetsByAddresses($addresses: [Bytes!]!) {
    dataSets(first: 1000, where: { owner_in: $addresses }) {
      setId
      totalDataSize
      isActive
      totalFaultedPeriods
      createdAt
      owner {
        address
      }
    }
  }
`;

/**
 * Result type for correlated data lookup
 */
export interface CorrelatedDataResult {
  totalDataSizeGB: number;
  totalDataSizeBytes: bigint;
  matchedDataSets: number;
  hasFaults: boolean;
  isStorageProvider: boolean;
}

/**
 * Fetch DataSets correlated with Rails by matching timestamp and owner address.
 *
 * The correlation works because the onboarding flow creates both the Rail
 * and DataSet in the same transaction, resulting in identical createdAt timestamps.
 *
 * Note: Multiple DataSets may share the same owner:timestamp key when multiple
 * rails are created in the same block. We aggregate (sum) all matching DataSets.
 *
 * @param correlations - Array of {payeeAddress, railCreatedAt} pairs from Rails
 * @returns Map of "address:timestamp" key -> CorrelatedDataSet (aggregated)
 */
export async function fetchCorrelatedDataSets(
  correlations: RailDataSetCorrelation[]
): Promise<Map<string, CorrelatedDataSet>> {
  const results = new Map<string, CorrelatedDataSet>();

  if (correlations.length === 0) {
    return results;
  }

  // Get unique addresses to query
  const uniqueAddresses = [...new Set(correlations.map(c => c.payeeAddress.toLowerCase()))];

  // Build lookup set of address:timestamp keys for filtering results
  const correlationKeys = new Set(
    correlations.map(c => `${c.payeeAddress.toLowerCase()}:${c.railCreatedAt}`)
  );

  // Count how many rails share each key (for averaging later)
  const railsPerKey = new Map<string, number>();
  for (const c of correlations) {
    const key = `${c.payeeAddress.toLowerCase()}:${c.railCreatedAt}`;
    railsPerKey.set(key, (railsPerKey.get(key) || 0) + 1);
  }

  const BATCH_SIZE = 100;

  for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
    const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);

    try {
      const data = await pdpClient.request<PDPDataSetsResponse>(
        DATASETS_BY_ADDRESSES_QUERY,
        { addresses: batch }
      );

      if (data.dataSets) {
        // Group DataSets by key and sum their sizes
        const aggregated = new Map<string, { totalSize: bigint; count: number; hasFaults: boolean; isActive: boolean }>();

        for (const ds of data.dataSets) {
          const key = `${ds.owner.address.toLowerCase()}:${ds.createdAt}`;

          // Only include if this matches a Rail correlation
          if (correlationKeys.has(key)) {
            const existing = aggregated.get(key);
            if (existing) {
              existing.totalSize += BigInt(ds.totalDataSize);
              existing.count += 1;
              existing.hasFaults = existing.hasFaults || parseInt(ds.totalFaultedPeriods || '0') > 0;
              existing.isActive = existing.isActive && ds.isActive;
            } else {
              aggregated.set(key, {
                totalSize: BigInt(ds.totalDataSize),
                count: 1,
                hasFaults: parseInt(ds.totalFaultedPeriods || '0') > 0,
                isActive: ds.isActive,
              });
            }
          }
        }

        // Convert aggregated data to CorrelatedDataSet format
        // If multiple rails share the same key, divide the total by number of rails
        // This gives each payer their fair share of the aggregated data
        for (const [key, agg] of aggregated) {
          const railCount = railsPerKey.get(key) || 1;
          const perRailSize = agg.totalSize / BigInt(railCount);

          results.set(key, {
            setId: `agg-${key}`, // Aggregated, no single setId
            totalDataSize: perRailSize.toString(),
            isActive: agg.isActive,
            hasFaults: agg.hasFaults,
          });
        }
      }
    } catch (error) {
      console.error('PDP correlated datasets fetch error:', error);
    }
  }

  return results;
}

/**
 * Aggregate correlated DataSet data for a payer's rails.
 *
 * @param railCorrelations - Rails from a single payer with their timestamps
 * @param correlatedDataSets - Map from fetchCorrelatedDataSets()
 * @returns Aggregated result for this payer
 */
export function aggregateCorrelatedData(
  railCorrelations: RailDataSetCorrelation[],
  correlatedDataSets: Map<string, CorrelatedDataSet>
): CorrelatedDataResult {
  let totalDataSizeBytes = BigInt(0);
  let matchedDataSets = 0;
  let hasFaults = false;

  for (const rail of railCorrelations) {
    const key = `${rail.payeeAddress.toLowerCase()}:${rail.railCreatedAt}`;
    const ds = correlatedDataSets.get(key);

    if (ds) {
      totalDataSizeBytes += BigInt(ds.totalDataSize);
      matchedDataSets++;
      if (ds.hasFaults) {
        hasFaults = true;
      }
    }
  }

  const totalDataSizeGB = Number(totalDataSizeBytes) / BYTES_PER_GB;

  return {
    totalDataSizeGB: Math.round(totalDataSizeGB * 100) / 100,
    totalDataSizeBytes,
    matchedDataSets,
    hasFaults,
    isStorageProvider: matchedDataSets > 0,
  };
}

/**
 * GraphQL query to fetch DataSets with roots (pieces) by owner address.
 * Used for the "My Data" table in payer detail view.
 */
const DATASETS_WITH_ROOTS_BY_OWNER_QUERY = `
  query DataSetsWithRootsByOwner($ownerAddress: Bytes!) {
    dataSets(where: { owner_: { address: $ownerAddress } }, first: 100) {
      setId
      isActive
      totalDataSize
      totalRoots
      lastProvenEpoch
      createdAt
      owner {
        address
      }
      roots(first: 100, where: { removed: false }) {
        rootId
        cid
        rawSize
        removed
      }
    }
  }
`;

interface DataSetsWithRootsResponse {
  dataSets: PDPDataSetWithRoots[];
}

/**
 * Fetch DataSets with their roots (pieces) for a payer address.
 *
 * @deprecated Use fetchDataSetsWithRootsByCorrelation for accurate payer data.
 * This function queries by owner address, but DataSets are owned by SPs, not payers.
 *
 * @param ownerAddress - The payer/owner address
 * @returns Array of DataSets with their roots
 */
export async function fetchDataSetsWithRoots(
  ownerAddress: string
): Promise<PDPDataSetWithRoots[]> {
  try {
    const normalizedAddress = ownerAddress.toLowerCase();
    const data = await pdpClient.request<DataSetsWithRootsResponse>(
      DATASETS_WITH_ROOTS_BY_OWNER_QUERY,
      { ownerAddress: normalizedAddress }
    );

    return data.dataSets || [];
  } catch (error) {
    console.error('Failed to fetch DataSets with roots for', ownerAddress, ':', error);
    return [];
  }
}

/**
 * GraphQL query to fetch DataSets with roots by owner addresses (batch).
 * Includes totalFaultedPeriods for reliability indicator.
 */
const DATASETS_WITH_ROOTS_BY_OWNERS_QUERY = `
  query DataSetsWithRootsByOwners($addresses: [Bytes!]!) {
    dataSets(first: 1000, where: { owner_in: $addresses }) {
      setId
      isActive
      totalDataSize
      totalRoots
      totalFaultedPeriods
      lastProvenEpoch
      createdAt
      owner {
        address
      }
      roots(first: 100, where: { removed: false }) {
        rootId
        cid
        rawSize
        removed
      }
    }
  }
`;

/**
 * Fetch DataSets with roots using rail correlations.
 *
 * DataSets are owned by SPs (payees), not payers. This function:
 * 1. Takes a payer's rails (payee + timestamp pairs)
 * 2. Queries DataSets owned by those payees
 * 3. Filters to only DataSets matching the rail timestamps
 *
 * @param railCorrelations - Array of {payeeAddress, railCreatedAt} from payer's rails
 * @returns Array of DataSets with their roots that match the correlations
 */
export async function fetchDataSetsWithRootsByCorrelation(
  railCorrelations: RailDataSetCorrelation[]
): Promise<PDPDataSetWithRoots[]> {
  if (railCorrelations.length === 0) {
    return [];
  }

  // Get unique payee addresses
  const uniqueAddresses = [...new Set(railCorrelations.map(c => c.payeeAddress.toLowerCase()))];

  // Build lookup set of address:timestamp keys for filtering
  const correlationKeys = new Set(
    railCorrelations.map(c => `${c.payeeAddress.toLowerCase()}:${c.railCreatedAt}`)
  );

  const results: PDPDataSetWithRoots[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
    const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);

    try {
      const data = await pdpClient.request<DataSetsWithRootsResponse>(
        DATASETS_WITH_ROOTS_BY_OWNERS_QUERY,
        { addresses: batch }
      );

      if (data.dataSets) {
        for (const ds of data.dataSets) {
          // Only include if this matches a rail correlation
          const key = `${ds.owner.address.toLowerCase()}:${ds.createdAt}`;
          if (correlationKeys.has(key)) {
            results.push(ds);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch correlated DataSets with roots:', error);
    }
  }

  return results;
}

/**
 * Calculate storage summary for a payer's DataSets.
 *
 * @param dataSets - DataSets from fetchDataSetsWithRoots
 * @param fundsAvailable - Available funds in USDFC (optional, for runway calc)
 * @param lockupRatePerSecond - Lockup rate in USDFC/second (optional)
 * @returns PayerStorageSummary
 */
export function calculateStorageSummary(
  dataSets: PDPDataSetWithRoots[],
  fundsAvailable?: number,
  lockupRatePerSecond?: number
): PayerStorageSummary {
  let totalStorageBytes = BigInt(0);
  let totalPieces = 0;

  for (const ds of dataSets) {
    totalStorageBytes += BigInt(ds.totalDataSize);
    // Use totalRoots from DataSet, not fetched roots array length
    // The roots array is limited by GraphQL query (first: 100)
    totalPieces += parseInt(ds.totalRoots) || ds.roots?.length || 0;
  }

  const totalStorageGB = Number(totalStorageBytes) / BYTES_PER_GB;

  // Calculate runway if we have funds and rate
  let runwayDays: number | null = null;
  if (fundsAvailable && lockupRatePerSecond && lockupRatePerSecond > 0) {
    const secondsRemaining = fundsAvailable / lockupRatePerSecond;
    runwayDays = Math.floor(secondsRemaining / (24 * 60 * 60));
  }

  return {
    totalStorageBytes,
    totalStorageFormatted: formatDataSize(totalStorageGB),
    totalPieces,
    totalDataSets: dataSets.length,
    runwayDays,
  };
}

/**
 * Format bytes to human-readable size with appropriate unit.
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.23 MiB", "456.78 GiB")
 */
export function formatBytesSize(bytes: bigint | number): string {
  const bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes;

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let unitIndex = 0;
  let size = bytesNum;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${size} ${units[unitIndex]}`;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format a Unix timestamp as "time ago" string.
 *
 * @param epochSeconds - Unix timestamp in seconds (or null)
 * @returns Formatted string like "2h ago", "3d ago", or null
 */
export function formatTimeAgo(epochSeconds: string | null): string | null {
  if (!epochSeconds) return null;

  const epochNum = parseInt(epochSeconds);
  if (isNaN(epochNum) || epochNum === 0) return null;

  // Filecoin epochs are ~30 seconds each, starting from genesis
  // Genesis: Nov 15, 2020 00:00:00 UTC = 1605398400
  const FILECOIN_GENESIS_UNIX = 1605398400;
  const EPOCH_DURATION_SECONDS = 30;

  const provenUnix = FILECOIN_GENESIS_UNIX + (epochNum * EPOCH_DURATION_SECONDS);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = nowSeconds - provenUnix;

  if (diffSeconds < 0) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return `${Math.floor(diffSeconds / 604800)}w ago`;
}

/**
 * Format address as truncated string.
 */
function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Rail info needed for DataSet correlation and payment calculation.
 */
export interface RailInfoForDataSet {
  railId: string;
  payeeAddress: string;
  createdAtTimestamp: number; // Unix ms
  paymentRateWei: string;     // Wei per second as string
}

/**
 * Transform DataSets and Rails into DataSetDisplayData for UI.
 *
 * Correlates DataSets with Rails by matching owner address and creation timestamp.
 * Calculates payment metrics based on rail rate × duration.
 *
 * @param dataSets - DataSets fetched from PDP subgraph
 * @param rails - Rail info from Filecoin Pay (payee address, rate, timestamp)
 * @param hexCidToBase32Fn - Function to convert hex CID to base32
 * @returns Array of DataSetDisplayData for UI rendering
 */
export function transformDataSetsToDisplay(
  dataSets: PDPDataSetWithRoots[],
  rails: RailInfoForDataSet[],
  hexCidToBase32Fn: (hexCid: string) => string
): DataSetDisplayData[] {
  const now = Date.now();

  // Build rail lookup by correlation key (address:timestamp in seconds)
  const railByKey = new Map<string, RailInfoForDataSet>();
  for (const rail of rails) {
    const key = `${rail.payeeAddress.toLowerCase()}:${Math.floor(rail.createdAtTimestamp / 1000)}`;
    railByKey.set(key, rail);
  }

  return dataSets.map((ds) => {
    const providerAddress = ds.owner?.address || '';
    const totalSizeBytes = BigInt(ds.totalDataSize);
    const pieceCount = parseInt(ds.totalRoots) || ds.roots?.length || 0;
    const faultedPeriods = parseInt(ds.totalFaultedPeriods || '0') || 0;

    // Find correlated rail
    const correlationKey = `${providerAddress.toLowerCase()}:${ds.createdAt}`;
    const rail = railByKey.get(correlationKey);

    // Calculate payment metrics if rail found
    let totalPaidUSDFC = 0;
    let costPerGBMonth: number | null = null;
    let paymentRatePerSecond = BigInt(0);
    let railCreatedAtMs = 0;

    if (rail) {
      paymentRatePerSecond = BigInt(rail.paymentRateWei);
      railCreatedAtMs = rail.createdAtTimestamp;

      // Calculate total paid since rail creation
      const durationSeconds = Math.floor((now - railCreatedAtMs) / 1000);
      if (durationSeconds > 0 && paymentRatePerSecond > BigInt(0)) {
        const totalPaidWei = paymentRatePerSecond * BigInt(durationSeconds);
        totalPaidUSDFC = Number(totalPaidWei) / 1e18;
      }

      // Calculate cost per GB per month
      const sizeGB = Number(totalSizeBytes) / BYTES_PER_GB;
      if (sizeGB > 0 && paymentRatePerSecond > BigInt(0)) {
        const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
        const monthlyRateWei = paymentRatePerSecond * BigInt(SECONDS_PER_MONTH);
        const monthlyRateUSDFC = Number(monthlyRateWei) / 1e18;
        costPerGBMonth = Math.round((monthlyRateUSDFC / sizeGB) * 100) / 100;
      }
    }

    // Transform pieces
    const pieces: PieceDisplayData[] = (ds.roots || []).map((root) => {
      const pieceCIDBase32 = hexCidToBase32Fn(root.cid);
      return {
        dataSetId: ds.setId,
        pieceId: root.rootId,
        pieceCID: pieceCIDBase32,
        pieceCIDHex: root.cid,
        ipfsCID: null, // Will be enriched separately from StateView
        size: formatBytesSize(BigInt(root.rawSize)),
        sizeBytes: BigInt(root.rawSize),
        provider: providerAddress,
        providerFormatted: formatAddress(providerAddress),
        isActive: ds.isActive,
      };
    });

    return {
      setId: ds.setId,
      providerAddress,
      providerENS: null, // Will be enriched separately
      providerFormatted: formatAddress(providerAddress),
      totalSizeBytes,
      totalSizeFormatted: formatBytesSize(totalSizeBytes),
      pieceCount,
      isActive: ds.isActive,
      lastProvenEpoch: ds.lastProvenEpoch,
      lastProvenFormatted: formatTimeAgo(ds.lastProvenEpoch),
      hasFaults: faultedPeriods > 0,
      faultedPeriods,
      createdAt: ds.createdAt,
      railId: rail?.railId || null,
      paymentRatePerSecond,
      railCreatedAtMs,
      totalPaidUSDFC: Math.round(totalPaidUSDFC * 100) / 100,
      costPerGBMonth,
      pieces,
    };
  });
}

/**
 * Calculate aggregate summary from DataSetDisplayData array.
 */
export function calculateDataSetsSummary(
  dataSets: DataSetDisplayData[]
): { totalDataSets: number; totalPieces: number; totalPaidUSDFC: number; totalSizeFormatted: string } {
  let totalPieces = 0;
  let totalPaidUSDFC = 0;
  let totalSizeBytes = BigInt(0);

  for (const ds of dataSets) {
    totalPieces += ds.pieceCount;
    totalPaidUSDFC += ds.totalPaidUSDFC;
    totalSizeBytes += ds.totalSizeBytes;
  }

  return {
    totalDataSets: dataSets.length,
    totalPieces,
    totalPaidUSDFC: Math.round(totalPaidUSDFC * 100) / 100,
    totalSizeFormatted: formatBytesSize(totalSizeBytes),
  };
}
