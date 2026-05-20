/**
 * country-extras.js — Line-item metadata for IL-vs-world comparison table.
 *
 * Augments TAX_DATA with fields that are NOT marginal tax brackets but matter
 * when an Israeli reads their payslip and asks: "Does each line-item exist in
 * country X?" Specifically:
 *
 *   pensionEmpPct  — employee mandatory pension contribution (% of gross)
 *   pensionErPct   — employer mandatory pension contribution (% of gross)
 *   kerenEquiv     — does the country have a tax-free supplementary
 *                    savings vehicle similar to "Keren Hishtalmut"?
 *                    'yes' / 'partial' / 'no'
 *   healthcareSys  — 'public_free' | 'public_subsidized' | 'mandatory_private' |
 *                    'optional_private' | 'mixed'
 *   healthCostUSD  — typical out-of-pocket monthly (USD) for private health
 *                    insurance / co-pays on top of mandatory.
 *   healthcareQual — Numbeo Health Care Index 2025 (0-100; higher = better)
 *   notesShort     — one short line per country for the "Keren" + healthcare
 *                    columns. 4-lang.
 *
 * PENSION FORECAST source: OECD Pensions at a Glance 2024 (laws as of 2023).
 *   Exceptions (post-2024 updates from national sources):
 *   - FR: 74→68% (Macron 2023 retirement-age reform)
 *   - SG: CPF private-fund replacement rate ~70% (OECD lists 0 since no public pillar)
 *   - AU: Super ~65% (OECD lists 0 since no public pillar beyond Age Pension means-test)
 *
 * SOURCES (verified Jan-May 2026):
 *   - PwC Worldwide Tax Summaries → "Other taxes" section
 *   - OECD Pensions at a Glance 2024
 *   - Numbeo Health Care Index 2025
 *   - Country-specific: SS contribution sheets from each national authority
 *
 * Notes:
 *   - Israel "Keren Hishtalmut" is genuinely unique — most countries have NO
 *     equivalent tax-free supplementary fund. A few (US 401(k), UK ISA) come
 *     close but with different mechanics.
 *   - For tax-haven countries (AE, MC) there's effectively no payroll
 *     mandatory deduction; values reflect that.
 *   - Healthcare quality index from Numbeo is informational; not a guarantee.
 */
