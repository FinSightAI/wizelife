/**
 * nomad-additions.js — BR, ID, SG additions for nomad-data.js + nomad-supplements.js.
 *
 * Audience: Israeli passport holders / freelancers working remotely while
 * employed (or contracting) by an Israeli entity. Surfaces the same fields
 * as nomad-data.js (NOMAD_DATA) and nomad-supplements.js (byCountry, dayRule).
 *
 * Sources are URL-linked per fact. PwC Worldwide Tax Summaries is preferred;
 * Israel Tax Authority + official country authorities (Receita Federal, DJP,
 * IRAS) are next; reputable law-firm briefings (Baker McKenzie, KPMG, EY,
 * y-tax.co.il) where official text is paywalled.
 *
 * IMPORTANT caveats:
 *   - Brazil and Indonesia have NO double-tax treaty with Israel (verified
 *     2026-05 vs gov.il treaty list) and NO social-security totalization.
 *     Israel-Singapore DTA exists since 1971 (one of Israel's oldest).
 *   - Indonesia and Israel have NO diplomatic relations. Israeli passport
 *     holders generally CANNOT use Indonesia's normal visa-on-arrival /
 *     visa-free schemes, and the B211A "Nomad Visa" route is in practice
 *     gated by an Indonesian embassy abroad (often via a third country).
 *     We mark this clearly in touristVisaNote and nomadVisa for ID.
 *   - peRisk is a calibration of how aggressively the country pursues
 *     home-office PE claims; not legal advice. Always confirm with a CPA
 *     before relocating for >6 months. For Indonesia and Brazil we have
 *     undersold rather than overpromised.
 *
 * Verified: 2026-05
 */
