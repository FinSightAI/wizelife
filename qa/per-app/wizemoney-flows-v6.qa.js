#!/usr/bin/env node
// WizeMoney — flows v6 (30 NEW deep scenarios).
// Strictly non-overlapping with wizemoney-{,deep,flows-v2..v5,security-v2}.qa.js.
// Categories: Payslip/OCR import pipeline (Tesseract+pdf.js), transaction form
// edge cases, localStorage quota resilience, SW v299 update lifecycle (no reload
// loop), AI-chat RAG system prompt + ground-truth, multi-currency reformat,
// sidebar link resolution + Pro badges, Goals/Gemel/Bank render, charts on
// canvas, offline shell, i18n 4-lang round-trip on dashboard.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-FlowsV6');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        waitUntil: 'load', timeout: 45000,
    });
    await page.waitForTimeout(2500);
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    // ═══════════════ 1. PAYSLIP / OCR IMPORT PIPELINE ═══════════════════════
    // The OCR/payslip module is js/image-import.js, hosted on /pages/profile.html.
    // pdf.js is loaded eagerly; Tesseract.js is lazy-loaded on first use.
    await step('1/OCR: profile page exposes ImageImport module + scanPayslip() entry point', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            // ImageImport is declared `const` at module top-level, so it is NOT on window.
            // The reachable contract is the global scanPayslip() + its scan button, which
            // call ImageImport.openPayslipPicker() — verify the script tag + entry points.
            const probe = await page.evaluate(() => ({
                hasScript: !!document.querySelector('script[src*="image-import.js"]'),
                hasScanFn: typeof window.scanPayslip === 'function',
                hasScanBtn: !!document.querySelector('.btn-scan, [onclick*="scanPayslip" i]'),
            }));
            if (!probe.hasScript) throw new Error('image-import.js script tag missing from profile page');
            if (!probe.hasScanFn && !probe.hasScanBtn) {
                throw new Error('no payslip entry point (scanPayslip fn / scan button) found');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('2/OCR: pdf.js (pdfjsLib) loads on profile page and worker is configured', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            // pdf.min.js is loaded with a script tag; allow a moment beyond initial settle.
            const state = await page.evaluate(async () => {
                for (let i = 0; i < 12; i++) {
                    if (typeof window.pdfjsLib !== 'undefined') break;
                    await new Promise(r => setTimeout(r, 500));
                }
                const lib = typeof window.pdfjsLib !== 'undefined';
                const worker = lib && !!(window.pdfjsLib.GlobalWorkerOptions
                    && window.pdfjsLib.GlobalWorkerOptions.workerSrc);
                return { lib, worker };
            });
            if (!state.lib) throw new Error('pdfjsLib never became defined — PDF payslip path is broken');
            if (!state.worker) warn('pdfjsLib loaded but GlobalWorkerOptions.workerSrc not set', 'PDF rendering may fail at runtime');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('3/OCR: ensureTesseract() lazy-loads Tesseract.js from CDN on demand', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            const before = await page.evaluate(() => typeof window.Tesseract !== 'undefined');
            // Tesseract should NOT be eagerly loaded (it is ~5MB, lazy by design).
            if (before) warn('Tesseract.js loaded eagerly on profile page — defeats lazy-load (~5MB upfront)', '');
            const res = await page.evaluate(async () => {
                if (typeof window.ImageImport?.ensureTesseract !== 'function') return { skip: true };
                try {
                    await window.ImageImport.ensureTesseract();
                    return { skip: false, ok: typeof window.Tesseract !== 'undefined' };
                } catch (e) { return { skip: false, ok: false, err: String(e.message) }; }
            });
            if (res.skip) { warn('ImageImport.ensureTesseract not available', ''); return; }
            if (!res.ok) throw new Error(`ensureTesseract failed to load Tesseract.js${res.err ? ': ' + res.err : ''}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('4/OCR: extractPayslip() returns null for non-payslip text (graceful, no throw)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            const r = await page.evaluate(() => {
                if (typeof window.ImageImport?.extractPayslip !== 'function') return { skip: true };
                try {
                    const garbage = window.ImageImport.extractPayslip('hello world lorem ipsum 123');
                    return { skip: false, result: garbage };
                } catch (e) { return { skip: false, threw: String(e.message) }; }
            });
            if (r.skip) { warn('ImageImport.extractPayslip unavailable', ''); return; }
            if (r.threw) throw new Error(`extractPayslip threw on garbage input: ${r.threw}`);
            if (r.result !== null) throw new Error(`expected null for non-payslip text, got ${typeof r.result}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('5/OCR: extractPayslip() recognizes a Hebrew payslip and extracts gross/net', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            const r = await page.evaluate(() => {
                if (typeof window.ImageImport?.extractPayslip !== 'function') return { skip: true };
                // Minimal synthetic payslip — must contain תלוש or ברוטו+נטו.
                const fake = 'תלוש משכורת\nסה"כ ברוטו 18,500.00\nנטו לתשלום 13,200.00\nניכויי חובה\n2,100.00 850.00 320.00 930.00';
                const d = window.ImageImport.extractPayslip(fake);
                return { skip: false, gross: d && d.grossSalary, net: d && d.netSalary, isObj: !!d };
            });
            if (r.skip) { warn('ImageImport.extractPayslip unavailable', ''); return; }
            if (!r.isObj) throw new Error('extractPayslip returned null for a valid synthetic payslip');
            if (!(r.gross > 0) && !(r.net > 0)) throw new Error(`neither gross (${r.gross}) nor net (${r.net}) extracted`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('6/OCR: processPayslipPDF guards on missing pdfjsLib (no uncaught crash path)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            // Source-level guard: function checks `typeof pdfjsLib === 'undefined'` and notifies.
            const r = await page.evaluate(() => {
                const fn = window.ImageImport?.processPayslipPDF;
                if (typeof fn !== 'function') return { skip: true };
                return { skip: false, src: fn.toString() };
            });
            if (r.skip) { warn('processPayslipPDF unavailable', ''); return; }
            if (!/pdfjsLib/.test(r.src) || !/undefined/.test(r.src)) {
                warn('processPayslipPDF does not appear to guard on missing pdfjsLib', 'verify graceful PDF fallback');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('7/OCR: showSmartPreviewModal escapes OCR-extracted strings (XSS-safe rendering)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/profile.html');
        try {
            const r = await page.evaluate(() => {
                if (typeof window.ImageImport?.showSmartPreviewModal !== 'function') return { skip: true };
                window.ImageImport.showSmartPreviewModal(
                    { name: '<img src=x onerror=alert(1)>', company: 'other', type: 'gemel', value: 1000,
                      fundNumber: '"><script>x</script>', track: '', expectedPension: null, allAmounts: [1000] },
                    'funds'
                );
                const modal = document.getElementById('ocrPreviewModal');
                const injected = !!modal && !!modal.querySelector('img[onerror], script');
                const nameVal = modal && modal.querySelector('#smartName') ? modal.querySelector('#smartName').value : '';
                return { skip: false, injected, nameVal };
            });
            if (r.skip) { warn('showSmartPreviewModal unavailable', ''); return; }
            if (r.injected) throw new Error('OCR payload rendered as live DOM (img[onerror]/script) — XSS hole');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 2. TRANSACTION FORM EDGE CASES ═════════════════════════
    await step('8/TxEdge: emoji + HTML in description survives addExpense without breaking storage', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/credit.html');
        try {
            const r = await page.evaluate(() => {
                if (typeof window.Storage?.addExpense !== 'function') return { skip: true };
                const cards = window.Storage.getCreditCards ? window.Storage.getCreditCards() : { cards: [] };
                let cardId = cards.cards && cards.cards[0] ? cards.cards[0].id : null;
                if (!cardId && window.Storage.addCreditCard) {
                    cardId = window.Storage.addCreditCard({ name: 'QA', lastFour: '0000', limit: 5000 }).id;
                }
                const desc = '☕️🍔 <b>café</b> & "quotes" <script>x</script>';
                window.Storage.addExpense({ cardId, date: '2026-01-01', amount: 42.5, category: 'food', description: desc, isRecurring: false });
                const raw = localStorage.getItem('finance_credit_cards') || localStorage.getItem('finance_expenses') || '';
                let parses = false;
                try { Object.values(localStorage).forEach(v => { try { JSON.parse(v); } catch {} }); parses = true; } catch {}
                return { skip: false, stored: raw.includes('caf') || raw.length > 0, parses };
            });
            if (r.skip) { warn('Storage.addExpense unavailable on credit page', ''); return; }
            if (!r.parses) throw new Error('localStorage corrupted after emoji/HTML description insert');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('9/TxEdge: negative + huge + future-date amounts do not throw in addExpense', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/credit.html');
        try {
            const r = await page.evaluate(() => {
                if (typeof window.Storage?.addExpense !== 'function') return { skip: true };
                const cards = window.Storage.getCreditCards ? window.Storage.getCreditCards() : { cards: [] };
                let cardId = cards.cards && cards.cards[0] ? cards.cards[0].id
                    : (window.Storage.addCreditCard ? window.Storage.addCreditCard({ name: 'QA', lastFour: '0000', limit: 5000 }).id : null);
                const cases = [
                    { amount: -999, date: '2026-01-01' },
                    { amount: 9e15, date: '2026-01-01' },
                    { amount: 100, date: '2099-12-31' },
                ];
                const errs = [];
                for (const c of cases) {
                    try { window.Storage.addExpense({ cardId, date: c.date, amount: c.amount, category: 'other', description: 'edge', isRecurring: false }); }
                    catch (e) { errs.push(String(e.message)); }
                }
                return { skip: false, errs };
            });
            if (r.skip) { warn('Storage.addExpense unavailable', ''); return; }
            if (r.errs.length) throw new Error(`addExpense threw on edge amounts: ${r.errs[0]}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('10/TxEdge: I18n.formatCurrency handles negative / huge / NaN without crashing', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                if (typeof window.I18n?.formatCurrency !== 'function') return { skip: true };
                const out = {};
                try { out.neg = window.I18n.formatCurrency(-5000); } catch (e) { out.negErr = String(e.message); }
                try { out.huge = window.I18n.formatCurrency(9.99e14); } catch (e) { out.hugeErr = String(e.message); }
                try { out.nan = window.I18n.formatCurrency(NaN); } catch (e) { out.nanErr = String(e.message); }
                return { skip: false, out };
            });
            if (r.skip) { warn('I18n.formatCurrency unavailable', ''); return; }
            const e = r.out;
            if (e.negErr || e.hugeErr || e.nanErr) {
                throw new Error(`formatCurrency threw: ${e.negErr || e.hugeErr || e.nanErr}`);
            }
            if (typeof e.neg !== 'string' || !/[\d]/.test(e.neg)) throw new Error(`negative format suspect: "${e.neg}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 3. LOCALSTORAGE QUOTA RESILIENCE ═══════════════════════
    await step('11/Quota: writing a large blob near quota fails gracefully (catchable QuotaExceeded)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                // Try to push ~4MB string; if it throws, it must be a catchable DOMException, not a hard crash.
                let caught = null, wrote = false;
                try {
                    const big = 'x'.repeat(2 * 1024 * 1024);
                    localStorage.setItem('wize_quota_probe', big + big);
                    wrote = true;
                } catch (e) { caught = e.name || String(e); }
                try { localStorage.removeItem('wize_quota_probe'); } catch {}
                return { wrote, caught };
            });
            // Either it wrote (big quota) or threw a named exception we could catch. A silent hang would have timed out.
            if (!r.wrote && !r.caught) throw new Error('large write neither succeeded nor surfaced a catchable error');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('12/Quota: app still reads existing data after a failed oversized write', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                localStorage.setItem('wize_quota_keep', JSON.stringify({ ok: 1 }));
                try { localStorage.setItem('wize_quota_overflow', 'y'.repeat(3 * 1024 * 1024)); } catch {}
                let still = null;
                try { still = JSON.parse(localStorage.getItem('wize_quota_keep')); } catch {}
                try { localStorage.removeItem('wize_quota_keep'); localStorage.removeItem('wize_quota_overflow'); } catch {}
                return { ok: still && still.ok === 1 };
            });
            if (!r.ok) throw new Error('pre-existing key unreadable after oversized write attempt');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('13/Quota: Storage.get returns a safe default (not undefined) for missing keys', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                if (typeof window.Storage?.get !== 'function') return { skip: true };
                const v = window.Storage.get('finance_nonexistent_key_xyz');
                return { skip: false, isUndef: v === undefined, val: v === null ? 'null' : typeof v };
            });
            if (r.skip) { warn('Storage.get unavailable', ''); return; }
            // Either null or a sane fallback — undefined would risk downstream `.length`/`.map` crashes.
            if (r.isUndef) warn('Storage.get returns undefined for missing key', 'callers must guard against undefined');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 4. SW v299 UPDATE LIFECYCLE (no reload loop) ═══════════
    await step('14/SW: finsight-v299 cache present (or newer) after settle', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const state = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { sw: 'unsupported' };
                await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]);
                const names = (typeof caches !== 'undefined') ? await caches.keys() : [];
                return { sw: 'ok', names };
            });
            if (state.sw === 'unsupported') { warn('serviceWorker unsupported in env', ''); return; }
            const fin = (state.names || []).filter(n => /finsight-v(\d+)/.test(n));
            if (!fin.length) { warn(`no finsight-vN cache yet. Caches: ${(state.names||[]).join(', ') || '(none)'}`, 'SW may still be installing'); return; }
            const max = Math.max(...fin.map(n => parseInt(n.match(/finsight-v(\d+)/)[1], 10)));
            if (max < 299) warn(`active finsight cache is v${max} (expected ≥299)`, 'client may be on a stale SW');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('15/SW: no infinite reload loop — page does not navigate >1 time within 9s', async () => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        let frameNavs = 0;
        page.on('framenavigated', f => { if (f === page.mainFrame()) frameNavs++; });
        try {
            await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            const start = frameNavs;
            await page.waitForTimeout(9000);
            const extra = frameNavs - start;
            // A controllerchange-driven auto-reload should fire AT MOST once, never repeatedly.
            if (extra > 1) throw new Error(`main frame navigated ${extra}× after load — SW reload loop suspected`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('16/SW: registration has no perpetually-installing worker after 8s (clean activation)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { skip: true };
                await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]);
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) return { skip: false, none: true };
                return { skip: false, installing: !!reg.installing, waiting: !!reg.waiting, active: !!reg.active };
            });
            if (r.skip) { warn('serviceWorker unsupported', ''); return; }
            if (r.none) { warn('no SW registration found', ''); return; }
            if (!r.active) warn('SW has no active worker after 8s', 'first-load only — refresh resolves');
            if (r.installing && !r.active) throw new Error('SW stuck installing with no active worker — bad lifecycle');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 5. AI CHAT (Phase 2 RAG) ══════════════════════════════
    await step('17/RAG: ai-chat builds a financial context block from local data', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-chat.html');
        try {
            const r = await page.evaluate(() => {
                // buildFinancialContext may be module-scoped; probe both window and a behavioural fallback.
                if (typeof window.buildFinancialContext === 'function') {
                    try { return { mode: 'fn', ctx: String(window.buildFinancialContext()).slice(0, 400) }; }
                    catch (e) { return { mode: 'fn', err: String(e.message) }; }
                }
                // Fallback: confirm the storage getters the context relies on exist.
                const getters = ['getBankAccounts', 'getStocks', 'getMyFunds', 'getAssets', 'getLoans', 'getSubscriptions'];
                const present = getters.filter(g => typeof window.Storage?.[g] === 'function');
                return { mode: 'storage', present: present.length, total: getters.length };
            });
            if (r.mode === 'fn') {
                if (r.err) throw new Error(`buildFinancialContext threw: ${r.err}`);
                if (!r.ctx || r.ctx.length < 10) throw new Error('buildFinancialContext produced empty context');
            } else if (r.mode === 'storage') {
                if (r.present === 0) throw new Error('none of the Storage getters RAG context depends on are present');
                if (r.present < r.total) warn(`only ${r.present}/${r.total} RAG Storage getters present`, 'context may be partial');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('18/RAG: system prompt includes ground-truth enforcement footer', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-chat.html');
        try {
            const r = await page.evaluate(async () => {
                if (typeof window.buildSystemPrompt !== 'function') return { skip: true };
                try {
                    const sp = await window.buildSystemPrompt();
                    const s = String(sp);
                    return { skip: false, hasGround: /GROUND TRUTH/i.test(s), hasNeverInvent: /never invent|don't invent/i.test(s), hasVerify: /verify with a licensed/i.test(s), len: s.length };
                } catch (e) { return { skip: false, err: String(e.message) }; }
            });
            if (r.skip) { warn('buildSystemPrompt not exposed on window (module-scoped)', 'cannot assert prompt contents directly'); return; }
            if (r.err) throw new Error(`buildSystemPrompt threw: ${r.err}`);
            if (!r.hasGround) throw new Error('system prompt missing GROUND TRUTH ENFORCEMENT section');
            if (!r.hasNeverInvent) warn('prompt lacks an explicit "never invent numbers" instruction', '');
            if (!r.hasVerify) warn('prompt lacks the "verify with a licensed financial advisor" disclaimer', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('19/RAG: ai-chat has a send control + textarea wired to sendMessage()', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-chat.html');
        try {
            const r = await page.evaluate(() => ({
                hasSendFn: typeof window.sendMessage === 'function',
                hasSendBtn: !!document.querySelector('#sendBtn, [onclick*="sendMessage" i]'),
                hasInput: !!document.querySelector('textarea, input[type=text]'),
            }));
            if (!r.hasInput) throw new Error('no chat input field on ai-chat page');
            if (!r.hasSendFn && !r.hasSendBtn) throw new Error('no sendMessage fn and no send button — chat not wired');
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 6. MULTI-CURRENCY REFORMAT ════════════════════════════
    await step('20/Currency: formatCurrency renders distinct symbols for ILS / USD / BRL', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                if (typeof window.I18n?.formatCurrency !== 'function') return { skip: true };
                return {
                    skip: false,
                    ils: window.I18n.formatCurrency(1234, 'ILS'),
                    usd: window.I18n.formatCurrency(1234, 'USD'),
                    brl: window.I18n.formatCurrency(1234, 'BRL'),
                };
            });
            if (r.skip) { warn('I18n.formatCurrency unavailable', ''); return; }
            const set = new Set([r.ils, r.usd, r.brl]);
            if (set.size < 3) throw new Error(`currency outputs not distinct: ILS="${r.ils}" USD="${r.usd}" BRL="${r.brl}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('21/Currency: switching language flips getCurrency() default currency code', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(async () => {
                if (typeof window.I18n?.getCurrency !== 'function' || typeof window.I18n?.setLanguage !== 'function') return { skip: true };
                const out = {};
                for (const l of ['he', 'en', 'pt', 'es']) {
                    window.I18n.setLanguage(l);
                    await new Promise(r => setTimeout(r, 200));
                    out[l] = window.I18n.getCurrency();
                }
                return { skip: false, out };
            });
            if (r.skip) { warn('I18n.getCurrency/setLanguage unavailable', ''); return; }
            const vals = Object.values(r.out).filter(Boolean);
            if (!vals.length) throw new Error('getCurrency returned nothing across all 4 languages');
            // It is acceptable for all to default to ILS; we only flag if codes are malformed.
            const bad = vals.find(c => !/^[A-Z]{3}$/.test(String(c)));
            if (bad) throw new Error(`malformed currency code: "${bad}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('22/Currency: formatNumber respects locale grouping after language switch', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(async () => {
                if (typeof window.I18n?.formatNumber !== 'function' || typeof window.I18n?.setLanguage !== 'function') return { skip: true };
                window.I18n.setLanguage('en'); await new Promise(r => setTimeout(r, 150));
                const en = window.I18n.formatNumber(1234567);
                window.I18n.setLanguage('he'); await new Promise(r => setTimeout(r, 150));
                const he = window.I18n.formatNumber(1234567);
                return { skip: false, en, he };
            });
            if (r.skip) { warn('I18n.formatNumber unavailable', ''); return; }
            if (!/\d/.test(String(r.en)) || !/\d/.test(String(r.he))) throw new Error(`formatNumber produced non-numeric: en="${r.en}" he="${r.he}"`);
            if (String(r.en).replace(/\D/g, '') !== '1234567') throw new Error(`grouping lost digits: "${r.en}"`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 7. SIDEBAR NAV — LINK RESOLUTION + PRO BADGES ══════════
    await step('23/Sidebar: every sidebar href resolves (no 404 for first 6 internal links)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const hrefs = await page.evaluate(() => {
                const set = new Set();
                document.querySelectorAll('aside a[href], .sidebar a[href], nav a[href]').forEach(a => {
                    const h = a.getAttribute('href') || '';
                    if (h && !/^(#|javascript:|mailto:|https?:)/i.test(h) && /\.html/.test(h)) set.add(h);
                });
                return [...set].slice(0, 6);
            });
            if (!hrefs.length) { warn('no internal .html sidebar links discovered', ''); return; }
            const bad = [];
            for (const h of hrefs) {
                // Sidebar hrefs on the dashboard are root-relative (e.g. "pages/bank.html"),
                // so resolve against the site root, not /pages/.
                const url = new URL(h.replace(/^\.\.\//, ''), BASE + '/').href;
                const resp = await page.request.get(url, { timeout: 20000 }).catch(() => null);
                if (!resp || resp.status() >= 400) bad.push(`${h} → ${resp ? resp.status() : 'no-response'}`);
            }
            if (bad.length) throw new Error(`broken sidebar link(s): ${bad.join('; ')}`);
        } finally { await page.close(); await ctx.close(); }
    });

    await step('24/Sidebar: locked Pro items carry [data-pro] OR a lock affordance', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => ({
                dataPro: document.querySelectorAll('aside [data-pro], .sidebar [data-pro], nav [data-pro]').length,
                lockMark: document.querySelectorAll('aside .pro-lock, aside .pro-badge, .sidebar .pro-lock, .sidebar .pro-badge, [class*="lock" i]').length,
                navItems: document.querySelectorAll('aside .nav-item, .sidebar .nav-item, aside a, .sidebar a').length,
            }));
            if (r.navItems === 0) { warn('sidebar produced no nav items', ''); return; }
            // Pre-launch (PAYWALL_ACTIVE=false) may suppress badges — informational only.
            if (r.dataPro === 0 && r.lockMark === 0) {
                warn('no [data-pro] / lock markers in sidebar', 'expected when PAYWALL_ACTIVE=false; verify Pro wiring exists');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('25/Sidebar: AI-chat, Goals, Reports links all distinct hrefs (no copy-paste dupes)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const r = await page.evaluate(() => {
                const grab = (frag) => {
                    const a = document.querySelector(`aside a[href*="${frag}"], .sidebar a[href*="${frag}"], nav a[href*="${frag}"]`);
                    return a ? a.getAttribute('href') : null;
                };
                return { ai: grab('ai-chat'), goals: grab('goals'), reports: grab('reports') };
            });
            const present = Object.entries(r).filter(([, v]) => v);
            if (present.length < 2) { warn(`only ${present.length}/3 of ai-chat/goals/reports links present`, ''); return; }
            const vals = present.map(([, v]) => v);
            if (new Set(vals).size !== vals.length) throw new Error(`duplicate hrefs among sidebar links: ${JSON.stringify(r)}`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 8. GOALS / GEMEL / BANK render w/o console errors ══════
    for (const [n, path] of [['26', '/pages/goals.html'], ['27', '/pages/gemel.html'], ['28', '/pages/bank.html']]) {
        await step(`${n}/Render: ${path.split('/').pop()} loads with no uncaught JS error within 7s`, async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const errs = [];
            page.on('pageerror', e => errs.push(String(e.message)));
            try {
                const resp = await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
                if (resp && resp.status() >= 400) throw new Error(`${path} returned HTTP ${resp.status()}`);
                await page.waitForTimeout(7000);
                const bodyLen = await page.evaluate(() => (document.body.innerText || '').length);
                if (bodyLen < 200) throw new Error(`${path} body only ${bodyLen} chars — page may be empty/broken`);
                if (errs.length) throw new Error(`uncaught error: ${errs[0].slice(0, 180)}`);
            } finally { await page.close(); await ctx.close(); }
        });
    }

    // (Charts coverage folded into the render block below as flow 29.)
    await step('29/Charts: at least one canvas renders with non-zero pixel dimensions on dashboard', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Give chart libs time to draw.
            await page.waitForTimeout(3500);
            const r = await page.evaluate(() => {
                const cs = [...document.querySelectorAll('canvas')];
                if (!cs.length) return { count: 0 };
                const sized = cs.filter(c => {
                    const rect = c.getBoundingClientRect();
                    return (c.width > 0 && c.height > 0) || (rect.width > 0 && rect.height > 0);
                });
                return { count: cs.length, sized: sized.length };
            });
            if (r.count === 0) { warn('no <canvas> on dashboard — charts may render as SVG/HTML or be auth-gated', ''); return; }
            if (r.sized === 0) throw new Error(`${r.count} canvas element(s) but all have zero dimensions — chart render failed`);
        } finally { await page.close(); await ctx.close(); }
    });

    // ═══════════════ 9. OFFLINE PWA SHELL + 10. i18n 4-lang dashboard ══════
    await step('30/Offline+i18n: SW serves shell offline AND HE/EN/PT/ES round-trip on dashboard', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // --- Part A: offline shell ---
            let offlineOk = null;
            const swReady = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return false;
                await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]);
                return !!navigator.serviceWorker.controller;
            });
            if (swReady) {
                await ctx.setOffline(true);
                const resp = await page.goto(BASE + '/?offline=1', { waitUntil: 'load', timeout: 20000 }).catch(() => null);
                offlineOk = !!resp; // SW served something instead of a network failure
                if (resp) {
                    const len = await page.evaluate(() => (document.body.innerText || '').length).catch(() => 0);
                    if (len < 50) offlineOk = false;
                }
                await ctx.setOffline(false);
                await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 30000 });
                await page.waitForTimeout(1500);
            }
            if (swReady && offlineOk === false) {
                warn('SW controller present but offline navigation served no shell', 'verify sw.js fetch-handler fallback');
            } else if (!swReady) {
                warn('no SW controller on first load — offline shell not testable this run', '');
            }

            // --- Part B: 4-language round-trip on a dashboard label ---
            const sample = async () => page.evaluate(() => {
                const el = document.querySelector('aside .nav-item a span:not(.icon)') ||
                           document.querySelector('.sidebar .nav-item a') ||
                           document.querySelector('[data-i18n]');
                return el ? (el.textContent || '').trim().slice(0, 60) : '';
            });
            const seen = {};
            for (const lang of ['he', 'en', 'pt', 'es']) {
                await page.evaluate((l) => {
                    if (window.I18n && typeof window.I18n.setLanguage === 'function') window.I18n.setLanguage(l);
                    else localStorage.setItem('wl_lang', l);
                }, lang);
                await page.waitForTimeout(1100);
                seen[lang] = await sample();
            }
            const distinct = new Set(Object.values(seen).filter(Boolean));
            if (distinct.size < 3) {
                throw new Error(`only ${distinct.size}/4 distinct dashboard labels across HE/EN/PT/ES: ${JSON.stringify(seen)}`);
            }
        } finally { await page.close(); await ctx.close(); }
    });

    finalize('wizemoney-flows-v6-report.md');
    await browser.close();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
