import {chromium} from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const out='web/motion-labs/verification_linxu_v2',site='web/motion-labs/linxu-motion-lab';
fs.mkdirSync(out,{recursive:true});
const expected={Idle:{seconds:160/30,label:'ORC IDLE'},Walk:{seconds:35/30,label:'STANDARD WALK'},Run:{seconds:19/30,label:'RUNNING'}};
const report={samples:[],errors:[],requests:[],assets:Object.fromEntries(['assets/characters/linxu/character.glb','assets/characters/linxu/motions.glb','app.js','rig.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(site+'/'+p)).digest('hex')]))};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1365,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('request',r=>report.requests.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:8087/web/motion-labs/linxu-motion-lab/');
 await page.waitForFunction(()=>window.linxuLab?.state.ready,null,{timeout:120000});
 assert.equal(await page.locator('[data-motion]').count(),12);
 for(const [motion,data]of Object.entries(expected)) {
  await page.locator(`[data-motion="${motion}"]`).click();
  assert.equal(await page.locator('#motion-en').textContent(),data.label);
  for(const fraction of [0,.17,.37,.57,.77,.97,1]) {
   await page.locator('#seek').evaluate((el,f)=>{el.value=String(f);el.dispatchEvent(new Event('input',{bubbles:true}));},fraction);
   const s=await page.evaluate(()=>linxuLab.snapshot());
   assert.equal(s.motion,motion);assert.equal(s.playing,false);assert.equal(s.error,null);
   assert(Math.abs(s.duration-data.seconds)<.001);assert(Math.abs(s.time-s.duration*fraction)<.001);
   assert.equal(s.grip.visible,false);assert(!s.clips.includes('FaceTest'));
   report.samples.push({motion,fraction,duration:s.duration,actualClip:s.grip.actualClip});
   if(fraction===.37) {
    for(const view of ['front','side','back']) {
     await page.locator(`[data-view="${view}"]`).click();
     await page.screenshot({path:`${out}/${motion}-${view}.png`});
    }
   }
  }
  console.log('NEW_FBX_PASS',motion,data.seconds);
 }
 // The unarmed comparison must refer to this replacement, never the old run.
 await page.locator('[data-motion="Run"]').click();
 const clips=await page.evaluate(()=>linxuLab.snapshot().clips);
 const compare=clips.includes('Run_Before');
 assert.equal(await page.locator('#run-comparison').isVisible(),compare);
 if(compare) {
  await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const s=await page.evaluate(()=>linxuLab.snapshot());
  await page.locator('#compare-run').click();
  const before=await page.evaluate(()=>linxuLab.snapshot());
  assert.equal(before.grip.actualClip,'Run_Before');assert.equal(before.time,s.time);
  await page.locator('#compare-run').click();
 }
 // Return to every weapon after new locomotion; no previous pose may leak in.
 for(const weapon of ['qbz95','type56_1','qbu85','type97hawk','qcq171']) {
  await page.selectOption('#weapon',weapon);
  await page.locator('[data-motion="RifleAimingIdle"]').click();
  await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const s=await page.evaluate(()=>linxuLab.snapshot());
  assert.equal(s.error,null);assert(s.grip.visible);
  assert(s.grip.leftContactErrorM<.003&&s.grip.rightContactErrorM<.003);
 }
 await page.selectOption('#weapon','qbz95');await page.locator('[data-motion="RifleRun"]').click();
 await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#compare-run').click();
 assert.equal((await page.evaluate(()=>linxuLab.snapshot())).grip.actualClip,'RifleRun_Before');
 await page.selectOption('#weapon','none');await page.locator('[data-motion="Walk"]').click();
 await page.locator('#seek').evaluate(el=>{el.value='.5';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#play').click();assert((await page.evaluate(()=>linxuLab.snapshot())).playing);
 await page.locator('#play').click();
 await page.selectOption('#speed','0.5');assert.equal((await page.evaluate(()=>linxuLab.snapshot())).speed,.5);
 await page.locator('#skeleton').click();assert.equal(await page.locator('#skeleton').getAttribute('aria-pressed'),'true');await page.locator('#skeleton').click();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view="front"]').click();
 await page.locator('[data-motion="Idle"]').click();
 await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${out}/mobile.png`,fullPage:true});
 assert.deepEqual(report.errors,[]);
 report.passed=true;report.mobile={width:390,noHorizontalOverflow:true};report.unarmedRunComparison=compare;report.weaponTransitions=5;
}finally {
 fs.writeFileSync(`${out}/browser-validation.json`,JSON.stringify(report,null,2)+'\n');
 await browser.close();
}
