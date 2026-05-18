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
 *   usdRate      — 1 USD = X local (approximate, update if >10% drift)
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
    lastVerified: '2026-01',
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
    lastVerified: '2026-01',
  },

  // ── GERMANY ───────────────────────────── source: deutsche-rentenversicherung.de + §32a EStG 2026
  DE: {
    flag: '🇩🇪', name: 'גרמניה', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 12_348,   rate: 0  },            // Grundfreibetrag 2026 (was 12,096)
      { upTo: 68_480,   rate: 42 },            // progressive 14%→42% simplified to midpoint
      { upTo: 277_826,  rate: 42 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialSec: 9.3,                            // Rentenversicherung employee half
    socialCeil: 96_600,
    health: 7.3,                               // Krankenversicherung employee half
    healthCeil: 66_150,
    notes: '2026: Grundfreibetrag עלה ל-€12,348. Kirchensteuer ~8-9% מהמס. Solidaritätszuschlag בוטל ל-90%.',
    lastVerified: '2026-01',
  },

  // ── FRANCE ────────────────────────── source: PwC France 2026 + Loi de Finances 2026
  FR: {
    flag: '🇫🇷', name: 'צרפת', currency: 'EUR', usdRate: 0.92,
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
    lastVerified: '2026-01',
  },

  // ── NETHERLANDS ─────────────────────── source: Belastingdienst 2026 + Dutch Tax Budget 2026
  NL: {
    flag: '🇳🇱', name: 'הולנד', currency: 'EUR', usdRate: 0.92,
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
    lastVerified: '2026-01',
  },

  // ── PORTUGAL ─────────────────────────────────────── source: PwC Portugal 2025, CIRS
  PT: {
    flag: '🇵🇹', name: 'פורטוגל', currency: 'EUR', usdRate: 0.92,
    // 2026 IRS brackets — thresholds inflated ~3.51% for inflation;
    // brackets 2-5 rates reduced 0.3pp (PwC 2026 State Budget summary).
    brackets: [
      { upTo: 7_973,    rate: 13.25 },          // bottom rate unchanged
      { upTo: 12_031,   rate: 16.5  },          // was 18% (-0.3pp inflated below)
      { upTo: 17_050,   rate: 22    },          // was 23%
      { upTo: 22_069,   rate: 25    },          // was 26%
      { upTo: 28_099,   rate: 32    },          // was 32.75%
      { upTo: 41_188,   rate: 35.5  },          // was 37% (-1.5pp + inflation)
      { upTo: 53_822,   rate: 43.5  },          // unchanged
      { upTo: 84_049,   rate: 45    },          // unchanged rate, inflated threshold
      { upTo: Infinity, rate: 48    },          // top unchanged
    ],
    credit: 0,
    socialSec: 11.0,        // Segurança Social employee — unchanged
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: '2026: שיעורי מדרגות 2-5 הופחתו 0.3pp. סיפי מדרגות עלו ~3.51%. NHR/IFICI — 10 שנות מס 20% לעולים מקצועות "מועילים". Seg. Social 11%.',
    lastVerified: '2026-01',
  },

  // ── SPAIN ──────────────────────────────────── source: AEAT 2026 + PwC Spain 2026
  ES: {
    flag: '🇪🇸', name: 'ספרד', currency: 'EUR', usdRate: 0.92,
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
    lastVerified: '2026-01',
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
    lastVerified: '2026-01',
  },

  // ── CZECH REPUBLIC ────────────────────────────────────── source: PwC CZ 2025
  CZ: {
    flag: '🇨🇿', name: "צ'כיה", currency: 'CZK', usdRate: 0.044,
    brackets: [
      { upTo: 1_935_552, rate: 15 },
      { upTo: Infinity,  rate: 23 },
    ],
    credit: 30_840,         // základní sleva na poplatníka
    socialSec: 6.5,         // employee social insurance
    socialCeil: null,
    health: 4.5,            // zdravotní pojištění employee
    healthCeil: null,
    notes: 'עלות מחיה נמוכה. פראג פופולרית לטכנולוגיסטים. Flat tax פשוט יחסית.',
  },

  // ── ESTONIA ────────────────────────────────────────── source: MTA (Maksu- ja Tolliamet) 2025
  EE: {
    flag: '🇪🇪', name: 'אסטוניה', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: Infinity, rate: 22 }, // flat rate from 2024
    ],
    credit: 7_848,          // basic exemption annual (reduces at higher income)
    socialSec: 1.6,         // unemployment insurance employee
    socialCeil: null,
    health: 0,              // employer pays social tax (33%), no employee health contrib
    healthCeil: null,
    notes: 'E-residency מאפשר ניהול עסק אירופי. Employer social tax 33% — גבוה, אבל רוב עלות הביטוח לאומי על המעסיק.',
  },

  // ── IRELAND ────────────────────────────────────────── source: Revenue.ie 2025
  IE: {
    flag: '🇮🇪', name: 'אירלנד', currency: 'EUR', usdRate: 0.92,
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
    lastVerified: '2026-01',
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
    lastVerified: '2026-01',
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
    lastVerified: '2026-01',
  },

  // ── UAE ──────────────────────────────────────────────────────── source: MoF UAE
  AE: {
    flag: '🇦🇪', name: 'איחוד האמירויות', currency: 'USD', usdRate: 1,
    brackets: [
      { upTo: Infinity, rate: 0 },
    ],
    credit: 0,
    socialSec: 0,
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: 'אפס מס הכנסה אישי. אין ביטוח לאומי לעובדים זרים. ביטוח בריאות חובה על המעסיק. עלות מחיה גבוהה (דובאי).',
  },

  // ── SINGAPORE ─────────────────────────────────────── source: IRAS YA2025
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
      { upTo: Infinity, rate: 22 },
    ],
    credit: 0,
    socialSec: 20.0,        // CPF employee contribution (age < 55, varies by age)
    socialCeil: 72_000,     // ordinary wage ceiling annual
    health: 0,              // bundled in CPF (Medisave)
    healthCeil: null,
    notes: 'CPF הוא חיסכון לפרישה + בריאות שחוזר אליך — לא מס. עובדים זרים (EP) פטורים מ-CPF.',
  },

  // ── CANADA ────────────────────────────────────────── source: CRA 2025
  CA: {
    flag: '🇨🇦', name: 'קנדה (פדרלי)', currency: 'CAD', usdRate: 0.73,
    brackets: [
      { upTo: 57_375,   rate: 15 },
      { upTo: 114_750,  rate: 20.5 },
      { upTo: 158_519,  rate: 26 },
      { upTo: 220_000,  rate: 29 },
      { upTo: Infinity, rate: 33 },
    ],
    credit: 2_306,          // basic personal amount credit
    socialSec: 5.95,        // CPP employee (2025)
    socialCeil: 73_200,
    health: 1.66,           // EI employee premium
    healthCeil: 65_700,
    notes: 'Provincial tax מוסיף 6%-25% על הפדרלי. מחוז קוויבק — הגבוה ביותר. אלברטה — הנמוך.',
  },

  // ── AUSTRALIA ─────────────────────────────────── source: ATO 2024-25
  AU: {
    flag: '🇦🇺', name: 'אוסטרליה', currency: 'AUD', usdRate: 0.65,
    brackets: [
      { upTo: 18_200,   rate: 0  },
      { upTo: 45_000,   rate: 19 },
      { upTo: 120_000,  rate: 32.5},
      { upTo: 180_000,  rate: 37 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 700,            // Low Income Tax Offset (max, phases out)
    socialSec: 0,           // Superannuation is employer-paid (11% on top of salary)
    socialCeil: null,
    health: 2.0,            // Medicare Levy
    healthCeil: null,
    notes: 'Superannuation 11% — חיסכון פנסיוני שמעסיק מוסיף מעבר לברוטו. שנת מס יולי–יוני.',
  },

  // ── BRAZIL ─────────────────────────────────────────── source: Receita Federal 2025
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
    socialSec: 7.5,         // INSS employee (reduced rate for lower brackets, simplified)
    socialCeil: 90_396,
    health: 0,
    healthCeil: null,
    notes: 'INSS מדורג 7.5%–14% לפי שכר. עלות מחיה נמוכה אך אינפלציה ואי-יציבות מטבע.',
  },

  // ── THAILAND ──────────────────────────────────────── source: Revenue Dept. Thailand 2025
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
    notes: 'Thailand LTR Visa — עד 17% מס על הכנסה ממקורות חוץ. עלות מחיה נמוכה מאוד.',
  },

  // ── GREECE ────────────────────── source: AADE 2026 + Law 5246/2025 (effective Jan 2026)
  GR: {
    flag: '🇬🇷', name: 'יוון', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 10_000,   rate: 9  },               // unchanged
      { upTo: 20_000,   rate: 22 },               // unchanged
      { upTo: 30_000,   rate: 28 },               // unchanged
      { upTo: 40_000,   rate: 36 },               // unchanged
      { upTo: Infinity, rate: 44 },               // unchanged
    ],
    credit: 777,                                   // employee credit for income up to €12K
    socialSec: 13.87,                              // EFKA employee
    socialCeil: 93_143,                            // 2026 EFKA cap (€7,761.94/mo annual)
    health: 0,                                     // bundled in EFKA
    healthCeil: null,
    notes: '2026: שיעורים ללא שינוי. EFKA cap €93,143/שנה. עובדים מתחת גיל 25 — 0% עד €20K. תוכנית עולים: 7% flat ל-15 שנה.',
    lastVerified: '2026-01',
  },

  // ── ITALY ─────────────────────────────────── source: Agenzia delle Entrate 2026 + Budget Law 2026
  IT: {
    flag: '🇮🇹', name: 'איטליה', currency: 'EUR', usdRate: 0.92,
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
    lastVerified: '2026-01',
  },

  // ── CYPRUS ──────────────────────────────────── source: Cyprus Tax Authority 2026 + 2026 tax reform
  CY: {
    flag: '🇨🇾', name: 'קפריסין', currency: 'EUR', usdRate: 0.92,
    // 2026 reform: tax-free threshold raised €19,500 → €22,000; all
    // bracket ceilings shifted UP. Result: meaningful tax reduction.
    brackets: [
      { upTo: 22_000,   rate: 0  },             // was 19,500
      { upTo: 35_000,   rate: 20 },             // was 28,000
      { upTo: 60_000,   rate: 25 },             // was 36,300
      { upTo: 72_000,   rate: 30 },             // was 60,000
      { upTo: Infinity, rate: 35 },             // unchanged
    ],
    credit: 0,
    socialSec: 8.8,                             // social insurance employee — unchanged
    socialCeil: 66_612,
    health: 2.65,                               // GHS (Gesy) — unchanged
    healthCeil: 180_000,
    notes: '2026 reform: סף פטור עלה ל-€22K. Non-Dom: 0% מס הכנסה + 0% SDC על דיווידנדים ל-17 שנה; רק GHS 2.65% (תקרה €180K = €4,770 max). אחד ממשטרי המס הנדיבים באירופה.',
    lastVerified: '2026-01',
  },
};

