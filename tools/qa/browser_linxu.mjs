import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const out='web/motion-labs/verification_linxu';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const refresh=process.argv.includes('--final-refresh');
const report={rows:[],comparison:[],errors:[],requests:[],assets:Object.fromEntries(['assets/characters/linxu/character.glb','assets/characters/linxu/motions.glb','assets/weapon_attachment.json','app.js','rig.js','weapon-attachment.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync('web/motion-labs/linxu-motion-lab/'+p)).digest('hex')]))};
try {
  const page=await browser.newPage({viewport:{width:1365,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('request',r=>report.requests.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.goto('http://127.0.0.1:8087/web/motion-labs/linxu-motion-lab/');
  await page.waitForFunction(()=>window.linxuLab?.state.ready,null,{timeout:120000});
  const clips=await page.evaluate(()=>linxuLab.snapshot().clips);
  assert(!clips.includes('FaceTest'),'No expression test in the curated action set');
  for(const wid of ['none','qbz95','type56_1','qbu85','type97hawk','qcq171']) {
    await page.selectOption('#weapon',wid);
    const names=await page.locator('[data-motion]').evaluateAll(bs=>bs.map(b=>b.dataset.motion));
    assert.equal(names.length,wid==='none'?12:wid==='type97hawk'?7:6);
    for(const motion of names) {
      await page.locator(`[data-motion="${motion}"]`).click();
      const s=await page.evaluate(()=>{
        linxuLab.state.playing=false;
        linxuLab.state.time=linxuLab.snapshot().duration*.37;
        linxuLab.pose();return linxuLab.snapshot();
      });
      assert.equal(s.grip.visible,wid!=='none');assert.equal(s.error,null);assert(s.duration>0);
      assert(s.grip.leftContactErrorM<.003);assert(s.grip.rightContactErrorM<.003);
      if(wid==='none'&&motion==='Walk')assert(Math.abs(s.duration-31/30)<.001);
      if(wid==='none'&&motion==='Idle')assert(Math.abs(s.duration-250/30)<.001);
      report.rows.push({weapon:wid,motion,clip:s.grip.actualClip,duration:s.duration,left:s.grip.leftContactErrorM,right:s.grip.rightContactErrorM});
      assert.equal(await page.locator('#run-comparison').isVisible(),['Run','RifleRun'].includes(motion));
      const capture=refresh ? wid==='none'&&['Idle','Walk','Talking','HeadStress'].includes(motion) : wid==='none'||wid==='qbu85'||['RifleIdle','RifleAimingIdle'].includes(motion)||motion==='ShotgunPump';
      if(capture) {
        await page.evaluate(w=>{
          linxuLab.view('front',w!=='none');
          if(w!=='none') {linxuLab.controls.target.set(0,1.25,.05);linxuLab.camera.position.set(-1.8,1.55,1.9);linxuLab.controls.update();}
        },wid);
        await page.screenshot({path:`${out}/linxu-${wid}-${motion}.png`});
      }
    }
    const motion=wid==='none'?'Run':'RifleRun';
    await page.locator(`[data-motion="${motion}"]`).click();
    await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
    const after=await page.evaluate(()=>linxuLab.snapshot());
    await page.locator('#compare-run').click();
    const before=await page.evaluate(()=>linxuLab.snapshot());
    assert(before.compareRun);assert.equal(before.time,after.time);
    assert.equal(before.grip.actualClip,motion+'_Before');
    assert(before.grip.leftContactErrorM<.003&&before.grip.rightContactErrorM<.003);
    if(!refresh&&(wid==='none'||wid==='qbz95')) {
      await page.evaluate(()=>{linxuLab.view('front',true);linxuLab.camera.position.set(.05,1.34,2.2);linxuLab.controls.target.set(0,1.23,0);linxuLab.controls.update();});
      await page.screenshot({path:`${out}/run-${wid}-before.png`});
    }
    await page.locator('#compare-run').click();
    const restored=await page.evaluate(()=>linxuLab.snapshot());
    assert(!restored.compareRun);assert.equal(restored.time,after.time);
    if(!refresh&&(wid==='none'||wid==='qbz95'))await page.screenshot({path:`${out}/run-${wid}-after.png`});
    report.comparison.push({weapon:wid,motion,time:restored.time,originalClip:before.grip.actualClip,correctedClip:restored.grip.actualClip});
    console.log('BROWSER_PASS',wid,names.length);
  }
  await page.selectOption('#weapon','none');await page.locator('[data-motion="Walk"]').click();
  await page.locator('#seek').evaluate(el=>{el.value='.5';el.dispatchEvent(new Event('input',{bubbles:true}));});
  let s=await page.evaluate(()=>linxuLab.snapshot());assert(!s.playing);assert(Math.abs(s.time/s.duration-.5)<.001);
  await page.locator('#play').click();assert((await page.evaluate(()=>linxuLab.snapshot())).playing);
  await page.selectOption('#speed','0.5');assert.equal((await page.evaluate(()=>linxuLab.snapshot())).speed,.5);
  await page.locator('#skeleton').click();assert.equal(await page.locator('#skeleton').getAttribute('aria-pressed'),'true');await page.locator('#skeleton').click();
  await page.setViewportSize({width:390,height:844});await page.locator('[data-view="front"]').click();
  await page.selectOption('#weapon','qcq171');await page.locator('[data-motion="RifleAimingIdle"]').click();
  await page.locator('#seek').evaluate(el=>{el.value='.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/mobile.png`,fullPage:true});
  await page.selectOption('#weapon','none');await page.locator('[data-motion="Run"]').click();
  await page.locator('#compare-run').click();assert.equal(await page.locator('#compare-run').getAttribute('aria-pressed'),'true');
  assert(!report.requests.some(u=>/type59d|qjz89|qbu10|pf89\.glb|pistol.*\.glb|characters\/(military|vest)/.test(u)));
  assert.deepEqual(report.errors,[]);assert.equal(report.rows.length,43);
  report.passed=true;report.mobile={width:390,noHorizontalOverflow:true,comparisonWorks:true};
} finally {
  fs.writeFileSync(`${out}/browser-validation.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
