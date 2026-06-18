/**
 * tax-data.js — Verified personal income tax data for 20 countries
 *
 * HOW TO UPDATE (takes ~30 min):
 *   1. Visit https://taxsummaries.pwc.com/ → select country → "Individual"
 *   2. Update brackets[] with the new annual thresholds (we convert to monthly below)
 *   3. Update socialSecurity.employee and health rates
 *   4. Update META.validYear and META.updatedAt at the bottom of this file
 *   5. git commit -m "tax: update rates for YEAR" && git push
 *
 * SOURCES (all free, updated annually):
 *   - PwC Worldwide Tax Summaries:  https://taxsummaries.pwc.com/
 *   - OECD Taxing Wages:            https://stats.oecd.org/Index.aspx?DataSetCode=AWCORC
 *   - KPMG Individual Tax Rates:    https://kpmg.com/xx/en/home/services/tax/tax-tools-and-resources/tax-rates-online.html
 *   - Israel tax authority:         https://www.gov.il/he/departments/topics/personal_income_tax_basic/govil-landing-page
 *
 * STRUCTURE per country:
 *   currency     — ISO code
 *   usdRate      — 1 LOCAL = X USD (e.g. ILS=0.27, EUR=1.08, GBP=1.27). Update if >10% drift
 *   brackets     — annual income thresholds in LOCAL currency, marginal rate %
 *   credit       — annual tax credit deducted from liability (in local currency)
 *   socialSec    — employee % (up to ceiling; null = no ceiling)
 *   socialCeil   — annual ceiling for social security (null = unlimited)
 *   health       — separate mandatory health insurance % (0 if bundled in socialSec)
 *   healthCeil   — annual ceiling for health tax
 *   notes        — key caveats for this country
 */

