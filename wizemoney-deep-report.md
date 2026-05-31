# 🚨 WizeMoney-Deep action items — 2026-05-31

**1 failure(s), 6 warning(s), 14 pass.**

## For Claude to fix:
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 1 Hebrew strings still rendered (sample: "🔒 אחסון מקומי")

## For you to investigate:
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ⚠️ Add-goal button not found — may be on a different page
- ⚠️ skipped — no test creds set
- ⚠️ skipped — no test creds
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page

---
_<details><summary>Full detail</summary>_

# WizeMoney-Deep QA — 2026-05-31

- ✅ Landing renders + ≥3 sidebar links
- ✅ Service Worker registers + manifest valid
- ✅ Sidebar pages reachable — at least 5 distinct hrefs return 200
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ✅ "Add transaction" modal opens
- ⚠️ Add-goal button not found — may be on a different page
- ✅ "Add savings goal" reachable
- ✅ Language switch HE → EN actually updates UI
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 1 Hebrew strings still rendered (sample: "🔒 אחסון מקומי")
- ✅ Net-worth widget renders some value
- ⚠️ skipped — no test creds set
- ✅ Stocks page — free user sees paywall, Pro sees content
- ⚠️ skipped — no test creds
- ✅ AI chat input present + send-able (Pro acct)
- ✅ Export CSV button present
- ✅ Family dashboard — link or feature exists
- ✅ iPhone (390×844): no horizontal overflow
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ✅ Bottom-nav (mobile) reachable + 5 entries
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page
- ✅ SW update banner appears on stale page (forced)

</details>