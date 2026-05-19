# 🚨 WizeHealth-FlowsV5 action items — 2026-05-19

**6 failure(s), 7 warning(s), 16 pass.**

## For Claude to fix:
- ❌ Cold-start: HTML response status 200 within 45s — status 503 in 271ms
- ❌ AI chat input is enabled (not readonly/disabled) — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first()[22m

- ❌ AI chat accepts typed text without errors — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first() to be visible[22m

- ❌ Send button enabled (or Enter binding) after text typed — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first() to be visible[22m

- ❌ HE mode: Hebrew chars detected in DOM text — no Hebrew chars in HE mode
- ❌ Mobile 390×844: send button (or chat input) reachable above fold — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Send"), #sendBtn, button[type=submit], #txt, textarea').first()[22m


## For you to investigate:
- ⚠️ No onboarding modal visible — may auto-skip
- ⚠️ No onboarding modal — skipped
- ⚠️ No PT-specific words found — check pt locale completeness
- ⚠️ No ES-specific words found — check es locale completeness
- ⚠️ No file inputs visible — may be lazy-loaded
- ⚠️ No SW registered — PWA install affected
- ⚠️ No sw.js found — PWA may be disabled

---
_<details><summary>Full detail</summary>_

# WizeHealth-FlowsV5 QA — 2026-05-19

- ✅ Cold-start: 2nd request faster than 1st (warmup observed)
- ❌ Cold-start: HTML response status 200 within 45s — status 503 in 271ms
- ✅ Cold-start: page eventually paints body content even if slow
- ✅ HSTS header present with preload-eligible max-age
- ✅ X-Frame-Options or CSP frame-ancestors blocks framing
- ✅ CSP header is present (any policy)
- ❌ AI chat input is enabled (not readonly/disabled) — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first()[22m

- ❌ AI chat accepts typed text without errors — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first() to be visible[22m

- ❌ Send button enabled (or Enter binding) after text typed — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [role=textbox]').first() to be visible[22m

- ⚠️ No onboarding modal visible — may auto-skip
- ✅ Onboarding modal close (✕) hit-target >= 44px when open
- ⚠️ No onboarding modal — skipped
- ✅ Onboarding modal: clicking ✕ actually dismisses it
- ❌ HE mode: Hebrew chars detected in DOM text — no Hebrew chars in HE mode
- ⚠️ No PT-specific words found — check pt locale completeness
- ✅ PT mode: Portuguese marker words (saúde/médico/conversa)
- ⚠️ No ES-specific words found — check es locale completeness
- ✅ ES mode: Spanish marker words (salud/médico/consulta)
- ⚠️ No file inputs visible — may be lazy-loaded
- ✅ File input accepts at least one document MIME (pdf/image)
- ✅ Lab upload UI: no inline script in file name preview (XSS guard)
- ✅ Protected API endpoint returns 401 without token
- ✅ GET /api/health (if any) does not leak server internals
- ⚠️ No SW registered — PWA install affected
- ✅ Service Worker registers on landing
- ⚠️ No sw.js found — PWA may be disabled
- ✅ SW cache version is current (vitara-v50 or higher)
- ❌ Mobile 390×844: send button (or chat input) reachable above fold — locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Send"), #sendBtn, button[type=submit], #txt, textarea').first()[22m

- ✅ Mobile 360×640 (small Android): no text clipping in headers

</details>