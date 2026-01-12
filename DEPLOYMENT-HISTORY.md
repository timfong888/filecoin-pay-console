# Deployment History

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
