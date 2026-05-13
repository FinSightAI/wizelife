/**
 * Shared WL_TR dictionary for portal landing pages (wize-ai.html, travel.html,
 * tax-compare.html, dashboard mini-flows). These pages don't have their own
 * page-specific dict; this file gives wl-text-i18n.js something to work with.
 *
 * Each string is keyed by its Hebrew source — wl-text-i18n.js reverse-maps
 * the trimmed Hebrew DOM text to a key and swaps in the lang-specific value.
 *
 * If you add a new Hebrew string to one of these pages, add it here in all
 * 4 languages.
 */
(function () {
    // Merge with any existing WL_TR rather than overwrite (so page-specific
    // dicts always win where they overlap).
    var existing = window.WL_TR || {};
    var ensure = function (lang) {
        existing[lang] = existing[lang] || {};
        return existing[lang];
    };

    // Helper: declare a string in all 4 langs. Hebrew is the key into the dict.
    function tr(he, en, pt, es) {
        ensure('he')[he] = he;
        ensure('en')[he] = en;
        ensure('pt')[he] = pt;
        ensure('es')[he] = es;
    }

    // ── WizeAI page ─────────────────────────────────────────────────────────
    tr('WizeAI — יועץ החיים שלך', 'WizeAI — Your Life Advisor', 'WizeAI — Seu Consultor de Vida', 'WizeAI — Tu Consejero de Vida');
    tr('← דאשבורד', '← Dashboard', '← Painel', '← Panel');
    tr('WizeAI דורש חשבון WizeLife', 'WizeAI requires a WizeLife account', 'WizeAI requer uma conta WizeLife', 'WizeAI requiere una cuenta WizeLife');
    tr('יועץ AI שמכיר את הנתונים שלך מכל 5 האפליקציות — כסף, מס, טיסות, בריאות, עסקאות', 'AI advisor that knows your data from all 5 apps — money, tax, flights, health, deals', 'Consultor IA que conhece seus dados de todos os 5 apps — dinheiro, impostos, voos, saúde, negócios', 'Consejero IA que conoce tus datos de las 5 apps — dinero, impuestos, vuelos, salud, ofertas');
    tr('כניסה / הרשמה', 'Sign in / Sign up', 'Entrar / Cadastrar', 'Iniciar sesión / Registrarse');
    tr('התחברות / הרשמה', 'Sign in / Sign up', 'Entrar / Cadastrar', 'Iniciar sesión / Registrarse');
    tr('נתונים מחוברים', 'Connected data', 'Dados conectados', 'Datos conectados');
    tr('טוען...', 'Loading...', 'Carregando...', 'Cargando...');
    tr('WizeAI יודע לענות על', 'WizeAI can answer', 'WizeAI pode responder', 'WizeAI puede responder');
    tr('💰 תכנון פיננסי', '💰 Financial planning', '💰 Planejamento financeiro', '💰 Planificación financiera');
    tr('✈️ טיסות ותקציב נסיעות', '✈️ Flights and travel budget', '✈️ Voos e orçamento de viagem', '✈️ Vuelos y presupuesto de viaje');
    tr('🧾 אופטימיזציית מס', '🧾 Tax optimization', '🧾 Otimização tributária', '🧾 Optimización fiscal');
    tr('🩺 הוצאות בריאות', '🩺 Health expenses', '🩺 Despesas de saúde', '🩺 Gastos de salud');
    tr('🛍️ עסקאות וקניות', '🛍️ Deals and purchases', '🛍️ Negócios e compras', '🛍️ Ofertas y compras');
    tr('היי 👋 אני WizeAI — יועץ שמכיר את כל הנתונים שלך. שאל אותי כל דבר.', "Hi 👋 I'm WizeAI — an advisor that knows all your data. Ask me anything.", 'Oi 👋 Sou o WizeAI — um consultor que conhece todos os seus dados. Pergunte-me qualquer coisa.', 'Hola 👋 Soy WizeAI — un consejero que conoce todos tus datos. Pregúntame lo que quieras.');
    tr('האם אני יכול להרשות לעצמי לטוס?', 'Can I afford to fly?', 'Posso me dar ao luxo de voar?', '¿Puedo permitirme volar?');
    tr('מה ההוצאה הגדולה שלי החודש?', "What's my biggest expense this month?", 'Qual é minha maior despesa este mês?', '¿Cuál es mi mayor gasto este mes?');
    tr('האם אני בדרך ליעד החיסכון?', "Am I on track to my savings goal?", 'Estou no caminho para minha meta de poupança?', '¿Voy camino a mi meta de ahorro?');
    tr('כמה חוסך לי במס?', "How much am I saving on tax?", 'Quanto estou economizando em impostos?', '¿Cuánto estoy ahorrando en impuestos?');
    tr('מנוי WizeLife', 'WizeLife subscription', 'Assinatura WizeLife', 'Suscripción WizeLife');

    // ── WizeTravel landing ──────────────────────────────────────────────────
    tr('WizeTravel — טיסות חכמות עם AI', 'WizeTravel — Smart flights with AI', 'WizeTravel — Voos inteligentes com IA', 'WizeTravel — Vuelos inteligentes con IA');
    tr('מאתחל את מנוע AI...', 'Initializing AI engine...', 'Inicializando motor de IA...', 'Inicializando motor de IA...');
    tr('פתח את האפליקציה ←', 'Open the app ←', 'Abrir o app ←', 'Abrir la app ←');
    tr('AI מנתח 2.3M+ מחירי טיסה בזמן אמת', 'AI analyzes 2.3M+ flight prices in real time', 'IA analisa 2,3M+ preços de voos em tempo real', 'IA analiza 2,3M+ precios de vuelos en tiempo real');
    tr('חיפוש', 'Search', 'Pesquisar', 'Buscar');
    tr('חיפוש טיסות', 'Search flights', 'Pesquisar voos', 'Buscar vuelos');
    tr('מסלולים שמורים', 'Saved routes', 'Rotas salvas', 'Rutas guardadas');
    tr('התראות מחיר', 'Price alerts', 'Alertas de preço', 'Alertas de precio');
    tr('ניתוח', 'Analysis', 'Análise', 'Análisis');
    tr('מגמות מחיר', 'Price trends', 'Tendências de preço', 'Tendencias de precio');
    tr('✈ תל אביב (TLV)', '✈ Tel Aviv (TLV)', '✈ Tel Aviv (TLV)', '✈ Tel Aviv (TLV)');
    tr('🗺 ברצלונה (BCN)', '🗺 Barcelona (BCN)', '🗺 Barcelona (BCN)', '🗺 Barcelona (BCN)');
    tr('📅 15 מרץ – 22 מרץ', '📅 Mar 15 – Mar 22', '📅 15 mar – 22 mar', '📅 15 mar – 22 mar');
    tr('👤 2 נוסעים', '👤 2 passengers', '👤 2 passageiros', '👤 2 pasajeros');
    tr('חפש', 'Search', 'Pesquisar', 'Buscar');
    tr('מסלולים נסרקו', 'Routes scanned', 'Rotas escaneadas', 'Rutas escaneadas');
    tr('טוען המלצות...', 'Loading recommendations...', 'Carregando recomendações...', 'Cargando recomendaciones...');
    tr('מחיר יורד — הזמן עכשיו ↓', 'Price dropping — book now ↓', 'Preço caindo — reserve agora ↓', 'Precio bajando — reserva ahora ↓');
    tr('עם עצירה חוסכת', 'With money-saving stopover', 'Com escala econômica', 'Con escala que ahorra');
    tr('— מומלצת לנסיעה ללא מטען.', '— recommended for carry-on travel.', '— recomendado para viagem sem bagagem.', '— recomendado para viaje sin equipaje.');
    tr('חיסכון פוטנציאלי', 'Potential savings', 'Economia potencial', 'Ahorro potencial');

    // ── WizeTax compare landing ─────────────────────────────────────────────
    tr('WizeTax — השוואת מסים בין מדינות | WizeLife', 'WizeTax — Country tax comparison | WizeLife', 'WizeTax — Comparação de impostos entre países | WizeLife', 'WizeTax — Comparación de impuestos entre países | WizeLife');
    tr('השוואת מסים בין מדינות', 'Country tax comparison', 'Comparação de impostos entre países', 'Comparación de impuestos entre países');
    tr('כלים', 'Tools', 'Ferramentas', 'Herramientas');
    tr('השוואת מדינות', 'Country comparison', 'Comparação de países', 'Comparación de países');
    tr('סימולטור הכנסה', 'Income simulator', 'Simulador de renda', 'Simulador de ingresos');
    tr('ציר זמן מס', 'Tax timeline', 'Linha do tempo fiscal', 'Línea temporal fiscal');
    tr('יועץ AI', 'AI advisor', 'Consultor IA', 'Consejero IA');
    tr('עוד', 'More', 'Mais', 'Más');
    tr('דוחות', 'Reports', 'Relatórios', 'Informes');
    tr('יש להתחבר', 'Sign-in required', 'Necessário fazer login', 'Inicio de sesión requerido');
    tr('כדי להשוות מסים בין מדינות עם הנתונים שלך', 'to compare taxes across countries with your data', 'para comparar impostos entre países com seus dados', 'para comparar impuestos entre países con tus datos');
    tr('הזן משכורת ברוטו חודשית וקבל תמונה מלאה — מה יישאר לך נטו בכל מדינה', 'Enter monthly gross salary and get the full picture — what stays net in each country', 'Insira o salário bruto mensal e obtenha o quadro completo — o que sobra líquido em cada país', 'Ingresa el salario bruto mensual y obtén el panorama completo — qué queda neto en cada país');
    tr('נתוני הכנסה', 'Income data', 'Dados de renda', 'Datos de ingresos');
    tr('משכורת ברוטו חודשית (₪)', 'Monthly gross salary (₪)', 'Salário bruto mensal (₪)', 'Salario bruto mensual (₪)');
    tr('נשוי/אה + בן/בת זוג עובד/ת', 'Married + working spouse', 'Casado(a) + cônjuge trabalhando', 'Casado/a + cónyuge trabajando');
    tr('בחר מדינות להשוואה', 'Select countries to compare', 'Selecione países para comparar', 'Selecciona países para comparar');
    tr('השווה עכשיו →', 'Compare now →', 'Comparar agora →', 'Comparar ahora →');
    tr('תוצאות ההשוואה', 'Comparison results', 'Resultados da comparação', 'Resultados de la comparación');
    tr('ברוטו (מקומי)', 'Gross (local)', 'Bruto (local)', 'Bruto (local)');
    tr('ביטוח לאומי + בריאות', 'Social security + health', 'Previdência + saúde', 'Seguridad social + salud');
    tr('שיעור אפקטיבי', 'Effective rate', 'Taxa efetiva', 'Tasa efectiva');
    tr('יתרון מול ישראל', 'Vs Israel advantage', 'Vantagem vs Israel', 'Ventaja vs Israel');
    tr('✓ נטען מ-WizeMoney', '✓ Loaded from WizeMoney', '✓ Carregado do WizeMoney', '✓ Cargado de WizeMoney');
    tr('✓ נתונים מאומתים 2025', '✓ Verified 2025 data', '✓ Dados verificados 2025', '✓ Datos verificados 2025');
    tr('מקורות: PwC Worldwide Tax Summaries · OECD · KPMG · רשויות מס רשמיות', 'Sources: PwC Worldwide Tax Summaries · OECD · KPMG · official tax authorities', 'Fontes: PwC Worldwide Tax Summaries · OECD · KPMG · autoridades fiscais oficiais', 'Fuentes: PwC Worldwide Tax Summaries · OECD · KPMG · autoridades fiscales oficiales');

    window.WL_TR = existing;
})();
