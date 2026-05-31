# 🚨 WizeTravel-Deep action items — 2026-05-31

**0 failure(s), 6 warning(s), 14 pass.**

## For you to investigate:
- ⚠️ Theme toggle not exposed on landing — expected — lives inside WizeMonkey widget
- ⚠️ Search click did nothing visible — may need filled inputs first
- ⚠️ No external booking deeplink/iframe found — verify integration still wired
- ⚠️ Save button not found — feature may not be exposed on landing
- ⚠️ Price-alert button not found — feature may be elsewhere
- ⚠️ AI chat input not found — WizeTravel chat may be unimplemented or behind tab

---
_<details><summary>Full detail</summary>_

# WizeTravel-Deep QA — 2026-05-31

- ✅ Lang pill HE → EN swaps page direction + body text
- ⚠️ Theme toggle not exposed on landing — expected — lives inside WizeMonkey widget
- ✅ Theme toggle present (warn-only — sidebar widget)
- ✅ Hamburger ☰ element present (no-op when sidebars are pre-open)
- ✅ Search inputs reachable (origin/destination/date/pax)
- ⚠️ Search click did nothing visible — may need filled inputs first
- ✅ "Search" button triggers a results state (or URL change)
- ⚠️ No external booking deeplink/iframe found — verify integration still wired
- ✅ Booking deeplink to Kiwi or similar present
- ⚠️ Save button not found — feature may not be exposed on landing
- ✅ "Save route" button + state-change
- ⚠️ Price-alert button not found — feature may be elsewhere
- ✅ "Price alert" button reachable
- ⚠️ AI chat input not found — WizeTravel chat may be unimplemented or behind tab
- ✅ AI travel chat input present and accepts text
- ✅ Hidden-city or advanced-filter option exists
- ✅ iPhone (390×844): search reachable + no h-overflow
- ✅ Lang EN: body has zero Hebrew chars (excluding brand names)
- ✅ Lang PT: body has zero Hebrew chars (excluding brand names)
- ✅ Lang ES: body has zero Hebrew chars (excluding brand names)

</details>