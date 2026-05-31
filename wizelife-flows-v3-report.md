# 🚨 WizeLife-FlowsV3 action items — 2026-05-22

**5 failure(s), 3 warning(s), 10 pass.**

## For Claude to fix:
- ❌ Access-code input accepts text — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1779483897512", waiting until "load"[22m

- ❌ Apply invalid code → user-facing error — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1779483971586", waiting until "load"[22m

- ❌ Theme persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Language persists across reload — page.reload: net::ERR_ABORTED; maybe frame was detached?
Call log:
[2m  - waiting for navigation until "load"[22m

- ❌ Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge) — not all tool-card links carry wl_token (query or fragment)

## For you to investigate:
- ⚠️ No submit button
- ⚠️ No analytics script detected — may be ad-blocked in headless
- ⚠️ No login-alert text on dashboard

---
_<details><summary>Full detail</summary>_

# WizeLife-FlowsV3 QA — 2026-05-22

- ✅ Google sign-in button exists on auth.html
- ✅ Upgrade modal shows Pro + YOLO comparison
- ❌ Access-code input accepts text — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1779483897512", waiting until "load"[22m

- ❌ Apply invalid code → user-facing error — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1779483971586", waiting until "load"[22m

- ❌ Theme persists across reload — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Language persists across reload — page.reload: net::ERR_ABORTED; maybe frame was detached?
Call log:
[2m  - waiting for navigation until "load"[22m

- ⚠️ No submit button
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