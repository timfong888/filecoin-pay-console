/**
 * React hooks for SP Registry data fetching.
 *
 * Queries the SP Registry contract directly using ethers,
 * which is browser-compatible.
 */

'use client';

import { useState, useEffect } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';
import type { SPRegistryEnrichment, ParsedLocation } from './types';

// SP Registry contract address (Filecoin Mainnet)
const SP_REGISTRY_ADDRESS = '0xf55dDbf63F1b55c3F1D4FA7e339a68AB7b64A5eB';

// Filecoin RPC endpoint
const FILECOIN_RPC_URL = 'https://api.node.glif.io/rpc/v1';

// Minimal ABI for SP Registry queries
const SP_REGISTRY_ABI = [
  'function getProviderIdByAddress(address) view returns (uint256)',
  'function getProvider(uint256 providerId) view returns (tuple(address serviceProvider, address payee, string name, string description, bool active))',
  'function getPDPService(uint256 providerId) view returns (tuple(tuple(string serviceURL, uint256 minPieceSizeInBytes, uint256 maxPieceSizeInBytes, bool ipniPiece, bool ipniIpfs, uint256 storagePricePerTibPerDay, uint256 minProvingPeriodInEpochs, string location, address paymentTokenAddress) offering, bool isActive))',
];

// Bytes conversions
const BYTES_PER_GIB = 1024 ** 3;
const BYTES_PER_TIB = 1024 ** 4;

// Epoch to seconds (1 epoch = 30 seconds on Filecoin)
const SECONDS_PER_EPOCH = 30;
const SECONDS_PER_DAY = 24 * 60 * 60;

// attoFIL to FIL conversion
const ATTOFIL_DECIMALS = 18;

/**
 * Parse ISO 3166 location string to readable format.
 */
function parseLocation(raw: string): ParsedLocation {
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
 * Format bytes to human-readable size (GiB, TiB).
 */
function formatPieceSize(bytes: bigint): string {
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
function formatPieceSizeRange(min: bigint, max: bigint): string {
  return `${formatPieceSize(min)} - ${formatPieceSize(max)}`;
}

/**
 * Format storage price from attoFIL per TiB per day to FIL per TiB per month.
 */
function formatStoragePrice(attoFilPerTibPerDay: bigint): string {
  const filPerTibPerDay = Number(attoFilPerTibPerDay) / (10 ** ATTOFIL_DECIMALS);
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
function formatProvingPeriod(epochs: bigint | number): string {
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

// Singleton contract instance
let registryContract: Contract | null = null;

function getRegistryContract(): Contract {
  if (!registryContract) {
    const provider = new JsonRpcProvider(FILECOIN_RPC_URL);
    registryContract = new Contract(SP_REGISTRY_ADDRESS, SP_REGISTRY_ABI, provider);
  }
  return registryContract;
}

/**
 * Fetch SP Registry data for an address.
 */
async function fetchSPRegistryData(address: string): Promise<SPRegistryEnrichment> {
  try {
    const contract = getRegistryContract();
    const normalizedAddress = address.toLowerCase();

    // Get provider ID by address
    let providerId: bigint;
    try {
      providerId = await contract.getProviderIdByAddress(normalizedAddress);
    } catch {
      return { isRegistered: false };
    }

    if (providerId === BigInt(0)) {
      return { isRegistered: false };
    }

    // Get provider info
    const providerInfo = await contract.getProvider(providerId);
    const [serviceProvider, , name, description, active] = providerInfo;

    // Try to get PDP service info
    let pdpService = null;
    try {
      pdpService = await contract.getPDPService(providerId);
    } catch {
      // No PDP service
    }

    // Build enrichment
    const enrichment: SPRegistryEnrichment = {
      isRegistered: true,
      name,
      description,
      active,
      serviceProvider,
    };

    if (pdpService) {
      const [offering, isActive] = pdpService;
      const [
        serviceURL,
        minPieceSizeInBytes,
        maxPieceSizeInBytes,
        ,
        ,
        storagePricePerTibPerDay,
        minProvingPeriodInEpochs,
        location,
      ] = offering;

      enrichment.active = active && isActive;
      enrichment.location = parseLocation(location);
      enrichment.serviceURL = serviceURL;
      enrichment.storagePriceDisplay = formatStoragePrice(storagePricePerTibPerDay);
      enrichment.storagePriceAttoFIL = storagePricePerTibPerDay.toString();
      enrichment.pieceSizeRange = formatPieceSizeRange(minPieceSizeInBytes, maxPieceSizeInBytes);
      enrichment.minPieceSizeBytes = minPieceSizeInBytes.toString();
      enrichment.maxPieceSizeBytes = maxPieceSizeInBytes.toString();
      enrichment.provingPeriod = formatProvingPeriod(minProvingPeriodInEpochs);
      enrichment.minProvingPeriodEpochs = Number(minProvingPeriodInEpochs);
    }

    return enrichment;
  } catch (error) {
    console.error('SP Registry error for address', address, ':', error);
    return { isRegistered: false };
  }
}

interface UseSPRegistryResult {
  data: SPRegistryEnrichment | null;
  loading: boolean;
  error: Error | null;
}

/**
 * React hook to fetch SP Registry data for a payee address.
 *
 * @param payeeAddress - The payee address to look up
 * @returns { data, loading, error } - SP Registry enrichment data
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useSPRegistry(payeeAddress);
 *
 * if (loading) return <Skeleton />;
 * if (data?.isRegistered) {
 *   return <SPHero data={data} />;
 * }
 * return <UnregisteredSP />;
 * ```
 */
export function useSPRegistry(payeeAddress: string | null | undefined): UseSPRegistryResult {
  const [data, setData] = useState<SPRegistryEnrichment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!payeeAddress) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSPRegistryData(payeeAddress)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('useSPRegistry error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setData({ isRegistered: false });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payeeAddress]);

  return { data, loading, error };
}
