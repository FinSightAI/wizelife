# Show HN — Submission Playbook

> **Target date:** Tuesday 2026-05-20, 17:00-19:00 Israel time (7-9 AM Pacific).
> **Backup:** Thursday 2026-05-22 same window.
> **Goal:** front page → 2,000-5,000 visits + 50-200 signups + 5-20 paid conversions.

This doc has everything you need to launch + survive the first 2 hours.

---

## 1. Pre-flight (do this Monday evening, the night before)

| Check | Why | Status |
|---|---|---|
| Open `https://wizelife.ai/p/salary-compare.html` on mobile + desktop | First impression matters | ☐ |
| Type a salary, click "Get real analysis", run BOTH tabs (manual + payslip) | Modal flow works end-to-end | ☐ |
| Click "Share" → WhatsApp/Email/Copy each work | Share menu doesn't break | ☐ |
| Click sign-up CTA — confirm wizelife.ai/auth.html loads | Funnel ends in a working signup | ☐ |
| Open `/relocation-analyzer` + `/social-compare` + `/exit-tax-calculator` on Vercel | Depth pages are reachable for curious HN folks | ☐ |
| GitHub repo is public + tax-data.js is browsable | "Stack: vanilla JS" claim is verifiable | ☐ |
| HN account has karma > 1 (post karma check) | Show HN posts need account >1 day old, recommended >10 karma | ☐ |
| Open Chrome DevTools tab on the live URL — confirm no console errors | Free QA, HN will look | ☐ |

---

## 2. The submission

### URL to submit
```
https://wizelife.ai/p/salary-compare.html
```

### Title (pick one — recommendation: #1)

| # | Title | Why |
|---|---|---|
| ⭐ **1** | `Show HN: Compare salary in 20 countries, with client-side payslip OCR` | "client-side OCR" = tech-novel hook HN loves |
| 2 | `Show HN: Net take-home salary across 20 countries, no signup` | Cleaner value, less tech-hookey |
| 3 | `Show HN: Israeli relocation calculator (tax + COL + 10y cashflow, no signup)` | Israeli angle = niche differentiator |

### Body — paste this exactly

```
https://wizelife.ai/p/salary-compare.html

I built this because Israeli friends thinking about relocation kept
asking "how much would I take home in X country?" and the answers from
random calculators always disagreed.

Type a gross monthly salary, see net take-home in 20 countries
instantly. No signup. Tax brackets from PwC Worldwide Tax Summaries
2025 + OECD. Single-employee by default; family/children togglable.

The "deep analysis" option takes pension contributions, Keren
Hishtalmut (an Israel-specific tax-free study fund — a big gotcha for
relocation math because no other country has an equivalent), and
family situation. For users who don't want to type 5 fields, you can
drop a payslip in and Tesseract.js runs OCR in the browser. The
payslip never touches my server — only the four extracted numbers do.

Stack: vanilla HTML/CSS/JS (no framework), Firebase for the wider
site, GitHub Pages for hosting. Tax data lives in a single JS file:
https://github.com/FinSightAI/wizelife/blob/main/js/tax-data.js — easy
to audit or fork.

Honest about limitations:
- Cost of living differential isn't in the public calc (Lisbon vs Tel
  Aviv vs Dubai have wildly different baseline costs). The Pro tool
  at mastermove.vercel.app/relocation-analyzer adds Numbeo COL plus
  10-year cumulative cashflow.
- US is "federal only" — state tax not modeled.
- Switzerland is a canton average; some cantons swing 8-28%.
- Payslip OCR works best on standard Israeli formats; unusual PDF
  layouts can fumble.

Two things I'm actually curious about from HN:

1. Anyone else using Tesseract.js for sensitive doc OCR in production?
   The accuracy/UX tradeoff is brutal on Hebrew but I really didn't
   want to send payslips to a server.

2. If you've done a relocation between any of these 20 countries,
   what data point did you wish a tool had shown you that wasn't
   obvious from the gross/net headline?
```

