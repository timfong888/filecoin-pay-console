# Deployment History

## v0.12.0 - 2026-01-12

**Changes:**
- Fix "Showing Mock Data" error by switching from broken Settlement.timestamp query to DailyTokenMetric - fixes [#26](https://github.com/timfong888/filecoin-pay-console/issues/26)

**Deployment:**
- PinMe ENS URL: https://6eb08716.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1_ynL2x0zsfGxronJfeGE4PulxPIgOTR7epWJwtmVpvPlVEOAe-hPKW4aTEZG24t4PWGqw6ZvK2Pqx7KtlKD4FsEZpY76AWLRcio79p
- IPFS CID: `bafybeiaj3xdrgcy6nkq4vrouuaraf45mcii2fkt7ge42vrfzqmuo6wo47i`
- Git Tag: [v0.12.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.12.0)
- Commit: [66970de](https://github.com/timfong888/filecoin-pay-console/commit/66970de)

**Direct Commits:**
- [66970de](https://github.com/timfong888/filecoin-pay-console/commit/66970de) - fix: use DailyTokenMetric for 7d settled to fix subgraph schema error

---

## v0.11.0 - 2026-01-12

**Changes:**
- Add ENS name resolution for counterparties in detail view rail tables - fixes [#10](https://github.com/timfong888/filecoin-pay-console/issues/10)
- Add Active Payers criteria: requires at least 1 ACTIVE rail AND lockup rate > 0 - fixes [#12](https://github.com/timfong888/filecoin-pay-console/issues/12)
- Fix: use hasFaults instead of non-existent isProven property in PDP enrichment

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX18elPI6Y7gyt98khrJlRgPdPSus53RWaStqQ_NZd4a2sZZKWOVdXGO75Paqvfi6ho3fbac24iH0Rk0sfCITKygojPhtsV65rTWRrTqB
- IPFS CID: `bafybeigyeeb5irx74hh3v2nbebudsvs736mg7pvhltwle66l6rdamvhlxa`
- Git Tag: [v0.11.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.11.0)
- Commit: [7c39e85](https://github.com/timfong888/filecoin-pay-console/commit/7c39e85)

**PRs Included:**
- [#24](https://github.com/timfong888/filecoin-pay-console/pull/24) - feat: add ENS resolution for counterparties in detail views

**Direct Commits:**
- [ae31e61](https://github.com/timfong888/filecoin-pay-console/commit/ae31e61) - feat: add Active Payers criteria (closes #12)
- [7c39e85](https://github.com/timfong888/filecoin-pay-console/commit/7c39e85) - fix: use hasFaults instead of non-existent isProven property

---

## v0.10.0 - 2026-01-12

**Changes:**
- All changes from v0.9.0 with fresh deployment
- Related to Issue [#16](https://github.com/timfong888/filecoin-pay-console/issues/16): Data Size and Proof Status columns

**Deployment:**
- PinMe ENS URL: https://e782aaad.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX180pVcnJvl720kNP3AHbzU9MQdAUSmkpUeCRJjGgS47CMcPb9c7IA7lHF7nMM5phiGgYyqWbZknopG6T2NdrW9XTkxo7BwpA-Jeuuhr
- IPFS CID: `bafybeia572vkjfasb3ppbil234jn4bdz2cyp27pgukh3h64bgiplhvnrbi`
- Git Tag: [v0.10.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.10.0)
- Commit: [239aef2](https://github.com/timfong888/filecoin-pay-console/commit/239aef2)

**PRs Included:**
- [#17](https://github.com/timfong888/filecoin-pay-console/pull/17) - docs: add PaymentsMetric and DailyMetric calculation formulas
- [#18](https://github.com/timfong888/filecoin-pay-console/pull/18) - feat: Add PDP storage provider enrichment to payee accounts
- [#19](https://github.com/timfong888/filecoin-pay-console/pull/19) - feat(subgraph): add WeeklyTokenMetric entity for weekly token analytics
- [#21](https://github.com/timfong888/filecoin-pay-console/pull/21) - fix: correct MRR calculation to use epochs instead of seconds
- [#22](https://github.com/timfong888/filecoin-pay-console/pull/22) - feat: upgrade subgraph endpoint to v1.1.0

---

## v0.9.0 - 2026-01-12

**Changes:**
- Fix MRR calculation: use epochs (86,400/month) instead of seconds (2,592,000/month) - fixes [#8](https://github.com/timfong888/filecoin-pay-console/issues/8)
- Upgrade Goldsky subgraph endpoint to v1.1.0
- Add `fetchSettled7d()` for 7-day settlement tracking
- Add PDP integration scaffolding

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1_9hNl_HFrZQpT2TyYjt_c_KTWFkDSKIfLVJ7rBdaMpyyMKogLf6jEXfgIPrJuaZc_vEw6EtMxh-PYRUiuc_f5ltSCO7EF4k9sESJwHwyffJW7HoN6rUl_sCx8JbsbW83QzANCs2nh2DQ
- Git Tag: [v0.9.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.9.0)
- Commit: [239aef2](https://github.com/timfong888/filecoin-pay-console/commit/239aef2)

**PRs Included:**
- [#21](https://github.com/timfong888/filecoin-pay-console/pull/21) - fix: correct MRR calculation to use epochs instead of seconds
- [#22](https://github.com/timfong888/filecoin-pay-console/pull/22) - feat: upgrade subgraph endpoint to v1.1.0
