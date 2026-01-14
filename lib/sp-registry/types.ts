/**
 * SP Registry types for displaying Storage Provider metadata on Payee Detail pages.
 *
 * The SP Registry contract stores metadata about Storage Providers offering PDP services.
 * This module enriches payee data with provider names, locations, and service details.
 *
 * Contract: 0xf55dDbf63F1b55c3F1D4FA7e339a68AB7b64A5eB (Filecoin Mainnet)
 * SDK: @filoz/synapse-sdk
 */

/**
 * PDP service offering details from the SP Registry.
 * Nested under products.PDP.data in the registry response.
 */
export interface PDPOffering {
  /** Provider's service endpoint URL */
  serviceURL: string;
  /** Minimum piece size in bytes */
  minPieceSizeInBytes: bigint;
  /** Maximum piece size in bytes */
  maxPieceSizeInBytes: bigint;
  /** Whether IPNI piece indexing is supported */
  ipniPiece: boolean;
  /** Whether IPNI IPFS indexing is supported */
  ipniIpfs: boolean;
  /** Storage price per TiB per month in attoFIL */
  storagePricePerTibPerMonth: bigint;
  /** Minimum proving period in epochs */
  minProvingPeriodInEpochs: number;
  /** Location in ISO format (e.g., "C=GB;ST=Gloucestershire;L=Cheltenham") */
  location: string;
  /** Payment token contract address */
  paymentTokenAddress: string;
}

/**
 * Service product type for PDP services.
 * Nested under products.PDP in the registry response.
 */
export interface ServiceProduct {
  type: 'PDP';
  isActive: boolean;
  capabilities: Record<string, string>;
  data: PDPOffering;
}

/**
 * Full provider info from the SP Registry.
 * This is the top-level response structure.
 */
export interface ProviderInfo {
  /** Provider ID (1, 2, 3...) */
  id: number;
  /** Provider's wallet address */
  serviceProvider: string;
  /** Address receiving payments */
  payee: string;
  /** Provider name (e.g., "ezpdpz-main") */
  name: string;
  /** Provider description/bio */
  description: string;
  /** Whether provider is active */
  active: boolean;
  /** Products offered by provider */
  products: {
    PDP?: ServiceProduct;
  };
}

/**
 * Parsed location from ISO format for display.
 */
export interface ParsedLocation {
  /** Country code (e.g., "GB") */
  country: string;
  /** State/region (e.g., "Gloucestershire") */
  state?: string;
  /** City/locality (e.g., "Cheltenham") */
  city?: string;
  /** Original raw string */
  raw: string;
}

/**
 * SP Registry enrichment for UI display.
 * Transformed from ProviderInfo for easier consumption.
 */
export interface SPRegistryEnrichment {
  /** Whether the payee is a registered SP */
  isRegistered: boolean;
  /** Provider name */
  name?: string;
  /** Provider description */
  description?: string;
  /** Whether provider is active */
  active?: boolean;
  /** Parsed location for display */
  location?: ParsedLocation;
  /** Service URL (PDP endpoint) */
  serviceURL?: string;
  /** Storage price formatted for display (e.g., "0.05 FIL/TiB/month") */
  storagePriceDisplay?: string;
  /** Raw storage price in attoFIL (string for JSON serialization) */
  storagePriceAttoFIL?: string | bigint;
  /** Piece size range formatted (e.g., "32 GiB - 32 TiB") */
  pieceSizeRange?: string;
  /** Minimum piece size in bytes (string for JSON serialization) */
  minPieceSizeBytes?: string | bigint;
  /** Maximum piece size in bytes (string for JSON serialization) */
  maxPieceSizeBytes?: string | bigint;
  /** Proving period formatted (e.g., "30 days") */
  provingPeriod?: string;
  /** Minimum proving period in epochs */
  minProvingPeriodEpochs?: number;
  /** Provider's main wallet (may differ from payee) */
  serviceProvider?: string;
}
