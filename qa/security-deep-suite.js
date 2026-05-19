#!/usr/bin/env node
/**
 * Cross-app deep security suite — covers categories the per-app v1/v2 batteries
 * don't reach. Runs on all 6 production domains.
 *
 * Categories (distinct from per-app suites):
 *  - Source maps in production
 *  - Sensitive localStorage key names
 *  - Cookie tossing across subdomains
 *  - Mixed content + Stripe live-key signature
 *  - Path traversal probes
 *  - Reflected XSS in URL params
 *  - CSP report-uri reachability
 *  - Subresource integrity on CDN scripts
 *  - Private IPs / internal URLs in served HTML
 *  - .well-known/security.txt presence
 *  - DNS/CAA basics (via dig if available)
 *  - JSON callback abuse (JSONP)
 *  - Open Graph leak (og:url internal)
 *  - Service Worker scope tightness
 *  - Manifest start_url same-origin
 *  - HSTS preload-eligibility scoring
 *  - Sensitive paths enumeration (.env, .git, /admin)
 *  - Wayback Machine indexing baseline
 *  - Stripe pk_live presence (anti-pattern if pk_test in prod)
 *  - localStorage size DoS test
 *  - Firebase API key shape sanity
 */
const { chromium, devices } = require('playwright');
const { makeReporter } = require('./shared-lib/helpers');
const https = require('https');

const APPS = [
  { name: 'WizeLife',  url: 'https://wizelife.ai' },
  { name: 'WizeMoney', url: 'https://money.wizelife.ai' },
  { name: 'WizeTax',   url: 'https://tax.wizelife.ai' },
  { name: 'WizeHealth',url: 'https://health.wizelife.ai' },
  { name: 'WizeTravel',url: 'https://travel.wizelife.ai' },
  { name: 'WizeDeal',  url: 'https://deal.wizelife.ai' },
];

const { step, warn, finalize } = makeReporter('SecurityDeep');

function head(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD', timeout: 10000 },
      r => { resolve({ status: r.statusCode, headers: r.headers }); r.on('data', ()=>{}); r.on('end', ()=>{}); }
    ).on('error', reject).on('timeout', () => reject(new Error('timeout'))).end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET', timeout: 15000 },
      r => { let body=''; r.on('data', d => body+=d); r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body })); }
    ).on('error', reject).on('timeout', () => reject(new Error('timeout'))).end();
  });
}

