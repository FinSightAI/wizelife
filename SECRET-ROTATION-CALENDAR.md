# Secret Rotation — Quarterly Calendar

Each rotation limits the blast radius of a leaked key to ≤ 90 days. Copy the events below into Google Calendar (or any reminder system you check).

**Recurrence:** every 90 days (quarterly), all-day, with a 1-day-prior 09:00 email reminder.

---

## Event 1 — Firebase service account key

```
Title:        🔐 Rotate Firebase service account key (functions deploy)
Start:        2026-08-15 (next 90-day cycle from 2026-05-17)
Recurrence:   Every 90 days
Description:
  Where:   Google Cloud Console → IAM & Admin → Service Accounts
           → firebase-adminsdk-* → Keys tab
  Action:  Create new key → download JSON → set as `FIREBASE_SERVICE_ACCOUNT`
           secret in GitHub (or wherever functions auto-deploy reads it)
           → wait 1 day → delete old key.
  Verify:  `firebase deploy --only functions` succeeds with new key.
```

## Event 2 — Gemini API key

```
Title:        🔐 Rotate Gemini API key
Start:        2026-08-15
Recurrence:   Every 90 days
Description:
  Where:   Google AI Studio → API keys
  Action:  Create new key → update `GEMINI_API_KEY` (Firebase Functions config
           or Vercel env var) → redeploy → delete old key after 24h.
  Verify:  Test an /api/chat call in each app (FinSight, Vitara, Tax Master).
```

## Event 3 — Resend API key (email digest)

```
Title:        🔐 Rotate Resend API key
Start:        2026-08-15
Recurrence:   Every 90 days
Description:
  Where:   resend.com → API Keys
  Action:  Create new key → update `RESEND_API_KEY` in Firebase Functions
           config → redeploy email-digest function → delete old key.
  Verify:  Trigger a test digest manually.
```

## Event 4 — Tavily API key (AI web grounding)

```
Title:        🔐 Rotate Tavily API key
Start:        2026-08-15
Recurrence:   Every 90 days
Description:
  Where:   app.tavily.com → API Keys
  Action:  Create new key → update `TAVILY_API_KEY` (Render/Vercel env var
           on backends that call Tavily) → redeploy → delete old key.
  Verify:  WizeTravel/Tax Master AI grounding still returns search results.
```

## Event 5 — PayPal webhook secret (when activated)

```
Title:        🔐 Rotate PayPal webhook secret (skip while PAYWALL_ACTIVE=false)
Start:        2026-08-15
Recurrence:   Every 90 days
Description:
  Where:   PayPal Developer → Apps → WizeLife → Webhooks
  Action:  Generate new webhook ID → update `PAYPAL_WEBHOOK_ID` in Firebase
           Functions config → redeploy paypalWebhook → delete old webhook.
  Verify:  Send test event from PayPal sandbox dashboard.
```

---

## Bonus — Yearly (not quarterly):

```
Title:        🔐 Rotate GitHub Personal Access Token (if any)
Recurrence:   Yearly
Description:
  Where:    github.com → Settings → Developer settings → Personal access tokens
  Action:   Audit which tokens exist, what scopes, which workflows use them.
            Rotate or revoke unused.
```

---

## What NOT to rotate

- **Firebase API key in `firebase-config.js`** — designed to be public; security
  is enforced via Firestore Rules + App Check, not via key secrecy. Rotating
  it requires redeploying every page that uses it.
- **reCAPTCHA site key** — public by design.
- **GA / Cloudflare Analytics tokens** — public.

These are listed in `security.html` § 2 ("Secrets handling") as intentionally public.
