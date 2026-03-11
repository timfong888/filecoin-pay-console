# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Stack & Tools

- **Tech**: React 19, Next.js 16 (App Router), Tailwind CSS, @tanstack/react-query, wagmi, recharts
- **Package manager**: npm (use `--legacy-peer-deps` for installs)
- **Linting/Formatting**: ESLint
- **Deployment**: Static export to PinMe (IPFS)

## Commands

```bash
# Development
npm run dev                    # Default (prototype mode)
npm run dev:ga                 # GA mode
npm run dev:prototype          # Prototype mode

# After changes (ALWAYS run these)
npm run lint && npm run test:run

# Before committing
npm run build && npm run lint && npm run test:run

# Deployment (after build)
pinme upload out --domain <target-domain>
```

## Build Modes

The console has two modes controlled by `NEXT_PUBLIC_CONSOLE_MODE`:

| Mode | Branch | Build Command | Deploy Domain |
|------|--------|---------------|---------------|
| `ga` | main | `npm run build:ga` | filpay-ga.pinit.eth.limo |
| `prototype` | prototype | `npm run build:prototype` | filpay-prototype.pinit.eth.limo |

**Always test both modes before pushing changes that affect shared components.**

## Architecture

- **Data flow**: Smart contract → Goldsky Subgraph → Frontend (GraphQL via graphql-request)
- **Static export**: `next.config.ts` enables static export for IPFS deployment
- **Subgraph**: Schema and queries in `lib/graphql/`

## Key Files

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Dashboard with metrics display |
| `lib/graphql/client.ts` | GraphQL client for Goldsky |
| `lib/graphql/queries.ts` | GraphQL queries and types |
| `lib/config/mode.ts` | Build mode configuration |
| `METRIC-DEFINITIONS.md` | Metric calculation formulas |

## Docs

- [README.md](README.md) - Project setup and environment variables
- [CLAUDE.md](CLAUDE.md) - Claude Code specific guidance
- [METRIC-DEFINITIONS.md](METRIC-DEFINITIONS.md) - Dashboard metric definitions
- [PLAYWRIGHT-TEST-PLAN.md](PLAYWRIGHT-TEST-PLAN.md) - E2E test specifications
