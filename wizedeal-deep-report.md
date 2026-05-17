# 🚨 WizeDeal-Deep action items — 2026-05-16

**2 failure(s), 3 warning(s), 10 pass.**

## For Claude to fix:
- ❌ Lang switch HE → EN updates UI — UI unchanged after EN click
- ❌ Route /analyze reachable (not 404) — /analyze → err

## For you to investigate:
- ⚠️ No country selector/flags detected on landing
- ⚠️ Only 3 country flags detected (expected ≥15) — verify list rendered
- ⚠️ No plan badge text/icon detected — may show only when logged-in

---
_<details><summary>Full detail</summary>_

# WizeDeal-Deep QA — 2026-05-16

- ✅ Landing loads + paste-listing textarea reachable
- ✅ Paste listing → "Analyze" button reachable
- ⚠️ No country selector/flags detected on landing
- ✅ Country selector / filter present
- ✅ No CSP violations
- ✅ Language pills exist (4 langs)
- ❌ Lang switch HE → EN updates UI — UI unchanged after EN click
- ✅ No Hebrew leak in EN mode
- ⚠️ Only 3 country flags detected (expected ≥15) — verify list rendered
- ✅ 20 countries listed (we added 8 in last wave)
- ⚠️ No plan badge text/icon detected — may show only when logged-in
- ✅ Plan badge in sidebar (Free/Pro/YOLO)
- ❌ Route /analyze reachable (not 404) — /analyze → err
- ✅ iPhone (390×844): textarea reachable + no overflow
- ✅ No back-arrow "← All Tools" on sub-app pages

</details>