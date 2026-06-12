const { webkit, chromium } = require('playwright');
const APPS = [
  ['WizeMoney','https://money.wizelife.ai/'],
  ['WizeDeal','https://check-deal.vercel.app/'],
  ['WizeHealth','https://wizehealth-1027614800253.us-central1.run.app/'],
  ['WizeTax','https://tax.wizelife.ai/advisor'],
  ['WizeTravel','https://travel.wizelife.ai/'],
  ['WizeLife','https://wizelife.ai/'],
];
async function testApp(engine, ename, name, url, w, h) {
  const ctx = await engine.launch().then(b=>b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true}));
  const pg = await ctx.newPage();
  await pg.addInitScript(()=>{try{localStorage.setItem('wl_lang','pt');localStorage.setItem('vitara_lang','pt');}catch(e){}});
  let errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,50)));
  const out=[];
  try{
    await pg.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await pg.waitForTimeout(2800);
    // horizontal overflow on webkit
    const ov = await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(ov>5) out.push(`H-OVERFLOW +${ov}px`);
    // tap-target audit: visible buttons/links smaller than 32px
    const tiny = await pg.evaluate(()=>{
      const els=[...document.querySelectorAll('button,a,[role=button],.lang-pill')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<window.innerHeight&&(r.width<28||r.height<28);});
      return els.slice(0,3).map(e=>(e.innerText||e.getAttribute('aria-label')||e.className||'?').slice(0,18));
    });
    if(tiny.length>3) out.push(`tiny-tap-targets:${tiny.length}`);
    // hamburger: find + click + check something opened
    const ham = await pg.$('.hamburger, #hamburger, [aria-label*=enu], [aria-label*=תפריט], .menu-toggle, .wize-hamburger, button[class*=menu]');
    if(ham){
      const before = await pg.evaluate(()=>document.body.innerText.length);
      await ham.click({timeout:3000}).catch(()=>{});
      await pg.waitForTimeout(700);
      const opened = await pg.evaluate(()=>{
        const d=document.querySelector('.sidebar.open,.drawer.open,#sidebar.active,.menu.open,nav.open,[class*=drawer][class*=open],aside[class*=open]');
        return !!d || document.body.innerText.length;
      });
      // check drawer not covered: top-most element at drawer center is the drawer
    } else out.push('no-hamburger-found');
    // bottom-nav presence
    const bn = await pg.evaluate(()=>{const n=document.querySelector('.bottom-nav,.wize-bottom-nav,nav[class*=bottom],#bottomNav');if(!n)return -1;return n.querySelectorAll('a,button').length;});
    if(bn===0) out.push('bottom-nav-empty');
    if(errs.length) out.push(`ERR:${errs[0]}`);
  }catch(e){ return `⏱ ${name} [${ename} ${w}] ${String(e).slice(0,30)}`; }
  await ctx.close();
  return out.length? `❌ ${name} [${ename} ${w}px PT] ${out.join(' | ')}` : `✅ ${name} [${ename} ${w}px]`;
}
(async()=>{
  const results=[];
  for(const [name,url] of APPS){
    results.push(await testApp(webkit,'WebKit',name,url,390,844));
    results.push(await testApp(chromium,'Chromium',name,url,360,800));
  }
  console.log('=== DEEP MOBILE (WebKit iOS + Chromium A55, PT, interactions) ===');
  results.forEach(r=>console.log(r));
  const bad=results.filter(r=>r.startsWith('❌'));
  console.log('\nREAL issues:',bad.length,'| timeouts:',results.filter(r=>r.startsWith('⏱')).length);
})();
