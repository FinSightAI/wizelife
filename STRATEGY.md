# WizeLife — Strategy Document

> **Last updated:** 2026-05-18 (Session 9 — late evening)
> **Status:** Pre-launch, pre-revenue. 6-app suite live. Solo founder.
> **Pre-HN verification:** 23/23 critical checks pass (qa/deep-qa-sunday.js)
> **Tax data:** 8 countries verified 2026, 24/24 unit tests pass
> **North-star metric:** First 1,000 active users.

This doc is updated by Claude. Open it whenever you want to recalibrate priorities, then ask Claude to refresh it. Treat sections marked 🟢 as "doing now," 🟡 as "next 2-4 weeks," 🔴 as "after first 100 paying users."

---

## 0. What shipped in Session 9 (today, 2026-05-18)

Decision-quality WizeTax now lives — relocation funnel is real product, not headline calculator.

| What | Where | Why it matters |
|---|---|---|
| Swapped country mix (added IT + CY, removed CH + EE) | `/p/salary-compare` | IT "Lavoratori Impatriati" + CY Non-Dom are real Israeli relocation patterns |
| Deep-analysis modal on landing | `/p/salary-compare` | "Want real picture?" CTA → manual entry (5 fields) or **payslip OCR client-side** (Tesseract.js, payslip never leaves device) → top-5 with REAL net |
| `/social-compare` (WizeTax) | mastermove.vercel.app/social-compare | 8 countries side-by-side: Bituach Leumi vs Segurança Social vs FICA vs INPS vs CPF — what each covers, what you actually get at retirement |
| `/relocation-analyzer` (WizeTax) | mastermove.vercel.app/relocation-analyzer | Full picture: net + COL (Numbeo 2025 indices) + 10-year cumulative chart (inline SVG, 0 deps) + treaty column + Quality of Life + lifetime pension |
| `/exit-tax-calculator` (WizeTax) | mastermove.vercel.app/exit-tax-calculator | Section 100A calculator — 6 asset classes + cost basis → estimated exit tax + tie-back to relocation savings |

**Funnel now real:**
```
[Public viral]                     [Pro paid depth]
/p/salary-compare    →    sign-up    →    /relocation-analyzer
       │                                          │
       │                                          ├── /social-compare
       │                                          ├── /exit-tax-calculator
       │                                          └── /advisor (chat)
       │
       └─ "Deep analysis" modal (payslip OCR + manual) ─→ sign-up gate
```

---

## 1. Where you actually are

