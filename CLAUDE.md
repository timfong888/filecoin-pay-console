# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Filecoin Pay Console - A dashboard for tracking payments, settlements, and metrics on Filecoin Pay. Deployed as a static site via PinMe (IPFS).

## Deployed Site

**Live URL (use this for all testing):** https://a28dda3f.pinit.eth.limo/

## Commands

```bash
# Development
npm run dev

# Build for production (static export)
npm run build

# Deploy to PinMe
pinme upload out

# Lint
npm run lint

# Run Playwright tests
npx playwright test
```

## Architecture

- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts (sparklines)
- **Data Source:** Goldsky Subgraph (`filecoin-pay-mainnet/1.0.0`)
- **Deployment:** Static export to PinMe/IPFS

## Key Files

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Dashboard with metrics and top payers table |
| `app/layout.tsx` | Root layout with Header navigation |
| `components/dashboard/MetricCard.tsx` | Metric card with sparkline support |
| `components/dashboard/TopPayersTable.tsx` | Top payers data table |
| `components/layout/Header.tsx` | Navigation header |
| `lib/graphql/client.ts` | GraphQL client for Goldsky |
| `lib/graphql/queries.ts` | GraphQL queries and types |
| `lib/graphql/fetchers.ts` | Data fetching and transformation |
| `next.config.ts` | Static export configuration |

## Data Source

**Contract:** `0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa` (Filecoin Mainnet)

Goldsky Subgraph endpoint:
```
https://api.goldsky.com/api/public/project_cmb9tuo8r1xdw01ykb8uidk7h/subgraphs/filecoin-pay-mainnet/1.0.0/gn
```

Key entities: `paymentsMetrics`, `accounts`, `rails`, `dailyMetrics`, `settlements`

## UX Validation

The dashboard matches the wireframe spec (00-dashboard.excalidraw):
- Header: Dashboard, Payer Accounts, Payee Accounts, Connect Wallet
- Three metric cards: Unique Payers, USDFC Settled, Wallet Terminations
- Top 10 Payers table: Address, Locked, Settled, Runway, Start
- Data source indicator at bottom of page
