# 🚨 Browser-extra action items — 2026-05-13

**2 failure(s), 1 warning(s), 13 pass.**

## For Claude to fix:
- ❌ untranslated i18n key on https://money.wizelife.ai/: `nav.aiTools` shows raw `AI` — **fix:** add the key to all 4 langs in i18n dictionary
- ❌ untranslated i18n key on https://money.wizelife.ai/: `dashboard.title` shows raw `WizeMoney` — **fix:** add the key to all 4 langs in i18n dictionary

## For you to investigate:
- ⚠️ WebKit not available: browserType.launch: Executable doesn't exist at /Users/s/Library/Caches/ms-playwright/webkit-2287/pw_run.sh
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝ — **fix:** install via "npx playwright install webkit"

---
_<details><summary>Full detail</summary>_

# Browser-extra checks — 2026-05-13T00:01:06.200Z

## Tier 13n — i18n missing-key detector

- ✅ wizelife.ai/: all data-i18n keys rendered as translations
- ✅ wizelife.ai/auth.html: all data-i18n keys rendered as translations
- ✅ wizelife.ai/dashboard.html: all data-i18n keys rendered as translations
- ❌ untranslated i18n key on https://money.wizelife.ai/: `nav.aiTools` shows raw `AI`
- ❌ untranslated i18n key on https://money.wizelife.ai/: `dashboard.title` shows raw `WizeMoney`
- ✅ tax.wizelife.ai/: all data-i18n keys rendered as translations
- ✅ deal.wizelife.ai/: all data-i18n keys rendered as translations

## Tier 13o — Mobile vs Desktop layout

- ✅ wizelife.ai/: mobile layout fits viewport
- ✅ wizelife.ai/auth.html: mobile layout fits viewport
- ✅ wizelife.ai/dashboard.html: mobile layout fits viewport
- ✅ money.wizelife.ai/: mobile layout fits viewport
- ✅ tax.wizelife.ai/: mobile layout fits viewport
- ✅ deal.wizelife.ai/: mobile layout fits viewport

## Tier 13p — Cross-browser (Chromium vs WebKit)

- ⚠️  WebKit not available: browserType.launch: Executable doesn't exist at /Users/s/Library/Caches/ms-playwright/webkit-2287/pw_run.sh
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
## Tier 13q — PWA + offline shell

- ✅ PWA manifest valid (start_url=/dashboard.html)
- ✅ SW serves cached shell when offline

## Tier 13r — End-to-end sign-in

- ℹ️ Skipped — set QA_EMAIL + QA_PASSWORD env vars (already configured as GitHub Actions secrets).

## Tier 13s — Cross-app SSO

- ℹ️ Skipped (Tier 13r did not sign in).

</details>