### Hashtags / categories
HN doesn't use hashtags. Just submit.

---

## 3. The first 2 hours — engagement strategy

### The IRON RULE
**Be online and replying within 5-10 minutes for the first 2 hours.** This is what makes the difference between front page and /newest grave.

### What gets you banned (don't do)
- ❌ Ask friends to upvote ("vote-rigging" is detected automatically)
- ❌ Reply "Thanks!" with no content (noise)
- ❌ Reply defensively to criticism
- ❌ Post the same submission again within 30 days
- ❌ Edit the title after submission

### What works
- ✅ Reply to every comment with a concrete answer
- ✅ Concede valid criticism: "You're right, [...] — here's what I'll do"
- ✅ Link to the actual code when relevant
- ✅ Stay humble — never "as I mentioned in the README" tone

---

## 4. Canned responses for likely comments

Copy these into a notes app for fast access during the launch.

### Technical / accuracy

> **"Switzerland data is wrong for canton X"**
You're right — this uses national average. I considered canton-level but the data sparsity made it noisy in the early build. PRs welcome.

> **"What about US state tax?"**
Federal only by design — wanted apples-to-apples across countries for the first version. State-by-state is a clear next step. Open to suggestions on which 5 to add first (CA, NY, TX, FL, WA?).

> **"Your German Sozialversicherung percentages are off"**
The 20% combined I show is employee-side only. Employer pays roughly matching. Could you point me at the source you're seeing? Happy to update.

> **"Tax data is X% off for country Y"**
Could you share the source you're using? PwC/OECD have small lag from actual published rates. I'll verify and update tonight.

### Privacy / security

> **"Concerns about payslip upload"**
Fair concern. Tesseract.js runs entirely in your browser — payslip never leaves your device. Source: https://github.com/FinSightAI/wizelife/blob/main/js/payslip-extractor.js. You can disconnect from Wi-Fi after the JS loads (~3MB) and OCR still works. Only the 4 extracted numbers (gross, pension employee, pension employer, study fund) ever enter the comparison.

> **"Why not Web Workers for OCR?"**
Good point — current version runs on main thread which can jank. On my todo list.

### Tech stack

> **"Why no framework? Why vanilla JS?"**
Started solo, wanted to keep cognitive load low + ensure GitHub Pages hosting stays free + page weight tiny. The sub-apps (in the wider WizeLife suite) use Next.js where it actually helps. Tax-data is plain JS so it's verifiable in 30 seconds.

> **"Why Firebase?"**
Started with Firebase Auth for SSO across the 5 sub-apps. Probably hits scale-walls eventually but at 0 users today it's the right choice. Would consider Supabase if I redo from scratch.

> **"Tesseract on Hebrew is unreliable"**
Brutally unreliable. ~60% accuracy on clean payslips, ~40% on bad scans. The fallback is manual entry (5 fields, 30 sec). If you've solved Hebrew OCR better, I'd love to learn how.

### Brand / context

> **"What's WizeLife? Looks startup-y"**
Yeah — I'm building a 5-app suite for Israelis abroad (money/tax/travel/health/real-estate). This tool is the open public taster from one of the apps (mastermove.vercel.app). Happy to share the broader thesis if useful.

> **"Who are you?"**
Solo founder, Israeli, building in public. Twitter: [add your handle].

### Tools / depth

> **"This is just a calculator — what's the actual product?"**
Fair. The public landing is one component. The full product is at mastermove.vercel.app — relocation-analyzer (tax + cost-of-living + 10y cashflow), social-compare (Bituach Leumi vs every country), exit-tax-calculator (Section 100A — most calculators forget this). Public landing is the hook to demonstrate quality.

> **"How do you know the tax data is right?"**
The 8 main countries (IL/PT/CY/IT/US/DE/GB/FR) were verified against 2026 sources in May 2026 — each row has a `lastVerified` field. The calc engine has 24 unit tests covering bracket math, deduction-vs-credit semantics, 2-tier Israeli BL, and edge cases. Source: https://github.com/FinSightAI/wizelife/blob/main/qa/tax-data-tests.js — runs in 50ms via `node --test`.

