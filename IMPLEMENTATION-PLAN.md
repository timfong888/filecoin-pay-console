# Implementation Plan: Filecoin Pay Console Issues

## Overview

This document outlines the plan to address open issues in the Filecoin Pay Console.

---

## Issue #6: Payee Details - Display correct Settled vs Claimable vs Withdrawn metrics

**Priority:** High
**Dependency:** None (console fix first, subgraph fix later)

### Problem
Payee balances show as 0 because `UserToken` is only created on deposit, not on settlement receipt. Payees who receive payments without depositing have null `UserToken`.

### Solution: Console Fix (Immediate)

#### Step 1: Update GraphQL Queries
Add `totalNetPayeeAmount` to Rail fields in `lib/graphql/queries.ts`:

```typescript
export const ACCOUNT_DETAIL_QUERY = gql`
  query AccountDetail($id: ID!) {
    account(id: $id) {
      // ... existing fields
      payeeRails {
        id
        totalSettledAmount
        totalNetPayeeAmount  // ADD THIS
        state
        createdAt
        payer { address }
      }
    }
  }
`;
```

#### Step 2: Update Type Definitions
Add `totalNetPayeeAmount` to the `Rail` interface:

```typescript
export interface Rail {
  id: string;
  totalSettledAmount: string;
  totalNetPayeeAmount?: string;  // ADD THIS
  // ... rest
}
```

#### Step 3: Update Payee Details Component
Calculate totals from Rail data instead of UserToken:

```typescript
// In payee-accounts/page.tsx
const totalReceived = account.payeeRails?.reduce(
  (sum, rail) => sum + BigInt(rail.totalNetPayeeAmount || '0'),
  BigInt(0)
) || BigInt(0);
```

#### Step 4: Update Hero Metrics Display
- "Total Received" = Sum of `payeeRails.totalNetPayeeAmount`
- "Claimable" = Note: Requires subgraph fix for accurate calculation
- "Withdrawn" = `UserToken.fundsCollected` (if UserToken exists)

### Solution: Subgraph Fix (Later)

1. Copy subgraph code from `filecoin-pay-explorer/packages/subgraph/` to this repo
2. Fix `handleRailSettled` to use `createOrLoadUserToken()`:

```typescript
// BEFORE (broken)
const payeeToken = UserToken.load(rail.payee.concat(rail.token));

// AFTER (fixed)
const payeeTokenWithIsNew = createOrLoadUserToken(rail.payee, rail.token);
const payeeToken = payeeTokenWithIsNew.userToken;
```

3. Deploy to Goldsky using goldsky CLI

---

## Issue #5: Fix confusing Claimable vs Settled metrics on Payee Accounts page

**Priority:** High
**Dependency:** Issue #6 query changes

### Problem
"Total Claimable" shows same value as "All-time Settlements" - these should be different.

### Solution

#### Step 1: Define Metrics Clearly

| Metric | Source | Description |
|--------|--------|-------------|
| Total Claimable | `Σ(UserToken.payout)` | Funds ready to withdraw |
| All-time Settled | `Σ(Rail.totalNetPayeeAmount)` | Total ever received (net) |
| Withdrawn | `Σ(UserToken.fundsCollected)` | Already claimed |

#### Step 2: Update Payee List Page Hero Cards

```typescript
// Calculate from fetched data
const totalClaimable = accounts.reduce((sum, acc) => {
  const payout = acc.userTokens?.[0]?.payout || '0';
  return sum + BigInt(payout);
}, BigInt(0));

const totalSettled = accounts.reduce((sum, acc) => {
  return sum + acc.payeeRails.reduce((railSum, rail) =>
    railSum + BigInt(rail.totalNetPayeeAmount || '0'), BigInt(0)
  );
}, BigInt(0));
```

#### Step 3: Update Hero Card Labels
- Card 1: "Total Claimable" - shows `totalClaimable`
- Card 2: "All-time Received" - shows `totalSettled`
- Card 3: "Active Rails" (keep as-is)

---

## Issue #4: Client-side exception on pinme deployment v0.7.4

**Priority:** Medium
**Dependency:** None

### Problem
Application error on load after deployment to IPFS.

### Investigation Steps

1. Check if this was resolved by later deployments (v0.9.0 at 6c91c42c.pinit.eth.limo)
2. If still occurring, check browser console for:
   - React hooks ordering issues
   - GraphQL query failures
   - Missing data handling

### Likely Resolution
This may have been fixed by the React hooks fixes in commit 5b2d9f3 and GraphQL query fixes in 591f17a.

**Action:** Verify current deployment works, close issue if resolved.

---

## Issue #3: Add deployment history table with date, URL, and version

**Priority:** Low
**Dependency:** None

### Solution

#### Step 1: Create DEPLOYMENT-HISTORY.md

```markdown
# Deployment History

| Date | Version | IPFS CID | Preview URL |
|------|---------|----------|-------------|
| 2026-01-11 | v0.9.0 | 6c91c42c | https://6c91c42c.pinit.eth.limo |
```

#### Step 2: Create deploy script (optional)

```bash
#!/bin/bash
# scripts/deploy.sh

# Build
npm run build

# Deploy to PinMe
OUTPUT=$(pinme upload out 2>&1)
CID=$(echo "$OUTPUT" | grep -oE '[a-z0-9]{8}\.pinit\.eth\.limo' | cut -d. -f1)

# Get version
VERSION=$(grep 'DASHBOARD_VERSION' lib/graphql/client.ts | cut -d"'" -f2)

# Append to history
DATE=$(date +%Y-%m-%d)
echo "| $DATE | $VERSION | $CID | https://$CID.pinit.eth.limo |" >> DEPLOYMENT-HISTORY.md
```

---

## Subgraph Integration (New Task)

**Priority:** High (for long-term fix)
**Dependency:** Issue #6 console fix completed first

### Steps

1. **Copy subgraph code to this repo**
   ```bash
   cp -r ~/development/filecoin/filecoin-pay-explorer/packages/subgraph ./subgraph
   ```

2. **Update subgraph.yaml** for Goldsky deployment

3. **Fix UserToken bug in payments.ts**
   - Change `UserToken.load()` to `createOrLoadUserToken()` in `handleRailSettled`

4. **Test locally** with graph-node or matchstick

5. **Deploy to Goldsky**
   ```bash
   goldsky subgraph deploy filecoin-pay-console/1.0.0 --path ./subgraph
   ```

6. **Update client.ts** with new endpoint

---

## Execution Order

1. **Issue #6 (Console Fix)** - Unblocks accurate payee data display
2. **Issue #5** - Depends on #6 query changes
3. **Issue #4** - Verify if already fixed
4. **Issue #3** - Low priority, can do anytime
5. **Subgraph Integration** - Long-term fix after console works

---

## Files to Modify

| File | Issues |
|------|--------|
| `lib/graphql/queries.ts` | #5, #6 |
| `lib/graphql/fetchers.ts` | #5, #6 |
| `app/payee-accounts/page.tsx` | #5, #6 |
| `DEPLOYMENT-HISTORY.md` (new) | #3 |
| `subgraph/` (new directory) | Subgraph integration |
