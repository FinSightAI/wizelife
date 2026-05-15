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

    // ── COMMON UI VOCABULARY (cross-page, deepest leak fix) ─────────────────
    tr('שלח', 'Send', 'Enviar', 'Enviar');
    tr('ביטול', 'Cancel', 'Cancelar', 'Cancelar');
    tr('הוסף', 'Add', 'Adicionar', 'Agregar');
    tr('דלג', 'Skip', 'Pular', 'Saltar');
    tr('הבנתי', 'Got it', 'Entendi', 'Entendido');
    tr('שם', 'Name', 'Nome', 'Nombre');
    tr('יעד', 'Destination', 'Destino', 'Destino');
    tr('סוג', 'Type', 'Tipo', 'Tipo');
    tr('צבע', 'Color', 'Cor', 'Color');
    tr('משך', 'Duration', 'Duração', 'Duración');
    tr('פרופיל', 'Profile', 'Perfil', 'Perfil');
    tr('זיכרון', 'Memory', 'Memória', 'Memoria');
    tr('אמוג\'י', 'Emoji', 'Emoji', 'Emoji');
    tr('🛠 כלים', '🛠 Tools', '🛠 Ferramentas', '🛠 Herramientas');
    tr('-- בחר --', '-- Select --', '-- Selecionar --', '-- Seleccionar --');
    tr('בחר הכל', 'Select all', 'Selecionar tudo', 'Seleccionar todo');
    tr('לוחית.', 'Plate.', 'Placa.', 'Placa.');
    tr('או מ-', 'Or from', 'Ou de', 'O de');
    tr('הורד:', 'Download:', 'Baixar:', 'Descargar:');
    tr('הפעל:', 'Run:', 'Executar:', 'Ejecutar:');
    tr('מודל:', 'Model:', 'Modelo:', 'Modelo:');
    tr('ללא', 'None', 'Nenhum', 'Ninguno');

    // ── Family / household onboarding (WizeMoney) ──
    tr('דשבורד משפחתי', 'Family dashboard', 'Painel familiar', 'Panel familiar');
    tr('👨‍👩‍👧‍👦 הוסף בן משפחה', '👨‍👩‍👧‍👦 Add family member', '👨‍👩‍👧‍👦 Adicionar membro da família', '👨‍👩‍👧‍👦 Agregar familiar');
    tr('👤 מבוגר', '👤 Adult', '👤 Adulto', '👤 Adulto');
    tr('👧 ילד/ה', '👧 Child', '👧 Criança', '👧 Niño/a');
    tr('ילדים', 'Children', 'Filhos', 'Hijos');
    tr('📋 העתק', '📋 Copy', '📋 Copiar', '📋 Copiar');

    // ── Family / marital status ──
    tr('מצב משפחתי', 'Family status', 'Estado civil', 'Estado civil');
    tr('רווק/ה', 'Single', 'Solteiro(a)', 'Soltero/a');
    tr('נשוי/אה', 'Married', 'Casado(a)', 'Casado/a');

    // ── Country names with flags (tax-compare landing) ──
    tr('🇮🇱 ישראל', '🇮🇱 Israel', '🇮🇱 Israel', '🇮🇱 Israel');
    tr('🇺🇸 ארה"ב (פדרלי בלבד)', '🇺🇸 USA (federal only)', '🇺🇸 EUA (federal apenas)', '🇺🇸 EE.UU. (solo federal)');
    tr('🇨🇭 שווייץ (ממוצע קנטון)', '🇨🇭 Switzerland (cantonal avg)', '🇨🇭 Suíça (média cantonal)', '🇨🇭 Suiza (promedio cantonal)');
    tr('🇦🇪 איחוד האמירויות', '🇦🇪 UAE', '🇦🇪 Emirados Árabes Unidos', '🇦🇪 Emiratos Árabes Unidos');
    tr('🇵🇹 פורטוגל', '🇵🇹 Portugal', '🇵🇹 Portugal', '🇵🇹 Portugal');
    tr('🇪🇸 ספרד', '🇪🇸 Spain', '🇪🇸 Espanha', '🇪🇸 España');
    tr('🇫🇷 צרפת', '🇫🇷 France', '🇫🇷 França', '🇫🇷 Francia');
    tr('🇩🇪 גרמניה', '🇩🇪 Germany', '🇩🇪 Alemanha', '🇩🇪 Alemania');
    tr('🇬🇧 בריטניה', '🇬🇧 UK', '🇬🇧 Reino Unido', '🇬🇧 Reino Unido');
    tr('🇳🇱 הולנד', '🇳🇱 Netherlands', '🇳🇱 Países Baixos', '🇳🇱 Países Bajos');
    tr('🇮🇪 אירלנד', '🇮🇪 Ireland', '🇮🇪 Irlanda', '🇮🇪 Irlanda');
    tr('🇪🇪 אסטוניה', '🇪🇪 Estonia', '🇪🇪 Estônia', '🇪🇪 Estonia');
    tr('🇵🇱 פולין', '🇵🇱 Poland', '🇵🇱 Polônia', '🇵🇱 Polonia');
    tr('🇨🇿 צ\'כיה', '🇨🇿 Czechia', '🇨🇿 Tchéquia', '🇨🇿 Chequia');
    tr('🇸🇬 סינגפור', '🇸🇬 Singapore', '🇸🇬 Singapura', '🇸🇬 Singapur');
    tr('🇨🇦 קנדה (פדרלי)', '🇨🇦 Canada (federal)', '🇨🇦 Canadá (federal)', '🇨🇦 Canadá (federal)');
    tr('🇦🇺 אוסטרליה', '🇦🇺 Australia', '🇦🇺 Austrália', '🇦🇺 Australia');
    tr('🇳🇿 ניו זילנד', '🇳🇿 New Zealand', '🇳🇿 Nova Zelândia', '🇳🇿 Nueva Zelanda');
    tr('🇯🇵 יפן', '🇯🇵 Japan', '🇯🇵 Japão', '🇯🇵 Japón');
    tr('🇰🇷 דרום קוריאה', '🇰🇷 South Korea', '🇰🇷 Coreia do Sul', '🇰🇷 Corea del Sur');
    tr('🇨🇾 קפריסין', '🇨🇾 Cyprus', '🇨🇾 Chipre', '🇨🇾 Chipre');
    tr('🇲🇹 מלטה', '🇲🇹 Malta', '🇲🇹 Malta', '🇲🇹 Malta');
    tr('🇲🇽 מקסיקו', '🇲🇽 Mexico', '🇲🇽 México', '🇲🇽 México');
    tr('🇧🇷 ברזיל', '🇧🇷 Brazil', '🇧🇷 Brasil', '🇧🇷 Brasil');
    tr('🇹🇭 תאילנד', '🇹🇭 Thailand', '🇹🇭 Tailândia', '🇹🇭 Tailandia');
    tr('🇬🇷 יוון', '🇬🇷 Greece', '🇬🇷 Grécia', '🇬🇷 Grecia');
    tr('🇮🇹 איטליה', '🇮🇹 Italy', '🇮🇹 Itália', '🇮🇹 Italia');
    tr('🇧🇪 בלגיה', '🇧🇪 Belgium', '🇧🇪 Bélgica', '🇧🇪 Bélgica');
    tr('🇸🇪 שוודיה', '🇸🇪 Sweden', '🇸🇪 Suécia', '🇸🇪 Suecia');
    tr('🇳🇴 נורווגיה', '🇳🇴 Norway', '🇳🇴 Noruega', '🇳🇴 Noruega');
    tr('🇩🇰 דנמרק', '🇩🇰 Denmark', '🇩🇰 Dinamarca', '🇩🇰 Dinamarca');
    tr('🇫🇮 פינלנד', '🇫🇮 Finland', '🇫🇮 Finlândia', '🇫🇮 Finlandia');
    tr('🇮🇸 איסלנד', '🇮🇸 Iceland', '🇮🇸 Islândia', '🇮🇸 Islandia');
    tr('🇺🇾 אורוגוואי', '🇺🇾 Uruguay', '🇺🇾 Uruguai', '🇺🇾 Uruguay');
    tr('🇦🇷 ארגנטינה', '🇦🇷 Argentina', '🇦🇷 Argentina', '🇦🇷 Argentina');
    tr('🇨🇱 צ\'ילה', '🇨🇱 Chile', '🇨🇱 Chile', '🇨🇱 Chile');
    tr('🇨🇴 קולומביה', '🇨🇴 Colombia', '🇨🇴 Colômbia', '🇨🇴 Colombia');

    // Common form labels
    tr('מדינה', 'Country', 'País', 'País');
    tr('מחלקה', 'Class', 'Classe', 'Clase');
    tr('מטבע', 'Currency', 'Moeda', 'Moneda');
    tr('שפה', 'Language', 'Idioma', 'Idioma');
    tr('מין', 'Gender', 'Gênero', 'Género');
    tr('גיל', 'Age', 'Idade', 'Edad');

    // ── WizeLife dashboard (logged-in main page) ────────────────────────────
    tr('הכלים שלך', 'Your tools', 'Suas ferramentas', 'Tus herramientas');
    tr('דשבורד פיננסי', 'Financial dashboard', 'Painel financeiro', 'Panel financiero');
    tr('יועץ מס גלובלי', 'Global tax advisor', 'Consultor fiscal global', 'Consejero fiscal global');
    tr('מתכנן טיולים AI', 'AI trip planner', 'Planejador de viagens IA', 'Planificador de viajes IA');
    tr('מעקב בריאות', 'Health tracker', 'Monitor de saúde', 'Monitor de salud');
    tr('מנתח נדל"ן', 'Real-estate analyzer', 'Analisador imobiliário', 'Analizador inmobiliario');
    tr('יועץ רב-תחומי', 'Multi-domain advisor', 'Consultor multidomínio', 'Consejero multidominio');
    tr('AI שמכיר את הנתונים שלך מכל 5 האפליקציות — שאל כל דבר.', "AI that knows your data across all 5 apps — ask anything.", 'IA que conhece seus dados em todos os 5 apps — pergunte qualquer coisa.', 'IA que conoce tus datos en las 5 apps — pregunta lo que quieras.');
    tr('חשבון', 'Account', 'Conta', 'Cuenta');
    tr('פרופיל', 'Profile', 'Perfil', 'Perfil');
    tr('אימייל', 'Email', 'Email', 'Correo');
    tr('חבר מאז', 'Member since', 'Membro desde', 'Miembro desde');
    tr('תוכנית', 'Plan', 'Plano', 'Plan');
    tr('חינם', 'Free', 'Grátis', 'Gratis');
    tr('שדרג ל-Pro', 'Upgrade to Pro', 'Atualizar para Pro', 'Actualizar a Pro');
    tr('הפעל', 'Activate', 'Ativar', 'Activar');
    tr('יש לך קוד מחבר, שותף או קמפיין? הפעל כאן ל-Pro/YOLO מיידי.', 'Have a friend, partner or campaign code? Redeem here for instant Pro/YOLO.', 'Tem um código de amigo, parceiro ou campanha? Resgate aqui para Pro/YOLO instantâneo.', '¿Tienes un código de amigo, socio o campaña? Canjéalo aquí para Pro/YOLO instantáneo.');
    tr('מנוי', 'Subscription', 'Assinatura', 'Suscripción');
    tr('הזמן חברים ושתף משוב', 'Invite friends & share feedback', 'Convide amigos & compartilhe feedback', 'Invita amigos & comparte feedback');
    tr('שתף את הקישור שלך. כשחבר משדרג ל-PRO, אתה מקבל חודש PRO חינם.', 'Share your link. When a friend upgrades to PRO, you get a free month of PRO.', 'Compartilhe seu link. Quando um amigo atualizar para PRO, você ganha um mês PRO grátis.', 'Comparte tu link. Cuando un amigo se actualice a PRO, recibes un mes de PRO gratis.');
    tr('ספר לנו מה עובד ומה חסר. כל הערה נקראת על ידי הצוות שלנו.', "Tell us what works and what's missing. Every comment is read by our team.", 'Conte-nos o que funciona e o que falta. Cada comentário é lido pela nossa equipe.', 'Cuéntanos qué funciona y qué falta. Cada comentario es leído por nuestro equipo.');
    tr('פרטיות וזכויות נתונים', 'Privacy & data rights', 'Privacidade & direitos de dados', 'Privacidad & derechos de datos');
    tr('הנתונים שלך — שלך. תחת חוק הגנת הפרטיות הישראלי וה-GDPR, אתה יכול לייצא', 'Your data — yours. Under Israeli Privacy Protection Law and GDPR, you can export', 'Seus dados — seus. Sob a Lei de Privacidade Israelense e o GDPR, você pode exportar', 'Tus datos — tuyos. Bajo la Ley Israelí de Privacidad y el GDPR, puedes exportar');
    tr('התנתק', 'Sign out', 'Sair', 'Cerrar sesión');

    // ── tax-compare landing (additional strings caught in 2026-05-13 audit) ──
    tr('מס הכנסה', 'Income tax', 'Imposto de renda', 'Impuesto sobre la renta');
    tr('נטו חודשי', 'Monthly net', 'Líquido mensal', 'Neto mensual');
    tr('המלצות AI', 'AI recommendations', 'Recomendações de IA', 'Recomendaciones de IA');
    tr('ביטוח לאומי', 'Social security', 'Previdência', 'Seguridad social');
    tr('דמי בריאות', 'Health tax', 'Imposto de saúde', 'Impuesto sanitario');
    tr('הכנסה ברוטו', 'Gross income', 'Renda bruta', 'Ingreso bruto');
    tr('הכנסה נטו', 'Net income', 'Renda líquida', 'Ingreso neto');
    tr('מחשב...', 'Calculating...', 'Calculando...', 'Calculando...');

    // ── Input placeholders ─────────────────────────────────────────────────
    tr('כינוי — איך לקרוא לך? (Ofi, נועה, 007…)', 'Nickname — what should we call you? (Ofi, Noa, 007…)', 'Apelido — como devemos te chamar? (Ofi, Noa, 007…)', 'Apodo — ¿cómo deberíamos llamarte? (Ofi, Noa, 007…)');
    tr('שאל כל דבר על הכספים, הטיסות, המס שלך...', 'Ask anything about your money, flights, tax…', 'Pergunte qualquer coisa sobre seu dinheiro, voos, impostos…', 'Pregunta lo que sea sobre tu dinero, vuelos, impuestos…');
    tr('לדוגמה 25000', 'e.g. 25000', 'ex. 25000', 'p.ej. 25000');
    tr('עברית', 'Hebrew', 'Hebraico', 'Hebreo');

    // ── Family-member onboarding (WizeMoney — biggest leak source) ─────────
    tr('הוסף בן משפחה', 'Add family member', 'Adicionar membro da família', 'Agregar familiar');
    tr('הוסף בן/בת משפחה', 'Add family member', 'Adicionar membro da família', 'Agregar familiar');
    tr('בן/בת זוג', 'Spouse', 'Cônjuge', 'Cónyuge');
    tr('הורה', 'Parent', 'Pai/Mãe', 'Padre/Madre');
    tr('סבא/סבתא', 'Grandparent', 'Avô/Avó', 'Abuelo/Abuela');
    tr('בן/בת', 'Son/Daughter', 'Filho/Filha', 'Hijo/Hija');
    tr('אח/אחות', 'Sibling', 'Irmão/Irmã', 'Hermano/Hermana');
    tr('שם בן המשפחה', 'Family member name', 'Nome do familiar', 'Nombre del familiar');
    tr('יחס משפחתי', 'Relationship', 'Relação', 'Relación');
    tr('שמירה', 'Save', 'Salvar', 'Guardar');
    tr('עדכון', 'Update', 'Atualizar', 'Actualizar');
    tr('מחיקה', 'Delete', 'Excluir', 'Eliminar');
    tr('עריכה', 'Edit', 'Editar', 'Editar');
    tr('סגירה', 'Close', 'Fechar', 'Cerrar');
    tr('אישור', 'Confirm', 'Confirmar', 'Confirmar');
    tr('הוסף', 'Add', 'Adicionar', 'Agregar');
    tr('הוסיפ/י', 'Add', 'Adicionar', 'Agregar');
    tr('שמור', 'Save', 'Salvar', 'Guardar');
    tr('בטל', 'Cancel', 'Cancelar', 'Cancelar');
    tr('הבא', 'Next', 'Próximo', 'Siguiente');
    tr('הקודם', 'Previous', 'Anterior', 'Anterior');

    // Travel flight UI extras
    tr('15–22 מרץ', 'Mar 15 – 22', '15–22 mar', '15–22 mar');
    tr('נוסעים', 'passengers', 'passageiros', 'pasajeros');
    tr('2 מבוגרים', '2 adults', '2 adultos', '2 adultos');

    // ── Flight UI (travel.html) ──
    tr('חברת תעופה', 'Airline', 'Companhia aérea', 'Aerolínea');
    tr('יציאה', 'Departure', 'Saída', 'Salida');
    tr('הגעה', 'Arrival', 'Chegada', 'Llegada');
    tr('ישיר', '1 stop', 'Direto', 'Directo');
    tr('1 עצירה', '1 stop', '1 escala', '1 escala');
    tr('עצירות', 'stops', 'escalas', 'escalas');
    tr('הכי זול', 'Cheapest', 'Mais barato', 'Más barato');
    tr('מחיר הכי זול', 'Lowest price', 'Menor preço', 'Precio más bajo');
    tr('מחיר לנוסע', 'Price per traveler', 'Preço por passageiro', 'Precio por viajero');
    tr('זול ביותר', 'Cheapest', 'Mais barato', 'Más barato');
    tr('זולות בממוצע', 'cheaper on average', 'mais baratas em média', 'más baratas en promedio');
    tr('−18% ממוצע', '−18% average', '−18% média', '−18% promedio');
    tr('↑ 23 חדש', '↑ 23 new', '↑ 23 novos', '↑ 23 nuevos');
    tr('שלישי בבוקר', 'Tuesday morning', 'Terça-feira de manhã', 'Martes por la mañana');
    tr('טיסות ביום', 'flights/day', 'voos/dia', 'vuelos/día');
    tr('הטיסה של', 'Flight of', 'Voo de', 'Vuelo de');
    tr('תאריכים', 'Dates', 'Datas', 'Fechas');

    // ── Misc (medical, network, reports) ──
    tr('דוח PDF', 'PDF report', 'Relatório PDF', 'Informe PDF');
    tr('ציר זמן', 'Timeline', 'Linha do tempo', 'Línea de tiempo');
    tr('תמליל השיחה', 'Conversation transcript', 'Transcrição da conversa', 'Transcripción de la conversación');
    tr('ניתוח דימות', 'Imaging analysis', 'Análise de imagem', 'Análisis de imagen');
    tr('🫁 רנטגן', '🫁 X-ray', '🫁 Raio-X', '🫁 Rayos X');
    tr('🔊 אולטרסאונד', '🔊 Ultrasound', '🔊 Ultrassom', '🔊 Ultrasonido');
    tr('🔬 עור', '🔬 Skin', '🔬 Pele', '🔬 Piel');
    tr('שיתוף עם רופא', 'Share with doctor', 'Compartilhar com médico', 'Compartir con médico');
    tr('בדיקת תרופות', 'Drug check', 'Verificação de medicamentos', 'Verificación de medicamentos');
    tr('לניתוח תמונות:', 'For image analysis:', 'Para análise de imagens:', 'Para análisis de imágenes:');
    tr('העלה בדיקה כדי לחשב', 'Upload a test to calculate', 'Envie um exame para calcular', 'Sube un examen para calcular');
    tr('Mistral 7B (חינמי)', 'Mistral 7B (free)', 'Mistral 7B (grátis)', 'Mistral 7B (gratis)');
    tr('Mistral 7B (חינמי', 'Mistral 7B (free', 'Mistral 7B (grátis', 'Mistral 7B (gratis');

    // ── Connectivity / data freshness ──
    tr('אין חיבור לאינטרנט — האפליקציה פועלת במצב מקוון-לא', 'No internet connection — the app is working in offline mode', 'Sem conexão à internet — o app está funcionando em modo offline', 'Sin conexión a internet — la app funciona en modo offline');
    tr('נתוני TheMarker עודכנו לדצמבר 2025', 'TheMarker data updated to December 2025', 'Dados do TheMarker atualizados para dezembro de 2025', 'Datos de TheMarker actualizados a diciembre de 2025');
    tr('נתוני iGemel-Net עודכנו לדצמבר 2025', 'iGemel-Net data updated to December 2025', 'Dados iGemel-Net atualizados para dezembro de 2025', 'Datos iGemel-Net actualizados a diciembre de 2025');


    // ── Legal: §10 / §11 / §11A new ToS sections (2026-05-15) ──
    tr('10. הגבלת אחריות', '10. Limitation of Liability', '10. Limitação de Responsabilidade', '10. Limitación de Responsabilidad');
    tr('11. שיפוי', '11. Indemnification', '11. Indenização', '11. Indemnización');
    tr('11A. נטילת סיכון ומשתמש מתוחכם', '11A. Assumption of Risk & Sophisticated User', '11A. Assunção de Risco e Usuário Sofisticado', '11A. Asunción de Riesgo y Usuario Sofisticado');
    tr('סעיף זה מגביל את אחריות WizeLife כלפיך. קרא בעיון.', 'READ THIS SECTION CAREFULLY — IT LIMITS WIZELIFE\'S LIABILITY TO YOU.', 'LEIA ESTA SEÇÃO COM ATENÇÃO — ELA LIMITA A RESPONSABILIDADE DA WIZELIFE.', 'LEE ESTA SECCIÓN CON ATENCIÓN — LIMITA LA RESPONSABILIDAD DE WIZELIFE.');
    tr('במידה המרבית המותרת על פי הדין:', 'To the maximum extent permitted by applicable law:', 'Na máxima extensão permitida pela lei aplicável:', 'En la máxima medida permitida por la ley aplicable:');
    tr('השירות, לרבות כל פלטי ה-AI, מסופק "כפי שהוא" ו"ככל שזמין", על כל פגמיו, שגיאותיו ואי-דיוקיו, ללא אחריות מכל סוג שהוא — מפורשת, משתמעת, חוקית או אחרת — לרבות אחריות לסחירות, התאמה למטרה מסוימת, אי-הפרה, דיוק, שלמות, עדכניות, מהימנות או היעדר "הזיות" (hallucinations) של ה-AI.', 'The service, including all AI outputs, is provided "AS IS" and "AS AVAILABLE", with all faults, errors, and inaccuracies, and without any warranty of any kind — whether express, implied, statutory, or otherwise — including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, completeness, currency, reliability, or freedom from AI "hallucinations".', 'O serviço, incluindo todas as saídas de IA, é fornecido "COMO ESTÁ" e "CONFORME DISPONIBILIDADE", com todas as falhas, erros e imprecisões, e sem qualquer garantia de qualquer tipo — expressa, implícita, estatutária ou outra — incluindo garantias de comercialização, adequação a uma finalidade específica, não violação, precisão, integridade, atualidade, confiabilidade ou ausência de "alucinações" de IA.', 'El servicio, incluidas todas las salidas de IA, se proporciona "TAL CUAL" y "SEGÚN DISPONIBILIDAD", con todos sus defectos, errores e inexactitudes, y sin garantía alguna — expresa, implícita, legal u otra — incluidas garantías de comerciabilidad, idoneidad para un propósito particular, no infracción, exactitud, integridad, vigencia, fiabilidad o ausencia de "alucinaciones" de IA.');
    tr('WizeLife, מפעיליה, עובדיה, קבלניה, שלוחותיה וספקיה לא יהיו אחראים לכל נזק ישיר, עקיף, מקרי, מיוחד, תוצאתי, עונשי או מופתי — לרבות וללא הגבלה: אובדן רווחים או הכנסות, אובדן נתונים, אובדן ערך השקעה או מסחר, הפסדי שוק, חסכון שלא מומש, תשואות שלא מומשו, הזדמנויות שהוחמצו, פגיעה רפואית, נזק גופני או נפשי, קנסות מס, קנסות רגולטוריים, שכר טרחה מקצועי או כל הפסד אחר — הנובע מ-(א) שימוש בשירות או אי-יכולת להשתמש בו, (ב) הסתמכות על פלט AI, (ג) כל החלטה שקיבלת על בסיס השירות, (ד) תוכן צד שלישי, השבתת שירות או כשל ספק (Firebase, Render, Vercel, Cloudflare, Anthropic, Google, OpenRouter, Tavily, Resend וכו\').', 'WizeLife, its operators, employees, contractors, affiliates, and suppliers shall NOT be liable for any direct, indirect, incidental, special, consequential, exemplary, or punitive damages — including but not limited to: loss of profits or revenue, loss of data, loss of investment or trading value, market losses, foregone savings, foregone returns, missed opportunities, medical injury, physical or emotional harm, tax penalties, regulatory fines, professional fees, or any other loss — arising from (a) your use of or inability to use the service, (b) reliance on AI output, (c) any decision you took based on the service, (d) third-party content, service outage, or vendor failure (Firebase, Render, Vercel, Cloudflare, Anthropic, Google, OpenRouter, Tavily, Resend, etc.).', 'WizeLife, seus operadores, funcionários, contratados, afiliados e fornecedores NÃO serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais, exemplares ou punitivos — incluindo, sem limitação: perda de lucros ou receitas, perda de dados, perda de valor de investimento ou negociação, perdas de mercado, economias não realizadas, retornos não realizados, oportunidades perdidas, lesão médica, dano físico ou emocional, multas fiscais, multas regulatórias, honorários profissionais ou qualquer outra perda — decorrentes de (a) seu uso ou incapacidade de uso do serviço, (b) confiança em saída de IA, (c) qualquer decisão tomada com base no serviço, (d) conteúdo de terceiros, indisponibilidade de serviço ou falha de fornecedor (Firebase, Render, Vercel, Cloudflare, Anthropic, Google, OpenRouter, Tavily, Resend, etc.).', 'WizeLife, sus operadores, empleados, contratistas, afiliados y proveedores NO serán responsables por daños directos, indirectos, incidentales, especiales, consecuentes, ejemplares o punitivos — incluyendo, sin limitación: pérdida de beneficios o ingresos, pérdida de datos, pérdida de valor de inversión o negociación, pérdidas de mercado, ahorros no realizados, rendimientos no realizados, oportunidades perdidas, lesión médica, daño físico o emocional, multas fiscales, multas regulatorias, honorarios profesionales o cualquier otra pérdida — derivados de (a) tu uso o imposibilidad de uso del servicio, (b) confianza en la salida de IA, (c) cualquier decisión que tomaste basada en el servicio, (d) contenido de terceros, interrupción del servicio o falla de proveedor (Firebase, Render, Vercel, Cloudflare, Anthropic, Google, OpenRouter, Tavily, Resend, etc.).');
    tr('הגבלה זו חלה גם אם WizeLife הוזהרה על אפשרות נזקים אלה, גם אם תרופה מסוימת כושלת במטרתה המהותית, וללא תלות בעילת התביעה (חוזה, נזיקין, אחריות מוחלטת, חוק או אחר).', 'This limitation applies even if WizeLife was advised of the possibility of such damages, even if a remedy fails of its essential purpose, and regardless of the theory of liability (contract, tort, strict liability, statute, or otherwise).', 'Esta limitação aplica-se mesmo que a WizeLife tenha sido avisada da possibilidade de tais danos, mesmo que uma reparação falhe em seu propósito essencial, e independentemente da teoria de responsabilidade (contrato, ato ilícito, responsabilidade objetiva, lei ou outro).', 'Esta limitación aplica incluso si WizeLife fue advertida de la posibilidad de tales daños, incluso si un remedio falla en su propósito esencial, e independientemente de la teoría de responsabilidad (contrato, agravio, responsabilidad objetiva, ley u otra).');
    tr('תקרת אחריות מצטברת. סך אחריותנו המצטברת כלפיך בגין כלל התביעות הנובעות מהשירות בכל תקופה של 12 חודשים לא תעלה על הגבוה מבין: (א) הסכום הכולל ששילמת בפועל ל-WizeLife ב-12 החודשים שקדמו לאירוע, או (ב) 100 ש"ח עבור משתמשי מסלול חינמי. תקרה זו מהווה את מלוא הסעד הבלעדי.', 'Aggregate liability cap. Our total cumulative liability to you for all claims arising from the service in any 12-month period shall not exceed the greater of: (a) the total amount you actually paid to WizeLife in the 12 months preceding the event, or (b) NIS 100 for free-tier users. This cap is the entire and exclusive remedy.', 'Limite agregado de responsabilidade. Nossa responsabilidade cumulativa total para com você por todas as reivindicações decorrentes do serviço em qualquer período de 12 meses não excederá o maior entre: (a) o valor total que você realmente pagou à WizeLife nos 12 meses anteriores ao evento, ou (b) NIS 100 para usuários de nível gratuito. Este limite constitui a totalidade do remédio exclusivo.', 'Tope de responsabilidad agregada. Nuestra responsabilidad acumulativa total hacia ti por todas las reclamaciones derivadas del servicio en cualquier período de 12 meses no excederá la mayor de: (a) la cantidad total que efectivamente pagaste a WizeLife en los 12 meses anteriores al evento, o (b) 100 NIS para usuarios del nivel gratuito. Este tope constituye la totalidad del remedio exclusivo.');
    tr('הגבלות לפי תחום. אתה מאשר שאתה נושא באחריות בלעדית, ו-WizeLife מסירה כל אחריות הנובעת מ: החלטות בענייני הגשת מס או תכנון מס (WizeTax/WizeMoney); החלטות השקעה, מסחר או תיק (WizeMoney); החלטות רפואיות, אבחון, טיפול או תרופות (WizeHealth); החלטות רכישה, מכירה, השכרה, מימון או תכנון בנדל"ן (WizeDeal); החלטות הזמנת נסיעות, ויזה או תכנון טיול (WizeTravel).', 'Per-domain carve-outs. You acknowledge sole responsibility, and WizeLife disclaims all liability arising from: tax-filing or tax-planning decisions (WizeTax/WizeMoney); investment, trading, or portfolio decisions (WizeMoney); medical, diagnostic, treatment, or medication decisions (WizeHealth); real-estate purchase, sale, rental, financing, or zoning decisions (WizeDeal); travel booking, visa, or trip-planning decisions (WizeTravel).', 'Exclusões por domínio. Você reconhece a responsabilidade exclusiva, e a WizeLife isenta-se de toda responsabilidade decorrente de: decisões de declaração ou planejamento fiscal (WizeTax/WizeMoney); decisões de investimento, negociação ou portfólio (WizeMoney); decisões médicas, diagnósticas, de tratamento ou medicação (WizeHealth); decisões de compra, venda, aluguel, financiamento ou zoneamento imobiliário (WizeDeal); decisões de reserva de viagem, visto ou planejamento de viagem (WizeTravel).', 'Exclusiones por dominio. Reconoces la responsabilidad exclusiva, y WizeLife declina toda responsabilidad derivada de: decisiones de declaración o planificación fiscal (WizeTax/WizeMoney); decisiones de inversión, trading o cartera (WizeMoney); decisiones médicas, diagnósticas, de tratamiento o medicación (WizeHealth); decisiones de compra, venta, alquiler, financiación o zonificación inmobiliaria (WizeDeal); decisiones de reserva de viaje, visa o planificación de viaje (WizeTravel).');
    tr('סייגים שיפוטיים. שיפוטים מסוימים אינם מתירים החרגה או הגבלה של נזקים מסוימים (כגון רשלנות חמורה, מעשה זדון, הונאה, מוות או פציעה אישית). באותם שיפוטים — אחריותנו מוגבלת למידה הקטנה ביותר המותרת בחוק, ויתר הסעיף נותר בתוקפו המלא.', 'Jurisdictional limits. Some jurisdictions do not allow the exclusion or limitation of certain damages (e.g. for gross negligence, wilful misconduct, fraud, death, or personal injury). In such jurisdictions, our liability is limited to the smallest extent permitted by that law, and the remainder of this section continues in full force.', 'Limites jurisdicionais. Algumas jurisdições não permitem a exclusão ou limitação de certos danos (ex.: negligência grave, dolo, fraude, morte ou lesão pessoal). Em tais jurisdições, nossa responsabilidade é limitada à menor extensão permitida pela lei, e o restante desta seção continua em pleno vigor.', 'Límites jurisdiccionales. Algunas jurisdicciones no permiten la exclusión o limitación de ciertos daños (p. ej. negligencia grave, dolo, fraude, muerte o lesión personal). En tales jurisdicciones, nuestra responsabilidad se limita a la menor medida permitida por esa ley, y el resto de esta sección continúa en pleno vigor.');
    tr('אתה מתחייב להגן על WizeLife, מייסדיה, מפעיליה, עובדיה, קבלניה, שלוחותיה, נותני הרישיון שלה וספקיה ("הצדדים המשופים"), ולשפותם ולפטרם מאחריות בגין כל תביעה, דרישה, פעולה, הליך, נזק, אובדן, חבות, פסק דין, פשרה, עלות והוצאה (לרבות שכר טרחת עו"ד סביר, הוצאות משפט ועדים מומחים) הנובעים מ-:', 'You agree to defend, indemnify, and hold harmless WizeLife, its founders, operators, employees, contractors, affiliates, licensors, and suppliers (the "Indemnified Parties") from any and all claims, demands, actions, proceedings, damages, losses, liabilities, judgements, settlements, costs, and expenses (including reasonable attorneys\' fees, court costs, and expert witness fees) arising out of or related to:', 'Você concorda em defender, indenizar e isentar a WizeLife, seus fundadores, operadores, funcionários, contratados, afiliados, licenciadores e fornecedores (as "Partes Indenizadas") de toda e qualquer reivindicação, demanda, ação, processo, dano, perda, responsabilidade, sentença, acordo, custo e despesa (incluindo honorários advocatícios razoáveis, custas judiciais e honorários de testemunhas peritas) decorrentes de ou relacionados a:', 'Aceptas defender, indemnizar y eximir de responsabilidad a WizeLife, sus fundadores, operadores, empleados, contratistas, afiliados, licenciantes y proveedores (las "Partes Indemnizadas") de toda y cualquier reclamación, demanda, acción, procedimiento, daño, pérdida, responsabilidad, sentencia, acuerdo, costo y gasto (incluidos honorarios razonables de abogados, costas judiciales y honorarios de testigos expertos) que surjan de o estén relacionados con:');
    tr('בשימושך ב-WizeLife אתה מצהיר ומתחייב כי:', 'By using WizeLife, you represent and warrant that:', 'Ao usar a WizeLife, você declara e garante que:', 'Al usar WizeLife, declaras y garantizas que:');
    tr('אתה מבין שמודלי AI יכולים לייצר מידע שגוי, חסר, מוטה או בדוי ("הזיות"), ואתה מתחייב לאמת כל פלט מהותי אצל בעל מקצוע מורשה לפני שתסתמך עליו.', 'You understand that AI models can produce inaccurate, incomplete, biased, or fabricated information ("hallucinations"), and you agree to verify every material output with a licensed professional before relying upon it.', 'Você entende que modelos de IA podem produzir informações imprecisas, incompletas, tendenciosas ou fabricadas ("alucinações"), e concorda em verificar cada saída material com um profissional licenciado antes de confiar nela.', 'Entiendes que los modelos de IA pueden producir información inexacta, incompleta, sesgada o fabricada ("alucinaciones"), y aceptas verificar cada salida material con un profesional licenciado antes de confiar en ella.');
    tr('אתה משתמש בשירות מרצונך ועל אחריותך הבלעדית.', 'You are using the service voluntarily and at your sole risk.', 'Você está usando o serviço voluntariamente e sob seu próprio risco.', 'Estás utilizando el servicio voluntariamente y bajo tu exclusivo riesgo.');
    tr('יש לך את הכשרות המשפטית והסמכות להתקשר בתנאים אלה ולשאת בתוצאות כל החלטה שתקבל בהסתמך על השירות.', 'You have the legal capacity and authority to enter into these Terms and to bear the consequences of any decision you take based on the service.', 'Você tem capacidade jurídica e autoridade para celebrar estes Termos e arcar com as consequências de qualquer decisão tomada com base no serviço.', 'Tienes la capacidad legal y la autoridad para celebrar estos Términos y asumir las consecuencias de cualquier decisión tomada con base en el servicio.');

    window.WL_TR = existing;
})();
