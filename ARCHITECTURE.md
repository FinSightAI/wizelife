# WizeLife — Architecture & Specification

> Last updated: 2026-05-22
> Owner: WizeLife / FinSightAI
> Domain: `wizelife.ai`

---

## 1. What is WizeLife?

WizeLife is an **AI-powered life suite** — 5 specialized tools sharing a single
account, plan, and brand. Each sub-app is independently deployed but
authenticates through a unified SSO bridge.

| App | URL | Purpose |
|---|---|---|
| **WizeLife** (landing/dashboard) | https://wizelife.ai | Marketing + account portal |
| **WizeMoney** | https://money.wizelife.ai | Personal finance dashboard |
| **WizeTax** | https://tax.wizelife.ai | International tax advisor |
| **WizeTravel** | https://travel.wizelife.ai | AI trip planner |
| **WizeHealth** | https://health.wizelife.ai | Medical Q&A + records |
| **WizeDeal** | https://deal.wizelife.ai | Real-estate deal analyzer |

---

## 1.1 Infrastructure Map (where everything is managed)

> Topology snapshot 2026-05-22 (post Render→Cloud Run migration). **Policy: this
> topology is frozen — each tool runs on the host that fits it. Do NOT re-migrate
> a working app; every such change cascades into bugs. Standardize only on a real
> trigger (a provider causes recurring pain, a teammate is onboarded, or scale
> demands unified deploy/observability).**

| App | Public URL | Frontend host | Frontend repo | Backend | Backend host | DNS |
|---|---|---|---|---|---|---|
| WizeLife (portal) | wizelife.ai | GitHub Pages | `FinSightAI/wizelife` | — | — | Cloudflare (orange) → GitHub Pages |
| WizeMoney | money.wizelife.ai | GitHub Pages | `FinSightAI/finsight` | AI → Cloud Run `wizetax-backend` `/api/ai-proxy`; prices → Cloudflare Worker (Yahoo proxy) | Cloud Run + CF Worker | Cloudflare (orange) → GitHub Pages |
| WizeTax | tax.wizelife.ai | Vercel | `FinSightAI/master` (`tax master/frontend`) | FastAPI (Python) | Cloud Run `wizetax-backend` | Cloudflare (orange) → Vercel (cname.vercel-dns) |
| WizeHealth | health.wizelife.ai | Cloud Run (same app) | `finsightai/vitara` (RAMBAM) | Node/Express (same app serves `/api`) | Cloud Run `wizehealth` | Cloudflare **DNS-only (gray)** → ghs.googlehosted (Cloud Run domain-mapping) |
| WizeTravel | travel.wizelife.ai | Vercel | `FinSightAI/wizetravel-next` | Python (FastAPI/Streamlit) | **Hugging Face Space** `ofirofir/wizetravel` (+ Streamlit `nodedai.streamlit.app`) | Cloudflare (orange) → Vercel |
| WizeDeal | deal.wizelife.ai | Vercel | `finsightai/check-deal` | Next.js API routes (serverless) | Vercel (same project) | Cloudflare (orange) → Vercel |

**Shared infrastructure (all apps):**

| Concern | Where it's managed |
|---|---|
| Auth + DB | Firebase project `finzilla-7f1f9` (Auth + Firestore) |
| Cloud Functions | `finzilla-7f1f9` — paypalWebhook, logEvent beacon — repo `finance dashboard/functions` |
| Cloud Run | project `finzilla-7f1f9`, region `us-central1` — `wizetax-backend` + `wizehealth` (both `min-instances=1`); redeploy via each app's `cloudrun-deploy.sh` |
| Secrets | GCP Secret Manager (`finzilla-7f1f9`): GEMINI_API_KEY, TAVILY_API_KEY, SESSION_SECRET, PAYPAL_* … (grant `secretAccessor` to the compute SA for new secrets) |
| DNS | Cloudflare zone `wizelife.ai` — orange proxy everywhere EXCEPT `health` (gray, required for the Cloud Run domain-mapping cert) |
| AI | Gemini 2.5-flash-lite + Tavily (web search) + Anthropic (doc analysis, WizeTax) |
| Payments | PayPal (webhook → Cloud Function) |
| Keepalive | GitHub Actions (`FinSightAI/master`) + Vercel cron → ping Cloud Run `/health` every ~5 min |
| Service Workers | All network-first for HTML (a fresh deploy reaches clients immediately; never pins a stale shell) |
| i18n | Unified per app: URL `?lang` (cross-app handoff) → saved `wl_lang` → browser → English. Dashboard tool cards append `?lang` + SSO. `dir`: he=rtl, en/pt/es=ltr |

**Forward rule for NEW apps:** default to **Cloud Run** for backends and **Vercel** for Next.js frontends — to avoid the topology sprawling further.

---

## 2. Repos

| App | GitHub repo | Local path |
|---|---|---|
| WizeLife | `FinSightAI/wizelife` | `TOTALIST/wizelife/` |
| WizeMoney | `FinSightAI/finsight` | `finance dashboard/` |
| WizeTax (FE) | `FinSightAI/master` | `tax master/frontend/` |
| WizeTax (BE) | `FinSightAI/master` | `tax master/backend/` |
| WizeTravel (FE) | `FinSightAI/wizetravel-next` | `wizetravel-app/` |
| WizeTravel (BE) | (mega traveller, separate) | `mega traveller/` |
| WizeHealth | `finsightai/vitara` | `RAMBAM/` |
| WizeDeal | `finsightai/check-deal` | `Check Deal/` |

---

## 3. Tech stack per app

