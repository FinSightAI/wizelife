# 🚨 WizeMoney-FlowsV2 action items — 2026-05-22

**3 failure(s), 1 warning(s), 9 pass.**

## For Claude to fix:
- ❌ Stocks page — chart container or search input present — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html?_t=1779483890416", waiting until "load"[22m

- ❌ Settings page — theme toggle changes data-theme attr — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/settings.html?_t=1779483971812", waiting until "load"[22m

- ❌ AI Story (weekly summary) page renders or shows paywall — AI Story page empty

## For you to investigate:
- ⚠️ No search input on landing

---
_<details><summary>Full detail</summary>_

# WizeMoney-FlowsV2 QA — 2026-05-22

- ✅ Bank page reachable + add-account form has IBAN/balance fields
- ✅ Credit card page renders + has transaction list / empty-state
- ✅ Goals page — add-goal form has name + amount + target-date fields
- ❌ Stocks page — chart container or search input present — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html?_t=1779483890416", waiting until "load"[22m

- ❌ Settings page — theme toggle changes data-theme attr — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/settings.html?_t=1779483971812", waiting until "load"[22m

- ✅ Profile page reachable + tips section present
- ✅ Subscriptions page — list + add UI
- ✅ Loans page — add-loan form has amount + APR + months
- ✅ Income page reachable
- ❌ AI Story (weekly summary) page renders or shows paywall — AI Story page empty
- ✅ Right info-panel: visible AND on the proper side per lang
- ⚠️ No search input on landing
- ✅ Search/filter input on top-bar acts on transactions

</details>