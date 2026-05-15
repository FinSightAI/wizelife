# WizeLife — Architecture & Specification

> Last updated: 2026-05-15
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
| **WizeMoney** | https://finsightai.github.io/finsight/ | Personal finance dashboard |
| **WizeTax** | https://tax.wizelife.ai | International tax advisor |
| **WizeTravel** | https://nodedai.streamlit.app/ | AI trip planner |
| **WizeHealth** | https://vitara.onrender.com | Medical Q&A + records |
| **WizeDeal** | https://check-deal.vercel.app/ | Real-estate deal analyzer |

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

## 4. Backend services (Render)

### 4.1 `master-backend` — shared FastAPI for Tax + Money advisor
- **URL:** `https://master-backend-79jx.onrender.com`
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
- **Sleeps:** Free tier sleeps after 15 min idle. Mitigated by GitHub Actions keep-alive (every 10 min).

### 4.2 `vitara` — WizeHealth Node.js server
- **URL:** `https://vitara.onrender.com`
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
| `NEXT_PUBLIC_BACKEND_URL` | `https://master-backend-79jx.onrender.com` |

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
| Backend (advisor) | `https://master-backend-79jx.onrender.com/api/ai-proxy` |
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
| Backend hosting | Render (`master-backend-79jx.onrender.com`) |
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
| Production URL | https://vitara.onrender.com |
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
curl -m 60 -X POST https://master-backend-79jx.onrender.com/api/ai-proxy \
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

_End of document. Update this file alongside any architectural change._
