/**
 * SP Registry utility functions.
 *
 * NOTE: This file contains formatting utilities only.
 * The actual contract queries are in the API route: /api/sp-registry/[address]
 * This avoids bundling node-specific dependencies in client code.
 *
 * Contract: 0xf55dDbf63F1b55c3F1D4FA7e339a68AB7b64A5eB (Filecoin Mainnet)
 */

import type { ParsedLocation } from './types';

// SP Registry contract address (Filecoin Mainnet)
export const SP_REGISTRY_ADDRESS = '0xf55dDbf63F1b55c3F1D4FA7e339a68AB7b64A5eB';

// Filecoin RPC endpoint
export const FILECOIN_RPC_URL = 'https://api.node.glif.io/rpc/v1';

// Bytes conversions
export const BYTES_PER_GIB = 1024 ** 3;
export const BYTES_PER_TIB = 1024 ** 4;

// Epoch to seconds (1 epoch = 30 seconds on Filecoin)
export const SECONDS_PER_EPOCH = 30;
export const SECONDS_PER_DAY = 24 * 60 * 60;

// attoFIL to FIL conversion
export const ATTOFIL_DECIMALS = 18;

/**
 * Parse ISO 3166 location string to readable format.
 * Input: "C=GB;ST=Gloucestershire;L=Cheltenham"
 * Output: { country: "GB", state: "Gloucestershire", city: "Cheltenham" }
 */
export function parseLocation(raw: string): ParsedLocation {
  const parsed: ParsedLocation = { country: '', raw };

  if (!raw) return parsed;

  const parts = raw.split(';');
  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    switch (key) {
      case 'C':
        parsed.country = value;
        break;
      case 'ST':
        parsed.state = value;
        break;
      case 'L':
        parsed.city = value;
        break;
    }
  }

  return parsed;
}

/**
 * Format location for display.
 * Returns "City, Country" or best available format.
 */
export function formatLocation(location: ParsedLocation): string {
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  } else if (location.city) {
    return location.city;
  } else if (location.state && location.country) {
    return `${location.state}, ${location.country}`;
  } else if (location.country) {
    return location.country;
  }
  return location.raw || 'Unknown';
}

/**
 * Format bytes to human-readable size (GiB, TiB).
 */
export function formatPieceSize(bytes: bigint): string {
  const numBytes = Number(bytes);
  if (numBytes >= BYTES_PER_TIB) {
    return `${(numBytes / BYTES_PER_TIB).toFixed(0)} TiB`;
  } else if (numBytes >= BYTES_PER_GIB) {
    return `${(numBytes / BYTES_PER_GIB).toFixed(0)} GiB`;
  } else {
    return `${(numBytes / (1024 * 1024)).toFixed(0)} MiB`;
  }
}

/**
 * Format piece size range.
 */
export function formatPieceSizeRange(min: bigint, max: bigint): string {
  return `${formatPieceSize(min)} - ${formatPieceSize(max)}`;
}

/**
 * Format storage price from attoFIL per TiB per day to FIL per TiB per month.
 */
export function formatStoragePrice(attoFilPerTibPerDay: bigint): string {
  // Convert attoFIL to FIL
  const filPerTibPerDay = Number(attoFilPerTibPerDay) / (10 ** ATTOFIL_DECIMALS);
  // Convert to monthly (30 days)
  const filPerTibPerMonth = filPerTibPerDay * 30;

  if (filPerTibPerMonth >= 1) {
    return `${filPerTibPerMonth.toFixed(2)} FIL/TiB/month`;
  } else if (filPerTibPerMonth >= 0.01) {
    return `${filPerTibPerMonth.toFixed(4)} FIL/TiB/month`;
  } else {
    return `${(filPerTibPerMonth * 1000).toFixed(4)} mFIL/TiB/month`;
  }
}

/**
 * Format proving period from epochs to human-readable duration.
 */
export function formatProvingPeriod(epochs: bigint | number): string {
  const numEpochs = typeof epochs === 'bigint' ? Number(epochs) : epochs;
  const seconds = numEpochs * SECONDS_PER_EPOCH;
  const days = Math.round(seconds / SECONDS_PER_DAY);

  if (days >= 1) {
    return `${days} day${days === 1 ? '' : 's'}`;
  } else {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
}
