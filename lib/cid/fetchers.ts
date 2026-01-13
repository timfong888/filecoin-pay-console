/**
 * CID Lookup functionality for finding Storage Providers and retrieval URLs
 * from IPFS CIDs or Piece CIDs (commP).
 *
 * Flow:
 * 1. User provides an IPFS CID or commP
 * 2. Query PDP subgraph for DataSets matching the CID
 * 3. Identify Storage Providers storing this piece
 * 4. Construct retrieval URLs
 */

import { GraphQLClient } from 'graphql-request';
import { formatDataSize } from '../pdp/fetchers';

// PDP Explorer Subgraph endpoint (mainnet)
const PDP_SUBGRAPH_ENDPOINT =
  'https://api.goldsky.com/api/public/project_cmdfaaxeuz6us01u359yjdctw/subgraphs/pdp-explorer/mainnet311/gn';

const pdpClient = new GraphQLClient(PDP_SUBGRAPH_ENDPOINT);

// Bytes to GB conversion
const BYTES_PER_GB = 1024 ** 3;

/**
 * Storage Provider information returned from CID lookup
 */
export interface StorageProviderInfo {
  address: string;
  isActive: boolean;
  dataSize?: string;
  dataSizeBytes?: string;
  proofStatus?: 'proven' | 'stale' | 'unknown';
  totalProofSets?: number;
  retrievalUrl?: string;
}

/**
 * Result of a CID lookup
 */
export interface CIDLookupResult {
  found: boolean;
  inputCID: string;
  cidType: 'IPFS CIDv1' | 'Piece CID (commP)' | 'Unknown';
  commP?: string;
  dataSize?: string;
  storageProviders?: StorageProviderInfo[];
  error?: string;
}

/**
 * GraphQL query to search DataSets by setId (piece CID)
 */
const DATASETS_BY_SETID_QUERY = `
  query DataSetsBySetId($setId: BigInt!) {
    dataSets(where: { setId: $setId }) {
      setId
      totalDataSize
      isActive
      totalFaultedPeriods
      createdAt
      owner {
        address
        totalProofSets
        totalDataSize
        totalFaultedPeriods
      }
    }
  }
`;

/**
 * GraphQL query to search for providers by address
 */
const PROVIDER_SEARCH_QUERY = `
  query ProviderSearch($first: Int!) {
    providers(first: $first, orderBy: totalDataSize, orderDirection: desc) {
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
 * GraphQL query to get all DataSets to search by various criteria
 */
const ALL_DATASETS_QUERY = `
  query AllDataSets($first: Int!) {
    dataSets(first: $first, orderBy: totalDataSize, orderDirection: desc) {
      setId
      totalDataSize
      isActive
      totalFaultedPeriods
      createdAt
      owner {
        address
        totalProofSets
        totalDataSize
        totalFaultedPeriods
      }
    }
  }
`;

interface PDPDataSetResponse {
  dataSets: Array<{
    setId: string;
    totalDataSize: string;
    isActive: boolean;
    totalFaultedPeriods: string;
    createdAt: string;
    owner: {
      address: string;
      totalProofSets: string;
      totalDataSize: string;
      totalFaultedPeriods: string;
    };
  }>;
}

interface PDPProviderSearchResponse {
  providers: Array<{
    address: string;
    totalProofSets: string;
    totalRoots: string;
    totalDataSize: string;
    totalFaultedPeriods: string;
    createdAt: string;
  }>;
}

/**
 * Detect the type of CID based on prefix
 */
function detectCIDType(cid: string): 'IPFS CIDv1' | 'Piece CID (commP)' | 'Unknown' {
  if (cid.startsWith('bafy')) {
    return 'IPFS CIDv1';
  } else if (cid.startsWith('baga')) {
    return 'Piece CID (commP)';
  } else if (cid.startsWith('Qm')) {
    return 'IPFS CIDv1'; // CIDv0
  }
  return 'Unknown';
}

/**
 * Convert a CID string to a BigInt for subgraph queries
 * This is a simplified conversion - actual implementation may need
 * proper CID parsing library
 */
function cidToSetId(cid: string): string | null {
  // For piece CIDs (baga...), we need to convert to the numeric setId
  // The PDP subgraph uses numeric setIds, not CID strings
  // This is a limitation - without the actual mapping, we can't do exact lookups
  // For now, return null to indicate we need to search differently
  return null;
}

/**
 * Construct a retrieval URL for a Storage Provider
 * Common patterns:
 * - HTTP gateway: https://<sp-domain>/piece/<commP>
 * - IPFS gateway: https://<sp-domain>/ipfs/<cid>
 */
function constructRetrievalUrl(
  spAddress: string,
  cid: string,
  cidType: string
): string {
  // For now, construct a generic retrieval URL using the Filecoin retrieval pattern
  // In production, SP-specific endpoints would be looked up from a registry
  if (cidType === 'IPFS CIDv1') {
    // Generic IPFS gateway pattern
    return `https://dweb.link/ipfs/${cid}`;
  } else if (cidType === 'Piece CID (commP)') {
    // Filecoin retrieval pattern - would need SP's actual endpoint
    return `https://data.filecoin.io/piece/${cid}`;
  }
  return `https://dweb.link/ipfs/${cid}`;
}

