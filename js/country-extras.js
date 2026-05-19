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
    pensionPctFinalSalary: 50,    // typical Israeli replacement rate (mandatory pension + keren over career)
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
        pensionPctFinalSalary: 74, // Segurança Social — covers pension/health/unemployment
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
        pensionPctFinalSalary: 75, // INPS
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
        pensionPctFinalSalary: 50, // Social Security 6.2% + Medicare 1.45%
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
        pensionPctFinalSalary: 53, // Rentenversicherung
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
        pensionPctFinalSalary: 49, // workplace auto-enrol since 2017
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
        pensionPctFinalSalary: 80, // Seguridad Social — massive employer share
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
        pensionPctFinalSalary: 80, // IKA-ETAM
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
        pensionPctFinalSalary: 51, // SSC
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
        pensionPctFinalSalary: 38, // mandatory pension reform 2019
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
        pensionPctFinalSalary: 0, // no payroll deductions for expats
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
        pensionPctFinalSalary: 70, // INSS — capped progressively
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
        pensionPctFinalSalary: 0, kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 100, healthcareQual: 80,
        notesShort: { he: 'CPF 20%+17% — חיסכון/פנסיה/בריאות יחד. דומה חלקית לקרן השתלמות. Medisave מובנה.',
                      en: 'CPF 20%+17% bundles savings/pension/health. Partial Keren analogue. Medisave built-in.',
                      pt: 'CPF 20%+17% acumulado.', es: 'CPF 20%+17% acumulado.' }},
  PL: { pensionEmpPct: 11.26, pensionErPct: 17.48,
        pensionPctFinalSalary: 41, kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 80, healthcareQual: 64,
        notesShort: { he: 'ZUS 11.26%+17.48%. NFZ ציבורית.', en: 'ZUS 11.26%+17.48%. NFZ public.',
                      pt: 'ZUS 11.26%+17.48%.', es: 'ZUS 11.26%+17.48%.' }},
  IE: { pensionEmpPct: 4, pensionErPct: 11.05,
        pensionPctFinalSalary: 36, kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 200, healthcareQual: 64,
        notesShort: { he: 'PRSI 4%+11.05%. PRSA (חיסכון פנסיוני) חלקית דומה.', en: 'PRSI 4%+11.05%. PRSA partially similar.',
                      pt: 'PRSI 4%+11.05%.', es: 'PRSI 4%+11.05%.' }},
  CA: { pensionEmpPct: 5.95, pensionErPct: 5.95,
        pensionPctFinalSalary: 45, kerenEquiv: 'partial', healthcareSys: 'public_free', healthCostUSD: 50, healthcareQual: 71,
        notesShort: { he: 'CPP 5.95%+5.95% פנסיה. RRSP/TFSA חלקית דומה לקרן השתלמות.', en: 'CPP 5.95%+5.95%. RRSP/TFSA partial Keren analogue.',
                      pt: 'CPP 5.95%+5.95%.', es: 'CPP 5.95%+5.95%.' }},
  AU: { pensionEmpPct: 0, pensionErPct: 11.5,
        pensionPctFinalSalary: 41, kerenEquiv: 'partial', healthcareSys: 'mixed', healthCostUSD: 80, healthcareQual: 78,
        notesShort: { he: 'Superannuation 11.5% מעסיק בלבד — דומה חלקית לקרן השתלמות.', en: 'Super 11.5% employer-only — partial Keren analogue.',
                      pt: 'Super 11.5% empregador.', es: 'Super 11.5% empleador.' }},
  FR: { pensionEmpPct: 11, pensionErPct: 16.5,
        pensionPctFinalSalary: 74, kerenEquiv: 'no', healthcareSys: 'public_free', healthCostUSD: 60, healthcareQual: 81,
        notesShort: { he: 'URSSAF 11%+16.5%. בריאות מצוינת.', en: 'URSSAF 11%+16.5%. Excellent healthcare.',
                      pt: 'URSSAF 11%+16.5%.', es: 'URSSAF 11%+16.5%.' }},
  NL: { pensionEmpPct: 9.65, pensionErPct: 0,
        pensionPctFinalSalary: 80, kerenEquiv: 'partial', healthcareSys: 'mandatory_private', healthCostUSD: 150, healthcareQual: 75,
        notesShort: { he: 'AOW 9.65%. ביטוח בריאות פרטי חובה ~€130/חודש.', en: 'AOW 9.65%. Mandatory private health ~€130/mo.',
                      pt: 'AOW 9.65%.', es: 'AOW 9.65%.' }},
  CZ: { pensionEmpPct: 6.5, pensionErPct: 24.8,
        pensionPctFinalSalary: 49, kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 40, healthcareQual: 66,
        notesShort: { he: 'CSSZ 6.5%+24.8%.', en: 'CSSZ 6.5%+24.8%.',
                      pt: 'CSSZ 6.5%+24.8%.', es: 'CSSZ 6.5%+24.8%.' }},
  TH: { pensionEmpPct: 5, pensionErPct: 5,
        pensionPctFinalSalary: 35, kerenEquiv: 'no', healthcareSys: 'mixed', healthCostUSD: 100, healthcareQual: 68,
        notesShort: { he: 'SSO 5%+5% (תקרה נמוכה). בריאות מעורבת — פרטית חיונית.', en: 'SSO 5%+5% (low cap). Mixed — private essential.',
                      pt: 'SSO 5%+5%.', es: 'SSO 5%+5%.' }},
  BG: { pensionEmpPct: 10.58, pensionErPct: 14.82,
        pensionPctFinalSalary: 47, kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 60, healthcareQual: 60,
        notesShort: { he: 'NSSI 10.58%+14.82%.', en: 'NSSI 10.58%+14.82%.',
                      pt: 'NSSI 10.58%+14.82%.', es: 'NSSI 10.58%+14.82%.' }},
  RO: { pensionEmpPct: 25, pensionErPct: 2.25,
        pensionPctFinalSalary: 39, kerenEquiv: 'no', healthcareSys: 'public_subsidized', healthCostUSD: 50, healthcareQual: 56,
        notesShort: { he: 'CAS 25% עובד.', en: 'CAS 25% employee.',
                      pt: 'CAS 25%.', es: 'CAS 25%.' }},
  MC: { pensionEmpPct: 0, pensionErPct: 0,
        pensionPctFinalSalary: 0, kerenEquiv: 'no', healthcareSys: 'mandatory_private', healthCostUSD: 300, healthcareQual: 70,
        notesShort: { he: 'Monaco — 0% מס הכנסה, אין פנסיה ציבורית. בריאות פרטית.', en: 'Monaco — 0% income tax, no public pension. Private health.',
                      pt: 'Mônaco — 0% imposto.', es: 'Mónaco — 0% impuesto.' }},
};
