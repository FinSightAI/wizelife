# 🚨 WizeTax action items — 2026-05-22

**2 failure(s), 0 warning(s), 7 pass.**

## For Claude to fix:
- ❌ Send "What is VAT?" → assistant responds (>20 chars) — page.waitForFunction: Timeout 30000ms exceeded.
- ❌ Language switch: HE → EN affects UI — locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('[data-wl-lang="en"], button:has-text("EN"), [data-lang="en"]').first()[22m
[2m    - locator resolved to <button data-wl-lang="en">EN</butt

---
_<details><summary>Full detail</summary>_

# WizeTax QA — 2026-05-22

- ✅ / loads
- ✅ /advisor loads
- ✅ /reports reachable (redirect or page)
- ✅ /profile reachable (redirect or page)
- ✅ Advisor: chat input visible
- ❌ Send "What is VAT?" → assistant responds (>20 chars) — page.waitForFunction: Timeout 30000ms exceeded.
- ✅ No CSP violations in console
- ❌ Language switch: HE → EN affects UI — locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('[data-wl-lang="en"], button:has-text("EN"), [data-lang="en"]').first()[22m
[2m    - locator resolved to <button data-wl-lang="en">EN</butt
- ✅ iPhone (390×844): no h-overflow

</details>