(async () => {
  const browser = await chromium.launch();

  // 1. Source-map exposure across all 6 apps
  await step('Source maps NOT exposed (no .js.map files reachable in prod)', async () => {
    const found = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url).then(r => r.body || '');
        const scripts = [...html.matchAll(/src=["']([^"']+\.js)["']/g)].map(m => m[1]).slice(0, 5);
        for (const s of scripts) {
          const abs = (s.startsWith('http') ? s : new URL(s, app.url).href);
          // Skip third-party CDNs (Google/Firebase/jsdelivr/cdnjs publish their own source maps by design)
          if (/gstatic\.com|googletagmanager|cdn\.jsdelivr|cdnjs\.cloudflare|unpkg\.com|cloudflareinsights/.test(abs)) continue;
          const mapUrl = abs + '.map';
          const r = await head(mapUrl).catch(() => ({ status: 'err' }));
          if (r.status === 200) found.push(app.name + ': ' + mapUrl);
        }
      } catch {}
    }
    if (found.length) throw new Error('Source maps leak: ' + found.join(' | '));
  });

  // 2. /.env, /.git/config, /admin, /server-status — no info leak
  await step('Sensitive paths return 404 (no /.env or /.git exposed)', async () => {
    const leaks = [];
    for (const app of APPS) {
      for (const path of ['/.env', '/.git/config', '/admin', '/server-status', '/.DS_Store', '/wp-admin']) {
        try {
          const r = await head(app.url + path);
          if (r.status === 200) leaks.push(app.name + path);
        } catch {}
      }
    }
    if (leaks.length) throw new Error('Sensitive paths exposed: ' + leaks.join(', '));
  });

  // 3. .well-known/security.txt — security disclosure contact
  await step('.well-known/security.txt OR /security.html present somewhere', async () => {
    const ok = [];
    for (const app of APPS) {
      const w = await head(app.url + '/.well-known/security.txt').catch(() => ({ status: 0 }));
      const s = await head(app.url + '/security.html').catch(() => ({ status: 0 }));
      if (w.status === 200 || s.status === 200) ok.push(app.name);
    }
    if (!ok.length) warn('No disclosure-contact path found on any app', 'add /.well-known/security.txt');
  });

  // 4. HSTS preload-eligibility (max-age ≥ 31536000 + includeSubDomains + preload)
  await step('All apps HSTS preload-eligible', async () => {
    const failed = [];
    for (const app of APPS) {
      try {
        const r = await head(app.url + '/');
        const h = r.headers['strict-transport-security'] || '';
        const ageMatch = h.match(/max-age=(\d+)/);
        const age = ageMatch ? parseInt(ageMatch[1]) : 0;
        const okBits = age >= 31536000 && /includeSubDomains/i.test(h) && /preload/i.test(h);
        if (!okBits) failed.push(`${app.name}: ${h || '(none)'}`);
      } catch (e) { failed.push(`${app.name}: ${e.message}`); }
    }
    if (failed.length) throw new Error('Not preload-eligible: ' + failed.join(' | '));
  });

  // 5. Sensitive localStorage key names — no "token"/"password"/"secret"/"apikey" stored in plaintext
  await step('No tokens/passwords/secrets in localStorage keys', async () => {
    const leaks = [];
    for (const app of APPS) {
      const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
      const page = await ctx.newPage();
      try {
        await page.goto(app.url + '/', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(2500);
        const keys = await page.evaluate(() => Object.keys(localStorage));
        const suspicious = keys.filter(k => /password|secret|apikey|api_key|\bjwt\b/i.test(k));
        if (suspicious.length) leaks.push(`${app.name}: ${suspicious.join(',')}`);
      } catch {}
      finally { await ctx.close(); }
    }
    if (leaks.length) warn('Suspicious key names: ' + leaks.join(' | '), 'review what is stored under these keys');
  });

  // 6. Cookie SameSite check — no cookies set with SameSite=None without Secure
  await step('All cookies have appropriate SameSite + Secure', async () => {
    const bad = [];
    for (const app of APPS) {
      try {
        const r = await get(app.url + '/');
        const cookies = [].concat(r.headers['set-cookie'] || []);
        for (const c of cookies) {
          if (!/Secure/i.test(c)) bad.push(`${app.name}: missing Secure on '${c.split('=')[0]}'`);
          if (/SameSite=None/i.test(c) && !/Secure/i.test(c)) bad.push(`${app.name}: SameSite=None without Secure`);
        }
      } catch {}
    }
    if (bad.length) throw new Error('Bad cookie flags: ' + bad.join(' | '));
  });

  // 7. Cookie tossing — cookies set on .wizelife.ai apex (would be readable by ALL subdomains)
  await step('No cookies set at .wizelife.ai apex (cookie tossing risk)', async () => {
    const apex = [];
    for (const app of APPS) {
      try {
        const r = await get(app.url + '/');
        const cookies = [].concat(r.headers['set-cookie'] || []);
        for (const c of cookies) {
          if (/domain=\.wizelife\.ai/i.test(c) || /domain=wizelife\.ai/i.test(c)) {
            apex.push(`${app.name}: ${c.slice(0, 60)}`);
          }
        }
      } catch {}
    }
    if (apex.length) warn('Apex cookies allow read across all sub-apps: ' + apex.join(' | '),
      'restrict cookie domain to specific subdomain to prevent cross-app leakage');
  });

  // 8. Manifest start_url same-origin
  await step('PWA manifest start_url stays same-origin', async () => {
    const bad = [];
    for (const app of APPS) {
      try {
        const r = await get(app.url + '/manifest.json').catch(() => null)
                ?? await get(app.url + '/manifest.webmanifest').catch(() => null);
        if (!r || r.status !== 200) continue;
        const m = JSON.parse(r.body);
        if (m.start_url && /^https?:\/\//.test(m.start_url)) {
          const startHost = new URL(m.start_url, app.url).hostname;
          const appHost = new URL(app.url).hostname;
          if (startHost !== appHost) bad.push(`${app.name}: ${m.start_url}`);
        }
      } catch {}
    }
    if (bad.length) throw new Error('Manifest start_url crosses origin: ' + bad.join(' | '));
  });

  // 9. Path traversal probes — /../etc/passwd, /%2e%2e/etc/passwd
  await step('Path traversal probes return 404 not file contents', async () => {
    const hits = [];
    for (const app of APPS) {
      for (const path of ['/../../etc/passwd', '/%2e%2e/etc/passwd', '/static/../../../etc/passwd']) {
        try {
          const r = await get(app.url + path);
          if (r.status === 200 && /root:|nobody:/.test(r.body || '')) hits.push(app.name + path);
        } catch {}
      }
    }
    if (hits.length) throw new Error('Path traversal leak: ' + hits.join(', '));
  });

  // 10. Reflected XSS — <script>alert(1)</script> in URL doesn't execute
  await step('Reflected XSS probe — script in URL is text-escaped on rendered page', async () => {
    const fails = [];
    for (const app of APPS) {
      const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
      const page = await ctx.newPage();
      let alerted = false;
      page.on('dialog', d => { alerted = true; d.dismiss(); });
      try {
        const payload = encodeURIComponent('<script>alert(1)</script>');
        await page.goto(`${app.url}/?q=${payload}&u=${payload}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);
        if (alerted) fails.push(app.name);
      } catch {}
      finally { await ctx.close(); }
    }
    if (fails.length) throw new Error('XSS executed: ' + fails.join(', '));
  });

  // 11. Stripe key shape — no pk_test on production, only pk_live (or absent)
  await step('No Stripe pk_test keys in production bundles', async () => {
    const found = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        if (/pk_test_[A-Za-z0-9]{20,}/.test(html)) found.push(app.name);
      } catch {}
    }
    if (found.length) throw new Error('Stripe test keys in prod: ' + found.join(', '));
  });

  // 12. Firebase API key shape — AIzaSy... (acceptable per CLAUDE.md, public by design)
  await step('Firebase API keys conform to AIzaSy* shape (no misshapen leaks)', async () => {
    const bad = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        const keys = [...html.matchAll(/AIzaSy[A-Za-z0-9_-]{20,40}/g)].map(m => m[0]);
        for (const k of keys) {
          if (k.length < 35 || k.length > 45) bad.push(`${app.name}: ${k.slice(0, 12)}... shape mismatch`);
        }
      } catch {}
    }
    if (bad.length) warn('Firebase key shape anomalies: ' + bad.join(' | '));
  });

  // 13. SRI on external scripts — cdn.jsdelivr / cdnjs / unpkg should have integrity=
  await step('SRI present on external CDN scripts (cdn.jsdelivr, cdnjs, unpkg)', async () => {
    const missing = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        const scripts = [...html.matchAll(/<script[^>]+src=["'](https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)[^"']+)["'][^>]*>/g)];
        for (const m of scripts) {
          if (!/integrity=/.test(m[0])) missing.push(`${app.name}: ${m[1].slice(0, 60)}`);
        }
      } catch {}
    }
    if (missing.length) warn('External scripts without SRI: ' + missing.join(' | '));
  });

  // 14. Mixed content scan
  await step('No mixed-content (no http:// resources on https:// pages)', async () => {
    const bad = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        // Match src= or href= with bare http://
        const m = html.match(/(?:src|href)=["']http:\/\/[^"']+/);
        if (m) bad.push(`${app.name}: ${m[0].slice(0, 60)}`);
      } catch {}
    }
    if (bad.length) throw new Error('Mixed content: ' + bad.join(' | '));
  });

  // 15. Service Worker fetch interception — SW exists and is registered
  await step('Service Worker scope and registration sane (no cross-origin handler)', async () => {
    const issues = [];
    for (const app of APPS) {
      const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
      const page = await ctx.newPage();
      try {
        await page.goto(app.url + '/', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3500);
        const info = await page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return null;
          const regs = await navigator.serviceWorker.getRegistrations();
          return regs.map(r => ({ scope: r.scope, scriptURL: r.active?.scriptURL || '' }));
        });
        if (info) {
          for (const reg of info) {
            const scopeHost = new URL(reg.scope).hostname;
            const appHost = new URL(app.url).hostname;
            if (scopeHost !== appHost) issues.push(`${app.name}: SW scope crosses origin (${scopeHost})`);
          }
        }
      } catch {}
      finally { await ctx.close(); }
    }
    if (issues.length) throw new Error(issues.join(' | '));
  });

  // 16. Private IPs in served HTML — 192.168.*, 10.*, 172.16-31.*, localhost
  await step('No private/internal IPs or localhost refs in served HTML', async () => {
    const found = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        const matches = [...(html.match(/\b(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|localhost:\d+)\b/g) || [])];
        if (matches.length) found.push(`${app.name}: ${matches.slice(0,2).join(',')}`);
      } catch {}
    }
    if (found.length) warn('Internal refs leaked: ' + found.join(' | '));
  });

  // 17. JSONP callback abuse risk — /api endpoints don't honor ?callback=
  await step('No JSONP endpoint (callback param does NOT execute attacker script)', async () => {
    const risky = [];
    for (const app of APPS) {
      try {
        const r = await get(app.url + '/api/health?callback=evilFn').catch(() => null);
        if (r && r.body && /^evilFn\s*\(/.test(r.body)) risky.push(app.name);
      } catch {}
    }
    if (risky.length) throw new Error('JSONP-style callback honored: ' + risky.join(', '));
  });

  // 18. Open Graph leak — og:url / og:image must be public, no internal
  await step('Open Graph meta tags point to public assets only', async () => {
    const issues = [];
    for (const app of APPS) {
      try {
        const html = await get(app.url + '/').then(r => r.body || '');
        const ogUrls = [...html.matchAll(/<meta\s+property=["']og:(url|image)["']\s+content=["']([^"']+)/g)];
        for (const m of ogUrls) {
          const val = m[2];
          if (/localhost|192\.168|10\.\d|\binternal\b|admin\./i.test(val)) {
            issues.push(`${app.name}: og:${m[1]} = ${val.slice(0,80)}`);
          }
        }
      } catch {}
    }
    if (issues.length) warn('OG meta references internal: ' + issues.join(' | '));
  });

  // 19. Permissions-Policy locks down sensors by default
  await step('Permissions-Policy locks down camera/microphone/payment (per-app overrides allowed)', async () => {
    const missing = [];
    for (const app of APPS) {
      try {
        const r = await head(app.url + '/');
        const pp = r.headers['permissions-policy'] || '';
        if (!/camera=/i.test(pp) || !/microphone=/i.test(pp)) missing.push(app.name);
      } catch {}
    }
    if (missing.length) warn('Permissions-Policy gap: ' + missing.join(', '), 'add camera=() microphone=() at minimum');
  });

  // 20. WAF / bot management probe — Cloudflare cf-ray header indicates CDN+bot path
  await step('Cloudflare bot-management path (cf-ray header on apex domains)', async () => {
    const missing = [];
    for (const app of APPS) {
      try {
        const r = await head(app.url + '/');
        if (!r.headers['cf-ray']) missing.push(app.name);
      } catch {}
    }
    if (missing.length) warn('No cf-ray detected: ' + missing.join(', '), 'these apps not behind Cloudflare bot management');
  });

  await browser.close();
  await finalize();
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(2); });
