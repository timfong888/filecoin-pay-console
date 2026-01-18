/**
 * React hooks for SP Registry data fetching.
 *
 * Queries the SP Registry contract directly using ethers,
 * which is browser-compatible.
 */

'use client';

import { useState, useEffect } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';
import type { SPRegistryEnrichment } from './types';
import {
  SP_REGISTRY_ADDRESS,
  FILECOIN_RPC_URL,
  parseLocation,
  formatPieceSizeRange,
  formatStoragePrice,
  formatProvingPeriod,
} from './fetchers';

// Minimal ABI for SP Registry queries
// getProviderByAddress returns tuple(uint256 providerId, tuple(serviceProvider, payee, name, description, isActive))
// getProviderWithProduct returns (uint256 providerId, tuple providerInfo, tuple product, bytes[] productCapabilityValues)
const SP_REGISTRY_ABI = [
  'function getProviderByAddress(address) view returns (tuple(uint256, tuple(address, address, string, string, bool)))',
  'function getProviderWithProduct(uint256 providerId, uint8 productType) view returns (tuple(uint256, tuple(address, address, string, string, bool), tuple(uint8, string[], bool), bytes[]))',
];

// Product types for SP Registry
const PRODUCT_TYPE_PDP = 0; // PDP product type

/**
 * Decode capability value from bytes based on key name.
 * PDP capabilities include: serviceURL, minPieceSizeInBytes, maxPieceSizeInBytes,
 * directPay, renew, storagePricePerTibPerMonth, minProvingPeriodInEpochs, location, payeeAddress
 *
 * Note: Values are stored as raw bytes, NOT ABI-encoded.
 */
function decodeCapabilityValue(key: string, value: string): string | bigint | boolean {
  try {
    // Remove 0x prefix if present
    const hexString = value.startsWith('0x') ? value.slice(2) : value;

    switch (key) {
      case 'serviceURL':
      case 'location': {
        // Decode hex to UTF-8 string
        const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
        return new TextDecoder().decode(bytes);
      }
      case 'minPieceSizeInBytes':
      case 'maxPieceSizeInBytes':
      case 'storagePricePerTibPerMonth':
      case 'minProvingPeriodInEpochs': {
        // Decode hex to bigint (big-endian)
        return BigInt('0x' + hexString);
      }
      case 'directPay':
      case 'renew': {
        // Decode as boolean (0 = false, non-zero = true)
        return BigInt('0x' + hexString) !== BigInt(0);
      }
      case 'payeeAddress': {
        // Address is already in hex format, just ensure 0x prefix
        return '0x' + hexString.padStart(40, '0');
      }
      default: {
        // Try to decode as string first
        try {
          const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
          return new TextDecoder().decode(bytes);
        } catch {
          return value;
        }
      }
    }
  } catch (error) {
    console.error(`Failed to decode capability ${key}:`, error);
    return value;
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

    // Get provider info directly by address
    // Returns: tuple(providerId, tuple(serviceProvider, payee, name, description, isActive))
    let result;
    try {
      result = await contract.getProviderByAddress(address);
    } catch {
      return { isRegistered: false };
    }

    // Result is [providerId, [serviceProvider, payee, name, description, isActive]]
    const providerId = result[0];
    const info = result[1];

    if (providerId === BigInt(0)) {
      return { isRegistered: false };
    }

    const [serviceProvider, , name, description, active] = info;

    // Build enrichment
    const enrichment: SPRegistryEnrichment = {
      isRegistered: true,
      name,
      description,
      active,
      serviceProvider,
    };

    // Try to get PDP product info
    try {
      const productResult = await contract.getProviderWithProduct(providerId, PRODUCT_TYPE_PDP);
      // Result is [providerId, providerInfo, product, productCapabilityValues]
      const product = productResult[2]; // [productType, capabilityKeys[], isActive]
      const capabilityValues = productResult[3]; // bytes[]

      const capabilityKeys = product[1] as string[];
      const productIsActive = product[2] as boolean;

      // Decode capability values into a map
      const capabilities: Record<string, string | bigint | boolean> = {};
      for (let i = 0; i < capabilityKeys.length; i++) {
        const key = capabilityKeys[i];
        const value = capabilityValues[i];
        capabilities[key] = decodeCapabilityValue(key, value);
      }

      // Update enrichment with PDP-specific data
      enrichment.active = active && productIsActive;

      if (capabilities.location) {
        enrichment.location = parseLocation(capabilities.location as string);
      }
      if (capabilities.serviceURL) {
        enrichment.serviceURL = capabilities.serviceURL as string;
      }
      if (capabilities.storagePricePerTibPerMonth) {
        const pricePerMonth = capabilities.storagePricePerTibPerMonth as bigint;
        // Convert monthly to daily for formatting (divide by 30)
        const pricePerDay = pricePerMonth / BigInt(30);
        enrichment.storagePriceDisplay = formatStoragePrice(pricePerDay);
        enrichment.storagePriceAttoFIL = pricePerMonth.toString();
      }
      if (capabilities.minPieceSizeInBytes && capabilities.maxPieceSizeInBytes) {
        enrichment.pieceSizeRange = formatPieceSizeRange(
          capabilities.minPieceSizeInBytes as bigint,
          capabilities.maxPieceSizeInBytes as bigint
        );
        enrichment.minPieceSizeBytes = (capabilities.minPieceSizeInBytes as bigint).toString();
        enrichment.maxPieceSizeBytes = (capabilities.maxPieceSizeInBytes as bigint).toString();
      }
      if (capabilities.minProvingPeriodInEpochs) {
        const epochs = capabilities.minProvingPeriodInEpochs as bigint;
        enrichment.provingPeriod = formatProvingPeriod(epochs);
        enrichment.minProvingPeriodEpochs = Number(epochs);
      }
    } catch {
      // No PDP product or error fetching - continue with basic info
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
