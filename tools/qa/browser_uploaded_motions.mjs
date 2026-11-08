// Local static server required: python -m http.server 8086 --bind 127.0.0.1
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='web/motion-labs/verification_r41';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={};
try {
for(const [cid,folder] of [['diandian','diandian-classic-motion-lab'],['zhigeng','zhigeng-motion-lab']].filter(([id])=>!process.argv[2]||id===process.argv[2])) {
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&/PropertyBinding|target node|animation/i.test(m.text()))warnings.push(m.text());});
 await page.goto(`http://127.0.0.1:8086/web/motion-labs/${folder}/`);
 await page.waitForFunction(()=>{const lab=window.diandianLab||window.zhigengLab;return lab?.getState().ready&&lab?.getState().metadata;},null,{timeout:120000});
 await page.evaluate(()=>{window.lab=window.diandianLab||window.zhigengLab;lab.setPlaying(false);});
 assert.equal(await page.locator('[data-motion]:visible').count(),8);
 const states=[];
 for (const [name,fraction] of [['PistolShooting',.45],['SittingCrossLegged',.3],['SittingTalking',.5],['WalkingBackwards',.4],['ClimbingLadder',.5],['HangToCrouch',1],['Dying',1],['FlyingBackDeath',1]]) {
  await page.locator(`[data-motion="${name}"]`).click();
  await page.evaluate(f=>{lab.setPlaying(false);lab.seek(lab.getState().duration*f);},fraction);
  await page.waitForFunction(n=>lab.getWeaponState().motion===n && Math.abs(lab.getWeaponState().time-lab.getState().time)<.001,name);
  await page.waitForTimeout(700);
  const state=await page.evaluate(()=>({motion:lab.getState().motion,clip:lab.getActiveClip(),time:lab.getState().time,duration:lab.getState().duration,weapon:lab.getWeaponState(),camera:lab.camera.position.toArray(),target:lab.controls.target.toArray()}));
  assert.equal(state.motion,name);assert.equal(state.clip,name);assert.equal(state.weapon.visible,name==='PistolShooting');states.push(state);
  await page.locator('#stage').screenshot({path:`${out}/${cid}-${name}.png`});
 }
 // Once-only clips stay on their final pose; playing again restarts them.
 await page.evaluate(()=>{lab.setMotion('Dying');lab.seek(lab.getState().duration-.02);lab.setPlaying(true);});
 await page.waitForFunction(()=>!lab.getState().playing);
 assert.equal(await page.evaluate(()=>lab.getState().playing),false);
 await page.locator('#play-toggle').click();assert.equal(await page.evaluate(()=>lab.getState().playing),true);
 await page.evaluate(()=>lab.setPlaying(false));
 await page.locator('[data-weapon="pf89"]').click();
 assert.equal(await page.locator('[data-motion]:visible').count(),14);
 assert.equal(await page.evaluate(()=>lab.getActiveClip()),'RocketIdle');
 await page.selectOption('#motion-filter','new');
 await page.locator('[data-motion="PistolShooting"]').click();
 assert.equal(await page.evaluate(()=>lab.getState().weapon),'qsz92');
 await page.evaluate(()=>lab.setPlaying(false));
 await page.screenshot({path:`${out}/${cid}-desktop.png`});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
 await page.locator('[data-motion="SittingTalking"]').click();
 await page.evaluate(()=>{lab.setPlaying(false);lab.seek(20);});
 await page.waitForTimeout(600);
 await page.screenshot({path:`${out}/${cid}-mobile.png`,fullPage:true});
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(warnings.length,0,JSON.stringify(warnings));
 report[cid]={passed:true,errors,warnings,ponytailPhysicsEnabled:await page.evaluate(()=>lab.getState().ponytailPhysics??null),visibleNewActions:8,visiblePf89Actions:14,mobileWidth:390,states};
 await page.close();console.log('BROWSER_PASS',cid);
}
fs.writeFileSync(`${out}/browser${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify(report,null,2)+'\n');
} finally {await browser.close();}
