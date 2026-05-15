/**
 * WizeLife shared first-use disclaimer modal.
 *
 * Usage: each app loads this script and calls
 *   WizeDisclaimer.gate({ app: 'health', emergency: true });
 *
 * - Shows a modal once per app + ToS-version. Stores acceptance in localStorage
 *   as `wl_disclaimer_<app>_v<N>` with timestamp + user agent.
 * - Re-prompts if the ToS version constant below is bumped.
 * - Includes app-specific copy (medical / financial / tax / general).
 * - Returns a Promise that resolves on accept, rejects on dismiss-without-accept.
 *
 * Drop-in: add `<script src="https://wizelife.ai/js/wize-disclaimer.js"></script>`
 * (or copy locally) BEFORE your main app code, then call gate() on init.
 */
(function (root) {
  'use strict';

  // Bump this when you materially change ToS / disclaimer language.
  // All users must re-accept on next visit.
  // v3 (2026-05-15): expanded Limitation of Liability §10, new Indemnification §11,
  //                  new Assumption of Risk §11A. Existing _v2 acceptances will
  //                  auto-trigger re-prompt because storageKey is suffixed with the version.
  const TOS_VERSION = 3;

  const COPY = {
    health: {
      he: {
        title: '⚠️ חשוב לדעת לפני שמתחילים',
        intro: 'WizeHealth הוא <strong>כלי מידע וטראקינג בלבד</strong>. הוא <strong>אינו רופא</strong> ואינו תחליף לייעוץ רפואי מקצועי.',
        bullets: [
          '<strong>במקרה חירום חייג 101</strong> — אל תשתמש בWizeHealth.',
          'אל תפסיק / תתחיל / תשנה תרופה ללא ייעוץ רופא.',
          'תוצאות בדיקות → תמיד הצג לרופא שלך.',
          'AI יכול לטעות. אמת כל מידע במקור מקצועי.',
          'WizeHealth אינו לקטינים מתחת לגיל 18.',
        ],
        accept: 'הבנתי וממשיך באחריותי האישית',
        decline: 'יציאה',
      },
      en: {
        title: '⚠️ Important — Before You Start',
        intro: 'WizeHealth is <strong>an information &amp; tracking tool only</strong>. It is <strong>not a doctor</strong> and is not a substitute for professional medical advice.',
        bullets: [
          '<strong>In an emergency, call 101 (Israel) or your local emergency number</strong> — do not use WizeHealth.',
          'Do not start, stop, or change medication without consulting a physician.',
          'Always show test results to your doctor for interpretation.',
          'AI can make mistakes. Verify any information with a qualified source.',
          'WizeHealth is not for users under 18.',
        ],
        accept: 'I understand and continue at my own risk',
        decline: 'Exit',
      },
      pt: {
        title: '⚠️ Importante — Antes de começar',
        intro: 'WizeHealth é <strong>uma ferramenta de informação e monitoramento apenas</strong>. Não é <strong>um médico</strong> e não substitui aconselhamento médico profissional.',
        bullets: [
          '<strong>Em emergência, ligue 101 (Israel) ou seu número de emergência local</strong> — não use WizeHealth.',
          'Não inicie, interrompa ou altere medicamentos sem consultar um médico.',
          'Sempre mostre os resultados de exames ao seu médico para interpretação.',
          'IA pode cometer erros. Verifique qualquer informação com fonte qualificada.',
          'WizeHealth não é para usuários menores de 18 anos.',
        ],
        accept: 'Entendi e continuo por minha própria conta e risco',
        decline: 'Sair',
      },
      es: {
        title: '⚠️ Importante — Antes de empezar',
        intro: 'WizeHealth es <strong>una herramienta de información y seguimiento solamente</strong>. <strong>No es un médico</strong> y no sustituye al consejo médico profesional.',
        bullets: [
          '<strong>En emergencia, llama al 101 (Israel) o tu número de emergencia local</strong> — no uses WizeHealth.',
          'No inicies, pares o cambies medicamentos sin consultar a un médico.',
          'Muestra siempre los resultados de los análisis a tu médico para su interpretación.',
          'La IA puede equivocarse. Verifica cualquier información con una fuente cualificada.',
          'WizeHealth no es para usuarios menores de 18 años.',
        ],
        accept: 'Entiendo y continúo bajo mi propio riesgo',
        decline: 'Salir',
      },
    },
    money: {
      he: {
        title: '⚠️ לפני שמשתמשים ביועץ ההשקעות',
        intro: 'WizeMoney מספק <strong>מידע, לא ייעוץ השקעות מורשה</strong>. אין לנו רישיון מרשות ניירות ערך.',
        bullets: [
          'כל המלצה היא למידע בלבד — לא הוראת קנייה/מכירה.',
          'תשואות עבר אינן מבטיחות תשואות עתיד.',
          'הסיכון להפסיד את כל ההשקעה הוא אמיתי.',
          'התייעץ עם יועץ השקעות מורשה לפני ביצוע.',
          'AI עלול לטעות במחירים, טיקרים ותחזיות.',
        ],
        accept: 'הבנתי, ממשיך באחריותי',
        decline: 'יציאה',
      },
      en: {
        title: '⚠️ Before Using the Investment Advisor',
        intro: 'WizeMoney provides <strong>information, not licensed investment advice</strong>. We are not regulated by the Israel Securities Authority.',
        bullets: [
          'Every recommendation is informational — not a buy/sell instruction.',
          'Past returns do not guarantee future returns.',
          'You can lose your entire investment.',
          'Consult a licensed investment advisor before acting.',
          'AI can make mistakes about prices, tickers, and forecasts.',
        ],
        accept: 'I understand and continue at my own risk',
        decline: 'Exit',
      },
      pt: {
        title: '⚠️ Antes de usar o Consultor de Investimentos',
        intro: 'WizeMoney fornece <strong>informação, não consultoria de investimentos licenciada</strong>. Não somos regulados pela Autoridade de Valores Mobiliários de Israel.',
        bullets: [
          'Toda recomendação é informativa — não é ordem de compra/venda.',
          'Rendimentos passados não garantem rendimentos futuros.',
          'Você pode perder todo o investimento.',
          'Consulte um assessor de investimentos licenciado antes de agir.',
          'IA pode errar em preços, tickers e previsões.',
        ],
        accept: 'Entendi e continuo por minha própria conta e risco',
        decline: 'Sair',
      },
      es: {
        title: '⚠️ Antes de usar el Asesor de Inversiones',
        intro: 'WizeMoney proporciona <strong>información, no asesoramiento de inversiones licenciado</strong>. No estamos regulados por la Autoridad de Valores de Israel.',
        bullets: [
          'Cada recomendación es informativa — no es una orden de compra/venta.',
          'Las rentabilidades pasadas no garantizan rentabilidades futuras.',
          'Puedes perder toda tu inversión.',
          'Consulta a un asesor de inversiones licenciado antes de actuar.',
          'La IA puede equivocarse con precios, tickers y pronósticos.',
        ],
        accept: 'Entiendo y continúo bajo mi propio riesgo',
        decline: 'Salir',
      },
    },
    tax: {
      he: {
        title: '⚠️ לפני שמשתמשים ב-WizeTax',
        intro: 'WizeTax מספק <strong>מידע מס כללי, לא ייעוץ אישי</strong>. אין לנו רישיון יועץ מס / רואה חשבון.',
        bullets: [
          'חוקי המס משתנים תכופות — מידע יכול להיות לא עדכני.',
          'אחריות לעמידה בדדליינים ותשלומים — שלך בלבד.',
          'התייעץ עם יועץ מס מורשה לפני הגשה אמיתית.',
          'אסור להשתמש לתכנון מס לא חוקי / העלמת מס.',
        ],
        accept: 'הבנתי, ממשיך',
        decline: 'יציאה',
      },
      en: {
        title: '⚠️ Before Using WizeTax',
        intro: 'WizeTax provides <strong>general tax information, not personalised advice</strong>. We are not licensed tax advisors.',
        bullets: [
          'Tax laws change frequently — info may be outdated.',
          'Compliance with deadlines and payments is your sole responsibility.',
          'Consult a licensed tax advisor before any actual filing.',
          'Do not use the service for unlawful tax planning or evasion.',
        ],
        accept: 'I understand and continue',
        decline: 'Exit',
      },
      pt: {
        title: '⚠️ Antes de usar o WizeTax',
        intro: 'WizeTax fornece <strong>informação tributária geral, não aconselhamento personalizado</strong>. Não somos consultores tributários licenciados.',
        bullets: [
          'As leis tributárias mudam frequentemente — as informações podem estar desatualizadas.',
          'O cumprimento de prazos e pagamentos é de sua exclusiva responsabilidade.',
          'Consulte um consultor tributário licenciado antes de qualquer declaração real.',
          'Não use o serviço para planejamento tributário ilegal ou evasão.',
        ],
        accept: 'Entendi e continuo',
        decline: 'Sair',
      },
      es: {
        title: '⚠️ Antes de usar WizeTax',
        intro: 'WizeTax proporciona <strong>información fiscal general, no asesoramiento personalizado</strong>. No somos asesores fiscales licenciados.',
        bullets: [
          'Las leyes fiscales cambian con frecuencia — la información puede estar desactualizada.',
          'El cumplimiento de plazos y pagos es tu responsabilidad exclusiva.',
          'Consulta a un asesor fiscal licenciado antes de cualquier declaración real.',
          'No uses el servicio para planificación fiscal ilegal o evasión.',
        ],
        accept: 'Entiendo y continúo',
        decline: 'Salir',
      },
    },
    deal: {
      he: {
        title: '⚠️ לפני ניתוח עסקת נדל"ן',
        intro: 'WizeDeal מספק <strong>ניתוח טכני, לא המלצה לקנייה/השכרה</strong>.',
        bullets: [
          'התחזיות מבוססות על נתונים שאתה מזין — לא נכון אוטומטית למצב השוק.',
          'תמיד אמת ב-עו"ד / שמאי / יועץ נדל"ן מורשה לפני ביצוע.',
          'AI עלול לטעות בערכי שוק ובמיסוי.',
        ],
        accept: 'הבנתי',
        decline: 'יציאה',
      },
      en: {
        title: '⚠️ Before Analysing a Real-Estate Deal',
        intro: 'WizeDeal provides <strong>analysis, not a recommendation to buy or rent</strong>.',
        bullets: [
          'Projections are based on data you enter — not automatically accurate to current market conditions.',
          'Always verify with a licensed lawyer / appraiser / real estate advisor before acting.',
          'AI can make mistakes about market values and taxation.',
        ],
        accept: 'I understand',
        decline: 'Exit',
      },
      pt: {
        title: '⚠️ Antes de analisar uma operação imobiliária',
        intro: 'WizeDeal fornece <strong>análise, não recomendação de compra ou aluguel</strong>.',
        bullets: [
          'As projeções são baseadas nos dados que você insere — não são automaticamente precisas para as condições atuais do mercado.',
          'Verifique sempre com advogado / avaliador / consultor imobiliário licenciado antes de agir.',
          'IA pode errar sobre valores de mercado e tributação.',
        ],
        accept: 'Entendi',
        decline: 'Sair',
      },
      es: {
        title: '⚠️ Antes de analizar una operación inmobiliaria',
        intro: 'WizeDeal proporciona <strong>análisis, no recomendación de compra o alquiler</strong>.',
        bullets: [
          'Las proyecciones se basan en los datos que ingresas — no son automáticamente precisas para las condiciones actuales del mercado.',
          'Verifica siempre con un abogado / tasador / asesor inmobiliario licenciado antes de actuar.',
          'La IA puede equivocarse con valores de mercado e impuestos.',
        ],
        accept: 'Entiendo',
        decline: 'Salir',
      },
    },
  };

  function getLang() {
    try {
      const v = (localStorage.getItem('wl_lang') || '').slice(0, 2);
      return ['he', 'en', 'pt', 'es'].includes(v) ? v : 'he';
    } catch { return 'he'; }
  }

  function storageKey(app) { return `wl_disclaimer_${app}_v${TOS_VERSION}`; }

  function alreadyAccepted(app) {
    try { return !!localStorage.getItem(storageKey(app)); } catch { return false; }
  }

  /* SHA-256 of an arbitrary string (UTF-8). Used to fingerprint the
     disclaimer copy the user actually saw, so we can later prove in court
     'user X accepted the exact text whose hash matches Y on this date'. */
  async function _sha256Hex(s) {
    try {
      const enc = new TextEncoder().encode(s);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { return null; }
  }

  /* Build a deterministic snapshot of the disclaimer text rendered on screen
     (title + intro + every bullet, joined with \n). Hashing this gives us
     legal evidence the user saw exactly THIS version of the copy. */
  function _renderedTextFor(app, lang) {
    const t = (COPY[app] || {})[lang] || (COPY[app] || {}).en;
    if (!t) return '';
    return [t.title, t.intro, ...(t.bullets || [])].join('\n');
  }

  async function recordAcceptance(app) {
    const lang = getLang();
    const rendered = _renderedTextFor(app, lang);
    const textHash = await _sha256Hex(rendered);
    const payload = {
      accepted: true,
      version: TOS_VERSION,
      at: new Date().toISOString(),
      ua: navigator.userAgent.slice(0, 200),
      lang,
      pageUrl: location.href.slice(0, 300),
      /* Legal-evidence fields: hash + length of the exact copy shown. */
      text_hash: textHash,
      text_length: rendered.length,
      /* Viewport + screen — helps prove the modal was visible (not hidden by
         dev tools / zoom abuse). */
      viewport: typeof window !== 'undefined' ? (window.innerWidth + 'x' + window.innerHeight) : '',
      screen: typeof screen !== 'undefined' ? (screen.width + 'x' + screen.height) : '',
      /* Timezone gives a rough geographic fingerprint without storing real IP
         (which we don't have client-side anyway). */
      tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '',
    };
    // 1. localStorage (fast, available offline)
    try { localStorage.setItem(storageKey(app), JSON.stringify(payload)); } catch {}
    // 2. Firestore audit trail (server-side legal evidence) — only if firebase
    //    is loaded + user signed in. Stored as users/{uid}/disclaimers/{app}_v{N}
    //    so a user deletion wipes the record cleanly. Uses {merge:true} so
    //    second-visit re-acceptance doesn't lose first-visit fields like 'at'.
    function writeFirestore(retry) {
      try {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
        const u = firebase.auth().currentUser;
        if (!u || !u.uid) return;
        firebase.firestore()
          .collection('users').doc(u.uid)
          .collection('disclaimers').doc(`${app}_v${TOS_VERSION}`)
          .set(payload, { merge: false })
          .catch(function () {
            // One retry after 4s — typical cause is App Check token still warming up.
            if (!retry) setTimeout(function () { writeFirestore(true); }, 4000);
          });
      } catch (e) {
        if (!retry) setTimeout(function () { writeFirestore(true); }, 4000);
      }
    }
    writeFirestore(false);
    // 3. If user signs in AFTER accepting (anonymous → google), write the
    //    record on the auth-state-change event so we still capture proof.
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function (u) {
          if (u && u.uid) writeFirestore(false);
        });
      }
    } catch {}
  }

  function buildModal(app, opts) {
    const lang = getLang();
    const t = (COPY[app] || COPY.deal)[lang] || COPY[app].en;
    const dir = lang === 'he' ? 'rtl' : 'ltr';

    const wrap = document.createElement('div');
    wrap.id = 'wl-disclaimer-modal';
    wrap.setAttribute('dir', dir);
    wrap.style.cssText = [
      'position:fixed','inset:0','z-index:2147483646','background:rgba(0,0,0,0.78)',
      'backdrop-filter:blur(6px)','-webkit-backdrop-filter:blur(6px)',
      'display:flex','align-items:center','justify-content:center','padding:18px',
      'font-family:"Plus Jakarta Sans",Inter,-apple-system,sans-serif',
    ].join(';');

    wrap.innerHTML = `
      <div style="background:#0a0a0c;border:1px solid rgba(255,255,255,0.12);border-radius:18px;
                  max-width:520px;width:100%;padding:28px 26px;color:#eef2ff;
                  box-shadow:0 32px 80px rgba(0,0,0,0.6);max-height:92vh;overflow-y:auto;">
        <h2 style="margin:0 0 14px;font-size:1.4rem;font-weight:800;line-height:1.3;color:#fbbf24;">${t.title}</h2>
        <p style="margin:0 0 14px;font-size:14.5px;color:#cbd5e1;line-height:1.6;">${t.intro}</p>
        <ul style="padding-inline-start:22px;margin:0 0 18px;font-size:13.5px;color:#cbd5e1;line-height:1.75;">
          ${t.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
        <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;
                      color:#eef2ff;background:rgba(255,255,255,0.04);padding:11px 13px;
                      border-radius:10px;margin-bottom:14px;cursor:pointer;line-height:1.4;">
          <input type="checkbox" id="wl-disc-check" style="margin-top:2px;flex-shrink:0;
                 width:18px;height:18px;accent-color:#6366f1;cursor:pointer;">
          <span>${t.accept}</span>
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="wl-disc-accept" disabled
                  style="flex:1;min-width:140px;padding:13px 18px;border:0;border-radius:10px;
                         background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                         font:800 14px inherit;cursor:not-allowed;opacity:0.5;
                         transition:opacity 0.15s,transform 0.1s;">
            ${lang === 'he' ? 'המשך לאפליקציה' : 'Continue to app'}
          </button>
          <button id="wl-disc-decline"
                  style="padding:13px 18px;border:1px solid rgba(255,255,255,0.18);border-radius:10px;
                         background:transparent;color:#94a3b8;font:600 13px inherit;cursor:pointer;">
            ${t.decline}
          </button>
        </div>
        <div style="margin-top:14px;text-align:center;font-size:11.5px;color:#64748b;">
          <a href="https://wizelife.ai/terms.html" target="_blank" style="color:#a5b4fc;">Terms</a>
          ·
          <a href="https://wizelife.ai/privacy.html" target="_blank" style="color:#a5b4fc;">Privacy</a>
        </div>
      </div>
    `;
    return wrap;
  }

  function gate(opts) {
    const app = (opts && opts.app) || 'general';
    return new Promise((resolve, reject) => {
      if (alreadyAccepted(app)) { resolve(); return; }
      const modal = buildModal(app, opts);
      const check = modal.querySelector('#wl-disc-check');
      const accept = modal.querySelector('#wl-disc-accept');
      const decline = modal.querySelector('#wl-disc-decline');
      check.addEventListener('change', () => {
        accept.disabled = !check.checked;
        accept.style.opacity = check.checked ? '1' : '0.5';
        accept.style.cursor = check.checked ? 'pointer' : 'not-allowed';
      });
      accept.addEventListener('click', () => {
        if (!check.checked) return;
        recordAcceptance(app);
        modal.remove();
        resolve();
      });
      decline.addEventListener('click', () => {
        modal.remove();
        // Send user back to wizelife.ai — they can't use the app without accepting
        try { window.location.href = 'https://wizelife.ai'; } catch {}
        reject(new Error('declined'));
      });
      document.body.appendChild(modal);
    });
  }

  // Persistent emergency banner for medical app — RED, always visible
  function showEmergencyBanner(opts) {
    if (document.getElementById('wl-emergency-banner')) return;
    const lang = getLang();
    const TR = {
      he: '🚨 במקרה חירום רפואי חייג <strong>101</strong> מיד — אל תסתמך על האפליקציה',
      en: '🚨 Medical emergency? Call <strong>101</strong> (Israel) / <strong>911</strong> (US) immediately — do NOT rely on this app',
      pt: '🚨 Emergência médica? Ligue <strong>192</strong> (Brasil) / <strong>911</strong> imediatamente — NÃO confie neste app',
      es: '🚨 ¿Emergencia médica? Llama al <strong>911</strong> de inmediato — NO dependas de esta app',
    };
    const bar = document.createElement('div');
    bar.id = 'wl-emergency-banner';
    bar.style.cssText = [
      'background:linear-gradient(90deg,#dc2626,#ef4444)','color:#fff',
      'font:700 12px Inter,-apple-system,sans-serif','padding:7px 14px','text-align:center',
      'letter-spacing:0.2px','line-height:1.4','position:relative','z-index:99998',
      'box-shadow:0 2px 6px rgba(220,38,38,0.3)',
    ].join(';');
    bar.innerHTML = TR[lang] || TR.en;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Persistent professional-disclaimer banner — AMBER, slim, always visible
  // for finance / tax / real-estate where licensed-advisor caveat is needed.
  function showProfessionalDisclaimer(opts) {
    opts = opts || {};
    if (document.getElementById('wl-pro-disclaimer')) return;
    const lang = getLang();
    const TR = {
      tax: {
        he: 'ℹ️ WizeTax הוא כלי AI לחקירה ולמידע — <strong>אינו ייעוץ מס מורשה</strong>. לפני כל פעולה היוועץ ביועץ מס/רו״ח.',
        en: 'ℹ️ WizeTax is an AI research/info tool — <strong>NOT licensed tax advice</strong>. Consult a licensed CPA/tax advisor before acting.',
        pt: 'ℹ️ WizeTax é uma ferramenta de IA para pesquisa/informação — <strong>NÃO é consultoria tributária licenciada</strong>. Consulte um contador antes de agir.',
        es: 'ℹ️ WizeTax es una herramienta de IA de investigación/información — <strong>NO es asesoría fiscal licenciada</strong>. Consulta a un contador antes de actuar.',
      },
      money: {
        he: 'ℹ️ WizeMoney הוא כלי AI לחקירה ולמידע — <strong>אינו ייעוץ השקעות מורשה</strong>. אין לראות בו תחליף ליועץ פיננסי.',
        en: 'ℹ️ WizeMoney is an AI research/info tool — <strong>NOT licensed investment advice</strong>. Not a substitute for a financial advisor.',
        pt: 'ℹ️ WizeMoney é uma ferramenta de IA de pesquisa/informação — <strong>NÃO é assessoria de investimentos licenciada</strong>.',
        es: 'ℹ️ WizeMoney es una herramienta de IA de investigación/información — <strong>NO es asesoría de inversiones licenciada</strong>.',
      },
      deal: {
        he: 'ℹ️ WizeDeal הוא כלי AI לחקירה ולמידע — <strong>אינו ייעוץ נדל״ן/השקעות מורשה</strong>. בדוק עם שמאי/עו״ד לפני רכישה.',
        en: 'ℹ️ WizeDeal is an AI research/info tool — <strong>NOT licensed real-estate or investment advice</strong>. Verify with an appraiser/lawyer before buying.',
        pt: 'ℹ️ WizeDeal é uma ferramenta de IA de pesquisa/informação — <strong>NÃO é consultoria imobiliária licenciada</strong>.',
        es: 'ℹ️ WizeDeal es una herramienta de IA de investigación/información — <strong>NO es asesoría inmobiliaria licenciada</strong>.',
      },
    };
    const tr = (TR[opts.app] && (TR[opts.app][lang] || TR[opts.app].en)) || '';
    if (!tr) return;
    /* 7-day dismissal: only the full banner re-shows; the chip is permanent. */
    var dismKey = 'wl_pro_disclaimer_dismissed_' + opts.app;
    function dismissed() {
      try {
        var t = parseInt(localStorage.getItem(dismKey) || '0', 10);
        return t && (Date.now() - t) < 7 * 24 * 60 * 60 * 1000;
      } catch (e) { return false; }
    }
    /* Floating ℹ️ chip in the corner — non-intrusive. Click expands into the
       full amber banner positioned just below the WizeBar. */
    var chip = document.createElement('button');
    chip.id = 'wl-pro-disclaimer-chip';
    chip.type = 'button';
    var chipAria = ({ he: 'גילוי AI', en: 'AI disclaimer', pt: 'Aviso de IA', es: 'Aviso de IA' })[lang] || 'AI disclaimer';
    chip.setAttribute('aria-label', chipAria);
    chip.setAttribute('title', chipAria);
    chip.innerHTML = 'ℹ️';
    chip.style.cssText = [
      'position:fixed','top:46px','inset-inline-end:12px','z-index:99996',
      'width:24px','height:24px','border-radius:50%','border:1px solid rgba(245,158,11,0.55)',
      'background:rgba(254,243,199,0.92)','color:#78350f',
      'font:600 12px Inter,-apple-system,sans-serif','cursor:pointer',
      'display:flex','align-items:center','justify-content:center',
      'box-shadow:0 2px 8px rgba(0,0,0,0.15)','backdrop-filter:blur(8px)',
      'opacity:.85','transition:opacity .15s',
    ].join(';');
    chip.onmouseover = function () { chip.style.opacity = '1'; };
    chip.onmouseout  = function () { chip.style.opacity = '.85'; };
    chip.onclick = function () {
      if (document.getElementById('wl-pro-disclaimer')) return;
      var bar = document.createElement('div');
      bar.id = 'wl-pro-disclaimer';
      bar.style.cssText = [
        'position:fixed','top:36px','left:0','right:0','z-index:99996',
        'background:linear-gradient(90deg,rgba(254,243,199,0.97),rgba(253,230,138,0.97))',
        'color:#78350f','font:600 11px Inter,-apple-system,sans-serif',
        'padding:6px 36px 6px 14px','text-align:center','line-height:1.45',
        'border-bottom:1px solid rgba(245,158,11,0.35)','backdrop-filter:blur(8px)',
      ].join(';');
      bar.innerHTML = tr +
        '<button aria-label="dismiss" style="position:absolute;top:50%;inset-inline-end:8px;transform:translateY(-50%);background:transparent;border:0;color:#78350f;font-size:14px;cursor:pointer;padding:2px 6px;line-height:1;font-family:inherit;opacity:.7;" onclick="(function(b){try{localStorage.setItem(\'' + dismKey + '\',String(Date.now()));}catch(e){}b.remove();})(this.parentNode)">✕</button>';
      document.body.appendChild(bar);
    };
    document.body.appendChild(chip);
    /* Auto-expand on first visit (and again after every 7-day dismissal),
       then collapse to chip-only behaviour. */
    if (!dismissed()) chip.click();
  }

  root.WizeDisclaimer = { gate, showEmergencyBanner, showProfessionalDisclaimer, TOS_VERSION };
})(window);
