"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function isValidAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

export function AccountSearch() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"payer" | "payee">("payer");
  const [error, setError] = useState("");

  const handleFind = () => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter a wallet address");
      return;
    }
    if (!isValidAddress(trimmed)) {
      setError("Invalid address — expected 0x followed by 40 hex characters");
      return;
    }
    setError("");
    const path = role === "payer" ? "/payer-accounts" : "/payee-accounts";
    router.push(`${path}?address=${trimmed}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFind();
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-sm font-medium text-gray-500 mb-3">Find My Account</h2>
      <div className="flex items-center gap-3">
        {/* Payer / Payee toggle */}
        <div className="flex rounded-md border overflow-hidden text-sm shrink-0">
          <button
            onClick={() => setRole("payer")}
            className={`px-3 py-1.5 ${
              role === "payer"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Payer
          </button>
          <button
            onClick={() => setRole("payee")}
            className={`px-3 py-1.5 border-l ${
              role === "payee"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Payee
          </button>
        </div>

        {/* Address input */}
        <input
          type="text"
          placeholder="0x... wallet address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-1.5 text-sm border rounded-md font-mono"
        />

        {/* Find button */}
        <button
          onClick={handleFind}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0"
        >
          Find
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
