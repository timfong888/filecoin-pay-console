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
 * @param correlations - Array of {payeeAddress, railCreatedAt} pairs from Rails
 * @returns Map of "address:timestamp" key -> CorrelatedDataSet
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

  const BATCH_SIZE = 100;

  for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
    const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);

    try {
      const data = await pdpClient.request<PDPDataSetsResponse>(
        DATASETS_BY_ADDRESSES_QUERY,
        { addresses: batch }
      );

      if (data.dataSets) {
        for (const ds of data.dataSets) {
          // Build the correlation key
          const key = `${ds.owner.address.toLowerCase()}:${ds.createdAt}`;

          // Only include if this matches a Rail correlation
          if (correlationKeys.has(key)) {
            results.set(key, {
              setId: ds.setId,
              totalDataSize: ds.totalDataSize,
              isActive: ds.isActive,
              hasFaults: parseInt(ds.totalFaultedPeriods || '0') > 0,
            });
          }
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
    totalPieces += ds.roots?.length || 0;
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
