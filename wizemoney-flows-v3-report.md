# 🚨 WizeMoney-FlowsV3 action items — 2026-05-16

**2 failure(s), 3 warning(s), 18 pass.**

## For Claude to fix:
- ❌ Sidebar lang switcher saves to localStorage — wl_lang=he after EN click
- ❌ CSP header present + restrictive — No CSP header

## For you to investigate:
- ⚠️ only 0/4 onboarding categories visible
- ⚠️ bottom-nav has 0 items (expected ≥4)
- ⚠️ No theme toggle button found

---
_<details><summary>Full detail</summary>_

# WizeMoney-FlowsV3 QA — 2026-05-16

- ✅ /pages/bank.html — page loads + content > 200 chars
- ✅ /pages/credit.html — page loads + content > 200 chars
- ✅ /pages/stocks.html — page loads + content > 200 chars
- ✅ /pages/goals.html — page loads + content > 200 chars
- ✅ /pages/loans.html — page loads + content > 200 chars
- ✅ /pages/income.html — page loads + content > 200 chars
- ✅ /pages/subscriptions.html — page loads + content > 200 chars
- ❌ Sidebar lang switcher saves to localStorage — wl_lang=he after EN click
- ✅ Right info-panel shows Net Worth label
- ✅ Right info-panel Cross-app advisor link points to wize-ai.html
- ✅ Onboarding overlay shown to fresh user with no data
- ⚠️ only 0/4 onboarding categories visible
- ✅ Onboarding card has bank/credit/savings entries
- ⚠️ bottom-nav has 0 items (expected ≥4)
- ✅ Mobile bottom-nav: 5 entries visible at 390w
- ✅ PWA install banner / Add-to-home meta tags present
- ✅ Dashboard widgets: Net Worth + Quick Stats + Recent activity all render
- ✅ No console.log of email / API key (PII leak check)
- ❌ CSP header present + restrictive — No CSP header
- ✅ All sidebar.* assets load with 2xx status (no broken CSS/JS)
- ⚠️ No theme toggle button found
- ✅ Theme toggle in sidebar exists
- ✅ Performance: bundle transfer size < 3 MB on landing

</details>