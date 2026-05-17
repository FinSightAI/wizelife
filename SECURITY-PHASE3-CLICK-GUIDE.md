# Security Phase 3 — Manual Click Guide

These changes require dashboards I can't access on your behalf. Each one is reversible in ≤ 2 minutes. Estimated total: **45-60 min**.

| # | Item | Where | Time | Reversibility |
|---|---|---|---|---|
| C | DNSSEC | Cloudflare + Domain registrar | 10 min | 2-min disable |
| B | Firebase API key restrictions | Google Cloud Console | 15 min | "Remove restriction" 2 min |
| 2 | Permissions-Policy header | Cloudflare Transform Rules | 10 min | Delete rule 1 min |
| 2 | CSP report-only (24h test) | Cloudflare Transform Rules | 15 min | Delete rule 1 min |
| E | Backup drill | Local shell | 30 min (one-time) | n/a |

---

## C — DNSSEC (highest impact)

**Why:** Prevents anyone from impersonating wizelife.ai via DNS hijacking.

### Step 1 — Enable in Cloudflare
1. https://dash.cloudflare.com → wizelife.ai → **DNS** → **Settings** (right sidebar)
2. Scroll to **DNSSEC** → click **Enable DNSSEC**
3. A modal shows a **DS record** with these fields:
   - **Key Tag:** (e.g. `2371`)
   - **Algorithm:** `13` (ECDSA Curve P-256 with SHA-256) ← most likely
   - **Digest Type:** `2` (SHA-256)
   - **Digest:** (a 64-char hex string)