window.NOMAD_ADDITIONS = {
  data: {
    BR: {
      flag: '🇧🇷',
      name: { he: 'ברזיל', en: 'Brazil', pt: 'Brasil', es: 'Brasil' },
      taxResidentDays: 183,
      taxResidentNote: {
        he: 'מעל 183 ימים בכל תקופה רצופה של 12 חודשים. תושבות מתחילה ביום ההגעה אם נכנסת על ויזת עבודה/קבע, אחרת ביום ה-184 של נוכחות. הצהרת מעבר מתבצעת בטופס DSDP/DSDPE לרשות Receita Federal.',
        en: 'Over 183 days within any rolling 12-month period. Residency starts on arrival day if entering on a work/permanent visa; otherwise on the 184th day of presence. Departure declaration via DSDP/DSDPE form to Receita Federal.',
        pt: 'Mais de 183 dias em qualquer período de 12 meses. Residência inicia na chegada se entrou com visto permanente/trabalho; caso contrário no 184.º dia. Declaração via DSDP/DSDPE à Receita Federal.',
        es: 'Más de 183 días en cualquier período móvil de 12 meses. Residencia desde la llegada si entró con visa de trabajo/permanente; en otro caso desde el día 184. Declaración vía DSDP/DSDPE a Receita Federal.',
      },
      taxResidentSource: 'https://taxsummaries.pwc.com/brazil/individual/residence',
      treatyWithIsrael: false,
      treatyYear: null,
      treatyNote: {
        he: 'אין אמנה דו-צדדית למניעת כפל-מס בין ישראל לברזיל נכון ל-2026-05 (אומת מול רשימת רשות המסים הישראלית). הקלה ניתנת רק דרך זיכוי מס זר חד-צדדי לפי סעיף 200 לפק׳ מ"ה. ברזיל מטילה מס במקור 15-27.5% על תושבים ועל מקור-ברזיל לזרים.',
        en: 'No bilateral DTA between Israel and Brazil as of 2026-05 (verified against the Israel Tax Authority treaty list). Relief only via unilateral foreign tax credit under §200 Israel ITO. Brazil applies 15-27.5% withholding on residents and on Brazil-source income of non-residents.',
        pt: 'Sem CDT bilateral Israel-Brasil em 2026-05 (verificado na lista da ITA). Alívio só por crédito unilateral §200 ITO. Brasil aplica retenção 15-27,5%.',
        es: 'Sin CDI bilateral Israel-Brasil en 2026-05 (verificado contra la lista de la ITA). Alivio solo vía crédito unilateral §200 ITO. Brasil aplica retención 15-27,5%.',
      },
      treatySource: 'https://www.gov.il/en/departments/dynamiccollectors/international_agreements',
      totalizationIL: false,
      totalizationNote: {
        he: 'אין אמנת ביטוח-סוציאלי עם ישראל. ברזיל מטילה INSS על עובד בשכר (~11% עובד + ~20% מעסיק); תושבי-מס ברזילאים עלולים לחוב כפל-תשלום מול ביטוח לאומי ישראלי.',
        en: 'No social-security agreement with Israel. Brazil levies INSS on payroll (~11% employee + ~20% employer); Brazilian tax residents may owe double contributions vs IL Bituach Leumi.',
        pt: 'Sem acordo SS com Israel. INSS ~11% empregado + ~20% empregador; risco de dupla contribuição.',
        es: 'Sin convenio SS con Israel. INSS ~11% empleado + ~20% empleador; riesgo de doble contribución.',
      },
      totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
      peRisk: 'medium',
      peNote: {
        he: 'Receita Federal פעלה היסטורית באגרסיביות מול חברות זרות שמועסקים שלהן יושבים בברזיל. עובד ישראלי שמבצע פונקציות-ליבה מברזיל (במיוחד מכירה ללקוחות ברזילאים או חתימת חוזים) עשוי ליצור מוסד-קבע למעסיק הישראלי — חיוב במס חברות IRPJ 25% + CSLL 9% (~34% סך הכל). בהיעדר אמנה, אין הגנת סעיף 5 של OECD MTC; הסטנדרט הברזילאי הפנימי חל ישירות.',
        en: 'Receita Federal has historically been aggressive toward foreign employers whose staff sit in Brazil. An Israeli employee performing core functions from Brazil (especially sales to Brazilian customers or signing contracts) can create PE for the Israeli employer — triggering IRPJ 25% + CSLL 9% (~34% combined). Without a treaty, there is no OECD MTC Art. 5 shield; Brazilian domestic standards apply directly.',
        pt: 'Receita Federal historicamente agressiva contra empregadores estrangeiros com pessoal no Brasil. Funções-núcleo a partir do BR criam EP. Sem tratado, não há escudo Art. 5 OCDE. IRPJ 25% + CSLL 9% (~34%).',
        es: 'Receita Federal históricamente agresiva con empleadores extranjeros con personal en Brasil. Funciones-núcleo desde BR crean EP. Sin tratado, no hay escudo Art. 5 OCDE. IRPJ 25% + CSLL 9% (~34%).',
      },
      peSource: 'https://taxsummaries.pwc.com/brazil/corporate/corporate-residence',
      nomadVisa: {
        he: 'Brazil Digital Nomad Visa (החלטה CNIg 45/2021, מינואר 2022) — דרישה: הכנסה מינ׳ ~$1,500/חודש או חיסכון של $18K + הוכחה לעבודה למעסיק זר. תוקף שנה, ניתן לחדש לעוד שנה. לא נותן אזרחות אבל מאפשר רישום CPF + פתיחת חשבון בנק.',
        en: 'Brazil Digital Nomad Visa (CNIg Resolution 45/2021, in force Jan 2022) — requires min income ~$1,500/mo OR ~$18K savings + proof of foreign employment. 1-year validity, renewable once. Does not grant citizenship but enables CPF registration + local bank account.',
        pt: 'Brazil DNV (Resolução CNIg 45/2021, jan 2022) — ~$1.500/mês ou $18K poupança + emprego estrangeiro. 1 ano, renovável uma vez. Permite CPF + banco local.',
        es: 'Brazil DNV (Resolución CNIg 45/2021, ene 2022) — ~$1.500/mes o $18K ahorros + empleo extranjero. 1 año, renovable una vez. Permite CPF + cuenta bancaria local.',
      },
      nomadVisaSource: 'https://www.gov.br/mre/pt-br/consulado-telaviv/servicos/vistos',
      verifiedDate: '2026-05',
    },

    ID: {
      flag: '🇮🇩',
      name: { he: 'אינדונזיה (באלי)', en: 'Indonesia (Bali)', pt: 'Indonésia (Bali)', es: 'Indonesia (Bali)' },
      taxResidentDays: 183,
      taxResidentNote: {
        he: 'חוק UU PPh §2 ayat (3): תושב אם נוכח >183 ימים בכל תקופה של 12 חודשים, או אם נמצא באינדונזיה בכל שנת מס עם כוונה להישאר. תושב חייב על הכנסה גלובלית; לא-תושב — רק על מקור אינדונזי (חיוב במס במקור 20%).',
        en: 'Law UU PPh §2 ayat (3): resident if present >183 days in any 12-month period, OR if present in Indonesia during a tax year with intent to reside. Residents taxed on worldwide income; non-residents only on Indonesian-source (20% withholding).',
        pt: 'Lei UU PPh §2 ayat (3): residente se presente >183 dias em 12 meses, ou se presente com intenção de residir. Residentes tributados em base mundial; não-residentes apenas fonte indonésia (retenção 20%).',
        es: 'Ley UU PPh §2 ayat (3): residente si está >183 días en 12 meses, o si está con intención de residir. Residentes tributados en base mundial; no-residentes solo fuente indonesia (retención 20%).',
      },
      taxResidentSource: 'https://taxsummaries.pwc.com/indonesia/individual/residence',
      treatyWithIsrael: false,
      treatyYear: null,
      treatyNote: {
        he: 'אין אמנה דו-צדדית למניעת כפל-מס בין ישראל לאינדונזיה. אינדונזיה אינה מקיימת יחסים דיפלומטיים פורמליים עם ישראל. הקלה למס אינדונזי ניתנת רק דרך זיכוי מס זר חד-צדדי לפי סעיף 200 לפק׳ מ"ה הישראלית.',
        en: 'No bilateral DTA between Israel and Indonesia. Indonesia does not maintain formal diplomatic relations with Israel. Relief from Indonesian tax is only via unilateral foreign tax credit under §200 Israel ITO.',
        pt: 'Sem CDT bilateral Israel-Indonésia. Indonésia não mantém relações diplomáticas formais com Israel. Alívio só via crédito unilateral §200 ITO.',
        es: 'Sin CDI bilateral Israel-Indonesia. Indonesia no mantiene relaciones diplomáticas formales con Israel. Alivio solo vía crédito unilateral §200 ITO.',
      },
      treatySource: 'https://www.gov.il/en/departments/dynamiccollectors/international_agreements',
      totalizationIL: false,
      totalizationNote: {
        he: 'אין אמנת ביטוח-סוציאלי עם ישראל. אינדונזיה מטילה BPJS Ketenagakerjaan + BPJS Kesehatan על עובדים מקומיים (~6-7% מעסיק + ~3-4% עובד); תושבי-מס אינדונזים עלולים לחוב כפל-תשלום מול ביטוח לאומי ישראלי.',
        en: 'No social-security agreement with Israel. Indonesia imposes BPJS Ketenagakerjaan + BPJS Kesehatan on local employment (~6-7% employer + ~3-4% employee); Indonesian tax residents may owe double contributions vs IL Bituach Leumi.',
        pt: 'Sem acordo SS com Israel. BPJS ~6-7% empregador + ~3-4% empregado; risco de dupla contribuição.',
        es: 'Sin convenio SS con Israel. BPJS ~6-7% empleador + ~3-4% empleado; riesgo de doble contribución.',
      },
      totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
      peRisk: 'high',
      peNote: {
        he: 'רשות המסים האינדונזית (DJP) הציגה בשנים האחרונות עמדה אגרסיבית כלפי מוסד-קבע של חברות זרות, במיוחד בעידן הדיגיטלי (חוק 7/2021 על PE-דיגיטלי). עובד ישראלי שמבצע פונקציות-ליבה מאינדונזיה עלול בקלות ליצור PE למעסיק הישראלי — חיוב במס חברות 22% + 20% Branch Profit Tax. בהיעדר אמנה, אין שובר-שוויון או הגנת OECD MTC. סיכון מוגבר משמעותית בהשוואה למדינות אמנה.',
        en: 'Indonesia\'s tax authority (DJP) has in recent years taken an aggressive stance on PE for foreign companies, especially in the digital era (Law 7/2021 on digital PE). An Israeli employee performing core functions from Indonesia can easily create PE for the Israeli employer — triggering 22% CIT + 20% Branch Profit Tax. With no treaty, there is no tie-breaker or OECD MTC shield. Risk is materially higher than in treaty countries.',
        pt: 'DJP agressiva quanto a EP, especialmente PE digital (Lei 7/2021). Funcionário em funções-núcleo cria EP facilmente. Sem tratado, sem proteção OCDE. IRC 22% + 20% BPT.',
        es: 'DJP agresiva con EP, especialmente EP digital (Ley 7/2021). Empleado en funciones-núcleo crea EP fácilmente. Sin tratado, sin protección OCDE. IS 22% + 20% BPT.',
      },
      peSource: 'https://taxsummaries.pwc.com/indonesia/corporate/corporate-residence',
      nomadVisa: {
        he: '⚠️ מורכב לישראלים. אינדונזיה הציגה ב-2024 את ויזת ה-E33G ("Remote Worker KITAS", שנה, הכנסה ≥$60K/שנה + מעסיק זר). אבל בהיעדר יחסים דיפלומטיים, ישראלים חייבים להגיש בקשה בשגרירות אינדונזיה במדינה שלישית (לרוב בנגקוק/סינגפור) ולא ניתן להגיש מקוון או דרך VFS ישראל. ויזת ה-B211A "Visit Visa" קצרת-טווח דורשת לרוב חסות (sponsor) אינדונזי. אל תניח שתוכל פשוט לטוס ולקבל ויזה בנמל התעופה — זה כמעט תמיד לא יעבוד.',
        en: 'Complicated for Israelis. Indonesia introduced the E33G "Remote Worker KITAS" in 2024 (1 year, income ≥$60K/yr + foreign employer). But because there are no diplomatic relations, Israeli applicants must apply at an Indonesian embassy in a THIRD country (typically Bangkok or Singapore) — they cannot apply online or through any Israeli channel. The short-stay B211A "Visit Visa" typically requires an Indonesian sponsor. Do NOT assume you can fly in and obtain a visa on arrival — that usually will not work.',
        pt: 'Complicado para israelitas. E33G "Remote Worker KITAS" (2024) existe, mas sem relações diplomáticas, israelitas têm de pedir numa embaixada indonésia num país terceiro (Bangkok/Singapura). B211A requer patrocinador indonésio. NÃO assumir visto na chegada.',
        es: 'Complicado para israelíes. E33G "Remote Worker KITAS" (2024) existe, pero sin relaciones diplomáticas, los israelíes deben solicitar en una embajada indonesia en un país tercero (Bangkok/Singapur). B211A requiere patrocinador indonesio. NO asumir visado a la llegada.',
      },
      nomadVisaSource: 'https://www.imigrasi.go.id/',
      verifiedDate: '2026-05',
    },

    SG: {
      flag: '🇸🇬',
      name: { he: 'סינגפור', en: 'Singapore', pt: 'Singapura', es: 'Singapur' },
      taxResidentDays: 183,
      taxResidentNote: {
        he: 'מעל 183 ימים בשנה קלנדרית (כלל ברור — IRAS לא מפעיל מבחני "מרכז חיים" משניים אם הסף הכמותי לא נחצה). יש גם "כלל 3-שנים" לעובדים בחוזים רב-שנתיים. שיעורי מס פרוגרסיביים 0-24% לתושבים; לא-תושב חייב 15% או שיעור פרוגרסיבי על הכנסת עבודה — הגבוה מבין השניים.',
        en: 'Over 183 days in a calendar year (clean rule — IRAS does not apply secondary "centre of life" tests if the quantitative threshold is not met). Also a "3-year administrative concession" for multi-year employment contracts. Progressive rates 0-24% for residents; non-residents pay the higher of 15% or progressive on employment income.',
        pt: 'Mais de 183 dias por ano civil (regra clara). Concessão de 3 anos para contratos plurianuais. Taxas progressivas 0-24% para residentes; não-residentes: maior entre 15% e progressiva.',
        es: 'Más de 183 días por año natural (regla clara). Concesión de 3 años para contratos plurianuales. Tasas progresivas 0-24% para residentes; no-residentes: mayor entre 15% y progresiva.',
      },
      taxResidentSource: 'https://taxsummaries.pwc.com/singapore/individual/residence',
      treatyWithIsrael: true,
      treatyYear: 1971,
      treatyNote: {
        he: 'אמנה חתומה 19/04/1971 — אחת מהאמנות הוותיקות ביותר של ישראל. בתוקף עד היום. שובר-שוויון ל-Dual Residents בסעיף 4 (בית-קבע → מרכז אינטרסים → שהייה רגילה → אזרחות). סינגפור חתמה על MLI (2018) — חלק מהוראות האמנה מעודכנות.',
        en: 'Signed 19 Apr 1971 — one of Israel\'s oldest treaties, still in force. Article 4 tie-breaker for dual residents (permanent home → vital interests → habitual abode → nationality). Singapore signed MLI (2018) — some treaty provisions updated by MLI.',
        pt: 'Assinada em 19/04/1971 — uma das mais antigas de Israel, ainda em vigor. Artigo 4. Singapura assinou MLI (2018).',
        es: 'Firmada el 19/04/1971 — una de las más antiguas de Israel, aún en vigor. Artículo 4. Singapur firmó MLI (2018).',
      },
      treatySource: 'https://www.iras.gov.sg/taxes/international-tax/list-of-dtas-limited-dtas-and-eoi-arrangements',
      totalizationIL: false,
      totalizationNote: {
        he: 'אין אמנת ביטוח-סוציאלי עם ישראל. סינגפור משתמשת ב-CPF (Central Provident Fund) — אבל CPF חל רק על אזרחי סינגפור ו-PR; אקספטים זרים בויזת Employment Pass לא תורמים ל-CPF (חשיפת כפל-תשלום מינימלית).',
        en: 'No social-security agreement with Israel. Singapore uses CPF (Central Provident Fund) — but CPF applies only to Singapore citizens and PRs; foreign expats on Employment Pass do not contribute to CPF (minimal double-payment exposure).',
        pt: 'Sem acordo SS com Israel. CPF aplica-se apenas a cidadãos/PR; expatriados em Employment Pass não contribuem (exposição mínima).',
        es: 'Sin convenio SS con Israel. CPF aplica solo a ciudadanos/PR; expatriados con Employment Pass no contribuyen (exposición mínima).',
      },
      totalizationSource: 'https://www.btl.gov.il/English%20Homepage/Benefits/International%20Conventions%20on%20Social%20Security/Pages/Existingconventions.aspx',
      peRisk: 'medium',
      peNote: {
        he: 'IRAS מאמצת באופן רחב את עקרונות OECD MTC. בית-בעת בסינגפור לבדו לא יוצר PE; אבל אם העובד מבצע פונקציות-ליבה ו"מקדם עסקים בשוק הסינגפורי" (לפי הנחיית IRAS על Employment Income), עלול להיות חיוב במס חברות סינגפורי 17% למעסיק הישראלי. סינגפור עסקית-ידידותית אך IRAS אוכפת באכיפה ממוקדת. סיכון נמוך עד בינוני בפועל.',
        en: 'IRAS broadly follows OECD MTC principles. A home office alone in Singapore does not create PE; but if the employee performs core functions and "carries on business in the Singapore market" (per IRAS guidance on Employment Income), 17% Singapore CIT could apply to the Israeli employer. Singapore is business-friendly but IRAS does enforce PE in targeted cases. Low-to-medium risk in practice.',
        pt: 'IRAS segue OCDE MTC. Home office isolado não cria EP; mas funções-núcleo + atividade no mercado SG podem aplicar IRC 17%. Risco baixo a médio.',
        es: 'IRAS sigue OCDE MTC. Home office aislado no crea EP; pero funciones-núcleo + actividad en mercado SG pueden aplicar IS 17%. Riesgo bajo a medio.',
      },
      peSource: 'https://www.iras.gov.sg/taxes/corporate-income-tax/income-deductions-for-companies/taxable-non-taxable-income',
      nomadVisa: {
        he: 'אין DNV ייעודי בסינגפור. הציר העיקרי לעובדי טכנולוגיה ועצמאים בכירים: Employment Pass (שכר ≥SGD 5,600/חודש, ~$4,100), או Tech.Pass לטאלנטים בכירים (~SGD 22,500/חודש). Overseas Networks & Expertise Pass (ONE Pass, 2023) למרוויחים גבוהים במיוחד. ויזת תייר 90 יום לא מתירה תעסוקה מקומית — אך עבודה מרחוק למעסיק זר נסבלת באופן כללי במהלך שהייה תיירותית קצרה.',
        en: 'No dedicated DNV in Singapore. Main routes for tech workers and senior freelancers: Employment Pass (salary ≥SGD 5,600/mo, ~$4,100), or Tech.Pass for top talent (~SGD 22,500/mo). Overseas Networks & Expertise Pass (ONE Pass, 2023) for ultra-high earners. The 90-day tourist entry does not permit local employment — but remote work for a foreign employer during short tourist stays is generally tolerated.',
        pt: 'Sem DNV em Singapura. Rotas: Employment Pass (SGD 5.600/mês), Tech.Pass (SGD 22.500), ONE Pass (2023). Tourist 90 dias não permite emprego local; remote para empregador estrangeiro tolerado em estadias curtas.',
        es: 'Sin DNV en Singapur. Rutas: Employment Pass (SGD 5.600/mes), Tech.Pass (SGD 22.500), ONE Pass (2023). Tourist 90 días no permite empleo local; remoto para empleador extranjero tolerado en estancias cortas.',
      },
      nomadVisaSource: 'https://www.mom.gov.sg/passes-and-permits/employment-pass',
      verifiedDate: '2026-05',
    },
  },

  supplements: {
    BR: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'ברזיל — 90 ימים פטור-ויזה לאזרחי ישראל, ניתן להאריך 90 ימים נוספים בלשכת Polícia Federal (סה״כ עד 180 ימים בכל חלון של 12 חודשים). ביקור על ויזת תייר לא מתיר עבודה עבור מעסיק ברזילאי; עבודה מרחוק למעסיק זר אינה מוסדרת מפורשות אך בדרך כלל נסבלת לתקופות קצרות.',
        en: 'Brazil — 90 days visa-free for Israeli citizens, extendable by another 90 days at the Polícia Federal (up to 180 total per rolling 12 months). Tourist entry does not permit work for a Brazilian employer; remote work for a foreign employer is not explicitly regulated but generally tolerated during short stays.',
        pt: 'Brasil — 90 dias sem visto para israelitas; renovável 90 dias na Polícia Federal (até 180 em 12 meses). Turismo não permite trabalho para empregador brasileiro; remoto para empregador estrangeiro normalmente tolerado.',
        es: 'Brasil — 90 días sin visado para israelíes; renovable 90 días en Polícia Federal (hasta 180 en 12 meses). Turismo no permite trabajar para empleador brasileño; remoto para empleador extranjero suele tolerarse.',
      },
      touristVisaSource: 'https://www.gov.br/mre/pt-br/consulado-telaviv/servicos/vistos',
      dayRule: {
        he: 'יום ההגעה ויום העזיבה נספרים שניהם. ספירה לפי 12 חודשים נעים (לא שנה קלנדרית). Receita Federal משתמשת ברישומי Polícia Federal (Sistema Migratório) כראיה. נוכחות חלקית = יום מלא.',
        en: 'Both arrival and departure days count. Calculation is rolling 12 months (not calendar year). Receita Federal relies on Polícia Federal migration records as evidence. Partial presence = full day.',
        pt: 'Chegada e partida ambos contam. Cálculo em 12 meses móveis (não ano civil). Receita Federal usa registos da Polícia Federal.',
        es: 'Llegada y salida ambos cuentan. Cálculo en 12 meses móviles (no año natural). Receita Federal usa registros de Polícia Federal.',
      },
      dayRuleSource: 'https://taxsummaries.pwc.com/brazil/individual/residence',
    },
    ID: {
      touristVisaDays: 30,
      touristVisaNote: {
        he: '⚠️ קריטי לישראלים: אינדונזיה אינה מנהלת יחסים דיפלומטיים עם ישראל. תכנית פטור הויזה ל-30 ימים ותכנית ה-Visa on Arrival (VoA) הסטנדרטית אינן זמינות בפועל לאזרחי ישראל. ישראלים שמגיעים על דרכון ישראלי לבדו לרוב מקבלים סירוב כניסה. המסלולים הריאליים: (1) ויזת B1/B211A מבעוד מועד דרך שגרירות אינדונזית במדינה שלישית (בנגקוק, סינגפור, אבו דאבי) עם סוכן/חסות מקומית, או (2) דרכון נוסף (דו-אזרחות). לא לסמוך על "VoA בהגעה".',
        en: '⚠️ Critical for Israelis: Indonesia has no diplomatic relations with Israel. The standard 30-day visa-free scheme and the standard Visa on Arrival (VoA) are NOT practically available to Israeli passport holders — arriving on an Israeli passport alone typically results in refusal of entry. Realistic routes: (1) B1/B211A visa obtained IN ADVANCE via an Indonesian embassy in a THIRD country (Bangkok, Singapore, Abu Dhabi) with a local sponsor/agent, or (2) a second passport (dual citizenship). Do NOT rely on "VoA on arrival".',
        pt: '⚠️ Crítico para israelitas: Indonésia não tem relações diplomáticas com Israel. Esquema de 30 dias sem visto e VoA NÃO disponíveis na prática para portadores de passaporte israelita. Rotas reais: (1) B1/B211A obtido antecipadamente via embaixada indonésia num país terceiro (Bangkok/Singapura/Abu Dhabi), ou (2) segundo passaporte. NÃO contar com VoA.',
        es: '⚠️ Crítico para israelíes: Indonesia no tiene relaciones diplomáticas con Israel. El esquema de 30 días sin visado y la VoA NO están disponibles en la práctica para titulares de pasaporte israelí. Rutas reales: (1) B1/B211A obtenida con antelación vía embajada indonesia en un tercer país (Bangkok/Singapur/Abu Dabi), o (2) segundo pasaporte. NO confiar en VoA.',
      },
      touristVisaSource: 'https://www.imigrasi.go.id/',
      dayRule: {
        he: 'יום ההגעה ויום העזיבה נספרים שניהם כיום מלא. ספירה לפי 12 חודשים נעים (לא שנה קלנדרית). DJP יכולה לקבוע תושבות גם בפחות מ-183 ימים אם הייתה "כוונה להישאר" (UU PPh §2 ayat 3) — חוזה שכירות, מצב משפחתי, נכסים מקומיים מהווים אינדיקציות.',
        en: 'Both arrival and departure days count as full days. Calculation is rolling 12 months (not calendar year). DJP can deem residency under 183 days if there was "intent to reside" (UU PPh §2 ayat 3) — long-term lease, family arrangements, local assets are all indicators.',
        pt: 'Chegada e partida ambos contam. 12 meses móveis. DJP pode considerar residência mesmo abaixo de 183 dias se houver "intenção de residir" (arrendamento, família, ativos locais).',
        es: 'Llegada y salida ambos cuentan. 12 meses móviles. DJP puede considerar residencia incluso bajo 183 días si hay "intención de residir" (arrendamiento, familia, activos locales).',
      },
      dayRuleSource: 'https://taxsummaries.pwc.com/indonesia/individual/residence',
    },
    SG: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'סינגפור — 90 ימים פטור-ויזה לאזרחי ישראל בכל כניסה (אחד הסעיפים הנדיבים באסיה). יש להגיש SG Arrival Card אונליין לפני הטיסה. עבודה למעסיק סינגפורי אסורה תחת מעמד תייר; עבודה מרחוק למעסיק זר נסבלת באופן כללי לשהיות קצרות.',
        en: 'Singapore — 90 days visa-free for Israeli citizens per entry (one of the more generous regimes in Asia). SG Arrival Card must be submitted online before flying. Working for a Singapore employer is prohibited on tourist status; remote work for a foreign employer is generally tolerated for short stays.',
        pt: 'Singapura — 90 dias sem visto por entrada para israelitas. SG Arrival Card online obrigatório. Não permite trabalho para empregador SG; remoto para empregador estrangeiro tolerado em estadias curtas.',
        es: 'Singapur — 90 días sin visado por entrada para israelíes. SG Arrival Card en línea obligatorio. No permite trabajar para empleador SG; remoto para empleador extranjero tolerado en estancias cortas.',
      },
      touristVisaSource: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements',
      dayRule: {
        he: 'יום ההגעה ויום העזיבה נספרים שניהם כיום מלא (גם נוכחות חלקית). חישוב לפי שנה קלנדרית (1/1–31/12). IRAS משתמש ברישומי ICA כראיה אובייקטיבית — אין סיכון של "מבחן מרכז חיים" אם הסף הכמותי לא נחצה.',
        en: 'Both arrival and departure days count (partial presence too). Calendar-year basis (1 Jan – 31 Dec). IRAS uses ICA records as objective evidence — no "centre of life" override risk if the quantitative threshold is not crossed.',
        pt: 'Chegada e partida ambos contam. Base ano civil. IRAS usa registos ICA — sem teste de "centro de vida" se limiar não for atravessado.',
        es: 'Llegada y salida ambos cuentan. Base año natural. IRAS usa registros ICA — sin prueba de "centro de vida" si no se cruza el umbral.',
      },
      dayRuleSource: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/working-out-my-tax-residency',
    },
  },
};

// verifiedDate: '2026-05'
