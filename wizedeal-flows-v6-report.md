# 🚨 WizeDeal-FlowsV6 action items — 2026-05-20

**1 failure(s), 17 warning(s), 31 pass.**

## For Claude to fix:
- ❌ parse-listing: malformed body does not 500 (graceful 4xx) — malformed body → 500 (should be 4xx)

## For you to investigate:
- ⚠️ chat gated/limited (503) — auth or quota — cannot verify grounding
- ⚠️ No numeric inputs on landing (wizard-gated)
- ⚠️ No numeric inputs on landing
- ⚠️ Interest field not on landing — inside wizard
- ⚠️ Down-payment field not on landing
- ⚠️ No positive currency value near monthly payment
- ⚠️ No numeric inputs to stress ROI
- ⚠️ No cap-rate/gross/net yield labels on landing — metrics inside deal results
- ⚠️ No deal/saved localStorage keys after landing — state may live in IndexedDB or server
- ⚠️ No disclaimer / not-advice copy on landing — shown only at AI gate
- ⚠️ No SW registration on WizeDeal (Next.js often SSR-only)
- ⚠️ No CacheStorage entries (no SW caching)
- ⚠️ No Speed-Insights beacon captured — verify @vercel/speed-insights mounted + dashboard toggle ON
- ⚠️ No Vercel Analytics beacon captured — verify @vercel/analytics + Analytics toggle ON in dashboard
- ⚠️ parse-listing returned 500 — should fail gracefully (4xx)
- ⚠️ 7 interactive elements overflow 390px width — horizontal clipping
- ⚠️ Lang pill tiny on mobile (32×23px) — hard to tap

---
_<details><summary>Full detail</summary>_

# WizeDeal-FlowsV6 QA — 2026-05-20

- ✅ AI chat: /api/ai/chat rejects empty messages (400) — input validation
- ⚠️ chat gated/limited (503) — auth or quota — cannot verify grounding
- ✅ AI chat: response is grounded — no invented price when deal numbers fixed
- ✅ AI insights: /api/ai/insights does not 500 on minimal valid body
- ⚠️ No numeric inputs on landing (wizard-gated)
- ✅ Mortgage edge: price=0 does not crash / produce NaN in UI
- ⚠️ No numeric inputs on landing
- ✅ Mortgage edge: negative price rejected or clamped (no negative payment)
- ⚠️ Interest field not on landing — inside wizard
- ✅ Mortgage edge: interest=100% does not freeze / NaN
- ⚠️ Down-payment field not on landing
- ✅ Mortgage edge: loan amount > price handled (no crash)
- ⚠️ No positive currency value near monthly payment
- ✅ Mortgage edge: 0% down does not produce negative or zero monthly payment
- ⚠️ No numeric inputs to stress ROI
- ✅ ROI/cap-rate: extreme inputs do not yield >100% yield in UI
- ⚠️ No cap-rate/gross/net yield labels on landing — metrics inside deal results
- ✅ ROI/cap-rate: cap-rate label distinct from gross/net yield
- ✅ ROI/cap-rate: cash-on-cash return concept referenced
- ✅ /profile: noindex robots meta present (added today)
- ✅ /saved: noindex robots meta present (added today)
- ✅ /profile: renders without crash (no Next.js error overlay)
- ✅ /saved: renders empty-state OR a saved-deals list
- ✅ Deal save: a deal written to localStorage survives reload
- ⚠️ No deal/saved localStorage keys after landing — state may live in IndexedDB or server
- ✅ Deal load: a real saved-deals key exists in localStorage namespace
- ✅ Deal store: localStorage JSON values parse without throwing
- ✅ WizeDisclaimer: gate fires on landing OR script is loaded
- ⚠️ No disclaimer / not-advice copy on landing — shown only at AI gate
- ✅ WizeDisclaimer: AI feature copy implies a disclaimer is required
- ⚠️ No SW registration on WizeDeal (Next.js often SSR-only)
- ✅ Service Worker: registration present OR app is SSR-only (no SW)
- ⚠️ No CacheStorage entries (no SW caching)
- ✅ Service Worker v3: cache key carries v3 marker if any cache exists
- ⚠️ No Speed-Insights beacon captured — verify @vercel/speed-insights mounted + dashboard toggle ON
- ✅ Vercel Speed Insights beacon fires (/_vercel/speed-insights)
- ⚠️ No Vercel Analytics beacon captured — verify @vercel/analytics + Analytics toggle ON in dashboard
- ✅ Vercel Analytics beacon fires (/_vercel/insights/event)
- ⚠️ parse-listing returned 500 — should fail gracefully (4xx)
- ✅ parse-listing: POST with pasted listing text → JSON or graceful error
- ❌ parse-listing: malformed body does not 500 (graceful 4xx) — malformed body → 500 (should be 4xx)
- ✅ parse-listing: URL paste (yad2/zillow) recognized in extraction flow UI
- ⚠️ 7 interactive elements overflow 390px width — horizontal clipping
- ✅ Mobile (390×844): bottom-nav / primary CTA not clipped off-screen
- ✅ i18n HE: Hebrew sets dir=rtl on documentElement
- ✅ i18n EN: English pill yields LTR + English copy
- ✅ i18n: all 4 lang pills (EN/ES/PT/HE) present in DOM
- ⚠️ Lang pill tiny on mobile (32×23px) — hard to tap
- ✅ Mobile i18n: language switcher reachable + tappable on 390px width

</details>