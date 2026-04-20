"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESOLVIO_BASE = "https://api.resolvio.xyz";

function isValidAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

function looksLikeEns(input: string): boolean {
  return input.includes(".") && !input.startsWith("0x");
}

async function resolveEnsToAddress(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${RESOLVIO_BASE}/ens/v2/addresses/${encodeURIComponent(name)}?chains=eth`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const eth = (data.addresses ?? []).find(
      (a: { chain: string; exists: boolean; value?: string }) =>
        a.chain === "eth" && a.exists
    );
    return eth?.value ?? null;
  } catch {
    return null;
  }
}

export function AccountSearch() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"payer" | "payee">("payer");
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleFind = async () => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter a wallet address or ENS name");
      return;
    }

    let resolved = trimmed;

    if (looksLikeEns(trimmed)) {
      setResolving(true);
      setError("");
      try {
        const addr = await resolveEnsToAddress(trimmed);
        if (!addr) {
          setError(`Could not resolve "${trimmed}" to an address`);
          return;
        }
        resolved = addr;
      } finally {
        setResolving(false);
      }
    }

    if (!isValidAddress(resolved)) {
      setError("Invalid address — expected 0x followed by 40 hex characters");
      return;
    }

    setError("");
    const path = role === "payer" ? "/payer-accounts" : "/payee-accounts";
    router.push(`${path}?address=${encodeURIComponent(resolved)}`);
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-sm font-medium text-gray-500 mb-3" id="account-search-label">Find My Account</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleFind();
        }}
        className="flex items-center gap-3"
      >
        {/* Payer / Payee toggle */}
        <div className="flex rounded-md border overflow-hidden text-sm shrink-0" role="group" aria-label="Account type">
          <button
            type="button"
            onClick={() => setRole("payer")}
            aria-pressed={role === "payer"}
            className={`px-3 py-1.5 ${
              role === "payer"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Payer
          </button>
          <button
            type="button"
            onClick={() => setRole("payee")}
            aria-pressed={role === "payee"}
            className={`px-3 py-1.5 border-l ${
              role === "payee"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Payee
          </button>
        </div>

        {/* Address / ENS input */}
        <input
          type="text"
          placeholder="0x… address or name.eth"
          aria-labelledby="account-search-label"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (error) setError("");
          }}
          className="flex-1 px-3 py-1.5 text-sm border rounded-md font-mono"
        />

        {/* Find button */}
        <button
          type="submit"
          disabled={resolving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0 disabled:opacity-60"
        >
          {resolving ? "Resolving…" : "Find"}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-500 mt-2" role="alert">{error}</p>
      )}
    </div>
  );
}
