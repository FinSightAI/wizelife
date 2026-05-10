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
  const TOS_VERSION = 2;

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
    },
  };

  function getLang() {
    try { const v = localStorage.getItem('wl_lang'); return v === 'en' || v === 'he' ? v : 'he'; }
    catch { return 'he'; }
  }

  function storageKey(app) { return `wl_disclaimer_${app}_v${TOS_VERSION}`; }

  function alreadyAccepted(app) {
    try { return !!localStorage.getItem(storageKey(app)); } catch { return false; }
  }

  function recordAcceptance(app) {
    const payload = {
      accepted: true,
      version: TOS_VERSION,
      at: new Date().toISOString(),
      ua: navigator.userAgent.slice(0, 200),
      lang: getLang(),
      pageUrl: location.href.slice(0, 300),
    };
    // 1. localStorage (fast, available offline)
    try { localStorage.setItem(storageKey(app), JSON.stringify(payload)); } catch {}
    // 2. Firestore audit trail (server-side legal evidence) — only if firebase is loaded + user signed in.
    //    Stored as users/{uid}/disclaimers/{app}_v{N} so deletion of the user wipes it cleanly.
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
        const u = firebase.auth().currentUser;
        if (u && u.uid) {
          firebase.firestore()
            .collection('users').doc(u.uid)
            .collection('disclaimers').doc(`${app}_v${TOS_VERSION}`)
            .set(payload, { merge: false });
        }
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
    const bar = document.createElement('div');
    bar.id = 'wl-pro-disclaimer';
    bar.style.cssText = [
      'background:linear-gradient(90deg,#fef3c7,#fde68a)','color:#78350f',
      'font:600 11.5px Inter,-apple-system,sans-serif','padding:6px 14px','text-align:center',
      'letter-spacing:0.1px','line-height:1.45','position:relative','z-index:99997',
      'border-bottom:1px solid #f59e0b55',
    ].join(';');
    bar.innerHTML = tr;
    /* Insert just BELOW the WizeBar (top 36px). The WizeBar itself uses
       z-index 99999, so this banner stays in normal flow underneath it. */
    document.body.insertBefore(bar, document.body.firstChild);
  }

  root.WizeDisclaimer = { gate, showEmergencyBanner, showProfessionalDisclaimer, TOS_VERSION };
})(window);
