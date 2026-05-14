# 🚨 WizeMoney-Deep action items — 2026-05-14

**2 failure(s), 4 warning(s), 13 pass.**

## For Claude to fix:
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 5 Hebrew strings still rendered (sample: "אני", "מבוגר", "הוסף בן משפחה", "הגיע הזמן לשלוח את הסיכום הפיננסי שלך", "💬 שתף בוואטסאפ")
- ❌ Stocks page — free user sees paywall, Pro sees content — page.goto: net::ERR_ABORTED at https://money.wizelife.ai/pages/stocks.html
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html", waiting until "load"[22m


## For you to investigate:
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ⚠️ Add-goal button not found — may be on a different page
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page

---
_<details><summary>Full detail</summary>_

# WizeMoney-Deep QA — 2026-05-14

- ✅ Landing renders + ≥3 sidebar links
- ✅ Service Worker registers + manifest valid
- ✅ Sidebar pages reachable — at least 5 distinct hrefs return 200
- ⚠️ Add-transaction button not found on landing — may be behind onboarding
- ✅ "Add transaction" modal opens
- ⚠️ Add-goal button not found — may be on a different page
- ✅ "Add savings goal" reachable
- ✅ Language switch HE → EN actually updates UI
- ❌ No Hebrew leaks in EN mode (excl. brand names) — 5 Hebrew strings still rendered (sample: "אני", "מבוגר", "הוסף בן משפחה", "הגיע הזמן לשלוח את הסיכום הפיננסי שלך", "💬 שתף בוואטסאפ")
- ✅ Net-worth widget renders some value
- ❌ Stocks page — free user sees paywall, Pro sees content — page.goto: net::ERR_ABORTED at https://money.wizelife.ai/pages/stocks.html
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html", waiting until "load"[22m

- ✅ AI chat input present + send-able (Pro acct)
- ✅ Export CSV button present
- ✅ Family dashboard — link or feature exists
- ✅ iPhone (390×844): no horizontal overflow
- ⚠️ Bottom-nav has only 0 items (expected ≥3) — verify mobile nav loaded
- ✅ Bottom-nav (mobile) reachable + 5 entries
- ⚠️ SW update banner did not appear when forced — wlShowUpdateBanner may be missing from this page
- ✅ SW update banner appears on stale page (forced)

</details>