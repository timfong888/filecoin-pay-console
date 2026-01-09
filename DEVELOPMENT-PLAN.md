# Filecoin Pay Console - Development Plan

## Project Overview

Build an improved Filecoin Pay Console dashboard deployed via PinMe (IPFS).

**Repo:** `timfong888/filecoin-pay-console`
**Framework:** Next.js with static export
**Data Source:** Goldsky Subgraph (`filecoin-pay-mainnet/1.0.0`)
**Deployment:** PinMe (https://github.com/glitternetwork/pinme)

---

## Phase 1: Dashboard MVP (Static Build) ✅ COMPLETE

### Goal
Get a working dashboard deployed to PinMe with the three metric cards and top payers table.

### What Was Built
- Next.js 16 with Tailwind CSS and shadcn/ui
- Static export configured for PinMe deployment
- Header with navigation (Dashboard, Payer Accounts, Payee Accounts, Connect Wallet)
- Three metric cards with sparkline charts:
  - Unique Payers
  - USDFC Settled (Total + Last 30D)
  - Wallet Terminations
- Top 10 Payers table with mock data
- Search and date filter UI (not connected)

### Deployed URL
https://7e589519.pinit.eth.limo/

---

## Phase 2: Connect Real Data

### Goal
Replace mock data with live data from Goldsky subgraph.

### GraphQL Queries Needed

```graphql
# Global metrics
query GlobalMetrics {
  paymentsMetrics(first: 1) {
    uniquePayers
    uniquePayees
    totalTerminatedRails
    totalActiveRails
  }
}

# Top payers (accounts with payerRails)
query TopPayers {
  accounts(first: 10, orderBy: totalRails, orderDirection: desc) {
    id
    address
    totalRails
    userTokens {
      funds
      lockupCurrent
    }
    payerRails {
      totalSettledAmount
      createdAt
      state
    }
  }
}

# Time series for sparklines (daily metrics)
query DailyMetrics {
  dailyMetrics(first: 30, orderBy: timestamp, orderDirection: desc) {
    timestamp
    date
    uniquePayers
    railsTerminated
    uniqueAccounts
  }
}

# Calculate total settled from all rails
query TotalSettled {
  rails(first: 1000) {
    totalSettledAmount
  }
}
```

### Data Transformations
- **Unique Payers**: `paymentsMetrics.uniquePayers`
- **USDFC Settled**: SUM of `rails.totalSettledAmount` (convert from wei)
- **Wallet Terminations**: `paymentsMetrics.totalTerminatedRails`
- **Sparkline data**: Map `dailyMetrics` array to chart format

---

## Phase 3: Additional Pages (Future)

1. **Payer Accounts List** - Browse/search payers
2. **Payee Accounts List** - Browse/search payees
3. **Payer Account Detail** - Individual payer view
4. **Payee Account Detail** - Individual payee view
5. **Connect Wallet** - Web3 wallet connection

---

## File Structure

```
filecoin-pay-console/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Dashboard (home)
│   ├── globals.css         # Tailwind + shadcn styles
│   ├── payer-accounts/     # (Phase 3)
│   └── payee-accounts/     # (Phase 3)
├── components/
│   ├── ui/                 # shadcn components
│   ├── layout/
│   │   └── Header.tsx
│   └── dashboard/
│       ├── MetricCard.tsx
│       ├── SparklineChart.tsx
│       └── TopPayersTable.tsx
├── lib/
│   ├── graphql/            # (Phase 2)
│   └── utils.ts
├── next.config.ts          # Static export config
└── package.json
```

---

## Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy to PinMe
pinme upload out

# Lint
npm run lint
```

---

## Notes

- USDFC amounts are stored in wei (18 decimals) - divide by 10^18 for display
- Addresses should show truncated format (0x1234...5678) or ENS name if available
- Runway calculation: Available funds / daily burn rate (requires rate data from rails)
- Chart warnings during build are expected - charts need DOM dimensions which aren't available during static generation
