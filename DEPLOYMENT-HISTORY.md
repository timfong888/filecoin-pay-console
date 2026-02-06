# Deployment History

## v0.37.1-prototype - 2026-02-06

**Changes:**
- Fix: Use `dailyTokenMetrics` for ARR calculation instead of non-existent `weeklyTokenMetrics`
- Dashboard now loads real data instead of falling back to mock data

**Deployment:**
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeigcanhqijvvtxiw4w7bb4p5yzq62rruycaalnmezacwoqray6kbuq`)
- Preview: https://bafybeigcanhqijvvtxiw4w7bb4p5yzq62rruycaalnmezacwoqray6kbuq.ipfs.dweb.link
- Git Tag: [v0.37.1-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.37.1-prototype)
- Commit: [bd4a653](https://github.com/timfong888/filecoin-pay-console/commit/bd4a653)

**Related Issues:**
- [#61](https://github.com/timfong888/filecoin-pay-console/issues/61) - Debug subgraph query error

---

## v0.35.0-prototype / v0.32.0-ga - 2026-01-23

**Changes:**
- Add four placeholder auction stats charts with mock data:
  - Number of Bidders (bar chart)
  - Auction Price vs Target Price (line comparison chart)
  - Number of Pieces Settled (line chart)
  - Duration from Published to Settlement (bar chart)
- Charts display "Mock Data" badge to indicate placeholder status
- Shown in both GA and prototype modes

**Deployment:**
- GA: https://filpay-ga.pinit.eth.limo (CID: `bafybeif37x67ozst3wf2orycdznach6wohwiewu4kfhfmqr6dce72wxcmy`)
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeihqynoym25orhkmyv4fgokkr3rbvjtnvdgrhmdk3vpqqjbcyyghay`)
- Git Tags: [v0.32.0-ga](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.32.0-ga), [v0.35.0-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.35.0-prototype)
- Commits: [16eaa48](https://github.com/timfong888/filecoin-pay-console/commit/16eaa48) (main), [162409d](https://github.com/timfong888/filecoin-pay-console/commit/162409d) (prototype)

**Related Issues:**
- [#58](https://github.com/timfong888/filecoin-pay-console/issues/58) - Add auction stats placeholder charts
- Ref: [FilOzone/filecoin-pay-explorer#80](https://github.com/FilOzone/filecoin-pay-explorer/issues/80) - Auction stats for GA

---

## v0.33.0-prototype - 2026-01-23

**Changes:**
- Add non-functional "FIL Burned" hero metric (placeholder for future implementation)
- FIL Burned will track: USDFC settlements, FIL settlements, and auctions
- Show both Filecoin Pay and FWSS contracts with names in DataSourcePanel
- Display subgraph name (filecoin-pay-mainnet) alongside version
- Updated METRIC-DEFINITIONS.md to document FIL Burned metric

**Deployment:**
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeiahvennodd5krgjd4is7lf5visr6rltxhlnnbs4jt3zd4nl2ru44e`)
- Git Tag: [v0.33.0-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.33.0-prototype)
- Commit: [319781a](https://github.com/timfong888/filecoin-pay-console/commit/319781a)

**Related Issues:**
- [#59](https://github.com/timfong888/filecoin-pay-console/issues/59) - Add FIL Burned hero metric

---

## v0.30.0-ga - 2026-01-23

**Changes:**
- Add non-functional "FIL Burned" hero metric (placeholder for future implementation)
- FIL Burned will track: USDFC settlements, FIL settlements, and auctions
- Show both Filecoin Pay and FWSS contracts with names in DataSourcePanel
- Display subgraph name (filecoin-pay-mainnet) alongside version
- Updated METRIC-DEFINITIONS.md to document FIL Burned metric

**Deployment:**
- GA: https://filpay-ga.pinit.eth.limo (CID: `bafybeihyhouwcwobfrwbxy2t7n6mpphlwcsj46pz7ez7jndsroo4od3zai`)
- Git Tag: [v0.30.0-ga](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.30.0-ga)
- Commit: [218ee92](https://github.com/timfong888/filecoin-pay-console/commit/218ee92)

**Related Issues:**
- [#59](https://github.com/timfong888/filecoin-pay-console/issues/59) - Add FIL Burned hero metric

---

## v0.32.1-prototype - 2026-01-23

**Changes:**
- Replace unreliable hover tooltip with visible caption text for settle button
- Shows "(Connect wallet)" text next to disabled Settle button when wallet not connected
- More accessible and works on touch devices

**Deployment:**
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeifp4js4hlsl2g7j23fcsylfd3ccvsm4xmyepawobxbh6wa7lulmja`)
- Commit: [319781a](https://github.com/timfong888/filecoin-pay-console/commit/319781a)

**Related Issues:**
- [#57](https://github.com/timfong888/filecoin-pay-console/issues/57) - Settle button UX improvement

---

## v0.32.0-prototype - 2026-01-23

**Changes:**
- Add settle functionality for both payers and payees
- Implement wallet connection via wagmi + react-query
- Create SettleRailDialog component with transaction handling
- Add Connect Wallet button to header with disconnect dropdown
- Update GraphQL queries to include railId and settledUpto fields
- Wire up settle in payee detail view
- Add settle button to payer detail view

**Deployment:**
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeifqxqklsiislkaews75z5vttqjd6cow4yyje3znq7e5qpd55xgsfu`)
- Git Tag: [v0.32.0-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.32.0-prototype)
- Commit: [f6c4daa](https://github.com/timfong888/filecoin-pay-console/commit/f6c4daa)

**Related Issues:**
- [#57](https://github.com/timfong888/filecoin-pay-console/issues/57) - Expose the same Settle Funds via the UI for Payers

---

## v0.31.0-prototype - 2026-01-22

**Changes:**
- Add "Churned Wallets" metric to Prototype mode (now shows 5 hero metrics instead of 4)
- Each metric caption now links to its definition in METRIC-DEFINITIONS.md
- Prototype mode metrics: Active Payers, Locked USDFC, USDFC Settled, Settled (7d), Churned Wallets
- Updated METRIC-DEFINITIONS.md to document Churned Wallets in Prototype section

**Deployment:**
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeif7szputtv4csxdrfvoahugllqo7z55nebpkkcugwzyzfl6ayc4ca`)
- Git Tag: [v0.31.0-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.31.0-prototype)
- Commit: [227d0a5](https://github.com/timfong888/filecoin-pay-console/commit/227d0a5)

**Related Issues:**
- Churned Wallets was missing from Prototype mode after previous GA-focused updates

---

## v0.30.0 - 2026-01-22

**Changes:**
- Add "Locked USDFC" hero metric between Active Payers and USDFC Settled
- Displays total USDFC locked across all accounts for future payments
- Formula: `Σ(account.userTokens.lockupCurrent)` converted from wei to USDFC

**Deployment:**
- GA: https://filpay-ga.pinit.eth.limo (CID: `bafybeiftlwbgndtw4x3nztnpbcpb322fuutxechmsan3uyufrxq76735si`)
- Prototype: https://filpay-prototype.pinit.eth.limo (CID: `bafybeihdjuhf7pcrrmzco2hb4izeugl47h2gsd7jz4mycmkjjgpbenerly`)
- Git Commits:
  - prototype: [fb6aaff](https://github.com/timfong888/filecoin-pay-console/commit/fb6aaff)
  - main: [3153e4e](https://github.com/timfong888/filecoin-pay-console/commit/3153e4e) (cherry-picked)

**Related Issues:**
- [#56](https://github.com/timfong888/filecoin-pay-console/issues/56) - Add Locked USDFC

---

## v0.29.0-ga - 2026-01-21

**Changes:**
- Add `next/dynamic` for chart components to improve initial bundle size
- Create `DashboardCharts` and `PayerListCharts` components with dynamic import
- Charts now load after initial page load with loading skeletons
- In GA mode, recharts bundle is never loaded (charts not shown)

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX19EVSFForGAb5i-__mHn1vLZSgrjjccLkeJXWo3phoYgiYj_1XIqr5ZYLZhW5HW25MwTdUDqiUXrl2KyRuRGTEcl7AgXyc5yTUHylmCSJHowWiyKxF-Unox0wWV6ccE98OMYSV4l7n-zcykS0TRyg
- Target ENS: `filpay-ga.pinit.eth.limo`
- Git Tag: [v0.29.0-ga](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.29.0-ga)
- Commit: [24d04c7](https://github.com/timfong888/filecoin-pay-console/commit/24d04c7)

**Related Issues:**
- [#48](https://github.com/timfong888/filecoin-pay-console/issues/48) - Apply Vercel coding best practices as SKILLS
- [#51](https://github.com/timfong888/filecoin-pay-console/issues/51) - Add next/dynamic for chart components

---

## v0.28.0-ga - 2026-01-21

**Changes:**
- Add `optimizePackageImports` for recharts to enable automatic barrel import optimization
- Reduces bundle size by ~200-400ms for recharts without code changes
- Next.js automatically transforms `import { X } from 'recharts'` to direct imports at build time

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX18Ci0Ktb4hDcrT-6hOTD9JzTCviRvuoodiCpvrFBOxtB-anzki10hZuPDaABTK4TYuAcMFAp0HGOqwIleKyTsrbk6N8vEDy22aZDS2Kvqpd9NRmf2AOP6x2bnmNV1ACksmHpz6XN1Y0cAXEFR2fnw
- Target ENS: `filpay-ga.pinit.eth.limo`
- Git Tag: [v0.28.0-ga](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.28.0-ga)
- Commit: [3ed6d8e](https://github.com/timfong888/filecoin-pay-console/commit/3ed6d8e)

**Related Issues:**
- [#48](https://github.com/timfong888/filecoin-pay-console/issues/48) - Apply Vercel coding best practices as SKILLS
- [#50](https://github.com/timfong888/filecoin-pay-console/issues/50) - Replace recharts barrel imports
- [#54](https://github.com/timfong888/filecoin-pay-console/issues/54) - Configure optimizePackageImports

---

## v0.27.0-ga - 2026-01-17

**Changes:**
- GA mode deployment with simplified 3-metric dashboard
- Shows: Active Wallets, USDFC Settled, Churned Wallets
- Churned Wallets: count of payer wallets where all rails are TERMINATED
- Hides Payer/Payee Accounts navigation links

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1-JCR0gqTOoS8B3GkdEZ_uDWq9bhHan8cOeWauoeoh2S313bm8PVlf4gda-8T8lEpMSUIZQV1ig9IA-VRdgxVyUFXMzEtEIfFTy2IhF9zeZlXEGN-QpnbPKmrh1oG9PjjxXHlp0VYwM4BhA8ILHoA
- Target ENS: `filpay-ga.pinit.eth.limo`
- Git Tag: [v0.27.0-ga](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.27.0-ga)
- Same codebase as v0.27.0-prototype, built with `NEXT_PUBLIC_CONSOLE_MODE=ga`

**Related Issues:**
- [#44](https://github.com/timfong888/filecoin-pay-console/issues/44) - Replace Settled (7d) with Churned Wallets metric

---

## v0.27.0-prototype - 2026-01-16

**Changes:**
- Code quality improvements: split monolithic fetchers.ts (1125 lines) into 6 domain modules
- Add unit tests with Vitest (34 tests for utility functions)
- Extract reusable DataSourcePanel component
- Update acceptance tests with GA/Prototype mode detection
- Implement build-time GA/Prototype mode configuration

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX1_MWNwd2YBbxP9HzXBbY5PFzrg6T7HUvm0XO2Z1Dn00sbUsKeY4j-nvZzarbOhU--AkyF1K9d93M2ODEfBpC5a_jzHw2wmGka4eF_eX9ZN9R0Q1KAtKnjxco9VT3BG1ytZXLcvtTcBfh52FlVoxTg
- Target ENS: `filpay-prototype.pinit.eth.limo`
- Git Tag: [v0.27.0-prototype](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.27.0-prototype)
- Commits:
  - [9f14f0f](https://github.com/timfong888/filecoin-pay-console/commit/9f14f0f) - chore: bump version to 0.27.0
  - [ddbbe7c](https://github.com/timfong888/filecoin-pay-console/commit/ddbbe7c) - refactor: code quality improvements
  - [922bcf3](https://github.com/timfong888/filecoin-pay-console/commit/922bcf3) - feat: implement GA/Prototype dual-mode deployment

---

## v0.25.0 - 2026-01-16

**Changes:**
- Add footer with subgraph URL and repo link for transparency - fixes [#41](https://github.com/timfong888/filecoin-pay-console/issues/41)
- Footer displays version, network, Goldsky subgraph endpoint, and source code link

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX18msP-a-lBt3MADmH7_bgFpgVvllAcg9_ZZqNxEu72S6WnfuVxx--wrvvuOREJOhfx9cZdgvPSKiyyg3tU4eSRDYbsDl9C4bgyU0StAcnNsNox6kpv7Be7vyae7yZaJdtb5pobcTVvdc0emeN4uOQ
- IPFS CID: `bafybeif3ufi42ibaml4wziqfn273ckirrntszk5x365m2s4cywvrmp6i5y`
- Git Tag: [v0.25.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.25.0)
- Commits:
  - [a23f98e](https://github.com/timfong888/filecoin-pay-console/commit/a23f98e) - feat: add footer with subgraph URL and repo link
  - [6814291](https://github.com/timfong888/filecoin-pay-console/commit/6814291) - chore: bump version to 0.25.0

---

## v0.24.0 - 2026-01-13

**Changes:**
- Fix CID count in Total Storage to use `totalRoots` field instead of limited roots array
- Fix My Data section header to show correct total CID count with proper formatting
- CID count now shows accurate values (e.g., 54,573 instead of 130)

**Deployment:**
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX184uOV6qrVDfq4G_JGoMElcKRREYYvbGGwsQ6grku99O4K__VTS90ch6MVvTjZ_N3ItDrCyNrsQQtulcOJ7EMh7qAVcKGFVBzcusY9avsGf4fg_5qDGlCtDbxUJbk8Wm3haWGYME2UxJn_6lWkNNg
- Git Tag: [v0.24.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.24.0)
- Commits:
  - [22ecd09](https://github.com/timfong888/filecoin-pay-console/commit/22ecd09) - fix: use totalRoots for CID count instead of limited roots array
  - [bacdb17](https://github.com/timfong888/filecoin-pay-console/commit/bacdb17) - fix: show correct CID count in My Data section header

---

## v0.23.0 - 2026-01-13

**Changes:**
- Fix Data Size column in list view to show correct per-payer values - fixes [#39](https://github.com/timfong888/filecoin-pay-console/issues/39)
- Fix Total Storage in detail view using rail correlation (payee:createdAt)
- Add Locked Funds card with tooltip explaining reserved funds
- Add tooltip to Available Funds explaining withdrawable amount
- Aggregate DataSets properly when multiple rails share same key
- Show provider (SP) address with link in My Data table

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Preview: https://pinme.eth.limo/#/preview/U2FsdGVkX18iqKH9AQqG1DD7vTpKtIioAE2TK5-2hI-0XCk2CRiFmjEJRq3e4rntWUOEab3IHT3itenjAeBqxc5uVuPrPY9AR7ZBSXeyEsCjweJwNsTT126XSee9dGsCGXEW0ZJ3qCASxUZXzUIRdS9cPoAprA
- Git Tag: [v0.23.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.23.0)
- Commit: [8380ad2](https://github.com/timfong888/filecoin-pay-console/commit/8380ad2)

**Direct Commits:**
- [8380ad2](https://github.com/timfong888/filecoin-pay-console/commit/8380ad2) - fix: correct payer storage calculations and add Locked Funds display (#39)

---

## v0.22.0 - 2026-01-13

**Changes:**
- Fix SP Registry to properly fetch and display registered Storage Provider data - fixes [#37](https://github.com/timfong888/filecoin-pay-console/issues/37)
- Update ABI to use `getProviderByAddress` and `getProviderWithProduct` (replaces non-existent `getPDPService`)
- Fix capability value decoding: values are raw bytes, not ABI-encoded
- SP Hero now correctly displays: name, location, description, service URL, piece size range

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- IPFS CID: `bafybeiclgkiup5csu254jpuyozaephizhobf2oli576hxjjmew6vkt6wha`
- Git Tag: [v0.22.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.22.0)
- Commit: [afab675](https://github.com/timfong888/filecoin-pay-console/commit/afab675)

**Direct Commits:**
- [afab675](https://github.com/timfong888/filecoin-pay-console/commit/afab675) - fix: SP Registry uses correct contract functions and raw byte decoding

---

## v0.21.0 - 2026-01-13

**Changes:**
- Add My Data section with PDP integration for payer detail view - closes [#35](https://github.com/timfong888/filecoin-pay-console/issues/35)
- Add Total Storage and Runway summary cards showing GB across CIDs
- Add "My Data" table with Piece CID, IPFS CID, Size, Provider, Data Set columns
- Add CID lookup panel for bidirectional IPFS CID ↔ Piece CID search
- Create StateView contract client for fetching IPFS CID metadata from chain
- Bandwidth card shows "Coming Soon" placeholder

**Deployment:**
- PinMe ENS URL: https://filpay.pinit.eth.limo
- PinMe Auto-generated: https://72adf7a4.pinit.eth.limo
- IPFS CID: `bafybeifnjeb435nbbn7dlsuspnz4jtriolu5c4r7xp7fpw3dqy3gqpgc44`
- Git Tag: [v0.21.0](https://github.com/timfong888/filecoin-pay-console/releases/tag/v0.21.0)
- Commit: [9c7efd8](https://github.com/timfong888/filecoin-pay-console/commit/9c7efd8)

**Direct Commits:**
- [9c7efd8](https://github.com/timfong888/filecoin-pay-console/commit/9c7efd8) - feat: add My Data section with PDP integration for payer detail view (#35)

---

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
