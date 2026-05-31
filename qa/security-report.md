# 🚨 Action items — 2026-05-30

**0 failure(s), 1 warning(s), 18 pass.**

## For you to investigate:
- ⚠️ https://travel.wizelife.ai/ header probe error: timeout

---
_<details><summary>Full report (passes + checks)</summary>_

# Security report — 2026-05-30T04:16:59.049Z

## Tier 13a — JS parse-check (catches silent SyntaxErrors)

- ✅ wizelife.ai/js/wizelife-auth.js parses
- ✅ wizelife.ai/js/wize-bottom-nav.js parses
- ✅ wizelife.ai/js/wize-onboarding.js parses
- ✅ wizelife.ai/js/wize-hamburger.js parses
- ✅ wizelife.ai/js/wize-disclaimer.js parses
- ✅ wizelife.ai/js/sw-register.js parses
- ✅ money.wizelife.ai/js/sidebar.js parses
- ✅ money.wizelife.ai/js/app.js parses
- ✅ money.wizelife.ai/js/wize-bottom-nav.js parses

## Tier 13 — Security regression

- ✅ HSTS header present with preload: `max-age=31536000; includeSubDomains; preload`
- ✅ reCAPTCHA site key found in /
- ✅ reCAPTCHA site key found in /auth.html
- ✅ reCAPTCHA site key found in /dashboard.html
- ✅ reCAPTCHA site key found in /feedback.html
- ✅ Firestore rejects unauthenticated reads (status=400, good).
- ✅ approveBugReport rejects invalid ADMIN_TOKEN (401).
- ✅ https://tax.wizelife.ai/ has HSTS + X-Content-Type-Options
- ✅ https://deal.wizelife.ai/ has HSTS + X-Content-Type-Options
- ⚠️  https://travel.wizelife.ai/ header probe error: timeout

## Tier 14 — External scanners (weekly)

_Skipped (runs Sundays only)._

---
</details>