# Subgraph Fix Required: UserToken Creation on Settlement

## Bug Location
`src/payments.ts` in `handleRailSettled` function (around line 384)

## Current Code (Broken)
```typescript
// update funds for payer and payee
const payerToken = UserToken.load(rail.payer.concat(rail.token));
const payeeToken = UserToken.load(rail.payee.concat(rail.token));  // ONLY LOADS!

if (payeeToken) {  // NULL if payee never deposited
  payeeToken.funds = payeeToken.funds.plus(totalNetPayeeAmount);
  payeeToken.fundsCollected = payeeToken.fundsCollected.plus(totalNetPayeeAmount);
  payeeToken.save();
}
```

## Problem
- `UserToken.load()` returns null if record doesn't exist
- `UserToken` is only created in `handleDepositRecorded`
- Payees who receive settlements but never deposited have no `UserToken`
- Their `funds` and `fundsCollected` are never tracked

## Fix Required
Change `UserToken.load()` to `createOrLoadUserToken()`:

```typescript
// update funds for payer and payee
const payerToken = UserToken.load(rail.payer.concat(rail.token));
const payeeTokenWithIsNew = createOrLoadUserToken(rail.payee, rail.token);  // CREATE if missing
const payeeToken = payeeTokenWithIsNew.userToken;

// Always update payee (now guaranteed to exist)
payeeToken.funds = payeeToken.funds.plus(totalNetPayeeAmount);
payeeToken.fundsCollected = payeeToken.fundsCollected.plus(totalNetPayeeAmount);
payeeToken.save();
```

## Impact
After this fix:
- `UserToken.funds` will accurately reflect payee balance
- `UserToken.fundsCollected` will track total received
- `UserToken.payout` can be used for "Claimable Now"

## Deployment
After fixing, redeploy to Goldsky:
```bash
cd subgraph
npm install
npm run codegen
npm run build
goldsky subgraph deploy filecoin-pay-console/1.1.0 --path ./build
```

Then update `lib/graphql/client.ts` with new endpoint.

## Related Issues
- Issue #5: Fix confusing Claimable vs Settled metrics
- Issue #6: Payee Details correct metrics
