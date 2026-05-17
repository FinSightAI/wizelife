# 🚨 WizeMoney-Deep action items — 2026-05-16

**2 failure(s), 4 warning(s), 13 pass.**

## For Claude to fix:
- ❌ Language switch HE → EN actually updates UI — UI text identical after EN click
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 4 Hebrew strings still rendered (sample: "👁 תצוגה מקדימה", "📊 סיכום פיננסי", "📧 מייל", "↑ שתף")

## For you to investigate:
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ⚠️ Add-goal button not found — may be on a different page
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page

---
_<details><summary>Full detail</summary>_

# WizeMoney-Deep QA — 2026-05-16

- ✅ Landing renders + ≥3 sidebar links
- ✅ Service Worker registers + manifest valid
- ✅ Sidebar pages reachable — at least 5 distinct hrefs return 200
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ✅ "Add transaction" modal opens
- ⚠️ Add-goal button not found — may be on a different page
- ✅ "Add savings goal" reachable
- ❌ Language switch HE → EN actually updates UI — UI text identical after EN click
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 4 Hebrew strings still rendered (sample: "👁 תצוגה מקדימה", "📊 סיכום פיננסי", "📧 מייל", "↑ שתף")
- ✅ Net-worth widget renders some value
- ✅ Stocks page — free user sees paywall, Pro sees content
- ✅ AI chat input present + send-able (Pro acct)
- ✅ Export CSV button present
- ✅ Family dashboard — link or feature exists
- ✅ iPhone (390×844): no horizontal overflow
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ✅ Bottom-nav (mobile) reachable + 5 entries
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page
- ✅ SW update banner appears on stale page (forced)

</details>