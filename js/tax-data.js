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

  // ── ISRAEL ─────────────────────────────────────────────────── source: irs.gov.il 2025
  IL: {
    flag: '🇮🇱', name: 'ישראל', currency: 'ILS', usdRate: 0.27,
    brackets: [
      { upTo: 84_120,  rate: 10 },
      { upTo: 120_720, rate: 14 },
      { upTo: 193_800, rate: 20 },
      { upTo: 269_280, rate: 31 },
      { upTo: 559_680, rate: 35 },
      { upTo: 721_560, rate: 47 },
      { upTo: Infinity, rate: 50 },
    ],
    credit: 6_591,          // 2.25 credit points × 2,928
    socialSec: 7.0,         // employee Bituach Leumi (above min wage)
    socialCeil: 588_360,    // annual ceiling (49,030/mo)
    health: 5.0,            // Kupat Holim — no ceiling
    healthCeil: null,
    notes: 'ביטוח לאומי 3.5% עד שכר מינימום, 12% מעל. בריאות 3.1%/5%. מדרגות לשנת 2025.',
  },

  // ── USA ─────────────────────────────────────────────── source: IRS Rev. Proc. 2024-61
  US: {
    flag: '🇺🇸', name: 'ארה"ב (פדרלי בלבד)', currency: 'USD', usdRate: 1,
    brackets: [
      { upTo: 11_925,   rate: 10 },
      { upTo: 48_475,   rate: 12 },
      { upTo: 103_350,  rate: 22 },
      { upTo: 197_300,  rate: 24 },
      { upTo: 250_525,  rate: 32 },
      { upTo: 626_350,  rate: 35 },
      { upTo: Infinity, rate: 37 },
    ],
    credit: 0,
    socialSec: 6.2,         // FICA Social Security
    socialCeil: 168_600,    // 2025 wage base
    health: 1.45,           // Medicare (no ceiling)
    healthCeil: null,
    notes: 'פדרלי בלבד — מס מדינה מוסיף 0%–13.3% לפי מדינה. Standard deduction: $15,000 (single 2025).',
  },

  // ── GERMANY ──────────────────────────────────────── source: PwC Germany 2025, §32a EStG
  DE: {
    flag: '🇩🇪', name: 'גרמניה', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 12_096,   rate: 0  },
      { upTo: 68_429,   rate: 42 }, // progressive 14%→42% simplified to midpoint
      { upTo: 277_826,  rate: 42 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialSec: 9.3,         // Rentenversicherung employee half
    socialCeil: 96_600,     // 2025 Beitragsbemessungsgrenze West
    health: 7.3,            // Krankenversicherung employee half (avg Zusatzbeitrag ~1.7%)
    healthCeil: 66_150,
    notes: 'מס Kirchensteuer (מס כנסייה) ~8-9% מהמס — ניתן לביטול. Solidaritätszuschlag בוטל ל-90% מהמשלמים.',
  },

  // ── FRANCE ──────────────────────────────────────────────── source: PwC France 2025
  FR: {
    flag: '🇫🇷', name: 'צרפת', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 11_294,   rate: 0  },
      { upTo: 28_797,   rate: 11 },
      { upTo: 82_341,   rate: 30 },
      { upTo: 177_106,  rate: 41 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialSec: 6.9,         // employee social contributions (avg, excl health)
    socialCeil: null,
    health: 0,              // bundled in cotisations
    healthCeil: null,
    notes: 'Prélèvement à la source. Cotisations salariales כוללות בריאות, פנסיה, אבטלה — סה"כ כ-22%-23%.',
  },

  // ── NETHERLANDS ──────────────────────────────────────── source: Belastingdienst 2025
  NL: {
    flag: '🇳🇱', name: 'הולנד', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 38_441,   rate: 35.82 }, // box 1 lower (includes AOW premie)
      { upTo: 76_817,   rate: 37.48 },
      { upTo: Infinity, rate: 49.50 },
    ],
    credit: 3_362,          // algemene heffingskorting (max, phases out at higher income)
    socialSec: 0,           // bundled in bracket rates above
    socialCeil: null,
    health: 1_964,          // Zvw nominale premie (fixed annual, converted below)
    healthCeil: null,
    notes: 'Zvw bijdrage werkgever (5.64%) מוסף על הברוטו. מס בריאות קבוע ~€164/חודש. Arbeidskorting מפחית עוד.',
  },

  // ── PORTUGAL ─────────────────────────────────────── source: PwC Portugal 2025, CIRS
  PT: {
    flag: '🇵🇹', name: 'פורטוגל', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 7_703,    rate: 13.25 },
      { upTo: 11_623,   rate: 18    },
      { upTo: 16_472,   rate: 23    },
      { upTo: 21_321,   rate: 26    },
      { upTo: 27_146,   rate: 32.75 },
      { upTo: 39_791,   rate: 37    },
      { upTo: 51_997,   rate: 43.5  },
      { upTo: 81_199,   rate: 45    },
      { upTo: Infinity, rate: 48    },
    ],
    credit: 0,
    socialSec: 11.0,        // Segurança Social employee
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: 'NHR (Non-Habitual Resident) — 10 שנות מס מופחת 20% לעולים. רלוונטי מאוד לישראלים.',
  },

  // ── SPAIN ────────────────────────────────────────────────── source: AEAT 2025
  ES: {
    flag: '🇪🇸', name: 'ספרד', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 12_450,   rate: 19 },
      { upTo: 20_200,   rate: 24 },
      { upTo: 35_200,   rate: 30 },
      { upTo: 60_000,   rate: 37 },
      { upTo: 300_000,  rate: 45 },
      { upTo: Infinity, rate: 47 },
    ],
    credit: 0,
    socialSec: 6.47,        // contingencias comunes + desempleo
    socialCeil: 56_256,     // base máxima 2025
    health: 0,
    healthCeil: null,
    notes: 'Beckham Law — עולים חדשים משלמים 24% flat על הכנסה עד €600k ל-6 שנים.',
  },

  // ── POLAND ────────────────────────────────────────── source: PwC Poland 2025
  PL: {
    flag: '🇵🇱', name: 'פולין', currency: 'PLN', usdRate: 0.25,
    brackets: [
      { upTo: 120_000,  rate: 12 },
      { upTo: Infinity, rate: 32 },
    ],
    credit: 3_600,          // kwota wolna od podatku annual relief
    socialSec: 13.71,       // ZUS (emerytura + renta employee)
    socialCeil: 260_190,    // roczna podstawa wymiaru
    health: 9.0,            // NFZ składka zdrowotna
    healthCeil: null,
    notes: 'עלות מחייה נמוכה. ורשה — יחס איכות-מחיר גבוה מאוד. אין אמנת מניעת כפל מס עם ישראל.',
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
      { upTo: 42_000,   rate: 20 },
      { upTo: Infinity, rate: 40 },
    ],
    credit: 3_550,          // personal tax credit + PAYE credit
    socialSec: 4.0,         // PRSI employee class A
    socialCeil: null,
    health: 8.0,            // USC (Universal Social Charge) — avg effective rate
    healthCeil: null,
    notes: 'USC מדורג 0.5%–8% לפי הכנסה. מרכז טכנולוגי אירופי — Google, Meta, Apple.',
  },

  // ── SWITZERLAND ────────────────────────────────── source: ESTV / PwC Switzerland 2025
  CH: {
    flag: '🇨🇭', name: 'שווייץ (ממוצע קנטון)', currency: 'CHF', usdRate: 1.12,
    brackets: [
      { upTo: 18_000,   rate: 0    },
      { upTo: 31_600,   rate: 8    },
      { upTo: 41_400,   rate: 11.5 },
      { upTo: 55_200,   rate: 13   },
      { upTo: 72_500,   rate: 14   },
      { upTo: 78_100,   rate: 14.5 },
      { upTo: 103_600,  rate: 17   },
      { upTo: 134_600,  rate: 21.5 },
      { upTo: 176_000,  rate: 22.5 },
      { upTo: Infinity, rate: 23   },
    ],
    credit: 0,
    socialSec: 5.3,         // AHV/IV/EO employee half
    socialCeil: null,
    health: 0,              // mandatory private insurance ~CHF 350–600/mo separately
    healthCeil: null,
    notes: 'מס קנטונלי ומוניציפלי מוסיפים 10%-25% על הפדרלי. זוריך גבוה, זוג נמוך. ביטוח בריאות פרטי חובה ~CHF 450/חודש.',
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
    socialCeil: null,       // simplified to 8% flat
    health: 0,
    healthCeil: null,
    notes: 'Personal allowance נעלמת בהדרגה מעל £100k. שנת מס אפריל–מרץ.',
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

  // ── GREECE ────────────────────────────────────────────── source: AADE 2025
  GR: {
    flag: '🇬🇷', name: 'יוון', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 10_000,   rate: 9  },
      { upTo: 20_000,   rate: 22 },
      { upTo: 30_000,   rate: 28 },
      { upTo: 40_000,   rate: 36 },
      { upTo: Infinity, rate: 44 },
    ],
    credit: 777,
    socialSec: 13.87,       // IKA employee contributions
    socialCeil: null,
    health: 0,
    healthCeil: null,
    notes: 'תוכנית עולים: 7% flat tax על הכנסה זרה ל-15 שנה. דיגיטל נומאד ויזה זמינה.',
  },

  // ── ITALY ─────────────────────────────────────────── source: Agenzia delle Entrate 2025
  IT: {
    flag: '🇮🇹', name: 'איטליה', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 28_000,   rate: 23 },
      { upTo: 50_000,   rate: 35 },
      { upTo: Infinity, rate: 43 },
    ],
    credit: 1_955,           // detrazione base lavoro dipendente (avg)
    socialSec: 9.49,         // INPS employee contribution
    socialCeil: 119_650,     // massimale contributivo 2025
    health: 0,               // health funded through general taxation
    healthCeil: null,
    notes: 'משטר "Lavoratori Impatriati" — 50%-70% פטור על הכנסה ל-5 שנים לעולים חדשים. בנוסף Flat-tax €100K לעולים עתירי-נכסים.',
  },

  // ── CYPRUS ──────────────────────────────────────── source: Cyprus Tax Authority 2025
  CY: {
    flag: '🇨🇾', name: 'קפריסין', currency: 'EUR', usdRate: 0.92,
    brackets: [
      { upTo: 19_500,   rate: 0  },
      { upTo: 28_000,   rate: 20 },
      { upTo: 36_300,   rate: 25 },
      { upTo: 60_000,   rate: 30 },
      { upTo: Infinity, rate: 35 },
    ],
    credit: 0,
    socialSec: 8.8,          // social insurance employee
    socialCeil: 66_612,       // upper ceiling 2025
    health: 2.65,            // GHS (Gesy)
    healthCeil: 180_000,
    notes: 'Non-Dom regime: 50% פטור ממס הכנסה ל-17 שנה לעולים חדשים מעל €55K. אחד ממשטרי המס הנדיבים באירופה.',
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
  let taxAnnual = 0;
  let prev = 0;
  for (const b of c.brackets) {
    const slice = Math.min(grossAnnual, b.upTo) - prev;
    if (slice <= 0) break;
    taxAnnual += slice * b.rate / 100;
    prev = b.upTo;
  }
  taxAnnual = Math.max(0, taxAnnual - (c.credit || 0));

  // Netherlands: fixed health premium added separately
  const nlHealthAnnual = countryCode === 'NL' ? (c.health || 0) : 0;

  // ── Social security ─────────────────────────────────────────────────────
  const ssBase   = c.socialCeil ? Math.min(grossAnnual, c.socialCeil) : grossAnnual;
  const ssAnnual = ssBase * (c.socialSec || 0) / 100;

  // ── Health (separate contribution) ──────────────────────────────────────
  let healthAnnual = 0;
  if (countryCode !== 'NL' && c.health > 0) {
    const hBase  = c.healthCeil ? Math.min(grossAnnual, c.healthCeil) : grossAnnual;
    healthAnnual = hBase * c.health / 100;
  } else {
    healthAnnual = nlHealthAnnual;
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
  validYear:   2025,
  updatedAt:   '2026-05-05',
  nextReview:  '2027-01-15',   // Firebase reminder fires on this date
  sources: [
    'PwC Worldwide Tax Summaries 2025 — taxsummaries.pwc.com',
    'OECD Taxing Wages 2024',
    'KPMG Individual Tax Rates Table 2025',
    'Official tax authority websites per country',
  ],
};
