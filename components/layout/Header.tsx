"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@filecoin-foundation/ui-filecoin/Button";
import { features } from "@/lib/config/mode";

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

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-(--color-border-base) bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <nav className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`
                  font-semibold text-sm transition-colors rounded-sm px-2.5 py-1.5
                  hover:bg-brand-100 focus:brand-outline
                  ${pathname === item.href
                    ? "text-brand-800 bg-brand-50"
                    : "text-zinc-600 hover:text-brand-700"
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://filecoin.fillout.com/builders"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-3 py-1.5 text-sm font-medium rounded-md bg-brand-100 text-brand-800 border border-brand-300 hover:bg-brand-200 transition-colors"
            >
              Feature Request
            </a>
          </nav>
          <Button variant="ghost" className="text-brand-700">
            Connect Wallet
          </Button>
        </div>
      </div>
    </header>
  );
}