const TAX_DATA = {

  // ── ISRAEL ─────────────────────────────────────────────────── source: rashut hamissim + btl.gov.il + חוק ההסדרים 2026
  IL: {
    flag: '🇮🇱', name: 'ישראל', currency: 'ILS', usdRate: 0.27,
    // 2026 brackets — חוק ההסדרים 2026 widened the 20% and 31% bands.
    // Effect: ~30% of workers (mid-high earners) pay less. Cost to budget
    // ~₪4.5B/yr. Retroactive to Jan 1, 2026 — paychecks reflect via 2026
    // tax-tables booklet from rashut hamissim.
    brackets: [
      { upTo: 84_120,  rate: 10 },              // unchanged
      { upTo: 120_720, rate: 14 },              // unchanged
      { upTo: 228_000, rate: 20 },              // 2026: ceiling moved 193,800 → 228,000 (19,000/mo)
      { upTo: 301_200, rate: 31 },              // 2026: ceiling moved 269,280 → 301,200 (25,100/mo)
      { upTo: 559_680, rate: 35 },              // unchanged
      { upTo: 721_560, rate: 47 },              // unchanged
      { upTo: Infinity, rate: 50 },             // includes 3% mas yesef (surtax) above 721,560
    ],
    credit: 6_534,                              // 2.25 credit points × ₪2,904 (frozen for 2026; was 2,928 in 2024-25)
    // Bituach Leumi + Mas Briut — 2-tier per 2026 rates (btl.gov.il).
    // Below threshold ~₪7,703/mo (~60% avg wage, ~₪92,436/yr): BL 1.04% + Health 3.23% = 4.27% combined.
    // Above: BL 7% + Health 5.17% = 12.17%. Both rates increased from 2025
    // (was 0.4%/3.1% low, 7%/5.0% high).
    socialSec_tier1:    1.04,                 // employee BL rate below threshold
    socialSec_tier2:    7.0,                  // employee BL rate above threshold
    socialSec_threshold:92_436,               // ~60% of average wage (annual) — ₪7,703/mo
    socialCeil:         622_920,              // ₪51,910/mo annual ceiling (was 49,030 in 2025)
    health_tier1:       3.23,                 // mas briut below threshold
    health_tier2:       5.17,                 // mas briut above threshold
    healthCeil:         null,                 // no ceiling on health
    socialSec: 7.0,                           // legacy single-rate fallback
    health:    5.17,
    notes: 'מדרגות 2026 (חוק ההסדרים): 20% הורחבה עד ₪19K/חודש, 31% עד ₪25.1K. ביטוח לאומי 2-tier: 1.04% עד ₪7,703/חודש, 7% מעל (תקרה ₪51,910). מס בריאות 3.23%/5.17%. מס יסף 3% כלול ב-50%. נקודת זיכוי ₪242/חודש (₪2,904/שנה).',
    lastVerified: '2026-05',
  },

  // ── USA ────────────────────────────────── source: IRS Rev. Proc. 2025-XX + One Big Beautiful Bill Act (Jul 2025)
  US: {
    flag: '🇺🇸', name: 'ארה"ב (פדרלי בלבד)', currency: 'USD', usdRate: 1,
    // 2026 brackets: bottom 2 inflated ~4% per OBBBA, others ~2.3%
    brackets: [
      { upTo: 12_400,   rate: 10 },               // was 11,925
      { upTo: 50_400,   rate: 12 },               // was 48,475
      { upTo: 105_700,  rate: 22 },               // was 103,350
      { upTo: 201_775,  rate: 24 },               // was 197,300
      { upTo: 256_225,  rate: 32 },               // was 250,525
      { upTo: 640_600,  rate: 35 },               // was 626,350
      { upTo: Infinity, rate: 37 },               // unchanged
    ],
    credit: 0,
    deduction: 16_100,        // 2026 standard deduction, single (was $15,000 in 2025).
                              // Bug fix 2026-05-18: previously listed as credit=14,600
                              // which under-taxed every US salary by 5-15%.
    socialSec: 6.2,           // FICA Social Security
    socialCeil: 176_100,      // 2026 wage base (was 168,600 in 2025)
    health: 1.45,             // Medicare (no ceiling)
    healthCeil: null,
    notes: 'פדרלי בלבד — מס מדינה מוסיף 0%–13.3%. Standard deduction $16,100 (single 2026). OBBBA הפך קבוע את שינויי TCJA.',
    lastVerified: '2026-05',
  },

  // ── GERMANY ───────────────────────────── source: deutsche-rentenversicherung.de + §32a EStG 2026
  DE: {
    flag: '🇩🇪', name: 'גרמניה', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 12_348,   rate: 0  },            // Grundfreibetrag 2026 (was 12,096)
      // §32a EStG is a continuous 14%→42% curve from €12,348→€68,480. Approximate
      // it with 2 marginal bands — a single 42% band hugely overstated DE tax
      // (€50k showed ~32% effective vs the real ~20%). These bands give ~20.7%
      // effective at €50k and ~24% at €68k, close to the official figures.
      { upTo: 23_000,   rate: 16 },            // lower progressive zone (marginal ~14→24)
      { upTo: 68_480,   rate: 32 },            // upper progressive zone (marginal ~24→42)
      { upTo: 277_826,  rate: 42 },            // top proportional zone
      { upTo: Infinity, rate: 45 },            // Reichensteuer
    ],
    credit: 0,
    socialSec: 9.3,                            // Rentenversicherung employee half
    socialCeil: 96_600,
    health: 7.3,                               // Krankenversicherung employee half
    healthCeil: 66_150,
    notes: '2026: Grundfreibetrag עלה ל-€12,348. Kirchensteuer ~8-9% מהמס. Solidaritätszuschlag בוטל ל-90%.',
    lastVerified: '2026-05',
  },

  // ── FRANCE ────────────────────────── source: PwC France 2026 + Loi de Finances 2026
  FR: {
    flag: '🇫🇷', name: 'צרפת', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 11_600,   rate: 0  },            // 2026: was 11,294 (+0.9% inflation)
      { upTo: 29_579,   rate: 11 },            // 2026: was 28,797
      { upTo: 84_577,   rate: 30 },            // 2026: was 82,341
      { upTo: 181_917,  rate: 41 },            // 2026: was 177,106
      { upTo: Infinity, rate: 45 },            // unchanged
    ],
    credit: 0,
    socialSec: 6.9,
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: '2026: סיפי המדרגות עלו 0.9% (אינפלציה). Prélèvement à la source. Cotisations 22%-23%. PFU (רווחי הון) 30%→31.4%.',
    lastVerified: '2026-05',
  },

  // ── NETHERLANDS ─────────────────────── source: Belastingdienst 2026 + Dutch Tax Budget 2026
  NL: {
    flag: '🇳🇱', name: 'הולנד', currency: 'EUR', usdRate: 1.08,
    // 2026 Box 1 brackets — thresholds inflation-adjusted, rates unchanged
    brackets: [
      { upTo: 38_883,   rate: 35.75 },           // 2026 box 1 (was 38,441)
      { upTo: 78_426,   rate: 37.56 },           // 2026 mid band (was 76,817)
      { upTo: Infinity, rate: 49.50 },           // top — unchanged
    ],
    credit: 3_115,                                // 2026 algemene heffingskorting max (was 3,362)
    socialSec: 0,                                 // bundled in bracket rates
    socialCeil: null,
    health: 1_964,                                // Zvw nominale premie (fixed annual)
    healthCeil: null,
    notes: '2026: Box 1 שיעורי 35.75% / 37.56% / 49.5%. תקרת AHK ירדה €3,362→€3,115. Arbeidskorting מקס €5,685.',
    lastVerified: '2026-05',
  },

  // ── PORTUGAL ─────────────────────────────────────── source: PwC Portugal 2025, CIRS
  PT: {
    flag: '🇵🇹', name: 'פורטוגל', currency: 'EUR', usdRate: 1.08,
    // 2026 IRS brackets — thresholds inflated ~3.51% for inflation;
    // brackets 2-5 rates reduced 0.3pp (PwC 2026 State Budget summary).
    // 2026-05 update — PwC Portugal re-verified Jan 5, 2026 (Lei 45-A/2025).
    // Both rates AND thresholds shifted from the January data we had — a
    // further round of rate cuts (0.3-0.5pp across bands 2-7) and threshold
    // increases (~3-5%).
    brackets: [
      { upTo: 8_342,    rate: 12.50 },          // 2026-05: was 13.25%/7,973
      { upTo: 12_587,   rate: 15.70 },          // 2026-05: was 16.5%/12,031
      { upTo: 17_838,   rate: 21.20 },          // 2026-05: was 22%/17,050
      { upTo: 23_089,   rate: 24.10 },          // 2026-05: was 25%/22,069
      { upTo: 29_397,   rate: 31.10 },          // 2026-05: was 32%/28,099
      { upTo: 43_090,   rate: 34.90 },          // 2026-05: was 35.5%/41,188
      { upTo: 46_566,   rate: 43.10 },          // 2026-05: was 43.5%/53,822
      { upTo: 86_634,   rate: 44.60 },          // 2026-05: NEW band — 45→44.6%
      { upTo: Infinity, rate: 48    },          // top unchanged
    ],
    credit: 0,
    socialSec: 11.0,        // Segurança Social employee — unchanged
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: '2026: שיעורי מדרגות 2-5 הופחתו 0.3pp. סיפי מדרגות עלו ~3.51%. NHR/IFICI — 10 שנות מס 20% לעולים מקצועות "מועילים". Seg. Social 11%.',
    lastVerified: '2026-05',
  },

  // ── SPAIN ──────────────────────────────────── source: AEAT 2026 + PwC Spain 2026
  ES: {
    flag: '🇪🇸', name: 'ספרד', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 12_450,   rate: 19 },               // unchanged for 2026 (national)
      { upTo: 20_200,   rate: 24 },
      { upTo: 35_200,   rate: 30 },
      { upTo: 60_000,   rate: 37 },
      { upTo: 300_000,  rate: 45 },
      { upTo: Infinity, rate: 47 },
    ],
    credit: 0,
    socialSec: 6.5,                                // 2026: 6.5% (was 6.47%)
    socialCeil: 61_214,                            // 2026 max base €5,101.20/mo (was €56,256)
    health: 0,
    healthCeil: null,
    notes: '2026: שיעורים לאומיים ללא שינוי (חבל אוטונומי מוסיף עוד 0-7%). מקס׳ בסיס ביטוח לאומי €61,214/שנה. Beckham Law — עולים: 24% flat עד €600K ל-6 שנים.',
    lastVerified: '2026-05',
  },

  // ── POLAND ─────────────────────────────────── source: Ministerstwo Finansów 2026 + PwC 2026
  PL: {
    flag: '🇵🇱', name: 'פולין', currency: 'PLN', usdRate: 0.25,
    brackets: [
      { upTo: 30_000,   rate: 0  },               // 2026 tax-free amount (kwota wolna)
      { upTo: 120_000,  rate: 12 },               // first bracket
      { upTo: Infinity, rate: 32 },               // second bracket — unchanged
    ],
    credit: 0,                                     // moved tax-free into brackets explicitly
    socialSec: 13.71,                              // ZUS emerytalna+rentowe+chorobowe
    socialCeil: 282_600,                           // 2026 ZUS cap (was 260,190)
    health: 9.0,                                   // NFZ — no cap, not tax-deductible
    healthCeil: null,
    notes: '2026: PIT-0 על PLN 30K ראשון. 12% עד 120K, 32% מעל. ZUS cap PLN 282,600. אין אמנת מניעת כפל מס עם ישראל.',
    lastVerified: '2026-05',
  },

  // ── CZECH REPUBLIC ────────────────────────────────────── source: PwC CZ 2026-01 (verified 2026-05)
  CZ: {
    flag: '🇨🇿', name: "צ'כיה", currency: 'CZK', usdRate: 0.044,
    // 2026: threshold for top rate calculated as 36× average monthly salary.
    // 2026 figure CZK 1,762,812 (per PwC last reviewed 2026-01-07).
    brackets: [
      { upTo: 1_762_812, rate: 15 },        // 2026: was 1,935,552
      { upTo: Infinity,  rate: 23 },
    ],
    credit: 30_840,         // základní sleva na poplatníka
    socialSec: 6.5,         // employee social insurance
    socialCeil: null,
    health: 4.5,            // zdravotní pojištění employee
    healthCeil: null,
    notes: '2026: סף שיעור 23% הורד ל-CZK 1.76M (36× שכר ממוצע). עלות מחיה נמוכה. פראג פופולרית לטכנולוגיסטים. Flat tax יחסית פשוט.',
    lastVerified: '2026-05',
  },

  // ── ESTONIA ────────────────────────────────────────── source: PwC Estonia 2026-02-25 (verified 2026-05)
  EE: {
    flag: '🇪🇪', name: 'אסטוניה', currency: 'EUR', usdRate: 1.08,
    // 2026 — flat 22% (raised from 20% effective Jan 2025; remained 22% for 2026).
    brackets: [
      { upTo: Infinity, rate: 22 }, // flat rate
    ],
    credit: 7_848,          // basic exemption annual (reduces at higher income)
    socialSec: 1.6,         // unemployment insurance employee
    socialCeil: null,
    health: 0,              // employer pays social tax (33%), no employee health contrib
    healthCeil: null,
    notes: '2026: שיעור שטוח 22% (היה 20% עד 2024). E-residency מאפשר ניהול עסק אירופי. Employer social tax 33% — גבוה, אבל רוב עלות הביטוח לאומי על המעסיק.',
    lastVerified: '2026-05',
  },

  // ── IRELAND ────────────────────────────────────────── source: Revenue.ie 2025
  IE: {
    flag: '🇮🇪', name: 'אירלנד', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 44_000,   rate: 20 },               // 2026: was 42,000 — Budget 2026 widened standard band
      { upTo: Infinity, rate: 40 },
    ],
    credit: 3_550,                                 // personal credit + PAYE credit (single)
    socialSec: 4.2,                                // 2026 PRSI (Jan-Sep 4.2%, Oct-Dec 4.35% — avg 4.24%)
    socialCeil: null,
    health: 8.0,                                   // USC max band (avg effective ~4-5%)
    healthCeil: null,
    notes: '2026 Budget: standard 20% band הורחב €42K→€44K. PRSI עלה ל-4.2% (4.35% מאוקטובר). USC 0.5%-8% מדורג.',
    lastVerified: '2026-05',
  },

  // ── SWITZERLAND ──────────────────── source: ESTV 2026 + EY tax alert 2025/2026
  CH: {
    flag: '🇨🇭', name: 'שווייץ (ממוצע קנטון)', currency: 'CHF', usdRate: 1.12,
    brackets: [
      // Federal brackets only — cantonal/municipal added on top (varies wildly)
      { upTo: 18_500,   rate: 0    },              // 2026 — slight inflation adjustment
      { upTo: 33_200,   rate: 0.77 },              // bottom federal bracket
      { upTo: 43_500,   rate: 0.88 },
      { upTo: 58_000,   rate: 2.64 },
      { upTo: 76_100,   rate: 2.97 },
      { upTo: 82_000,   rate: 5.94 },
      { upTo: 108_800,  rate: 6.6  },
      { upTo: 141_500,  rate: 8.8  },
      { upTo: 184_900,  rate: 11   },
      { upTo: Infinity, rate: 13.2 },              // 11.5% special on income >CHF 793,400
    ],
    credit: 0,
    socialSec: 5.3,                                // AHV/IV/EO employee — no cap
    socialCeil: null,
    health: 0,                                     // private insurance ~CHF 350-600/mo separately
    healthCeil: null,
    notes: '2026: רק רמה פדרלית — מס קנטונלי + מוניציפלי מוסיפים 10-25% מעל. AHV/IV/EO 5.3% ללא תקרה. ביטוח בריאות פרטי חובה ~CHF 450/חודש.',
    lastVerified: '2026-05',
  },

  // ── UK ───────────────────────────────────────── source: HMRC 2025/26 (Apr 2025)
  GB: {
    flag: '🇬🇧', name: 'בריטניה', currency: 'GBP', usdRate: 1.27,
    brackets: [
      { upTo: 12_570,   rate: 0  },
      { upTo: 50_270,   rate: 20 },
      { upTo: 125_140,  rate: 40 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialSec: 8.0,         // Class 1 NI employee (8% on £12,570–£50,270, 2% above)
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: '2026/27: ללא שינוי מ-2025/26 — Personal allowance £12,570 (קפוא עד 2031). NHS = ללא פרמיית בריאות.',
    lastVerified: '2026-05',
  },

  // ── UAE ────────────────────────────────────── source: MoF UAE + PwC 2026
  AE: {
    flag: '🇦🇪', name: 'איחוד האמירויות', currency: 'USD', usdRate: 1,
    brackets: [
      { upTo: Infinity, rate: 0 },
    ],
    credit: 0,
    socialSec: 0,                                  // non-GCC expats: no SS
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: '2026: אפס מס הכנסה לכל התושבים — בלי שינוי. עובדים לא-GCC: בלי SS. ביטוח בריאות חובת מעסיק. VAT 5%. תושבי GCC משלמים 5% SS.',
    lastVerified: '2026-05',
  },

  // ── SINGAPORE ────────────────────────── source: IRAS YA2026 (income year 2025)
  SG: {
    flag: '🇸🇬', name: 'סינגפור', currency: 'SGD', usdRate: 0.74,
    brackets: [
      { upTo: 20_000,   rate: 0  },
      { upTo: 30_000,   rate: 2  },
      { upTo: 40_000,   rate: 3.5},
      { upTo: 80_000,   rate: 7  },
      { upTo: 120_000,  rate: 11.5},
      { upTo: 160_000,  rate: 15 },
      { upTo: 200_000,  rate: 18 },
      { upTo: 240_000,  rate: 19 },
      { upTo: 280_000,  rate: 19.5},
      { upTo: 320_000,  rate: 20 },
      { upTo: 500_000,  rate: 22 },
      { upTo: 1_000_000,rate: 23 },
      { upTo: Infinity, rate: 24 },                // NEW top rate 24% above SGD 1M (from YA2024+)
    ],
    credit: 0,
    socialSec: 20.0,                              // CPF employee (citizens/PR only, age <55)
    socialCeil: 72_000,
    health: 0,                                    // bundled in CPF (Medisave)
    healthCeil: null,
    notes: '2026: top bracket 24% מעל SGD $1M (תוקף YA2024+). Employment Pass holders פטורים מ-CPF. Non-residents משלמים 15% flat על משכורת.',
    lastVerified: '2026-05',
  },

  // ── CANADA ──────────────────────── source: CRA 2026 + Federal Budget 2026
  CA: {
    flag: '🇨🇦', name: 'קנדה (פדרלי)', currency: 'CAD', usdRate: 0.73,
    brackets: [
      { upTo: 57_375,   rate: 14 },                // 2026: dropped from 15% to 14%
      { upTo: 114_750,  rate: 20.5 },
      { upTo: 177_882,  rate: 26 },                // 2026 inflated
      { upTo: 253_414,  rate: 29 },                // 2026 inflated
      { upTo: Infinity, rate: 33 },
    ],
    credit: 2_355,                                // 2026 basic personal amount credit (inflated)
    socialSec: 5.95,                              // CPP employee
    socialCeil: 73_200,
    health: 1.66,                                 // EI employee premium
    healthCeil: 65_700,
    notes: '2026: מדרגה תחתונה 15%→14%. Provincial tax מוסיף 6%-25% על הפדרלי (Quebec הגבוה, Alberta הנמוך).',
    lastVerified: '2026-05',
  },

  // ── AUSTRALIA ─────────────────────────── source: ATO 2025-26 + Budget 2026
  AU: {
    flag: '🇦🇺', name: 'אוסטרליה', currency: 'AUD', usdRate: 0.65,
    brackets: [
      { upTo: 18_200,   rate: 0  },
      { upTo: 45_000,   rate: 16 },                // 2025-26: was 19% in 2024-25; will drop to 15% from July 2026
      { upTo: 135_000,  rate: 30 },                // 2025-26: was 32.5% on 45K-120K
      { upTo: 190_000,  rate: 37 },                // 2025-26: was 37% on 120K-180K
      { upTo: Infinity, rate: 45 },
    ],
    credit: 700,                                  // Low Income Tax Offset
    socialSec: 0,                                 // Super is EMPLOYER-paid (11.5% on top of salary)
    socialCeil: null,
    health: 2.0,                                  // Medicare Levy
    healthCeil: null,
    notes: '2025-26: מדרגה 2 ירדה 19%→16% (יורד 15% מ-יולי 2026). Super 11.5% משולם ע״י מעסיק מעבר לברוטו. Medicare Levy 2% כלול. שנת מס יולי–יוני.',
    lastVerified: '2026-05',
  },

  // ── BRAZIL ───────────────────────────── source: Receita Federal 2026
  BR: {
    flag: '🇧🇷', name: 'ברזיל', currency: 'BRL', usdRate: 0.19,
    brackets: [
      { upTo: 26_963,   rate: 0  },
      { upTo: 33_919,   rate: 7.5 },
      { upTo: 45_012,   rate: 15 },
      { upTo: 55_976,   rate: 22.5 },
      { upTo: Infinity, rate: 27.5 },
    ],
    credit: 0,
    socialSec: 7.5,                               // INSS — tiered 7.5%/9%/12%/14% (simplified to lowest)
    socialCeil: 90_396,                           // 2026 INSS cap (~R$877/mo)
    health: 0,
    healthCeil: null,
    notes: '2026: מדרגות IRPF ללא שינוי. INSS מדורג 7.5%–14% עד תקרה R$877/חודש. עלות מחיה נמוכה, מטבע תנודתי.',
    lastVerified: '2026-05',
  },

  // ── THAILAND ──────────────────────── source: Revenue Dept. Thailand 2026
  TH: {
    flag: '🇹🇭', name: 'תאילנד', currency: 'THB', usdRate: 0.028,
    brackets: [
      { upTo: 150_000,  rate: 0  },
      { upTo: 300_000,  rate: 5  },
      { upTo: 500_000,  rate: 10 },
      { upTo: 750_000,  rate: 15 },
      { upTo: 1_000_000,rate: 20 },
      { upTo: 2_000_000,rate: 25 },
      { upTo: 5_000_000,rate: 30 },
      { upTo: Infinity, rate: 35 },
    ],
    credit: 60_000,         // personal allowance annual
    socialSec: 5.0,         // SSO employee
    socialCeil: 180_000,    // monthly ceiling 15,000 THB
    health: 0,
    healthCeil: null,
    notes: '2026: שיעורים יציבים מאז 2013 (0-35%). Thailand LTR Visa — 17% flat על הכנסה זרה לעובדים highly-skilled. עלות מחיה מהנמוכות בעולם.',
    lastVerified: '2026-05',
  },

  // ── GREECE ────────────────────── source: AADE 2026 + Law 5246/2025 (effective Jan 2026)
  GR: {
    flag: '🇬🇷', name: 'יוון', currency: 'EUR', usdRate: 1.08,
    // 2026-05 update — PwC Greece re-verified Feb 16, 2026 + Law 5246/2025.
    // Rates lowered across mid-bands + new 39% band 40K-60K inserted.
    // Lower scales available based on number of children / age<30 (not modeled).
    brackets: [
      { upTo: 10_000,   rate: 9  },               // unchanged
      { upTo: 20_000,   rate: 20 },               // 2026: was 22%
      { upTo: 30_000,   rate: 26 },               // 2026: was 28%
      { upTo: 40_000,   rate: 34 },               // 2026: was 36%
      { upTo: 60_000,   rate: 39 },               // 2026: NEW band (40-60K @ 39%)
      { upTo: Infinity, rate: 44 },               // unchanged
    ],
    credit: 777,                                   // employee credit for income up to €12K
    socialSec: 13.87,                              // EFKA employee
    socialCeil: 93_143,                            // 2026 EFKA cap (€7,761.94/mo annual)
    health: 0,                                     // bundled in EFKA
    healthCeil: null,
    notes: '2026: שיעורים ללא שינוי. EFKA cap €93,143/שנה. עובדים מתחת גיל 25 — 0% עד €20K. תוכנית עולים: 7% flat ל-15 שנה.',
    lastVerified: '2026-05',
  },

  // ── ITALY ─────────────────────────────────── source: Agenzia delle Entrate 2026 + Budget Law 2026
  IT: {
    flag: '🇮🇹', name: 'איטליה', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 28_000,   rate: 23 },             // unchanged
      { upTo: 50_000,   rate: 33 },             // 2026: was 35% — Budget Law dropped 2pp on this band
      { upTo: Infinity, rate: 43 },             // unchanged
    ],
    credit: 1_955,                              // detrazione base lavoro dipendente (avg)
    socialSec: 9.49,                            // INPS employee contribution
    socialCeil: 119_650,
    health: 0,                                  // health funded through general taxation
    healthCeil: null,
    notes: '2026: מדרגת €28K-€50K ירדה 35%→33% (חיסכון עד €440/שנה). "Lavoratori Impatriati" 2024+: רק 50% פטור (לא 70%), cap €600K, 5 שנים. INPS חייב ללא תלות.',
    lastVerified: '2026-05',
  },

  // ── MALTA ──────────────────────────────── source: PwC Malta 2026 + Mercans alert Jan 2026
  MT: {
    flag: '🇲🇹', name: 'מלטה', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: 12_000,   rate: 0  },
      { upTo: 16_000,   rate: 15 },
      { upTo: 60_000,   rate: 25 },
      { upTo: Infinity, rate: 35 },
    ],
    credit: 0,
    socialSec: 10,                              // employee SSC — capped
    socialCeil: 29_084,                          // 2026 insurable wage ceiling
    health: 0,                                   // bundled into general taxation
    healthCeil: null,
    notes: '2026: 0%/15%/25%/35% מדרגות. אנגלית רשמית. Non-Dom remittance מאפשר 0% על הכנסה זרה לא-remitted (מינ׳ €5,000 מס שנתי). קהילה ישראלית גדולה ב-Sliema.',
    lastVerified: '2026-05',
  },

  // ── BULGARIA ──────────────────────────────── source: PwC Bulgaria 2026 + TaxRavens 2026
  BG: {
    flag: '🇧🇬', name: 'בולגריה', currency: 'BGN', usdRate: 0.55,
    brackets: [
      { upTo: Infinity, rate: 10 },              // flat 10% — מהנמוכים ב-EU
    ],
    credit: 0,
    socialSec: 13.78,                            // employee social security
    socialCeil: 46_200,                          // BGN 3,850/mo × 12
    health: 0,                                   // bundled into social
    healthCeil: null,
    notes: '2026: 10% flat — מהנמוכים ב-EU. סופיה תעשייית tech צומחת. גישת EU מלאה. עלות מחיה ~50% מתל-אביב.',
    lastVerified: '2026-05',
  },

  // ── ROMANIA ────────────────────────────── source: ANAF Romania 2026 + countrytaxcalc 2026
  RO: {
    flag: '🇷🇴', name: 'רומניה', currency: 'RON', usdRate: 0.22,
    brackets: [
      { upTo: Infinity, rate: 10 },              // flat 10% PIT
    ],
    credit: 0,
    socialSec: 25,                               // CAS pension 25% (very high)
    socialCeil: null,
    health: 10,                                  // CASS health 10% (no cap, not deductible)
    healthCeil: null,
    notes: '2026: 10% flat PIT, אבל ביטוח לאומי גבוה (CAS 25% + CASS 10% = 35% סה״כ). Tech hub בבוקרשט וקלוז׳ — אנגלית רווחת בתעשייה.',
    lastVerified: '2026-05',
  },

  // ── MONACO ──────────────────────────────────────── source: Monaco gov + PwC 2026
  MC: {
    flag: '🇲🇨', name: 'מונקו', currency: 'EUR', usdRate: 1.08,
    brackets: [
      { upTo: Infinity, rate: 0 },               // 0% income tax for residents (non-French)
    ],
    credit: 0,
    socialSec: 13,                               // approximate employee SS
    socialCeil: 95_000,                          // estimate
    health: 0,
    healthCeil: null,
    notes: 'מס הכנסה 0% למתושבים (לא-צרפתים). דורש 183+ ימי תושבות + פיקדון €500K-1M. למיליונרים בלבד. גישה ל-EU/Schengen.',
    lastVerified: '2026-05',
  },

  // ── GEORGIA ────────────────────────────────── source: Revenue Service Georgia 2026
  GE: {
    flag: '🇬🇪', name: 'גאורגיה', currency: 'GEL', usdRate: 0.36,
    brackets: [
      { upTo: Infinity, rate: 20 },              // 20% flat standard
    ],
    credit: 0,
    socialSec: 2,                                // employee pension contribution
    socialCeil: null,
    health: 0,                                   // no employee health contribution
    healthCeil: null,
    notes: '20% flat regular, אבל **1% Small Business Entrepreneur status** עד $200K הכנסה שנתית — מצוין לעצמאי / startup founder. Easy residency, growing Israeli community.',
    lastVerified: '2026-05',
  },

  // ── CYPRUS ──────────────────────────────────── source: Cyprus Tax Authority 2026 + 2026 tax reform
  CY: {
    flag: '🇨🇾', name: 'קפריסין', currency: 'EUR', usdRate: 1.08,
    // 2026 reform: tax-free threshold raised €19,500 → €22,000; all
    // bracket ceilings shifted UP. Result: meaningful tax reduction.
    // 2026-05 update — PwC re-verified May 18, 2026. The threshold table
    // shifted again slightly from the January version (band ceilings are now
    // €22K / €32K / €42K / €72K — narrower mid-bands than first reported).
    brackets: [
      { upTo: 22_000,   rate: 0  },             // unchanged
      { upTo: 32_000,   rate: 20 },             // 2026-05: was 35,000 (Jan)
      { upTo: 42_000,   rate: 25 },             // 2026-05: was 60,000 (Jan)
      { upTo: 72_000,   rate: 30 },             // unchanged
      { upTo: Infinity, rate: 35 },             // unchanged
    ],
    credit: 0,
    socialSec: 8.8,                             // social insurance employee — unchanged
    socialCeil: 66_612,
    health: 2.65,                               // GHS (Gesy) — unchanged
    healthCeil: 180_000,
    notes: '2026 reform: סף פטור עלה ל-€22K. Non-Dom: 0% מס הכנסה + 0% SDC על דיווידנדים ל-17 שנה; רק GHS 2.65% (תקרה €180K = €4,770 max). אחד ממשטרי המס הנדיבים באירופה.',
    lastVerified: '2026-05',
  },
};

