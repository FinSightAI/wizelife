# 🚨 WizeMoney action items — 2026-05-22

**3 failure(s), 1 warning(s), 11 pass.**

## For Claude to fix:
- ❌ /pages/stocks.html reachable — page.goto: net::ERR_SOCKET_NOT_CONNECTED at https://money.wizelife.ai/pages/stocks.html
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html", waiting until "load"[22m

- ❌ /pages/reports.html reachable — page.goto: Timeout 20000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/reports.html", waiting until "load"[22m

- ❌ /pages/settings.html reachable — page.goto: Timeout 20000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/settings.html", waiting until "load"[22m


## For you to investigate:
- ⚠️ auth flows skipped — no QA_EMAIL/QA_PASSWORD

---
_<details><summary>Full detail</summary>_

# WizeMoney QA — 2026-05-22

- ✅ Home loads
- ✅ /pages/income.html reachable
- ✅ /pages/bank.html reachable
- ✅ /pages/credit.html reachable
- ❌ /pages/stocks.html reachable — page.goto: net::ERR_SOCKET_NOT_CONNECTED at https://money.wizelife.ai/pages/stocks.html
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/stocks.html", waiting until "load"[22m

- ✅ /pages/goals.html reachable
- ❌ /pages/reports.html reachable — page.goto: Timeout 20000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/reports.html", waiting until "load"[22m

- ❌ /pages/settings.html reachable — page.goto: Timeout 20000ms exceeded.
Call log:
[2m  - navigating to "https://money.wizelife.ai/pages/settings.html", waiting until "load"[22m

- ✅ /pages/profile.html reachable
- ✅ /pages/preferences.html reachable
- ✅ /pages/ai-chat.html reachable
- ✅ /pages/investment-advisor.html reachable
- ⚠️ auth flows skipped — no QA_EMAIL/QA_PASSWORD
- ✅ iPhone (390×844): income page no h-overflow
- ✅ SSO plan badge code present

</details>