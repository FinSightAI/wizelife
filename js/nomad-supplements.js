/**
 * nomad-supplements.js — Companion data for digital-nomad.html.
 *
 * Audience: Israeli passport holders working remotely. Adds three things
 * nomad-data.js does NOT cover:
 *
 *   byCountry[X].touristVisaDays    — visa-free / tourist allowance for IL passport
 *   byCountry[X].touristVisaNote    — "in any 180-day window" vs "per entry" etc.
 *   byCountry[X].dayRule            — what counts as a "day" for residency math
 *   mitigations[]                   — generic PE-mitigation options (low → high effort)
 *   faq[]                           — 8 Israeli-nomad questions, all 4 languages
 *   scenarios[]                     — 3 common patterns (preset starting points)
 *
 * Sources: official MFA visa pages, IATA Travel Centre, country tax-authority
 * pages, PwC Worldwide Tax Summaries, Deel / Remote.com EOR pricing pages,
 * Israel Tax Authority forms portal (form 1348 for residency-cessation).
 *
 * NOT legal/tax advice. Verify with a CPA before relocating >6 months.
 */
window.NOMAD_SUPPLEMENTS = {
  byCountry: {
    PT: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180 ימים, משותף עם כל מדינות Schengen. ויזה לא נדרשת בכניסה לישראלים.',
        en: 'Schengen Area — 90 days in any rolling 180-day window, shared across ALL Schengen countries. No visa required for Israelis on entry.',
        pt: 'Espaço Schengen — 90 dias em qualquer janela móvel de 180 dias, partilhado com TODOS os países Schengen. Sem visto para israelitas.',
        es: 'Espacio Schengen — 90 días en cualquier ventana móvil de 180 días, compartidos con TODOS los países Schengen. Sin visado para israelíes.',
      },
      touristVisaSource: 'https://www.schengenvisainfo.com/who-needs-schengen-visa/',
    },
    ES: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180 ימים, משותף עם פורטוגל, איטליה, יוון, מלטה, גרמניה וכל שאר מדינות Schengen. ETIAS (אישור-מסע אלקטרוני) נדרש החל מ-2026 (תאריך מדויק בעדכון אחרון).',
        en: 'Schengen Area — 90 days in any rolling 180-day window, shared with PT, IT, GR, MT, DE and all other Schengen states. ETIAS travel-authorisation required from 2026 (exact rollout date pending).',
        pt: 'Schengen — 90 dias em janela móvel de 180, partilhados com PT/IT/GR/MT/DE. ETIAS exigido a partir de 2026.',
        es: 'Schengen — 90 días en ventana móvil de 180, compartidos con PT/IT/GR/MT/DE. ETIAS desde 2026.',
      },
      touristVisaSource: 'https://www.exteriores.gob.es/Consulados/telaviv/en/ServiciosConsulares/Paginas/index.aspx',
    },
    IT: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180. שעון ה-180 משותף עם כל מדינות Schengen — יום ב-PT "אוכל" מהמכסה האיטלקית.',
        en: 'Schengen Area — 90 days in any rolling 180-day window. The 180 clock is shared with all Schengen states — a day in PT eats your Italian allowance.',
        pt: 'Schengen — 90/180, contagem partilhada com todos os Schengen.',
        es: 'Schengen — 90/180, contador compartido con todos los Schengen.',
      },
      touristVisaSource: 'https://vistoperitalia.esteri.it/',
    },
    GR: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180. הכניסה מנמלי תעופה ראשיים (ATH/SKG) מתועדת אלקטרונית — חישוב המכסה אוטומטי.',
        en: 'Schengen Area — 90 days in any rolling 180-day window. Entries via main airports (ATH/SKG) are electronically logged — allowance is auto-tracked.',
        pt: 'Schengen — 90/180. Entradas registadas eletronicamente.',
        es: 'Schengen — 90/180. Entradas registradas electrónicamente.',
      },
      touristVisaSource: 'https://www.mfa.gr/missionsabroad/en/israel-en/services-en/visa-information.html',
    },
    CY: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'קפריסין אינה ב-Schengen נכון ל-2026 — 90 ימים בכל חלון נע של 180, אבל נספרים בנפרד מ-Schengen. הצטרפות ל-Schengen מתוכננת אך טרם הושלמה.',
        en: 'Cyprus is NOT in Schengen as of 2026 — 90 days in any rolling 180-day window, but the count is SEPARATE from Schengen. Schengen accession planned but not yet completed.',
        pt: 'Chipre NÃO está em Schengen (2026) — 90/180 mas em contagem separada.',
        es: 'Chipre NO está en Schengen (2026) — 90/180 pero conteo separado.',
      },
      touristVisaSource: 'https://www.gov.cy/mfa/en/visa-information/',
    },
    MT: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180. שעון ה-180 משותף עם כל מדינות Schengen.',
        en: 'Schengen Area — 90 days in any rolling 180-day window. The 180-day clock is shared with all Schengen states.',
        pt: 'Schengen — 90/180 partilhado.',
        es: 'Schengen — 90/180 compartido.',
      },
      touristVisaSource: 'https://identita.gov.mt/central-visa-unit-main-page/',
    },
    GE: {
      touristVisaDays: 365,
      touristVisaNote: {
        he: 'גאורגיה — 365 ימים (שנה מלאה!) ללא ויזה לאזרחי ישראל, בכל כניסה. ניתן לצאת ולחזור — השעון מתאפס בכל כניסה.',
        en: 'Georgia — 365 days (a full year!) visa-free for Israeli citizens, PER ENTRY. You can exit and re-enter — the clock resets on each entry.',
        pt: 'Geórgia — 365 dias sem visto por entrada; relógio reinicia a cada entrada.',
        es: 'Georgia — 365 días sin visado por entrada; el reloj se reinicia con cada entrada.',
      },
      touristVisaSource: 'https://geoconsul.gov.ge/en/entering-georgia-visa',
    },
    AE: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'איחוד האמירויות — 90 ימים בכל תקופה של 180 ימים, ויזה-בהגעה לאזרחי ישראל (מאז נורמליזציה 2020). ניתן להאריך 30 ימים פעמיים בתשלום.',
        en: 'UAE — 90 days within any 180-day period, visa-on-arrival for Israeli citizens since the 2020 normalisation. Extendable twice by 30 days for a fee.',
        pt: 'EAU — 90 em 180 dias, visto na chegada para israelitas desde 2020.',
        es: 'EAU — 90 en 180 días, visado a la llegada para israelíes desde 2020.',
      },
      touristVisaSource: 'https://u.ae/en/information-and-services/visa-and-emirates-id/all-you-need-to-know-about-visas',
    },
    TH: {
      touristVisaDays: 60,
      touristVisaNote: {
        he: 'תאילנד — 60 ימים פטור-ויזה לכניסה לאזרחי ישראל (עודכן יולי 2024, מ-30 ל-60). ניתן להאריך 30 ימים נוספים במשרד ההגירה (1,900 บาท). ספירה לפי כניסה.',
        en: 'Thailand — 60 days visa-exempt per entry for Israelis (upgraded Jul 2024 from 30 to 60). Extendable 30 more days at Immigration (฿1,900). Counted per entry.',
        pt: 'Tailândia — 60 dias sem visto por entrada (desde julho 2024).',
        es: 'Tailandia — 60 días sin visado por entrada (desde julio 2024).',
      },
      touristVisaSource: 'https://www.mfa.go.th/en/page/visa-exemption',
    },
    US: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'ארה״ב — 90 ימים תחת Visa Waiver Program (ESTA), ישראל הצטרפה ל-VWP באוקטובר 2023. אסור לעבוד למעסיק אמריקאי תחת ESTA. אכיפת CBP אגרסיבית — שאלות "תכלית הביקור" בכניסה.',
        en: 'US — 90 days under Visa Waiver Program (ESTA); Israel joined VWP October 2023. Work for a US employer is NOT allowed under ESTA. CBP enforcement is aggressive — expect "purpose of visit" questions on entry.',
        pt: 'EUA — 90 dias via ESTA (Israel no VWP desde out/2023). Não permite trabalho para empregador americano.',
        es: 'EE.UU. — 90 días vía ESTA (Israel en VWP desde oct/2023). No permite trabajar para empleador estadounidense.',
      },
      touristVisaSource: 'https://esta.cbp.dhs.gov/',
    },
    GB: {
      touristVisaDays: 180,
      touristVisaNote: {
        he: 'בריטניה — 6 חודשים בכל כניסה תחת Standard Visitor. הבהרת UKVI 31/01/2024: עבודה מרחוק למעסיק זר מותרת אם זו לא המטרה העיקרית של הביקור. נדרש ETA (Electronic Travel Authorisation, £16) מאז 02/04/2025 לישראלים.',
        en: 'UK — 6 months per entry under Standard Visitor. UKVI clarified 31 Jan 2024: remote work for a foreign employer is allowed if it is not the primary purpose of visit. ETA (Electronic Travel Authorisation, £16) required from 2 Apr 2025 for Israelis.',
        pt: 'Reino Unido — 6 meses por entrada; ETA exigido desde 2/4/2025.',
        es: 'Reino Unido — 6 meses por entrada; ETA exigido desde el 2/4/2025.',
      },
      touristVisaSource: 'https://www.gov.uk/standard-visitor',
    },
    DE: {
      touristVisaDays: 90,
      touristVisaNote: {
        he: 'אזור Schengen — 90 ימים בכל חלון נע של 180. שעון ה-180 משותף עם כל מדינות Schengen. גרמניה מקפידה במיוחד על "Wohnsitz" — שכ"ד דירה ל-3+ חודשים מסכן את הסטטוס התיירותי.',
        en: 'Schengen Area — 90 days in any rolling 180-day window, shared with all Schengen states. Germany is particularly strict on "Wohnsitz" — a 3+ month lease can jeopardise tourist status and trigger tax residency.',
        pt: 'Schengen — 90/180 partilhado. Alemanha rigorosa quanto a Wohnsitz.',
        es: 'Schengen — 90/180 compartido. Alemania estricta con Wohnsitz.',
      },
      touristVisaSource: 'https://www.auswaertiges-amt.de/en/visa-service/-/231148',
    },
  },

  dayRule: {
    PT: {
      he: 'יום ההגעה ויום העזיבה נספרים שניהם כיום מלא. גם נוכחות חלקית (אפילו 4 שעות במעבר ב-Lisbon) נספרת. חישוב לפי שנה קלנדרית.',
      en: 'Both arrival and departure days count as full days. Any partial presence (even a 4-hour layover in Lisbon) counts. Calendar-year basis.',
      pt: 'Dia de chegada e partida contam ambos. Presença parcial conta. Base ano civil.',
      es: 'Día de llegada y de salida cuentan ambos. Presencia parcial cuenta. Base año natural.',
    },
    ES: {
      he: 'יום ההגעה נספר; ימי חופשה רגילים בחו״ל ("ausencias esporádicas") נספרים כימי-שהייה אלא אם תוכיח תושבות במדינה אחרת. חישוב שנה קלנדרית.',
      en: 'Arrival day counts; ordinary trips abroad ("ausencias esporádicas") still count as Spanish days unless you prove tax residency elsewhere. Calendar-year basis.',
      pt: 'Dia de chegada conta; ausências esporádicas ainda contam como dias em Espanha.',
      es: 'Día de llegada cuenta; ausencias esporádicas se cuentan como días en España.',
    },
    IT: {
      he: 'מאז 2024 (חוק International Tax Reform): גם חלקי-יום נספרים ("anche frazioni di giorno"). יום ההגעה ויום העזיבה — שניהם נספרים. חישוב שנה קלנדרית.',
      en: 'Since 2024 (International Tax Reform): even fractions of a day count ("anche frazioni di giorno"). Both arrival and departure count. Calendar-year basis.',
      pt: 'Desde 2024: frações de dia contam. Chegada e partida ambos contam.',
      es: 'Desde 2024: fracciones de día cuentan. Llegada y salida ambos cuentan.',
    },
    GR: {
      he: 'יום ההגעה נספר; חישוב לפי 12 חודשים נעים (לא שנה קלנדרית) — חריג בין מדינות 183-יום. נוכחות חלקית נספרת כיום.',
      en: 'Arrival day counts; calculation is rolling 12 months (not calendar year) — exceptional among 183-day countries. Partial presence counts as a day.',
      pt: 'Dia de chegada conta; cálculo em 12 meses móveis (não ano civil).',
      es: 'Día de llegada cuenta; cálculo en 12 meses móviles (no año natural).',
    },
    CY: {
      he: 'יום ההגעה נספר ככניסה; יום עזיבה נספר ככניסה אם יצאת באותו יום (אך לא יום שלם). חישוב שנה קלנדרית (1/1–31/12).',
      en: 'Arrival day counts as entry; departure day also counts as a "day in" if you left on the same arrival day. Calendar-year basis (1 Jan – 31 Dec).',
      pt: 'Dia de chegada conta; cálculo ano civil.',
      es: 'Día de llegada cuenta; cálculo año natural.',
    },
    MT: {
      he: 'כל יום של נוכחות פיזית במלטה (כולל חלקיים, כולל הגעה ועזיבה) נחשב יום. חישוב שנה קלנדרית.',
      en: 'Any day of physical presence in Malta (including partial, including both arrival and departure) counts as a day. Calendar-year basis.',
      pt: 'Qualquer presença física conta; base ano civil.',
      es: 'Cualquier presencia física cuenta; base año natural.',
    },
    GE: {
      he: 'יום ההגעה נספר; חישוב לפי 12 חודשים נעים (לא שנה קלנדרית). יציאה ל-3+ שעות ביום נחשבת ליום נוכחות באותו יום. הסטמפ בגבול הוא הראיה.',
      en: 'Arrival day counts; calculation is rolling 12 months. Even brief exit (3+ hours within a day) still counts as a presence-day. Border stamp is the evidence.',
      pt: 'Dia de chegada conta; 12 meses móveis.',
      es: 'Día de llegada cuenta; 12 meses móviles.',
    },
    AE: {
      he: 'יום ההגעה ויום העזיבה נספרים שניהם כימים מלאים. חישוב לפי 12 חודשים נעים (לפי החלטת קבינט 85/2022). ראיות: חותמת דרכון + רישומי ICA.',
      en: 'Both arrival and departure days count as full days. Calculation is rolling 12 months (per Cabinet Decision 85/2022). Evidence: passport stamp + ICA records.',
      pt: 'Chegada e partida ambos contam; 12 meses móveis.',
      es: 'Llegada y salida ambos cuentan; 12 meses móviles.',
    },
    TH: {
      he: 'כל יום שתאריך הלוח התאילנדי כולל נוכחות פיזית — נספר. נוכחות חלקית = יום מלא. הסף הוא 180 (לא 183) בשנה קלנדרית.',
      en: 'Any calendar day on which you are physically present in Thailand counts. Partial presence = full day. Threshold is 180 (not 183) in a calendar year.',
      pt: 'Qualquer presença diária conta; limiar 180 dias (ano civil).',
      es: 'Cualquier presencia diaria cuenta; umbral 180 días (año natural).',
    },
    US: {
      he: 'Substantial Presence Test: 31 ימים בשנה הנוכחית + סה״כ משוקלל של 183 ב-3 שנים (100% השנה + 1/3 שנה קודמת + 1/6 שלפניה). יום עם נוכחות ב-23:59 נספר. פטור: סטודנטים, עובדי ממשל, "Closer Connection".',
      en: 'Substantial Presence Test: 31 days in the current year PLUS weighted total of 183 over 3 years (100% current + 1/3 prior + 1/6 year-before-prior). A day with presence at 23:59 counts. Exemptions: students, gov\'t workers, "Closer Connection" exception.',
      pt: 'SPT: 31 dias atuais + 183 ponderados em 3 anos.',
      es: 'SPT: 31 días actuales + 183 ponderados en 3 años.',
    },
    GB: {
      he: 'Statutory Residence Test: יום נספר רק אם נוכחת בבריטניה בחצות (00:00). חריג: כלל ה-Transit (העברה באותו יום ללא יציאה מ-airside) לא נספר. SRT הוא חישוב שנת מס בריטית (6/4 עד 5/4).',
      en: 'Statutory Residence Test: a day counts only if you are in the UK at midnight (00:00). Exception: Transit-day rule (same-day transit without leaving airside) does not count. SRT uses the UK tax year (6 Apr – 5 Apr).',
      pt: 'SRT: dia conta apenas se presente à meia-noite. Ano fiscal 6/4 – 5/4.',
      es: 'SRT: día cuenta solo si presente a medianoche. Año fiscal 6/4 – 5/4.',
    },
    DE: {
      he: 'נוכחות פיזית כלשהי ביום מספיקה כדי לספור אותו; שעון ה-183 הוא שנה קלנדרית. אבל הסיכון העיקרי בגרמניה הוא Wohnsitz: שכירת דירה לטווח שנתי יוצרת תושבות גם אם הייתה <30 ימים בפועל בשנה.',
      en: 'Any physical presence on a day suffices to count it; the 183 clock is calendar-year. But the main German risk is Wohnsitz: holding a year-round dwelling can create residency even with <30 actual days in country.',
      pt: 'Qualquer presença diária conta; risco principal é Wohnsitz (lar permanente).',
      es: 'Cualquier presencia diaria cuenta; el riesgo principal es Wohnsitz.',
    },
  },
  dayRuleSource: 'https://taxsummaries.pwc.com/',

  mitigations: [
    {
      level: 'low',
      title: {
        he: '1. מכתב אישור מהמעסיק',
        en: '1. Written approval letter from employer',
        pt: '1. Carta de aprovação do empregador',
        es: '1. Carta de aprobación del empleador',
      },
      body: {
        he: 'מכתב פורמלי מהמעסיק הישראלי המאשר עבודה מרחוק ממדינה X לתקופה מוגבלת. לא מבטל סיכון PE אך מתעד את הכוונה — שימושי בביקורת מס. עלות: 0.',
        en: 'Formal letter from the Israeli employer acknowledging remote work from country X for a limited period. Does NOT eliminate PE risk but evidences intent — useful in a tax audit. Cost: $0.',
        pt: 'Carta formal do empregador israelita reconhecendo trabalho remoto no país X por tempo limitado. Não elimina risco de EP mas documenta intenção. Custo: 0.',
        es: 'Carta formal del empleador israelí reconociendo trabajo remoto desde el país X por tiempo limitado. NO elimina riesgo de EP pero documenta intención. Coste: 0.',
      },
    },
    {
      level: 'medium',
      title: {
        he: '2. הסבה למעמד עצמאי/קבלן',
        en: '2. Contractor / freelance conversion',
        pt: '2. Conversão para contratante independente',
        es: '2. Conversión a contratista independiente',
      },
      body: {
        he: 'המרת הסטטוס מעובד לקבלן עצמאי שמוציא חשבונית לחברה הישראלית. מסלק PE-תעסוקה אבל יוצר סיכונים אחרים: סיווג-שגוי (misclassification) במדינת היעד, אובדן תנאים סוציאליים, אובדן זכויות פיצויים. עלות: שינוי חוזה + ייעוץ משפטי (~$1-3K).',
        en: 'Convert employee to independent contractor invoicing the Israeli company. Eliminates employment-PE but creates other risks: worker-misclassification in destination country, loss of social benefits, loss of severance rights. Cost: contract change + legal advice (~$1-3K).',
        pt: 'Converter de empregado para prestador de serviços que fatura à empresa israelita. Elimina EP-emprego mas cria riscos: classificação errada local, perda de benefícios. Custo: ~$1-3K.',
        es: 'Convertir empleado a contratista independiente que factura a la empresa israelí. Elimina EP-empleo pero crea otros riesgos: clasificación errónea local, pérdida de beneficios. Coste: ~$1-3K.',
      },
    },
    {
      level: 'high',
      title: {
        he: '3. Employer of Record (EOR)',
        en: '3. Employer of Record (EOR)',
        pt: '3. Employer of Record (EOR)',
        es: '3. Employer of Record (EOR)',
      },
      body: {
        he: 'ספק EOR (Deel, Remote.com, Velocity Global, Oyster) משמש כמעסיק הרשום במדינת היעד מטעם החברה הישראלית. מבטל לחלוטין PE-תעסוקה, מטפל בשכר/מסים/SS מקומיים, בעלות חודשית של $500-700/עובד + מס מקומי מלא. הסטנדרט הנפוץ לעובד יחיד בחו״ל ל-1-3 שנים.',
        en: 'EOR provider (Deel, Remote.com, Velocity Global, Oyster) acts as the registered local employer on behalf of the Israeli company. Eliminates employment-PE entirely, handles local payroll/tax/SS, costs $500-700/mo per worker + full local tax burden. The standard solution for a single worker abroad for 1-3 years.',
        pt: 'EOR (Deel, Remote.com) atua como empregador local em nome da empresa israelita. Elimina EP-emprego, custa $500-700/mês por trabalhador.',
        es: 'EOR (Deel, Remote.com) actúa como empleador local en nombre de la empresa israelí. Elimina EP-empleo, cuesta $500-700/mes por trabajador.',
      },
    },
    {
      level: 'very-high',
      title: {
        he: '4. הקמת ישות מקומית / סניף',
        en: '4. Local entity or branch',
        pt: '4. Entidade ou sucursal local',
        es: '4. Entidad o sucursal local',
      },
      body: {
        he: 'הקמת חברת בת או סניף במדינת היעד. העלות הגבוהה ביותר (€10-50K התאגדות + רואה חשבון + עורך דין מקומי + ציות שוטף ~€10-30K/שנה) אך הפתרון הנקי ביותר לנוכחות לטווח ארוך או צוות של 3+ עובדים. נדרש כשפותחים שוק מקומי או רוצים גיוסים מקומיים.',
        en: 'Set up a subsidiary or branch in the destination country. Highest cost (€10-50K to incorporate + local accountant + lawyer + ~€10-30K/yr ongoing compliance) but the cleanest solution for long-term presence or a team of 3+. Required when opening a local market or hiring locally.',
        pt: 'Criar subsidiária ou sucursal local. Custo €10-50K + €10-30K/ano de compliance. Indicado para presença duradoura ou equipa 3+.',
        es: 'Crear filial o sucursal local. Coste €10-50K + €10-30K/año de compliance. Indicado para presencia duradera o equipo 3+.',
      },
    },
  ],

  faq: [
    {
      q: {
        he: 'האם יום ההגעה ויום העזיבה נספרים?',
        en: 'Do the arrival and departure days both count?',
        pt: 'Os dias de chegada e partida contam ambos?',
        es: '¿Los días de llegada y salida cuentan ambos?',
      },
      a: {
        he: 'משתנה לפי מדינה. ברירת המחדל ברוב המדינות (PT/ES/IT/GR/CY/MT/DE/AE/TH) — שניהם נספרים כימים מלאים. בריטניה חריגה: יום נספר רק אם הייתה נוכחות בחצות. ארה״ב סופרת לפי "presence at any time during the day".',
        en: 'It varies by country. Default in most (PT/ES/IT/GR/CY/MT/DE/AE/TH) — both count as full days. UK is the exception: a day only counts if you were present at midnight. US counts "presence at any time during the day".',
        pt: 'Varia por país. Por padrão (PT/ES/IT/GR/CY/MT/DE/AE/TH) — ambos contam. Reino Unido: só conta se presente à meia-noite.',
        es: 'Varía por país. Por defecto (PT/ES/IT/GR/CY/MT/DE/AE/TH) — ambos cuentan. Reino Unido: solo cuenta si estás presente a medianoche.',
      },
    },
    {
      q: {
        he: 'מה אם החברה שלי מקיימת off-site שבועי בחו״ל?',
        en: 'What if my company holds a weekly off-site abroad?',
        pt: 'E se a minha empresa fizer um off-site semanal no estrangeiro?',
        es: '¿Y si mi empresa hace un off-site semanal en el extranjero?',
      },
      a: {
        he: 'נסיעות קצרות (פחות מ-7 ימים) למטרות חברה — מפגשים, הכשרות, off-sites — בדרך כלל לא יוצרות PE כי הן עומדות בקריטריון "preparatory or auxiliary" של OECD MTC סעיף 5(4). אבל אם הנסיעות חוזרות באותה מדינה ומבוצעות פעולות-ליבה (מכירה ללקוחות מקומיים, חתימת חוזים) — יש סיכון.',
        en: 'Short trips (under 7 days) for company purposes — meetings, training, off-sites — generally do NOT create PE because they meet the OECD MTC Art. 5(4) "preparatory or auxiliary" test. But repeating trips to the same country combined with core activities (sales to local clients, contract signing) does create exposure.',
        pt: 'Viagens curtas (<7 dias) para fins corporativos não criam EP (Art. 5(4) preparatório/auxiliar). Mas atividades-núcleo repetidas no mesmo país criam risco.',
        es: 'Viajes cortos (<7 días) para fines corporativos no crean EP (Art. 5(4) preparatorio/auxiliar). Pero actividades-núcleo repetidas en el mismo país sí crean riesgo.',
      },
    },
    {
      q: {
        he: 'מימוש ESOP/RSU בחו״ל — מה קורה?',
        en: 'Exercising ESOP/RSU while abroad — what happens?',
        pt: 'Exercer ESOP/RSU no estrangeiro — o que acontece?',
        es: 'Ejercer ESOP/RSU en el extranjero — ¿qué pasa?',
      },
      a: {
        he: 'תלוי בתאריך ההענקה, תאריך ההבשלה (vest), ותאריך המימוש או המכירה. אמנת המס הרלוונטית קובעת איזו מדינה היא "מקור" ההכנסה. כלל אצבע: עיקר ההכנסה משויכת למדינה בה עבדת בתקופת ההבשלה ("workdays method"). חובה לתאם עם CPA ישראלי ועם יועץ במדינת היעד.',
        en: 'Depends on grant date, vest date, and exercise/sale date. The relevant tax treaty determines which country is the "source". Rule of thumb: most of the income is allocated to the country you worked in during the vesting period ("workdays method"). Must be coordinated with an Israeli CPA and a destination-country advisor.',
        pt: 'Depende da data de concessão, vesting e exercício/venda. Tratado determina "fonte". Regra: alocação por dias trabalhados no período de vesting. Coordenar com CPA IL + local.',
        es: 'Depende de la fecha de concesión, vesting y ejercicio/venta. El tratado determina la "fuente". Regla: asignación por días trabajados en el período de vesting. Coordinar con CPA IL + local.',
      },
    },
    {
      q: {
        he: 'בן/בת זוג נשארים בישראל — האם זה משנה?',
        en: 'Spouse stays in Israel — does that matter?',
        pt: 'O cônjuge fica em Israel — isso importa?',
        es: 'El cónyuge se queda en Israel — ¿importa?',
      },
      a: {
        he: 'משנה מאוד. שובר השוויון של "מרכז האינטרסים החיוניים" (סעיף 4 לאמנות OECD) משקלל את מיקום המשפחה משקל כבד. בן/בת זוג + ילדים בישראל נחשבים סימן ראייתי חזק שמרכז החיים נשאר בישראל — גם אם הנוכחות הפיזית פחותה מ-183 ימים. ברירת המחדל של רשות המסים: עדיין תושב.',
        en: 'It matters significantly. The "centre of vital interests" tie-breaker (OECD treaty Article 4) weighs family location heavily. Spouse + children remaining in Israel is strong evidence that the centre of life is still in Israel — even with <183 days of physical presence. ITA default: still resident.',
        pt: 'Importa muito. Centro de interesses vitais (Art. 4) pondera muito a família. Cônjuge+filhos em IL = sinal forte de residência IL mesmo com <183 dias.',
        es: 'Importa mucho. Centro de intereses vitales (Art. 4) pondera mucho la familia. Cónyuge+hijos en IL = señal fuerte de residencia IL incluso con <183 días.',
      },
    },
    {
      q: {
        he: 'מה אם עברתי לפני חצי שנה? אני כבר תקוע?',
        en: 'I moved 6 months ago — am I stuck as an Israeli tax resident?',
        pt: 'Mudei há 6 meses — estou preso como residente fiscal israelita?',
        es: 'Me mudé hace 6 meses — ¿estoy atrapado como residente fiscal israelí?',
      },
      a: {
        he: 'לא בהכרח. תושבות לצרכי מס נקבעת לפי "מרכז החיים" — מבחן עובדתי ולא תאריכי בלבד. כדי "לשבור" תושבות ישראלית מומלץ להגיש טופס 1348 לרשות המסים (הצהרת ניתוק תושבות), להעביר כתובת רשמית, לסגור חשבונות בנק לא-פעילים, ולהציג ראיות לחיים במדינת היעד (חוזה שכירות, ביה״ס לילדים, ביטוח רפואי מקומי).',
        en: 'Not necessarily. Tax residency is determined by "centre of life" — a factual test, not date-based alone. To "break" Israeli residency it is recommended to file ITA Form 1348 (residency cessation declaration), change registered address, close dormant bank accounts, and document life in the destination country (lease, schools for kids, local health insurance).',
        pt: 'Não. Residência baseia-se em "centro de vida" (teste factual). Recomenda-se: formulário 1348 ITA + mudar morada + provas locais.',
        es: 'No. Residencia se basa en "centro de vida" (prueba factual). Se recomienda: formulario 1348 ITA + cambiar dirección + pruebas locales.',
      },
    },
    {
      q: {
        he: 'האם חופשת מולדת בישראל סופרת?',
        en: 'Does a "home visit" trip back to Israel count?',
        pt: 'Uma viagem de volta a Israel ("visita à pátria") conta?',
        es: 'Un viaje de "vuelta a casa" a Israel — ¿cuenta?',
      },
      a: {
        he: 'כן. כל יום של נוכחות פיזית בישראל (כולל יום ההגעה ויום העזיבה) נספר לטובת מבחני 30/425/3-שנים של רשות המסים. גם ביקור חתונה בן 5 ימים נספר. שמור תיעוד טיסות.',
        en: 'Yes. Every day of physical presence in Israel (including arrival and departure days) counts toward the ITA\'s 30-day, 425-day-over-3-years, and "three-year-presence" tests. Even a 5-day wedding visit counts. Keep flight records.',
        pt: 'Sim. Todos os dias em IL contam para os testes 30/425/3-anos do ITA. Mesmo 5 dias de casamento. Guarde registos de voo.',
        es: 'Sí. Todos los días en IL cuentan para las pruebas 30/425/3-años de la ITA. Incluso una boda de 5 días. Guarda registros de vuelos.',
      },
    },
    {
      q: {
        he: 'ילדים בבי״ס מקומי במדינת היעד — סיכון או יתרון?',
        en: 'Kids enrolled in local school in the destination country — risk or asset?',
        pt: 'Filhos numa escola local no país de destino — risco ou ativo?',
        es: 'Hijos en una escuela local en el país de destino — ¿riesgo o ventaja?',
      },
      a: {
        he: 'יתרון מהותי. רישום ילדים לבית ספר מקומי הוא סיגנל חזק שמרכז החיים עבר למדינת היעד — נשקל בכבדות במבחן "מרכז האינטרסים החיוניים" של אמנות המס. מחזק את הטענה שמרכז החיים אינו בישראל.',
        en: 'Significant asset. Enrolling kids in local school is a strong signal that the centre of life has moved abroad — weighed heavily in the treaty "centre of vital interests" tie-breaker. Strengthens the non-Israel-resident claim.',
        pt: 'Vantagem significativa. Escola local = sinal forte de mudança de centro de vida (Art. 4 tratado).',
        es: 'Ventaja significativa. Escuela local = señal fuerte de cambio de centro de vida (Art. 4 tratado).',
      },
    },
    {
      q: {
        he: 'האם להעביר כתובת מגורים רשמית?',
        en: 'Should I change my registered address?',
        pt: 'Devo mudar a minha morada registada?',
        es: '¿Debo cambiar mi dirección registrada?',
      },
      a: {
        he: 'מומלץ אך לא מספיק לבד. שינוי כתובת רשמית במשרד הפנים (טופס 1) + הצהרת ניתוק תושבות (טופס 1348) מחזקים את הטענה לאי-תושבות. אבל אם בני המשפחה הקרובה (בן/בת זוג, ילדים) או נכסים עיקריים (בית) נשארים בישראל — שינוי הכתובת לבדו לא ישכנע את רשות המסים.',
        en: 'Recommended but not sufficient alone. Changing your address with the Ministry of Interior (Form 1) + filing the residency-cessation declaration (Form 1348) strengthens the non-resident claim. But if close family (spouse, children) or main assets (home) stay in Israel, the address change alone will not convince the ITA.',
        pt: 'Recomendado mas não suficiente. Form 1 (morada) + Form 1348 ajudam. Mas se família/casa ficarem em IL, só mudar morada não convence ITA.',
        es: 'Recomendado pero no suficiente. Form 1 (dirección) + Form 1348 ayudan. Pero si la familia/vivienda quedan en IL, solo cambiar la dirección no convence a la ITA.',
      },
    },
  ],

  scenarios: [
    {
      key: 'classic-year',
      name: {
        he: 'שנה קלאסית — 8+4',
        en: 'Classic Year — 8 + 4',
        pt: 'Ano Clássico — 8 + 4',
        es: 'Año Clásico — 8 + 4',
      },
      desc: {
        he: '8 חודשים בישראל + 4 חודשים בחו״ל (לרוב חורף בליסבון/ברצלונה/דובאי). תושבות מס נשארת בישראל; הסיכון העיקרי הוא Schengen 90/180 וחשיפת PE קטנה ביחס לתקופה הקצרה.',
        en: '8 months in Israel + 4 months abroad (often winter in Lisbon / Barcelona / Dubai). Israeli tax residency is preserved; main risk is the Schengen 90/180 limit and a small PE exposure relative to the short duration.',
        pt: '8 meses IL + 4 meses fora (inverno em Lisboa/Barcelona/Dubai). Residência IL preservada; risco principal Schengen 90/180.',
        es: '8 meses IL + 4 meses fuera (invierno en Lisboa/Barcelona/Dubai). Residencia IL preservada; riesgo principal Schengen 90/180.',
      },
      defaultCountry: 'PT',
      defaultDays: 120,
    },
    {
      key: 'half-half',
      name: {
        he: 'חצי-חצי — 6+6',
        en: 'Half-half — 6 + 6',
        pt: 'Meio-Meio — 6 + 6',
        es: 'Mitad-Mitad — 6 + 6',
      },
      desc: {
        he: '6 חודשים בישראל + 6 חודשים במדינה אחת (לרוב גאורגיה לאזרחי ישראל — 365 יום ויזה חופשית, או קפריסין במסלול 60). חצייה אפשרית של סף 183 — תכנון קפדני נדרש. ייתכן Dual-Residency והפעלת אמנה.',
        en: '6 months in Israel + 6 months in a single country (often Georgia for Israelis — 365-day visa-free, or Cyprus 60-day route). May cross the 183-day threshold — careful planning required. Dual-residency and treaty tie-breaker may apply.',
        pt: '6 IL + 6 num só país (Geórgia/Chipre). Pode atravessar 183 dias — planear cuidadosamente. Possível dupla residência + tie-breaker.',
        es: '6 IL + 6 en un solo país (Georgia/Chipre). Puede cruzar 183 días — planificación cuidadosa. Posible doble residencia + tie-breaker.',
      },
      defaultCountry: 'GE',
      defaultDays: 180,
    },
    {
      key: 'full-move',
      name: {
        he: 'מעבר מלא — שנה+',
        en: 'Full Move — 12+ months',
        pt: 'Mudança Total — 12+ meses',
        es: 'Mudanza Total — 12+ meses',
      },
      desc: {
        he: '12+ חודשים במדינת היעד, ניתוק תושבות ישראלית מלא. דרושים: ויזת DNV או רישיון עבודה, הגשת טופס 1348, העברת מרכז חיים (משפחה, נכסים, בנק). חשיפת מס מקומי מלאה. שינוי משמעותי בסטטוס המעסיק — דרוש EOR או חברת בת.',
        en: '12+ months in destination, full break from Israeli tax residency. Required: DNV or work permit, file Form 1348, relocate centre of life (family, assets, bank). Full local tax exposure. Major change in employer status — needs EOR or local subsidiary.',
        pt: '12+ meses fora; rotura total com IL. DNV + Form 1348 + mudança centro vida. EOR ou subsidiária obrigatórios.',
        es: '12+ meses fuera; ruptura total con IL. DNV + Form 1348 + traslado centro vida. EOR o filial obligatorios.',
      },
      defaultCountry: 'ES',
      defaultDays: 365,
    },
  ],
};

// verifiedDate: '2026-05'