4. **Copy the DS record** (don't close the modal).

### Step 2 — Add DS record at your domain registrar
Where you bought `wizelife.ai`. Common registrars:

- **Google Domains** (now Squarespace Domains): wizelife.ai → DNS → DNSSEC → Add DS Record
- **Cloudflare Registrar** (if Cloudflare): Already done — they detect and apply automatically
- **Namecheap:** Domain List → Manage → Advanced DNS → DNSSEC → Add
- **GoDaddy:** Domain → DNS → DNSSEC → Add DS

Paste the 4 fields from Step 1 exactly.

### Step 3 — Verify (wait 1-24h for propagation)
```sh
dig +dnssec wizelife.ai | grep -E 'RRSIG|status'
# Should show: status: NOERROR + at least one RRSIG line
```

Or use https://dnssec-analyzer.verisignlabs.com/wizelife.ai → all green checkmarks.

### Rollback if anything breaks
Cloudflare → DNSSEC → Disable. Then remove DS record at registrar. Done in 2 min.

---

## B — Firebase API key restrictions

**Why:** Today the Firebase API keys in your code (e.g., `AIzaSyDuzJHOMe89YmEFpKlaTgxT40BCNhK6PU0`) work from ANY domain. If they're scraped from the public JS, anyone can use them from `evil.com`. Restricting to your domains makes a leak harmless.

### Step 1 — Restrict the Web API key
1. https://console.cloud.google.com/apis/credentials?project=finzilla-7f1f9
2. Find the **API key** named **Browser key (auto created by Firebase)** (or similar). It's the same one in `js/firebase-config.js`.
3. Click the pencil/edit icon.
4. **Application restrictions** → select **HTTP referrers (web sites)**
5. Click **ADD AN ITEM** and paste each of these (one per line):
   ```
   https://wizelife.ai/*
   https://*.wizelife.ai/*
   https://finsightai.github.io/*
   https://*.vercel.app/*
   https://vitara.onrender.com/*
   https://master-backend-79jx.onrender.com/*
   https://localhost:*/*
   http://localhost:*/*
   ```
6. **API restrictions** → **Restrict key** → check ONLY these APIs:
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
   - Cloud Functions API
   - Firebase Installations API
   - Firebase App Check API
   - Firebase Cloud Messaging API (only if you use push)
7. **Save**.

### Step 2 — Verify
Within 5 minutes, test:
- Open https://wizelife.ai → log in → should still work
- Open https://wizelife.ai/dashboard.html → check that plan badge loads
- Run a sub-app (FinSight, Tax, etc.) → confirm Firebase auth still works

If anything breaks: same page → **Application restrictions** → **None** → Save. Restored in 1 minute.

### Step 3 — Repeat for any other API keys
The Firebase project might have multiple keys (one per platform). Restrict each the same way.

---

## #2 — Permissions-Policy header

**Why:** Blocks unused browser APIs so a future XSS can't access them. Audit showed your sites use **clipboard only** — everything else can be blocked.

### Cloudflare Transform Rule
1. https://dash.cloudflare.com → wizelife.ai → **Rules** → **Transform Rules** → **Modify Response Header**
2. **Create rule**
3. Settings:
   - **Rule name:** `Add Permissions-Policy header`
   - **When incoming requests match:** **All incoming requests**
   - **Then, modify response header by:** **Set static**
     - **Header name:** `Permissions-Policy`
     - **Value:** (paste exactly — single line)
     ```
     accelerometer=(), ambient-light-sensor=(), autoplay=(self), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(self), gamepad=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(self), publickey-credentials-get=(self), screen-wake-lock=(), serial=(), sync-xhr=(), usb=(), web-share=(self), xr-spatial-tracking=()
     ```
4. **Deploy**.

### Verify
```sh
curl -fsSI https://wizelife.ai | grep -i permissions-policy
# Should show: permissions-policy: accelerometer=(), ...
```

Check securityheaders.com → wizelife.ai → score should jump.

### Why clipboard NOT in the list
Clipboard-write is granted by default to same-origin contexts in Chromium without Permissions-Policy — explicit `clipboard-write=()` would BLOCK it and break WizeShare.

### Rollback
Same Transform Rules page → trash icon next to the rule. Restored instantly.

---

## CSP — Report-only first (do AFTER everything above is stable)

**Why we don't enforce CSP today:** the inline scripts + GA/reCAPTCHA make tight CSP risky. Start with **Report-Only** mode — browsers log violations to your console but DON'T block anything. After 24-48h of logs, you'll know exactly what to allow before flipping to enforce.

### Step 1 — Add Report-Only header
Same Cloudflare Transform Rules workflow:
- **Rule name:** `Add CSP Report-Only`
- **Header name:** `Content-Security-Policy-Report-Only`
- **Value:** (single line)
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://*.firebaseapp.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://vitara.onrender.com https://master-backend-79jx.onrender.com https://ofirofir-wizetravel.hf.space; frame-src 'self' https://*.firebaseapp.com https://www.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri https://wizelife.report-uri.com/r/d/csp/reportOnly
  ```

### Step 2 — Wait 24-48 hours
Browse the site normally. Look at browser DevTools → Console for CSP violation logs. Each violation tells you what to add to the policy.

### Step 3 — Tune the policy until 0 violations on normal use

### Step 4 — Flip to enforce
Once you have 0 violations from normal browsing, change the header name from `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. NOW it blocks.

### Rollback
Delete the Transform Rule. Back to today's behavior.

---

## E — Backup drill (quarterly, ~30 min one-time setup)

**Why:** You backup daily, but never tested restoration. Many backups silently fail.

### One-time setup
```sh
# 1. Create a temporary Firebase project (NEW, separate)
firebase projects:create finzilla-restore-drill-$(date +%Y%m%d)
# 2. Note the project ID it outputs

# 3. Import yesterday's backup
gsutil ls gs://finzilla-7f1f9-backups/   # confirm backups exist
gcloud firestore import gs://finzilla-7f1f9-backups/$(date -v-1d +%Y-%m-%d) \
  --project=finzilla-restore-drill-XXXXX

# 4. Sample-check 3 random users
firebase --project=finzilla-restore-drill-XXXXX firestore:get users/<some-uid>

# 5. Verify counts roughly match prod
firebase --project=finzilla-7f1f9 firestore:get '/users' --shallow | wc -l
firebase --project=finzilla-restore-drill-XXXXX firestore:get '/users' --shallow | wc -l

# 6. DELETE the drill project (important — don't keep prod data hanging around)
firebase projects:delete finzilla-restore-drill-XXXXX
```

### What to do quarterly
Run steps 1-6 above. Confirm counts match within 1%. If they don't — investigate why backup is incomplete BEFORE you actually need it.

### Why a separate project, not staging
Restoring to staging would mix prod data with test data → exactly the GDPR violation you're trying to prevent. A throwaway project ensures clean isolation.

---

## Order I'd actually do these

1. **C — DNSSEC** (10 min, $0, ~24h propagation but invisible to users)
2. **B — Firebase API restrictions** (15 min, $0, instant)
3. **#2 — Permissions-Policy** (10 min, $0, instant)
4. **CSP Report-only** (15 min, then 24-48h watch — no rush)
5. **E — Backup drill** (30 min, once now, then quarterly)

Total active work: **80 min** spread over 2-3 days.

---

## When you're done

Reply "done with phase 3" and I'll:
- Run `dig +dnssec wizelife.ai` + check Cloudflare API to verify DNSSEC
- Test the Firebase API restrictions by curl from a random origin (should fail)
- Verify Permissions-Policy headers via curl
- Recommend the CSP tightening once Report-Only logs are clean
