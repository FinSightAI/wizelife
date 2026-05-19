# 🚨 WizeMoney-FlowsV5 action items — 2026-05-19

**2 failure(s), 8 warning(s), 23 pass.**

## For Claude to fix:
- ❌ 11/Sidebar: clicking Goals link navigates to /pages/goals.html — URL after click: https://money.wizelife.ai/?_t=1779215649596
- ❌ 13/Tx CRUD: transactions page exposes either modal trigger or inline add-form — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/transactions.html?_t=1779215665040", waiting until "load"[22m


## For you to investigate:
- ⚠️ no .pro-lock elements rendered — sidebar may not have loaded Pro flags
- ⚠️ no [data-pro] markers in sidebar — Pro wiring may have been stripped
- ⚠️ no Plan.redeemCode
- ⚠️ Plan.redeemCode unavailable
- ⚠️ Plan.redeemCode unavailable
- ⚠️ Paywall.show() unavailable from window — modal entry point may have moved
- ⚠️ missing sidebar links: export — they may live in a sub-menu
- ⚠️ button did not flip to disabled after generateStory() call — may indicate broken loading state

---
_<details><summary>Full detail</summary>_

# WizeMoney-FlowsV5 QA — 2026-05-19

- ✅ 1/Paywall: stocks page reachable even with PAYWALL_ACTIVE=false (no hard gate)
- ⚠️ no .pro-lock elements rendered — sidebar may not have loaded Pro flags
- ✅ 2/Paywall: sidebar Pro lock badges render when plan=free is forced
- ✅ 3/Paywall: simulator page loads without redirect (paywall not blocking nav)
- ⚠️ no [data-pro] markers in sidebar — Pro wiring may have been stripped
- ✅ 4/Paywall: data-pro attribute markers exist in sidebar markup (locked-feature wiring intact)
- ⚠️ no Plan.redeemCode
- ✅ 5/AccessCode: Plan.redeemCode("WIZELIFE2026") upgrades plan to pro
- ⚠️ Plan.redeemCode unavailable
- ✅ 6/AccessCode: BETA-ACCESS code accepted by redeemCode
- ⚠️ Plan.redeemCode unavailable
- ✅ 7/AccessCode: invalid code returns false
- ⚠️ Paywall.show() unavailable from window — modal entry point may have moved
- ✅ 8/AccessCode: paywall modal exposes code input (placeholder "access code")
- ✅ 9/Sidebar: AI-chat link present and points to /pages/ai-chat.html
- ⚠️ missing sidebar links: export — they may live in a sub-menu
- ✅ 10/Sidebar: Reports / Family / Export links all wired
- ❌ 11/Sidebar: clicking Goals link navigates to /pages/goals.html — URL after click: https://money.wizelife.ai/?_t=1779215649596
- ✅ 12/Sidebar: nav-item count is at least 8 (broad coverage of FinSight pages)
- ❌ 13/Tx CRUD: transactions page exposes either modal trigger or inline add-form — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/transactions.html?_t=1779215665040", waiting until "load"[22m

- ✅ 14/Tx CRUD: income #incomeModal markup present on income page (form integration intact)
- ✅ 15/Tx CRUD: localStorage seed without auth — fresh signed-out flow stores data offline
- ⚠️ button did not flip to disabled after generateStory() call — may indicate broken loading state
- ✅ 16/AI Story: #generateBtn exists, becomes disabled while generating
- ✅ 17/AI Story: no uncaught JS error within 8s of page load
- ✅ 18/AI Story: i18n key "aiStory.generateBtn" is rendered (not raw key text)
- ✅ 19/Compare Funds: I18n.init was called (no raw data-i18n keys leak)
- ✅ 20/Compare Funds: storage.js loaded BEFORE i18n.js (script order fix from CLAUDE.md)
- ✅ 21/Gemel: page loads and exposes calculateReturns function or visible result
- ✅ 22/Gemel: I18n.init() ran (data-i18n keys resolved, not raw)
- ✅ 23/SW: cache name finsight-v296 active and controller present after settle
- ✅ 24/Onboarding: close + skip buttons meet 44×44 WCAG/iOS touch target
- ✅ 25/i18n: HE/EN/PT/ES all change visible UI label (rotate through 4 langs)

</details>