| App | Frontend | Backend | Hosting (FE) | Hosting (BE) |
|---|---|---|---|---|
| WizeLife | Vanilla HTML/CSS/JS | Firebase | GitHub Pages | Firebase |
| WizeMoney | Vanilla HTML/CSS/JS (PWA) | Firebase + Render | GitHub Pages | Firebase + Render |
| WizeTax | Next.js 15 | FastAPI (Python) | Vercel | Render |
| WizeTravel | Next.js 15 | FastAPI (Python) | Vercel | Render (separate from Tax) |
| WizeHealth | Vanilla HTML/CSS/JS | Node.js (Express) | Render | Render (same node) |
| WizeDeal | Next.js 15 | Vercel API routes | Vercel | Vercel |

---

## 4. Backend services (Google Cloud Run — migrated from Render 2026-05-21)

> Render free tier was suspended (usage limit), so `master-backend` and `vitara`
> were migrated to **Google Cloud Run** (project `finzilla-7f1f9`, region
> `us-central1`, scale-to-zero). Deploy = re-run `<app>/cloudrun-deploy.sh`.
> Frontend cutover note: WizeTax/WizeHealth call relative `/api`, served by the
> Vercel `next.config.js` rewrite → set `NEXT_PUBLIC_BACKEND_URL` to the Cloud Run
> URL on the correct Vercel project + redeploy with build cache OFF.

### 4.1 `wizetax-backend` (was `master-backend`) — shared FastAPI for Tax + Money advisor
- **URL:** `https://wizetax-backend-3ol2retcla-uc.a.run.app` (Cloud Run service `wizetax-backend`; old Render `master-backend-79jx.onrender.com` is suspended)
- **Repo:** `FinSightAI/master`, path `tax master/backend/`
- **Endpoints:**
  - `GET /health` — health probe (returns `{status:"ok",model:"gemini"}`)
  - `POST /api/chat` — WizeTax SSE streaming chat (uses Tavily + Gemini)
  - `POST /api/ai-proxy` — Generic Gemini proxy (used by WizeMoney advisor, supports `search:true` for Tavily)
  - `POST /api/analyze` — tax bracket analysis
  - `POST /api/savings` — exit-tax savings comparison
  - `GET /api/countries`, `/api/regimes`, `/api/country/{code}` — static data lookups
  - `POST /api/company`, `/api/israel` — country-specific calculators
- **Rate limits:** 20/min on `/api/chat`, 30/min on `/api/ai-proxy`, 10/min on `/api/analyze`
- **Cold start:** Cloud Run scales to zero (~2–8s cold start). Mitigated by GitHub Actions keep-alive pinging `/health` (now repointed to Cloud Run).

### 4.2 `wizehealth` (was `vitara`) — WizeHealth Node.js server
- **URL:** `https://wizehealth-3ol2retcla-uc.a.run.app` (Cloud Run service `wizehealth`; old Render `vitara.onrender.com` is suspended)
- **Repo:** `finsightai/vitara`
- **Endpoints:** `/api/chat` (streaming), `/api/auth/login`, `/api/auth/check`, `/api/config`, file upload
- **Auth:** Bearer token (Firebase ID token via SSO) → server queries Firestore for plan
- **Plan limits:** free 5/day, pro 20/day, yolo 40/day (per `AI_DAILY_LIMITS`)

### 4.3 `mega-traveller` — WizeTravel Python backend
- **URL:** `https://nodedai.streamlit.app` (mostly Streamlit, separate backend `app.py` + `server.py`)
- **Endpoints:** `/api/visa-check` (passport + destination), `/api/exchange-rates`, `/api/true-cost`, `/api/deal-hunter`, etc.

---

## 5. Authentication & SSO

### 5.1 Identity provider
- **Firebase Auth** project: `finzilla-7f1f9` (shared across all apps)
- Public Firebase config is intentionally exposed (security via Firestore rules)

### 5.2 SSO bridge (URL params)
WizeLife's dashboard generates per-user URLs to each sub-app:

```
https://<app>.com/?wl_token=<firebase_id_token>&wl_nick=<name>&wl_plan=<free|pro|yolo>
```

Each sub-app's bootstrap script reads these params, stores them in `localStorage.wl_sso`, and removes the params from the URL bar. Subsequent requests send `Authorization: Bearer <wl_token>` so backends can verify via `firebase.auth().verifyIdToken()`.

### 5.3 Plan resolution priority
1. URL param `wl_plan`
2. `localStorage.wl_plan`
3. Firestore `users/{uid}.plan`
4. Default → `free`

Highest tier wins (yolo > pro > free).

---

## 6. Plans & monetization

| Tier | Price | Limits | Access codes |
|---|---|---|---|
| Free | $0 | 3-5 AI queries/day per tool | — |
| Pro | $4.99/mo | 20/day, full features | — |
| YOLO | $9.99/mo | 40/day, all tools, priority | `WIZELIFE2026`, `BETA-ACCESS`, `FRIEND-PRO` |

- `PAYWALL_ACTIVE = false` in `finance dashboard/js/plan.js` until Stripe is configured
- Stripe Customer Portal button hidden until billing is live
- Access codes redeem via paywall modal → set plan in Firestore + localStorage
- Referral system: friend signs up via `?ref=<code>` → upgrades to PRO/YOLO → referrer earns 30 days of matching tier

---

## 7. AI providers

### 7.1 Gemini (primary)
- Project: same Google Cloud project (free tier or billing-enabled)
- Model: `gemini-2.5-flash-lite` ($0.10 input / $0.40 output per 1M tokens)
- Used by: all 5 apps directly or through `/api/ai-proxy`
- Fallback chain: 2.5-flash-lite → flash-latest → 1.5-flash

### 7.2 Tavily (web search augmentation)
- Used by: `master-backend` for `/api/chat` (Tax) and `/api/ai-proxy` with `search:true` (Money advisor)
- Tier: Dev (free, 1000 searches/month)
- Returns: top 5-6 sources, AI cites them as `(Source N)`

### 7.3 Groq, OpenRouter, Anthropic (optional)
- Configured in WizeHealth as alternative providers
- Auto-fallback if Gemini quota hit

---

## 8. Environment variables

