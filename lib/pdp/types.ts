/**
 * PDP (Proof of Data Possession) types for correlating storage proofs with payment rails.
 *
 * The correlation strategy matches by address:
 * PDP.storageProvider (Provider.address) == FilecoinPay.Rail.payee
 */

// Raw response types from PDP subgraph

export interface PDPProvider {
  address: string;
  totalProofSets: string;
  totalRoots: string;
  totalDataSize: string;        // Total bytes across all proof sets
  totalFaultedPeriods: string;
  createdAt: string;            // Unix timestamp
}

export interface PDPDataSet {
  setId: string;
  isActive: boolean;
  totalRoots?: string;
  totalDataSize: string;        // Bytes
  totalFaultedPeriods?: string;
  lastProvenEpoch?: string;
  createdAt: string;
  owner: {
    address: string;
  };
}

// GraphQL response types

export interface PDPProvidersResponse {
  providers: PDPProvider[];
}

export interface PDPProviderResponse {
  providers: PDPProvider[];
}

export interface PDPDataSetsResponse {
  dataSets: PDPDataSet[];
}

// Enrichment types for UI display

export interface PDPEnrichment {
  /** Total data size in GB across all proof sets */
  datasetSizeGB: number;
  /** Total data size in bytes (raw value) */
  datasetSizeBytes: bigint;
  /** Number of proof sets owned by this provider */
  proofSetCount: number;
  /** Total number of roots (pieces) across all proof sets */
  totalRoots: number;
  /** Whether provider has any faulted periods */
  hasFaults: boolean;
  /** Total faulted periods (indicates reliability issues) */
  faultedPeriods: number;
  /** Unix timestamp when provider was first seen */
  providerSince: number;
  /** Whether this address has any PDP data (is a storage provider) */
  isStorageProvider: boolean;
}

// Batch lookup result type
export type PDPEnrichmentMap = Map<string, PDPEnrichment>;

// Rail-to-DataSet correlation type
// Correlates by matching: Rail.payee == DataSet.owner AND Rail.createdAt == DataSet.createdAt
export interface RailDataSetCorrelation {
  payeeAddress: string;     // Rail.payee.address
  railCreatedAt: string;    // Rail.createdAt (Unix timestamp seconds)
}

// Result from correlated DataSet lookup
export interface CorrelatedDataSet {
  setId: string;
  totalDataSize: string;    // Bytes
  isActive: boolean;
  hasFaults: boolean;       // totalFaultedPeriods > 0
}