// ── Special tax regimes for new residents / returnees ──────────────────────
// Each regime modifies how calcNet computes tax for a country, IF the user
// declares they qualify. Used by calcNet(code, gross, marital, children, regimeKey).
//
// Types:
//   - 'flat-rate'    — replace bracket calc with a single flat rate (with optional cap)
//   - 'exemption-pct'— reduce taxable income by N%, then apply normal brackets (with optional cap)
//   - 'foreign-exempt' — 0% income tax (assumes income is foreign-sourced)
//   - 'min-tax'      — overrides tax to a flat minimum (Malta non-dom remittance basis)
const REGIMES = {
  // Portugal NHR/IFICI — 20% on Portuguese employment, foreign income exempt
  'PT.nhr': {
    label: { he: 'NHR/IFICI (עולה חדש, 10 שנים)', en: 'NHR/IFICI (new resident, 10 yrs)' },
    eligibility: { he: 'מקצוע מועיל (tech/research) + לא תושב PT 5 שנים', en: 'High-skilled profession + not PT resident in last 5 yrs' },
    type: 'flat-rate', flatRate: 20, durationYrs: 10,
  },
  // Cyprus Non-Dom — 50% exemption on employment income >€55K
  'CY.nondom': {
    label: { he: 'Non-Dom 50% פטור (17 שנים)', en: 'Non-Dom 50% exemption (17 yrs)' },
    eligibility: { he: 'משכורת >€55K + לא תושב CY 15 שנים', en: 'Salary >€55K + not CY resident in last 15 yrs' },
    type: 'exemption-pct', exemptionPct: 50, durationYrs: 17, minSalaryEUR: 55_000,
  },
  // Italy Lavoratori Impatriati — 50% exemption, cap €600K, 5 years
  'IT.impatriati': {
    label: { he: 'Lavoratori Impatriati (5 שנים)', en: 'Lavoratori Impatriati (5 yrs)' },
    eligibility: { he: '"highly qualified" + לא תושב IT 3 שנים + מחויב 5 שנים', en: 'High-skilled + not IT resident 3 yrs + 5-yr commitment' },
    type: 'exemption-pct', exemptionPct: 50, durationYrs: 5, capEUR: 600_000,
  },
  // Spain Beckham Law — 24% flat up to €600K
  'ES.beckham': {
    label: { he: 'Beckham Law 24% flat (6 שנים)', en: 'Beckham Law 24% flat (6 yrs)' },
    eligibility: { he: 'לא תושב ES 5 שנים + Modelo 149 תוך 6 חודשים', en: 'Not ES resident 5 yrs + Modelo 149 within 6 months' },
    type: 'flat-rate', flatRate: 24, durationYrs: 6, capEUR: 600_000,
  },
  // Greece olim 7% on foreign income
  'GR.olim': {
    label: { he: '7% flat על הכנסה זרה (15 שנים)', en: '7% flat on foreign income (15 yrs)' },
    eligibility: { he: 'לא תושב GR 7 מתוך 8 שנים', en: 'Not GR resident 7 of 8 yrs' },
    type: 'flat-rate', flatRate: 7, durationYrs: 15,
  },
  // Israel returning resident (10+ years abroad)
  'IL.toshav-hozer-vatik': {
    label: { he: 'תושב חוזר ותיק (10 שנים פטור הכנסה זרה)', en: 'Senior returning resident (10-yr foreign exemption)' },
    eligibility: { he: 'שהה בחו״ל ≥10 שנים', en: 'Was non-resident ≥10 yrs' },
    type: 'foreign-exempt', durationYrs: 10,
  },
  // Malta Non-Dom remittance
  'MT.nondom': {
    label: { he: 'Non-Dom remittance basis', en: 'Non-Dom remittance basis' },
    eligibility: { he: 'תושב MT לא domiciled', en: 'MT resident, non-domiciled' },
    type: 'min-tax', minTaxEUR: 5_000,
  },
  // Georgia Small Business
  'GE.smallbiz': {
    label: { he: 'Small Business Entrepreneur 1% (עד $200K)', en: 'Small Business Entrepreneur 1% (up to $200K)' },
    eligibility: { he: 'הכנסה <$200K + רישום במשרד המסים', en: 'Income <$200K + register with tax office' },
    type: 'flat-rate', flatRate: 1, capUSD: 200_000,
  },
};

