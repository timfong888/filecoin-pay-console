import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create a public client for Ethereum mainnet (for ENS resolution)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'), // Free public RPC
});

// Cache for ENS names to avoid repeated lookups
const ensCache = new Map<string, string | null>();

/**
 * Resolve ENS name for an Ethereum address
 * Returns the ENS name if found, null otherwise
 */
export async function resolveENS(address: string): Promise<string | null> {
  // Check cache first
  if (ensCache.has(address.toLowerCase())) {
    return ensCache.get(address.toLowerCase()) || null;
  }

  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });

    // Cache the result (including null for addresses without ENS)
    ensCache.set(address.toLowerCase(), ensName);
    return ensName;
  } catch (error) {
    console.error(`Error resolving ENS for ${address}:`, error);
    // Cache null to avoid repeated failed lookups
    ensCache.set(address.toLowerCase(), null);
    return null;
  }
}

/**
 * Batch resolve ENS names for multiple addresses
 * More efficient than resolving one at a time
 */
export async function batchResolveENS(
  addresses: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Filter out addresses already in cache
  const uncachedAddresses = addresses.filter(addr => {
    const cached = ensCache.get(addr.toLowerCase());
    if (cached !== undefined) {
      results.set(addr.toLowerCase(), cached);
      return false;
    }
    return true;
  });

  // Resolve uncached addresses in parallel (with concurrency limit)
  const BATCH_SIZE = 5;
  for (let i = 0; i < uncachedAddresses.length; i += BATCH_SIZE) {
    const batch = uncachedAddresses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (address) => {
        const ensName = await resolveENS(address);
        return { address: address.toLowerCase(), ensName };
      })
    );

    for (const { address, ensName } of batchResults) {
      results.set(address, ensName);
    }
  }

  return results;
}
