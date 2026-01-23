"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/config/mode";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState } from "react";

// Build navigation items based on mode
const getNavItems = () => {
  const items = [{ href: "/", label: "Dashboard" }];

  if (features.showPayerAccountsNav) {
    items.push({ href: "/payer-accounts", label: "Payer Accounts" });
  }
  if (features.showPayeeAccountsNav) {
    items.push({ href: "/payee-accounts", label: "Payee Accounts" });
  }

  return items;
};

const navItems = getNavItems();

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleConnect = () => {
    // Use the injected connector (MetaMask, etc.)
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <header className="border-b bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <nav className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://filecoin.fillout.com/builders"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-3 py-1.5 text-sm font-medium rounded-md bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-colors"
            >
              Feature Request
            </a>
          </nav>

          {isConnected && address ? (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2" />
                {formatAddress(address)}
              </Button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b">
                    Connected
                  </div>
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
                  >
                    View on Filfox
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
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
              onClick={handleConnect}
              disabled={isPending}
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
