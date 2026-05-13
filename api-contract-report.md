# 🚨 API action items — 2026-05-12

✅ **6 contract checks passed — every Cloud Function rejects bad input the expected way.**
---
_<details><summary>Full detail</summary>_

# API contract — 2026-05-12T23:52:49.581Z

- ✅ validateCode rejects no-auth (UNAUTHENTICATED).
- ✅ awardReferral rejects no-auth (UNAUTHENTICATED).
- ✅ notifyLoginAlert returns {skipped:no-auth} on no-auth (correct).
- ✅ approveBugReport rejects invalid ADMIN_TOKEN (401).
- ✅ approveBugReport rejects missing token (401).
- ✅ paypalWebhook rejects unsigned payload (403).
---
</details>