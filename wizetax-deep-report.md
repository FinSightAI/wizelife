# 🚨 WizeTax-Deep action items — 2026-05-16

**2 failure(s), 3 warning(s), 11 pass.**

## For Claude to fix:
- ❌ Lang switch HE → EN updates UI — UI text + dir identical after EN click
- ❌ Routes /reports + /profile reachable (not 404) — broken: /reports → err

## For you to investigate:
- ⚠️ Send button not found — cannot test chat
- ⚠️ Country comparison copy not visible — feature may be tab-gated
- ⚠️ No number inputs found — simulator may be on separate page

---
_<details><summary>Full detail</summary>_

# WizeTax-Deep QA — 2026-05-16

- ✅ Advisor page loads + textarea present
- ✅ No CSP violations on first load
- ⚠️ Send button not found — cannot test chat
- ✅ Send "What is VAT?" → assistant streams reply
- ⚠️ Country comparison copy not visible — feature may be tab-gated
- ✅ Country comparison tab/section exists
- ⚠️ No number inputs found — simulator may be on separate page
- ✅ Income simulator — find a number input + currency
- ✅ Payslip upload — file input present
- ✅ Language pills HE/EN/PT/ES render
- ❌ Lang switch HE → EN updates UI — UI text + dir identical after EN click
- ✅ No Hebrew leak in EN mode
- ❌ Routes /reports + /profile reachable (not 404) — broken: /reports → err
- ✅ CSP allows wizelife.ai scripts (no blocked external)
- ✅ iPhone (390×844): advisor textarea reachable + no overflow
- ✅ OECD 2025 label visible (not stale 2024)

</details>