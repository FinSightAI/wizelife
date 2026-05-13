# 🚨 Integration action items — 2026-05-12

**0 failure(s), 6 warning(s), 27 pass.**

## For Claude to fix:
- ⚠️ WizeLife: no hamburger button found (selector "#wize-ham-btn, .mobile-menu-toggle, .mobile-header-toggle, [aria-label*="enu"]") — **fix:** mobile layout may be missing the hamburger
- ⚠️ WizeLife: no #wize-bottom-nav buttons in DOM — **fix:** verify wize-bottom-nav.js loaded + detectApp() matched the host
- ⚠️ WizeMoney: hamburger clicked but drawer didn't open — **fix:** check that click handler is wired and CSS .open class triggers
- ⚠️ WizeTax: ?ob=force did not trigger onboarding — **fix:** check detectApp() in wize-onboarding.js + data-wize-app attr
- ⚠️ WizeHealth: no hamburger button found (selector "#wize-ham-btn, .mobile-menu-toggle, .mobile-header-toggle, [aria-label*="enu"]") — **fix:** mobile layout may be missing the hamburger
- ⚠️ WizeHealth: no #wize-bottom-nav buttons in DOM — **fix:** verify wize-bottom-nav.js loaded + detectApp() matched the host

---
_<details><summary>Full per-app detail</summary>_

# Integration suite — 2026-05-12T23:52:49.737Z

## WizeLife (https://wizelife.ai/dashboard.html)
- ✅ WizeLife: loaded in 2419ms (budget 8s)
- ✅ WizeLife: marker text rendered
- ⚠️  WizeLife: no hamburger button found (selector "#wize-ham-btn, .mobile-menu-toggle, .mobile-header-toggle, [aria-label*="enu"]")
- ⚠️  WizeLife: no #wize-bottom-nav buttons in DOM
- ✅ WizeLife: onboarding skipped on portal (by design)

## WizeMoney (https://money.wizelife.ai/)
- ✅ WizeMoney: loaded in 4855ms (budget 12s)
- ✅ WizeMoney: marker text rendered
- ⚠️  WizeMoney: hamburger clicked but drawer didn't open
- ✅ WizeMoney: bottom-nav has 5 items
- ✅ WizeMoney: onboarding shows with ?ob=force

## WizeTax (https://tax.wizelife.ai/)
- ✅ WizeTax: loaded in 2129ms (budget 25s)
- ✅ WizeTax: marker text rendered
- ✅ WizeTax: hamburger opens drawer
- ✅ WizeTax: Escape closes drawer
- ✅ WizeTax: bottom-nav has 4 items
- ⚠️  WizeTax: ?ob=force did not trigger onboarding

## WizeHealth (https://health.wizelife.ai/)
- ✅ WizeHealth: loaded in 2025ms (budget 25s)
- ✅ WizeHealth: marker text rendered
- ⚠️  WizeHealth: no hamburger button found (selector "#wize-ham-btn, .mobile-menu-toggle, .mobile-header-toggle, [aria-label*="enu"]")
- ⚠️  WizeHealth: no #wize-bottom-nav buttons in DOM
- ✅ WizeHealth: onboarding shows with ?ob=force

## WizeTravel (https://travel.wizelife.ai/)
- ✅ WizeTravel: loaded in 2108ms (budget 25s)
- ✅ WizeTravel: marker text rendered
- ✅ WizeTravel: hamburger opens drawer
- ✅ WizeTravel: Escape closes drawer
- ✅ WizeTravel: bottom-nav has 5 items
- ✅ WizeTravel: onboarding shows with ?ob=force

## WizeDeal (https://deal.wizelife.ai/)
- ✅ WizeDeal: loaded in 2155ms (budget 12s)
- ✅ WizeDeal: marker text rendered
- ✅ WizeDeal: hamburger opens drawer
- ✅ WizeDeal: Escape closes drawer
- ✅ WizeDeal: bottom-nav has 4 items
- ✅ WizeDeal: onboarding shows with ?ob=force

</details>