// ── Calculation engine ──────────────────────────────────────────────────────

/**
 * calcNet(countryCode, grossILS, marital, children, regimeKey?) → result object
 *
 * @param {string} grossILS   - gross monthly salary in ILS
 * @param {string} marital    - 'single' | 'married' | 'married_working'
 * @param {number} children   - number of children
 * @param {string} [regimeKey] - optional regime key e.g. 'PT.nhr', 'CY.nondom'.
 *                                When provided + matches REGIMES, overrides tax calc.
 * @returns {{ grossLocal, incomeTax, socialSec, health, netMonthly, netUSD, effectiveRate, regime? }}
 */
function calcNet(countryCode, grossILS, marital, children, regimeKey) {
  const c = TAX_DATA[countryCode];
  if (!c) return null;

  // ILS→USD must use the SAME (live-patched) ILS rate the FX updater writes to
  // TAX_DATA.IL.usdRate — not a frozen 0.27 constant. Otherwise, once the live
  // ECB rate drifts (e.g. 0.27→0.29), every foreign country's gross is derived
  // from a stale ILS rate while its own usdRate is live, and IL's own grossLocal
  // no longer equals the entered gross. Fall back to 0.27 only if IL data absent.
  const ilUsdRate   = (TAX_DATA.IL && TAX_DATA.IL.usdRate) || 0.27;
  const grossUSD    = grossILS * ilUsdRate;               // ILS→USD (live rate)
  const grossLocal  = grossUSD / c.usdRate;               // USD → local
  const grossAnnual = grossLocal * 12;

  // ── Income tax ──────────────────────────────────────────────────────────
  // Subtract deduction from taxable income (US standard deduction style)
  // BEFORE applying brackets. `credit` is then subtracted from the computed
  // tax (Israel-style credit points). Both can co-exist per country.
  const taxableAnnual = Math.max(0, grossAnnual - (c.deduction || 0));
  let taxAnnual = 0;
  let prev = 0;
  for (const b of c.brackets) {
    const slice = Math.min(taxableAnnual, b.upTo) - prev;
    if (slice <= 0) break;
    taxAnnual += slice * b.rate / 100;
    prev = b.upTo;
  }
  taxAnnual = Math.max(0, taxAnnual - (c.credit || 0));

  // ── Special regime override ────────────────────────────────────────────
  // If user declares they qualify for a special new-resident regime, replace
  // the standard tax calc with the regime's rule. Capped where applicable.
  let regimeApplied = null;
  if (regimeKey && REGIMES[regimeKey] && regimeKey.split('.')[0] === countryCode) {
    const r = REGIMES[regimeKey];
    regimeApplied = r;
    if (r.type === 'flat-rate') {
      // Apply flat rate, capped at capEUR/capUSD if specified
      const grossLocalForCap = grossAnnual;
      let taxableForFlat = grossAnnual;
      if (r.capEUR && c.currency === 'EUR') taxableForFlat = Math.min(grossAnnual, r.capEUR);
      else if (r.capUSD) {
        const capLocal = r.capUSD / c.usdRate;
        taxableForFlat = Math.min(grossAnnual, capLocal);
      }
      taxAnnual = taxableForFlat * (r.flatRate / 100);
    } else if (r.type === 'exemption-pct') {
      // Reduce taxable income by exemption %, then re-apply brackets
      const cap = r.capEUR && c.currency === 'EUR' ? r.capEUR : Infinity;
      const exemptIncome = Math.min(grossAnnual, cap) * (r.exemptionPct / 100);
      const newTaxable = Math.max(0, grossAnnual - exemptIncome - (c.deduction || 0));
      let newTax = 0; let p = 0;
      for (const b of c.brackets) {
        const slice = Math.min(newTaxable, b.upTo) - p;
        if (slice <= 0) break;
        newTax += slice * b.rate / 100;
        p = b.upTo;
      }
      taxAnnual = Math.max(0, newTax - (c.credit || 0));
    } else if (r.type === 'foreign-exempt') {
      // Assume income is foreign-sourced (common for Israeli remote workers
      // returning home — they keep their foreign employer)
      taxAnnual = 0;
    } else if (r.type === 'min-tax') {
      // Malta-style: minimum tax in local currency
      taxAnnual = r.minTaxEUR && c.currency === 'EUR' ? r.minTaxEUR : taxAnnual;
    }
  }

  // ── 2-tier social security & health (Israel) ───────────────────────────
  // For countries with `socialSec_tier1/tier2/threshold`, apply low rate
  // below threshold + high rate above. Otherwise fall through to flat rate.
  let ssAnnualTiered = null, healthAnnualTiered = null;
  if (typeof c.socialSec_threshold === 'number') {
    const thr = c.socialSec_threshold;
    const low = Math.min(grossAnnual, thr);
    const high = Math.max(0, Math.min(grossAnnual, c.socialCeil || Infinity) - thr);
    ssAnnualTiered     = (low * c.socialSec_tier1 / 100) + (high * c.socialSec_tier2 / 100);
    if (typeof c.health_tier1 === 'number') {
      const lowH  = Math.min(grossAnnual, thr);
      const highH = Math.max(0, grossAnnual - thr);
      healthAnnualTiered = (lowH * c.health_tier1 / 100) + (highH * c.health_tier2 / 100);
    }
  }

  // Netherlands: fixed health premium added separately
  const nlHealthAnnual = countryCode === 'NL' ? (c.health || 0) : 0;

  // ── Social security ─────────────────────────────────────────────────────
  // Use 2-tier calc if available (Israel); otherwise flat rate.
  let ssAnnual;
  if (ssAnnualTiered !== null) {
    ssAnnual = ssAnnualTiered;
  } else {
    const ssBase = c.socialCeil ? Math.min(grossAnnual, c.socialCeil) : grossAnnual;
    ssAnnual = ssBase * (c.socialSec || 0) / 100;
  }

  // ── Health (separate contribution) ──────────────────────────────────────
  let healthAnnual = 0;
  if (countryCode === 'NL') {
    healthAnnual = nlHealthAnnual;
  } else if (healthAnnualTiered !== null) {
    healthAnnual = healthAnnualTiered;
  } else if (c.health > 0) {
    const hBase  = c.healthCeil ? Math.min(grossAnnual, c.healthCeil) : grossAnnual;
    healthAnnual = hBase * c.health / 100;
  }

  // ── Children credit (simplified) ────────────────────────────────────────
  const childCredit = children > 0
    ? { IL: 2928, US: 2000, DE: 6_384, FR: 1_000, PT: 600, ES: 1_200 }[countryCode] || 0
    : 0;
  taxAnnual = Math.max(0, taxAnnual - childCredit * children);

  // ── Net ─────────────────────────────────────────────────────────────────
  const deductAnnual = taxAnnual + ssAnnual + healthAnnual;
  const netAnnual    = grossAnnual - deductAnnual;

  return {
    grossLocal:    Math.round(grossLocal),
    incomeTax:     Math.round(taxAnnual    / 12),
    socialSec:     Math.round(ssAnnual     / 12),
    health:        Math.round(healthAnnual / 12),
    netMonthly:    Math.round(netAnnual    / 12),
    netUSD:        Math.round((netAnnual / 12) * c.usdRate),
    effectiveRate: grossAnnual > 0 ? Math.round(deductAnnual / grossAnnual * 100) : 0,
    currency:      c.currency,
    notes:         c.notes,
    regime:        regimeApplied,                // null if no regime applied
  };
}

