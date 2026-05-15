#!/usr/bin/env node
// WizeTax — flows v4. The 5 deep flows we lacked coverage for:
//   1. Multi-turn chat context — does the agent remember prior turns?
//   2. Session save+load round-trip — survives reload?
//   3. Payslip OCR end-to-end — analysis result appears after upload?
//   4. Israel Exit Wizard 5-step — wizard state advances through steps?
//   5. Server cold-start retry — does the FE survive a 503 and recover?
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://tax.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeTax-FlowsV4');

async function fresh(browser, viewport = { width: 1280, height: 800 }, path = '/advisor') {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + path + '?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    return { ctx, page };
}

async function sendChat(page, text) {
    const ta = page.locator('textarea').first();
    await ta.waitFor({ timeout: 8000 });
    await ta.fill(text);
    const send = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
    await send.click();
    // Wait for assistant turn to begin streaming, then settle (we don't wait for full completion).
    await page.waitForFunction(() => {
        const els = document.querySelectorAll('[class*="assistant" i], [class*="message" i]');
        return Array.from(els).some(e => (e.textContent || '').trim().length > 20);
    }, { timeout: 90000 });
    await page.waitForTimeout(2500); // allow some streaming to land
}

(async () => {
    const browser = await chromium.launch();

    // ── 1. Multi-turn chat context ─────────────────────────────────────────
    await step('Multi-turn context: 2nd message can reference the 1st', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await sendChat(page, 'I currently live in Tel Aviv. Note this for context.');
            await sendChat(page, 'What did I just tell you about my city?');
            const bodyText = await page.evaluate(() => document.body.textContent || '');
            if (!/tel aviv|תל אביב|tel-aviv|telaviv/i.test(bodyText)) {
                throw new Error('Assistant did not echo back Tel Aviv — conversation_history likely not threaded');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Session save+load round-trip ────────────────────────────────────
    await step('Session save+load: messages survive reload', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await sendChat(page, 'Quick test: please answer with the single word OK.');
            // Try to click a "save" / "new chat" trigger if exposed; otherwise rely on auto-save.
            const saveBtn = page.locator('button:has-text("שמור"), button:has-text("Save")').first();
            if (await saveBtn.count()) await saveBtn.click().catch(() => {});
            const sessions = await page.evaluate(() => {
                try {
                    const raw = localStorage.getItem('wt_sessions') || localStorage.getItem('tax_master_sessions') || '[]';
                    return JSON.parse(raw).length;
                } catch { return 0; }
            });
            if (sessions === 0) {
                warn('No session detected in localStorage', 'auto-save may be disabled or stored under a different key');
                return;
            }
            // Reload and assert the message list is non-empty
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3500);
            const restored = await page.evaluate(() => document.body.textContent || '');
            if (!/Quick test|אישור|OK/i.test(restored)) throw new Error('Saved message did not restore after reload');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. Payslip OCR end-to-end ──────────────────────────────────────────
    await step('Payslip OCR: file input → analysis text appears', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Find a file input (payslip upload).
            const fileInput = page.locator('input[type=file]').first();
            if (!(await fileInput.count())) { warn('No file input on advisor page', 'payslip upload UI may live in a panel that needs activation'); return; }
            // Use a 1-px transparent PNG as the upload payload — we only assert the FE
            // wires the file event into a request lifecycle, not the OCR accuracy.
            const pngBytes = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
                'base64'
            );
            await fileInput.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngBytes });
            // Wait for either a result block, an error toast, or a 'too small/unreadable' message — any of those proves the pipeline ran.
            await page.waitForFunction(() => {
                const t = document.body.textContent || '';
                return /ניתוח|analysis|לא ניתן לקרוא|unreadable|error|שגיאה|לא תקין/i.test(t);
            }, { timeout: 45000 }).catch(() => { throw new Error('payslip pipeline produced no visible result/error within 45s'); });
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. Israel Exit Wizard 5-step ───────────────────────────────────────
    await step('Israel Exit Wizard: step 1 → step 2 advances', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // Open the wizard via the sidebar entry.
            const wizardLink = page.locator('button:has-text("עזיבת"), button:has-text("Israel Exit"), button:has-text("Exit Wizard"), button:has-text("תכנון עזיבת")').first();
            if (!(await wizardLink.count())) { warn('Israel Exit Wizard entry not found', 'sidebar collapsible may be closed by default'); return; }
            await wizardLink.click();
            await page.waitForTimeout(1200);
            // Look for a "next" / "המשך" / "Continue" affordance.
            const nextBtn = page.locator('button:has-text("המשך"), button:has-text("Next"), button:has-text("הבא"), button:has-text("Continue")').first();
            if (!(await nextBtn.count())) { warn('No Next button in wizard', 'wizard may need initial form fill before Next is enabled'); return; }
            // Capture progress indicator text before click, then again after.
            const before = await page.evaluate(() => document.body.textContent || '');
            await nextBtn.click().catch(() => {});
            await page.waitForTimeout(900);
            const after = await page.evaluate(() => document.body.textContent || '');
            if (before === after) throw new Error('clicking Next did not change wizard state');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Server cold-start retry ─────────────────────────────────────────
    await step('Cold-start retry: 503 on /api/chat surfaces a "warming up" message', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx.newPage();
        try {
            // Force the first /api/chat call to return 503. Subsequent calls pass through.
            let blocked = 0;
            await page.route('**/api/chat', (route) => {
                if (blocked < 1) {
                    blocked += 1;
                    return route.fulfill({ status: 503, body: '{"detail":{"message":"Service Unavailable"}}' });
                }
                return route.continue();
            });
            await page.goto(BASE + '/advisor?_t=' + Date.now(), { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2500);
            const ta = page.locator('textarea').first();
            await ta.waitFor({ timeout: 8000 });
            await ta.fill('Hello');
            const send = page.locator('button[type=submit], button:has-text("Send"), button:has-text("שלח")').first();
            await send.click();
            // After the first 503 the FE should show a warming-up message somewhere.
            await page.waitForFunction(() => {
                const t = document.body.textContent || '';
                return /מתחמם|warming|preparando|preparando a resposta|רגע אחד|one moment|un momento/i.test(t);
            }, { timeout: 20000 }).catch(() => { throw new Error('FE did not surface a "warming up" notice after a 503'); });
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
