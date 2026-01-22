# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Filecoin Pay Console - A dashboard for tracking payments, settlements, and metrics on Filecoin Pay. Deployed as a static site via PinMe (IPFS).

## Build Modes (GA vs Prototype)

The console supports two deployment modes controlled by `NEXT_PUBLIC_CONSOLE_MODE`:

| Mode | Branch | Features | Subdomain |
|------|--------|----------|-----------|
| `ga` | main | 3 metrics, Dashboard only | filpay-ga.pinit.eth.limo |
| `prototype` | prototype | Full features | filpay-prototype.pinit.eth.limo |

### GA Mode (Simplified Production)
- **Navigation:** Dashboard only (no Payer/Payee Accounts links)
- **Hidden:** Top 10 tables, time series charts

### Prototype Mode (Full Features)
- **Navigation:** Dashboard, Payer Accounts, Payee Accounts
- **Visible:** Top 10 Payers table, cumulative charts

**Hero Metrics:** See `METRIC-DEFINITIONS.md` for current metrics in each mode.

### Build Commands

```bash
# Development
npm run dev              # Default (prototype mode)
npm run dev:ga           # GA mode
npm run dev:prototype    # Prototype mode

# Production build
npm run build            # Default (prototype mode)
npm run build:ga         # GA mode build
npm run build:prototype  # Prototype mode build
```

### Deployment

```bash
# GA Deployment (from main branch)
git checkout main
npm run build:ga
pinme upload out
# Tag: git tag v0.26.0-ga && git push origin v0.26.0-ga

# Prototype Deployment (from prototype branch)
git checkout prototype
npm run build:prototype
pinme upload out
# Tag: git tag v0.26.0-prototype && git push origin v0.26.0-prototype
```

### Configuration Files

| File | Purpose |
|------|---------|
| `lib/config/mode.ts` | Mode configuration and feature flags |
| `.env.ga` | GA mode environment template |
| `.env.prototype` | Prototype mode environment template |

## Branching Strategy

The repository uses a two-branch workflow to maintain GA (production) and prototype (experimental) versions:

```
main (GA)          prototype
    │                  │
    │  ←── rebase ───  │   Keep prototype up-to-date with main
    │                  │
    ▼                  ▼
 GA deploy      Prototype deploy
```

### Branch Purposes

| Branch | Purpose | Deploy Target |
|--------|---------|---------------|
| `main` | Production-ready GA features | filpay-ga.pinit.eth.limo |
| `prototype` | Experimental/full features | filpay-prototype.pinit.eth.limo |

### PR Workflow

1. **New features for GA:** Create feature branch from `main`, PR to `main`
2. **Prototype-only features:** Create feature branch from `prototype`, PR to `prototype`
3. **After merging to main:** Rebase `prototype` from `main` to keep in sync

```bash
# Keep prototype in sync with main
git checkout prototype
git fetch origin
git rebase origin/main
git push origin prototype --force-with-lease
```

### Best Practices

- Always develop against `main` first for features intended for GA
- Use `--legacy-peer-deps` when installing packages (Next.js 16 peer dep compatibility)
- Test both `build:ga` and `build:prototype` before pushing
- Tag releases: `v0.X.0-ga` for main, `v0.X.0-prototype` for prototype

## Deployed Site

**Live URL (use this for all testing):** https://f59ac2fb.pinit.eth.limo/

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
- **Data Source:** Goldsky Subgraph (`filecoin-pay-mainnet/1.1.0`)
- **Deployment:** Static export to PinMe/IPFS

## Key Files

| Path | Purpose |
|------|---------|
| `METRIC-DEFINITIONS.md` | Metric definitions for dashboard development |
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
https://api.goldsky.com/api/public/project_cmj7soo5uf4no01xw0tij21a1/subgraphs/filecoin-pay-mainnet/1.1.0/gn
```

Key entities: `paymentsMetrics`, `accounts`, `rails`, `dailyMetrics`, `settlements`

## UX Validation

The dashboard matches the wireframe spec (00-dashboard.excalidraw):
- Header: Dashboard, Payer Accounts, Payee Accounts, Connect Wallet
- Three metric cards: Unique Payers, USDFC Settled, Wallet Terminations
- Top 10 Payers table: Address, Locked, Settled, Runway, Start
- Data source indicator at bottom of page
