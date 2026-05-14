# 🚨 WizeDeal-Deep action items — 2026-05-14

**3 failure(s), 4 warning(s), 9 pass.**

## For Claude to fix:
- ❌ Landing loads + paste-listing textarea reachable — locator.waitFor: Timeout 25000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first()[22m

- ❌ Lang switch HE → EN updates UI — UI unchanged after EN click
- ❌ Route /analyze reachable (not 404) — /analyze → 404

## For you to investigate:
- ⚠️ No country selector/flags detected on landing
- ⚠️ Only 3 country flags detected (expected ≥15) — verify list rendered
- ⚠️ No plan badge text/icon detected — may show only when logged-in
- ⚠️ Textarea not visible on mobile — may need scroll

---
_<details><summary>Full detail</summary>_

# WizeDeal-Deep QA — 2026-05-14

- ❌ Landing loads + paste-listing textarea reachable — locator.waitFor: Timeout 25000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first()[22m

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
- ❌ Route /analyze reachable (not 404) — /analyze → 404
- ⚠️ Textarea not visible on mobile — may need scroll
- ✅ iPhone (390×844): textarea reachable + no overflow
- ✅ No back-arrow "← All Tools" on sub-app pages

</details>