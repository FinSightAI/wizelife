# 🚨 Extended action items — 2026-05-12

**0 failure(s), 1 warning(s), 8 pass.**

## For you to investigate / fix:
- ⚠️ DKIM MISSING for google._domainkey.wizelife.ai — **fix:** enable in Gmail Admin Console (or your wizelife.ai@gmail.com — only works with Google Workspace)

---
_<details><summary>Full detail</summary>_

# Extended checks — 2026-05-12T23:24:03.580Z

## Tier 13f — SW cache integrity

- ✅ https://wizelife.ai/sw.js: all 21 shell assets reachable
- ✅ https://money.wizelife.ai/sw.js: all 70 shell assets reachable

## Tier 13h — Email DNS records (wizelife.ai)

- ✅ SPF found: `v=spf1 include:_spf.google.com ~all`
- ✅ DMARC found: `v=DMARC1; p=quarantine; rua=mailto:security@wizelife.ai`
- ⚠️  DKIM MISSING for google._domainkey.wizelife.ai

## Tier 13i — Rate-limit live test

- ✅ approveBugReport survived 12 rapid invalid calls, all rejected (12×401, 0×other).

## Tier 13j — Open redirect probes

- ✅ /auth.html?redirect=https://evil.example/ safe — attacker param ignored
- ✅ /auth.html?next=//evil.example/ safe — attacker param ignored
- ✅ /dashboard.html?return_to=https://evil.example/ safe — attacker param ignored

</details>