### 8.1 `master-backend` (Render)
| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI (required for `/api/chat` and `/api/ai-proxy`) |
| `TAVILY_API_KEY` | Web search for Tax + Money advisor |
| `ANTHROPIC_API_KEY` | Claude fallback (optional) |
| `GROQ_API_KEY` | Groq fallback (optional) |
| `FRONTEND_URL` | CORS allowlist |
| `AI_PROXY_MODEL` | Override default Gemini model (default: `gemini-2.5-flash-lite`) |
| `AI_CHAT_MODEL` | Override Tax orchestrator model |

### 8.2 `vitara` (Render)
| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Health chat AI |
| `GROQ_API_KEY` | Fallback |
| `OPENROUTER_API_KEY` | Multi-model gateway |
| `ADMIN_PASSWORD_HASH` | Optional gating (if set, requires login overlay) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-side Firebase admin for plan lookup |
| `HEALTH_GEMINI_MODEL` | Override Gemini model (default `gemini-2.5-flash-lite`) |

### 8.3 `master` Tax frontend (Vercel)
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://wizetax-backend-3ol2retcla-uc.a.run.app` (Cloud Run; set on the Vercel project that owns tax.wizelife.ai, build cache OFF) |

### 8.4 `mega-traveller` (Render)
| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Trip planner / visa / hidden city |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | Flight search API |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Plan-aware quota |

---

## 9. CI/CD

### 9.1 Daily QA workflow
- **Location:** `wizelife/.github/workflows/daily-qa.yml`
- **Schedule:** every day at 06:00 UTC (09:00 Israel)
- **What it runs (13 tiers):**
  1. HTTP/console-errors/broken-assets/security-headers/SSL via Playwright
  2. Lighthouse on 4 key pages
  3. Auth E2E (logs in with `QA_EMAIL`/`QA_PASSWORD` secrets, expects dashboard)
  4. Accessibility deep scan (axe-core)
  5. SEO meta tags
  6. PWA validity
  7. Multi-viewport (iPhone/iPad/desktop)
  8. Cross-app SSO sanity
  10. i18n coverage in 4 languages
  11. Third-party APIs (Yahoo, Open-Meteo, Render)
  12. Cold-start latency tracking
  14. E2E user flows for all apps
- **Output:** rolling GitHub issue (`📊 Daily QA Status`); failures auto-open alert issue (sends email via GitHub notifications)
- **Cloudflare bypass:** all Playwright contexts identify as `WizeLife-QA/1.0`; CF WAF rule must allow this UA

### 9.2 Render keep-alive
- **Location:** `tax master/.github/workflows/keepalive.yml`
- **Cron:** every 10 min, hits `/health` of `master-backend` so Render free tier doesn't sleep

### 9.3 Service Worker auto-update
- All 5 apps + WizeLife landing have a smart SW registration:
  - Polls `registration.update()` every 5 min
  - Also checks on tab focus
  - Shows non-blocking banner when new SW installs
  - Sends `SKIP_WAITING` message → controllerchange → reload
- Per-app pink/purple/yellow theming for the banner

---

## 10. Monitoring

| Tool | Purpose | Cost |
|---|---|---|
| **GitHub Actions** | Daily QA + Render keep-alive | Free (well under 2000 min/month) |
| **GitHub Issues** | QA alerts → email via notifications | Free |
| **UptimeRobot** | 5-min interval downtime check on all 6 endpoints | Free (50 monitors) |
| **Cloudflare Web Analytics** | Page views, top pages, referrers, countries, devices, Core Web Vitals | Free, **cookieless, no PII, no consent banner required**. Enabled via Cloudflare dashboard with Automatic Setup on the wizelife.ai zone (orange-proxy). |
| **Sentry** | Error tracking | Deferred until traffic justifies |
| **PostHog** | Funnels + retention | Deferred |

> **Removed 2026-05-15 (privacy hardening):**
> - **Microsoft Clarity** — session replay was recording bank balances + blood-test results from WizeMoney / WizeHealth. GDPR Article 9 risk on special-category data. No replacement.
> - **Google Analytics** — non-compliant in multiple EU jurisdictions (France/Austria/Italy 2022). Replaced by Cloudflare Web Analytics. All `gtag.js` Script tags + the `measurementId` in `firebase-config.js` removed from all 5 apps.

---

## 10.5 Privacy & legal architecture (2026-05-15)

### 10.5.1 ToS consent chain

| Layer | What it does | File |
|---|---|---|
| `wize-disclaimer.js` (canonical at `wizelife.ai/js/`) | First-visit modal per app. `TOS_VERSION = 3` — bumping triggers re-acceptance for everyone | `TOTALIST/wizelife/js/wize-disclaimer.js` |
| `recordAcceptance(app)` | Writes localStorage + Firestore `users/{uid}/disclaimers/<app>_v<N>` with SHA-256 hash of exact text shown + viewport + screen + tz + ua + lang. Retry-once on App Check warmup | same file |
| `showProfessionalDisclaimer({app})` | Slim ℹ️ corner chip + click-to-expand banner. 7-day dismiss | same file |
| `terms.html` §10 / §11 / §11A | Hebrew authoritative + full en/pt/es translations in `wl-common-i18n.js`. §10 = LoL (NIS-100 / 12-month-spend cap, per-domain carve-outs). §11 = Indemnification with defence + attorneys' fees. §11A = Assumption of Risk + sophisticated-user warranties | `TOTALIST/wizelife/terms.html` |

### 10.5.2 Firestore rules — relevant collections

| Path | Read | Write | Notes |
|---|---|---|---|
| `users/{uid}` | owner | owner | App Check enforced |
| `users/{uid}/context/{appId}` | owner | owner | per-app aggregated state |
| `users/{uid}/disclaimers/{key}` | owner | owner-create-only, shape-validated, immutable | Legal evidence of ToS acceptance |
| `users/{uid}/consent/{key}` | owner | owner-create-only, immutable | Cookie consent (currently unused — Cloudflare-only analytics needs no banner) |
| `users/{uid}/cross_app/{appId}` | owner | admin only (Cloud Function) | Cross-app derived data |
| `feedback/{id}` | nobody | public-create, shape-validated | Bug reports |

