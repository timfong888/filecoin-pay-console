# Filecoin Pay Console

A dashboard for tracking payments, settlements, and metrics across the Filecoin Pay smart contract system.

## Getting Started

```bash
npm run dev     # Development server at http://localhost:3000
npm run build   # Production build (static export to /out)
```

## Data Source: Goldsky Subgraph

**Endpoint:**
```
https://api.goldsky.com/api/public/project_cmj7soo5uf4no01xw0tij21a1/subgraphs/filecoin-pay-mainnet/1.1.0/gn
```

**Network:** Filecoin Mainnet
**Contract:** `0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa` ([View on Filfox](https://filfox.info/en/address/0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa))
**Subgraph Version:** 1.1.0

---

## Schema

### Core Entities

| Entity | Description |
|--------|-------------|
| `Account` | Wallet/contract with funds, lockup, and rails |
| `Rail` | Payment channel between payer and payee |
| `UserToken` | Token balances per account (funds, lockup, payout) |
| `PaymentsMetric` | Global aggregate metrics |
| `DailyMetric` | Time-series metrics by day |

### Entity Fields

**Account**
```graphql
type Account {
  id: ID!                    # Lowercase address
  address: String!           # Wallet address
  totalRails: String!        # Number of rails
  userTokens: [UserToken!]!  # Token balances
  payerRails: [Rail!]!       # Rails where this account pays
  payeeRails: [Rail!]!       # Rails where this account receives
}
```

**Rail**
```graphql
type Rail {
  id: ID!
  totalSettledAmount: String!     # Gross settlement (wei, 18 decimals)
  totalNetPayeeAmount: String!    # Net to payee after fees (wei)
  totalCommission: String!        # Operator commission (wei)
  paymentRate: String             # Wei per epoch (30 seconds)
  state: RailState!               # ACTIVE, TERMINATED, FINALIZED, ZERORATE
  createdAt: String!              # Unix timestamp
  payer: Account!
  payee: Account!
}
```

### Settlement Data on Rails

The **Rail** entity is the authoritative source for settlement amounts. Use these fields for accurate payment tracking:

| Field | Description | Use Case |
|-------|-------------|----------|
| `totalSettledAmount` | Gross amount settled (payer pays this) | Total value transferred |
| `totalNetPayeeAmount` | Net amount to payee after fees | **Payee balance calculations** |
| `totalCommission` | Operator commission taken | Fee tracking |

**Important:** `UserToken.funds` is only populated for accounts that have deposited. Payees who receive payments without depositing will have null/zero `UserToken` balances. Always use `rail.totalNetPayeeAmount` summed across `payeeRails` for accurate payee totals.

**Example: Calculate Payee Total Received**
```typescript
const totalReceived = account.payeeRails.reduce(
  (sum, rail) => sum + BigInt(rail.totalNetPayeeAmount || '0'),
  BigInt(0)
);
```

**UserToken**
```graphql
type UserToken {
  id: ID!
  funds: String!           # Available balance (wei)
  lockupCurrent: String!   # Locked amount (wei)
  lockupRate: String       # Rate of lockup increase (wei/epoch)
  payout: String!          # Claimable payout (wei)
  fundsCollected: String   # Total collected
  token: Token
}
```

**PaymentsMetric**

Global cumulative statistics across all time. Updated incrementally as events occur.

```graphql
type PaymentsMetric {
  id: ID!

  # Count of all rails ever created
  # Formula: Incremented by 1 for each RailCreated event
  # Code: networkMetric.totalRails = networkMetric.totalRails.plus(ONE_BIG_INT)
  totalRails: String!

  # Count of unique wallet addresses (both payers and payees)
  # Formula: Incremented when a new account is first seen in a rail or deposit
  # Code: networkMetric.totalAccounts = networkMetric.totalAccounts.plus(newAccounts)
  totalAccounts: String!

  # Count of wallets that have created at least one rail as payer
  # Formula: Incremented when an account creates their first rail as payer
  # Code: if (isNewPayer) networkMetric.uniquePayers = networkMetric.uniquePayers.plus(ONE_BIG_INT)
  uniquePayers: String!

  # Count of wallets that have received at least one rail as payee
  # Formula: Incremented when an account receives their first rail as payee
  # Code: if (isNewPayee) networkMetric.uniquePayees = networkMetric.uniquePayees.plus(ONE_BIG_INT)
  uniquePayees: String!

  # Count of rails currently in ACTIVE state
  # Formula: +1 when rail transitions ZERORATE→ACTIVE, -1 when rail transitions ACTIVE→TERMINATED
  # Code: networkMetric.totalActiveRails = networkMetric.totalActiveRails.plus/minus(ONE_BIG_INT)
  totalActiveRails: String!

  # Count of rails currently in TERMINATED state
  # Formula: +1 when rail is terminated, -1 when rail is finalized
  # Code: networkMetric.totalTerminatedRails = networkMetric.totalTerminatedRails.plus/minus(ONE_BIG_INT)
  totalTerminatedRails: String!

  # Cumulative network fees burned (wei, 18 decimals)
  # Formula: Sum of networkFee from all RailSettled events
  # Code: networkMetric.totalFilBurned = networkMetric.totalFilBurned.plus(filBurned)
  totalFilBurned: String!
}
```

**DailyMetric**

Per-day aggregated metrics. Each day (UTC) has one DailyMetric entity.

```graphql
type DailyMetric {
  id: ID!

  # Unix timestamp of day start (00:00:00 UTC)
  timestamp: String!

  # Date in YYYY-MM-DD format
  date: String!

  # Count of rails created on this day
  # Formula: Incremented by 1 for each RailCreated event on this day
  # Code: dailyMetric.railsCreated = dailyMetric.railsCreated.plus(ONE_BIG_INT)
  railsCreated: String!

  # Count of rails terminated on this day
  # Formula: Incremented by 1 for each RailTerminated event on this day
  # Code: dailyMetric.railsTerminated = dailyMetric.railsTerminated.plus(ONE_BIG_INT)
  railsTerminated: String!

  # Running count of active rails at end of day
  # Formula: Incremented when rail transitions to ACTIVE state on this day
  # Code: dailyMetric.activeRailsCount = dailyMetric.activeRailsCount.plus(ONE_BIG_INT)
  activeRailsCount: String!

  # Count of settlements processed on this day
  # Formula: Incremented by 1 for each RailSettled event on this day
  # Code: dailyMetric.totalRailSettlements = dailyMetric.totalRailSettlements.plus(ONE_BIG_INT)
  totalRailSettlements: String!

  # Network fees burned on this day (wei)
  # Formula: Sum of networkFee from RailSettled events on this day
  # Code: dailyMetric.filBurned = dailyMetric.filBurned.plus(filBurned)
  filBurned: String!

  # First-time accounts created on this day
  # Formula: Count of accounts that didn't exist before this day
  # Code: dailyMetric.newAccounts = dailyMetric.newAccounts.plus(newAccounts)
  newAccounts: String!
}
```

**Note:** For unique payers/payees per time period, use `WeeklyMetric` which tracks:
- `uniqueActivePayers`: Distinct wallets that created rails that week
- `uniqueActivePayees`: Distinct wallets that received rails that week
- `newPayers`: First-time-ever payers that week
- `newPayees`: First-time-ever payees that week

---

## GraphQL Queries by Page

### `/` — Home Dashboard

Displays hero metrics, cumulative charts, and top 10 payers.

**Queries Used:**

1. **Global Metrics** — Hero cards (Unique Payers, Terminations)
```graphql
query GlobalMetrics {
  paymentsMetrics(first: 1) {
    id
    totalRails
    totalAccounts
    uniquePayers
    uniquePayees
    totalActiveRails
    totalTerminatedRails
    totalFilBurned
  }
}
```

2. **Total Settled** — USDFC Settled hero card & cumulative chart
```graphql
query TotalSettled {
  rails(first: 1000, where: { totalSettledAmount_gt: "0" }) {
    id
    totalSettledAmount
    createdAt
  }
}
```

3. **Active Rails** — Monthly Run Rate calculation
```graphql
query ActiveRails {
  rails(first: 1000, where: { state: ACTIVE }) {
    id
    paymentRate
    state
  }
}
```
*Run Rate = Σ(paymentRate) × 2,592,000 sec/month*

4. **Top Payers** — Top 10 Payers table
```graphql
query TopPayers($first: Int!) {
  accounts(first: $first, orderBy: totalRails, orderDirection: desc) {
    id
    address
    totalRails
    userTokens {
      id
      funds
      lockupCurrent
      lockupRate
      payout
    }
    payerRails(first: 10, orderBy: createdAt, orderDirection: desc) {
      id
      totalSettledAmount
      createdAt
      state
      payee { address }
    }
  }
}
```

5. **Payer First Activity** — Cumulative payers chart
```graphql
query PayerFirstActivity {
  accounts(first: 1000, where: { payerRails_: { id_not: null } }) {
    id
    payerRails(first: 1, orderBy: createdAt, orderDirection: asc) {
      createdAt
    }
  }
}
```

---

### `/payer-accounts` — Payer Accounts

#### List View
Displays all payer wallets with metrics, filters, and cumulative charts.

**Queries Used:**
- `GlobalMetrics` — Payer Wallets count, WoW change
- `TotalSettled` — Total Settled hero card
- `ActiveRails` — Monthly Run Rate
- `TopPayers` — Payer list with funds, lockup, settled
- `PayerFirstActivity` — Cumulative payers chart

#### Detail View (`/payer-accounts?address=0x...`)
Shows individual payer account with payment rails.

**Query Used:**
```graphql
query AccountDetail($id: ID!) {
  account(id: $id) {
    id
    address
    totalRails
    userTokens {
      id
      funds
      lockupCurrent
      lockupRate
      payout
      fundsCollected
      token { id }
    }
    payerRails {
      id
      totalSettledAmount
      paymentRate
      state
      createdAt
      payee { address }
    }
    payeeRails {
      id
      totalSettledAmount
      state
      createdAt
      payer { address }
    }
  }
}
```
*Note: `$id` is the lowercase address*

---

### `/payee-accounts` — Payee Accounts

#### List View
Displays all payee wallets (storage providers) with total received.

**Query Used:**
```graphql
query TopPayees($first: Int!) {
  accounts(first: $first, orderBy: totalRails, orderDirection: desc) {
    id
    address
    totalRails
    userTokens {
      id
      funds
      lockupCurrent
      payout
    }
    payeeRails(first: 10, orderBy: createdAt, orderDirection: desc) {
      id
      totalSettledAmount
      createdAt
      state
      payer { address }
    }
  }
}
```

#### Detail View (`/payee-accounts?address=0x...`)
Shows individual payee account with incoming rails.

**Query Used:** Same `AccountDetail` query as payer detail view.

---

## Constants

```typescript
// Filecoin epoch timing
const EPOCH_DURATION_SECONDS = 30;
const EPOCHS_PER_DAY = 2880;  // 24 * 60 * 60 / 30

// Run rate calculation
const SECONDS_PER_MONTH = 2_592_000;  // 30 days

// Token decimals (USDFC)
const DECIMALS = 18;
```

## Rail States

| Code | State | Description |
|------|-------|-------------|
| 0 | ACTIVE | Rail is actively streaming payments |
| 1 | TERMINATED | Rail has been terminated |
| 2 | FINALIZED | Rail is finalized |
| 3 | ZERORATE | Rail has zero payment rate |

---

## Development

### Project Structure

```
app/
├── page.tsx              # Home dashboard
├── payer-accounts/
│   └── page.tsx          # Payer list & detail
├── payee-accounts/
│   └── page.tsx          # Payee list & detail
└── layout.tsx            # App layout with nav

lib/graphql/
├── client.ts             # GraphQL client & constants
├── queries.ts            # GraphQL query definitions
└── fetchers.ts           # Data fetching functions

components/
├── dashboard/
│   └── TopPayersTable.tsx
└── ui/                   # shadcn/ui components
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/graphql/client.ts` | Goldsky endpoint, contract address, constants |
| `lib/graphql/queries.ts` | All GraphQL queries and TypeScript types |
| `lib/graphql/fetchers.ts` | Data transformation and API calls |

---

## Deployment

This project uses static export (`output: 'export'` in next.config.ts) for IPFS/PinMe deployment.

```bash
npm run build   # Outputs to /out directory
```

The dashboard version is tracked in `lib/graphql/client.ts`:
```typescript
export const DASHBOARD_VERSION = '0.9.0';
```
