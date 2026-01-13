"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/payer-accounts", label: "Payer Accounts" },
  { href: "/payee-accounts", label: "Payee Accounts" },
  { href: "/cid-lookup", label: "CID Lookup" },
];

export function Header() {
  const pathname = usePathname();

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
          </nav>
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
            Connect Wallet
          </Button>
        </div>
      </div>
    </header>
  );
}
