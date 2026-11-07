const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs = require('fs');
(async () => {
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const [mode='eval', character='diandian', file, output] = process.argv.slice(2);
 const site = character==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab';
 const url='http://127.0.0.1:8080/web/motion-labs/'+site+'/';
 let page=browser.contexts()[0].pages().find(p=>p.url().startsWith(url));
 if (!page) page=await browser.contexts()[0].newPage();
 if(mode==='init'||!page.url().startsWith(url)) {
   await page.setViewportSize({width:1000,height:900});
   const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
   await page.goto(url+'?qa='+Date.now()); await page.waitForFunction(()=>(window.diandianLab||window.zhigengLab)?.getState().ready,null,{timeout:90000,polling:100});
   await page.waitForTimeout(700);
   console.log(await page.evaluate(fs.readFileSync(__dirname+'/qa-context.js','utf8')));
 }
 if(file) {
   const result=await page.evaluate(fs.readFileSync(file,'utf8'));
   if(output) fs.writeFileSync(output,JSON.stringify(result,null,2)); else console.log(JSON.stringify(result));
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
