# 🚨 WizeDeal-FlowsV2 action items — 2026-05-16

**1 failure(s), 3 warning(s), 9 pass.**

## For Claude to fix:
- ❌ CSP allows wizelife.ai (for shared assets) + Clarity — apiRequestContext.head: Timeout 10000ms exceeded.
Call log:
[2m  - → HEAD https://deal.wizelife.ai/[22m
[2m    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Headl

## For you to investigate:
- ⚠️ countries missing from default view: Portugal
- ⚠️ Only one currency symbol detected — multi-currency may need selection
- ⚠️ No file input on landing — image upload may be inside the "New Deal" wizard

---
_<details><summary>Full detail</summary>_

# WizeDeal-FlowsV2 QA — 2026-05-16

- ✅ Listing textarea accepts long Hebrew text
- ✅ Listing textarea accepts long English text
- ⚠️ countries missing from default view: Portugal
- ✅ Country selector — has Israel + Portugal + Brazil at minimum
- ✅ Country-specific fees (Israel Mas Rechisha, Brazil ITBI) — mentioned somewhere
- ✅ Saved-deal data persists in localStorage
- ⚠️ Only one currency symbol detected — multi-currency may need selection
- ✅ Currency change reflects in displayed prices
- ❌ CSP allows wizelife.ai (for shared assets) + Clarity — apiRequestContext.head: Timeout 10000ms exceeded.
Call log:
[2m  - → HEAD https://deal.wizelife.ai/[22m
[2m    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Headl
- ✅ Plan badge: clearly visible (Free/Pro/YOLO) when logged in
- ✅ "My deals" or saved deals tab/list exists
- ⚠️ No file input on landing — image upload may be inside the "New Deal" wizard
- ✅ Image upload (listing photos) — file input present somewhere

</details>