const COUNTRY_EXTRAS = {
  IL: {
    pensionEmpPct: 6,    pensionErPct: 6.5,
    pensionPctFinalSalary: 50,
    digitalNomad: { he: 'אין DNV ייעודי (ויזת תייר B/2 בלבד)', en: 'No dedicated DNV (B/2 tourist only)', pt: 'Sem DNV dedicado (apenas turista B/2)', es: 'Sin DNV dedicado (solo turista B/2)' },
    retirementAge: 67,
    vacationDays: 12,
    maternityWeeks: 15,
    capGains: { he: '25-30% (רווחי הון + מס יסף)', en: '25-30% (CGT + surtax)' },
    suppProducts: { he: 'קרן השתלמות (פטור ממס) + פיצויים', en: 'Keren Hishtalmut (tax-free) + severance' },
    localTerms: {
      incomeTax: 'מס הכנסה',
      socialSec: 'ביטוח לאומי',
      healthTax: 'מס בריאות',
      pension: 'פנסיה חובה',
      kerenEquiv: 'קרן השתלמות ✓',
      healthSys: 'קופות חולים — חינם',
    },
    pensionAuthorityUrl: 'https://www.btl.gov.il/Pages/default.aspx',
    pensionForecastAsOf: '2024-Q1',    // typical Israeli replacement rate (mandatory pension + keren over career)
    kerenEquiv: 'yes', // it IS the keren-hishtalmut
    healthcareSys: 'public_free',
    healthCostUSD: 0,
    healthcareQual: 73,
    notesShort: {
      he: 'פנסיה 6%+6.5% חובה. קרן השתלמות 2.5%+7.5% וולנטרי וייחודי לישראל. בריאות: ביטוח לאומי + 4 קופות חולים.',
      en: 'Pension 6%+6.5% mandatory. Keren Hishtalmut 2.5%+7.5% voluntary — unique tax-free supplementary fund. Healthcare: National + 4 Kupot Holim.',
      pt: 'Pensão 6%+6.5%. Keren Hishtalmut único de Israel. Saúde universal.',
      es: 'Pensión 6%+6.5%. Keren Hishtalmut exclusivo de Israel. Salud universal.',
    },
  },
  PT: {
    pensionEmpPct: 11, pensionErPct: 23.75,
        pensionPctFinalSalary: 74,
    digitalNomad: { he: 'D8 — 4× שכר מינ׳ (~€3,680/חודש, 2026). שילוב עם NHR/IFICI', en: 'D8 — 4× min wage (~€3,680/mo, 2026). Combine with NHR/IFICI', pt: 'D8 — 4× salário mínimo (~€3.680/mês, 2026). Combinar com NHR/IFICI', es: 'D8 — 4× salario mínimo (~€3.680/mes, 2026). Combinar con NHR/IFICI' },
    retirementAge: 66,
    vacationDays: 22,
    maternityWeeks: 21,
    capGains: { he: '28% (רווחי הון + דיבידנד)', en: '28% (CGT + dividend)' },
    suppProducts: { he: 'PPR (חיסכון פנסיוני מוטב מס)', en: 'PPR (tax-advantaged retirement)' },
    localTerms: {
      incomeTax: 'IRS',
      socialSec: 'Segurança Social (פנסיה+בריאות+אבטלה)',
      healthTax: '(בתוך Seg. Social)',
      pension: '(בתוך Seg. Social)',
      kerenEquiv: '— אין מקבילה',
      healthSys: 'SNS — חינם',
    },
    pensionAuthorityUrl: 'https://www.seg-social.pt/inicio',
    pensionForecastAsOf: '2024-Q1', // Segurança Social — covers pension/health/unemployment
    kerenEquiv: 'no',
    healthcareSys: 'public_free',
    healthCostUSD: 50, // private top-up if any
    healthcareQual: 73,
    notesShort: {
      he: 'Segurança Social 11% עובד + 23.75% מעסיק — כולל פנסיה+בריאות+אבטלה. SNS חינם. אין מקבילה ל-קרן השתלמות.',
      en: 'Segurança Social 11%+23.75% bundles pension+health+unemployment. SNS free. No Keren equivalent.',
      pt: 'Segurança Social 11%+23.75%. SNS gratuito.',
      es: 'Seguridad social 11%+23.75%. SNS gratuito.',
    },
  },
  CY: {
    pensionEmpPct: 8.3, pensionErPct: 8.3,
        pensionPctFinalSalary: 50,
    digitalNomad: { he: 'Cyprus DNV — ~€3,500/חודש נטו, מכסה 1,000', en: 'Cyprus DNV — ~€3,500/mo net, 1,000 cap', pt: 'Cyprus DNV — ~€3.500/mês líquido, limite 1.000', es: 'Cyprus DNV — ~€3.500/mes neto, cupo 1.000' },
    retirementAge: 65,
    vacationDays: 20,
    maternityWeeks: 18,
    capGains: { he: '0% על ני״ע! (Non-Dom)', en: '0% on securities! (Non-Dom)' },
    suppProducts: { he: 'Provident Funds (דרך מעסיק)', en: 'Provident Funds (employer)' },
    localTerms: {
      incomeTax: 'Income Tax',
      socialSec: 'Social Insurance',
      healthTax: 'GHS (Gesy) 2.65%',
      pension: 'Social Insurance (פנסיה)',
      kerenEquiv: '— אין',
      healthSys: 'GeSY — מסובסד',
    },
    pensionAuthorityUrl: 'https://www.mlsi.gov.cy/sid',
    pensionForecastAsOf: '2024-Q1',
    kerenEquiv: 'no',
    healthcareSys: 'public_subsidized', // GeSY since 2019
    healthCostUSD: 60,
    healthcareQual: 69,
    notesShort: {
      he: 'ביטוח חברתי 8.3%+8.3%. GeSY חדש (2019) — ביטוח בריאות לאומי, איכות בינונית. ביטוח פרטי משלים נפוץ.',
      en: 'Social insurance 8.3%+8.3%. GeSY (2019) national health — mid-quality. Private top-up common.',
      pt: 'Seguridade 8.3%+8.3%. GeSY saúde nacional.',
      es: 'Seguro social 8.3%+8.3%. GeSY salud nacional.',
    },
  },
  IT: {
    pensionEmpPct: 9.19, pensionErPct: 23.81,
        pensionPctFinalSalary: 75,
    digitalNomad: { he: 'DNV 2024 — מקצועות מיומנים', en: 'DNV 2024 — highly-skilled', pt: 'DNV 2024 — altamente qualificados', es: 'DNV 2024 — altamente cualificados' },
    retirementAge: 67,
    vacationDays: 20,
    maternityWeeks: 21,
    capGains: { he: '26%', en: '26%' },
    suppProducts: { he: 'TFR (פיצויים) + Fondi Pensione', en: 'TFR (severance) + Fondi Pensione' },
    localTerms: {
      incomeTax: 'IRPEF',
      socialSec: 'INPS',
      healthTax: '(בתוך INPS)',
      pension: 'INPS (פנסיה ציבורית)',
      kerenEquiv: 'TFR (פיצויים) ~דומה',
      healthSys: 'SSN — חינם',
    },
    pensionAuthorityUrl: 'https://www.inps.it/',
    pensionForecastAsOf: '2024-Q1', // INPS
    kerenEquiv: 'partial', // TFR — severance fund, sort of like Keren
    healthcareSys: 'public_free',
    healthCostUSD: 40,
    healthcareQual: 72,
    notesShort: {
      he: 'INPS 9.19%+23.81%. TFR (קרן פיצויים) דומה חלקית לקרן השתלמות — נצבר אצל מעסיק. SSN חינם.',
      en: 'INPS 9.19%+23.81%. TFR severance fund partially analogous to Keren. SSN free healthcare.',
      pt: 'INPS 9.19%+23.81%. TFR similar parcialmente.',
      es: 'INPS 9.19%+23.81%. TFR similar parcial.',
    },
  },
  US: {
    pensionEmpPct: 7.65, pensionErPct: 7.65,
        pensionPctFinalSalary: 50,
    digitalNomad: { he: 'אין DNV (ויזת B שאינה לעבודה)', en: 'No DNV (B non-work visa)', pt: 'Sem DNV (visto B sem trabalho)', es: 'Sin DNV (visa B sin trabajo)' },
    retirementAge: 67,
    vacationDays: 0,
    maternityWeeks: 0,
    capGains: { he: '0/15/20% (LTCG ארוך טווח)', en: '0/15/20% (long-term CGT)' },
    suppProducts: { he: '401(k) + Roth IRA + HSA (בריאות)', en: '401(k) + Roth IRA + HSA' },
    localTerms: {
      incomeTax: 'Federal Income Tax (+ state 0-13%)',
      socialSec: 'FICA (SS+Medicare) 7.65%',
      healthTax: '(בתוך FICA — Medicare 1.45%)',
      pension: 'Social Security + 401(k) (וולנטרי)',
      kerenEquiv: '401(k) — ~דומה (נעול עד 59½)',
      healthSys: 'פרטי חובה — $400-1500/חודש',
    }, // Social Security 6.2% + Medicare 1.45%
    kerenEquiv: 'partial', // 401(k) tax-deferred up to $23K/yr
    healthcareSys: 'mandatory_private',
    healthCostUSD: 600, // average family premium share after employer contribution
    healthcareQual: 69,
    notesShort: {
      he: 'FICA 7.65%+7.65% (SS+Medicare). 401(k) דומה חלקית לקרן השתלמות אבל חסום עד גיל 59½. בריאות פרטית — $400-1500/חודש.',
      en: 'FICA 7.65%+7.65%. 401(k) similar to Keren but locked until 59½. Private healthcare — $400-1500/mo.',
      pt: 'FICA 7.65%+7.65%. 401(k) parcialmente similar.',
      es: 'FICA 7.65%+7.65%. 401(k) parcialmente similar.',
    },
  },
  DE: {
    pensionEmpPct: 9.3, pensionErPct: 9.3,
        pensionPctFinalSalary: 53,
    digitalNomad: { he: 'אין DNV ייעודי (Freelance Visa)', en: 'No dedicated DNV (Freelance Visa)', pt: 'Sem DNV dedicado (visto freelancer)', es: 'Sin DNV dedicado (visa freelance)' },
    retirementAge: 67,
    vacationDays: 20,
    maternityWeeks: 14,
    capGains: { he: '26.375% (Abgeltungsteuer)', en: '26.375% (Abgeltungsteuer)' },
    suppProducts: { he: 'Riester/Rürup + VWL (תוספת מעסיק)', en: 'Riester/Rürup + VWL' },
    localTerms: {
      incomeTax: 'Einkommensteuer',
      socialSec: 'Sozialversicherung',
      healthTax: 'Krankenversicherung 7.3%',
      pension: 'Rentenversicherung 9.3%+9.3%',
      kerenEquiv: 'Riester / Rürup ~דומה',
      healthSys: 'GKV/PKV — חובה',
    },
    pensionAuthorityUrl: 'https://www.deutsche-rentenversicherung.de/',
    pensionForecastAsOf: '2024-Q1', // Rentenversicherung
    kerenEquiv: 'partial', // Riester / Rürup voluntary tax-incentivized
    healthcareSys: 'mandatory_private', // gesetzlich or privat — required
    healthCostUSD: 0, // bundled in payroll deductions
    healthcareQual: 73,
    notesShort: {
      he: 'Rentenversicherung 9.3%+9.3% פנסיה ציבורית. Riester/Rürup דומה חלקית לקרן השתלמות. בריאות — חוקית (כלולה במשכורת) או פרטית (~€400/חודש).',
      en: 'Rentenversicherung 9.3%+9.3%. Riester/Rürup partially similar. Health — statutory (in payroll) or private (~€400/mo).',
      pt: 'Pensão 9.3%+9.3%. Saúde estatutária ou privada.',
      es: 'Pensión 9.3%+9.3%. Salud estatutaria o privada.',
    },
  },
  GB: {
    pensionEmpPct: 8, pensionErPct: 3,
        pensionPctFinalSalary: 49,
    digitalNomad: { he: 'אין DNV ייעודי', en: 'No dedicated DNV', pt: 'Sem DNV dedicado', es: 'Sin DNV dedicado' },
    retirementAge: 66,
    vacationDays: 28,
    maternityWeeks: 39,
    capGains: { he: '20% רווחי הון, 33.75% דיבידנד', en: '20% CGT, 33.75% dividend' },
    suppProducts: { he: 'ISA £20K/שנה + LISA (bonus 25%)', en: 'ISA £20K/yr + LISA (25% bonus)' },
    localTerms: {
      incomeTax: 'PAYE Income Tax',
      socialSec: 'National Insurance (NI)',
      healthTax: '(בתוך NI)',
      pension: 'State Pension + Workplace 8%+3%',
      kerenEquiv: 'ISA £20K/שנה — הכי דומה',
      healthSys: 'NHS — חינם',
    }, // workplace auto-enrol since 2017
    kerenEquiv: 'partial', // ISA tax-free savings (£20K/yr) — closest to Keren
    healthcareSys: 'public_free',
    healthCostUSD: 0,
    healthcareQual: 70,
    notesShort: {
      he: 'Workplace pension 8% עובד + 3% מעסיק (חובה מ-2017). ISA — חיסכון פטור ממס £20K/שנה, הכי קרוב לקרן השתלמות. NHS חינם.',
      en: 'Workplace pension 8%+3% (mandatory since 2017). ISA £20K/yr tax-free — closest to Keren. NHS free.',
      pt: 'Pensão 8%+3%. ISA mais próximo de Keren. NHS gratuito.',
      es: 'Pensión 8%+3%. ISA más cercano a Keren. NHS gratuito.',
    },
  },
  ES: {
    pensionEmpPct: 6.4, pensionErPct: 30,
        pensionPctFinalSalary: 80,
    digitalNomad: { he: 'DNV 2023 — שילוב Beckham 24% flat', en: 'DNV 2023 — combine Beckham 24% flat', pt: 'DNV 2023 — combinar Beckham 24% fixo', es: 'DNV 2023 — combinar Beckham 24% fijo' },
    retirementAge: 65,
    vacationDays: 22,
    maternityWeeks: 16,
    capGains: { he: '19-28% מדורג', en: '19-28% tiered' },
    suppProducts: { he: 'Planes de Pensiones + PPA', en: 'Planes de Pensiones + PPA' },
    localTerms: {
      incomeTax: 'IRPF',
      socialSec: 'Seguridad Social',
      healthTax: '(בתוך SS)',
      pension: 'Seguridad Social 6.4%+30%',
      kerenEquiv: '— אין',
      healthSys: 'SNS — חינם',
    },
    pensionAuthorityUrl: 'https://www.seg-social.es/',
    pensionForecastAsOf: '2024-Q1', // Seguridad Social — massive employer share
    kerenEquiv: 'no',
    healthcareSys: 'public_free',
    healthCostUSD: 50,
    healthcareQual: 78,
    notesShort: {
      he: 'Seguridad Social 6.4% עובד + 30% מעסיק (גבוה!). אין מקבילה לקרן השתלמות. בריאות ציבורית טובה, ביטוח פרטי משלים.',
      en: 'Seguridad Social 6.4% emp + 30% employer (high!). No Keren equiv. Public health solid, private top-up common.',
      pt: 'Seguridade 6.4%+30%. Saúde pública sólida.',
      es: 'Seguridad 6.4%+30%. Salud pública sólida.',
    },
  },
  GR: {
    pensionEmpPct: 13.87, pensionErPct: 22.29,
        pensionPctFinalSalary: 80,
    digitalNomad: { he: 'DNV — הטבת 50% למעבירי תושבות', en: 'DNV — 50% break for relocators', pt: 'DNV — desconto 50% para quem se muda', es: 'DNV — descuento 50% para quien se traslada' },
    retirementAge: 67,
    vacationDays: 20,
    maternityWeeks: 17,
    capGains: { he: '15% דיבידנד + רווחי הון', en: '15% dividend + CGT' },
    suppProducts: { he: '— מינימלי', en: '— minimal' },
    localTerms: {
      incomeTax: 'Income Tax',
      socialSec: 'EFKA (IKA לשעבר)',
      healthTax: '(בתוך EFKA)',
      pension: 'EFKA 13.87%+22.29%',
      kerenEquiv: '— אין',
      healthSys: 'ESY — ציבורי, ביטוח פרטי משלים',
    },
    pensionAuthorityUrl: 'https://www.efka.gov.gr/',
    pensionForecastAsOf: '2024-Q1', // IKA-ETAM
    kerenEquiv: 'no',
    healthcareSys: 'public_subsidized',
    healthCostUSD: 80,
    healthcareQual: 56,
    notesShort: {
      he: 'IKA 13.87% עובד + 22.29% מעסיק. אין מקבילה לקרן השתלמות. בריאות ציבורית עם איכות נמוכה יחסית — ביטוח פרטי מומלץ.',
      en: 'IKA 13.87%+22.29%. No Keren equiv. Public health lower-rated — private insurance recommended.',
      pt: 'IKA 13.87%+22.29%. Saúde pública.',
      es: 'IKA 13.87%+22.29%. Salud pública.',
    },
  },
  MT: {
    pensionEmpPct: 10, pensionErPct: 10,
        pensionPctFinalSalary: 51,
    digitalNomad: { he: 'Nomad Permit — 10% מס על הכנסת DN', en: 'Nomad Permit — 10% tax on DN income', pt: 'Nomad Permit — 10% imposto sobre renda DN', es: 'Nomad Permit — 10% impuesto sobre renta DN' },
    retirementAge: 65,
    vacationDays: 24,
    maternityWeeks: 18,
    capGains: { he: '0% לרוב (Non-Dom)', en: '0% often (Non-Dom)' },
    suppProducts: { he: 'Private pension plans (מוטב מס)', en: 'Private pension plans (tax-advantaged)' },
    pensionAuthorityUrl: 'https://socialsecurity.gov.mt/',
    pensionForecastAsOf: '2024-Q1', // SSC
    kerenEquiv: 'no',
    healthcareSys: 'public_free',
    healthCostUSD: 70,
    healthcareQual: 76,
    notesShort: {
      he: 'SSC 10% עובד + 10% מעסיק. אין מקבילה לקרן השתלמות. בריאות ציבורית מצוינת, אנגלית רשמית — נוח לישראלים.',
      en: 'SSC 10%+10%. No Keren equiv. Excellent public health, English-official — easy for Israelis.',
      pt: 'SSC 10%+10%. Saúde pública excelente.',
      es: 'SSC 10%+10%. Salud pública excelente.',
    },
  },
  GE: {
    pensionEmpPct: 2, pensionErPct: 2,
        pensionPctFinalSalary: 38,
    digitalNomad: { he: 'Remotely from Georgia — שנה, +מס 1% לעצמאי קטן', en: 'Remotely from Georgia — 1yr, +1% small-biz tax', pt: 'Remotely from Georgia — 1 ano, +imposto 1% MEI', es: 'Remotely from Georgia — 1 año, +impuesto 1% autónomo' },
    retirementAge: 65,
    vacationDays: 24,
    maternityWeeks: 18,
    capGains: { he: 'מקור זר 0%, מקומי 5%', en: 'foreign 0%, local 5%' },
    suppProducts: { he: '— אין', en: '— none' },
    pensionAuthorityUrl: 'https://www.pensions.ge/',
    pensionForecastAsOf: '2023-Q4', // mandatory pension reform 2019
    kerenEquiv: 'no',
    healthcareSys: 'mixed',
    healthCostUSD: 100,
    healthcareQual: 64,
    notesShort: {
      he: 'פנסיה חובה 2%+2% (חדשה מ-2019). אין מקבילה לקרן השתלמות. בריאות מעורבת — ציבורית חלשה, פרטית סבירה.',
      en: 'Pension 2%+2% (new 2019). No Keren equiv. Mixed health — weak public, decent private.',
      pt: 'Pensão 2%+2%. Saúde mista.',
      es: 'Pensión 2%+2%. Salud mixta.',
    },
  },
  AE: {
    pensionEmpPct: 0, pensionErPct: 0,
        pensionPctFinalSalary: 0,
    digitalNomad: { he: 'Dubai Virtual Working — 0% מס, שנה', en: 'Dubai Virtual Working — 0% tax, 1yr', pt: 'Dubai Virtual Working — 0% imposto, 1 ano', es: 'Dubai Virtual Working — 0% impuesto, 1 año' },
    retirementAge: 0,
    vacationDays: 22,
    maternityWeeks: 0,
    capGains: { he: '0% — אין מס רווחי הון', en: '0% — no CGT' },
    suppProducts: { he: 'End-of-Service Gratuity (מענק סיום)', en: 'End-of-Service Gratuity' },
    localTerms: {
      incomeTax: '0% — אין',
      socialSec: '0% לאקספטים',
      healthTax: '(אין)',
      pension: 'אין ציבורי — חיסכון פרטי',
      kerenEquiv: '— אין',
      healthSys: 'פרטי חובה — דרך מעסיק',
    },
    pensionAuthorityUrl: null,
    pensionForecastAsOf: '2024', // no payroll deductions for expats
    kerenEquiv: 'no',
    healthcareSys: 'mandatory_private', // expats — employer-provided
    healthCostUSD: 0, // bundled in employment package
    healthcareQual: 67,
    notesShort: {
      he: '0% פנסיה, 0% ביטוח לאומי לאקספטים. בריאות פרטית חובה — בד״כ דרך המעסיק. אין מקבילה לקרן השתלמות.',
      en: '0% pension, 0% social security for expats. Private health mandatory — usually employer-provided. No Keren equiv.',
      pt: '0% pensão para expatriados. Saúde privada obrigatória.',
      es: '0% pensión para expatriados. Salud privada obligatoria.',
    },
  },
  BR: {
    pensionEmpPct: 11, pensionErPct: 20,
        pensionPctFinalSalary: 70,
    digitalNomad: { he: 'DNV — שנה (מתחדש), $1,500/חודש או $18k חיסכון', en: 'DNV — 1yr (renewable), $1,500/mo or $18k savings', pt: 'DNV — 1 ano (renovável), US$1.500/mês ou US$18k poupança', es: 'DNV — 1 año (renovable), US$1.500/mes o US$18k ahorros' }, // INSS — capped progressively
    kerenEquiv: 'no',
    healthcareSys: 'mixed', // SUS public + private widespread
    healthCostUSD: 150,
    healthcareQual: 56,
    notesShort: {
      he: 'INSS 11% עובד (פרוגרסיבי) + 20% מעסיק. אין מקבילה לקרן השתלמות. SUS חינם אבל איטי — ביטוח פרטי חיוני (~$150).',
      en: 'INSS 11% emp (progressive) + 20% er. No Keren equiv. SUS free but slow — private insurance essential (~$150).',
      pt: 'INSS 11%+20%. SUS gratuito mas privado essencial.',
      es: 'INSS 11%+20%. SUS gratuito pero privado esencial.',
    },
  },
  // Other 12 countries — defaults / partial data, table renders '—' for missing values.
  SG: { pensionEmpPct: 20, pensionErPct: 17,
        pensionPctFinalSalary: 70,
    digitalNomad: { he: 'אין DNV (Tech.Pass/EP)', en: 'No DNV (Tech.Pass/EP)', pt: 'Sem DNV (Tech.Pass/EP)', es: 'Sin DNV (Tech.Pass/EP)' },
    retirementAge: 63,
    vacationDays: 14,
    maternityWeeks: 16,
    capGains: { he: '0% רווחי הון! 0% דיבידנד', en: '0% CGT! 0% dividend' },
    suppProducts: { he: 'CPF (3 חשבונות) + SRS', en: 'CPF (3 accounts) + SRS' },
    localTerms: {
      incomeTax: 'Income Tax',
      socialSec: 'CPF 20%+17%',
      healthTax: '(CPF Medisave)',
      pension: 'CPF (חיסכון/פנסיה/בריאות)',
      kerenEquiv: 'CPF Ordinary Account ~דומה',
      healthSys: 'CPF Medisave + פרטי',
    },
    pensionAuthorityUrl: 'https://www.cpf.gov.sg/',
    pensionForecastAsOf: '2024-Q1', kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 100, healthcareQual: 80,
        notesShort: { he: 'CPF 20%+17% — חיסכון/פנסיה/בריאות יחד. דומה חלקית לקרן השתלמות. Medisave מובנה.',
                      en: 'CPF 20%+17% bundles savings/pension/health. Partial Keren analogue. Medisave built-in.',
                      pt: 'CPF 20%+17% acumulado.', es: 'CPF 20%+17% acumulado.' }},
  PL: { pensionEmpPct: 11.26, pensionErPct: 17.48,
        pensionPctFinalSalary: 41,
    digitalNomad: { he: 'אין DNV (Business Harbour ל-IT)', en: 'No DNV (Business Harbour for IT)', pt: 'Sem DNV (Business Harbour p/ TI)', es: 'Sin DNV (Business Harbour para TI)' },
    pensionAuthorityUrl: 'https://www.zus.pl/',
    pensionForecastAsOf: '2024-Q1', kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 80, healthcareQual: 64,
        notesShort: { he: 'ZUS 11.26%+17.48%. NFZ ציבורית.', en: 'ZUS 11.26%+17.48%. NFZ public.',
                      pt: 'ZUS 11.26%+17.48%.', es: 'ZUS 11.26%+17.48%.' }},
  IE: { pensionEmpPct: 4, pensionErPct: 11.05,
        pensionPctFinalSalary: 36,
    digitalNomad: { he: 'אין DNV ייעודי', en: 'No dedicated DNV', pt: 'Sem DNV dedicado', es: 'Sin DNV dedicado' },
    retirementAge: 66,
    vacationDays: 20,
    maternityWeeks: 26,
    capGains: { he: '33% רווחי הון', en: '33% CGT' },
    suppProducts: { he: 'PRSA + AVCs', en: 'PRSA + AVCs' },
    localTerms: {
      incomeTax: 'Income Tax + USC',
      socialSec: 'PRSI 4%',
      healthTax: '(בתוך USC)',
      pension: 'State Pension + PRSA וולנטרי',
      kerenEquiv: 'PRSA ~דומה',
      healthSys: 'HSE — מעורב',
    }, kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 200, healthcareQual: 64,
        notesShort: { he: 'PRSI 4%+11.05%. PRSA (חיסכון פנסיוני) חלקית דומה.', en: 'PRSI 4%+11.05%. PRSA partially similar.',
                      pt: 'PRSI 4%+11.05%.', es: 'PRSI 4%+11.05%.' }},
  CA: { pensionEmpPct: 5.95, pensionErPct: 5.95,
        pensionPctFinalSalary: 45,
    digitalNomad: { he: 'אין DNV רשמי (שהייה 6 ח׳ כתייר)', en: 'No formal DNV (6-mo visitor stay)', pt: 'Sem DNV formal (estadia de 6 meses)', es: 'Sin DNV formal (estancia de 6 meses)' },
    retirementAge: 65,
    vacationDays: 10,
    maternityWeeks: 52,
    capGains: { he: '50% הכללה × שיעור שולי', en: '50% inclusion × marginal' },
    suppProducts: { he: 'RRSP + TFSA (פטור ממס)', en: 'RRSP + TFSA' }, kerenEquiv: 'partial', healthcareSys: 'public_free', healthCostUSD: 50, healthcareQual: 71,
        notesShort: { he: 'CPP 5.95%+5.95% פנסיה. RRSP/TFSA חלקית דומה לקרן השתלמות.', en: 'CPP 5.95%+5.95%. RRSP/TFSA partial Keren analogue.',
                      pt: 'CPP 5.95%+5.95%.', es: 'CPP 5.95%+5.95%.' }},
  AU: { pensionEmpPct: 0, pensionErPct: 11.5,
        pensionPctFinalSalary: 65, kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 80, healthcareQual: 78,
    digitalNomad: { he: 'אין DNV', en: 'No DNV', pt: 'Sem DNV', es: 'Sin DNV' },
        notesShort: { he: 'Superannuation 11.5% מעסיק בלבד — דומה חלקית לקרן השתלמות.', en: 'Super 11.5% employer-only — partial Keren analogue.',
                      pt: 'Super 11.5% empregador.', es: 'Super 11.5% empleador.' }},
  FR: { pensionEmpPct: 11, pensionErPct: 16.5,
        pensionPctFinalSalary: 68,
    digitalNomad: { he: 'אין DNV ייעודי (Talent Passport)', en: 'No dedicated DNV (Talent Passport)', pt: 'Sem DNV dedicado (Talent Passport)', es: 'Sin DNV dedicado (Talent Passport)' },
    pensionAuthorityUrl: 'https://www.info-retraite.fr/',
    pensionForecastAsOf: '2024-Q4', kerenEquiv: 'no', healthcareSys: 'public_free', healthCostUSD: 60, healthcareQual: 81,
        notesShort: { he: 'URSSAF 11%+16.5%. בריאות מצוינת.', en: 'URSSAF 11%+16.5%. Excellent healthcare.',
                      pt: 'URSSAF 11%+16.5%.', es: 'URSSAF 11%+16.5%.' }},
  NL: { pensionEmpPct: 9.65, pensionErPct: 0,
        pensionPctFinalSalary: 80,
    digitalNomad: { he: 'אין DNV (DAFT לאזרחי ארה״ב)', en: 'No DNV (DAFT for US citizens)', pt: 'Sem DNV (DAFT p/ cidadãos dos EUA)', es: 'Sin DNV (DAFT para ciudadanos de EE.UU.)' },
    pensionAuthorityUrl: 'https://www.svb.nl/',
    pensionForecastAsOf: '2024-Q1', kerenEquiv: 'partial', healthcareSys: 'mandatory_private', healthCostUSD: 150, healthcareQual: 75,
        notesShort: { he: 'AOW 9.65%. ביטוח בריאות פרטי חובה ~€130/חודש.', en: 'AOW 9.65%. Mandatory private health ~€130/mo.',
                      pt: 'AOW 9.65%.', es: 'AOW 9.65%.' }},
  CZ: { pensionEmpPct: 6.5, pensionErPct: 24.8,
        pensionPctFinalSalary: 49,
    digitalNomad: { he: 'Zivno — ויזת פרילנס (de-facto DNV)', en: 'Zivno — freelance visa (de-facto DNV)', pt: 'Zivno — visto freelancer (DNV de facto)', es: 'Zivno — visa freelance (DNV de facto)' },
    pensionAuthorityUrl: 'https://www.cssz.cz/',
    pensionForecastAsOf: '2024-Q1', kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 40, healthcareQual: 66,
        notesShort: { he: 'CSSZ 6.5%+24.8%.', en: 'CSSZ 6.5%+24.8%.',
                      pt: 'CSSZ 6.5%+24.8%.', es: 'CSSZ 6.5%+24.8%.' }},
  TH: { pensionEmpPct: 5, pensionErPct: 5,
        pensionPctFinalSalary: 35,
    digitalNomad: { he: 'DTV (07/2024) — 5 שנים, 180 יום/כניסה, ฿500k חיסכון', en: 'DTV (Jul 2024) — 5yr, 180 days/entry, ฿500k savings', pt: 'DTV (07/2024) — 5 anos, 180 dias/entrada, ฿500k poupança', es: 'DTV (07/2024) — 5 años, 180 días/entrada, ฿500k ahorros' },
    retirementAge: 55,
    vacationDays: 6,
    maternityWeeks: 14,
    capGains: { he: '0% על מניות SET', en: '0% on SET shares' },
    suppProducts: { he: 'Provident Fund (וולנטרי) + RMF', en: 'Provident Fund + RMF' },
    localTerms: {
      incomeTax: 'Personal Income Tax',
      socialSec: 'SSO 5% (תקרה נמוכה)',
      healthTax: '(בתוך SSO)',
      pension: 'SSO — מינימלי',
      kerenEquiv: '— אין',
      healthSys: 'מערכת מעורבת — פרטי חיוני',
    },
    pensionAuthorityUrl: 'https://www.sso.go.th/',
    pensionForecastAsOf: '2024-Q1', kerenEquiv: 'no', healthcareSys: 'mixed', healthCostUSD: 100, healthcareQual: 68,
        notesShort: { he: 'SSO 5%+5% (תקרה נמוכה). בריאות מעורבת — פרטית חיונית.', en: 'SSO 5%+5% (low cap). Mixed — private essential.',
                      pt: 'SSO 5%+5%.', es: 'SSO 5%+5%.' }},
  BG: { pensionEmpPct: 10.58, pensionErPct: 14.82,
        pensionPctFinalSalary: 47,
    digitalNomad: { he: 'אין DNV', en: 'No DNV', pt: 'Sem DNV', es: 'Sin DNV' },
    retirementAge: 64,
    vacationDays: 20,
    maternityWeeks: 58,
    capGains: { he: '10% (0% על בורסת EU)', en: '10% (0% on EU exchanges)' },
    suppProducts: { he: '— מינימלי', en: '— minimal' },
    pensionAuthorityUrl: 'https://www.nssi.bg/',
    pensionForecastAsOf: '2023-Q4', kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 60, healthcareQual: 60,
        notesShort: { he: 'NSSI 10.58%+14.82%.', en: 'NSSI 10.58%+14.82%.',
                      pt: 'NSSI 10.58%+14.82%.', es: 'NSSI 10.58%+14.82%.' }},
  RO: { pensionEmpPct: 25, pensionErPct: 2.25,
        pensionPctFinalSalary: 39,
    digitalNomad: { he: 'DNV — 3× שכר ממוצע (~€3,700/חודש, 2025)', en: 'DNV — 3× avg wage (~€3,700/mo, 2025)', pt: 'DNV — 3× salário médio (~€3.700/mês, 2025)', es: 'DNV — 3× salario medio (~€3.700/mes, 2025)' },
    retirementAge: 65,
    vacationDays: 20,
    maternityWeeks: 18,
    capGains: { he: '10% רווחי הון + דיבידנד 8%', en: '10% CGT + 8% dividend' },
    suppProducts: { he: 'Pilonul III (וולנטרי)', en: 'Pillar III (voluntary)' },
    pensionAuthorityUrl: 'https://www.cnpp.ro/',
    pensionForecastAsOf: '2023-Q4', kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 50, healthcareQual: 56,
        notesShort: { he: 'CAS 25% עובד.', en: 'CAS 25% employee.',
                      pt: 'CAS 25%.', es: 'CAS 25%.' }},
  MC: { pensionEmpPct: 0, pensionErPct: 0,
        pensionPctFinalSalary: 0,
    digitalNomad: { he: 'אין DNV (תושבות יקרה)', en: 'No DNV (expensive residency)', pt: 'Sem DNV (residência cara)', es: 'Sin DNV (residencia cara)' },
    retirementAge: 65,
    vacationDays: 30,
    maternityWeeks: 16,
    capGains: { he: '0% — אין מס', en: '0% — no tax' },
    suppProducts: { he: '— אין', en: '— none' },
    pensionAuthorityUrl: null,
    pensionForecastAsOf: '2024', kerenEquiv: 'no', healthcareSys: 'mandatory_private', healthCostUSD: 300, healthcareQual: 70,
        notesShort: { he: 'Monaco — 0% מס הכנסה, אין פנסיה ציבורית. בריאות פרטית.', en: 'Monaco — 0% income tax, no public pension. Private health.',
                      pt: 'Mônaco — 0% imposto.', es: 'Mónaco — 0% impuesto.' }},
};
