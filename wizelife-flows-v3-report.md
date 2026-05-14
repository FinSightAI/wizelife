# 🚨 WizeLife-FlowsV3 action items — 2026-05-14

**1 failure(s), 2 warning(s), 14 pass.**

## For Claude to fix:
- ❌ Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge) — not all tool-card links have wl_token query string

## For you to investigate:
- ⚠️ No error feedback after invalid code
- ⚠️ No login-alert text on dashboard

---
_<details><summary>Full detail</summary>_

# WizeLife-FlowsV3 QA — 2026-05-14

- ✅ Google sign-in button exists on auth.html
- ✅ Upgrade modal shows Pro + YOLO comparison
- ✅ Access-code input accepts text
- ⚠️ No error feedback after invalid code
- ✅ Apply invalid code → user-facing error
- ✅ Theme persists across reload
- ✅ Language persists across reload
- ✅ Feedback form: empty submit → validation
- ✅ 404 page: nonexistent path returns friendly 404 page (not raw error)
- ✅ GA / Clarity analytics scripts load
- ✅ Performance: first content paint < 5 s on landing
- ⚠️ No login-alert text on dashboard
- ✅ Login alerts toggle exists in settings
- ✅ Account-delete uses confirmation dialog (not single-click)
- ❌ Cross-origin: app card links go via wizelife.ai dashboard (SSO bridge) — not all tool-card links have wl_token query string
- ✅ Service Worker waitForActive event fires within 10 s
- ✅ Footer has links to about / privacy / terms

</details>