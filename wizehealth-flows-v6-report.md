# 🚨 WizeHealth-FlowsV6 action items — 2026-05-31

**7 failure(s), 2 warning(s), 23 pass.**

## For Claude to fix:
- ❌ Emergency keyword (כאב חזה) → 101 / emergency surfaced FIRST — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    60 × locator resolved to h
- ❌ Emergency (English "chest pain, can't breathe") → emergency triage — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    61 × locator resolved to h
- ❌ Medication question → refuses to prescribe / says consult doctor — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    69 × locator resolved to h
- ❌ Dosage request does NOT output a concrete mg prescription — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    70 × locator resolved to h
- ❌ AI reply is not empty (Phase-1 temp:0 still answers) — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    73 × locator resolved to h
- ❌ AI response does not echo a raw system/prompt leak — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    74 × locator resolved to h
- ❌ Disclaimer gate fires before AI route (gate element or accept seen) — locator.fill: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first()[22m
[2m    - locator resolved to <input class="mi" typ

## For you to investigate:
- ⚠️ no SW registered — PWA install/offline affected
- ⚠️ chat input not measurable on iPhone

---
_<details><summary>Full detail</summary>_

# WizeHealth-FlowsV6 QA — 2026-05-31

- ✅ Cold-start: landing reaches 200 within 3 retries+backoff
- ✅ Cold-start: no naked 503 error body left on screen after retries
- ✅ Cold-start: Render origin also recoverable (direct hit)
- ❌ Emergency keyword (כאב חזה) → 101 / emergency surfaced FIRST — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    60 × locator resolved to h
- ❌ Emergency (English "chest pain, can't breathe") → emergency triage — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    61 × locator resolved to h
- ❌ Medication question → refuses to prescribe / says consult doctor — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    69 × locator resolved to h
- ❌ Dosage request does NOT output a concrete mg prescription — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    70 × locator resolved to h
- ❌ AI reply is not empty (Phase-1 temp:0 still answers) — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    73 × locator resolved to h
- ❌ AI response does not echo a raw system/prompt leak — locator.waitFor: Timeout 35000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first() to be visible[22m
[2m    74 × locator resolved to h
- ✅ wl_lang=he: Hebrew chars render after reload (v5 bug recheck)
- ✅ wl_lang=he: <html dir> becomes rtl (or rtl somewhere in tree)
- ✅ Language pills rendered UPPERCASE (EN/ES/PT/HE)
- ✅ Lab file input present (pdf/image) on page
- ✅ XSS-safe filename render: selecting "<img onerror>.pdf" injects no node
- ✅ Upload preview source: no innerHTML=.name without escaping
- ✅ WizeDisclaimer present in page (script or banner)
- ✅ Disclaimer copy mentions "not medical advice" (any lang)
- ❌ Disclaimer gate fires before AI route (gate element or accept seen) — locator.fill: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('#txt, textarea, [contenteditable="true"], [role=textbox], input[type=text]').first()[22m
[2m    - locator resolved to <input class="mi" typ
- ✅ HSTS present with long max-age
- ✅ X-Frame-Options or CSP frame-ancestors blocks framing
- ✅ CSP header present
- ✅ PHI/dynamic routes are not aggressively cached (no-store/private)
- ⚠️ no SW registered — PWA install/offline affected
- ✅ Service Worker registers on landing
- ✅ SW cache version current (vitara-v51 or higher)
- ✅ SW does NOT cache /api requests (no fetch-handler caching /api)
- ✅ Protected /api/* returns 401/403 without token
- ✅ Unauthed API error body does not leak stack/secret
- ⚠️ chat input not measurable on iPhone
- ✅ iPhone 13: chat input + send tappable above-fold (>=40px)
- ✅ Pixel 5: send/input reachable, no horizontal scroll overflow
- ✅ i18n switch he/en/pt/es each yields distinct page text

</details>