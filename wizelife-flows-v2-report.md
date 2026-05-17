# 🚨 WizeLife-FlowsV2 action items — 2026-05-16

**8 failure(s), 3 warning(s), 4 pass.**

## For Claude to fix:
- ❌ Access-code redeem UI exists on dashboard — No redeem-code UI text on dashboard
- ❌ Referral link section exists on dashboard — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Account deletion / right-to-be-forgotten link exists — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ feedback.html form has fields + submit button — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ sitemap.xml exists — apiRequestContext.get: Timeout 10000ms exceeded.
Call log:
[2m  - → GET https://wizelife.ai/sitemap.xml[22m
[2m    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) H
- ❌ Schema.org Organization JSON-LD present on landing — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Open Graph + Twitter card meta tags complete — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ No "← All Tools" copy on any portal page — page.evaluate: Execution context was destroyed, most likely because of a navigation

## For you to investigate:
- ⚠️ No GDPR export button text
- ⚠️ No cookie banner visible — may be intentional (Israeli law)
- ⚠️ only 0 hreflang link(s) — found: 

---
_<details><summary>Full detail</summary>_

# WizeLife-FlowsV2 QA — 2026-05-16

- ❌ Access-code redeem UI exists on dashboard — No redeem-code UI text on dashboard
- ❌ Referral link section exists on dashboard — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ⚠️ No GDPR export button text
- ✅ GDPR export-data button exists
- ❌ Account deletion / right-to-be-forgotten link exists — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ feedback.html form has fields + submit button — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ⚠️ No cookie banner visible — may be intentional (Israeli law)
- ✅ Cookie / consent banner: present OR explicitly omitted (Israeli law)
- ❌ sitemap.xml exists — apiRequestContext.get: Timeout 10000ms exceeded.
Call log:
[2m  - → GET https://wizelife.ai/sitemap.xml[22m
[2m    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) H
- ✅ robots.txt allows crawling + points to sitemap
- ❌ Schema.org Organization JSON-LD present on landing — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Open Graph + Twitter card meta tags complete — page.evaluate: Execution context was destroyed, most likely because of a navigation
- ⚠️ only 0 hreflang link(s) — found: 
- ✅ hreflang alt links for 4 languages present
- ❌ No "← All Tools" copy on any portal page — page.evaluate: Execution context was destroyed, most likely because of a navigation

</details>