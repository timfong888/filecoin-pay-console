import { useState, useEffect } from "react";
import { resolveENS } from "@/lib/ens";

/**
 * Resolve a single address to its ENS/wallet-map name.
 * Returns the resolved name and whether resolution is in progress.
 */
export function useEnsName(address: string | null | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!address) return;

    setResolving(true);
    resolveENS(address)
      .then((name) => {
        if (name) setEnsName(name);
      })
      .catch((err) => console.error("Failed to resolve ENS:", err))
      .finally(() => setResolving(false));
  }, [address]);

  return { ensName, resolving };
}
