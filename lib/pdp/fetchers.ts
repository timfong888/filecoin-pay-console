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
