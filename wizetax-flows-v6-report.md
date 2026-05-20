# 🚨 WizeTax-FlowsV6 action items — 2026-05-20

**9 failure(s), 8 warning(s), 25 pass.**

## For Claude to fix:
- ❌ Relocation: negative gross is rejected / clamped (no NaN, no crash) — NaN/undefined/Infinity surfaced for negative gross
- ❌ Social-compare: no NaN / undefined in rendered table — NaN/undefined/Infinity present in social-compare body
- ❌ Failover: /api/chat timeout/abort → no uncaught page error — uncaught page error on aborted /api/chat: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ❌ Rate-limit UX: 429 does not throw an uncaught error — uncaught error on 429: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ❌ Back/forward: forward navigation re-reaches advisor without error — page error during back/forward: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ❌ Mobile (Pixel 7): onboarding modal is dismissible (✕ or Escape) — locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('[aria-label*="close" i], button.modal-close, .onboarding-close, button:has-text("✕"), button:has-text("×")').first()[22m
[2m    -
- ❌ i18n: EN → html dir flips to ltr — EN mode dir still rtl
- ❌ i18n: PT → ltr + no Hebrew leak on visible buttons — PT mode dir still rtl
- ❌ i18n: ES → ltr + Spanish copy detected — ES mode dir still rtl

## For you to investigate:
- ⚠️ olim toggle not found
- ⚠️ olim toggle not found
- ⚠️ no non-IL country chips on social-compare — IL-vs-world comparison may not be rendering
- ⚠️ no visible friendly error message after 502 — UI survived but gives no feedback to user
- ⚠️ no friendly 429 / throttle message shown — rate-limit should explain the wait, not fail silently
- ⚠️ no Speed Insights / Analytics beacon observed — may need dashboard toggle enabled on this Vercel project
- ⚠️ chip tap height 27px < 40px target — small tap target on Pixel 7
- ⚠️ advisor input did not focus on tap (iPhone) — keyboard may not open for users

---
_<details><summary>Full detail</summary>_

# WizeTax-FlowsV6 QA — 2026-05-20

- ✅ Advisor RAG: "מה המס בפורטוגל?" → answer cites a number
- ✅ Advisor RAG: response contains NO hedge words (בערך/approximately/around)
- ✅ Advisor RAG: a source / citation tag is shown with the answer
- ❌ Relocation: negative gross is rejected / clamped (no NaN, no crash) — NaN/undefined/Infinity surfaced for negative gross
- ✅ Relocation: gross = 0 produces a sane (zero or empty) result
- ✅ Relocation: huge gross (999,999,999) does not break layout / NaN
- ⚠️ olim toggle not found
- ✅ Relocation: rapid olim toggle on/off ×6 leaves consistent state
- ⚠️ olim toggle not found
- ✅ Relocation: regime badges (⭐) toggle on AND off with olim button
- ✅ Exit-tax: fill fields → a computed currency figure appears
- ✅ Exit-tax: form input fields are present (≥2) and editable
- ✅ Exit-tax: route does not 404 and body has real content
- ⚠️ no non-IL country chips on social-compare — IL-vs-world comparison may not be rendering
- ✅ Social-compare: renders IL alongside ≥1 other country
- ✅ Social-compare: shows contribution rate (%) figures
- ❌ Social-compare: no NaN / undefined in rendered table — NaN/undefined/Infinity present in social-compare body
- ⚠️ no visible friendly error message after 502 — UI survived but gives no feedback to user
- ✅ Failover: /api/chat 502 → UI shows graceful error (no white screen)
- ❌ Failover: /api/chat timeout/abort → no uncaught page error — uncaught page error on aborted /api/chat: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ✅ Failover: 500 from backend keeps chat input usable for retry
- ⚠️ no friendly 429 / throttle message shown — rate-limit should explain the wait, not fail silently
- ✅ Rate-limit UX: simulated 429 surfaces a friendly throttle message
- ❌ Rate-limit UX: 429 does not throw an uncaught error — uncaught error on 429: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ✅ Scroll-lock: /advisor body IS locked but /relocation-analyzer is NOT
- ✅ Scroll-lock: /social-compare and /exit-tax pages are scrollable
- ⚠️ no Speed Insights / Analytics beacon observed — may need dashboard toggle enabled on this Vercel project
- ✅ Speed Insights: /_vercel/speed-insights/script.js or insights beacon present
- ✅ Speed Insights: /_vercel/speed-insights/script.js HTTP status
- ✅ Back/forward: nav relocation→advisor→back restores relocation
- ✅ Back/forward: chip selection persists across back navigation
- ❌ Back/forward: forward navigation re-reaches advisor without error — page error during back/forward: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-mi
- ⚠️ chip tap height 27px < 40px target — small tap target on Pixel 7
- ✅ Mobile (Pixel 7): /relocation-analyzer chips are tappable (≥40px)
- ✅ Mobile (Pixel 7): no horizontal overflow on /relocation-analyzer
- ❌ Mobile (Pixel 7): onboarding modal is dismissible (✕ or Escape) — locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('[aria-label*="close" i], button.modal-close, .onboarding-close, button:has-text("✕"), button:has-text("×")').first()[22m
[2m    -
- ⚠️ advisor input did not focus on tap (iPhone) — keyboard may not open for users
- ✅ Mobile (iPhone 14 Pro): /advisor chat input is reachable + focusable
- ✅ i18n: HE → html dir is rtl
- ❌ i18n: EN → html dir flips to ltr — EN mode dir still rtl
- ❌ i18n: PT → ltr + no Hebrew leak on visible buttons — PT mode dir still rtl
- ❌ i18n: ES → ltr + Spanish copy detected — ES mode dir still rtl

</details>