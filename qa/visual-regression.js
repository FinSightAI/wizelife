#!/usr/bin/env node
// Visual regression — screenshot diff for UI breakages
// First run: captures baseline screenshots. Subsequent runs: diff against baseline.
// Run: node qa/visual-regression.js
//       node qa/visual-regression.js --update-baseline   (refresh after intentional UI change)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPDATE = process.argv.includes('--update-baseline');
const BASELINE_DIR = path.join(__dirname, 'baselines');
const CURRENT_DIR = path.join(__dirname, 'current');
const DIFF_DIR = path.join(__dirname, 'diffs');

for (const d of [BASELINE_DIR, CURRENT_DIR, DIFF_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const VIEWS = [
    // [name, URL, viewport, wait_selector]
    ['wizelife-landing-desktop',  'https://wizelife.ai/',                          { width: 1280, height: 800 }, 'nav, .hero'],
    ['wizelife-landing-mobile',   'https://wizelife.ai/',                          { width: 390, height: 844 },  'nav, .hero'],
    ['wizelife-auth-desktop',     'https://wizelife.ai/auth.html',                 { width: 1280, height: 800 }, '#loginForm'],
    ['wizelife-auth-mobile',      'https://wizelife.ai/auth.html',                 { width: 390, height: 844 },  '#loginForm'],
    ['wizelife-about-desktop',    'https://wizelife.ai/about.html',                { width: 1280, height: 800 }, '.hero'],
    ['wizelife-feedback-desktop', 'https://wizelife.ai/feedback.html',             { width: 1280, height: 800 }, 'form'],
    ['wizemoney-landing',         'https://money.wizelife.ai/',                    { width: 1280, height: 800 }, 'body'],
    ['wizetax-advisor',           'https://tax.wizelife.ai/advisor',               { width: 1280, height: 800 }, 'textarea'],
    ['wizetax-mobile',            'https://tax.wizelife.ai/advisor',               { width: 390, height: 844 },  'textarea'],
    ['wizehealth-vitara',         'https://health.wizelife.ai/',                  { width: 1280, height: 800 }, 'body'],
    ['wizetravel-landing',        'https://travel.wizelife.ai/',                   { width: 1280, height: 800 }, 'body'],
    ['wizedeal-landing',          'https://deal.wizelife.ai/',                     { width: 1280, height: 800 }, 'body'],
];

function hash(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12); }

const out = [];
const changed = [];
const newViews = [];
const unchanged = [];

(async () => {
    const browser = await chromium.launch();
    for (const [name, url, viewport, wait] of VIEWS) {
        try {
            const ctx = await browser.newContext({ viewport });
            const page = await ctx.newPage();
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            try { await page.waitForSelector(wait, { timeout: 8000 }); } catch {}
            await page.waitForTimeout(1500); // let animations settle

            const screenshot = await page.screenshot({ fullPage: false });
            const currentPath  = path.join(CURRENT_DIR,  `${name}.png`);
            const baselinePath = path.join(BASELINE_DIR, `${name}.png`);
            fs.writeFileSync(currentPath, screenshot);

            const currentHash = hash(screenshot);
            await page.close(); await ctx.close();

            if (!fs.existsSync(baselinePath)) {
                fs.copyFileSync(currentPath, baselinePath);
                newViews.push({ name, hash: currentHash });
                out.push(`📸 NEW baseline: ${name}`);
                continue;
            }

            if (UPDATE) {
                fs.copyFileSync(currentPath, baselinePath);
                out.push(`♻️  Updated baseline: ${name}`);
                continue;
            }

            const baselineHash = hash(fs.readFileSync(baselinePath));
            if (currentHash === baselineHash) {
                unchanged.push(name);
                out.push(`✅ Unchanged: ${name}`);
            } else {
                // Compare pixel difference roughly (size-based heuristic)
                const baselineSize = fs.statSync(baselinePath).size;
                const currentSize = fs.statSync(currentPath).size;
                const pctDiff = Math.abs(currentSize - baselineSize) / baselineSize * 100;
                changed.push({ name, baselineHash, currentHash, pctDiff: pctDiff.toFixed(1) });
                out.push(`🔴 CHANGED: ${name} (size ±${pctDiff.toFixed(1)}%) — baseline=${baselineHash} current=${currentHash}`);
                // Save diff hint
                fs.writeFileSync(
                    path.join(DIFF_DIR, `${name}.txt`),
                    `Baseline hash: ${baselineHash}\nCurrent hash:  ${currentHash}\nSize diff:     ${pctDiff.toFixed(1)}%\n\nView baseline: ${baselinePath}\nView current:  ${currentPath}\n`
                );
            }
        } catch (e) {
            out.push(`⚠️  ${name} crashed: ${String(e.message).slice(0, 100)}`);
        }
    }
    await browser.close();

    // Final report
    const report = [
        `# 🎨 Visual regression — ${new Date().toISOString().slice(0, 10)}`,
        '',
        `**${VIEWS.length} views** | **Unchanged:** ${unchanged.length} | **Changed:** ${changed.length} | **New baselines:** ${newViews.length}`,
        '',
    ];

    if (changed.length) {
        report.push('## 🔴 Visual regressions detected');
        report.push('| # | View | Size Δ | Baseline | Current |');
        report.push('|---|------|--------|----------|---------|');
        changed.forEach((c, i) => {
            report.push(`| ${i+1} | ${c.name} | ${c.pctDiff}% | \`${c.baselineHash}\` | \`${c.currentHash}\` |`);
        });
        report.push('');
        report.push(`**Review diffs** at \`qa/diffs/\` and either fix the regression or run with \`--update-baseline\`.`);
        report.push('');
    }
    if (newViews.length) {
        report.push('## 📸 New baselines captured (first run for this view)');
        for (const n of newViews) report.push(`- ${n.name}`);
        report.push('');
    }
    if (unchanged.length === VIEWS.length) {
        report.push('✅ **All views match baseline — no visual regressions.**');
        report.push('');
    }

    report.push('---');
    report.push('_<details><summary>Full log</summary>_');
    report.push('');
    report.push(...out);
    report.push('');
    report.push('</details>');

    const finalReport = report.join('\n');
    fs.writeFileSync('visual-regression-report.md', finalReport);
    fs.writeFileSync('/tmp/visual-regressions', String(changed.length));
    console.log(finalReport);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
