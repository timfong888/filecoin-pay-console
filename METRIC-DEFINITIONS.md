# Metric Definitions

This document defines the metrics displayed in the Filecoin Pay Console dashboard.

## Hero Metrics

The dashboard displays different metrics depending on build mode.

### Metric Relationships

**Locked USDFC** and **Fixed Lockup Pending** are related but queried differently:

```
Locked USDFC (contract-level)
├── Streaming: Σ(paymentRate × lockupPeriod) for ACTIVE rails
└── Fixed: Σ(lockupFixed) for ZERORATE rails ← conceptually = Fixed Lockup Pending
```

| Metric | Data Source | Updated When |
|--------|-------------|--------------|
| Locked USDFC | Contract event (`AccountLockupSettled`) | On settlement, lockup modification |
| Fixed Lockup Pending | Rail entity query | Real-time from indexed rails |

**Why they may not match exactly:**
- Locked USDFC reflects contract state at last settlement event
- Fixed Lockup Pending queries current rail data directly
- Terminated rails may have unreleased lockup still in account-level total
- Timing: account-level updates lag behind rail-level changes until next settlement

**Expected relationship:** Fixed Lockup Pending ≤ Locked USDFC (it's the one-time portion of total lockup)

---

### GA Mode Metrics

#### Active Wallets
- **Definition:** Count of payer wallets with at least one active rail AND positive lockup
- **Source:** `Account` entities from Goldsky subgraph
- **Formula:** Count where `account.payerRails.some(rail.state == "Active") AND account.userTokens.some(lockupCurrent > 0)`
- **Criteria:**
  - At least 1 rail with `state = "Active"`
  - `lockupCurrent > 0` (funds locked for future payments)

#### Locked USDFC
- **Definition:** Total USDFC currently locked across all accounts for future payments
- **Source:** `Account.userTokens.lockupCurrent` from Goldsky subgraph (emitted by Payments contract `AccountLockupSettled` event)
- **Formula:** `Σ(account.userTokens.lockupCurrent)` converted from wei (18 decimals)
- **Contract Formula:** `lockupCurrent = Σ(rail.lockupFixed + rail.paymentRate × rail.lockupPeriod)` per account
- **Note:** This is the canonical on-chain value. Fixed Lockup Pending queries rail-level `lockupFixed` directly, which may have minor timing differences.

#### USDFC Settled (Cumulative)
- **Definition:** Cumulative sum of all USDFC settled across all payment rails since inception
- **Source:** Sum of `Rail.totalSettledAmount` across all rails with settlements
- **Formula:** `Σ(rail.totalSettledAmount)` converted from wei (18 decimals) to USDFC

#### ARR (Annualized Run Rate)
- **Definition:** Annualized projection based on 4-week rolling average of settled USDFC
- **Source:** `WeeklyTokenMetric.settledAmount` from Goldsky subgraph (last 4 complete weeks)
- **Formula:** `(Week1 + Week2 + Week3 + Week4) / 4 * 52`
- **Calculation Details:**
  - Fetches last 5 weeks of `WeeklyTokenMetric` for USDFC
  - Skips the most recent (potentially incomplete) week
  - Sums the 4 preceding complete weeks
  - Divides by 4 to get weekly average
  - Multiplies by 52 to annualize
- **Display:** Shows ARR value with weekly average in subtitle (e.g., "4-week avg: $39.25/wk")

#### Churned Wallets
- **Definition:** Count of payer wallets where ALL rails have been terminated
- **Source:** `Account` entities from Goldsky subgraph
- **Formula:** Count where `account.payerRails.length > 0 AND account.payerRails.every(rail.state == "Terminated")`
- **Criteria:**
  - Has created at least 1 rail (was previously active)
  - ALL rails have `state = "Terminated"` (no active or finalized rails)

#### Fixed Lockup Pending
- **Definition:** Total USDFC pre-allocated in one-time payment rails awaiting settlement
- **Source:** `Rail.lockupFixed` and `Rail.totalSettledAmount` where `Rail.paymentRate = 0` from Goldsky subgraph
- **Formula:** `Σ(rail.lockupFixed - rail.totalSettledAmount)` where `rail.paymentRate = "0"` and `rail.lockupFixed > 0`
- **Relationship to Locked USDFC:** Queries rail-level data directly. Locked USDFC uses contract-emitted `lockupCurrent` which includes `lockupFixed` in its calculation.
- **Subtitle:** Shows count of one-time rails (e.g., "122 one-time rails")

**Subgraph Query:**
```graphql
{
  rails(first: 1000, where: { paymentRate: "0", lockupFixed_gt: "0" }) {
    id
    lockupFixed
    totalSettledAmount
  }
}
```

### Prototype Mode Metrics

#### Unique Payers
- **Definition:** Count of distinct wallet addresses that have created at least one payment rail as the payer
- **Source:** `PaymentsMetric.uniquePayers` from Goldsky subgraph
- **Formula:** Incremented when an account creates their first rail as payer

#### Locked USDFC
- **Definition:** Total USDFC currently locked across all accounts for future payments
- **Source:** `Account.userTokens.lockupCurrent` from Goldsky subgraph (emitted by Payments contract `AccountLockupSettled` event)
- **Formula:** `Σ(account.userTokens.lockupCurrent)` converted from wei (18 decimals)
- **Contract Formula:** `lockupCurrent = Σ(rail.lockupFixed + rail.paymentRate × rail.lockupPeriod)` per account
- **Note:** Same metric as GA Mode.

#### Total Settled (USDFC)
- **Definition:** Cumulative sum of all USDFC settled across all payment rails since inception
- **Source:** Sum of `Rail.totalSettledAmount` across all rails with settlements
- **Formula:** `Σ(rail.totalSettledAmount)` converted from wei (18 decimals) to USDFC

#### ARR (Annualized Run Rate)
- **Definition:** Annualized projection based on 4-week rolling average of settled USDFC
- **Source:** `WeeklyTokenMetric.settledAmount` from Goldsky subgraph (last 4 complete weeks)
- **Formula:** `(Week1 + Week2 + Week3 + Week4) / 4 * 52`
- **Calculation Details:**
  - Fetches last 5 weeks of `WeeklyTokenMetric` for USDFC
  - Skips the most recent (potentially incomplete) week
  - Sums the 4 preceding complete weeks
  - Divides by 4 to get weekly average
  - Multiplies by 52 to annualize
- **Display:** Shows ARR value with weekly average in subtitle (e.g., "4-week avg: $39.25/wk")
- **Note:** Same metric in both GA and Prototype modes. Useful for executive reporting and growth tracking.

#### Settled (7d)
- **Definition:** Total USDFC settled in the last 7 days (rolling window)
- **Source:** `Settlement` events from Goldsky subgraph filtered by timestamp
- **Formula:** `Σ(settlement.totalSettledAmount)` where `settlement.settledUpto >= (now - 7 days)`
- **Note:** This is actual settlement activity, not projected

#### Churned Wallets
- **Definition:** Count of payer wallets where ALL rails have been terminated
- **Source:** `Account` entities from Goldsky subgraph
- **Formula:** Count where `account.payerRails.length > 0 AND account.payerRails.every(rail.state == "Terminated")`
- **Criteria:**
  - Has created at least 1 rail (was previously active)
  - ALL rails have `state = "Terminated"` (no active or finalized rails)
- **Note:** Same metric as GA Mode. Added to Prototype mode for complete visibility.

#### Fixed Lockup Pending
- **Definition:** Total USDFC pre-allocated in one-time payment rails awaiting settlement
- **Source:** `Rail.lockupFixed` and `Rail.totalSettledAmount` where `Rail.paymentRate = 0` from Goldsky subgraph
- **Formula:** `Σ(rail.lockupFixed - rail.totalSettledAmount)` where `rail.paymentRate = "0"` and `rail.lockupFixed > 0`
- **Relationship to Locked USDFC:** Queries rail-level data directly. Locked USDFC uses contract-emitted `lockupCurrent` which includes `lockupFixed` in its calculation.
- **Subtitle:** Shows count of one-time rails (e.g., "122 one-time rails")
- **Note:** Same metric as GA Mode.

---

## Payment Types

Filecoin Pay supports two distinct payment mechanisms: **Rate-Based (Ratable)** payments for ongoing services and **One-Time** payments for fixed amounts.

### Rate-Based (Ratable) Payments

Continuous streaming payments calculated per Filecoin epoch. Used for ongoing services like storage.

| Field | Description |
|-------|-------------|
| `paymentRate` | Tokens per epoch (> 0) |
| `lockupFixed` | Always 0 |
| `state` | `ACTIVE` while streaming |

- **Mechanism:** Operator sets `paymentRate` via `modifyRailPayment`. Funds stream continuously from payer's locked balance to payee based on elapsed epochs.
- **Settlement:** `totalSettledAmount` grows over time as: `paymentRate × elapsed_epochs`
- **Lockup:** Dynamic lockup calculated as `paymentRate × lockupPeriod`, securing future payments

### One-Time Payments

Fixed, pre-allocated payments for single transactions. Used for termination fees, cache miss fees, or other discrete charges.

| Field | Description |
|-------|-------------|
| `paymentRate` | Always 0 |
| `lockupFixed` | Pre-allocated fixed amount (> 0) |
| `state` | `ZERORATE` |

- **Mechanism:** Operator allocates funds via `modifyRailLockup` by setting `lockupFixed`, then executes payment via `modifyRailPayment` with `oneTimePayment` parameter
- **Settlement:** `totalSettledAmount` reflects the one-time payment when claimed
- **Lockup:** Fixed amount (`lockupFixed`) reserved for the one-time payment

### Rail States

| State | Description | Payment Type |
|-------|-------------|--------------|
| `ACTIVE` | Rail actively streaming payments | Rate-Based |
| `ZERORATE` | Rail with zero rate, holds fixed lockup | One-Time |
| `TERMINATED` | Rail ended, no more payments | Either |
| `FINALIZED` | Final settlement complete | Either |

### Schema: Rail Entity (Payment Fields)

```graphql
type Rail {
  railId: BigInt!
  paymentRate: BigInt!      # Tokens per epoch (0 for one-time)
  lockupFixed: BigInt!      # Fixed lockup amount (0 for rate-based)
  lockupPeriod: BigInt!     # Lockup window in epochs
  totalSettledAmount: BigInt! # Cumulative settled (both types)
  state: RailState!         # ACTIVE, ZERORATE, TERMINATED, FINALIZED
  # ... other fields
}
```

### Queries

#### All One-Time Payment Rails (ZERORATE)
```graphql
{
  rails(where: { paymentRate: "0" }, first: 100) {
    railId
    lockupFixed
    totalSettledAmount
    state
    payer { address }
    payee { address }
  }
}
```

#### Active Rate-Based Rails
```graphql
{
  rails(where: { paymentRate_gt: "0", state: ACTIVE }, first: 100) {
    railId
    paymentRate
    totalSettledAmount
    payer { address }
    payee { address }
  }
}
```

#### Summary Statistics (Current Mainnet)
```graphql
# One-time payments summary
{
  zeroRateRails: rails(where: { paymentRate: "0" }) {
    lockupFixed
    totalSettledAmount
    state
  }
}
```

### Current State (Mainnet)

| Metric | Value |
|--------|-------|
| Total ZERORATE Rails | 122 |
| Active ZERORATE Rails | 98 |
| Terminated ZERORATE Rails | 24 |
| Total lockupFixed | ~51.62 USDFC |
| Total Settled (One-Time) | 0 USDFC |

**Note:** One-time payments are set up but not yet claimed/settled. The `lockupFixed` amount represents pending one-time payments that will move to `totalSettledAmount` when executed.

### Impact on Total Settled

The **USDFC Settled (Cumulative)** metric already captures BOTH payment types:

```
Total Settled = Σ(rail.totalSettledAmount) for ALL rails
             = Rate-Based Settled + One-Time Settled
```

Currently, all settled amounts come from rate-based payments since no one-time payments have been claimed yet. When one-time payments are executed, they will automatically be included in the total.

### Proposed Breakdown Metric

To provide visibility into payment composition, consider adding:

| Metric | Definition | Query |
|--------|------------|-------|
| **One-Time Pending** | Total lockupFixed in ZERORATE rails | `Σ(rail.lockupFixed) where paymentRate = 0` |
| **One-Time Settled** | Settled from ZERORATE rails | `Σ(rail.totalSettledAmount) where paymentRate = 0` |
| **Rate-Based Settled** | Settled from ACTIVE rails | `Σ(rail.totalSettledAmount) where paymentRate > 0` |

---

## Payer Accounts Table Columns

### Address
- **Definition:** The wallet address of the payer account
- **Display:** Truncated address (`0x1234...abcd`) or ENS name if resolved

### Rails
- **Definition:** Count of payment rails created by this payer
- **Source:** `account.payerRails.length`
- **Sortable:** Yes

### Data Size
- **Definition:** Total data size in GB across all payees' PDP proof sets
- **Source:** PDP Explorer Subgraph (`Provider.totalDataSize`)
- **Correlation:** Matches payer → payee addresses → PDP Provider addresses
- **Formula:** `Σ(payee.pdp.totalDataSize)` converted from bytes to GB
- **Display:** Formatted as MB, GB, or TB (e.g., "1.23 TB", "456.78 GB")
- **Note:** Shows "-" if no PDP data available for any payee
- **Sortable:** Yes

### Proven
- **Definition:** Proof submission status for the payer's payees
- **Source:** PDP Explorer Subgraph (`Provider.lastProvenEpoch`)
- **Values:**
  - **Yes** (green): All payees have submitted proofs within the last 24 hours (2880 epochs)
  - **Stale** (yellow): At least one payee has proofs older than 24 hours
  - **-** (gray): No PDP data available for any payee
- **Calculation:**
  ```
  currentEpoch = (now - FILECOIN_GENESIS) / 30 seconds
  isProven = lastProvenEpoch > 0 AND (currentEpoch - lastProvenEpoch) <= 2880
  ```
- **Note:** Filecoin genesis timestamp is 2020-08-25 00:00:00 UTC (1598306400)

### Total Settled
- **Definition:** Cumulative USDFC settled by this payer across all their rails
- **Source:** `Σ(rail.totalSettledAmount)` from payer's rails
- **Display:** Formatted as currency (e.g., "$1.23K", "$456.78")
- **Sortable:** Yes

### Claimable
- **Definition:** USDFC that has accrued but hasn't been collected yet
- **Source:** `Σ(userToken.payout)` from Goldsky subgraph
- **Formula:** `Σ(account.userTokens.payout)` converted from wei (18 decimals) to USDFC
- **Note:** This represents funds that payees can claim from their incoming rails. The subgraph pre-computes this value in the `payout` field.
- **Display:** Formatted as currency (e.g., "$0.10", "$1.23")
- **Sortable:** Yes

### Locked
- **Definition:** Total USDFC currently locked in the payer's account for future payments
- **Source:** `Σ(userToken.lockupCurrent)` across payer's token balances
- **Display:** Formatted as currency
- **Sortable:** Yes

### Runway
- **Definition:** Estimated days until locked funds are depleted at current lockup rate
- **Source:** Calculated from `userToken.funds` and `userToken.lockupRate`
- **Formula:**
  ```
  dailyBurn = lockupRate × EPOCHS_PER_DAY (2880)
  runwayDays = funds / dailyBurn
  ```
- **Display:** "X days", "Xy Xd" for years, or "-" if no rate
- **Sortable:** Yes

### First Active
- **Definition:** Date when the payer created their first payment rail
- **Source:** `min(rail.createdAt)` from payer's rails
- **Display:** Formatted as "MMM DD 'YY" (e.g., "Jan 12 '26")
- **Sortable:** Yes

---

## Storage Metrics (FWSS Subgraph)

These metrics track storage activity on the Filecoin Warm Storage Service (FWSS) contract. They are analogous to metrics shown on [numbers.filecoindataportal.xyz](https://numbers.filecoindataportal.xyz/).

### Total Active Datasets
- **Definition:** Count of storage datasets currently in "Active" status
- **Source:** `GlobalMetric.totalActiveDataSets` from FWSS subgraph
- **Formula:** Count of `DataSet` entities where `status = "Active"`
- **Note:** A dataset becomes active when registered via `DataSetRegistered` event and transitions to inactive on `DataSetRemoved`

### Total Pieces
- **Definition:** Count of all data pieces across all datasets
- **Source:** `GlobalMetric.totalPieces` from FWSS subgraph
- **Formula:** `Σ(dataSet.totalPieces)` across all datasets
- **Note:** Pieces are added via `PieceAdded` events and represent individual data chunks with CIDs

### Total Data Stored
- **Definition:** Cumulative size of all pieces in bytes
- **Source:** `GlobalMetric.totalStorageBytes` from FWSS subgraph
- **Formula:** `Σ(piece.size)` across all pieces
- **Display:** Convert to human-readable format (KB, MB, GB, TB)
- **Conversion:** `totalStorageBytes / 1024³` for GB, `/ 1024⁴` for TB

### Total Faults
- **Definition:** Count of proving fault events recorded
- **Source:** `GlobalMetric.totalFaults` from FWSS subgraph
- **Formula:** Count of `Fault` entities
- **Note:** Faults are recorded when storage providers miss proving deadlines

---

## FWSS Entity Definitions

### DataSet
Represents a storage dataset registered on FWSS, linking a payer (client) to a payee (storage provider).

| Field | Type | Description |
|-------|------|-------------|
| `dataSetId` | BigInt | On-chain dataset identifier |
| `payer` | Account | Client paying for storage |
| `payee` | Account | Storage provider receiving payment |
| `pdpRailId` | BigInt | Linked Filecoin Pay rail for PDP payments |
| `cacheMissRailId` | BigInt? | Optional rail for cache miss fees |
| `cdnRailId` | BigInt? | Optional rail for CDN fees |
| `totalPieces` | Int | Count of pieces in dataset |
| `totalSize` | BigInt | Total bytes stored |
| `withCDN` | Boolean | CDN service enabled |
| `withIPFSIndexing` | Boolean | IPFS indexing enabled |
| `status` | Enum | Active, Removed |
| `createdAt` | BigInt | Creation timestamp |

### Piece
Represents an individual data chunk within a dataset.

| Field | Type | Description |
|-------|------|-------------|
| `pieceId` | BigInt | Index within dataset |
| `pieceCID` | String | Piece commitment (CAR CID) |
| `ipfsRootCID` | String? | IPFS root for lookups |
| `size` | BigInt | Piece size in bytes |
| `dataSet` | DataSet | Parent dataset |
| `status` | Enum | Active, Removed |

### GlobalMetric
Singleton entity (id="global") containing aggregate metrics.

| Field | Type | Description |
|-------|------|-------------|
| `totalDataSets` | Int | All datasets ever created |
| `totalActiveDataSets` | Int | Currently active datasets |
| `totalPieces` | Int | All pieces across datasets |
| `totalStorageBytes` | BigInt | Sum of all piece sizes |
| `totalFaults` | Int | Fault events recorded |
| `uniquePayers` | Int | Distinct payer addresses |
| `uniquePayees` | Int | Distinct payee addresses |

### DailyMetric
Time-series metrics for trending analysis.

| Field | Type | Description |
|-------|------|-------------|
| `date` | String | Date in YYYY-MM-DD format |
| `datasetsCreated` | Int | New datasets that day |
| `piecesAdded` | Int | New pieces that day |
| `storageAddedBytes` | BigInt | Bytes added that day |
| `faultsRecorded` | Int | Faults recorded that day |

---

## FWSS Sample Queries

### Global Storage Metrics
```graphql
{
  globalMetric(id: "global") {
    totalDataSets
    totalActiveDataSets
    totalPieces
    totalStorageBytes
    totalFaults
    uniquePayers
    uniquePayees
  }
}
```

### Recent Datasets
```graphql
{
  dataSets(first: 10, orderBy: createdAt, orderDirection: desc) {
    dataSetId
    payer { id }
    payee { id }
    totalPieces
    totalSize
    status
    pdpRailId
    withCDN
    withIPFSIndexing
  }
}
```

### Storage by Payer
```graphql
query PayerStorage($payer: ID!) {
  account(id: $payer) {
    totalStorageAsPayer
    totalPiecesAsPayer
    datasetCountAsPayer
    datasetsAsPayer(first: 10, orderBy: createdAt, orderDirection: desc) {
      dataSetId
      totalPieces
      totalSize
      status
    }
  }
}
```

### IPFS CID to Piece CID Lookup
```graphql
query FindByIPFS($ipfsCid: String!) {
  pieces(where: { ipfsRootCID: $ipfsCid }) {
    pieceCID
    ipfsRootCID
    size
    dataSet {
      dataSetId
      payer { id }
      payee { id }
    }
  }
}
```

### Daily Storage Trends
```graphql
{
  dailyMetrics(first: 30, orderBy: timestamp, orderDirection: desc) {
    date
    datasetsCreated
    piecesAdded
    storageAddedBytes
    faultsRecorded
  }
}
```

---

## Data Sources

### Filecoin Pay Subgraph (Goldsky)
- **Endpoint:** `https://api.goldsky.com/api/public/project_cmb9tuo8r1xdw01ykb8uidk7h/subgraphs/filecoin-pay-mainnet-tim/1.2.0/gn`
- **Entities Used:** Account, Rail, Settlement, PaymentsMetric, UserToken, Token
- **Purpose:** Payment rails, settlements, account balances

### FWSS Subgraph (Goldsky)
- **Endpoint:** `https://api.goldsky.com/api/public/project_cmb9tuo8r1xdw01ykb8uidk7h/subgraphs/fwss-mainnet-tim/1.0.0/gn`
- **Contract:** `0x8408502033C418E1bbC97cE9ac48E5528F371A9f` (FilecoinWarmStorageService)
- **Entities Used:** DataSet, Piece, Account, Fault, GlobalMetric, DailyMetric
- **Purpose:** Storage datasets, pieces, and aggregate storage metrics
- **Source Code:** [timfong888/fwss-subgraph](https://github.com/timfong888/fwss-subgraph)

### PDP Explorer Subgraph (Goldsky)
- **Endpoint:** `https://api.goldsky.com/api/public/project_cmdfaaxeuz6us01u359yjdctw/subgraphs/pdp-explorer/mainnet311/gn`
- **Entities Used:** Provider
- **Purpose:** Storage provider proof status and data sizes
- **Correlation Key:** `Provider.address` matches `Rail.payee.address`

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `EPOCH_DURATION_SECONDS` | 30 | Duration of one Filecoin epoch |
| `EPOCHS_PER_DAY` | 2880 | 24 × 60 × 60 / 30 |
| `EPOCHS_PER_24_HOURS` | 2880 | Used for proof freshness check |
| `FILECOIN_GENESIS_TIMESTAMP` | 1598306400 | 2020-08-25 00:00:00 UTC |
| `TOKEN_DECIMALS` | 18 | USDFC decimal places |
| `BYTES_PER_KB` | 1024 | 1024¹ |
| `BYTES_PER_MB` | 1048576 | 1024² |
| `BYTES_PER_GB` | 1073741824 | 1024³ |
| `BYTES_PER_TB` | 1099511627776 | 1024⁴ |

---

## Removed Metrics

### Monthly Run Rate (MRR)
- **Status:** Removed as of v0.11.0
- **Reason:** Replaced with actual settlement data (Settled 7d) for more accurate activity representation
- **Previous Definition:** Projected monthly payment volume based on active rail payment rates
- **Previous Formula:** `Σ(activeRail.paymentRate) × EPOCHS_PER_MONTH (86,400)`
