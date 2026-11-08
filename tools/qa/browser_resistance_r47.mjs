import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='web/motion-labs/verification_r47';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={characters:{},errors:[],requests:[]};
try{
const page=await browser.newPage({viewport:{width:1365,height:960}});
page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>report.requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
await page.goto('http://127.0.0.1:8086/web/motion-labs/resistance-motion-lab/');
await page.waitForFunction(()=>window.resistanceLab?.state.ready,null,{timeout:120000});
assert.equal(report.requests.filter(u=>u.includes('/vest/')).length,0,'Second character should load on demand');
for(const cid of ['military','vest']){
 await page.locator(`[data-character="${cid}"]`).click();await page.waitForFunction(c=>resistanceLab.state.ready&&resistanceLab.state.character===c,cid);
 const rows=[];
 for(const wid of ['none','qbz95','type56_1','qbu85','type97hawk','qcq171']){
  await page.selectOption('#weapon',wid);const names=await page.locator('[data-motion]').evaluateAll(bs=>bs.map(b=>b.dataset.motion));assert.equal(names.length,wid==='none'?12:wid==='type97hawk'?7:6);
  for(const motion of names){
   await page.locator(`[data-motion="${motion}"]`).click();
   const state=await page.evaluate(()=>{const lab=resistanceLab;lab.state.playing=false;lab.state.time=lab.snapshot().duration*.37;lab.pose();return lab.snapshot();});
   assert.equal(state.grip.visible,wid!=='none');assert.equal(state.error,null);assert(state.duration>0);if(wid==='none'&&motion==='Walk')assert(Math.abs(state.duration-31/30)<.001);if(wid==='none'&&motion==='Idle')assert(Math.abs(state.duration-250/30)<.001);assert(state.grip.leftContactErrorM<.003);assert(state.grip.rightContactErrorM<.003);
   rows.push({weapon:wid,motion,clip:state.grip.actualClip,left:state.grip.leftContactErrorM,right:state.grip.rightContactErrorM});
   if((wid==='none')||(wid==='qbu85'||(wid!=='none'&&['RifleIdle','RifleAimingIdle'].includes(motion)))||(wid==='type97hawk'&&motion==='ShotgunPump')){
    await page.evaluate(({wid,motion})=>{resistanceLab.view('front',wid!=='none');if(wid!=='none'){resistanceLab.controls.target.set(0,1.25,.05);resistanceLab.camera.position.set(-1.8,1.55,1.8);resistanceLab.controls.update();}}, {wid,motion});
    await page.screenshot({path:`${out}/${cid}-${wid}-${motion}.png`});
   }
  }
 }
 report.characters[cid]={passed:true,rows};console.log('BROWSER_PASS',cid,rows.length);
}
await page.selectOption('#weapon','none');await page.locator('[data-motion="Walk"]').click();
await page.locator('#seek').evaluate(el=>{el.value='.5';el.dispatchEvent(new Event('input',{bubbles:true}));});
let s=await page.evaluate(()=>resistanceLab.snapshot());assert(!s.playing);assert(Math.abs(s.time/s.duration-.5)<.001);
await page.locator('#play').click();assert((await page.evaluate(()=>resistanceLab.snapshot())).playing);
await page.selectOption('#speed','0.5');assert.equal((await page.evaluate(()=>resistanceLab.snapshot())).speed,.5);
await page.locator('#skeleton').click();assert.equal(await page.locator('#skeleton').getAttribute('aria-pressed'),'true');await page.locator('#skeleton').click();
await page.setViewportSize({width:390,height:844});await page.locator('[data-view="front"]').click();await page.selectOption('#weapon','qcq171');await page.locator('[data-motion="RifleAimingIdle"]').click();
await page.evaluate(()=>{resistanceLab.state.playing=false;resistanceLab.pose();});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile.png`,fullPage:true});
assert(!report.requests.some(u=>/type59d|qjz89|qbu10|pf89\.glb|pistol.*\.glb/.test(u)));
assert.deepEqual(report.errors,[]);report.passed=true;report.mobile={width:390,noHorizontalOverflow:true};
fs.writeFileSync(`${out}/browser-validation.json`,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
