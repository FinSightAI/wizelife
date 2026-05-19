# 🚨 WizeDeal-SecurityV2 action items — 2026-05-19

**0 failure(s), 5 warning(s), 20 pass.**

## For you to investigate:
- ⚠️ CSP allows 'unsafe-inline' without nonce — add per-request nonce
- ⚠️ No numeric input on landing — simulator may live on subroute
- ⚠️ No numeric input on landing — cannot verify negative-input clamp
- ⚠️ No session/auth cookies set — app is likely stateless / token-in-storage
- ⚠️ No CacheStorage entries to inspect — SW may not be active on this app

---
_<details><summary>Full detail</summary>_

# WizeDeal-SecurityV2 QA — 2026-05-19

- ⚠️ CSP allows 'unsafe-inline' without nonce — add per-request nonce
- ✅ CSP: Content-Security-Policy header present + has explicit script-src allow-list
- ✅ HSTS: ≥1y max-age + includeSubDomains + preload
- ✅ Plan tampering: setting wl_sso.plan=pro in localStorage does not unlock Pro UI
- ✅ localStorage hygiene: no API tokens / Firebase ID tokens in unexpected keys
- ✅ Deal data: saved deals in localStorage do not include user PII (email, phone, full name)
- ✅ CORS: /api/* does not return Access-Control-Allow-Origin: * with credentials
- ✅ CSRF: POST /api/analyze rejects mismatched Origin
- ✅ XSS in deal form: <script> in property name renders as text, no alert()
- ⚠️ No numeric input on landing — simulator may live on subroute
- ✅ Mortgage inputs: extreme numeric values do not crash / produce NaN-only output
- ⚠️ No numeric input on landing — cannot verify negative-input clamp
- ✅ Negative input: price=-1 does not yield negative monthly payment
- ✅ WizeDisclaimer gate: cannot be bypassed via ?nodisclaimer / ?skipDisclaimer URL param
- ⚠️ No session/auth cookies set — app is likely stateless / token-in-storage
- ✅ Cookies: any auth/session cookie has Secure + HttpOnly + SameSite
- ✅ iframe sandbox: any embedded iframe declares sandbox
- ✅ Permissions-Policy: camera + microphone locked down
- ✅ Referrer-Policy: strict-origin-when-cross-origin (or stricter)
- ✅ Mixed content: no http:// subresource URLs on https page
- ⚠️ No CacheStorage entries to inspect — SW may not be active on this app
- ✅ SW scope: service worker does not cache /api/* responses
- ✅ Endpoint enumeration: /api/admin + /api/internal + /api/debug return 404
- ✅ Clickjacking: X-Frame-Options DENY or CSP frame-ancestors none
- ✅ Vercel leakage: no /_vercel/deployment metadata or VERCEL_TOKEN in client bundle

</details>