// Core Web Vitals probe for WizeTravel (mobile, throttled)
const { chromium } = require('playwright');

const PAGES = [
  'https://travel.wizelife.ai/',
  'https://travel.wizelife.ai/flights',
  'https://travel.wizelife.ai/ai',
  'https://travel.wizelife.ai/hotels',
  'https://travel.wizelife.ai/deals',
  'https://travel.wizelife.ai/tools',
];

(async () => {
  const browser = await chromium.launch();
  for (const url of PAGES) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    // Fast 4G-ish throttle: 9 Mbps down, 1.5 Mbps up, 60ms RTT (lenient; flag only real misses)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 60, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 1.5 * 1024 * 1024 / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    let totalBytes = 0, reqCount = 0; const byType = {};
    page.on('response', async (r) => {
      try {
        const h = r.headers();
        const len = parseInt(h['content-length'] || '0', 10) || 0;
        totalBytes += len; reqCount++;
        const ct = (h['content-type'] || '').split(';')[0];
        byType[ct] = (byType[ct] || 0) + len;
      } catch {}
    });

    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = 0; window.__longTasks = 0; window.__tbt = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => {
        const es = l.getEntries(); if (es.length) window.__lcp = es[es.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) { window.__longTasks++; window.__tbt += Math.max(0, e.duration - 50); }
      }).observe({ type: 'longtask', buffered: true });
    });

    const t0 = Date.now();
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    } catch (e) { console.log(url, 'LOAD TIMEOUT/ERR:', e.message.slice(0, 80)); await ctx.close(); continue; }
    const loadMs = Date.now() - t0;
    await page.waitForTimeout(5000);
    // poke to flush LCP
    await page.mouse.move(10, 10);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0;
      return {
        lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3),
        tbt: Math.round(window.__tbt), longTasks: window.__longTasks,
        fcp: Math.round(fcp), ttfb: Math.round(nav.responseStart || 0),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
        transferTotal: Math.round((performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0)) / 1024),
        resCount: performance.getEntriesByType('resource').length,
        imgsNoDims: [...document.querySelectorAll('img:not([width]),img:not([height])')].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => (i.currentSrc || i.src || '').slice(0, 90)).slice(0, 5),
        swCount: 'serviceWorker' in navigator ? 0 : -1,
        dupScripts: (() => { const seen = {}, dup = []; document.querySelectorAll('script[src]').forEach(s => { const k = s.src; if (seen[k]) dup.push(k); seen[k] = 1; }); return dup; })(),
      };
    });
    console.log(JSON.stringify({ url, loadMs, ...m, kbHeaders: Math.round(totalBytes / 1024), reqCount }, null, 0));
    await ctx.close();
  }
  await browser.close();
})();