| Aspect | State |
|---|---|
| Tech stack | Production-ready. 6 apps live (WizeLife portal + WizeMoney/Tax/Travel/Health/Deal). Firebase Auth + Firestore + App Check. HSTS preload. 2FA on admin. |
| Security maturity | ~85% (Solo SaaS pre-launch — above median). Phase 1-3 of hardening done this session; 5 manual clicks pending (DNSSEC, Firebase API restrict, Permissions-Policy, CSP report-only, backup drill — see `SECURITY-PHASE3-CLICK-GUIDE.md`). |
| Legal posture | ToS v3 with new §10/§11/§11A. Disclaimer audit log in Firestore. AI safety rules in prompts. **Missing:** Israeli Ltd. (חברה בע"מ), E&O insurance, lawyer-reviewed ToS limit-of-liability cap. |
| Distribution | 0 marketing channels active. Tools all built. **No users.** |
| Revenue | $0. PAYWALL_ACTIVE=false. PayPal integration ready but disabled until first 1K users. |

---

## 2. Pricing — keep free tier + clear depth-wedge (decision 2026-05-17)

### The pricing logic explained in one line

> **Free landing page = headline comparison (income tax only). Pro = real comparison (income tax + pension + study fund + Bituach Leumi + health + parental leave + cost of living).**

This is the **product wedge** that converts: the landing page deliberately gives a "tease" comparison that's accurate-but-incomplete. The Pro tier is where the comparison becomes decision-quality.

| Tier | What it gives | What it explicitly does NOT include | Why it converts |
|---|---|---|---|
| **`/p/salary-compare` (public)** | Net take-home after income tax + social, 20 countries | Pension contributions · קרן השתלמות · Bituach Leumi vs PT/US/DE social · health coverage (free in IL, $$$ in US) · vacation days · parental leave · cost-of-living differential | "Wait — $6,750 in UAE sounds great, but I lose my Keren Hishtalmut and pay $1,500/mo health in US? What's the real picture?" |
| **Free in-app** (3-5 AI queries/day) | Single-app use, no cross-app, no pension/health overlay | The deep comparison | Removes barrier to first use |
| **Pro $4.99/mo** | Full Israel-vs-X comparison: income + pension + study fund + Bituach + health + cost-of-living. Single-tool depth in Tax / Money / Deal / Health / Travel. | Cross-app AI advisor | The depth that turns a curious browser into a real decision-maker |
| **YOLO $9.99/mo** | Cross-app WizeAI — advisor that sees ALL your apps together | — | 🟡 De-emphasize publicly until you have 200 paid users to validate willingness-to-pay |

### Concrete action — make the depth-wedge explicit

Update `/p/salary-compare.html` and `/p/relocate-portugal.html` with a clearly-visible "What this DOESN'T include" panel:

```
⚠️ This comparison is income-tax only. The REAL picture includes:
  · Pension (Israeli employer pays 12.5% — Portugal 0%)
  · Keren Hishtalmut — uniquely Israeli, tax-free
  · Bituach Leumi vs Portuguese Segurança Social
  · Health (free in IL/PT, $300-1,500/mo in US)
  · Vacation days (28 EU vs 14 IL vs 10 US)

→ Get the full Pro analysis (free trial)
```

This panel **acknowledges** the limitation honestly (HN-style integrity), and the CTA flows naturally. Don't hide the limitation — flaunt it. Users who don't care stay on free; users who want the real answer convert.

### Critical rule

Never gate the public landing pages behind signup — they're the top of the funnel. But DO show the depth gap clearly so the natural next step is signup.

---

## 3. Next 7 days — distribution

> Reference: [reference_growth_strategy](https://github.com/FinSightAI/wizelife/blob/main/STRATEGY.md) and Claude's saved memory.
> User rejected FB/WhatsApp **group** posting — admins ban, members report.
> **Show HN draft + canned responses live at `SHOW-HN-PLAYBOOK.md` in this repo.**

| Day | Action | Time | Expected | Status |
|---|---|---|---|---|
| 🟢 Today (Sun 18/5) | **Build-in-public post #1 on X** ("I built X" + screenshot of `/p/salary-compare`) | 30 min | 30-200 visits | ☐ |
| 🟢 Sun-Mon | **50 personal WhatsApp messages 1:1** to friends — NOT in groups. Different message per relationship. | 1-2h | 30-50 first users | ☐ |
| 🟢 **Tue 20/5 17:00-19:00** | **Show HN submission** of `/p/salary-compare.html`. Title: "Show HN: Compare salary in 20 countries, with client-side payslip OCR" — see `SHOW-HN-PLAYBOOK.md` for full body + canned replies. | 30 min + 2h on standby | 500-5,000 if front page | ☐ |
| 🟢 Wed-Sat | **Build-in-public posts #2-4 on X** (1 every 2 days) — insight, lesson learned, numbers | 30 min each | 50-300 per post cumulatively | ☐ |
| 🟡 +7-14d | **Indie Hackers post** with full story | 1h | 100-500 | ☐ |
| 🟡 +14-21d | **Product Hunt launch** prep + execute (now with the depth tools = real product) | 1 day prep | 300-2,000 spike | ☐ |

**Show HN headline candidates (pick one):**
1. "Show HN: Net take-home salary across 20 countries, no signup" — clear value, HN-friendly
2. "Show HN: Will moving to Portugal actually save you tax? Calculator with PwC 2025 data" — concrete + counter-intuitive
3. "Show HN: I built a tool that compares net salary across 20 countries (Israel-focused)" — narrative

**Hashtags for X build-in-public:** `#buildinpublic` `#indiehackers` `#fintech` `#israeli`

**Critical mindset — "200 first users vs 800":** the first 200 are worth 10× more (word-of-mouth, feedback). Focus on 3 channels above, not 10.

---

## 4. Next 30 days — security + legal cleanup

### Security (50 min total user-time)

Follow `SECURITY-PHASE3-CLICK-GUIDE.md` in this order:

| # | Item | Time | Where |
|---|---|---|---|
| 1 | DNSSEC | 10 min | Cloudflare + domain registrar |
| 2 | Firebase API key HTTP-referrer restrictions | 15 min | Google Cloud Console |
| 3 | Permissions-Policy header | 10 min | Cloudflare Transform Rule |
| 4 | CSP report-only → enforce | 15 min + 24-48h watch | Cloudflare Transform Rule |
| 5 | Backup restoration drill | 30 min one-time, quarterly | Local shell |

Plus: review and merge the **6 open GHA-SHA-pinning PRs** (one per repo, all titled "security(gha): pin actions by commit SHA").

### Legal (you can't do this — need lawyer + Israeli Ltd. registrar)

| Priority | Item | Effort | Cost | Why critical |
|---|---|---|---|---|
| 🔴 P0 | Open **חברה בע"מ (Israeli Ltd.)** | day + lawyer | ~₪1,500 setup + ₪400/yr | **Required before first paying user.** Today you're sole proprietor — any lawsuit hits personal assets. |
| 🔴 P0 | **E&O / professional liability insurance** | hour to get quotes | $600-1,500/yr | Required when users start acting on AI advice. Hiscox / Hartford / Coalition. |
| 🟡 P1 | Lawyer review of ToS (limit-of-liability cap + arbitration to Tel Aviv venue + AI hallucination clause) | day | ₪2,500-5,000 one-time | Today ToS was written by AI — needs Israeli SaaS lawyer signoff. |
| 🟡 P1 | **Per-tool gateAction wiring** (technical part already built) | 4-6h | $0 | Connect `WizeDisclaimer.gateAction({app, actionKey, button})` to Calculate / Analyze / Submit buttons in Tax/Money/Deal/Health. |
| 🟢 P2 | Trademark "WizeLife" (IL + US) | month via lawyer | ₪1,500 IL + $250-1000 US | Defensive — prevents impersonation. |
| 🟢 P2 | Defensive domains (wizelife.com, .io) | 10 min | $30-50/yr | Prevents look-alike phishing. |
| 🔴 P3 | DPA template for B2B | day with lawyer | ₪1,000-2,000 | When first business customer asks "do you have a DPA?" you have it. |

---

## 5. Tech wiring backlog

Built in Session 8 but not yet connected end-to-end:

| Item | What's built | What's missing |
|---|---|---|
| `WizeDisclaimer.gateAction` | API ready in `wize-disclaimer.js` (all 6 repos) | Connect to: WizeTax "Run analysis", WizeMoney "Optimize" (pension), WizeDeal "Analyze property", WizeHealth "Interpret blood test" |
| `WizeDisclaimer.chatStrip` + `aiOutputFooter` | Wired in portal: `wize-ai.html`, `/index.html` AI demo | Wire in: Tax frontend chat, FinSight ai-chat.html, Deal advisor, Health main chat, Travel ai |
| Viral hooks 3-5 | None built | Build: cheapest-month-to-fly hook, pension-vs-peers hook, Lisbon apt ROI |
| GHA pinning PRs | Open in 6 repos | Merge each (1 click) |
| Phase 3 click guide | Document written | User executes (50 min, see §4) |

---

## 6. The hard truth — what NOT to do

| Trap | Why it's a trap |
|---|---|
| Building more features | You've already built MORE than you can distribute. Stop. |
| Spending on paid ads now | $1,000 in Google Ads = ~50 conversions for unknown brand. Same money in a newsletter sponsorship = 500. Same time in Show HN = 5,000 if it lands. |
| FB/WhatsApp group posts | User explicitly rejected this — admins ban, members report. |
| Narrowing to 1-2 apps | User explicitly rejected — 5-app suite IS the differentiation. Keep all 5. |
| Pentest / SOC2 now | $3K-15K wasted before product-market fit. Revisit at $1K MRR. |
| Building disclaimers on EVERY AI output | Becomes noise after 2-3 turns. Use `chatStrip` (slim, persistent) + `aiOutputFooter({firstOnly:true})`. |
| Removing free tier | Cuts signups 5-10×. Each free user costs cents, single paid covers 33. |

---

## 7. Decision log (what we committed to)

| Date | Decision | Why |
|---|---|---|
| 2026-05-17 | Hybrid share: native Web Share on mobile, custom menu on macOS | macOS only offers AirDrop/Notes — useless for sharing a website |
| 2026-05-17 | Ranking-number emoji (1️⃣ 2️⃣) instead of flag emoji in share text | Flag emoji break to � on WhatsApp Web / Windows / older Android |
| 2026-05-17 | Build 2 viral landing pages first, distribute via Show HN | Lower-risk than feature-building; tools already exist |
| 2026-05-17 | Keep free tier despite landing pages | Each free user costs cents; one paid covers 33; conversion 5-10× higher with free funnel |
| 2026-05-17 | De-emphasize YOLO on landing | Premium tier needs data first; show on dashboard only |
| 2026-05-17 | Landing pages = headline comparison; Pro = real comparison (pension + study fund + health + cost-of-living) | User insight — public tool needs to be accurate-but-incomplete so the depth gap pulls users to Pro. Honesty + funnel in one move. |
| 2026-05-18 | Build /social-compare + /relocation-analyzer + /exit-tax-calculator in WizeTax instead of cramming on landing | Public landing = viral hook; depth lives in app behind sign-up. Show HN can show ALL of it as a coherent product. |
| 2026-05-18 | Payslip OCR runs client-side (Tesseract.js); payslip never leaves device | Trust barrier blocks ~30% of upload conversions. Client-side OCR = "your payslip never touches my server" = HN-friendly tech angle. |
| 2026-05-18 | Country mix updated: IT + CY in, CH + EE out | Italy "Lavoratori Impatriati" + Cyprus Non-Dom are real Israeli relocation patterns; Swiss canton-avg too imprecise; Estonia fringe. |
| 2026-05-18 | Section 100A exit-tax calculator separated as own page | Stand-alone tool — different UX (asset inputs vs gross salary) deserves dedicated page. Links back from /relocation-analyzer warning panel. |
| 2026-05-17 | Phase 1 security autonomous, Phase 2 PRs, Phase 3 user-clicks | Pure-additive items zero-risk; PRs let user review; click-guide for items needing user's Cloudflare/GCP access |
| 2026-05-17 | gateAction technical built, lawyer-review pending | Technical wiring done; legal text needs Israeli SaaS lawyer |

---

## 8. How to update this doc

This file lives at the WizeLife portal repo root: `STRATEGY.md`.

To refresh it:
- **You:** open it in any editor (Markdown supported by Word/Pages/Google Docs/Obsidian).
- **Claude:** "update STRATEGY.md with what changed today." Claude will edit + commit + push.

To make it a real `.docx`:
- macOS Pages: File → Open → select `STRATEGY.md` → File → Export → Word.
- Google Docs: File → Open → Upload → `STRATEGY.md` (auto-converts).
- Online: dillinger.io paste + Export → DOCX.

---

_Generated 2026-05-17 by Claude (Session 8). Sources: project handoff memory + reference_growth_strategy + this conversation. Will be refreshed next session._
