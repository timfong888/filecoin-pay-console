"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { resolveENS } from "@/lib/ens";

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const promise = address ? resolveENS(address) : Promise.resolve(null);

    promise
      .then((name) => { if (!cancelled) setEnsName(name); })
      .catch(() => { if (!cancelled) setEnsName(null); });

    return () => { cancelled = true; };
  }, [address]);

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === "injected");
    if (injected) connect({ connector: injected });
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
          onClick={() => setShowDropdown((v) => !v)}
        >
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2" />
          {ensName ?? formatAddress(address)}
        </Button>
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="px-4 py-2 text-xs text-gray-500 border-b">Connected</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(address);
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              Copy Address
            </button>
            <a
              href={`https://filfox.info/en/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setShowDropdown(false)}
            >
              View on Filfox
            </a>
            <a
              href="https://filpay.namespace.ninja/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm hover:bg-gray-50 border-t"
              onClick={() => setShowDropdown(false)}
            >
              Register FilPay Username
            </a>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 border-t"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
      onClick={handleConnect}
      disabled={isPending}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