// ── Metadata ────────────────────────────────────────────────────────────────
const TAX_META = {
  validYear:   2026,
  updatedAt:   '2026-05-19',
  nextReview:  '2026-11-01',   // re-check before Israeli 2027 budget proposal published
  changes_since_2026_01: [
    'PT — all 9 brackets shifted lower (12.5/15.7/21.2/24.1/31.1/34.9/43.1/44.6/48). Per PwC Lei 45-A/2025 re-verify 2026-01-05.',
    'CY — Jan-2026 bracket thresholds revised again in May: €32K/€42K (was €35K/€60K). Per PwC 2026-05-18.',
    'GR — rates lowered to 9/20/26/34/39/44 + new 39% band 40-60K. Per Law 5246/2025 + PwC 2026-02-16.',
    'CZ — top-rate threshold lowered to CZK 1.76M (36× average salary). Per PwC 2026-01-07.',
    'EE — flat rate confirmed 22% for 2026 (raised from 20% in 2025). Per PwC 2026-02-25.',
  ],
  knownPending: [
    'NL: arbeidskorting phase-out curve not modeled (uses fixed credit; impact ~€500-1500)',
    'IE: USC tiered structure not modeled (uses 8% flat — overcharges low earners)',
    'CH: brackets here are federal-only — actual tax includes cantonal/municipal (~10-25% addition)',
    'AU: Super 11.5% not added to gross (it\'s employer-paid above salary)',
    'BR: INSS tiered 7.5%/9%/12%/14% simplified to 7.5% (overcharges low earners)',
    'Israel credit-point ₪2,904 frozen for 2026 — unfreeze would raise ~3-5%',
    'IT: Impatriati moved to 50% exempt (was 70%/90% under old regime — confirm via PwC',
  ],
  sources: [
    'PwC Worldwide Tax Summaries 2026 — taxsummaries.pwc.com (re-verified May 2026)',
    'OECD Taxing Wages 2024',
    'KPMG Individual Tax Rates Table 2025',
    'rashut hamissim (taxes.gov.il) + btl.gov.il for Israel-specific',
    'Official tax authority websites per country',
  ],
};


