# 🚨 Auth-Flows action items — 2026-05-31

**1 failure(s), 0 warning(s), 6 pass.**

## For Claude to fix:
- ❌ sign out from dashboard → back to auth — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://wizelife.ai/auth.html?_t=1780201154540"
================

---
_<details><summary>Full detail</summary>_

# Auth-Flows QA — 2026-05-31

- ✅ signup with valid credentials → dashboard
- ✅ signup with same email again → "already registered" error
- ✅ signup with weak password → validation error
- ✅ login with the just-created account → dashboard
- ✅ login with wrong password → error shown
- ✅ forgot password — modal/page opens
- ❌ sign out from dashboard → back to auth — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://wizelife.ai/auth.html?_t=1780201154540"
================

</details>