# 🚨 Extended action items — 2026-05-14

**1 failure(s), 0 warning(s), 8 pass.**

## For Claude to fix:
- ❌ SW shell asset 404: https://money.wizelife.ai/./pages/stocks.html (cached by https://money.wizelife.ai/sw.js) — **fix:** remove ./pages/stocks.html from SHELL[] in https://money.wizelife.ai/sw.js OR restore the file

---
_<details><summary>Full detail</summary>_

# Extended checks — 2026-05-14T22:36:55.825Z

## Tier 13f — SW cache integrity

- ✅ https://wizelife.ai/sw.js: all 21 shell assets reachable
- ❌ SW shell asset 404: https://money.wizelife.ai/./pages/stocks.html (cached by https://money.wizelife.ai/sw.js)

## Tier 13h — Email DNS records (wizelife.ai)

- ✅ SPF found: `v=spf1 include:_spf.google.com include:amazonses.com ~all`
- ✅ DMARC found: `v=DMARC1; p=quarantine; rua=mailto:security@wizelife.ai`
- ✅ DKIM (resend._domainkey) found

## Tier 13i — Rate-limit live test

- ✅ approveBugReport survived 12 rapid invalid calls, all rejected (12×401, 0×other).

## Tier 13j — Open redirect probes

- ✅ /auth.html?redirect=https://evil.example/ safe — attacker param ignored
- ✅ /auth.html?next=//evil.example/ safe — attacker param ignored
- ✅ /dashboard.html?return_to=https://evil.example/ safe — attacker param ignored

</details>