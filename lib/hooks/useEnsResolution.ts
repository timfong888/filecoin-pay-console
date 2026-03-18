import { useState, useEffect } from "react";
import { resolveENS } from "@/lib/ens";
import { getKnownWalletName } from "@/lib/wallet-registry";

/**
 * Resolve a single address to its ENS/wallet-map name.
 * Wallet-map names resolve synchronously (no flash).
 * Only unknown addresses trigger async ENS resolution.
 */
export function useEnsName(address: string | null | undefined) {
  // Check wallet registry synchronously — instant for known addresses
  const knownName = address ? getKnownWalletName(address) : undefined;

  const [ensName, setEnsName] = useState<string | null>(knownName ?? null);
  const [resolving, setResolving] = useState(!knownName && !!address);

  useEffect(() => {
    // Skip async resolution if already resolved from wallet registry
    if (!address || knownName) return;

    setResolving(true);
    resolveENS(address)
      .then((name) => {
        if (name) setEnsName(name);
      })
      .catch((err) => console.error("Failed to resolve ENS:", err))
      .finally(() => setResolving(false));
  }, [address, knownName]);

  return { ensName: ensName ?? knownName ?? null, resolving };
}