Deploy via: `firebase deploy --only firestore:rules --project finzilla-7f1f9`

### 10.5.3 PII strip-before-AI

| Layer | What it does | File |
|---|---|---|
| `wize-pii.js` (canonical + mirrors) | `WizePII.stripIdentity(obj)` deep-clones and removes ~35 identity keys (name, email, phone, IDs, account/IBAN/card numbers, uid). Scrubs string-content patterns (ת.ז, SSN, CPF, raw email). KEEPS numerical state | `TOTALIST/wizelife/js/wize-pii.js` |
| `lib/pii.ts` | TS port for Next.js apps, identical rules | `tax master/frontend/lib/pii.ts` |
| Applied in tax master | `_sendChat`, `fetchSavings`, `fetchIsraelAnalysis` strip profile before POST | `tax master/frontend/lib/api.ts` |
| WizeAI portal already safe | `getUserContext` returns aggregated context only | `finance dashboard/functions/index.js:1195` |
| Check Deal already safe | Buyer profile is boolean flags, not identifiers | `Check Deal/src/lib/types/deal.ts` |

### 10.5.4 Server-side log redaction & error sanitization

- `PiiRedactFilter` attached to root + uvicorn + fastapi loggers — masks JSON `"password":"x"`, k=v patterns, bare `sk-*` / `AIza*` / `Bearer *` (file: `tax master/backend/main.py`)
- Sanitized error responses: backend exceptions now return generic `"Service error — please try again."` to client; real traceback logged server-side only (files: `main.py`, `agent/orchestrator.py`, `agent/orchestrator_claude.py`)

### 10.5.5 Client-side state hygiene

- `signOut()` purges 14 sensitive localStorage keys (`wl_token`, `wl_sso`, profile caches, finance/health/tax data) BEFORE Firebase signOut resolves (`TOTALIST/wizelife/dashboard.html`)
- `<meta name="referrer" content="strict-origin-when-cross-origin">` on all 12 entry HTML pages + 3 Next.js layouts
- `wl_lang`, `wl_theme` kept (functional preferences, not user data)

### 10.5.6 Performance — Claude prompt caching

`tax master/backend/agent/orchestrator_claude.py` wraps `SYSTEM_PROMPT` (~12 KB) and the last tool entry with `cache_control: {type: 'ephemeral'}` → Anthropic returns ~90% input-token discount on every follow-up turn within the 5-min TTL.

---

## 11. Per-app configuration matrix

### 11.0 WizeLife (landing + portal)

| Setting | Value |
|---|---|
| Production URL | https://wizelife.ai |
| Hosting | GitHub Pages |
| Repo | `FinSightAI/wizelife` |
| Local path | `TOTALIST/wizelife/` |
| Stack | Vanilla HTML/CSS/JS, Firebase Auth |
| SW cache | `wizelife-v11` |
| SW SHELL pages | index, auth, dashboard, feedback, apps, health, travel, wizetravel, tax-compare, web-apps, wize-ai, privacy, terms, 404 (15 pages) |
| Analytics | Cloudflare Web Analytics (cookieless, aggregate) — replaces GA + Clarity since 2026-05-15 |
| Backend | None (Firebase Auth + Firestore directly) |
| AI providers | None (auth/portal only — WizeAI cross-app advisor lives at /wize-ai.html, uses `aiProxy` Cloud Function) |
| Languages | he / en / pt / es |
| Auto-update banner | ✓ via `js/sw-register.js` (5-min poll, focus check) |
| Pages | landing, auth (login/signup), dashboard (account/plan/referral), feedback (4-language form) |
| Recent installs (2026-05-15) | Trackers removed (GA + Clarity), Cloudflare Web Analytics, TOS_VERSION=3 with §10 LoL + §11 Indemnification + §11A Risk, disclaimer audit log (SHA-256 text-hash) to Firestore, PII strip-before-AI helper (`js/wize-pii.js`), Firestore rules fix (disclaimers + consent writable by owner), signOut purge of 14 sensitive localStorage keys, referrer=strict-origin-when-cross-origin meta on all entry pages |

### 11.1 WizeMoney (FinSight)

| Setting | Value |
|---|---|
| Production URL | https://finsightai.github.io/finsight/ |
| Hosting | GitHub Pages |
| Repo | `FinSightAI/finsight` |
| Local path | `finance dashboard/` |
| Stack | Vanilla HTML/CSS/JS, Firebase, PWA |
| SW cache | `finsight-v235` |
| SW pages | 38 internal pages (bank, credit, stocks, goals, etc.) |
| Analytics | Cloudflare Web Analytics (cookieless) — replaces GA + Clarity since 2026-05-15 |
| Backend (chat) | Firebase Functions `aiProxy` (legacy, not invoked) |
| Backend (advisor) | `https://wizetax-backend-3ol2retcla-uc.a.run.app/api/ai-proxy` (Cloud Run; migrated from Render 2026-05-21) |
| AI providers | Gemini 2.5-flash-lite (via /api/ai-proxy) + Tavily web search (auto-analysis only) |
| Languages | he / en / pt / es |
| Auto-update banner | ✓ via `js/app.js` `registerServiceWorker` (banner pattern) |
| Pages | 38 (dashboard, bank, credit, my-funds, stocks, stock-analytics, sectors, investment-advisor, ai-chat, ai-story, goals, simulator, tax-optimizer, pension-optimizer, compare-funds, family-dashboard, tesouro-direto, fiis, renda-fixa, etc.) |
| Recent installs (2026-05-15) | Trackers removed (GA gtag + Clarity loader in sidebar.js), Cloudflare Web Analytics, big centered "WizeMoney" wordmark in page header (LTR-locked even in RTL pages, pure green gradient), small WizeMoney pill removed from WL bar, sidebar `.brand-name` removed (now redundant with page header), `#globalLangSwitcher` hidden on desktop too, `wize-pii.js` mirrored, log redaction filter & sanitized error responses (server-side) |

