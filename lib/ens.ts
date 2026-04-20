import { getKnownWalletName } from './wallet-registry';

const RESOLVIO_BASE = 'https://api.resolvio.xyz';
const RESOLVIO_BATCH_SIZE = 20;

// Cache for ENS names to avoid repeated lookups within the session
const ensCache = new Map<string, string | null>();

/**
 * Resolve ENS name for an Ethereum address via Resolvio.
 * Checks wallet registry first, then cache, then Resolvio reverse lookup.
 */
export async function resolveENS(address: string): Promise<string | null> {
  const knownName = getKnownWalletName(address);
  if (knownName) return knownName;

  const key = address.toLowerCase();
  if (ensCache.has(key)) return ensCache.get(key) ?? null;

  try {
    const res = await fetch(`${RESOLVIO_BASE}/ens/v2/reverse/${address}`);
    if (!res.ok) {
      ensCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const name = data.hasReverseRecord ? (data.name ?? null) : null;
    ensCache.set(key, name);
    return name;
  } catch {
    ensCache.set(key, null);
    return null;
  }
}

/**
 * Batch resolve ENS names for multiple addresses using Resolvio bulk reverse lookup.
 * Max 20 addresses per request; larger sets are chunked automatically.
 */
export async function batchResolveENS(
  addresses: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  const uncached = addresses.filter(addr => {
    const key = addr.toLowerCase();
    const cached = ensCache.get(key);
    if (cached !== undefined) {
      results.set(key, cached);
      return false;
    }
    return true;
  });

  for (let i = 0; i < uncached.length; i += RESOLVIO_BATCH_SIZE) {
    const chunk = uncached.slice(i, i + RESOLVIO_BATCH_SIZE);
    try {
      const params = chunk.join(',');
      const res = await fetch(
        `${RESOLVIO_BASE}/ens/v2/reverse/bulk?addresses=${encodeURIComponent(params)}`
      );
      if (!res.ok) {
        chunk.forEach(addr => {
          ensCache.set(addr.toLowerCase(), null);
          results.set(addr.toLowerCase(), null);
        });
        continue;
      }
      const data = await res.json();
      for (const entry of data.addresses ?? []) {
        const name = entry.hasReverseRecord ? (entry.name ?? null) : null;
        const key = entry.address.toLowerCase();
        ensCache.set(key, name);
        results.set(key, name);
      }
    } catch {
      chunk.forEach(addr => {
        ensCache.set(addr.toLowerCase(), null);
        results.set(addr.toLowerCase(), null);
      });
    }
  }

  return results;
}
