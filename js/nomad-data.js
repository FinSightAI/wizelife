/**
 * nomad-data.js — Tax + PE + visa data for 12 countries.
 *
 * Audience: Israeli remote workers / freelancers who work abroad while still
 * employed (or contracting) by an Israeli entity. We surface:
 *
 *   taxResidentDays     — threshold (days) that triggers personal tax residency
 *   treatyWithIsrael    — bilateral double-tax treaty exists?  (+ year)
 *   totalizationIL      — social-security totalization with Israel?
 *   peRisk              — risk that an Israeli employer creates a PE here
 *                         when one of its employees works long-term in country
 *   nomadVisa           — one-line summary of the dedicated DNV (if any)
 *
 * Sources are URL-linked per field. PwC Worldwide Tax Summaries
 * (taxsummaries.pwc.com) is preferred; OECD MTC and official tax-authority
 * pages are next; reputable law-firm briefings (Bird&Bird, FGS, Garrigues,
 * y-tax.co.il, KPMG, EY, BDO) are used where official text is paywalled.
 *
 * IMPORTANT caveats:
 *   - The OECD Model Tax Convention 2025 update (Nov 2025) added a 50%-time
 *     safe harbour + "commercial reason" test for home-office PE. Many
 *     countries have NOT yet adopted it in domestic law — so country guidance
 *     remains stricter than the OECD MTC. We flag this in peNote where
 *     relevant.
 *   - Israel-Cyprus has NO bilateral tax treaty as of 2026-05. Israel-Cyprus
 *     double taxation is only mitigated by the unilateral foreign tax credit
 *     under §200 ITO and (limited) MLI interplay. Confirmed via
 *     y-tax.co.il & Israeli MoF treaty list.
 *   - Israel does NOT have a totalization agreement with: Portugal, Spain,
 *     Greece, Cyprus, Malta, Georgia, UAE, Thailand. Limited-only with US
 *     and Canada. Full list verified via btl.gov.il.
 *   - peRisk is a calibration of how aggressively the country pursues
 *     home-office PE claims; not legal advice. Always confirm with a CPA
 *     before relocating for >6 months.
 *
 * Verified: 2026-05
 */
