# 🚨 WizeLife-Deep action items — 2026-05-16

**3 failure(s), 0 warning(s), 11 pass.**

## For Claude to fix:
- ❌ Landing / loads + CTA visible — locator.waitFor: Timeout 8000ms exceeded.
Call log:
[2m  - waiting for locator('a[href*="auth"], button:has-text("Sign up"), button:has-text("הרשמה"), a:has-text("Get Started"), a:has-text("התחל")').first() to be visibl
- ❌ Forgot password link triggers modal/page — Forgot-password link missing
- ❌ Dashboard — all 5 app cards reachable — missing app cards: tax.wizelife.ai

---
_<details><summary>Full detail</summary>_

# WizeLife-Deep QA — 2026-05-16

- ❌ Landing / loads + CTA visible — locator.waitFor: Timeout 8000ms exceeded.
Call log:
[2m  - waiting for locator('a[href*="auth"], button:has-text("Sign up"), button:has-text("הרשמה"), a:has-text("Get Started"), a:has-text("התחל")').first() to be visibl
- ✅ auth.html — Sign In + Sign Up tabs both reachable
- ✅ Signup form has password strength rule (≥8, mixed case, digit, special)
- ❌ Forgot password link triggers modal/page — Forgot-password link missing
- ✅ about.html loads + 4-lang switcher works
- ✅ Security, terms, privacy pages all load + have ToC/sections
- ✅ feedback.html — form present + submit-able
- ✅ Login flow → dashboard.html
- ❌ Dashboard — all 5 app cards reachable — missing app cards: tax.wizelife.ai
- ✅ Dashboard — SSO tokens injected into app card hrefs
- ✅ Sign-out button exits to landing/auth
- ✅ iPhone (390×844) landing: no overflow
- ✅ No Hebrew leak in EN mode (landing)
- ✅ No "← All Tools" back-arrow anywhere on portal

</details>