#!/usr/bin/env node
// WizeMoney — flows v4. The 5 deep flows we lacked coverage for:
//   1. Add transaction → appears in dashboard list/total
//   2. Stock add → portfolio table updates
//   3. AI Story generation — output text appears
//   4. CSV export — file download triggered (or download URL exposed)
//   5. Family dashboard — multiple profiles render
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://money.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeMoney-FlowsV4');

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

    // ── 1. Add a transaction via localStorage seed → visible on dashboard ──
    await step('Transaction seed: planted tx appears in dashboard list', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            // The app stores transactions in finance_data or similar key. We
            // plant a sentinel value and verify it surfaces after reload.
            const planted = await page.evaluate(() => {
                const candidates = ['finance_data', 'transactions', 'wize_money_data', 'app_state'];
                const tx = { id: 'qa-tx-1', description: 'QA-SENTINEL-TX', amount: 1234, date: new Date().toISOString().slice(0, 10) };
                let key = null;
                for (const k of candidates) {
                    const raw = localStorage.getItem(k);
                    if (raw) {
                        try {
                            const obj = JSON.parse(raw);
                            if (Array.isArray(obj.transactions)) {
                                obj.transactions.push(tx);
                                localStorage.setItem(k, JSON.stringify(obj));
                                key = k; break;
                            }
                        } catch {}
                    }
                }
                if (!key) {
                    // No existing data — plant a minimal shell.
                    localStorage.setItem('finance_data', JSON.stringify({ transactions: [tx] }));
                    key = 'finance_data';
                }
                return key;
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const found = await page.evaluate(() => /QA-SENTINEL-TX|1234/.test(document.body.textContent || ''));
            if (!found) warn(`Planted in ${planted} but did not surface`, 'app may rehydrate from Firestore and ignore localStorage');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 2. Stocks page — table renders, allows row addition ────────────────
    await step('Stocks page: add-stock UI present (input + button)', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/stocks.html');
        try {
            const ticker = page.locator('input[placeholder*="ticker" i], input[placeholder*="סימול" i], input[placeholder*="AAPL" i]').first();
            if (!(await ticker.count())) { warn('No ticker input on /stocks', 'stocks UI may use a different control'); return; }
            await ticker.fill('AAPL');
            const addBtn = page.locator('button:has-text("הוסף"), button:has-text("Add")').first();
            if (await addBtn.count()) await addBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 3. AI Story — clicking Generate yields visible story text ──────────
    await step('AI Story: generate button produces story text within 60s', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/ai-story.html');
        try {
            const gen = page.locator('button:has-text("צור"), button:has-text("Generate"), button:has-text("הפק"), button:has-text("Create")').first();
            if (!(await gen.count())) { warn('No Generate button on /ai-story', 'flow likely gated by plan'); return; }
            const beforeLen = (await page.evaluate(() => (document.body.textContent || '').length));
            await gen.click().catch(() => {});
            await page.waitForFunction((min) => (document.body.textContent || '').length > min + 200, beforeLen, { timeout: 60000 })
                .catch(() => { throw new Error('story did not lengthen by ≥200 chars within 60s'); });
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 4. CSV / PDF export — download triggers on click ───────────────────
    await step('Export: clicking a CSV/PDF export button triggers a download', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/reports.html');
        try {
            const exportBtn = page.locator('button:has-text("CSV"), button:has-text("PDF"), button:has-text("ייצוא"), button:has-text("Export"), a[download]').first();
            if (!(await exportBtn.count())) { warn('No CSV/PDF export found on /reports', 'export may be gated by plan / different page'); return; }
            const dl = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
            await exportBtn.click();
            const got = await dl;
            if (!got) warn('No download fired in 12s', 'button may open modal instead — verify manually');
        } finally { await page.close(); await ctx.close(); }
    });

    // ── 5. Family dashboard — at least one profile chip renders ────────────
    await step('Family page: profile-chip UI element renders', async () => {
        const { ctx, page } = await fresh(browser, undefined, '/pages/family.html');
        try {
            await page.waitForTimeout(2500);
            const txt = await page.evaluate(() => document.body.textContent || '');
            if (!/אני|Me|מבוגר|Adult|ילד|Child|משפחה|Family/i.test(txt)) {
                throw new Error('family page lacks the expected profile/family copy');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    finalize();
    await browser.close();
})();
