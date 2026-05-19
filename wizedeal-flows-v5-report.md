# 🚨 WizeDeal-FlowsV5 action items — 2026-05-19

**1 failure(s), 13 warning(s), 21 pass.**

## For Claude to fix:
- ❌ Onboarding modal: ✕ close button is ≥44px (today's a11y fix) — ✕ only 30×30px (need ≥44)

## For you to investigate:
- ⚠️ No numeric inputs on landing — form may be wizard-gated
- ⚠️ Down-payment field not found on landing — may be inside wizard
- ⚠️ Interest-rate field not found on landing — may be inside mortgage simulator route
- ⚠️ No /mortgage|/simulator|/calc route returned <500 — may be inline component only
- ⚠️ No currency-formatted number near monthly text
- ⚠️ No plausible percentage values (1–30%) on landing
- ⚠️ Onboarding backdrop not present on landing — modal may auto-close after first view
- ⚠️ No Spanish-specific words after ES click
- ⚠️ No SW registrations (Next.js apps may not use SW) — check vercel.json / next.config
- ⚠️ No CacheStorage entries — app may be SSR-only / no SW caching
- ⚠️ No Vercel Analytics / Speed-Insights beacons captured — verify d22e2f6 / 7bdeace deployed
- ⚠️ No Speed Insights script tag detected — package may inject via beacon only
- ⚠️ 17/21 buttons <40px tall on mobile

---
_<details><summary>Full detail</summary>_

# WizeDeal-FlowsV5 QA — 2026-05-19

- ⚠️ No numeric inputs on landing — form may be wizard-gated
- ✅ Deal form: price field accepts large numeric input
- ⚠️ Down-payment field not found on landing — may be inside wizard
- ✅ Deal form: down-payment field accepts percentage / value
- ⚠️ Interest-rate field not found on landing — may be inside mortgage simulator route
- ✅ Deal form: interest-rate field accepts decimal input
- ⚠️ No /mortgage|/simulator|/calc route returned <500 — may be inline component only
- ✅ Mortgage simulator route reachable (not 500)
- ⚠️ No currency-formatted number near monthly text
- ✅ Mortgage simulator: outputs non-zero monthly payment text
- ✅ Mortgage: amortization / tenure period mentioned (years)
- ✅ ROI / cap-rate feature copy present
- ⚠️ No plausible percentage values (1–30%) on landing
- ✅ ROI math sanity: 5–15% mentioned somewhere (plausible range)
- ✅ Tax + market comparison feature mentioned
- ✅ WizeDisclaimer gate: appears or already-accepted state recognized
- ✅ WizeDisclaimer: localStorage acceptance flag writable + readable
- ❌ Onboarding modal: ✕ close button is ≥44px (today's a11y fix) — ✕ only 30×30px (need ≥44)
- ⚠️ Onboarding backdrop not present on landing — modal may auto-close after first view
- ✅ Onboarding: backdrop tap dismisses modal (or no-op if absent)
- ✅ i18n: PT pill switches UI to Portuguese
- ⚠️ No Spanish-specific words after ES click
- ✅ i18n: ES pill switches UI to Spanish
- ✅ i18n: language pills are UPPERCASE (EN/ES/PT/HE)
- ⚠️ No SW registrations (Next.js apps may not use SW) — check vercel.json / next.config
- ✅ Service Worker registered + controller exists
- ⚠️ No CacheStorage entries — app may be SSR-only / no SW caching
- ✅ Service Worker version bump: cache key reflects v3 if SW exists
- ⚠️ No Vercel Analytics / Speed-Insights beacons captured — verify d22e2f6 / 7bdeace deployed
- ✅ Vercel Analytics beacon: /_vercel/insights/* requested
- ⚠️ No Speed Insights script tag detected — package may inject via beacon only
- ✅ Vercel Speed Insights script tag present
- ⚠️ 17/21 buttons <40px tall on mobile
- ✅ Mobile (390×844): primary CTA button reachable + ≥44px tap target
- ✅ No console errors on landing (CSP / mixed-content / JS)

</details>