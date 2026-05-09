/* WizeLife shared onboarding modal (first-visit only).
   Drop-in: <script src="/js/wize-onboarding.js" defer></script>
   - Modal card (~340×auto), NOT fullscreen
   - 3 slides per app, swipeable (mobile) + arrow buttons (desktop)
   - Always closable: ✕ button, click on backdrop, Escape, "Got it" button
   - Shows once per app per device — persisted via localStorage `wl_ob_<id>`
   - Re-trigger from elsewhere by calling: window.WizeOnboarding.show('appid')
*/
(function () {
  if (window.__wizeOnboardLoaded) return;
  window.__wizeOnboardLoaded = true;

  /* ────────────────────────────────────────────────────────────────────────
     App config — slides keyed by app id, then by language.
     Keep slide count to 3 so the modal stays compact. */
  var COPY = {
    money: {
      color: '#10b981',
      he: [
        { e: '💰', t: 'WizeMoney',          s: 'דשבורד פיננסי אישי עם AI — מניות, קרנות, ופנסיה במקום אחד.' },
        { e: '🤖', t: 'תובנות AI חכמות',     s: 'ה-AI מנתח את התיק שלך ומציע איך לשפר אותו — בלי ייעוץ אישי.' },
        { e: '🌍', t: 'שלוש שווקים',         s: 'ישראל, ארה״ב וברזיל — בורסות, גמל, פנסיה ומס במקום אחד.' }
      ],
      en: [
        { e: '💰', t: 'WizeMoney',          s: 'Personal AI finance dashboard — stocks, funds, pension in one place.' },
        { e: '🤖', t: 'Smart AI insights',  s: 'AI analyzes your portfolio and suggests improvements — no advisor needed.' },
        { e: '🌍', t: 'Three markets',      s: 'Israel, US and Brazil — equities, retirement and tax under one roof.' }
      ],
      pt: [
        { e: '💰', t: 'WizeMoney',          s: 'Painel financeiro com IA — ações, fundos e aposentadoria no mesmo lugar.' },
        { e: '🤖', t: 'Insights da IA',     s: 'A IA analisa seu portfólio e sugere melhorias — sem consultor.' },
        { e: '🌍', t: 'Três mercados',      s: 'Israel, EUA e Brasil — bolsa, previdência e impostos juntos.' }
      ],
      es: [
        { e: '💰', t: 'WizeMoney',          s: 'Panel de finanzas con IA — acciones, fondos y pensión en un lugar.' },
        { e: '🤖', t: 'Insights de IA',     s: 'La IA analiza tu cartera y sugiere mejoras — sin asesor.' },
        { e: '🌍', t: 'Tres mercados',      s: 'Israel, EE.UU. y Brasil — bolsa, jubilación e impuestos.' }
      ]
    },
    tax: {
      color: '#f59e0b',
      he: [
        { e: '📊', t: 'WizeTax',            s: 'יועץ מס AI לתכנון בינלאומי — ישראל, ארה״ב, פורטוגל ועוד.' },
        { e: '⚖️', t: 'הימנעות חוקית',       s: 'הבדל בין הימנעות מס חוקית להעלמת מס. שמירה על FATCA/CRS.' },
        { e: '🌐', t: 'מס יציאה ותושבות',    s: 'תכנון מעבר מדינות עם הבנה של מס יציאה ישראלי וחבויות עתידיות.' }
      ],
      en: [
        { e: '📊', t: 'WizeTax',            s: 'AI tax advisor for international planning — Israel, US, Portugal and more.' },
        { e: '⚖️', t: 'Legal optimization',  s: 'Distinguishes legal avoidance from evasion. FATCA/CRS aware.' },
        { e: '🌐', t: 'Exit & residency',   s: 'Plan a country move with full visibility of Israeli exit tax + future liabilities.' }
      ],
      pt: [
        { e: '📊', t: 'WizeTax',            s: 'Consultor de impostos com IA — Israel, EUA, Portugal e mais.' },
        { e: '⚖️', t: 'Otimização legal',    s: 'Distingue elisão legal de evasão. Ciente de FATCA/CRS.' },
        { e: '🌐', t: 'Saída & residência', s: 'Planeje uma mudança de país com visibilidade do exit tax israelense.' }
      ],
      es: [
        { e: '📊', t: 'WizeTax',            s: 'Asesor fiscal con IA — Israel, EE.UU., Portugal y más.' },
        { e: '⚖️', t: 'Optimización legal',  s: 'Distingue elusión legal de evasión. Compatible con FATCA/CRS.' },
        { e: '🌐', t: 'Salida & residencia', s: 'Planifica mudanzas con visibilidad del impuesto de salida israelí.' }
      ]
    },
    health: {
      color: '#ec4899',
      he: [
        { e: '❤️', t: 'WizeHealth',         s: 'עוזר רפואי AI — שאלות, ניתוח בדיקות דם, ותזונה אישית.' },
        { e: '🧪', t: 'ניתוח בדיקות דם',     s: 'העלה PDF או תמונה — ה-AI יסביר תוצאות, מגמות, וסיבות אפשריות.' },
        { e: '🚨', t: 'לא תחליף לרופא',       s: 'במצב חירום חייגו 101. WizeHealth לא מאבחן ולא רושם תרופות.' }
      ],
      en: [
        { e: '❤️', t: 'WizeHealth',         s: 'AI health companion — questions, blood test analysis, personal nutrition.' },
        { e: '🧪', t: 'Blood test analysis', s: 'Upload a PDF or photo — the AI explains results, trends, and possible causes.' },
        { e: '🚨', t: 'Not a doctor',        s: 'For emergencies call your local 101/911. WizeHealth never diagnoses or prescribes.' }
      ],
      pt: [
        { e: '❤️', t: 'WizeHealth',         s: 'Companheiro de saúde com IA — perguntas, exames de sangue, nutrição pessoal.' },
        { e: '🧪', t: 'Análise de exames',   s: 'Envie um PDF ou foto — a IA explica resultados, tendências e causas.' },
        { e: '🚨', t: 'Não é médico',        s: 'Em emergência ligue para o seu 192/911. O WizeHealth não diagnostica.' }
      ],
      es: [
        { e: '❤️', t: 'WizeHealth',         s: 'Compañero de salud con IA — preguntas, análisis de sangre, nutrición.' },
        { e: '🧪', t: 'Análisis de sangre',  s: 'Sube un PDF o foto — la IA explica resultados, tendencias y causas.' },
        { e: '🚨', t: 'No es un médico',     s: 'En emergencia llama al 911. WizeHealth no diagnostica ni receta.' }
      ]
    },
    travel: {
      color: '#06b6d4',
      he: [
        { e: '✈️', t: 'WizeTravel',         s: 'תכנון נסיעות AI — טיסות, מלונות, ויזות ועוד.' },
        { e: '🛂', t: 'בדיקת ויזה',          s: 'בדוק במהירות אם אתה צריך ויזה ומה לוקח להוציא — לפי דרכון ויעד.' },
        { e: '💼', t: 'דילים בזמן אמת',      s: 'מנוע דילים שמשווה מחירים ומציע את הזמן הטוב ביותר לטוס.' }
      ],
      en: [
        { e: '✈️', t: 'WizeTravel',         s: 'AI travel planner — flights, hotels, visas, deals.' },
        { e: '🛂', t: 'Visa check',          s: 'Quickly see if you need a visa and how to get one — by passport + destination.' },
        { e: '💼', t: 'Live deal hunter',    s: 'A deal engine that compares prices and recommends the best time to fly.' }
      ],
      pt: [
        { e: '✈️', t: 'WizeTravel',         s: 'Planejador de viagens com IA — voos, hotéis, vistos, ofertas.' },
        { e: '🛂', t: 'Verificação de visto', s: 'Veja se precisa de visto e como obter — por passaporte + destino.' },
        { e: '💼', t: 'Caçador de ofertas',  s: 'Motor que compara preços e recomenda a melhor hora para voar.' }
      ],
      es: [
        { e: '✈️', t: 'WizeTravel',         s: 'Planificador de viajes con IA — vuelos, hoteles, visados, ofertas.' },
        { e: '🛂', t: 'Verificación de visa', s: 'Mira si necesitas visa y cómo conseguirla — por pasaporte + destino.' },
        { e: '💼', t: 'Cazador de ofertas',  s: 'Motor que compara precios y recomienda el mejor momento para volar.' }
      ]
    },
    deal: {
      color: '#8b5cf6',
      he: [
        { e: '🏠', t: 'WizeDeal',           s: 'מנתח עסקאות נדל״ן עם AI — תשואה, משכנתא, ותמחור שוק.' },
        { e: '📊', t: 'ROI ב-AI',            s: 'ציון 0–100 לעסקה עם הסבר מפורט — Red flags, סיכונים, תזרים.' },
        { e: '📍', t: 'נתוני שוק חיים',       s: 'אומדן שכ״ד וקומפים אמיתיים לפי שכונה. ישראל, ברזיל ועוד.' }
      ],
      en: [
        { e: '🏠', t: 'WizeDeal',           s: 'AI real-estate deal analyzer — yields, mortgage, and market pricing.' },
        { e: '📊', t: 'AI deal score',       s: 'A 0–100 score with reasoning — red flags, risks, cash flow.' },
        { e: '📍', t: 'Live market data',    s: 'Rent estimates and real comparables by neighborhood. Israel, Brazil and more.' }
      ],
      pt: [
        { e: '🏠', t: 'WizeDeal',           s: 'Analisador de imóveis com IA — rentabilidades, financiamento, preços.' },
        { e: '📊', t: 'Score do negócio',    s: 'Pontuação 0–100 com raciocínio — riscos, alertas e fluxo de caixa.' },
        { e: '📍', t: 'Dados ao vivo',       s: 'Estimativa de aluguel e comparáveis por bairro. Israel, Brasil e mais.' }
      ],
      es: [
        { e: '🏠', t: 'WizeDeal',           s: 'Analizador inmobiliario con IA — rendimientos, hipoteca y precios.' },
        { e: '📊', t: 'Puntuación IA',       s: 'Puntuación 0–100 con razonamiento — riesgos, alertas y flujo.' },
        { e: '📍', t: 'Datos del mercado',   s: 'Estimación de alquiler y comparables por barrio. Israel, Brasil y más.' }
      ]
    },
    portal: {
      color: '#6366f1',
      he: [
        { e: '✨', t: 'ברוך הבא ל-WizeLife', s: 'חמישה כלי AI לחיים מקצועיים — בריאות, כסף, מס, נסיעות, נדל״ן.' },
        { e: '🔐', t: 'התחברות אחת',          s: 'חשבון אחד פותח את כל האפליקציות. שום צורך להירשם שוב.' },
        { e: '📲', t: 'התקנה למובייל',        s: 'אפשר להתקין כמו אפליקציה רגילה דרך תפריט הדפדפן.' }
      ],
      en: [
        { e: '✨', t: 'Welcome to WizeLife', s: 'Five AI tools for life — Money, Tax, Health, Travel, Real estate.' },
        { e: '🔐', t: 'One sign-in',         s: 'One account unlocks every app. No need to register twice.' },
        { e: '📲', t: 'Install on mobile',   s: 'You can install it like a native app from your browser menu.' }
      ],
      pt: [
        { e: '✨', t: 'Bem-vindo à WizeLife', s: 'Cinco ferramentas de IA — Dinheiro, Imposto, Saúde, Viagem, Imóveis.' },
        { e: '🔐', t: 'Um só login',          s: 'Uma conta dá acesso a tudo. Sem cadastros duplicados.' },
        { e: '📲', t: 'Instalar no celular',  s: 'Dá para instalar como app nativo no menu do navegador.' }
      ],
      es: [
        { e: '✨', t: 'Bienvenido a WizeLife', s: 'Cinco herramientas de IA — Dinero, Impuestos, Salud, Viaje, Inmuebles.' },
        { e: '🔐', t: 'Un solo inicio',       s: 'Una cuenta abre todas las apps. Sin registrarse dos veces.' },
        { e: '📲', t: 'Instalar en móvil',    s: 'Se puede instalar como app desde el menú del navegador.' }
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
      'position:relative','width:100%','max-width:340px',
      'background:linear-gradient(180deg,#0f1426 0%,#0a0e1a 100%)',
      'border:1px solid rgba(255,255,255,0.08)','border-radius:20px',
      'padding:28px 24px 22px','box-sizing:border-box',
      'box-shadow:0 32px 96px rgba(0,0,0,0.55), 0 0 0 1px ' + color + '22',
      'animation:wbo-pop .3s ease','overflow:hidden'
    ].join(';');

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
      d.style.cssText = 'width:18px;height:3px;border-radius:99px;background:rgba(255,255,255,0.12);transition:background .2s';
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
    iconWrap.style.cssText = 'width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;margin:8px auto 18px;font-size:30px;';
    var titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin:0 0 8px;color:#f0f4ff;font-size:18px;font-weight:800;text-align:center;letter-spacing:-0.4px;';
    var subEl = document.createElement('p');
    subEl.style.cssText = 'margin:0 0 22px;color:rgba(255,255,255,0.6);font-size:13.5px;line-height:1.55;text-align:center;';
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
    nextBtn.style.cssText = 'background:' + color + ';border:none;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;padding:10px 20px;border-radius:99px;font-family:inherit;box-shadow:0 6px 20px ' + color + '55;';
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
    var key = 'wl_ob_' + appId;
    var seen;
    try { seen = localStorage.getItem(key); } catch (e) { seen = '1'; /* private mode → don't nag */ }
    if (seen) return;
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