// ── Calculation engine ──────────────────────────────────────────────────────

/**
 * calcNet(countryCode, grossILS, marital, children) → result object
 *
 * @param {string} grossILS   - gross monthly salary in ILS
 * @param {string} marital    - 'single' | 'married' | 'married_working'
 * @param {number} children   - number of children
 * @returns {{ grossLocal, incomeTax, socialSec, health, netMonthly, netUSD, effectiveRate }}
 */
function calcNet(countryCode, grossILS, marital, children) {
  const c = TAX_DATA[countryCode];
  if (!c) return null;

  const grossUSD    = grossILS * 0.27;                    // approx ILS→USD
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
    effectiveRate: Math.round(deductAnnual / grossAnnual * 100),
    currency:      c.currency,
    notes:         c.notes,
  };
}

// ── Metadata ────────────────────────────────────────────────────────────────
const TAX_META = {
  validYear:   2026,
  updatedAt:   '2026-05-18',
  nextReview:  '2026-11-01',   // re-check before Israeli 2027 budget proposal published
  knownPending: [
    'Israel credit-point value (₪2,904) — frozen for 2026; an unfreeze would raise it ~3-5%',
    'EE/CZ — not yet verified to 2026 (low priority — not on /p/salary-compare default mix)',
    'CA/AU/BR/TH/SG — not yet verified to 2026 (low priority — niche destinations)',
    'NL: arbeidskorting phase-out curve not modeled (uses fixed credit; impact ~€500-1500)',
    'IE: USC tiered structure not modeled (uses 8% flat — overcharges low earners)',
    'CH: brackets here are federal-only — actual tax includes cantonal/municipal (~10-25% addition)',
  ],
  sources: [
    'PwC Worldwide Tax Summaries 2025 — taxsummaries.pwc.com',
    'OECD Taxing Wages 2024',
    'KPMG Individual Tax Rates Table 2025',
    'rashut hamissim (taxes.gov.il) + btl.gov.il for Israel-specific',
    'Official tax authority websites per country',
  ],
};

// Node export — for unit tests in qa/tax-data-tests.js. No-op in browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAX_DATA, calcNet, TAX_META };
}
