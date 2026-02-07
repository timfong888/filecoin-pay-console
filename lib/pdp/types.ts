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

// Types for "My Data" table display

/**
 * Root/Piece data from PDP subgraph
 */
export interface PDPRoot {
  rootId: string;           // Piece ID within DataSet
  cid: string;              // Piece CID (hex format: 0x0155...)
  rawSize: string;          // Size in bytes
  removed: boolean;
}

/**
 * DataSet with roots (pieces) for display
 */
export interface PDPDataSetWithRoots {
  setId: string;
  isActive: boolean;
  totalDataSize: string;
  totalRoots: string;
  totalFaultedPeriods?: string;
  lastProvenEpoch: string | null;
  createdAt: string;
  owner: {
    address: string;
  };
  roots: PDPRoot[];
}

/**
 * Piece display data for "My Data" table
 */
export interface PieceDisplayData {
  dataSetId: string;
  pieceId: string;
  pieceCID: string;         // Base32 encoded (bafkz...)
  pieceCIDHex: string;      // Original hex format
  ipfsCID: string | null;   // From StateView metadata (may be blank)
  size: string;             // Formatted size (e.g., "1.23 MiB")
  sizeBytes: bigint;
  provider: string;         // SP address
  providerFormatted: string; // Truncated or ENS
  isActive: boolean;
}

/**
 * DataSet display data for expandable cards in "My Data" section.
 * Groups pieces by DataSet with payment and proving metrics.
 */
export interface DataSetDisplayData {
  /** DataSet ID from PDP */
  setId: string;
  /** Storage Provider address */
  providerAddress: string;
  /** Resolved ENS name for provider (null if not resolved) */
  providerENS: string | null;
  /** Formatted provider address (truncated) */
  providerFormatted: string;
  /** Total size in bytes */
  totalSizeBytes: bigint;
  /** Formatted size (e.g., "1.23 GiB") */
  totalSizeFormatted: string;
  /** Number of pieces in this DataSet */
  pieceCount: number;
  /** Whether the DataSet is active */
  isActive: boolean;
  /** Last proven epoch (from PDP) */
  lastProvenEpoch: string | null;
  /** Formatted "time ago" for last proven (e.g., "2h ago") */
  lastProvenFormatted: string | null;
  /** Whether DataSet has any faulted periods */
  hasFaults: boolean;
  /** Total faulted periods */
  faultedPeriods: number;
  /** DataSet creation timestamp (Unix seconds) */
  createdAt: string;
  // Payment correlation from Rails
  /** Correlated Rail ID (null if no match) */
  railId: string | null;
  /** Payment rate in wei per second */
  paymentRatePerSecond: bigint;
  /** Rail creation timestamp (Unix ms) */
  railCreatedAtMs: number;
  /** Total amount paid since rail creation (in USDFC) */
  totalPaidUSDFC: number;
  /** Cost per GB per month (in USDFC) */
  costPerGBMonth: number | null;
  /** Pieces belonging to this DataSet */
  pieces: PieceDisplayData[];
}

/**
 * Summary stats for payer's storage
 */
export interface PayerStorageSummary {
  totalStorageBytes: bigint;
  totalStorageFormatted: string;  // e.g., "2.4 GiB"
  totalPieces: number;
  totalDataSets: number;
  runwayDays: number | null;      // Calculated from funds/rate
}