// ── Live FX rates (Frankfurter/ECB, 24 h cache) ──────────────────────────────
// Fetches 1 USD = X CURRENCY rates, converts to 1 LOCAL = X USD and patches
// TAX_DATA.*.usdRate in-place. Falls back to hardcoded values on any error.
// Dispatches 'wl-fx-updated' so pages can call recalc().
(function () {
  if (typeof window === 'undefined') return;
  var CACHE_KEY = 'wl_fx_v1';
  var TTL = 24 * 60 * 60 * 1000;

  function applyRates(rates) {
    Object.values(TAX_DATA).forEach(function (c) {
      if (c.currency === 'USD') return;
      var r = rates[c.currency];
      if (r && r > 0) c.usdRate = Math.round((1 / r) * 100000) / 100000;
    });
    try {
      var el = document.getElementById('wl-fx-label');
      if (el) {
        var ilsRate = TAX_DATA.IL ? TAX_DATA.IL.usdRate : 0.27;
        el.textContent = '₪1 = $' + ilsRate.toFixed(4);
      }
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('wl-fx-updated'));
  }

  function loadFx() {
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.ts && (Date.now() - cached.ts) < TTL && cached.rates) {
        applyRates(cached.rates);
        return;
      }
    } catch (e) {}

    var currencies = Object.values(TAX_DATA)
      .map(function (c) { return c.currency; })
      .filter(function (c) { return c !== 'USD'; });
    currencies = currencies.filter(function (c, i) { return currencies.indexOf(c) === i; });

    fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=' + currencies.join(','))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.rates) return;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates })); } catch (e) {}
        applyRates(data.rates);
      })
      .catch(function () {});
  }

  loadFx();
})();
// Node export — for unit tests in qa/tax-data-tests.js. No-op in browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAX_DATA, calcNet, TAX_META, REGIMES };
}
