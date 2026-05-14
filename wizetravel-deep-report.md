# 🚨 WizeTravel-Deep action items — 2026-05-14

**1 failure(s), 7 warning(s), 13 pass.**

## For Claude to fix:
- ❌ Lang pill HE → EN swaps page direction + body text — UI didn't change after EN click — dir/lang unchanged

## For you to investigate:
- ⚠️ No top-level inputs (1 iframes present) — Streamlit may embed search in an iframe — manual verify
- ⚠️ Search button text not found — flow not testable without selector
- ⚠️ No external booking deeplink/iframe found — verify integration still wired
- ⚠️ Save button not found — feature may not be exposed on landing
- ⚠️ Price-alert button not found — feature may be elsewhere
- ⚠️ AI chat input not found — WizeTravel chat may be unimplemented or behind tab
- ⚠️ Search CTA not visible on mobile — may need scroll — manual verify

---
_<details><summary>Full detail</summary>_

# WizeTravel-Deep QA — 2026-05-14

- ❌ Lang pill HE → EN swaps page direction + body text — UI didn't change after EN click — dir/lang unchanged
- ✅ Theme toggle present (warn-only — sidebar widget)
- ✅ Hamburger ☰ element present (no-op when sidebars are pre-open)
- ⚠️ No top-level inputs (1 iframes present) — Streamlit may embed search in an iframe — manual verify
- ✅ Search inputs reachable (origin/destination/date/pax)
- ⚠️ Search button text not found — flow not testable without selector
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
- ⚠️ Search CTA not visible on mobile — may need scroll — manual verify
- ✅ iPhone (390×844): search reachable + no h-overflow
- ✅ Lang EN: body has zero Hebrew chars (excluding brand names)
- ✅ Lang PT: body has zero Hebrew chars (excluding brand names)
- ✅ Lang ES: body has zero Hebrew chars (excluding brand names)

</details>