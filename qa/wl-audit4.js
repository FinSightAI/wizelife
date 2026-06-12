// pass 4: mobile hamburger drawer — open, lang pills inside, Esc close, double-burger check
const { chromium } = require('playwright');
const BASE = 'https://wizelife.ai';
const R = (n, ok, info = '') => console.log(`${ok ? 'PASS' : 'FAIL'} | ${n}${info ? ' | ' + info : ''}`);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(5000); await page.waitForLoadState('load').catch(()=>{}); await page.waitForTimeout(2000);
  const burgerCount = await page.evaluate(() => [...document.querySelectorAll('.hamburger, .wize-burger, [aria-label*="menu" i]')].filter(e => e.offsetWidth > 0).length);
  R('exactly one visible hamburger', burgerCount === 1, `count=${burgerCount}`);
  await page.tap('.hamburger, [aria-label*="menu" i]').catch(async () => { await page.click('.hamburger'); });
  await page.waitForTimeout(1200);
  const drawer = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('div, nav, aside')].filter(e => e.offsetWidth > 100 && e.offsetHeight > 200 && /fixed/.test(getComputedStyle(e).position) && parseInt(getComputedStyle(e).zIndex || 0) > 50);
    const open = cands.length > 0;
    const txt = cands.map(c => c.innerText).join(' ').slice(0, 700);
    // visible lang pill-like buttons inside
    const langBtns = [...document.querySelectorAll('button, .wl-lang-pill, [data-lang]')].filter(e => e.offsetWidth > 0 && /^(EN|HE|PT|ES|en|he|pt|es)$/.test(e.textContent.trim()));
    return { open, txt: txt.replace(/\n/g, ' | '), langBtns: langBtns.map(b => b.textContent.trim()) };
  });
  R('drawer opens on tap', drawer.open, drawer.txt.slice(0, 300));
  R('drawer has 4 lang pills', drawer.langBtns.length >= 4, JSON.stringify(drawer.langBtns));
  const lower = drawer.langBtns.filter(t => t !== t.toUpperCase());
  R('drawer lang pills UPPERCASE', lower.length === 0, JSON.stringify(lower));
  // click PT and verify content switches
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, .wl-lang-pill, [data-lang]')].filter(e => e.offsetWidth > 0 && /^PT$/i.test(e.textContent.trim()))[0];
    if (b) { b.click(); return true; } return false;
  });
  await page.waitForTimeout(1500);
  const lang = await page.evaluate(() => document.documentElement.lang);
  R('drawer PT switch works', clicked && lang.startsWith('pt'), `clicked=${clicked} html.lang=${lang}`);
  // Esc closes
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const stillOpen = await page.evaluate(() => [...document.querySelectorAll('div, nav, aside')].some(e => e.offsetWidth > 100 && e.offsetHeight > 200 && /fixed/.test(getComputedStyle(e).position) && parseInt(getComputedStyle(e).zIndex || 0) > 200 && /Language|Idioma|שפה/.test(e.innerText)));
  R('drawer closes on Esc', !stillOpen);
  await browser.close();
})();
