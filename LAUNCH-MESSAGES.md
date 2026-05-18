# Launch Messages — Copy/Paste Ready

> **Target:** first 200 users via X build-in-public + personal WhatsApp 1:1.
> **Companion:** `SHOW-HN-PLAYBOOK.md` for Tue 20/5 HN launch.

This doc contains:
1. **X (Twitter) post #1** — for tonight or tomorrow morning
2. **5 WhatsApp templates** — different tones per relationship segment
3. **Quick rules of engagement**

---

## 1. X — Build-in-public Post #1

> Pick ONE variant. Don't post multiple. Schedule for 10:00-12:00 or 19:00-21:00 Israel time (typical Israeli tech-Twitter engagement window).

### Variant A — Tech angle (recommended for first post)

```
Built a salary calculator that compares net take-home across 20 countries.
For Israeli relocators specifically.

The trick: I added Keren Hishtalmut to the math. No other calculator does
this — and it kills the "Portugal/UAE looks better" narrative for many
profiles.

Drop a payslip and Tesseract.js runs OCR in the browser. Payslip never
leaves your device.

https://wizelife.ai/p/salary-compare.html

#buildinpublic
```

**Image:** Screenshot of `/p/salary-compare.html` mobile view showing 4 countries with the new "Real PP" badges visible. Crop to show: title + input + 4 rows + 1 share button.

### Variant B — Insight angle

```
Spent 6 hours this weekend on something most relocation calculators get
wrong: cost of living.

Lisbon net salary looks 25% above Tel Aviv. Adjust for COL? It's actually
~90% better in purchasing power.

UAE net looks +44% above Israel. Adjust for COL + missing pension safety?
Less compelling than it sounds.

Built a free tool for Israeli expats to see the real picture (no signup):
https://wizelife.ai/p/salary-compare.html

#fintech #relocation
```

**Image:** Screenshot of the deep-analysis result with 5 countries showing "Real $X" badges.

### Variant C — Personal story angle

```
Two years ago I almost moved to Berlin. Almost meaning I had the apartment
picked out.

What changed my mind: the spreadsheet I built showed +$2K/mo nominal
salary, but minus pension, study fund, and ~30% extra cost of living for
the family's needs, it actually came out about even.

Built that spreadsheet into a tool, made it free, no signup, in 20
countries — for the next person almost-moving:
https://wizelife.ai/p/salary-compare.html

#buildinpublic
```

**Image:** Same as variant B.

### Post #2 (3-4 days later) — Lesson learned

```
TIL — when you call navigator.share() on macOS Safari, the share sheet
suggests AirDrop / Notes / Reminders. Useless for sharing a public site.

Built a custom WhatsApp / Email / Copy menu instead. On mobile, fall
through to native (good experience). On desktop, show the menu directly.

Open source: https://github.com/FinSightAI/wizelife/blob/main/js/wize-share.js

#webdev #buildinpublic
```

### Post #3 (after Show HN) — Numbers post

```
Week 1 of wizelife.ai shipping:
- N visitors
- N signups
- N paying conversions
- M revenue

Channels:
- X build-in-public: X%
- Show HN (Tue): Y%
- Personal WhatsApp: Z%
- Other: …

Biggest insight: …

#buildinpublic
```

(Fill in real numbers after first week.)

---

## 2. WhatsApp — 5 templates by relationship

> **Iron rule:** send these as PERSONAL 1:1 messages. NOT in groups. Group posting will get you banned and burn your reputation.
> Different relationship = different message. The first sentence should reference WHY you're sending to THEM specifically.

### Template 1 — Family member (e.g., parents, siblings)

```
היי [שם], בנית כלי קטן שחישבתי איתו פעם איך נראית משכורת בחו"ל
לעומת ישראל. עכשיו זה מוכן ופתוח לכולם. אם יש לך זמן — תגיד לי
מה לא ברור או מה חסר?

https://wizelife.ai/p/salary-compare.html
```

### Template 2 — Friend abroad (already relocated)

```
היי [שם], אני בונה כלי השוואת משכורות בין מדינות במיוחד לישראלים
שחושבים על מעבר. אתה כבר עברת ל-[country] — האם זה משקף מה שאתה
חווה? בהרבה דקדנים זה גם נכלל פנסיה וקרן השתלמות:

https://wizelife.ai/p/salary-compare.html

הייתי שמח לפידבק של חצי דקה.
```

### Template 3 — Israeli friend considering relocation

```
היי [שם], לפני כמה זמן אמרת לי שאתה מתלבט על [פורטוגל/UAE/ארה"ב].
בניתי כלי עם נתוני 2025 שמראה נטו במדינות אחרי מס + פנסיה
+ קרן השתלמות + יוקר מחיה. תנסה? אשמח אם תגיד לי איזה נתון חסר:

https://wizelife.ai/p/salary-compare.html
```

### Template 4 — Dev / tech friend (HN-curious)

```
היי [שם], בניתי SaaS לישראלים שעוברים בין מדינות, ויש משהו מעניין:
חישוב OCR של תלוש משכורת רץ במקומי בדפדפן עם Tesseract.js — בלי
upload לשרת. מקווה להגיש Show HN ביום ג'. תוכל לעבור על זה
ולתת לי פידבק על הראש לפני? הלינק:

https://wizelife.ai/p/salary-compare.html
```

### Template 5 — Friend in finance / accounting

```
היי [שם], בניתי כלי חינמי שמשווה משכורת ישראלית מול 20 מדינות —
כולל פנסיה, קרן השתלמות, ביטוח לאומי. ב-WizeTax יש מחשבון מס יציאה
לפי סעיף 100A. תוכל להעיף מבט שתי דקות ולסמן לי אם יש משהו לא
מדויק?

https://wizelife.ai/p/salary-compare.html
https://mastermove.vercel.app/exit-tax-calculator
```

---

## 3. Rules of engagement (WhatsApp)

| Do | Don't |
|---|---|
| Send 1:1, personalized first sentence | Send to groups |
| Ask for SPECIFIC feedback (1 question) | Generic "what do you think?" |
| Send max 10/day for 5 days | Bulk-blast 50 in one hour |
| If they don't reply within 2 days, drop it | Re-send / follow up |
| Reply to their reply within an hour | Leave them on read |
| Send during 10:00-21:00 Israel time | Late night |

## 4. Expected response rates

| Segment | Open rate | Click rate | Sign-up rate |
|---|---|---|---|
| Family / close friends | ~95% | ~80% | ~30% |
| Old colleagues | ~70% | ~40% | ~10% |
| Acquaintances | ~50% | ~20% | ~3% |
| Cold-ish contacts | ~20% | ~5% | ~1% |

Realistic outcome of 50 personal WhatsApps: 30-50 first users.

---

## 5. Track everything in a simple table

After each send, log:

```
| Date  | Name       | Template | Reply? | Signed up? | Notes        |
|-------|------------|----------|--------|------------|--------------|
| 18/5  | אבי        | T3       | yes    | yes        | suggested CY |
| 18/5  | רותם       | T4       | -      | -          |              |
| 19/5  | שמעון      | T2       | yes    | no         | dislikes UI  |
```

This becomes the "first 50 users" doc — invaluable for the next launch.

---

_Generated 2026-05-18 by Claude (Session 9). Update with what actually worked + replace projections with real numbers._