### 11.2 WizeTax

| Setting | Value |
|---|---|
| Production URL | https://tax.wizelife.ai |
| Frontend hosting | Vercel |
| Backend hosting | Google Cloud Run `wizetax-backend` (`wizetax-backend-3ol2retcla-uc.a.run.app`) — migrated from Render 2026-05-21 |
| Frontend repo | `FinSightAI/master`, path `tax master/frontend/` |
| Backend repo | `FinSightAI/master`, path `tax master/backend/` |
| Frontend stack | Next.js 15, React 18, Tailwind |
| Backend stack | FastAPI, Python 3.11, slowapi rate limit |
| SW cache | `taxmaster-v2` (in `frontend/public/sw.js`) |
| Analytics | Cloudflare Web Analytics (cookieless) — replaces GA + Clarity since 2026-05-15 |

| AI provider | Gemini 2.5-flash-lite via `agent/orchestrator.py` |
| Web search | Tavily (finance topic) injected before each `/api/chat` call |
| Languages | he / en / pt / es |
| Auto-update banner | ✓ Inline in `layout.tsx` |
| Backend endpoints | `/health`, `/api/chat` (SSE), `/api/ai-proxy`, `/api/analyze`, `/api/savings`, `/api/countries`, `/api/regimes`, `/api/country/{code}`, `/api/company`, `/api/israel`, `/api/tax-updates` |
| Recent installs (2026-05-15) | Trackers removed (GA Script tag + ga-init + Clarity), tiny ℹ️ disclaimer chip replacing full banner, single onboarding (legacy duplicate removed), big-centered WizeTax wordmark, RTL initial-scroll fix, mobile bottom-nav clearance fix, Claude prompt caching (system + tools, 5-min TTL), next.config `optimizePackageImports` for recharts/lucide-react, AbortSignal in lib/api.ts, /api/health warmup on visibilitychange, PII strip-before-AI in lib/api.ts (chat/savings/israel routes), backend error sanitization + PII redaction log filter |

### 11.3 WizeTravel

