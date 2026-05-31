# 🚨 API action items — 2026-05-31

**2 failure(s), 6 pass.**

## For Claude to fix:
- ❌ captureLeadEmail XSS guard broken — returned 204 for <script> email — **fix:** In functions/index.js captureLeadEmail: add /[<>"'`]/.test(b.email) guard before email parse
- ❌ captureLeadEmail accepts invalid email (no @): status=204 — **fix:** Email validation check must run before any Firestore write

---
_<details><summary>Full detail</summary>_

# API contract — 2026-05-31T04:18:30.748Z

- ✅ validateCode rejects no-auth (UNAUTHENTICATED).
- ✅ awardReferral rejects no-auth (UNAUTHENTICATED).
- ✅ notifyLoginAlert returns {skipped:no-auth} on no-auth (correct).
- ✅ approveBugReport rejects invalid ADMIN_TOKEN (401).
- ✅ approveBugReport rejects missing token (401).
- ✅ paypalWebhook rejects unsigned payload (403).
- ❌ captureLeadEmail XSS guard broken — returned 204 for <script> email
- ❌ captureLeadEmail accepts invalid email (no @): status=204
---
</details>