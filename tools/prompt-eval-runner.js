#!/usr/bin/env node
/**
 * prompt-eval-runner.js
 *
 * Lay the scaffolding for AI prompt regression tests across the WizeLife
 * AI surfaces (WizeTax advisor, WizeMoney AI chat, WizeTravel planner).
 *
 * What this DOES today:
 *   - Ensures `tools/prompt-eval-queries.json` exists with 30 canonical
 *     queries (10 per surface, ~5 he + ~5 en each) plus expected-fact
 *     keywords each answer should contain.
 *   - Reads that JSON and emits a human-readable test plan to
 *     `/tmp/prompt-eval-report.md`.
 *
 * What this does NOT do:
 *   - Does NOT actually hit any AI provider (Gemini / Anthropic / OpenAI).
 *     That would burn real budget every run. The plumbing is sketched at
 *     the bottom of the file in a commented-out `runLive()` block.
 *
 * Run:  node tools/prompt-eval-runner.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const QUERIES_PATH = path.join(__dirname, 'prompt-eval-queries.json');
const REPORT_PATH  = '/tmp/prompt-eval-report.md';

// --------------------------------------------------------------------------
// Canonical query set
// --------------------------------------------------------------------------

const SEED_QUERIES = {
  generatedAt: '2026-05-19',
  version: 1,
  surfaces: {
    wizetax: {
      label: 'WizeTax (Tax Master advisor)',
      endpoint: 'https://mastermove.vercel.app/api/chat',
      queries: [
        { id: 'tax-he-01', lang: 'he', prompt: 'מה אחוז המע"מ בישראל ב-2026?',
          expect: ['18%', '17%', 'מע"מ'] },
        { id: 'tax-he-02', lang: 'he', prompt: 'מהי תקרת הפקדה לקרן השתלמות לעצמאי?',
          expect: ['קרן השתלמות', 'תקרה', 'עצמאי'] },
        { id: 'tax-he-03', lang: 'he', prompt: 'מה זה תיאום מס ומתי צריך לעשות אותו?',
          expect: ['תיאום מס', 'שני מקומות', 'מעסיק'] },
        { id: 'tax-he-04', lang: 'he', prompt: 'איך מחושב מס שבח על דירת מגורים?',
          expect: ['מס שבח', 'דירת מגורים', 'פטור'] },
        { id: 'tax-he-05', lang: 'he', prompt: 'מהן נקודות זיכוי לתושב ישראל?',
          expect: ['נקודות זיכוי', 'תושב', 'מס הכנסה'] },
        { id: 'tax-en-01', lang: 'en', prompt: 'What is the Israeli VAT rate in 2026?',
          expect: ['VAT', '18', 'Israel'] },
        { id: 'tax-en-02', lang: 'en', prompt: 'How are capital gains taxed for retail investors in Israel?',
          expect: ['capital gains', '25%', 'Israel'] },
        { id: 'tax-en-03', lang: 'en', prompt: 'What is "tiyum mas" and when do I need it?',
          expect: ['tax coordination', 'two employers', 'tiyum'] },
        { id: 'tax-en-04', lang: 'en', prompt: 'Do I owe tax on dividends from a foreign ETF as an Israeli resident?',
          expect: ['dividend', 'foreign', 'Israel', 'withholding'] },
        { id: 'tax-en-05', lang: 'en', prompt: 'What is the deadline to file an annual income tax return in Israel?',
          expect: ['April', 'May', 'annual return', 'deadline'] },
      ],
    },
    wizemoney: {
      label: 'WizeMoney (FinSight AI chat / AI Story)',
      endpoint: 'https://us-central1-finzilla-7f1f9.cloudfunctions.net/aiChat',
      queries: [
        { id: 'money-he-01', lang: 'he', prompt: 'הסבר לי מה זה ETF במשפט אחד.',
          expect: ['קרן', 'נסחרת', 'בורסה'] },
        { id: 'money-he-02', lang: 'he', prompt: 'מהי קצבה מזכה ומה ההשלכה שלה לפנסיה?',
          expect: ['קצבה מזכה', 'פנסיה', 'פטור ממס'] },
        { id: 'money-he-03', lang: 'he', prompt: 'מה ההבדל בין פיקדון בנקאי לקרן כספית?',
          expect: ['פיקדון', 'קרן כספית', 'נזילות', 'מס'] },
        { id: 'money-he-04', lang: 'he', prompt: 'מהי תחזית לאינפלציה בישראל לשנה הקרובה?',
          expect: ['אינפלציה', 'בנק ישראל', 'תחזית'] },
        { id: 'money-he-05', lang: 'he', prompt: 'איזה סכום חירום מומלץ לשמור בקרן כספית?',
          expect: ['חירום', 'חודשי', '3', '6'] },
        { id: 'money-en-01', lang: 'en', prompt: 'In one sentence, what is an ETF?',
          expect: ['exchange-traded', 'fund', 'basket'] },
        { id: 'money-en-02', lang: 'en', prompt: 'How much emergency fund should I keep in a money market fund?',
          expect: ['3', '6', 'months', 'emergency'] },
        { id: 'money-en-03', lang: 'en', prompt: 'What is the difference between Keren Hishtalmut and Kupat Gemel?',
          expect: ['Keren Hishtalmut', 'Kupat Gemel', 'withdraw', 'tax'] },
        { id: 'money-en-04', lang: 'en', prompt: 'Explain compound interest like I am 12.',
          expect: ['compound', 'interest', 'time'] },
        { id: 'money-en-05', lang: 'en', prompt: 'What is a safe withdrawal rate in retirement planning?',
          expect: ['4%', 'safe withdrawal', 'retirement', 'Trinity'] },
      ],
    },
    wizetravel: {
      label: 'WizeTravel (Mega Traveller planner)',
      endpoint: 'https://nodedai.streamlit.app/',
      queries: [
        { id: 'travel-he-01', lang: 'he', prompt: 'תכנן לי 3 ימים בליסבון לזוג אוהב אוכל.',
          expect: ['ליסבון', 'אוכל', 'יום', 'מסעדה'] },
        { id: 'travel-he-02', lang: 'he', prompt: 'מהי העונה הטובה ביותר לטיול ביפן?',
          expect: ['יפן', 'אביב', 'סתיו', 'סאקורה'] },
        { id: 'travel-he-03', lang: 'he', prompt: 'מה תקציב יומי סביר לתל-נווד באוסטין טקסס?',
          expect: ['אוסטין', 'דולר', 'יומי', 'תקציב'] },
        { id: 'travel-he-04', lang: 'he', prompt: 'איזה ויזה צריך ישראלי שנוסע לברזיל?',
          expect: ['ברזיל', 'ויזה', 'ישראלי', 'דרכון'] },
        { id: 'travel-he-05', lang: 'he', prompt: 'איך מגיעים מתחנת רכבת רומא לקולוסיאום?',
          expect: ['רומא', 'קולוסיאום', 'מטרו', 'תחנה'] },
        { id: 'travel-en-01', lang: 'en', prompt: 'Plan a 3-day Lisbon trip for a food-loving couple.',
          expect: ['Lisbon', 'food', 'day 1', 'restaurant'] },
        { id: 'travel-en-02', lang: 'en', prompt: 'Best time of year to visit Japan and why.',
          expect: ['Japan', 'spring', 'cherry', 'autumn'] },
        { id: 'travel-en-03', lang: 'en', prompt: 'What is a realistic daily budget for a digital nomad in Bali?',
          expect: ['Bali', 'daily', 'budget', '$'] },
        { id: 'travel-en-04', lang: 'en', prompt: 'Do Israeli passport holders need a visa for Brazil?',
          expect: ['Israeli', 'Brazil', 'visa', 'passport'] },
        { id: 'travel-en-05', lang: 'en', prompt: 'How do I get from Rome Termini to the Colosseum?',
          expect: ['Termini', 'Colosseum', 'Metro', 'Line B'] },
      ],
    },
  },
};

function ensureQueriesFile() {
  if (!fs.existsSync(QUERIES_PATH)) {
    fs.writeFileSync(QUERIES_PATH, JSON.stringify(SEED_QUERIES, null, 2), 'utf8');
    return { created: true, path: QUERIES_PATH };
  }
  return { created: false, path: QUERIES_PATH };
}

function loadQueries() {
  const raw = fs.readFileSync(QUERIES_PATH, 'utf8');
  return JSON.parse(raw);
}

function renderReport(data, fileInfo) {
  const lines = [];
  const surfaces = data.surfaces || {};
  const totalQ = Object.values(surfaces).reduce((n, s) => n + (s.queries || []).length, 0);

  lines.push('# Prompt Eval Test Plan');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Queries file: \`${fileInfo.path}\`${fileInfo.created ? ' (created on this run)' : ''}`);
  lines.push(`- Queries set version: ${data.version}`);
  lines.push(`- Surfaces: ${Object.keys(surfaces).length}`);
  lines.push(`- Total queries: ${totalQ}`);
  lines.push('');
  lines.push('> NOTE: This run **does not call any AI provider** — it only emits the test plan.');
  lines.push('> To execute live, uncomment the `runLive()` scaffold at the bottom of this file and');
  lines.push('> supply `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` env vars.');
  lines.push('');

  for (const [key, s] of Object.entries(surfaces)) {
    lines.push(`## ${s.label} (\`${key}\`)`);
    lines.push('');
    lines.push(`- Endpoint: \`${s.endpoint || '(unknown)'}\``);
    lines.push(`- Queries: ${(s.queries || []).length}`);
    lines.push('');
    lines.push('| ID | Lang | Prompt | Expected keywords |');
    lines.push('|---|---|---|---|');
    for (const q of (s.queries || [])) {
      const promptCell  = String(q.prompt || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const expectCell  = (q.expect || []).map(x => `\`${x}\``).join(', ');
      lines.push(`| ${q.id} | ${q.lang} | ${promptCell} | ${expectCell} |`);
    }
    lines.push('');
  }

  lines.push('## How to score (when live)');
  lines.push('');
  lines.push('For each query, the live runner should:');
  lines.push('1. Send the prompt to the surface endpoint.');
  lines.push('2. Lowercase the response and check each `expect` keyword is present.');
  lines.push('3. Pass = all keywords present. Fail = any missing.');
  lines.push('4. Aggregate per surface and emit pass-rate. Alert if any surface < 70%.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const fileInfo = ensureQueriesFile();
  const data = loadQueries();
  const report = renderReport(data, fileInfo);
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  const total = Object.values(data.surfaces || {}).reduce((n, s) => n + (s.queries || []).length, 0);
  console.log(`prompt-eval-runner: ${Object.keys(data.surfaces || {}).length} surfaces, ${total} queries`);
  console.log(`Queries: ${fileInfo.path}${fileInfo.created ? ' (created)' : ''}`);
  console.log(`Report:  ${REPORT_PATH}`);
  process.exit(0);
}

if (require.main === module) main();

// --------------------------------------------------------------------------
// FUTURE: live execution scaffolding
// --------------------------------------------------------------------------
// Uncomment, wire env vars, and add a CLI flag like `--live` to enable.
//
// async function runLive(data) {
//   const results = [];
//   for (const [surfaceKey, s] of Object.entries(data.surfaces)) {
//     for (const q of s.queries) {
//       const text = await callProvider(surfaceKey, q.prompt);  // implement
//       const lower = String(text || '').toLowerCase();
//       const missing = (q.expect || []).filter(k => !lower.includes(String(k).toLowerCase()));
//       results.push({
//         surface: surfaceKey,
//         id: q.id,
//         lang: q.lang,
//         pass: missing.length === 0,
//         missing,
//         response: text,
//       });
//     }
//   }
//   // Aggregate, write /tmp/prompt-eval-live-report.md, exit non-zero if any
//   // surface < 70% pass rate.
//   return results;
// }
//
// async function callProvider(surfaceKey, prompt) {
//   // Map surfaceKey -> provider + key + endpoint, do fetch(), return text.
//   throw new Error('not implemented');
// }
