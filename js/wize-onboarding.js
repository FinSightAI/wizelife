/* WizeLife shared onboarding modal (first-visit only).
   Drop-in: <script src="/js/wize-onboarding.js" defer></script>
   - Modal card (~340×auto), NOT fullscreen
   - 6 slides per app, swipeable (mobile) + arrow buttons (desktop)
   - Always closable: ✕ button, click on backdrop, Escape, "Got it" button
   - Shows once per app per device — persisted via localStorage `wl_ob_<id>`
   - Re-trigger from elsewhere by calling: window.WizeOnboarding.show('appid')
*/
(function () {
  if (window.__wizeOnboardLoaded) return;
  window.__wizeOnboardLoaded = true;

  /* ────────────────────────────────────────────────────────────────────────
     App config — slides keyed by app id, then by language.
     6 slides per app — kept tight so the modal stays compact. */
  var COPY = {
    money: {
      color: '#10b981',
      he: [
        { e: '💰', t: 'WizeMoney',          s: 'דשבורד פיננסי אישי עם AI — מניות, קרנות, ופנסיה במקום אחד.' },
        { e: '🤖', t: 'תובנות AI חכמות',     s: 'ה-AI מנתח את התיק שלך ומציע איך לשפר אותו — בלי ייעוץ אישי.' },
        { e: '🌍', t: 'שלוש שווקים',         s: 'ישראל, ארה״ב וברזיל — בורסות, גמל, פנסיה ומס במקום אחד.' },
        { e: '📈', t: 'מעקב אוטומטי',         s: 'הוסף עסקה אחת — והדשבורד מתעדכן לבד, עם תזרים והחזר שנתי.' },
        { e: '🎯', t: 'יעדים על טייס אוטומטי', s: 'הגדר יעדים — דירה, פנסיה, חופשה — ותראה את ההתקדמות מתעדכנת לבד.' },
        { e: '🔒', t: 'הנתונים שלך מוגנים',   s: 'מידע פיננסי מוצפן ב-AES-256, אף פעם לא נמכר, וניתן למחיקה בכל רגע.' }
      ],
      en: [
        { e: '💰', t: 'WizeMoney',          s: 'Personal AI finance dashboard — stocks, funds, pension in one place.' },
        { e: '🤖', t: 'Smart AI insights',  s: 'AI analyzes your portfolio and suggests improvements — no advisor needed.' },
        { e: '🌍', t: 'Three markets',      s: 'Israel, US and Brazil — equities, retirement and tax under one roof.' },
        { e: '📈', t: 'Auto-tracking',       s: 'Add one transaction — the dashboard updates itself, with cash flow and yearly return.' },
        { e: '🎯', t: 'Goals on autopilot',  s: 'Set goals — a home, pension, vacation — and watch progress update itself.' },
        { e: '🔒', t: 'Your data is safe',   s: 'Financial data is AES-256 encrypted, never sold, and deletable anytime.' }
      ],
      pt: [
        { e: '💰', t: 'WizeMoney',          s: 'Painel financeiro com IA — ações, fundos e aposentadoria no mesmo lugar.' },
        { e: '🤖', t: 'Insights da IA',     s: 'A IA analisa seu portfólio e sugere melhorias — sem consultor.' },
        { e: '🌍', t: 'Três mercados',      s: 'Israel, EUA e Brasil — bolsa, previdência e impostos juntos.' },
        { e: '📈', t: 'Acompanhamento auto.', s: 'Adicione uma transação — o painel se atualiza sozinho, com fluxo e retorno anual.' },
        { e: '🎯', t: 'Metas no piloto auto.', s: 'Defina metas — casa, aposentadoria, viagem — e veja o progresso atualizar sozinho.' },
        { e: '🔒', t: 'Seus dados protegidos', s: 'Dados financeiros com criptografia AES-256, nunca vendidos, deletáveis a qualquer hora.' }
      ],
      es: [
        { e: '💰', t: 'WizeMoney',          s: 'Panel de finanzas con IA — acciones, fondos y pensión en un lugar.' },
        { e: '🤖', t: 'Insights de IA',     s: 'La IA analiza tu cartera y sugiere mejoras — sin asesor.' },
        { e: '🌍', t: 'Tres mercados',      s: 'Israel, EE.UU. y Brasil — bolsa, jubilación e impuestos.' },
        { e: '📈', t: 'Seguimiento auto.',   s: 'Agrega una transacción — el panel se actualiza solo, con flujo y retorno anual.' },
        { e: '🎯', t: 'Metas en piloto auto.', s: 'Marca metas — casa, jubilación, viaje — y mira el progreso actualizarse solo.' },
        { e: '🔒', t: 'Tus datos seguros',    s: 'Datos financieros cifrados en AES-256, nunca vendidos, eliminables cuando quieras.' }
      ]
    },
    tax: {
      color: '#f59e0b',
      he: [
        { e: '📊', t: 'WizeTax',            s: 'יועץ מס AI לתכנון בינלאומי — ישראל, ארה״ב, פורטוגל ועוד.' },
        { e: '⚖️', t: 'הימנעות חוקית',       s: 'הבדל בין הימנעות מס חוקית להעלמת מס. שמירה על FATCA/CRS.' },
        { e: '🌐', t: 'מס יציאה ותושבות',    s: 'תכנון מעבר מדינות עם הבנה של מס יציאה ישראלי וחבויות עתידיות.' },
        { e: '💡', t: 'תכנון לפני מעשה',      s: 'שאל את ה-AI לפני מהלך גדול — מכירת מניות, רילוקיישן, ירושה — ותדע את ההשלכות.' },
        { e: '🆚', t: 'השוואת 20 מדינות',    s: 'בחר עד 20 מדינות ותראה מס הכנסה, רווחי הון ועלות מחיה זו לצד זו.' },
        { e: '🔒', t: 'פרטיות במס',         s: 'פרטי המס שלך עוברים סינון PII לפני שה-AI רואה אותם — אף פעם לא משותפים.' }
      ],
      en: [
        { e: '📊', t: 'WizeTax',            s: 'AI tax advisor for international planning — Israel, US, Portugal and more.' },
        { e: '⚖️', t: 'Legal optimization',  s: 'Distinguishes legal avoidance from evasion. FATCA/CRS aware.' },
        { e: '🌐', t: 'Exit & residency',   s: 'Plan a country move with full visibility of Israeli exit tax + future liabilities.' },
        { e: '💡', t: 'Plan before you act', s: 'Ask the AI before a big move — selling shares, relocating, inheritance — and see the impact first.' },
        { e: '🆚', t: 'Compare 20 countries', s: 'Stack up to 20 jurisdictions side-by-side — income, capital gains, cost of living.' },
        { e: '🔒', t: 'Tax data privacy',    s: 'Tax info is PII-stripped before the AI sees it — never shared, never sold.' }
      ],
      pt: [
        { e: '📊', t: 'WizeTax',            s: 'Consultor de impostos com IA — Israel, EUA, Portugal e mais.' },
        { e: '⚖️', t: 'Otimização legal',    s: 'Distingue elisão legal de evasão. Ciente de FATCA/CRS.' },
        { e: '🌐', t: 'Saída & residência', s: 'Planeje uma mudança de país com visibilidade do exit tax israelense.' },
        { e: '💡', t: 'Planeje antes de agir', s: 'Pergunte à IA antes de um passo grande — vender ações, mudança, herança — e veja o impacto.' },
        { e: '🆚', t: 'Comparar 20 países',  s: 'Compare até 20 países lado a lado — renda, ganhos de capital, custo de vida.' },
        { e: '🔒', t: 'Privacidade fiscal',  s: 'Dados fiscais passam por filtro de PII antes da IA — nunca compartilhados.' }
      ],
      es: [
        { e: '📊', t: 'WizeTax',            s: 'Asesor fiscal con IA — Israel, EE.UU., Portugal y más.' },
        { e: '⚖️', t: 'Optimización legal',  s: 'Distingue elusión legal de evasión. Compatible con FATCA/CRS.' },
        { e: '🌐', t: 'Salida & residencia', s: 'Planifica mudanzas con visibilidad del impuesto de salida israelí.' },
        { e: '💡', t: 'Planifica antes de actuar', s: 'Consulta a la IA antes de un paso grande — vender acciones, mudanza, herencia — y mira el impacto.' },
        { e: '🆚', t: 'Compara 20 países',   s: 'Compara hasta 20 países lado a lado — renta, ganancias de capital, costo de vida.' },
        { e: '🔒', t: 'Privacidad fiscal',   s: 'Tus datos fiscales pasan filtro PII antes de la IA — nunca compartidos.' }
      ]
    },
    health: {
      color: '#ec4899',
      he: [
        { e: '❤️', t: 'WizeHealth',         s: 'עוזר רפואי AI — שאלות, ניתוח בדיקות דם, ותזונה אישית.' },
        { e: '🧪', t: 'ניתוח בדיקות דם',     s: 'העלה PDF או תמונה — ה-AI יסביר תוצאות, מגמות, וסיבות אפשריות.' },
        { e: '🚨', t: 'לא תחליף לרופא',       s: 'במצב חירום חייגו 101. WizeHealth לא מאבחן ולא רושם תרופות.' },
        { e: '🥗', t: 'תזונה אישית',          s: 'AI מתאים המלצות תזונה לפי ערכי הדם והמטרות שלך — לא תפריט גנרי.' },
        { e: '⚡', t: 'ניתוח מיידי',         s: 'העלה בדיקת דם — תוך שניות תקבל הסבר ברור על כל ערך וכל מגמה.' },
        { e: '🔒', t: 'פרטיות רפואית',       s: 'נתונים רפואיים מוצפנים E2E. PII מוסר לפני AI. תואם GDPR.' }
      ],
      en: [
        { e: '❤️', t: 'WizeHealth',         s: 'AI health companion — questions, blood test analysis, personal nutrition.' },
        { e: '🧪', t: 'Blood test analysis', s: 'Upload a PDF or photo — the AI explains results, trends, and possible causes.' },
        { e: '🚨', t: 'Not a doctor',        s: 'For emergencies call your local 101/911. WizeHealth never diagnoses or prescribes.' },
        { e: '🥗', t: 'Personal nutrition',  s: 'The AI tailors nutrition advice to your bloodwork and goals — not a generic meal plan.' },
        { e: '⚡', t: 'Instant analysis',    s: 'Upload a blood test — in seconds you get a plain-English explanation of every value.' },
        { e: '🔒', t: 'Medical privacy',     s: 'Medical data is E2E encrypted. PII removed before AI. GDPR-compliant by design.' }
      ],
      pt: [
        { e: '❤️', t: 'WizeHealth',         s: 'Companheiro de saúde com IA — perguntas, exames de sangue, nutrição pessoal.' },
        { e: '🧪', t: 'Análise de exames',   s: 'Envie um PDF ou foto — a IA explica resultados, tendências e causas.' },
        { e: '🚨', t: 'Não é médico',        s: 'Em emergência ligue para o seu 192/911. O WizeHealth não diagnostica.' },
        { e: '🥗', t: 'Nutrição pessoal',    s: 'A IA adapta a nutrição aos seus exames e metas — não um cardápio genérico.' },
        { e: '⚡', t: 'Análise instantânea', s: 'Envie um exame — em segundos recebe uma explicação clara de cada valor e tendência.' },
        { e: '🔒', t: 'Privacidade médica',  s: 'Dados médicos com criptografia E2E. PII removido antes da IA. Conformidade GDPR.' }
      ],
      es: [
        { e: '❤️', t: 'WizeHealth',         s: 'Compañero de salud con IA — preguntas, análisis de sangre, nutrición.' },
        { e: '🧪', t: 'Análisis de sangre',  s: 'Sube un PDF o foto — la IA explica resultados, tendencias y causas.' },
        { e: '🚨', t: 'No es un médico',     s: 'En emergencia llama al 911. WizeHealth no diagnostica ni receta.' },
        { e: '🥗', t: 'Nutrición personal',  s: 'La IA adapta la nutrición a tus análisis y metas — no un menú genérico.' },
        { e: '⚡', t: 'Análisis instantáneo', s: 'Sube un análisis de sangre — en segundos recibes una explicación clara de cada valor.' },
        { e: '🔒', t: 'Privacidad médica',   s: 'Datos médicos cifrados E2E. PII se elimina antes de la IA. Cumple con GDPR.' }
      ]
    },
    travel: {
      color: '#06b6d4',
      he: [
        { e: '✈️', t: 'WizeTravel',         s: 'תכנון נסיעות AI — טיסות, מלונות, ויזות ועוד.' },
        { e: '🛂', t: 'בדיקת ויזה',          s: 'בדוק במהירות אם אתה צריך ויזה ומה לוקח להוציא — לפי דרכון ויעד.' },
        { e: '💼', t: 'דילים בזמן אמת',      s: 'מנוע דילים שמשווה מחירים ומציע את הזמן הטוב ביותר לטוס.' },
        { e: '🕵️', t: 'דילים נסתרים',         s: 'ה-AI מוצא טיסות hidden-city ו-virtual interlining שחוסכות מאות דולרים.' },
        { e: '🔔', t: 'התראות מחיר',        s: 'הגדר מסלול וקבל התראה כשהמחיר יורד — אל תפספס דיל.' },
        { e: '🔒', t: 'פרטיות בנסיעות',      s: 'פרטי הטיול מנוטרלים לפני AI. אף פעם לא נמכרים לחברות תעופה או מלונות.' }
      ],
      en: [
        { e: '✈️', t: 'WizeTravel',         s: 'AI travel planner — flights, hotels, visas, deals.' },
        { e: '🛂', t: 'Visa check',          s: 'Quickly see if you need a visa and how to get one — by passport + destination.' },
        { e: '💼', t: 'Live deal hunter',    s: 'A deal engine that compares prices and recommends the best time to fly.' },
        { e: '🕵️', t: 'Hidden deals',         s: 'The AI finds hidden-city and virtual interlining routes that save hundreds.' },
        { e: '🔔', t: 'Price alerts',       s: 'Set a route, get notified when fares drop. Never miss a deal.' },
        { e: '🔒', t: 'Travel privacy',       s: 'Trip data is anonymized in AI prompts — never sold to airlines or hotels.' }
      ],
      pt: [
        { e: '✈️', t: 'WizeTravel',         s: 'Planejador de viagens com IA — voos, hotéis, vistos, ofertas.' },
        { e: '🛂', t: 'Verificação de visto', s: 'Veja se precisa de visto e como obter — por passaporte + destino.' },
        { e: '💼', t: 'Caçador de ofertas',  s: 'Motor que compara preços e recomenda a melhor hora para voar.' },
        { e: '🕵️', t: 'Ofertas ocultas',      s: 'A IA encontra rotas hidden-city e virtual interlining que economizam centenas.' },
        { e: '🔔', t: 'Alertas de preço',   s: 'Configure uma rota, seja notificado quando o preço cair. Nunca perca um deal.' },
        { e: '🔒', t: 'Privacidade da viagem', s: 'Dados da viagem anonimizados nos prompts da IA — nunca vendidos para companhias.' }
      ],
      es: [
        { e: '✈️', t: 'WizeTravel',         s: 'Planificador de viajes con IA — vuelos, hoteles, visados, ofertas.' },
        { e: '🛂', t: 'Verificación de visa', s: 'Mira si necesitas visa y cómo conseguirla — por pasaporte + destino.' },
        { e: '💼', t: 'Cazador de ofertas',  s: 'Motor que compara precios y recomienda el mejor momento para volar.' },
        { e: '🕵️', t: 'Ofertas ocultas',      s: 'La IA encuentra rutas hidden-city y virtual interlining que ahorran cientos.' },
        { e: '🔔', t: 'Alertas de precio',  s: 'Configura una ruta, recibe avisos cuando bajen los precios. Nunca pierdas una oferta.' },
        { e: '🔒', t: 'Privacidad de viaje',  s: 'Datos del viaje anonimizados en los prompts de IA — nunca vendidos a aerolíneas.' }
      ]
    },
    deal: {
      color: '#8b5cf6',
      he: [
        { e: '🏠', t: 'WizeDeal',           s: 'מנתח עסקאות נדל״ן עם AI — תשואה, משכנתא, ותמחור שוק.' },
        { e: '📊', t: 'ROI ב-AI',            s: 'ציון 0–100 לעסקה עם הסבר מפורט — Red flags, סיכונים, תזרים.' },
        { e: '📍', t: 'נתוני שוק חיים',       s: 'אומדן שכ״ד וקומפים אמיתיים לפי שכונה. ישראל, ברזיל ועוד.' },
        { e: '🆚', t: 'השוואת 3 עסקאות',     s: 'בחר עד 3 דירות והצג זו לצד זו — ה-AI ידרג ויסביר איזו הכי טובה.' },
        { e: '🏦', t: 'סימולטור משכנתא',     s: 'חשב החזרים חודשיים, השפעת ריבית ותרחישי שכירות — לפני שאתה חותם.' },
        { e: '🔒', t: 'הנתונים שלך נשארים שלך', s: 'נתוני העסקה מבודדים לכל משתמש. לא משותפים לאף אחד בלי הסכמה שלך.' }
      ],
      en: [
        { e: '🏠', t: 'WizeDeal',           s: 'AI real-estate deal analyzer — yields, mortgage, and market pricing.' },
        { e: '📊', t: 'AI deal score',       s: 'A 0–100 score with reasoning — red flags, risks, cash flow.' },
        { e: '📍', t: 'Live market data',    s: 'Rent estimates and real comparables by neighborhood. Israel, Brazil and more.' },
        { e: '🆚', t: 'Compare 3 deals',     s: 'Stack up to 3 properties side-by-side — the AI ranks them and tells you why.' },
        { e: '🏦', t: 'Mortgage simulator', s: 'Crunch monthly payments, rate-change and rental scenarios — before you sign.' },
        { e: '🔒', t: 'Your data, your call', s: 'Deal data is isolated per user. Never shared with anyone without your consent.' }
      ],
      pt: [
        { e: '🏠', t: 'WizeDeal',           s: 'Analisador de imóveis com IA — rentabilidades, financiamento, preços.' },
        { e: '📊', t: 'Score do negócio',    s: 'Pontuação 0–100 com raciocínio — riscos, alertas e fluxo de caixa.' },
        { e: '📍', t: 'Dados ao vivo',       s: 'Estimativa de aluguel e comparáveis por bairro. Israel, Brasil e mais.' },
        { e: '🆚', t: 'Comparar 3 imóveis',  s: 'Coloque até 3 imóveis lado a lado — a IA classifica e explica qual é melhor.' },
        { e: '🏦', t: 'Simulador de hipoteca', s: 'Calcule parcelas, mudanças de taxa e cenários de aluguel — antes de assinar.' },
        { e: '🔒', t: 'Seus dados são seus', s: 'Dados de negócios isolados por usuário. Nunca compartilhados sem seu consentimento.' }
      ],
      es: [
        { e: '🏠', t: 'WizeDeal',           s: 'Analizador inmobiliario con IA — rendimientos, hipoteca y precios.' },
        { e: '📊', t: 'Puntuación IA',       s: 'Puntuación 0–100 con razonamiento — riesgos, alertas y flujo.' },
        { e: '📍', t: 'Datos del mercado',   s: 'Estimación de alquiler y comparables por barrio. Israel, Brasil y más.' },
        { e: '🆚', t: 'Compara 3 ofertas',   s: 'Coloca hasta 3 inmuebles lado a lado — la IA los clasifica y explica cuál gana.' },
        { e: '🏦', t: 'Simulador hipotecario', s: 'Calcula mensualidades, cambios de tasa y escenarios de alquiler — antes de firmar.' },
        { e: '🔒', t: 'Tus datos, tu control', s: 'Datos del trato aislados por usuario. Nunca compartidos sin tu consentimiento.' }
      ]
    },
    portal: {
      color: '#6366f1',
      he: [
        { e: '✨', t: 'ברוך הבא ל-WizeLife', s: 'חמישה כלי AI לחיים מקצועיים — בריאות, כסף, מס, נסיעות, נדל״ן.' },
        { e: '🔐', t: 'התחברות אחת',          s: 'חשבון אחד פותח את כל האפליקציות. שום צורך להירשם שוב.' },
        { e: '📲', t: 'התקנה למובייל',        s: 'אפשר להתקין כמו אפליקציה רגילה דרך תפריט הדפדפן.' },
        { e: '🤝', t: 'חמישה כלים, חשבון אחד', s: 'כל חמש האפליקציות חולקות חשבון אחד — מתחברים פעם, נכנסים לכולן.' },
        { e: '🌐', t: '4 שפות',              s: 'עברית, אנגלית, פורטוגזית וספרדית — החלף בכל רגע מהתפריט.' },
        { e: '🔒', t: 'חשבון אחד מאובטח',     s: 'חשבון אחד מוצפן. אפשר למחוק בכל רגע — לפי חוק ישראלי ו-GDPR.' }
      ],
      en: [
        { e: '✨', t: 'Welcome to WizeLife', s: 'Five AI tools for life — Money, Tax, Health, Travel, Real estate.' },
        { e: '🔐', t: 'One sign-in',         s: 'One account unlocks every app. No need to register twice.' },
        { e: '📲', t: 'Install on mobile',   s: 'You can install it like a native app from your browser menu.' },
        { e: '🤝', t: 'Five apps, one account', s: 'All 5 apps share one account — sign in once, you are in everywhere.' },
        { e: '🌐', t: '4 languages',        s: 'Hebrew, English, Portuguese, Spanish — switch anytime from the menu.' },
        { e: '🔒', t: 'One secure account',   s: 'One encrypted account. Delete it anytime — under Israeli + GDPR law.' }
      ],
      pt: [
        { e: '✨', t: 'Bem-vindo à WizeLife', s: 'Cinco ferramentas de IA — Dinheiro, Imposto, Saúde, Viagem, Imóveis.' },
        { e: '🔐', t: 'Um só login',          s: 'Uma conta dá acesso a tudo. Sem cadastros duplicados.' },
        { e: '📲', t: 'Instalar no celular',  s: 'Dá para instalar como app nativo no menu do navegador.' },
        { e: '🤝', t: 'Cinco apps, uma conta', s: 'Os 5 apps usam uma conta só — entre uma vez, acesse tudo.' },
        { e: '🌐', t: '4 idiomas',          s: 'Hebraico, Inglês, Português e Espanhol — alterne a qualquer momento.' },
        { e: '🔒', t: 'Uma conta segura',     s: 'Uma conta criptografada. Apague quando quiser — lei israelense e GDPR.' }
      ],
      es: [
        { e: '✨', t: 'Bienvenido a WizeLife', s: 'Cinco herramientas de IA — Dinero, Impuestos, Salud, Viaje, Inmuebles.' },
        { e: '🔐', t: 'Un solo inicio',       s: 'Una cuenta abre todas las apps. Sin registrarse dos veces.' },
        { e: '📲', t: 'Instalar en móvil',    s: 'Se puede instalar como app desde el menú del navegador.' },
        { e: '🤝', t: 'Cinco apps, una cuenta', s: 'Las 5 apps comparten una cuenta — entra una vez, accedes a todo.' },
        { e: '🌐', t: '4 idiomas',          s: 'Hebreo, Inglés, Portugués y Español — cambia cuando quieras.' },
        { e: '🔒', t: 'Una cuenta segura',    s: 'Una cuenta cifrada. Bórrala cuando quieras — ley israelí y GDPR.' }
      ]
    }
  };

  var LB = {
    he: { skip: 'דלג', next: 'הבא', done: 'הבנתי', prev: 'הקודם', close: 'סגור' },
    en: { skip: 'Skip',  next: 'Next', done: 'Got it', prev: 'Back', close: 'Close' },
    pt: { skip: 'Pular', next: 'Próximo', done: 'Entendi', prev: 'Voltar', close: 'Fechar' },
    es: { skip: 'Saltar', next: 'Siguiente', done: 'Listo', prev: 'Atrás', close: 'Cerrar' },
  };

  function detectApp() {
    var explicit = document.documentElement.getAttribute('data-wize-app');
    if (explicit && COPY[explicit]) return explicit;
    var h = (location.host || '').toLowerCase();
    var p = (location.pathname || '').toLowerCase();
    // wizelife.ai subdomains (canonical entry points)
    if (h.indexOf('money.wizelife') === 0 || h.indexOf('money.wizelife') > 0) return 'money';
    if (h.indexOf('tax.wizelife') >= 0)    return 'tax';
    if (h.indexOf('health.wizelife') >= 0) return 'health';
    if (h.indexOf('travel.wizelife') >= 0) return 'travel';
    if (h.indexOf('deal.wizelife') >= 0)   return 'deal';
    // Underlying hosts (in case user goes direct)
    if (h.indexOf('finsightai.github.io') >= 0 && p.indexOf('/finsight') >= 0) return 'money';
    if (h.indexOf('mastermove') >= 0) return 'tax';
    if (h.indexOf('vitara') >= 0 || h.indexOf('rambam') >= 0) return 'health';
    if (h.indexOf('streamlit') >= 0 || h.indexOf('wizetravel') >= 0 || h.indexOf('mega-traveller') >= 0) return 'travel';
    if (h.indexOf('check-deal') >= 0 || h.indexOf('wizedeal') >= 0) return 'deal';
    return 'portal';
  }

  function getLang() {
    try { return (localStorage.getItem('wl_lang') || (document.documentElement.lang || 'he')).slice(0, 2); }
    catch (e) { return 'he'; }
  }

  function buildModal(appId, force) {
    var slides = (COPY[appId] && COPY[appId][getLang()]) || COPY[appId].en;
    var color  = (COPY[appId] && COPY[appId].color) || '#6366f1';
    var lb     = LB[getLang()] || LB.en;
    var lang   = getLang();
    var rtl    = lang === 'he';
    var step   = 0;

    /* Backdrop + modal card */
    var root = document.createElement('div');
    root.id = 'wize-onboarding';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.style.cssText = [
      'position:fixed','inset:0','z-index:99997',
      'display:flex','align-items:center','justify-content:center',
      'background:rgba(5,8,20,0.55)','backdrop-filter:blur(8px)','-webkit-backdrop-filter:blur(8px)',
      'font-family:Inter,-apple-system,system-ui,sans-serif',
      'padding:20px','box-sizing:border-box',
      'animation:wbo-fade .25s ease',
      'direction:' + (rtl ? 'rtl' : 'ltr')
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'position:relative','width:100%','max-width:420px',
      'background:linear-gradient(180deg,#0f1426 0%,#080b16 100%)',
      'border:1px solid rgba(255,255,255,0.10)','border-radius:24px',
      'padding:36px 32px 28px','box-sizing:border-box',
      // Stronger color-aware halo behind card
      'box-shadow:0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px ' + color + '33, 0 0 80px ' + color + '22',
      'animation:wbo-pop .4s cubic-bezier(.16,1,.3,1)','overflow:hidden'
    ].join(';');

    /* Aurora blob behind icon */
    var aurora = document.createElement('div');
    aurora.style.cssText = [
      'position:absolute','top:-80px','inset-inline-start:50%','transform:translateX(-50%)',
      'width:280px','height:280px','border-radius:50%',
      'background:radial-gradient(circle, ' + color + '40 0%, ' + color + '10 40%, transparent 70%)',
      'filter:blur(40px)','pointer-events:none','z-index:0'
    ].join(';');
    card.appendChild(aurora);

    /* keyframes once */
    if (!document.getElementById('wbo-anim')) {
      var st = document.createElement('style');
      st.id = 'wbo-anim';
      st.textContent =
        '@keyframes wbo-fade{from{opacity:0}to{opacity:1}}' +
        '@keyframes wbo-pop{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}';
      document.head.appendChild(st);
    }

    /* Top: progress + close */
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px;';
    var dots = document.createElement('div');
    dots.style.cssText = 'display:flex;gap:6px;';
    slides.forEach(function (_, i) {
      var d = document.createElement('span');
      d.dataset.i = String(i);
      d.style.cssText = 'width:24px;height:4px;border-radius:99px;background:rgba(255,255,255,0.14);transition:all .3s';
      dots.appendChild(d);
    });
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', lb.close);
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.55);font-size:18px;cursor:pointer;padding:4px 8px;line-height:1;font-family:inherit;border-radius:8px;';
    closeBtn.addEventListener('mouseenter', function(){ closeBtn.style.color='#fff'; closeBtn.style.background='rgba(255,255,255,0.06)'; });
    closeBtn.addEventListener('mouseleave', function(){ closeBtn.style.color='rgba(255,255,255,0.55)'; closeBtn.style.background='none'; });
    top.appendChild(dots);
    top.appendChild(closeBtn);
    card.appendChild(top);

    /* Slide content */
    var iconWrap = document.createElement('div');
    iconWrap.style.cssText = [
      'width:88px','height:88px','border-radius:24px',
      'background:linear-gradient(135deg, ' + color + '30, ' + color + '10)',
      'border:1px solid ' + color + '40',
      'display:flex','align-items:center','justify-content:center',
      'margin:12px auto 22px','font-size:42px','position:relative','z-index:1',
      'box-shadow:0 12px 32px ' + color + '25, inset 0 1px 0 rgba(255,255,255,0.1)',
    ].join(';');
    var titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin:0 0 10px;color:#f0f4ff;font-size:22px;font-weight:900;text-align:center;letter-spacing:-0.6px;position:relative;z-index:1;';
    var subEl = document.createElement('p');
    subEl.style.cssText = 'margin:0 0 28px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.65;text-align:center;position:relative;z-index:1;';
    card.appendChild(iconWrap);
    card.appendChild(titleEl);
    card.appendChild(subEl);

    /* Bottom: skip + next/done */
    var bottom = document.createElement('div');
    bottom.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
    var skipBtn = document.createElement('button');
    skipBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.45);font-size:13px;cursor:pointer;padding:8px 12px;font-family:inherit;border-radius:8px;';
    skipBtn.textContent = lb.skip;
    var nextBtn = document.createElement('button');
    nextBtn.style.cssText = 'background:linear-gradient(135deg,' + color + ',' + color + 'dd);border:none;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;padding:12px 26px;border-radius:99px;font-family:inherit;box-shadow:0 10px 30px ' + color + '70, inset 0 1px 0 rgba(255,255,255,0.2);transition:transform .15s, box-shadow .15s;letter-spacing:.2px;';
    bottom.appendChild(skipBtn);
    bottom.appendChild(nextBtn);
    card.appendChild(bottom);

    root.appendChild(card);

    function render() {
      var s = slides[step];
      iconWrap.textContent = s.e;
      titleEl.textContent = s.t;
      subEl.textContent = s.s;
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.style.background = i <= step ? color : 'rgba(255,255,255,0.12)';
      });
      var isLast = step === slides.length - 1;
      nextBtn.textContent = isLast ? lb.done : lb.next;
      skipBtn.style.visibility = isLast ? 'hidden' : 'visible';
    }

    function close() {
      try { localStorage.setItem('wl_ob_' + appId, '1'); } catch (e) {}
      try { localStorage.setItem('wl_ob_' + appId + '_ts', String(Date.now())); } catch (e) {}
      root.style.animation = 'wbo-fade .25s ease reverse';
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 220);
      window.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') (rtl ? prev : next)();
      else if (e.key === 'ArrowLeft')  (rtl ? next : prev)();
    }
    function next() { if (step < slides.length - 1) { step++; render(); } else close(); }
    function prev() { if (step > 0) { step--; render(); } }

    nextBtn.addEventListener('click', next);
    skipBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    window.addEventListener('keydown', onKey);

    /* Swipe support */
    var startX = 0;
    card.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      (rtl ? (dx > 0 ? prev() : next()) : (dx < 0 ? next() : prev()));
    }, { passive: true });

    document.body.appendChild(root);
    render();
    /* Focus trap (light): focus next button so keyboard users can act fast */
    setTimeout(function(){ try { nextBtn.focus(); } catch(e){} }, 50);
  }

  function maybeShow() {
    var appId = detectApp();
    if (!COPY[appId]) return;
    // The WizeLife portal itself doesn't need an onboarding — that page IS
    // the launcher. Onboarding only fires inside the 5 sub-apps.
    if (appId === 'portal') return;
    /* Allow forcing the modal via ?ob=force (great for testing or sharing) */
    var force = false;
    try { force = (new URLSearchParams(location.search).get('ob') === 'force'); } catch (e) {}
    if (!force) {
      var key = 'wl_ob_' + appId;
      var seen;
      try { seen = localStorage.getItem(key); } catch (e) { seen = '1'; /* private mode → don't nag */ }
      if (seen) return;
    }
    /* Wait a tick so the rest of the page has painted */
    setTimeout(function () { buildModal(appId); }, 600);
  }

  /* Public API: window.WizeOnboarding.show('money' | 'tax' | ...) — re-trigger */
  window.WizeOnboarding = {
    show: function (appId) { buildModal(appId || detectApp(), true); },
    reset: function (appId) { try { localStorage.removeItem('wl_ob_' + (appId || detectApp())); } catch (e) {} },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeShow);
  else maybeShow();
})();
