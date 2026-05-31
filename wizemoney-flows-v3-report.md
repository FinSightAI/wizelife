# 🚨 WizeMoney-FlowsV3 action items — 2026-05-22

**2 failure(s), 4 warning(s), 18 pass.**

## For Claude to fix:
- ❌ /pages/loans.html — page loads + content > 200 chars — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/loans.html?_t=1779483971371", waiting until "load"[22m

- ❌ CSP header present + restrictive — No CSP header

## For you to investigate:
- ⚠️ Sidebar lang pills not found
- ⚠️ only 0/4 onboarding categories visible
- ⚠️ bottom-nav has 0 items (expected ≥4)
- ⚠️ No theme toggle button found

---
_<details><summary>Full detail</summary>_

# WizeMoney-FlowsV3 QA — 2026-05-22

- ✅ /pages/bank.html — page loads + content > 200 chars
- ✅ /pages/credit.html — page loads + content > 200 chars
- ✅ /pages/stocks.html — page loads + content > 200 chars
- ✅ /pages/goals.html — page loads + content > 200 chars
- ❌ /pages/loans.html — page loads + content > 200 chars — page.goto: Timeout 45000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/loans.html?_t=1779483971371", waiting until "load"[22m

- ✅ /pages/income.html — page loads + content > 200 chars
- ✅ /pages/subscriptions.html — page loads + content > 200 chars
- ⚠️ Sidebar lang pills not found
- ✅ Sidebar lang switcher saves to localStorage
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