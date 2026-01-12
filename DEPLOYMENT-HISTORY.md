# Deployment History

## v0.9.0 - 2026-01-12

**Changes:**
- Fix MRR calculation: use epochs (86,400/month) instead of seconds (2,592,000/month) - fixes #8
- Upgrade Goldsky subgraph endpoint to v1.1.0
- Add `fetchSettled7d()` for 7-day settlement tracking
- Add PDP integration scaffolding

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1_9hNl_HFrZQpT2TyYjt_c_KTWFkDSKIfLVJ7rBdaMpyyMKogLf6jEXfgIPrJuaZc_vEw6EtMxh-PYRUiuc_f5ltSCO7EF4k9sESJwHwyffJW7HoN6rUl_sCx8JbsbW83QzANCs2nh2DQ
- Git Tag: v0.9.0
- Commit: 239aef2

**PRs Included:**
- #21 - fix: correct MRR calculation to use epochs instead of seconds
- #22 - feat: upgrade subgraph endpoint to v1.1.0