| Setting | Value |
|---|---|
| Production URL | https://nodedai.streamlit.app |
| Frontend hosting | Vercel (Next.js wizetravel-app) + Streamlit (mega traveller) |
| Backend hosting | Render (mega traveller server.py) |
| Frontend repo | `FinSightAI/wizetravel-next`, path `wizetravel-app/` |
| Backend repo | (mega traveller, separate) |
| Frontend stack | Next.js 15 |
| Backend stack | FastAPI + Streamlit |
| SW cache | None (Streamlit doesn't use SW) |
| Analytics | Cloudflare Web Analytics (cookieless) — no GA configured |
| AI provider | Gemini |
| Web search | Tavily (not yet wired) |
| Languages | he / en / pt / es |
| Backend endpoints | `/api/visa-check` (passport+destination), `/api/exchange-rates`, `/api/true-cost`, `/api/deal-hunter`, `/api/competitor`, `/api/rss`, `/api/hidden-city` |
| Recent installs | Wize<Travel> cyan animated title, neutral dark bg, visa-check field rename (passport/destination), first-name display, Clarity |

### 11.4 WizeHealth (Vitara / RAMBAM)

| Setting | Value |
|---|---|
| Production URL | https://health.wizelife.ai (backend Cloud Run `wizehealth`; old `vitara.onrender.com` suspended) |
| Hosting | Render (single Node.js service) |
| Repo | `finsightai/vitara` |
| Local path | `RAMBAM/` |
| Stack | Express.js + Vanilla HTML/CSS/JS frontend in `public/` |
| SW cache | `vitara-v4` |
| Backend endpoints | `/api/chat` (SSE), `/api/auth/login`, `/api/auth/check`, `/api/config`, `/api/transcribe`, file upload |
| AI providers | Gemini 2.5-flash-lite (default), Groq, OpenRouter (admin only) |
| Plan-aware quota | `_check_ai_quota` middleware — free 5/day, pro 20/day, yolo 40/day |
| Auth flow | Reads `wl_token` from URL → stores in localStorage → sends `Authorization: Bearer` → server verifies via Firebase Admin → resolves plan from Firestore |
| Languages | he / en / pt / es |
| Auto-update banner | ✓ Inline in index.html |
| Pages | `/` (chat), `/data.html` (vitals/blood tests/meds/symptom journal) |
| Recent installs | Wize<Health> pink/magenta brand title, AI-provider modal hidden from end users, gemini-2.5-flash-lite (was retired 2.0), color-contrast a11y fix (--t3 #4a5568 → #94a3b8), keyboard-accessible sidebar (tabindex+aria-label), neutral dark palette, SSO recognition (reads wl_sso.token+plan on first chat), Clarity, smart SW banner (pink theme), modernized welcome (file upload CTA + redesigned cards), **/data.html dashboard page** with 4 tabs: Vitals (BP/sugar/weight/sleep + 30-day trend chart), Blood Tests (markers + lab+notes+attach), Meds (browser Notification reminders), Symptom Journal (5-level severity), Quick Upload (PDF/image → AI parse via chat) |

### 11.5 WizeDeal (Check Deal)

| Setting | Value |
|---|---|
| Production URL | https://check-deal.vercel.app/ |
| Hosting | Vercel (FE + API routes) |
| Repo | `finsightai/check-deal` |
| Local path | `Check Deal/` |
| Stack | Next.js 15, React 18, Tailwind, lucide-react |
| SW cache | `checkdeal-v2` (in `public/sw.js`) |
| Backend | Vercel API routes in `src/app/api/ai/*` |
| AI provider | Gemini 2.5-flash-lite (5 routes: market-data, rental-estimate, chat, parse-listing, insights) |
| API routes | `/api/ai/chat`, `/api/ai/insights`, `/api/ai/market-data`, `/api/ai/parse-listing`, `/api/ai/rental-estimate`, `/api/rental/*` |
| Languages | he / en / pt / es |
| Auto-update banner | ✓ Inline in `layout.tsx` |
| Pages | Home (dashboard-style), Wizard, Saved Deals, Comparison, Portfolio |
| Recent installs | Wize<Deal> animated multi-color brand title, Building2 → Home icon (mobile nav), neutral dark bg (was via-blue-950), all 5 AI routes upgraded to gemini-2.5-flash-lite, Clarity, smart SW banner, first-name display, dashboard-style home (was marketing landing) |

---

## 12. WizeMoney internal architecture

WizeMoney is the most complex sub-app:

### 11.1 Pages (38 total in `pages/*.html`)
Categories: dashboard, bank, credit, my-funds, stocks, stock-analytics, sectors, investment-advisor, ai-chat, ai-story, goals, simulator, tax-optimizer, pension-optimizer, compare-funds, family-dashboard, etc.

### 11.2 Storage layer (`js/storage.js`)
- Pure localStorage, with optional Firestore mirror when user is signed in
- Keys: `finance_bank_accounts`, `finance_my_funds`, `finance_stocks`, `finance_goals`, `finance_credit_cards`, `finance_subscriptions`, `finance_loans`, `finance_assets`, `finance_transactions`
- Each domain has `getX`, `addX`, `updateX`, `deleteX` methods

### 11.3 Investment advisor (`pages/investment-advisor.html`)
- Auto-analysis on page load using full portfolio context
- Hard budget constraint (free cash − ₪30K emergency fund, user-editable)
- System prompt: 3-market awareness (IL/US/BR), 2026 contribution limits, mandatory recommendation format
- Validation layer: budget overrun, unrealistic returns, allocation conflict, ticker existence (Yahoo Finance probe)
- Tavily-augmented for the auto-analysis (real-time fund returns/rates), Gemini-only for follow-ups

### 11.4 Stocks pipeline (`js/stock-api.js`)
- Yahoo Finance via Cloudflare Worker proxy + direct fallback
- TASE (Tel Aviv) via static JSON snapshot
- 10-min price cache + 24-hour historical cache in localStorage

---

## 12. Languages (i18n)

All apps support **4 languages**: Hebrew (he, RTL), English (en), Portuguese (pt), Spanish (es).
- Switcher pills always UPPERCASE: `EN | ES | PT | HE`
- Direction toggles via `<html dir="rtl|ltr">`
- Translation maps in:
  - WizeMoney: `js/i18n.js` (large file, all keys)
  - WizeTax: `app/wize-ui.tsx` slides + per-component `t4(lang, {he,en,pt,es})`
  - WizeTravel: `lib/i18n.ts`
  - WizeHealth: inline `TX = {he,en,pt,es}` in `index.html`
  - WizeLife: inline + per-component

---

## 13. PWA & cross-platform

- **Manifest:** each app has its own `manifest.json` with `start_url`, icons, theme color
- **Install on iPhone:** Safari → Share → Add to Home Screen
- **Install on Android:** Chrome shows install prompt automatically
- **Service Worker:** smart auto-update banner (per app, color-themed)
- **Offline:** cached shell + dynamic fetch fallback in SW
- **No native iOS/Android app yet** — Capacitor wrapper is a future step

---

## 13.5. Legal & disclaimers

**Terms of Service** (`/terms.html`) and **Privacy Policy** (`/privacy.html`)
were rewritten 2026-05-09 (Version 2.0):
- Strong limitation-of-liability clause (cap: NIS 100 for free users)
- Binding arbitration in Israel + class-action waiver
- App-specific disclaimers (medical / financial / tax / real estate)
- Force majeure
- Privacy: per-service cross-border data table, AI processing transparency, retention schedule, 18+ requirement

**First-use disclaimer modal** (`/js/wize-disclaimer.js`):
- Shared across all 5 apps. Gates auto-analysis until user checks "I understand"
- Per-app copy: medical (WizeHealth), investment (WizeMoney advisor), tax (WizeTax), deal (WizeDeal)
- Acceptance stored in `localStorage.wl_disclaimer_<app>_v<TOS_VERSION>` — re-prompts when version bumps
- Decline → redirects user to wizelife.ai
- WizeHealth additionally shows a permanent emergency banner ("🚨 חירום? חייג 101")

## 14. Security

- All apps over HTTPS
- Cloudflare proxy on `wizelife.ai` (orange cloud — works fine, leave it)
- WAF rule: allow User-Agent containing `WizeLife-QA` (for daily QA bypass)
- CSP headers on all pages
- HSTS, X-Frame-Options, X-Content-Type-Options enforced
- Firestore rules: users can only read/write their own data
- API rate limits via slowapi (FastAPI) and Express middleware (Node)
- No PII in URLs (token bridge cleans up after read)
- XSS-safe rendering (escape user input on tx.type, tx.description, goal.name)

---

## 15. Known TODOs / not done

- [ ] Stripe Payment Link → paste in `paywall.js` + `dashboard.html`
- [ ] Firebase Blaze upgrade + `firebase deploy --only functions`
- [ ] Flip `PAYWALL_ACTIVE = true` in `js/plan.js`
- [ ] `wizelife.ai` DNS already on Cloudflare (orange) — works, don't touch
- [ ] Sentry / PostHog integration (deferred until 100+ users)
- [ ] Native iOS/Android via Capacitor (deferred until 10K+ users)
- [ ] Real Garmin Health API integration (requires partner agreement, 1-2 months)
- [ ] Apple HealthKit integration (requires Capacitor)
- [ ] Direct kupat-cholim API (no public API exists in Israel — manual file upload + AI parse is the workaround)

---

## 16. Operational runbook

### 16.1 An app is down
1. Check UptimeRobot dashboard
2. Check Render service logs (`master-backend`, `vitara`)
3. If Gemini 429: rotate key in Render env vars
4. If Cloudflare 502: temporarily set DNS-only (gray cloud) on the misbehaving subdomain

### 16.2 Daily QA failed
1. Open the GitHub issue in `wizelife` repo (auto-created)
2. Open Claude Code, say "fix issue #N"
3. Claude reviews, fixes, pushes; CI/SW handles propagation

### 16.3 New deployment
- WizeMoney/WizeLife/WizeHealth (GitHub Pages): push to `main` → live in ~30s
- WizeTax/WizeDeal/WizeTravel (Vercel): push to `main` → live in ~1 min
- `master-backend` (Render): push to `main` → live in ~3-5 min
- `vitara` (Render): push to `main` → live in ~3-5 min

---

## 17. Quick commands

```bash
# Trigger daily QA manually
gh workflow run "Daily QA — All Apps" --repo FinSightAI/wizelife

# Test ai-proxy
curl -m 60 -X POST https://wizetax-backend-3ol2retcla-uc.a.run.app/api/ai-proxy \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"text":"hi"}]}]}'

# Tail Render logs
# (use Render dashboard, no CLI integration set up)

# Check QA issue list
gh issue list --repo FinSightAI/wizelife --label qa-alert
```

---

## 18. Folder structure & macOS iCloud caveat

```
~/Desktop/Desktop - O's MacBook Air/
├── TOTALIST/          ← meta dir (qa_agent + wizelife + CLAUDE.md)
│   ├── wizelife/      ← repo FinSightAI/wizelife (landing/auth/dashboard/feedback)
│   └── qa_agent/      ← local-only Playwright headless QA
├── finance dashboard/ ← repo FinSightAI/finsight (WizeMoney, 38 pages)
├── tax master/        ← repo FinSightAI/master (WizeTax FE+BE)
├── Check Deal/        ← repo finsightai/check-deal (WizeDeal)
├── RAMBAM/            ← repo finsightai/vitara (WizeHealth)
├── wizetravel-app/    ← repo FinSightAI/wizetravel-next (WizeTravel FE)
├── mega traveller/    ← WizeTravel backend (legacy)
└── wizehealth/        ← WizeHealth splash redirect
```

**Why not all under TOTALIST?** Each sub-app has its own git remote and was
created at different times. Could be reorganized but not worth the churn —
git tracks remote URLs per directory, not by parent path.

**⚠️ macOS iCloud sync bug:** The Desktop folder appears twice with different
Unicode for the apostrophe in "O's":
- `Desktop - O's MacBook Air/...` (ASCII `'`) — **iCloud stub, do not edit**
- `Desktop - O’s MacBook Air/...` (Unicode `’`) — **real folder, all work happens here**

Verify via inode: real folder has many entries, stub has few. Memory entry
keeps Claude pointed at the right path automatically.

---

## 19. Pre-launch hardening (2026-05-25)

Architectural changes from final pre-launch session — kept here so future
maintainers understand WHY current patterns exist.

### 19.1 Shared `wize-pricing-pill.js` component

**Purpose**: discovery hook so visitors to sub-apps (money/tax/travel/deal/health)
see the Free vs YOLO tier difference without bouncing to Portal first.

**Pattern**:
- Source-of-truth: `TOTALIST/wizelife/js/wize-pricing-pill.js`
- COPIED (not symlinked or CDN'd) into each sub-app's static dir:
  - `finance dashboard/js/wize-pricing-pill.js`
  - `RAMBAM/public/js/wize-pricing-pill.js`
  - `tax master/frontend/public/wize-pricing-pill.js`
  - `wizetravel-app/public/wize-pricing-pill.js`
  - `Check Deal/public/wize-pricing-pill.js`
- Each app's HTML/layout loads with `<script src="/wize-pricing-pill.js" defer>` or `<Script>` (Next.js)
- Self-hides on Portal (location.hostname check) — Portal has full Pricing section
- Self-hides for paid users (`wl_plan === 'pro'|'yolo'`)
- Dismissal stored in `localStorage.wl_pricing_pill_dismissed` (30-day TTL)
- 4-lang inline (en/he/pt/es), no fallback leak

**When updating**: edit source in Portal repo, then re-copy + push to all 6 repos.

### 19.2 FAQPage schema — ONE per URL (Google constraint)

**Rule**: Google rejects `Duplicate field 'FAQPage'`. Even though we serve 4
languages from the same URL via client-side language switching, only ONE
FAQPage JSON-LD block per page is allowed.

**Decision**: Keep ENGLISH FAQ as the canonical FAQPage (since URL canonical
points to English version). Other languages remain visible in the UI but have
no schema markup. This is a deliberate trade-off — full language coverage in
rich results would require per-language URLs, which we explicitly decided
against (see canonical x-default pattern in §11.0).

**Note (2026-05-07)**: Google deprecated FAQ Rich Results display in Search.
FAQ schema still passes validators + is used by voice assistants/aggregators,
but no longer shows expandable FAQ snippet in Google SERP.

### 19.3 CSP frame-src must include `https://www.google.com` (reCAPTCHA)

**Bug pattern**: any app using Firebase Auth Google sign-in needs to allow
reCAPTCHA iframes from `www.google.com` (not just `accounts.google.com`).
Without this, reCAPTCHA fails to load → users can't sign in with Google.

**Fix applied to**: Portal `index.html`, Money `index.html` meta CSP. Next.js
apps (Tax/Travel/Deal) already had it via `next.config.ts` headers.

**Test**: `qa/security-csp-recaptcha.qa.js` — added 2026-05-25.

### 19.4 `rel="nofollow"` on internal auth.html links

**Bug pattern**: `auth.html` is disallowed in robots.txt (intentional — login
pages don't belong in search). But Google followed internal `<a href="auth.html">`
links from index.html → got blocked at robots.txt → spammed Search Console with
"Blocked by robots.txt" warnings.

**Fix**: every internal link to `auth.html` carries `rel="nofollow"`. Test:
`qa/seo-auth-nofollow.qa.js`.

### 19.5 Pricing text must NOT look like URL paths

**Bug pattern**: `<sub>/mo</sub>` next to a price ($9.99) was extracted by
Googlebot as a relative URL path `/mo` → 404 in Search Console. Same for
`/חודש` `/mês` `/mes`.

**Fix**: Replace `<sub>/mo</sub>` with `<sub>per&nbsp;month</sub>` (full word, no
slash). Test: `qa/seo-url-extraction.qa.js`.

### 19.6 Dockerfile pattern for non-root user + iCloud file perms

**Bug pattern**: Cloud Run deploy of `wizehealth` failed with `EACCES: permission
denied, open '/app/server.js'`. Root cause: iCloud-synced files have 600 perms
(owner-only), Docker COPY preserved them, then `USER appuser` couldn't read.

**Fix template** (now in `RAMBAM/Dockerfile`):
```dockerfile
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --omit=dev && chown -R appuser:appgroup /app/node_modules
COPY --chown=appuser:appgroup server.js ./
# ...
RUN chmod -R a+rX /app
USER appuser
```

**Apply to**: any future Cloud Run service deployed `--source .` from iCloud.
Test: `qa/docker-perms-check.qa.js`.

### 19.7 New tax sub-routes: /reports, /profile

**Tax frontend now has 3 first-class user-facing pages**:
- `/advisor` — existing AI chat
- `/reports` — read previous AI sessions + saved calculations + PDF export
- `/profile` — read-only profile summary + inline edit (5 basic fields)

All read from `localStorage`:
- `tax_master_sessions` — chat history
- `taxmaster_saved_calcs` — saved calculations
- `taxmaster_user_data` — profile data

Bottom-nav fallback handlers (in `layout.tsx`): `window.wizeTaxHome / Advisor /
Reports / Profile` defined as URL navigations if not already set by advisor.

### 19.8 WizeDeal seller mode (`/sell`)

**New route**: `Check Deal/src/app/sell/page.tsx`
**New API**: `Check Deal/src/app/api/ai/sell-price/route.ts`

Same architecture as buyer endpoint (`/api/ai/market-data`):
- 21-country aware with currency + local sites context (BR/IL/AE/US/etc)
- **Tier-gated grounding**: Yolo only gets Gemini 2.5 Flash + Google Search
  grounding ($0.04/call); Free/Pro use Flash Lite without grounding ($0.001)
- **7-day module-scope cache** with sizeBucket key (size rounded to nearest 20m²)
- **Sanity validation**: price ordering, $/m² USD-equivalent range $200-$50K,
  ratio checks
- **Kill switches**: `DEAL_SELL_ENABLED=false` returns 503
- **Rate limits via `x-wl-plan`**: 3/day free, 15/day pro, 30/day yolo

Pattern repeated from buyer endpoint — both share cost-control discipline.

### 19.9 Regression test suite — codified from today's bugs

New test files in `qa/` (each one represents a bug we won't repeat):
- `seo-faqpage-duplicate.qa.js` — assert ≤1 FAQPage per URL
- `security-csp-recaptcha.qa.js` — assert CSP includes www.google.com
- `seo-url-extraction.qa.js` — scan for `<tag>/word</tag>` URL-bait patterns
- `seo-sitemap-urls.qa.js` — every sitemap URL must return 200/3xx
- `docker-perms-check.qa.js` — Dockerfile must have --chown or chmod before USER
- `seo-auth-nofollow.qa.js` — internal auth.html links must have rel="nofollow"
- `i18n-jsonld-leak.qa.js` — no language leak within lang-tagged JSON-LD blocks
- `pricing-pill-coverage.qa.js` — pricing pill loaded on sub-apps, not Portal

Run nightly via existing GH Actions QA workflow.

### 19.10 Performance refactor — deferred

After all today's fixes, Lighthouse Mobile Performance still scores 42-56
(Desktop 59-81). Remaining issues require multi-day refactors:
- Render-blocking 2.26s (defer non-critical CSS)
- Unused JS 1,044 KiB (code splitting + tree-shaking)
- Main-thread 5.2s (move heavy work to Web Workers)
- 14 long tasks (chunk via `requestIdleCallback`)

**Deferred to post-launch** — will be data-driven once Vercel Analytics +
Cloudflare RUM show real user metrics (not synthetic Slow 4G).

### 19.11 SEO infrastructure summary (2026-05-25 state)

| Feature | Status | Where |
|---------|--------|-------|
| hreflang in sitemap (xhtml:link) | ✅ all 6 apps | `sitemap.xml` / Next.js sitemap.ts |
| og:locale + alternateLocale | ✅ all 6 apps | meta tags in head |
| Canonical + x-default hreflang | ✅ all 6 apps | head |
| Organization JSON-LD with sameAs | ✅ Portal | `index.html` |
| SoftwareApplication JSON-LD | ✅ all 6 apps | head |
| Service JSON-LD with areaServed | ✅ Deal | `layout.tsx` |
| FAQPage JSON-LD (EN only) | ✅ all 6 apps | head |
| BreadcrumbList | ✅ Tax /profile, Deal /sell | page.tsx |
| Cache-Control headers (immutable static) | ✅ Tax/Travel/Deal | `next.config.ts` / `vercel.json` |
| rel="nofollow" on auth links | ✅ Portal (18 links) | `index.html` and friends |
| robots.txt + sitemap.xml | ✅ all 6 apps | served from root |

---

_End of document. Update this file alongside any architectural change._
