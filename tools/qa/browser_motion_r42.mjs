// Requires the local static server on 127.0.0.1:8086.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out='web/motion-labs/verification_r42';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={};
try {
 for(const [cid,folder] of [['diandian','diandian-classic-motion-lab'],['zhigeng','zhigeng-motion-lab']]) {
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],warnings=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='warning'&&/PropertyBinding|target node|animation/i.test(m.text()))warnings.push(m.text());});
  await page.goto(`http://127.0.0.1:8086/web/motion-labs/${folder}/`);
  await page.waitForFunction(()=>{const lab=window.diandianLab||window.zhigengLab;return lab?.getState().ready&&lab.getState().metadata;},null,{timeout:120000});
  await page.evaluate(()=>{window.lab=window.diandianLab||window.zhigengLab;lab.setPlaying(false);});
  assert.equal(await page.locator('[data-motion]:visible').count(),8);
  async function pose(motion,time) {
   await page.locator(`[data-motion="${motion}"]`).click();
   await page.evaluate(t=>{lab.setPlaying(false);lab.seek(t);},time);
   await page.waitForFunction(({motion,time})=>lab.getWeaponState().motion===motion&&Math.abs(lab.getWeaponState().time-time)<.0001,{motion,time});
   await page.waitForTimeout(650);
   return page.evaluate(()=>lab.getWeaponState());
  }
  async function capture(label,walk=false,side=false) {
   const data=await page.evaluate(({walk,side})=>{
    lab.controls.target.set(0,walk?1:1.34,walk?0:.25);
    lab.camera.position.set(walk?(side?3.5:.1):1.25,walk?1.2:1.6,walk?(side?2.3:4):2.15);
    lab.controls.update();lab.renderer.render(lab.scene,lab.camera);return lab.renderer.domElement.toDataURL();
   },{walk,side});
   fs.writeFileSync(`${out}/${cid}-${label}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  const walk=[];
  for(const time of [0,.16,.36,.62,.8]) {
   const state=await pose('WalkingBackwards',time);assert.equal(state.visible,false);walk.push(state);
   if(time===.16||time===.62) {
    await capture(`walk-${time}-front`,true);await capture(`walk-${time}-side`,true,true);
   }
  }
  const shooting={};
  for(const gun of ['qsz92','type54']) {
   await page.locator(`[data-weapon="${gun}"]`).click();
   await page.selectOption('#motion-filter','all');
   const aim=await pose('PistolAimingIdle',0);await capture(`${gun}-aim`);
   const states=[];
   for(const [time,label] of [[0,'start'],[.18,'peak'],[.75,'return']]) {
    const state=await pose('PistolShooting',time);states.push(state);
    assert.equal(state.visible,true);assert.equal(state.selectedWeapon,gun);
    assert(state.leftContactErrorM<.005&&state.rightContactErrorM<.001);
    if(time===.18) {
     assert(state.rightPalmWorld[1]-aim.rightPalmWorld[1]>.025,JSON.stringify({cid,gun,time,state,aim}));
     await capture(`${gun}-${label}`);
    } else {
     assert(Math.max(...state.weaponPosition.map((v,i)=>Math.abs(v-aim.weaponPosition[i])))<2e-5);
    }
   }
   shooting[gun]={aim,states};
  }
  await page.evaluate(()=>{lab.seek(lab.getState().duration-.02);lab.setPlaying(true);});
  await page.waitForFunction(()=>!lab.getState().playing);
  await page.locator('#play-toggle').click();assert.equal(await page.evaluate(()=>lab.getState().playing),true);
  await page.evaluate(()=>lab.setPlaying(false));
  await page.selectOption('#motion-filter','new');
  await pose('PistolShooting',.18);await page.screenshot({path:`${out}/${cid}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
  await page.screenshot({path:`${out}/${cid}-mobile.png`,fullPage:true});
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(warnings.length,0,JSON.stringify(warnings));
  report[cid]={passed:true,errors,warnings,mobileWidth:390,walk,shooting};
  await page.close();console.log('BROWSER_R42_PASS',cid);
 }
 fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');
} finally {await browser.close();}
