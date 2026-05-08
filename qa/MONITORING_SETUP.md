# Real-Time Monitoring Setup

After-launch checklist. Daily QA catches infrastructure regressions; these
catch user-experience problems within minutes instead of 24h.

## 1. UptimeRobot — downtime alerts (5 min)

Free tier: 50 monitors, 5-min check interval, email/SMS/Telegram alerts.

1. Sign up at https://uptimerobot.com (free).
2. Add monitor for each app:
   - `https://wizelife.ai/`
   - `https://finsightai.github.io/finsight/`
   - `https://tax.wizelife.ai/advisor`
   - `https://check-deal.vercel.app/`
   - `https://vitara.onrender.com/`
   - `https://master-backend-79jx.onrender.com/health`
3. Alert contacts: add your email + (optional) Telegram bot for instant.
4. Status page: free public status page at `stats.uptimerobot.com/<id>` —
   you can embed it on `wizelife.ai/status`.

## 2. Sentry — JS error tracking (10 min)

Free tier: 5K events/month. Catches every JS error your users hit, with
stack trace + browser + user metadata.

1. Sign up at https://sentry.io (free).
2. Create project per app:
   - `wizelife-web`        (Vanilla JS)
   - `wizemoney`           (Vanilla JS)
   - `wizetax`             (Next.js)
   - `wizedeal`            (Next.js)
   - `wizehealth`          (Vanilla JS)
3. Each project gives you a DSN like `https://abc@o12345.ingest.sentry.io/67890`.
4. Add to each app:

   **WizeLife / WizeMoney / WizeHealth (Vanilla):**
   Add to `<head>` after the theme script:
   ```html
   <script src="https://browser.sentry-cdn.com/7.119.0/bundle.min.js" crossorigin="anonymous"></script>
   <script>
     Sentry.init({
       dsn: 'YOUR_DSN_HERE',
       tracesSampleRate: 0.1,
       environment: 'production',
       beforeSend(event) {
         // strip PII
         if (event.user) delete event.user.email;
         return event;
       },
     });
   </script>
   ```

   **WizeTax / WizeDeal (Next.js):**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
   Then paste the DSN when prompted.

5. **Privacy:** the `beforeSend` hook above strips emails. For full GDPR
   compliance also strip URLs that contain wl_token.

## 3. Microsoft Clarity — session replay + heatmaps (5 min)

Free, unlimited. See exactly what users click, where they drop off, where
they rage-click.

1. Sign up at https://clarity.microsoft.com (free).
2. Create a project per app (or one project for all — your call).
3. Each project gives you a code snippet — paste in `<head>`:
   ```html
   <script type="text/javascript">
     (function(c,l,a,r,i,t,y){
         c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
         t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
         y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
     })(window, document, "clarity", "script", "YOUR_PROJECT_ID");
   </script>
   ```
4. Wait 24h — first sessions appear in dashboard.

## 4. PostHog — product analytics (15 min)

Free tier: 1M events/month, 5K session replays. Funnels, retention,
A/B tests, feature flags.

1. Sign up at https://posthog.com (free).
2. Project gives an API key like `phc_abcdef`.
3. Add to each app's `<head>`:
   ```html
   <script>
     !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,...)}(document,window.posthog||[]);
     posthog.init('YOUR_KEY', { api_host: 'https://us.i.posthog.com' });
   </script>
   ```
   (Full snippet in PostHog dashboard under Project Settings.)
4. Optional: `posthog.identify(uid)` after Firebase login to associate events
   with users.

## 5. Add to all apps — quick checklist

| App | Sentry | Clarity | PostHog | UptimeRobot |
|---|---|---|---|---|
| WizeLife (landing) | [ ] | [ ] | [ ] | [ ] |
| WizeMoney | [ ] | [ ] | [ ] | [ ] |
| WizeTax | [ ] | [ ] | [ ] | [ ] |
| WizeTravel | [ ] | [ ] | [ ] | [ ] |
| WizeHealth | [ ] | [ ] | [ ] | [ ] |
| WizeDeal | [ ] | [ ] | [ ] | [ ] |

## 6. After all 4 are live

You'll have:
- **5-min downtime alerts** (UptimeRobot)
- **Every JS error** seen by any user (Sentry)
- **Session replays** of users dropping off (Clarity)
- **Funnels & retention** to know what features users actually use (PostHog)

Combined cost in your usage tier: **$0/mo**.

## 7. Daily QA workflow already covers

Don't duplicate — these are already in the daily run:
- HTTP status, latency, console errors (Tier 1)
- Lighthouse perf/a11y/SEO (Tier 2)
- Auth E2E (Tier 3)
- axe-core a11y deep (Tier 4)
- SEO meta tags (Tier 5)
- PWA validity (Tier 6)
- Multi-viewport responsive (Tier 7)
- Cross-app SSO (Tier 8)
- i18n 4 languages (Tier 10)
- Third-party APIs probe (Tier 11)
- Cold-start latency (Tier 12)
- E2E flows for each app (Tier 14)
