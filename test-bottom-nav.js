
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:780}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  await p.goto('https://tax.wizelife.ai/advisor?cb='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000}).catch(e=>console.log('goto err:',e.message));
  await p.waitForTimeout(4000);
  
  // Find all fixed-position divs at body level and their style attributes
  const info = await p.evaluate(()=>{
    const bodyChildren = Array.from(document.body.children);
    return bodyChildren.map(el => ({
      tag: el.tagName,
      id: el.id,
      style: el.getAttribute('style') ? el.getAttribute('style').slice(0, 200) : null,
      computed_position: getComputedStyle(el).position,
      computed_bottom: getComputedStyle(el).bottom,
    }));
  });
  console.log('Body children:', JSON.stringify(info, null, 2));
  
  await b.close();
})();
