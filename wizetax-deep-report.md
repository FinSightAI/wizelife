# 🚨 WizeTax-Deep action items — 2026-05-14

**4 failure(s), 4 warning(s), 9 pass.**

## For Claude to fix:
- ❌ No CSP violations on first load — 3 CSP errors (sample: Loading the script 'https://wizelife.ai/js/wize-disclaimer.js' violates the following Content Securi)
- ❌ Routes /reports + /profile reachable (not 404) — broken: /reports → 404, /profile → 404
- ❌ CSP allows wizelife.ai scripts (no blocked external) — CSP missing wizelife.ai in script-src
- ❌ OECD 2025 label visible (not stale 2024) — OECD label still 2023 or 2024

## For you to investigate:
- ⚠️ Send button not found — cannot test chat
- ⚠️ Country comparison copy not visible — feature may be tab-gated
- ⚠️ No number inputs found — simulator may be on separate page
- ⚠️ EN pill not found

---
_<details><summary>Full detail</summary>_

# WizeTax-Deep QA — 2026-05-14

- ✅ Advisor page loads + textarea present
- ❌ No CSP violations on first load — 3 CSP errors (sample: Loading the script 'https://wizelife.ai/js/wize-disclaimer.js' violates the following Content Securi)
- ⚠️ Send button not found — cannot test chat
- ✅ Send "What is VAT?" → assistant streams reply
- ⚠️ Country comparison copy not visible — feature may be tab-gated
- ✅ Country comparison tab/section exists
- ⚠️ No number inputs found — simulator may be on separate page
- ✅ Income simulator — find a number input + currency
- ✅ Payslip upload — file input present
- ✅ Language pills HE/EN/PT/ES render
- ⚠️ EN pill not found
- ✅ Lang switch HE → EN updates UI
- ✅ No Hebrew leak in EN mode
- ❌ Routes /reports + /profile reachable (not 404) — broken: /reports → 404, /profile → 404
- ❌ CSP allows wizelife.ai scripts (no blocked external) — CSP missing wizelife.ai in script-src
- ✅ iPhone (390×844): advisor textarea reachable + no overflow
- ❌ OECD 2025 label visible (not stale 2024) — OECD label still 2023 or 2024

</details>