# Hidden on landing page — 2026-10-11 (reversible)

Hidden because the apps are demos that don't really work yet; only FitBite and WizeMoney are live-quality.
Nothing was deleted. Everything is wrapped in markers in `index.html`:

- HTML: `<!-- WL-HIDDEN-BEGIN <name> … WL-HIDDEN-END <name> -->` (remove the two comment lines to restore)
- JS: lines prefixed `// WL-HIDDEN 2026-10-11`
- Elements: `hidden data-wl-hidden="2026-10-11"` (remove both attributes)
- guides-strip: inside the comment every `--` was written as `- -`; replace back with `--` when restoring.
- Names: wizetravel, wizetax, wizehealth, wizedeal, testimonials, pricing-subscription, fake-live-feed,
  ai-demo-section, savings-calculator, compare-all-in-one, hero-tools-4-apps, footer-4-apps,
  inflated-claims-26-countries-20-markets, guides-strip, original-json-ld (original structured data).
- A DOM shim (`WL-HIDDEN-SHIM`) keeps old JS from crashing on removed ids; remove it when restoring.

Old text values (js/wl-landing-i18n.js):
- `5_ai_` en: "Five AI tools for every important decision in your life. Built with love, everywhere."
  he: "5 כלי AI לכל החלטה חשובה בחייך. נבנה באהבה, בכל מקום."
  pt: "Cinco ferramentas IA para cada decisão importante da sua vida. Feito com amor, em todo lugar."
  es: "Cinco herramientas IA para cada decisión importante de tu vida. Hecho con amor, en todas partes."
- `join_thousands_makin` ended: en "…Free to start, upgrade when you want." he "…חינם להתחלה, שדרגו מתי שתרצו."
  pt "…Grátis para começar, atualize quando quiser." es "…Gratis para empezar, actualiza cuando quieras."

Also: sw.js cache bumped to v247; `wl-landing-i18n.js?v=2026101101`.

## Round 2 (same day)
- dashboard.html: block `dashboard-4-app-cards` (the 4 hidden app cards). Their JS is null-guarded; the cold-start ping loop (TARGETS) still pings the hidden backends.
- llms.txt: the 4 app bullets + the old Pricing line sit in a trailing `<!-- WL-HIDDEN ... -->` comment; Pricing now names only WizeMoney and FitBite.
- sitemap.xml: 7 URLs (tax-compare, tax/health/travel/deal subdomains, aliyah-tax-guide) wrapped in `<!-- WL-HIDDEN 2026-10-11 ... -->`.
- Purchase (PayPal) code intentionally left in place (Ofir: fine if someone buys; WizeMoney, later FitBite).

## Round 3
- dashboard.html + account.html: `prewarmBackends` TARGETS emptied (stops 30s pings to hidden backends); old URLs kept in a `WL-HIDDEN` comment right after.
- WizeHealth Cloud Run service (finzilla-7f1f9 / us-central1 / wizehealth): public access removed 2026-10-11 (it exposed /api/chat with openAccess:true).
  Restore: gcloud run services add-iam-policy-binding wizehealth --region us-central1 --project finzilla-7f1f9 --member=allUsers --role=roles/run.invoker
- Note: billing-kill-switch is LIVE (SIMULATE_DEACTIVATION=False); the "Firebase Project finzilla-7f1f9" budget of ILS 20/month, if exceeded, disables billing for the whole project.
