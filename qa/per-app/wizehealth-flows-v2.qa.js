#!/usr/bin/env node
// WizeHealth — flows v2: file upload variants, multi-model, profile context
// persistence, share link, emergency-call disclaimer presence.
const { chromium } = require('playwright');
const { makeReporter } = require('../shared-lib/helpers');

const BASE = 'https://health.wizelife.ai';
const { step, warn, finalize } = makeReporter('WizeHealth-FlowsV2');

async function fresh(browser, viewport = { width: 1280, height: 800 }) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?_t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000); // Render cold-start tolerance
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch();

    await step('Emergency number visible (101 for IL OR 911 EN)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            if (!/\b101\b|\b911\b|emergency|חירום/i.test(txt)) {
                throw new Error('No emergency-number disclaimer found — required for medical app compliance');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Multiple AI model options listed', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const models = await page.evaluate(() => {
                const txt = document.body.innerText;
                const known = ['Llama', 'Gemini', 'GPT', 'Claude', 'Qwen', 'DeepSeek', 'Mistral'];
                return known.filter(m => txt.includes(m));
            });
            if (models.length < 2) warn(`only ${models.length} known model names visible`, '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Vision-capable model labeled (for X-ray / ultrasound)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const txt = await page.evaluate(() => document.body.innerText);
            if (!/vision|תמונות|images|imagens|imágenes/i.test(txt)) {
                warn('No vision-model label visible', 'imaging analysis may not be discoverable');
            }
        } finally { await page.close(); await ctx.close(); }
    });

    await step('File input accepts PDF + image', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const accepts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('input[type=file]')).map(f => f.accept || '*');
            });
            if (accepts.length === 0) warn('No file inputs', '');
            const ok = accepts.some(a => /pdf|image|\*/i.test(a));
            if (!ok && accepts.length) warn(`File accept attrs: ${accepts.join(', ')}`, 'verify upload works');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Chat textarea accepts a long medical question', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ta = page.locator('#txt, textarea').first();
            await ta.waitFor({ timeout: 30000 });
            const q = 'I have an LDL cholesterol of 145 and HDL of 38, age 42, family history of heart disease. ' +
                     'Statin or lifestyle change first? Considering atorvastatin 10mg.';
            await ta.fill(q);
            const got = await ta.inputValue();
            if (got.length < q.length - 5) throw new Error('long question truncated');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Profile / context — persists in localStorage', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            await page.evaluate(() => {
                localStorage.setItem('wh_profile', JSON.stringify({ age: 42, sex: 'M', conditions: ['hypertension'] }));
            });
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(3000);
            const stored = await page.evaluate(() => localStorage.getItem('wh_profile'));
            if (!stored || !stored.includes('42')) warn('profile didn\'t persist', 'may use different key');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('100%-local privacy mode messaging present', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /100%\s*(local|מקומי)|on.device|פרטיות מלאה|Ollama/i.test(document.body.innerText)
            );
            if (!has) warn('No local-mode privacy copy detected', 'feature may be hidden');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Share-link feature mentioned', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /share|שתף|compartilhar|compartir/i.test(document.body.innerText)
            );
            if (!has) warn('No share UI text detected', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Medical disclaimer text contains "not a substitute" or equivalent', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const ok = await page.evaluate(() =>
                /not a substitute|לא מחליף|orientação médica profissional|consejo médico profesional|professional medical/i.test(document.body.innerText)
            );
            if (!ok) throw new Error('Hard requirement: medical disclaimer text missing — compliance risk');
        } finally { await page.close(); await ctx.close(); }
    });

    await step('Local model setup instructions visible (Ollama/download/install)', async () => {
        const { ctx, page } = await fresh(browser);
        try {
            const has = await page.evaluate(() =>
                /Ollama|ollama|הורד|download|baixar|descargar/i.test(document.body.innerText)
            );
            if (!has) warn('No local-model download instructions text', '');
        } finally { await page.close(); await ctx.close(); }
    });

    await browser.close();
    finalize('wizehealth-flows-v2-report.md');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
