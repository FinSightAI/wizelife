# 🚨 WizeDeal-FlowsV2 action items — 2026-05-14

**2 failure(s), 3 warning(s), 8 pass.**

## For Claude to fix:
- ❌ Listing textarea accepts long Hebrew text — locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first() to be visible[22m

- ❌ Listing textarea accepts long English text — locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first() to be visible[22m


## For you to investigate:
- ⚠️ countries missing from default view: Portugal
- ⚠️ Only one currency symbol detected — multi-currency may need selection
- ⚠️ No file input on landing — image upload may be inside the "New Deal" wizard

---
_<details><summary>Full detail</summary>_

# WizeDeal-FlowsV2 QA — 2026-05-14

- ❌ Listing textarea accepts long Hebrew text — locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first() to be visible[22m

- ❌ Listing textarea accepts long English text — locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('textarea').first() to be visible[22m

- ⚠️ countries missing from default view: Portugal
- ✅ Country selector — has Israel + Portugal + Brazil at minimum
- ✅ Country-specific fees (Israel Mas Rechisha, Brazil ITBI) — mentioned somewhere
- ✅ Saved-deal data persists in localStorage
- ⚠️ Only one currency symbol detected — multi-currency may need selection
- ✅ Currency change reflects in displayed prices
- ✅ CSP allows wizelife.ai (for shared assets) + Clarity
- ✅ Plan badge: clearly visible (Free/Pro/YOLO) when logged in
- ✅ "My deals" or saved deals tab/list exists
- ⚠️ No file input on landing — image upload may be inside the "New Deal" wizard
- ✅ Image upload (listing photos) — file input present somewhere

</details>