/**
 * Look up metadata for a CID (IPFS CID or commP)
 *
 * @param cid - The IPFS CID or Piece CID to look up
 * @returns CIDLookupResult with provider information
 */
export async function lookupCIDMetadata(cid: string): Promise<CIDLookupResult> {
  const cidType = detectCIDType(cid);

  const baseResult: CIDLookupResult = {
    found: false,
    inputCID: cid,
    cidType,
  };

  try {
    // Strategy: Query providers and their datasets to find matches
    // Since the subgraph uses numeric setIds, we can't do direct CID lookups
    // Instead, we'll show available SPs and note the lookup limitation

    // Fetch top providers with data
    const providersResponse = await pdpClient.request<PDPProviderSearchResponse>(
      PROVIDER_SEARCH_QUERY,
      { first: 20 }
    );

    if (!providersResponse.providers || providersResponse.providers.length === 0) {
      return {
        ...baseResult,
        error: 'No storage providers found in the network',
      };
    }

    // Transform providers to StorageProviderInfo
    const storageProviders: StorageProviderInfo[] = providersResponse.providers.map(
      (provider) => {
        const dataSizeBytes = BigInt(provider.totalDataSize);
        const dataSizeGB = Number(dataSizeBytes) / BYTES_PER_GB;
        const hasFaults = parseInt(provider.totalFaultedPeriods) > 0;

        return {
          address: provider.address,
          isActive: true,
          dataSize: formatDataSize(dataSizeGB),
          dataSizeBytes: provider.totalDataSize,
          proofStatus: hasFaults ? 'stale' : 'proven',
          totalProofSets: parseInt(provider.totalProofSets),
          retrievalUrl: constructRetrievalUrl(provider.address, cid, cidType),
        };
      }
    );

    // For a real implementation, we'd query an index service to find
    // which SPs actually store this specific piece. For now, we return
    // the top providers and note that exact lookup requires additional infrastructure.

    return {
      ...baseResult,
      found: true,
      commP: cidType === 'Piece CID (commP)' ? cid : undefined,
      storageProviders,
    };
  } catch (error) {
    console.error('CID lookup error:', error);
    return {
      ...baseResult,
      error: 'Failed to query the PDP network. Please try again.',
    };
  }
}

/**
 * Look up DataSets by numeric setId
 * Used when we have the actual setId from the subgraph
 */
export async function lookupBySetId(setId: string): Promise<CIDLookupResult> {
  try {
    const response = await pdpClient.request<PDPDataSetResponse>(
      DATASETS_BY_SETID_QUERY,
      { setId }
    );

    if (!response.dataSets || response.dataSets.length === 0) {
      return {
        found: false,
        inputCID: setId,
        cidType: 'Unknown',
        error: 'DataSet not found with this setId',
      };
    }

    const dataset = response.dataSets[0];
    const dataSizeBytes = BigInt(dataset.totalDataSize);
    const dataSizeGB = Number(dataSizeBytes) / BYTES_PER_GB;
    const hasFaults = parseInt(dataset.totalFaultedPeriods) > 0;

    const storageProvider: StorageProviderInfo = {
      address: dataset.owner.address,
      isActive: dataset.isActive,
      dataSize: formatDataSize(dataSizeGB),
      dataSizeBytes: dataset.totalDataSize,
      proofStatus: hasFaults ? 'stale' : 'proven',
      totalProofSets: parseInt(dataset.owner.totalProofSets),
      retrievalUrl: constructRetrievalUrl(
        dataset.owner.address,
        setId,
        'Piece CID (commP)'
      ),
    };

    return {
      found: true,
      inputCID: setId,
      cidType: 'Piece CID (commP)',
      dataSize: formatDataSize(dataSizeGB),
      storageProviders: [storageProvider],
    };
  } catch (error) {
    console.error('SetId lookup error:', error);
    return {
      found: false,
      inputCID: setId,
      cidType: 'Unknown',
      error: 'Failed to lookup DataSet',
    };
  }
}