> **"Why no Romania/Bulgaria/Cyprus?"**
Cyprus is actually there! Romania + Bulgaria on the list — what would you prioritize? First version targeted destinations Israeli expats actually consider in volume.

---

## 5. After-launch checklist

### If you hit front page (top 30)
| When | Action |
|---|---|
| Hours 1-3 | Reply to every comment. Stay sharp. |
| Hours 3-6 | Track Google Analytics / Cloudflare Analytics for visitor surge. Note where they drop off. |
| Day 1 | Tweet "Reached the HN front page — thanks all" with concrete numbers (X visits, Y signups) |
| Day 2 | Write a build-in-public post on X about the experience |
| Day 3 | LinkedIn post with the learnings, screenshots |
| Week 1 | Reply to anyone who emailed you. Send personal "thank you, here's a discount code" |

### If you don't (don't take it personally)
- HN is unpredictable. Day-of-week, hour, randomness all matter.
- Try again in **3+ months** with a new feature or angle.
- Indie Hackers + Product Hunt are good follow-ups (1-2 weeks each).

### Signal the post is dead
- Less than 5 votes after 1 hour → unlikely to take off
- More than 10 votes in first 30 min → likely front-page

---

## 6. Funnel sanity check (before launch)

Walk through what an HN visitor will see:

```
HN comment "Show HN: Compare salary in 20 countries..."
   ↓ click
https://wizelife.ai/p/salary-compare.html
   ↓ first impression (3 sec attention)
   • Page loads in <1s ✓
   • Headline + sub clear in Hebrew/English ✓
   • Input + comparison renders on default value ✓
   ↓ engage (15-30 sec attention)
   • User types own salary → table updates ✓
   • Hits Share buttons (curiosity) ✓
   ↓ scroll down (30-60 sec)
   • Sees "deep analysis" CTA ✓
   • Reads "what this doesn't include" list ✓
   ↓ choice
   • Click "deep analysis" → modal → manual entry or upload payslip
   • Or: click "Sign up free" → wizelife.ai/auth.html
   ↓ conversion
   • Sign-up complete → /dashboard.html or /relocation-analyzer
```

**Bottleneck risks:**
- Page load slow → drops visitors immediately. Confirm <2s LCP on mobile.
- Share button hidden → less viral. Already visible.
- Sign-up requires Google + email confirm → friction. Acceptable.

---

## 7. Standby contacts

| Resource | URL / who |
|---|---|
| HN submission page | https://news.ycombinator.com/submit |
| HN guidelines | https://news.ycombinator.com/showhn.html |
| Status of your post | https://news.ycombinator.com/submitted?id=YOUR_USER |
| Cloudflare Analytics | wizelife.ai → Cloudflare dash → Analytics |
| GitHub repo (for code questions) | https://github.com/FinSightAI/wizelife |
| Tax data source file | https://github.com/FinSightAI/wizelife/blob/main/js/tax-data.js |

---

## 8. The honest "what could go wrong"

- 🔴 **Payslip OCR fails on a famous HN poster's payslip** → reply fast, acknowledge limitation, suggest manual entry
- 🟡 **HN cohort points out we should use the OECD methodology not PwC** → take note, update silently next day
- 🟡 **Someone calculates exit-tax themselves and finds an edge case** → engage, learn, fix
- 🟢 **Goes nowhere** → 90% of Show HN's. Try again in 3 months with `/relocation-analyzer` ("now with payslip OCR")
- 🔴 **wizelife.ai goes down** → Cloudflare should handle. If not: Cloudflare status page + emergency Vercel mirror

---

_Generated 2026-05-18 by Claude (Session 9). Update this doc as you learn from the launch — what comments came, what conversions happened, what next time should be different._