window.NOMAD_DATA = {
  PT: {
    flag: '🇵🇹',
    name: { he: 'פורטוגל', en: 'Portugal', pt: 'Portugal', es: 'Portugal' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בשנה קלנדרית, או בעלות על בית-קבע ב-PT עם כוונה לתושבות. תושבות מתחילה ביום ההגעה.',
      en: 'Over 183 days in a calendar year, OR maintaining a habitual residence in PT with intent to reside. Residency starts on the arrival day.',
      pt: 'Mais de 183 dias por ano civil, ou manutenção de residência habitual em PT com intenção de residir. A residência começa no dia da chegada.',
      es: 'Más de 183 días por año natural, o mantenimiento de residencia habitual en PT con intención de residir. La residencia comienza el día de llegada.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/portugal/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 2006,
    treatyNote: {
      he: 'אמנה חתומה 26/09/2006, נכנסה לתוקף ב-2008. מנגנון שובר-שוויון ל-Dual Residents בסעיף 4 (בית-קבע → מרכז אינטרסים → שהייה רגילה → אזרחות).',
      en: 'Signed 26 Sep 2006, in force 2008. Dual-resident tie-breaker via Article 4 (permanent home → centre of vital interests → habitual abode → nationality).',
      pt: 'Assinada em 26/09/2006, em vigor desde 2008. Regra de desempate para duplo residente no Artigo 4 (lar permanente → centro de interesses vitais → estadia habitual → nacionalidade).',
      es: 'Firmada el 26/09/2006, en vigor desde 2008. Regla de desempate para doble residente en el Artículo 4 (hogar permanente → centro de intereses vitales → residencia habitual → nacionalidad).',
    },
    treatySource: 'https://www.gov.il/en/departments/dynamiccollectors/international_agreements',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנה לביטוח סוציאלי עם ישראל — תיתכן כפל-תשלום (ביטוח לאומי בישראל + Segurança Social בפורטוגל).',
      en: 'No social-security agreement with Israel — risk of double contributions (IL Bituach Leumi + PT Segurança Social).',
      pt: 'Sem acordo de segurança social com Israel — risco de dupla contribuição.',
      es: 'Sin acuerdo de seguridad social con Israel — riesgo de doble contribución.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'פורטוגל אימצה את עדכון OECD MTC 2025 בעקרון (מקלט-50% + "סיבה מסחרית"), אבל בית-בעת בפורטוגל יכול ליצור מוסד-קבע למעסיק הישראלי אם העובד שוהה >50% מהזמן ומבצע פונקציות-ליבה. החברה הישראלית עלולה לחוב מס חברות פורטוגלי (21%) + תשלומי SS.',
      en: 'Portugal broadly aligns with the OECD MTC 2025 update (50% safe-harbour + commercial-reason test), but a home office can still create PE for an Israeli employer if the worker spends >50% of working time and performs core functions there. The Israeli company would then owe PT corporate tax (21%) + employer SS.',
      pt: 'Portugal alinha-se em geral à atualização OCDE MTC 2025, mas um escritório doméstico ainda pode criar EP para o empregador israelita se >50% do tempo + funções essenciais. A empresa israelita pagaria IRC português (21%) + SS.',
      es: 'Portugal se alinea ampliamente con la actualización OCDE MTC 2025, pero un home office aún puede crear EP para el empleador israelí si >50% del tiempo + funciones esenciales. La empresa israelí pagaría IRC portugués (21%) + SS.',
    },
    peSource: 'https://mcs.pt/oecd-model-tax-convention-2025-update-what-digital-nomads-and-remote-workers-in-portugal-must-know/',
    nomadVisa: {
      he: 'D8 (2022) — לפחות 4× שכר מינ׳ פורטוגלי (~€3,480 ב-2025, €3,680 ב-2026). תוקף שנה, ניתן לחדש; ניתן לשלב עם משטר IFICI/ex-NHR למיסוי 20% עד 10 שנים.',
      en: 'D8 (2022) — min income 4× Portuguese min wage (~€3,480 in 2025, €3,680 in 2026). 1-year validity, renewable; combinable with IFICI/ex-NHR regime for 20% flat tax up to 10 years.',
      pt: 'D8 (2022) — rendimento mínimo 4× salário mínimo (~€3.480 em 2025). 1 ano, renovável; combinável com IFICI/ex-NHR para 20% até 10 anos.',
      es: 'D8 (2022) — ingreso mínimo 4× salario mínimo portugués (~€3.480 en 2025). 1 año, renovable; combinable con IFICI/ex-NHR para 20% hasta 10 años.',
    },
    nomadVisaSource: 'https://imin-portugal.com/portugal-digital-nomad-visa/',
    verifiedDate: '2026-05',
  },

  ES: {
    flag: '🇪🇸',
    name: { he: 'ספרד', en: 'Spain', pt: 'Espanha', es: 'España' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בשנה קלנדרית, או "מרכז אינטרסים כלכליים" בספרד (גם <183 ימים). חזקה לבת/בן-זוג + ילדים תושבי ספרד.',
      en: 'Over 183 days in a calendar year, OR Spain is the centre of economic/vital interests (even at <183 days). Presumption if spouse + minor children live in Spain.',
      pt: 'Mais de 183 dias por ano civil, ou centro de interesses económicos/vitais em Espanha (mesmo <183 dias).',
      es: 'Más de 183 días por año natural, o centro de intereses económicos/vitales en España (incluso con <183 días).',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/spain/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 1999,
    treatyNote: {
      he: 'אמנה חתומה 30/11/1999, נכנסה לתוקף ב-31/12/2000. שובר-שוויון ל-Dual Residents בסעיף 4. ניתן לקזז מס ספרדי כנגד מס ישראלי דרך FTC.',
      en: 'Signed 30 Nov 1999, in force 31 Dec 2000. Tie-breaker via Article 4. Spanish tax creditable in Israel via Foreign Tax Credit.',
      pt: 'Assinada em 30/11/1999, em vigor desde 31/12/2000. Regra de desempate no Artigo 4.',
      es: 'Firmada el 30/11/1999, en vigor desde el 31/12/2000. Regla de desempate en el Artículo 4.',
    },
    treatySource: 'https://www.gov.il/BlobFolder/dynamiccollectorresultitem/spain_dta-eng/en/international_agreements_spain_dtpa-synversion-eng.pdf',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל — תיתכן כפל-תשלום עם Seguridad Social (~30% מעסיק).',
      en: 'No social-security agreement with Israel — double contributions possible with Seguridad Social (~30% employer).',
      pt: 'Sem acordo SS com Israel.',
      es: 'Sin convenio SS con Israel.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'פסיקת DGT (V0066-22, ינואר 2022) קבעה שעובד מבית בספרד אינו יוצר מוסד-קבע אוטומטית אם (1) היוזמה לא מהמעסיק ו-(2) המעסיק לא מממן את שטח העבודה. אבל אם המעסיק הישראלי מעודד/מאפשר את הסידור, או יש "סיבה מסחרית", DGT עשויה לטעון ל-PE — חבות מס חברות ספרדי 25%.',
      en: 'DGT ruling V0066-22 (Jan 2022): a Spanish home office does not automatically create PE if (1) initiative is the employee\'s and (2) employer does not pay/equip the home. But if the Israeli employer encourages the arrangement or there is a "commercial reason", DGT may assert PE — triggering 25% Spanish corporate tax on attributable profits.',
      pt: 'Decisão DGT V0066-22 (jan 2022): home office em Espanha não cria automaticamente EP se (1) iniciativa do empregado e (2) empregador não financia. Caso contrário, IS espanhol 25%.',
      es: 'Resolución DGT V0066-22 (enero 2022): home office en España no crea EP automáticamente si (1) iniciativa del empleado y (2) empleador no financia. Si no, IS español 25%.',
    },
    peSource: 'https://blogtributario.garrigues.com/en/new-legislation/teleworking-and-permanent-establishment-the-new-keys-to-the-oecd-convention',
    nomadVisa: {
      he: 'DNV (חוק סטארט-אפ, ינואר 2023) — שכר ≥200% מהשכר המינ׳ הספרדי (~€2,850/חודש 2026). תוקף עד 3 שנים, ניתן לחדש עד 5; ניתן לשלב משטר Beckham לשיעור שטוח של 24% עד €600K במשך 6 שנים.',
      en: 'DNV (Startup Law, Jan 2023) — income ≥200% Spanish min wage (~€2,850/mo in 2026). Up to 3 years, renewable to 5; can combine with Beckham regime: flat 24% on income up to €600K for 6 years.',
      pt: 'DNV (Ley de Startups, jan 2023) — ≥200% salário mínimo (~€2.850/mês). Até 3 anos, renovável; combinável com Beckham 24% até €600K por 6 anos.',
      es: 'DNV (Ley de Startups, ene 2023) — ≥200% SMI (~€2.850/mes). Hasta 3 años, renovable; combinable con Beckham al 24% hasta €600K por 6 años.',
    },
    nomadVisaSource: 'https://www.boe.es/eli/es/l/2022/12/21/28/con',
    verifiedDate: '2026-05',
  },

  IT: {
    flag: '🇮🇹',
    name: { he: 'איטליה', en: 'Italy', pt: 'Itália', es: 'Italia' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בשנה (חלקי-יום נחשבים מ-2024). חזקה לתושבות גם אם רשום ב-anagrafe או יש "מרכז אינטרסים" באיטליה.',
      en: 'Over 183 days in a year (since 2024, fractions of a day count). Also presumed resident if registered in anagrafe or centre of vital interests is in Italy.',
      pt: 'Mais de 183 dias por ano (frações de dia desde 2024). Presunção também se registado em anagrafe.',
      es: 'Más de 183 días por año (fracciones de día desde 2024). También se presume si está inscrito en anagrafe.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/italy/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 1995,
    treatyNote: {
      he: 'אמנה חתומה 08/09/1995, נכנסה לתוקף ב-1998. שובר-שוויון ל-Dual Residents בסעיף 4 (בית-קבע → מרכז אינטרסים → שהייה רגילה → אזרחות).',
      en: 'Signed 8 Sep 1995, in force 1998. Article 4 tie-breaker for dual residents (permanent home → vital interests → habitual abode → nationality).',
      pt: 'Assinada em 08/09/1995, em vigor desde 1998. Artigo 4 (desempate).',
      es: 'Firmada el 08/09/1995, en vigor desde 1998. Artículo 4 (desempate).',
    },
    treatySource: 'https://www.orbitax.com/taxhub/taxtreaties/it/italy/il/israel/',
    totalizationIL: true,
    totalizationNote: {
      he: 'אמנת ביטוח-סוציאלי בתוקף עם ישראל — בטופס A1 איטלקי / Certificate of Coverage ניתן להישאר מבוטח רק בביטוח הלאומי הישראלי לעד שנתיים.',
      en: 'Bilateral social-security agreement in force — A1/Certificate of Coverage allows continued IL Bituach Leumi coverage only, up to 2 years.',
      pt: 'Acordo SS em vigor com Israel.',
      es: 'Acuerdo SS en vigor con Israel.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'high',
    peNote: {
      he: 'Circolare 25/E מ-18/08/2023 של רשות המסים האיטלקית: "smart working" של עובד יחיד מאיטליה עשוי כשלעצמו ליצור מוסד-קבע למעסיק הזר. גישה אגרסיבית במיוחד אם העובד מבצע "פעילות-ליבה" של החברה. החברה הישראלית עלולה לחוב IRES 24% + IRAP 3.9%.',
      en: 'Italian Revenue Agency Circular 25/E (18 Aug 2023): a single employee\'s "smart working" from Italy may by itself create PE for the foreign employer. Particularly aggressive when the worker performs core (not auxiliary) functions. Israeli company would owe IRES (24%) + IRAP (3.9%).',
      pt: 'Circular 25/E (18/08/2023) da Agenzia delle Entrate: smart working pode criar EP. IRES 24% + IRAP 3.9%.',
      es: 'Circular 25/E (18/08/2023) de la Agenzia delle Entrate: smart working puede crear EP. IRES 24% + IRAP 3,9%.',
    },
    peSource: 'https://blog.pwc-tls.it/en/2023/08/22/circular-of-the-italian-tax-agency-on-the-tax-profiles-of-remote-work-and-the-tax-discipline-of-frontier-employees-following-the-innovations-set-out-in-law-no-83-2023-on-the-ratification-of-the-italy/',
    nomadVisa: {
      he: 'DNV (אפריל 2024) — נדרשת תעודה מקצועית "highly-skilled" (תואר או 5 שנות ניסיון), הכנסה ~€28K/שנה (3× סף שכר מינ׳ איטלקי) + ביטוח בריאות.',
      en: 'DNV (Apr 2024) — "highly-skilled" credential required (degree or 5 yrs experience), income ~€28K/yr (3× Italian min-wage benchmark) + health insurance.',
      pt: 'DNV (abril 2024) — exige credencial highly-skilled; renda ~€28K/ano.',
      es: 'DNV (abril 2024) — requiere credencial highly-skilled; ingreso ~€28K/año.',
    },
    nomadVisaSource: 'https://ambpristina.esteri.it/en/servizi-consolari-e-visti/servizi-per-il-cittadino-straniero/visti/visto-per-nomadi-digitali-e-lavoratori-da-remoto/',
    verifiedDate: '2026-05',
  },

  GR: {
    flag: '🇬🇷',
    name: { he: 'יוון', en: 'Greece', pt: 'Grécia', es: 'Grecia' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בכל תקופה רצופה של 12 חודשים בשנת המס. תושבות מ-יום ההגעה הראשון.',
      en: 'Over 183 days in any rolling 12-month period within the tax year. Residency from first day of presence.',
      pt: 'Mais de 183 dias em qualquer período de 12 meses; residência desde o 1.º dia.',
      es: 'Más de 183 días en cualquier período de 12 meses; residencia desde el primer día.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/greece/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 1995,
    treatyNote: {
      he: 'אמנה חתומה 23/10/1995, נכנסה לתוקף ב-31/12/1998. שובר-שוויון ל-Dual Residents בסעיף 4.',
      en: 'Signed 23 Oct 1995, in force 31 Dec 1998. Article 4 tie-breaker for dual residents.',
      pt: 'Assinada em 23/10/1995, em vigor desde 31/12/1998. Artigo 4.',
      es: 'Firmada el 23/10/1995, en vigor desde el 31/12/1998. Artículo 4.',
    },
    treatySource: 'https://www.aade.gr/en/international-issues/issues-international-tax-content/texts-contracts-treaties-avoidance-double-taxation-greece',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל — תיתכן כפל-תשלום עם EFKA (~22% מעסיק).',
      en: 'No social-security agreement with Israel — possible double contributions with EFKA (~22% employer).',
      pt: 'Sem acordo SS com Israel.',
      es: 'Sin convenio SS con Israel.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'יוון מיישמת את ה-OECD MTC ברוב המקרים אבל רשות AADE מצהירה: עובד יחיד שמבצע פונקציות-ליבה ביוון (לא רק תמיכה) או חותם על חוזים יוצר חשיפת PE למעסיק הישראלי. שיעור מס חברות יווני: 22%.',
      en: 'Greece broadly follows OECD MTC, but AADE has stated: a single employee performing core functions from Greece (or signing contracts) creates PE exposure for an Israeli employer. Greek CIT: 22%.',
      pt: 'Grécia segue OCDE MTC, mas funcionário em funções essenciais cria risco de EP. IRC 22%.',
      es: 'Grecia sigue OCDE MTC, pero un empleado en funciones esenciales crea riesgo de EP. IS 22%.',
    },
    peSource: 'https://www.aade.gr/en/international-issues/issues-international-tax-content/texts-contracts-treaties-avoidance-double-taxation-greece',
    nomadVisa: {
      he: 'DNV (חוק 4825/2021) — הכנסה ≥€3,500/חודש נטו. הטבת 50% הקלת מס למעבירי תושבות לפי סעיף 5C ל-7 שנים.',
      en: 'DNV (Law 4825/2021) — income ≥€3,500/mo net. 50% income-tax exemption for new residents under Article 5C for 7 years.',
      pt: 'DNV (Lei 4825/2021) — ≥€3.500/mês líquido. Isenção 50% Art.5C por 7 anos.',
      es: 'DNV (Ley 4825/2021) — ≥€3.500/mes neto. Exención 50% Art.5C por 7 años.',
    },
    nomadVisaSource: 'https://www.globalcitizensolutions.com/greece-digital-nomad-visa/',
    verifiedDate: '2026-05',
  },

  CY: {
    flag: '🇨🇾',
    name: { he: 'קפריסין', en: 'Cyprus', pt: 'Chipre', es: 'Chipre' },
    taxResidentDays: 60,
    taxResidentNote: {
      he: 'מסלול 60-ימים (ייחודי) או 183-ימים. מסלול-60 מחייב: נכס מגורים קבוע בקפריסין, פעילות עסקית/תעסוקה/כהונת דירקטור בקפריסין. מ-1/1/2026 בוטל התנאי "לא תושב מדינה אחרת".',
      en: 'Either 60-day rule (unique) OR 183-day rule. 60-day rule requires: permanent home in CY, business/employment/director role in CY. From 1 Jan 2026, the "not resident elsewhere" condition was repealed.',
      pt: 'Regra 60 dias (única) ou 183 dias. 60 exige casa permanente em CY + atividade local.',
      es: 'Regla de 60 días (única) o 183 días. 60 exige hogar permanente en CY + actividad local.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/cyprus/individual/residence',
    treatyWithIsrael: false,
    treatyYear: null,
    treatyNote: {
      he: 'אין אמנה דו-צדדית למניעת כפל-מס בין ישראל לקפריסין נכון ל-2026-05. הקלה ניתנת רק דרך FTC חד-צדדי לפי סעיף 200 לפק׳ מ"ה הישראלית.',
      en: 'No bilateral DTA between Israel and Cyprus as of 2026-05. Relief only via unilateral foreign tax credit under §200 Israel ITO.',
      pt: 'Sem CDT bilateral Israel-Chipre em 2026-05. Alívio só via crédito unilateral §200 ITO.',
      es: 'Sin CDI bilateral Israel-Chipre en 2026-05. Alivio solo vía crédito unilateral §200 ITO.',
    },
    treatySource: 'https://y-tax.co.il/en/country/israel-tax-treaty-cyprus/',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל.',
      en: 'No social-security agreement with Israel.',
      pt: 'Sem acordo SS com Israel.',
      es: 'Sin convenio SS con Israel.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'low',
    peNote: {
      he: 'קפריסין מאמצת OECD MTC כמעט מילולית. בית-בעת לא יוצר PE אלא אם יש שליטה מעסיק על שטח, חוזים נחתמים בקפריסין, או פעילות-ליבה מתבצעת >50% מהזמן. שיעור מס חברות קפריסאי: 12.5% (מהנמוכים באיחוד).',
      en: 'Cyprus closely follows OECD MTC. A home office does not create PE unless the employer has disposal of the premises, contracts are signed in CY, or core activity is performed >50% of time. Cypriot CIT: 12.5% (among lowest in EU).',
      pt: 'Chipre segue OCDE MTC. Home office geralmente não cria EP. IRC 12.5%.',
      es: 'Chipre sigue OCDE MTC. Home office no suele crear EP. IS 12.5%.',
    },
    peSource: 'https://taxsummaries.pwc.com/cyprus/corporate/corporate-residence',
    nomadVisa: {
      he: 'Cyprus DNV (2021) — הכנסה ≥€3,500/חודש נטו. מכסה 1,000. תוקף שנה, ניתן לחדש; שילוב עם משטר Non-Dom: 0% על דיבידנדים/ריבית עד 17 שנים.',
      en: 'Cyprus DNV (2021) — income ≥€3,500/mo net. 1,000-permit cap. 1-year validity, renewable; combine with Non-Dom regime: 0% on dividends/interest for 17 years.',
      pt: 'Cyprus DNV (2021) — ≥€3.500/mês líquido. Combina com Non-Dom (0% dividendos por 17 anos).',
      es: 'Cyprus DNV (2021) — ≥€3.500/mes neto. Combina con Non-Dom (0% dividendos por 17 años).',
    },
    nomadVisaSource: 'https://www.gov.cy/mip-md/en/documents/digital-nomads-and-family-members/',
    verifiedDate: '2026-05',
  },

  MT: {
    flag: '🇲🇹',
    name: { he: 'מלטה', en: 'Malta', pt: 'Malta', es: 'Malta' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בשנה קלנדרית, או נוכחות עם כוונה להישאר ("ordinary residence"). תושב לא-תושב-במקור (Non-Dom) ממוסה רק על הכנסה מקומית + הכנסה זרה שמועברת למלטה.',
      en: 'Over 183 days per calendar year, or presence with intent to reside ("ordinary residence"). Non-domiciled residents taxed only on Maltese-source + foreign income remitted to MT.',
      pt: 'Mais de 183 dias por ano civil, ou residência ordinária. Não-dom paga só sobre rendimento maltês + remetido.',
      es: 'Más de 183 días por año natural, o residencia ordinaria. No-dom solo paga sobre renta maltesa + remitida.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/malta/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 2011,
    treatyNote: {
      he: 'אמנה חתומה 28/07/2011, נכנסה לתוקף ב-08/12/2013. שובר-שוויון ל-Dual Residents בסעיף 4.',
      en: 'Signed 28 Jul 2011, in force 8 Dec 2013. Article 4 tie-breaker for dual residents.',
      pt: 'Assinada em 28/07/2011, em vigor desde 08/12/2013. Artigo 4.',
      es: 'Firmada el 28/07/2011, en vigor desde el 08/12/2013. Artículo 4.',
    },
    treatySource: 'https://mtca.gov.mt/business-tax/InternationalAffairs/international-legislation-and-agreements/international-agreements/double-taxation',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל.',
      en: 'No social-security agreement with Israel.',
      pt: 'Sem acordo SS com Israel.',
      es: 'Sin convenio SS con Israel.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'low',
    peNote: {
      he: 'מלטה עוקבת אחר OECD MTC ולא דוחפת תביעות PE על עובדי בית. שיעור מס חברות 35% נומינלי (אבל בפועל ~5-10% אחרי refund לבעלי-מניות זרים). תושב Nomad Permit ממוסה ב-10% — לא נוגע ל-PE של המעסיק.',
      en: 'Malta follows OECD MTC and does not aggressively pursue home-office PE. CIT 35% nominal (effective ~5-10% after refund to foreign shareholders). Nomad Permit holders taxed at 10% — does not affect employer\'s PE status.',
      pt: 'Malta segue OCDE MTC; baixa fiscalização de EP. IRC 35% nominal (efetivo ~5-10%).',
      es: 'Malta sigue OCDE MTC; baja fiscalización de EP. IS 35% nominal (efectivo ~5-10%).',
    },
    peSource: 'https://taxsummaries.pwc.com/malta/corporate/corporate-residence',
    nomadVisa: {
      he: 'Nomad Residence Permit (2021) — הכנסה ≥€3,500/חודש ברוטו. שנה ראשונה: פטור מלא; שנים 2-4: 10% מס שטוח על הכנסת ה-DN. עד 4 שנים סה״כ.',
      en: 'Nomad Residence Permit (2021) — income ≥€3,500/mo gross. Year 1: 100% tax exemption; Years 2-4: flat 10% on nomad income. Up to 4 years total.',
      pt: 'Nomad Permit (2021) — ≥€3.500/mês bruto. Ano 1: isenção total; depois 10% até 4 anos.',
      es: 'Nomad Permit (2021) — ≥€3.500/mes bruto. Año 1: exención total; después 10% hasta 4 años.',
    },
    nomadVisaSource: 'https://nomad.residencymalta.gov.mt/',
    verifiedDate: '2026-05',
  },

  GE: {
    flag: '🇬🇪',
    name: { he: 'גאורגיה', en: 'Georgia', pt: 'Geórgia', es: 'Georgia' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בכל תקופה רצופה של 12 חודשים. ניתן גם דרך מסלול HNWI: רכוש מאומת >3 מיליון GEL או הכנסה שנתית >200K GEL ב-3 שנים אחרונות.',
      en: 'Over 183 days in any rolling 12-month period. Alternative HNWI route: verified property >3M GEL or annual income >200K GEL for 3 prior years.',
      pt: 'Mais de 183 dias em 12 meses. Via HNWI: bens >3M GEL.',
      es: 'Más de 183 días en 12 meses. Vía HNWI: bienes >3M GEL.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/georgia/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 2010,
    treatyNote: {
      he: 'אמנה חתומה 12/05/2010, נכנסה לתוקף 30/12/2011. שובר-שוויון ל-Dual Residents בסעיף 4.',
      en: 'Signed 12 May 2010, in force 30 Dec 2011. Article 4 tie-breaker for dual residents.',
      pt: 'Assinada em 12/05/2010, em vigor 30/12/2011. Artigo 4.',
      es: 'Firmada el 12/05/2010, en vigor 30/12/2011. Artículo 4.',
    },
    treatySource: 'https://y-tax.co.il/en/country/israel-georgia-tax-treaty/',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל. הערה: גאורגיה מטילה רק 2% מעובד + 2% מעסיק (פנסיה — נכנס לתוקף ב-2019).',
      en: 'No social-security agreement with Israel. Note: Georgia\'s mandatory pension is just 2%+2% (in force since 2019) — low double-payment exposure.',
      pt: 'Sem acordo SS com Israel; pensão obrigatória só 2%+2%.',
      es: 'Sin convenio SS con Israel; pensión obligatoria solo 2%+2%.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'low',
    peNote: {
      he: 'גאורגיה מאמצת את עקרונות OECD MTC ויש לה מסגרת "מקור-טריטוריאלי" — הכנסה ממקור-חוץ של תושב פטורה ברוב המקרים. PE נדיר ביותר עבור מעסיק זר עם עובד בודד. שיעור מס חברות: 15%.',
      en: 'Georgia follows OECD MTC and applies territorial sourcing — foreign-source income of residents is mostly exempt. PE for a foreign employer with a single remote worker is rare. CIT: 15%.',
      pt: 'Geórgia segue OCDE MTC; tributação territorial. EP raro. IRC 15%.',
      es: 'Georgia sigue OCDE MTC; tributación territorial. EP raro. IS 15%.',
    },
    peSource: 'https://taxsummaries.pwc.com/georgia/corporate/corporate-residence',
    nomadVisa: {
      he: '"Remotely from Georgia" (2020) — שנה, ניתן לחדש; הכנסה ≥$2,000/חודש. ניתן להירשם כ-"Small Business" ולשלם 1% מס על מחזור עד 500K GEL/שנה.',
      en: '"Remotely from Georgia" (2020) — 1 year, renewable; income ≥$2,000/mo. Can register as "Small Business" — 1% turnover tax up to 500K GEL/yr.',
      pt: '"Remotely from Georgia" (2020) — 1 ano. Pode registar como Small Business (1% até 500K GEL).',
      es: '"Remotely from Georgia" (2020) — 1 año. Puede registrarse como Small Business (1% hasta 500K GEL).',
    },
    nomadVisaSource: 'https://georgiatourism.com/remotely-from-georgia/',
    verifiedDate: '2026-05',
  },

  AE: {
    flag: '🇦🇪',
    name: { he: 'איחוד האמירויות', en: 'UAE', pt: 'EAU', es: 'EAU' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'החלטת קבינט 85/2022 (בתוקף מ-1/3/2023): תושבות כשמתקיים אחד מ: (1) 183 ימים בתקופה רצופה של 12 חודשים, (2) 90 ימים + תושבות/אזרחות מפרצית, או (3) מרכז חיים פיננסיים ב-UAE.',
      en: 'Cabinet Decision 85/2022 (from 1 Mar 2023): residency if any of: (1) 183 days in a rolling 12 months, (2) 90 days + UAE/GCC residency, or (3) UAE is centre of financial/personal interests.',
      pt: 'Decisão 85/2022 (desde 1/3/2023): 183 dias OU 90 + residência local OU centro de interesses.',
      es: 'Decisión 85/2022 (desde 1/3/2023): 183 días O 90 + residencia local O centro de intereses.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/united-arab-emirates/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 2021,
    treatyNote: {
      he: 'אמנת אברהם — חתומה 31/05/2021, נכנסה לתוקף 31/12/2021. אמנה ראשונה של ישראל עם מדינה ערבית. שובר-שוויון בסעיף 4. מבוססת על OECD MTC.',
      en: 'Abraham Accords-era treaty — signed 31 May 2021, in force 31 Dec 2021. Israel\'s first treaty with an Arab/GCC state. Article 4 tie-breaker. OECD MTC-based.',
      pt: 'Tratado dos Acordos de Abraão — 31/05/2021, em vigor 31/12/2021. Primeiro com país árabe.',
      es: 'Tratado de los Acuerdos de Abraham — 31/05/2021, en vigor 31/12/2021. Primero con país árabe.',
    },
    treatySource: 'https://y-tax.co.il/en/country/israel-uae-tax-treaty/',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל. ה-UAE לא מטילה ביטוח לאומי על אקספטים (רק על אזרחי GCC).',
      en: 'No social-security agreement with Israel. UAE imposes social security only on GCC nationals — expats pay 0%.',
      pt: 'Sem acordo SS; expatriados pagam 0%.',
      es: 'Sin convenio SS; expatriados pagan 0%.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'low',
    peNote: {
      he: 'מאז יוני 2023 ה-UAE מטילה מס חברות 9% על רווחים מעל AED 375K. ה-UAE עוקבת אחר OECD MTC; אין הצהרה אגרסיבית על PE מעובד בית. הסיכון העיקרי: אם המעסיק הישראלי "פעיל בשוק UAE" דרך העובד, חיוב מס חברות 9%.',
      en: 'Since June 2023, UAE imposes 9% corporate tax above AED 375K profit. UAE follows OECD MTC and has no aggressive home-office PE stance. Main risk: if Israeli employer "actively markets in UAE" via the worker, 9% CT applies.',
      pt: 'Desde junho 2023: IRC 9% acima AED 375K. UAE segue OCDE MTC.',
      es: 'Desde junio 2023: IS 9% sobre AED 375K. UAE sigue OCDE MTC.',
    },
    peSource: 'https://taxsummaries.pwc.com/united-arab-emirates/corporate/corporate-residence',
    nomadVisa: {
      he: 'Dubai Virtual Working Programme (2021) — הכנסה ≥$3,500/חודש. שנה, ניתן לחדש. 0% מס הכנסה אישי. Federal "Remote Work Visa" דומה בכל האמירויות.',
      en: 'Dubai Virtual Working Programme (2021) — income ≥$3,500/mo. 1 year, renewable. 0% personal income tax. Federal "Remote Work Visa" similar across all Emirates.',
      pt: 'Dubai Virtual Working (2021) — ≥$3.500/mês. 0% IRS.',
      es: 'Dubai Virtual Working (2021) — ≥$3.500/mes. 0% IRPF.',
    },
    nomadVisaSource: 'https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/dubai-virtual-working-program',
    verifiedDate: '2026-05',
  },

  TH: {
    flag: '🇹🇭',
    name: { he: 'תאילנד', en: 'Thailand', pt: 'Tailândia', es: 'Tailandia' },
    taxResidentDays: 180,
    taxResidentNote: {
      he: 'תאילנד היא יוצאת-דופן: 180 ימים בלבד (לא 183) בשנת מס קלנדרית. שינוי ב-1/1/2024: כל הכנסה זרה המועברת לתאילנד חייבת במס לתושבי-תאילנד (גם אם הופקה בשנים קודמות, פרט להכנסה לפני 1/1/2024).',
      en: 'Thailand is an outlier: 180 days (not 183) in a calendar year. From 1 Jan 2024: ALL foreign income remitted to TH is taxable for residents (incl. multi-year earnings), except income earned before 2024.',
      pt: '180 dias (não 183). Desde 1/1/2024 todo rendimento estrangeiro remetido é tributado.',
      es: '180 días (no 183). Desde 1/1/2024 toda renta extranjera remitida tributa.',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/thailand/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 1996,
    treatyNote: {
      he: 'אמנה חתומה 22/01/1996, נכנסה לתוקף 24/12/1996. שובר-שוויון בסעיף 4. תאילנד חתמה על MLI (2022).',
      en: 'Signed 22 Jan 1996, in force 24 Dec 1996. Article 4 tie-breaker. Thailand signed MLI (2022).',
      pt: 'Assinada em 22/01/1996, em vigor 24/12/1996. Artigo 4.',
      es: 'Firmada el 22/01/1996, en vigor 24/12/1996. Artículo 4.',
    },
    treatySource: 'https://orbitax.com/taxhub/taxtreaties/IL/Israel/TH/Thailand/',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת ביטוח-סוציאלי עם ישראל — תאילנד מטילה SSO 5%+5% על עובדים פיזיים בתחומה גם כשהמעסיק זר.',
      en: 'No social-security agreement with Israel — Thailand imposes SSO 5%+5% on physical workers in country even when employer is foreign.',
      pt: 'Sem acordo SS; SSO 5%+5% mesmo com empregador estrangeiro.',
      es: 'Sin convenio SS; SSO 5%+5% incluso con empleador extranjero.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'תאילנד עוקבת אחר OECD MTC בגדול, אבל ה-Revenue Department נוטה לטעון ל-PE אם העובד מבצע פעולות-ליבה תאילנדיות (חתימת חוזים, מכירה ללקוחות תאילנדיים). ויזת DTV אוסרת עבודה למעסיק תאילנדי — מצמצמת חשיפה. שיעור מס חברות תאילנדי: 20%.',
      en: 'Thailand broadly follows OECD MTC, but the Revenue Department asserts PE if the worker performs core local activities (signing contracts, selling to TH clients). DTV visa forbids working for TH employer — reduces exposure. Thai CIT: 20%.',
      pt: 'Tailândia segue OCDE; Revenue Dept assertiva se atividade-núcleo local. IRC 20%.',
      es: 'Tailandia sigue OCDE; Revenue Dept asertiva si actividad-núcleo local. IS 20%.',
    },
    peSource: 'https://www.workflex.com/post/understanding-the-dtv-visa-for-thailand-what-employers-need-to-know',
    nomadVisa: {
      he: 'DTV (Destination Thailand Visa, יולי 2024) — 5 שנים, 180 ימים לכניסה, ניתן לחדש. דרישה: חיסכון ฿500K (~$14K) או ראיה להעסקה זרה.',
      en: 'DTV (Destination Thailand Visa, Jul 2024) — 5 years, 180 days/entry, renewable. ฿500K (~$14K) savings or proof of foreign employment.',
      pt: 'DTV (julho 2024) — 5 anos, 180 dias/entrada; ฿500K poupança.',
      es: 'DTV (julio 2024) — 5 años, 180 días/entrada; ฿500K ahorros.',
    },
    nomadVisaSource: 'https://www.thaiembassy.com/thailand-visa/dtv-visa-thailand',
    verifiedDate: '2026-05',
  },

  US: {
    flag: '🇺🇸',
    name: { he: 'ארה״ב', en: 'USA', pt: 'EUA', es: 'EEUU' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'Substantial Presence Test: 31 ימים בשנת המס + סה״כ "ימים-משוקללים" של 183 ב-3 שנים: 100% השנה + 1/3 שנה קודמת + 1/6 שלפניה. אזרחי ארה״ב + Green Card תמיד חייבים על הכנסה גלובלית.',
      en: 'Substantial Presence Test: 31 days in current year + weighted total of 183 over 3 years: 100% current + 1/3 prior + 1/6 year-before-prior. US citizens + Green Card holders always taxed on worldwide income.',
      pt: 'SPT: 31 dias atuais + 183 ponderados em 3 anos. Cidadãos/GC sempre tributados.',
      es: 'SPT: 31 días actuales + 183 ponderados en 3 años. Ciudadanos/GC siempre tributados.',
    },
    taxResidentSource: 'https://www.irs.gov/individuals/international-taxpayers/substantial-presence-test',
    treatyWithIsrael: true,
    treatyYear: 1975,
    treatyNote: {
      he: 'אמנה חתומה 1975, פרוטוקול 1980, פרוטוקול נוסף 1993. שובר-שוויון בסעיף 3 (לא 4) — בית-קבע → אינטרסים → שהייה רגילה → אזרחות. "Saving clause" מאפשרת לארה״ב להמשיך למסות אזרחים אמריקאים.',
      en: 'Signed 1975, Protocol 1980, additional Protocol 1993. Tie-breaker in Article 3 (not 4) — permanent home → interests → habitual abode → nationality. "Saving clause" preserves US right to tax citizens.',
      pt: 'Assinado 1975, protocolo 1993. Tie-breaker Art.3. "Saving clause".',
      es: 'Firmado 1975, protocolo 1993. Tie-breaker Art.3. "Saving clause".',
    },
    treatySource: 'https://www.irs.gov/pub/irs-trty/israel.pdf',
    totalizationIL: false,
    totalizationNote: {
      he: 'אין אמנת Totalization מקיפה עם ישראל. אזרחי ארה״ב המועסקים בישראל עלולים לחוב SE-tax 15.3% בארה״ב + ביטוח לאומי בישראל.',
      en: 'No comprehensive Totalization Agreement with Israel. US citizens working in IL may owe US SE-tax (15.3%) AND Bituach Leumi simultaneously.',
      pt: 'Sem acordo SS com Israel — risco de SE-tax 15.3% + Bituach Leumi.',
      es: 'Sin convenio SS con Israel — riesgo de SE-tax 15.3% + Bituach Leumi.',
    },
    totalizationSource: 'https://www.ssa.gov/international/agreements_overview.html',
    peRisk: 'medium',
    peNote: {
      he: 'הדין האמריקאי משלב "Effectively Connected Income" (ECI) + "US Trade or Business". עובד ישראלי שעובד מבית בארה״ב למעסיק ישראלי עלול ליצור ECI עבור המעסיק — חיוב במס חברות פדרלי 21% + מס state. הסטנדרט אגרסיבי יחסית; IRS צמצמה הקלות COVID ב-2022.',
      en: 'US uses "Effectively Connected Income" (ECI) + "US Trade or Business" tests. An Israeli employee working from a US home for an Israeli employer can create ECI — triggering 21% federal CIT + state tax. Stance moderately aggressive; IRS rolled back COVID-era reliefs in 2022.',
      pt: 'EUA usa ECI/USTB. Empregado em casa pode criar ECI; IRC fed 21% + estatal.',
      es: 'EE.UU. usa ECI/USTB. Empleado en casa puede crear ECI; IS fed 21% + estatal.',
    },
    peSource: 'https://www.irs.gov/individuals/international-taxpayers/effectively-connected-income-eci',
    nomadVisa: {
      he: 'אין DNV אמריקאי. ויזת B-2 לתיירות (90 יום ESTA) לא מתירה עבודה — גם לא למעסיק זר; אכיפה אפורה אך קיימת.',
      en: 'No US DNV. B-2 tourist (90-day ESTA) does NOT permit work — even for a foreign employer; enforcement grey but exists.',
      pt: 'Sem DNV; B-2 não permite trabalho.',
      es: 'Sin DNV; B-2 no permite trabajo.',
    },
    nomadVisaSource: 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
    verifiedDate: '2026-05',
  },

  GB: {
    flag: '🇬🇧',
    name: { he: 'בריטניה', en: 'UK', pt: 'Reino Unido', es: 'Reino Unido' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'Statutory Residence Test (SRT) מאז 2013: 183+ ימים = תושב אוטומטית. <16 ימים = לא-תושב אוטומטית. בין-לבין: "Sufficient Ties Test" (90-120 ימים = 2 קשרים; 121-182 = 1 קשר). מעבר 5/4/2025: משטר Non-Dom בוטל לטובת FIG (Foreign Income & Gains).',
      en: 'Statutory Residence Test (SRT) since 2013: 183+ days = automatic resident. <16 days = automatic non-resident. In between: "Sufficient Ties Test" (90-120 days = 2 ties; 121-182 = 1 tie). From 6 Apr 2025: Non-Dom regime abolished, replaced by FIG (Foreign Income & Gains) regime.',
      pt: 'SRT desde 2013 — escala 16/45/90/120/183. Non-Dom abolido em 6/4/2025 → FIG.',
      es: 'SRT desde 2013 — escala 16/45/90/120/183. Non-Dom abolido el 6/4/2025 → FIG.',
    },
    taxResidentSource: 'https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt/guidance-note-for-statutory-residence-test-srt-rdr3',
    treatyWithIsrael: true,
    treatyYear: 1962,
    treatyNote: {
      he: 'אמנה חתומה 1962, פרוטוקול 2018. אמנה ישנה אך פעילה. שובר-שוויון בסעיף 3. סעיף 14 לאמנה (תעסוקה) פוטר מס בריטי אם <183 ימים ומשולם ע״י מעסיק לא-בריטי.',
      en: 'Signed 1962, Protocol 2018. Old but operative treaty. Article 3 tie-breaker. Article 14 (employment) exempts UK tax if <183 days and paid by non-UK employer.',
      pt: 'Assinado 1962, protocolo 2018. Art.14 isenta se <183 dias.',
      es: 'Firmado 1962, protocolo 2018. Art.14 exime si <183 días.',
    },
    treatySource: 'https://www.gov.uk/government/publications/israel-tax-treaties',
    totalizationIL: true,
    totalizationNote: {
      he: 'אמנת ביטוח-סוציאלי בתוקף עם ישראל — A1/Certificate of Coverage מאפשר להישאר מבוטח רק ב-Bituach Leumi לעד שנתיים לעובד-נשלח.',
      en: 'Bilateral social-security agreement in force — Certificate of Coverage allows continued IL Bituach Leumi coverage only, up to 2 years for posted workers.',
      pt: 'Acordo SS em vigor; Certificate of Coverage até 2 anos.',
      es: 'Acuerdo SS en vigor; Certificate of Coverage hasta 2 años.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'HMRC מאמצת את עדכון OECD MTC 2025 (כולל מקלט-50%), אבל פעולה רגילה של עובד מבית בבריטניה למעסיק ישראלי יכולה ליצור Fixed-Place PE או Dependent Agent PE — חיוב במס חברות בריטי 25%. סיכון גבוה במיוחד אם העובד חותם על חוזים עם לקוחות בריטיים.',
      en: 'HMRC follows OECD MTC 2025 update (incl. 50% safe-harbour), but ordinary home-office work in UK for an Israeli employer can still create Fixed-Place PE or Dependent Agent PE — triggering 25% UK CT. Especially high risk if worker signs contracts with UK customers.',
      pt: 'HMRC segue OCDE 2025; home office pode criar EP. IRC 25%.',
      es: 'HMRC sigue OCDE 2025; home office puede crear EP. IS 25%.',
    },
    peSource: 'https://www.bdo.co.uk/en-gb/insights/tax/corporate-international-tax/employees-working-from-international-homes-a-new-corporate-tax-risk',
    nomadVisa: {
      he: 'אין DNV בריטי. Standard Visitor (6 חודשים) מתיר עבודה למעסיק זר כל עוד התעסוקה העיקרית מחוץ לבריטניה (הובהר ב-31/01/2024).',
      en: 'No UK DNV. Standard Visitor (6 months) permits some remote work for a foreign employer if primary employment is outside UK (clarified 31 Jan 2024).',
      pt: 'Sem DNV; Standard Visitor 6 meses permite remote para empregador estrangeiro.',
      es: 'Sin DNV; Standard Visitor 6 meses permite remoto para empleador extranjero.',
    },
    nomadVisaSource: 'https://www.gov.uk/standard-visitor',
    verifiedDate: '2026-05',
  },

  DE: {
    flag: '🇩🇪',
    name: { he: 'גרמניה', en: 'Germany', pt: 'Alemanha', es: 'Alemania' },
    taxResidentDays: 183,
    taxResidentNote: {
      he: 'מעל 183 ימים בשנה קלנדרית, או "Wohnsitz" (בית-קבע) בגרמניה — גם 30 ימים בלבד עם דירה זמינה כל השנה יוצרים תושבות. תושב חייב על הכנסה גלובלית.',
      en: 'Over 183 days in a calendar year, OR "Wohnsitz" (permanent home) in Germany — even 30 days suffices if a dwelling is kept available year-round. Resident taxed on worldwide income.',
      pt: 'Mais de 183 dias OU Wohnsitz (lar permanente).',
      es: 'Más de 183 días O Wohnsitz (hogar permanente).',
    },
    taxResidentSource: 'https://taxsummaries.pwc.com/germany/individual/residence',
    treatyWithIsrael: true,
    treatyYear: 2014,
    treatyNote: {
      he: 'אמנה מעודכנת חתומה 21/08/2014, נכנסה לתוקף 21/05/2016 (מחליפה את אמנת 1962). שובר-שוויון בסעיף 4 (בית-קבע → מרכז אינטרסים → שהייה רגילה → אזרחות).',
      en: 'Updated treaty signed 21 Aug 2014, in force 21 May 2016 (replaces 1962 treaty). Article 4 tie-breaker (permanent home → vital interests → habitual abode → nationality).',
      pt: 'Tratado atualizado 21/08/2014, em vigor 21/05/2016. Artigo 4.',
      es: 'Tratado actualizado 21/08/2014, en vigor 21/05/2016. Artículo 4.',
    },
    treatySource: 'https://y-tax.co.il/en/country/germany-tax-treaty-israel/',
    totalizationIL: true,
    totalizationNote: {
      he: 'אמנת ביטוח-סוציאלי בתוקף עם ישראל (מ-1973, מעודכנת). Bescheinigung A1 / Certificate of Coverage מאפשרים להישאר תחת Bituach Leumi לעד שנתיים.',
      en: 'Bilateral SS agreement in force with Israel (1973, updated). A1 certificate / Certificate of Coverage allows continued IL coverage only, up to 2 years.',
      pt: 'Acordo SS desde 1973; A1 até 2 anos.',
      es: 'Acuerdo SS desde 1973; A1 hasta 2 años.',
    },
    totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
    peRisk: 'medium',
    peNote: {
      he: 'BMF Letter מ-05/02/2024 (תיקון AEAO): בדרך כלל בית-בעת לא יוצר מוסד-קבע, אלא אם המעסיק שומר "Verfügungsmacht" (כוח הפצה) על השטח — לדוגמה משלם שכ"ד או מציוד. גרמניה היסטורית מחמירה (BFH I B 3/14, 2015) — דרישת "rootedness" של המעסיק. אם נוצר PE: מס חברות גרמני 15% + Solidaritätszuschlag + Gewerbesteuer (~30% סך הכל).',
      en: 'BMF Letter 5 Feb 2024 (revising AEAO): a home office generally does not create PE unless the employer has "Verfügungsmacht" (power of disposal) — e.g., pays rent or equipment. Germany historically stricter than OECD (BFH I B 3/14, 2015) — requires employer "rootedness". If PE found: 15% CT + Solidaritätszuschlag + Gewerbesteuer (~30% total).',
      pt: 'Carta BMF 05/02/2024: home office geralmente sem EP, exceto se empregador tem Verfügungsmacht. ~30% se EP.',
      es: 'Carta BMF 05/02/2024: home office no crea EP, salvo Verfügungsmacht. ~30% si EP.',
    },
    peSource: 'https://www.twobirds.com/en/insights/2024/germany/homeoffice-begruendet-in-der-regel-keine-betriebsstaette-des-arbeitsgebers',
    nomadVisa: {
      he: 'אין DNV ייעודי. Freiberufler Visa (סעיף 21 AufenthG) מתאים לפרילנסרים — צריך הזמנות לקוחות מקומיים, לא רק זרים. תושבי EU/EEA חופשיים.',
      en: 'No dedicated DNV. Freiberufler Visa (§21 AufenthG) suits freelancers — requires local client demand, not only foreign. EU/EEA citizens unrestricted.',
      pt: 'Sem DNV; Freiberufler Visa §21 AufenthG para freelancers.',
      es: 'Sin DNV; Freiberufler Visa §21 AufenthG para freelancers.',
    },
    nomadVisaSource: 'https://www.make-it-in-germany.com/en/visa-residence/types/self-employment',
    verifiedDate: '2026-05',
  },
};
