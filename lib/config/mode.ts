// Build-time mode configuration
// Set via NEXT_PUBLIC_CONSOLE_MODE environment variable
// Values: 'ga' | 'prototype'

export type ConsoleMode = 'ga' | 'prototype';

export const CONSOLE_MODE: ConsoleMode =
  (process.env.NEXT_PUBLIC_CONSOLE_MODE as ConsoleMode) || 'prototype';

export const isGAMode = CONSOLE_MODE === 'ga';
export const isPrototypeMode = CONSOLE_MODE === 'prototype';

// Feature flags derived from mode
export const features = {
  // Navigation
  showPayerAccountsNav: isPrototypeMode,
  showPayeeAccountsNav: isPrototypeMode,

  // Dashboard content
  showTop10Tables: isPrototypeMode,
  showCharts: isPrototypeMode,

  // Auction stats (placeholder charts) - show in both GA and prototype
  showAuctionStats: true,

  // Metrics
  showChurnedWallets: true,            // Always show "Churned Wallets"
} as const;
