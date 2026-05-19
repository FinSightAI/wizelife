# 🚨 WizeTax-FlowsV5 action items — 2026-05-19

**7 failure(s), 7 warning(s), 28 pass.**

## For Claude to fix:
- ❌ Country selector: Default preset → 8 chips selected — Default preset selected 0 chips, expected 8
- ❌ Olim toggle: button exists and is clickable — Olim toggle not found
- ❌ Olim regime: all 8 named regimes (NHR / Beckham / Non-Dom / 7% / etc) appear — only 3/8 olim regime keywords visible: NHR, Non-Dom, Impatriati
- ❌ i18n: EN click flips html.dir to ltr — html dir still rtl after EN — was "rtl"
- ❌ Vercel Analytics: insights beacon requested on page load — no Vercel Analytics / Speed Insights beacon requested
- ❌ Onboarding modal: ✕ close button is 44×44 (tap target) — ✕ button is 30×30 — must be ≥ 44×44
- ❌ Onboarding modal: Escape key dismisses it — Escape did not dismiss onboarding modal

## For you to investigate:
- ⚠️ All preset button not found
- ⚠️ Clear left 0 selected:  — expected only IL
- ⚠️ Olim toggle not found
- ⚠️ only 1 distinct years on page — chart may use abbreviated labels
- ⚠️ IL=100 and AE≈105 not co-located in text — COL display may use a different format
- ⚠️ only 0 country chips on /salary-compare
- ⚠️ No backdrop element — modal may be inline

---
_<details><summary>Full detail</summary>_

# WizeTax-FlowsV5 QA — 2026-05-19

- ✅ Scroll-lock: /relocation-analyzer body overflow is NOT hidden
- ✅ Scroll-lock: page scrolls past viewport height
- ✅ Scroll-lock: /advisor IS allowed to lock body (opt-in via data-route)
- ✅ Country selector: 13 chips with span[data-code] render
- ✅ Country selector: all 13 expected ISO codes present
- ✅ Country selector: IL chip is locked (aria-disabled=true)
- ❌ Country selector: Default preset → 8 chips selected — Default preset selected 0 chips, expected 8
- ⚠️ All preset button not found
- ✅ Country selector: All preset → 13 selected
- ⚠️ Clear left 0 selected:  — expected only IL
- ✅ Country selector: Clear preset → only IL selected (locked)
- ✅ Country selector: localStorage key wl_selected_countries_pro persists
- ✅ Country selector: chip click filters comparison tbody rows
- ❌ Olim toggle: button exists and is clickable — Olim toggle not found
- ⚠️ Olim toggle not found
- ✅ Olim toggle: ⭐ regime badges appear after toggle
- ❌ Olim regime: all 8 named regimes (NHR / Beckham / Non-Dom / 7% / etc) appear — only 3/8 olim regime keywords visible: NHR, Non-Dom, Impatriati
- ✅ CSP: no frame-src violation in console
- ✅ CSP: no Firebase iframe blocked
- ✅ 10-year chart: SVG renders with multiple lines
- ⚠️ only 1 distinct years on page — chart may use abbreviated labels
- ✅ 10-year chart: axis labels (years 20XX) present
- ⚠️ IL=100 and AE≈105 not co-located in text — COL display may use a different format
- ✅ Cost of Living: AE shown ~105, IL=100 (baseline)
- ✅ Best-pick callout: mentions purchasing power / best choice
- ✅ /exit-tax-calculator: page renders + has form inputs
- ✅ /social-compare: page renders + mentions Bituach Leumi
- ⚠️ only 0 country chips on /salary-compare
- ✅ /salary-compare: route renders + has country comparison
- ✅ i18n: 4 language pills (HE/EN/PT/ES) are uppercase
- ❌ i18n: EN click flips html.dir to ltr — html dir still rtl after EN — was "rtl"
- ✅ i18n: PT mode loads + no Hebrew chip-label leak
- ✅ i18n: ES mode loads + selector strings translate
- ✅ Vercel Speed Insights: /_vercel/insights/script.js returns 200
- ❌ Vercel Analytics: insights beacon requested on page load — no Vercel Analytics / Speed Insights beacon requested
- ❌ Onboarding modal: ✕ close button is 44×44 (tap target) — ✕ button is 30×30 — must be ≥ 44×44
- ❌ Onboarding modal: Escape key dismisses it — Escape did not dismiss onboarding modal
- ⚠️ No backdrop element — modal may be inline
- ✅ Onboarding modal: backdrop click dismisses it
- ✅ Mobile (iPhone 14 Pro): /relocation-analyzer no h-overflow
- ✅ Mobile: country chips wrap (not horizontal scroll)
- ✅ Mobile: onboarding modal fits viewport (no h-overflow with modal open)

</details>