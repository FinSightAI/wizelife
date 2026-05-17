# 🚨 WizeLife-FlowsV3 action items — 2026-05-16

**3 failure(s), 3 warning(s), 12 pass.**

## For Claude to fix:
- ❌ Theme persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Language persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge) — not all tool-card links carry wl_token (query or fragment)

## For you to investigate:
- ⚠️ No error feedback after invalid code
- ⚠️ No analytics script detected — may be ad-blocked in headless
- ⚠️ No login-alert text on dashboard

---
_<details><summary>Full detail</summary>_

# WizeLife-FlowsV3 QA — 2026-05-16

- ✅ Google sign-in button exists on auth.html
- ✅ Upgrade modal shows Pro + YOLO comparison
- ✅ Access-code input accepts text
- ⚠️ No error feedback after invalid code
- ✅ Apply invalid code → user-facing error
- ❌ Theme persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Language persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ✅ Feedback form: empty submit → validation
- ✅ 404 page: nonexistent path returns friendly 404 page (not raw error)
- ⚠️ No analytics script detected — may be ad-blocked in headless
- ✅ GA / Clarity analytics scripts load
- ✅ Performance: first content paint < 5 s on landing
- ⚠️ No login-alert text on dashboard
- ✅ Login alerts toggle exists in settings
- ✅ Account-delete uses confirmation dialog (not single-click)
- ❌ Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge) — not all tool-card links carry wl_token (query or fragment)
- ✅ Service Worker waitForActive event fires within 10 s
- ✅ Footer has links to about / privacy / terms

</details>