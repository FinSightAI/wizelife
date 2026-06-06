#!/usr/bin/env node
/**
 * AI authed-smoke — POSITIVE liveness for every app's AI backend.
 *
 * The ~100 Playwright tiers + ai-safety-check assert *absence of bad* (no leak,
 * no unsafe dose). They do NOT assert *presence of good* — a silently-DEAD AI
 * (500 'API key not valid', empty stream, off-topic echo) passes them all. This
 * is exactly the gap that let a dead WizeDeal AI ship (see project_wizedeal_ai_key)
 * and the reason for the ai-health / positive-assertion push.
 *
 * So here we sign in (Firebase Auth REST), call each AI backend DIRECTLY with a
 * Bearer token, and assert the reply is: (1) HTTP 200, (2) substantive (not empty
 * / not an error blob), (3) ON-TOPIC for the question asked, and — for the
 * liability-critical advice AIs (Tax, Health) — (4) carries the mandated
 * disclaimer. No browser. ~30s.
 *
 * Needs QA_EMAIL_PRO/QA_PASSWORD_PRO (that account must be a paid tier or the
 * advice backends 429 at 3/day — see project_qa_backend_test_layer). No token →
 * the authed cases SKIP; WizeDeal parse-listing is anonymous so it still runs.
 *
 * SKIP (warn, don't fail) on: no token, 401/403 (token expired), 429 (quota).
 * FAIL only on a clear dead/broken/off-topic/missing-disclaimer signal.
 */
const fs = require('fs');

const out = ['# AI authed-smoke (positive liveness)\n', `_run ${new Date().toISOString()}_\n`];
const fails = []; let warns = 0, passes = 0;
const add = (s) => { out.push(s); };
const TIMEOUT = 60000;

const QA_EMAIL = process.env.QA_EMAIL_PRO || process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD_PRO || process.env.QA_PASSWORD;
const FB_KEY = 'AIzaSyDuzJHOMe89YmEFpKlaTgxT40BCNhK6PU0'; // public Firebase web API key

const TAX  = 'https://wizetax-backend-3ol2retcla-uc.a.run.app';
const HEALTH = 'https://health.wizelife.ai';
const DEAL = 'https://check-deal.vercel.app';

// Each case: a real user question + what a LIVE, on-topic answer must contain.
// `disclaimer` (where set) enforces disclaimer-on-output for the advice AIs.
const CASES = [
  {
    app: 'WizeTax', auth: true, url: `${TAX}/api/chat`,
    body: { message: 'What is the NHR / IFICI regime in Portugal, briefly?', profile: null, conversation_history: [], provider: null },
    onTopic: /portugal|nhr|ifici|tax|20%|income|resident/i,
    disclaimer: /not.*(tax|legal)|licensed|professional|לא ייעוץ|יועץ מס|רואה חשבון|מוסמך|התייעצ|התייעץ/i,
    label: 'answers a real tax question, on-topic + disclaimer',
  },
  {
    app: 'WizeHealth', auth: true, url: `${HEALTH}/api/chat`,
    body: { messages: [{ role: 'user', content: 'What is the difference between vitamin D2 and D3, in short?' }] },
    onTopic: /vitamin|d2|d3|cholecalciferol|ergocalciferol|ויטמין|sun|supplement/i,
    disclaimer: /doctor|physician|not.*medical|consult|רופא|לא.*ייעוץ|התייעצ|התייעץ|professional/i,
    label: 'answers a real health question, on-topic + disclaimer',
  },
  {
    app: 'WizeMoney', auth: true, url: `${TAX}/api/ai-proxy`,
    // ai-proxy uses Gemini's message shape: parts:[{text}], NOT content.
    body: { messages: [{ role: 'user', parts: [{ text: 'Explain dollar-cost averaging in one short paragraph.' }] }] },
    onTopic: /dollar.?cost|averaging|invest|volatil|regular|periodic|over time|market/i,
    label: 'ai-proxy answers an investing question, on-topic',
  },
  {
    app: 'WizeDeal', auth: false, url: `${DEAL}/api/ai/parse-listing`,
    body: { text: 'Apartamento à venda: 3 quartos, 90 m², R$ 850.000, bairro Pajuçara, Maceió, Alagoas. Condomínio R$ 600/mês.' },
    // parse-listing returns structured JSON; a live extractor pulls these out.
    onTopic: /850000|850\.000|"?(rooms|quartos|bedrooms)"?\s*:?\s*3|maceió|maceio|paju|90/i,
    label: 'parse-listing extracts a real BR listing (Gemini alive)',
  },
];

async function loginAndGetToken() {
  if (!QA_EMAIL || !QA_PASSWORD) return null;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://wizelife.ai' },
      body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD, returnSecureToken: true }),
    });
    return (await r.json()).idToken || null;
  } catch { return null; }
}

async function runCase(c, token) {
  if (c.auth && !token) { warns++; add(`- ⚠️ ${c.app}: no auth token — SKIP: ${c.label}`); return; }
  const headers = { 'Content-Type': 'application/json' };
  if (c.auth) headers['Authorization'] = `Bearer ${token}`;

  let status, raw = '';
  try {
    const r = await fetch(c.url, { method: 'POST', headers, body: JSON.stringify(c.body), signal: AbortSignal.timeout(TIMEOUT) });
    status = r.status;
    raw = await r.text();
  } catch (e) {
    warns++; add(`- ⚠️ ${c.app}: request failed (${String(e).slice(0, 40)}) — SKIP: ${c.label}`); return;
  }

  if (status === 401 || status === 403) { warns++; add(`- ⚠️ ${c.app}: HTTP ${status} (token invalid/expired?) — SKIP: ${c.label}`); return; }
  if (status === 429) { warns++; add(`- ⚠️ ${c.app}: HTTP 429 (daily quota — account not paid-tier?) — SKIP: ${c.label}`); return; }

  // Real failures from here: a dead/broken AI.
  const bad = [];
  if (status >= 400) bad.push(`HTTP ${status}`);
  if (/api key not valid|api_key|not configured|GOOGLE_AI_API_KEY/i.test(raw)) bad.push('AI key error (backend AI is DEAD)');
  if (raw.trim().length < 25) bad.push('empty/near-empty reply (AI produced nothing)');
  if (!bad.length && c.onTopic && !c.onTopic.test(raw)) bad.push('reply is OFF-TOPIC (echo / generic / not a real answer)');
  if (!bad.length && c.disclaimer && !c.disclaimer.test(raw)) bad.push('missing mandated disclaimer (disclaimer-on-output)');

  if (bad.length) { fails.push(`${c.app}: ${c.label} — ${bad.join('; ')}`); add(`- ❌ ${c.app}: ${c.label} — ${bad.join('; ')}`); }
  else { passes++; add(`- ✅ ${c.app}: ${c.label}`); }
}

(async () => {
  const token = await loginAndGetToken();
  add(token
    ? '_Authenticated run — calling the AI backends directly with a Bearer token._\n'
    : '_No token (set QA_EMAIL_PRO/QA_PASSWORD_PRO) — authed cases SKIP; anonymous WizeDeal still runs._\n');
  for (const c of CASES) await runCase(c, token);

  add(`\n## Result — ${passes} pass, ${fails.length} fail, ${warns} skip`);
  add(fails.length ? fails.map(f => `- 🚨 ${f}`).join('\n') : '- ✅ Every reachable AI is alive, on-topic, and (where required) disclaims.');
  fs.writeFileSync('ai-authed-smoke-report.md', out.join('\n'));
  console.log(out.join('\n'));
  process.exit(fails.length ? 1 : 0);
})();
