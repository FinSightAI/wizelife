# 🚨 Auth-Flows action items — 2026-05-16

**4 failure(s), 0 warning(s), 3 pass.**

## For Claude to fix:
- ❌ signup with valid credentials → dashboard — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1778947990523", waiting until "load"[22m

- ❌ signup with same email again → "already registered" error — expected "already registered" error, got none or wrong text
- ❌ login with the just-created account → dashboard — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- ❌ sign out from dashboard → back to auth — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================

---
_<details><summary>Full detail</summary>_

# Auth-Flows QA — 2026-05-16

- ❌ signup with valid credentials → dashboard — page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "https://wizelife.ai/auth.html?_t=1778947990523", waiting until "load"[22m

- ❌ signup with same email again → "already registered" error — expected "already registered" error, got none or wrong text
- ✅ signup with weak password → validation error
- ❌ login with the just-created account → dashboard — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- ✅ login with wrong password → error shown
- ✅ forgot password — modal/page opens
- ❌ sign out from dashboard → back to auth — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================

</details>