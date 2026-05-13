# 🚨 WizeTax action items — 2026-05-13

**3 failure(s), 0 warning(s), 6 pass.**

## For Claude to fix:
- ❌ Send "What is VAT?" → assistant responds (>20 chars) — page.waitForFunction: Timeout 30000ms exceeded.
- ❌ No CSP violations in console — 3 CSP errors: Loading the script 'https://wizelife.ai/js/wize-disclaimer.js' violates the following Content Security Policy directive:
- ❌ Language switch: HE → EN affects UI — still rtl after EN click

---
_<details><summary>Full detail</summary>_

# WizeTax QA — 2026-05-13

- ✅ / loads
- ✅ /advisor loads
- ✅ /reports reachable (redirect or page)
- ✅ /profile reachable (redirect or page)
- ✅ Advisor: chat input visible
- ❌ Send "What is VAT?" → assistant responds (>20 chars) — page.waitForFunction: Timeout 30000ms exceeded.
- ❌ No CSP violations in console — 3 CSP errors: Loading the script 'https://wizelife.ai/js/wize-disclaimer.js' violates the following Content Security Policy directive:
- ❌ Language switch: HE → EN affects UI — still rtl after EN click
- ✅ iPhone (390×844): no h-overflow

</details>