# Deployment History

## v0.20.0 - 2026-01-13

**Changes:**
- Add SP Registry hero section to Payee Detail page - closes [#37](https://github.com/timfong888/filecoin-pay-console/issues/37)
- Display SP name, location, status, service URL, storage pricing, piece size range, proving period
- Show "Unregistered SP" fallback when payee not found in registry
- Parse ISO 3166 location format (e.g., "C=GB;ST=Gloucestershire;L=Cheltenham") to readable city/country

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Auto-generated: https://c84d2040.pinit.eth.limo
- IPFS CID: `bafybeieavpcsmfbudwgvmamofaymuh2fe3okqfmgsoqh56gmrcrovtj4r4`
- Git Tag: [v0.20.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.20.0)
- Commit: [9e3354f](https://github.com/timfong888/filecoin-pay-console/commit/9e3354f)

**Direct Commits:**
- [9e3354f](https://github.com/timfong888/filecoin-pay-console/commit/9e3354f) - feat: add SP Registry hero section to Payee Detail page (#37)

---

## v0.19.0 - 2026-01-13

**Changes:**
- Fix time series chart to match Active Payers hero metric definition - fixes [#36](https://github.com/timfong888/filecoin-pay-console/issues/36)
- Chart was showing all unique payers; now filters for Active criteria (ACTIVE rail AND lockupRate > 0)
- Renamed chart from "Total Unique Payers" to "Total Active Payers"
- Updated both Dashboard and Payer Accounts page charts for consistency
- Update DASHBOARD_VERSION to 0.16.0 → 0.19.0

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Auto-generated: https://72232bf1.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1-FtWHO3_9Pzvi7fCf14cyKZXJ9JdSKSEs6GmTn7swZw4ubDEqAKdHyJeQUg5DVMf4X22ACkcOCEKfWIufdjySP9kUJjL6vrFt3C91Q_z5_4fCkx_Knlkz7vEiGv-o4GoIx26AwvJpszYACmMB96g
- IPFS CID: `bafybeia4wrv2pwrgyizebvfymge5yttww4ockoeb53vrvnitcx7osmvqru`
- Git Tag: [v0.19.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.19.0)
- Commit: [c4cda24](https://github.com/timfong888/filecoin-pay-console/commit/c4cda24)

**Direct Commits:**
- [c4cda24](https://github.com/timfong888/filecoin-pay-console/commit/c4cda24) - fix: update time series chart to match Active Payers hero metric (#36)

---

## v0.18.0 - 2026-01-13

**Changes:**
- Add Feature Request link to header navigation - closes [#33](https://github.com/timfong888/filecoin-pay-console/issues/33)
- Remove CID Lookup from navigation
- Feature Request opens https://filecoin.fillout.com/builders in new tab

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Auto-generated: https://b27c0d95.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1_uN724GKzEJ6101Zxoy2fMtZYPq_pycppgzq4nZGBj0gvWujJy0-3-qa7zWPE3IYYrqK3-01MJ_UVTZZJd6sowINHEoNNC6rbQ7YooODvB6Zg0pcKP_E-qvKeHlZhBjXQZ2af7daNARzW62se_kA
- IPFS CID: `bafybeicdjocuze4v3s25drm3b4jhfjl33gjculspj2nh7hpnfchumiyhbe`
- Git Tag: [v0.18.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.18.0)
- Commit: [8b0bfef](https://github.com/timfong888/filecoin-pay-console/commit/8b0bfef)

**Direct Commits:**
- [8b0bfef](https://github.com/timfong888/filecoin-pay-console/commit/8b0bfef) - feat: add Feature Request link, remove CID Lookup from nav (#33)

---

## v0.17.0 - 2026-01-13

**Changes:**
- Add wireframe images for Linear project overview - [b3c52ae](https://github.com/timfong888/filecoin-pay-console/commit/b3c52ae)
- Improve payer metrics and add CID lookup - closes [#31](https://github.com/timfong888/filecoin-pay-console/issues/31), [#32](https://github.com/timfong888/filecoin-pay-console/issues/32)

**Deployment:**
- PinMe ENS URL: https://13af0c80.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1-sndCl6OJPwKachQKt25RrNo7fQxPJ0xVl4P9XCizjuKu7cO93NBPf4lHUaHS2fLq8Z91DX6q84lopTz3tSFVxjvLhDrxYPrX4AQ4JPSAjosK-JsC0ejQP4EezCStgAQIUD1TGEC0LLPe16pAfaQ
- IPFS CID: `bafybeigspi6sa3tnb7zupasetfmh7rahu5ndjntzrg2nzgrk3vk3y33sqa`
- Git Tag: [v0.17.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.17.0)
- Commit: [b3c52ae](https://github.com/timfong888/filecoin-pay-console/commit/b3c52ae)

**Direct Commits:**
- [b3c52ae](https://github.com/timfong888/filecoin-pay-console/commit/b3c52ae) - docs: add wireframe images for Linear project overview
- [d944bc0](https://github.com/timfong888/filecoin-pay-console/commit/d944bc0) - feat: improve payer metrics and add CID lookup (#31, #32)

---

## v0.16.0 - 2026-01-12

**Changes:**
- Fix cumulative Settled USDFC chart date alignment - fixes [#30](https://github.com/timfong888/filecoin-pay-console/issues/30)
- Chart was bucketing settlements by rail creation date instead of actual settlement date
- Now uses DailyTokenMetric with timestamp conversion for accurate timeline
- Chart correctly shows flat $0 until Jan 8, then sharp increase

**Deployment:**
- PinMe ENS URL: https://a7b4c286.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1-5R2pVb_m8bhElQiO4WblvGyKAmfLDm8t9Je5UJk01TxJhYVIuDQn7F6K61Lg3h05wZSvCASiYl-rjkkt30ZNkT7tufX0tAqGW0mmV
- IPFS CID: `bafybeieqn6iibjjhnlvuzbrj2t3yszqm3fk5hlvfmze3us4iomznejfaki`
- Git Tag: [v0.16.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.16.0)
- Commit: [8e458c2](https://github.com/timfong888/filecoin-pay-console/commit/8e458c2)

**Direct Commits:**
- [8e458c2](https://github.com/timfong888/filecoin-pay-console/commit/8e458c2) - fix: use DailyTokenMetric timestamp for cumulative settled chart (#30)

---

## v0.15.0 - 2026-01-12

**Changes:**
- Fix Dashboard "Unique Payers" to use Active Payers definition - fixes [#27](https://github.com/timfong888/filecoin-pay-console/issues/27)
- Active Payers: at least 1 ACTIVE rail AND lockup rate > 0
- Shows 68 Active Payers (vs 70 Unique Payers before)
- Update DASHBOARD_VERSION to 0.14.0 → 0.15.0

**Deployment:**
- PinMe ENS URL: https://1fb745d0.pinit.eth.limo
- Git Tag: [v0.15.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.15.0)
- Commit: [8ad150e](https://github.com/timfong888/filecoin-pay-console/commit/8ad150e)

**Direct Commits:**
- [8ad150e](https://github.com/timfong888/filecoin-pay-console/commit/8ad150e) - fix: use Active Payers definition on Dashboard (#27)

---

## v0.14.0 - 2026-01-12

**Changes:**
- Replace Monthly Run Rate with Settled (7d) on Dashboard - closes partial [#16](https://github.com/timfong888/filecoin-pay-console/issues/16)
- MRR was misleading (theoretical); Settled (7d) shows actual fund flow
- Update DASHBOARD_VERSION to 0.13.0 → 0.14.0

**Deployment:**
- PinMe ENS URL: https://6bd62dde.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1-jV2Z_yuIpebtjW9hkC0HVcL1oDJD8yQkEAUuPKFgozmXdXXPBZfFjzS9JVKGlyKTaH72S5dVJW2XJgkJrDdL4x_hbz0wv0Epa8oyW
- IPFS CID: `bafybeiefa5jvvbrrsyftiqjwboyyuykpg4slk4ckkwg4ncehz2yxvra73u`
- Git Tag: [v0.14.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.14.0)
- Commit: [2237e95](https://github.com/timfong888/filecoin-pay-console/commit/2237e95)

**Direct Commits:**
- [2237e95](https://github.com/timfong888/filecoin-pay-console/commit/2237e95) - fix: replace Monthly Run Rate with Settled (7d) on Dashboard

---

## v0.13.0 - 2026-01-12

**Changes:**
- Fix Data Size on Payer Accounts to show correlated data (not provider totals) - fixes [#28](https://github.com/timfong888/filecoin-pay-console/issues/28)
- Implement timestamp-based Rail↔DataSet correlation for accurate per-payer data sizes

**Deployment:**
- PinMe ENS URL: https://df7c9531.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX19fvfpMpdvw1XNZo9AMe5gCd77kvvEOMNXNEuBStroVktAiENSQqJ_81BWqLwoKy2LcXMM_vahQUyfudr_DOIwvcDYSuP3FLIQnenzs
- IPFS CID: `bafybeibezeyu62ghnaecafm7usywm6e3udfnvjhckncxytrwgwq35oep5e`
- Git Tag: [v0.13.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.13.0)
- Commit: [5a3d530](https://github.com/timfong888/filecoin-pay-console/commit/5a3d530)

**Direct Commits:**
- [5a3d530](https://github.com/timfong888/filecoin-pay-console/commit/5a3d530) - fix: correlate Data Size with specific Rails via timestamp matching

---

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
