import{chromium}from'playwright';import fs from'node:fs';import assert from'node:assert/strict';
const out='web/motion-labs/verification_r43';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={};
try{
for(const[cid,folder]of[['diandian','diandian-classic-motion-lab'],['zhigeng','zhigeng-motion-lab']]){
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&/PropertyBinding|target node|animation/i.test(m.text()))warnings.push(m.text());});
 await page.goto(`http://127.0.0.1:8086/web/motion-labs/${folder}/`);await page.waitForFunction(()=>{const l=window.diandianLab||window.zhigengLab;return l?.getState().metadata;},null,{timeout:120000});
 await page.evaluate(()=>{window.lab=window.diandianLab||window.zhigengLab;lab.setPlaying(false);});assert.equal(await page.locator('[data-motion]:visible').count(),2);
 const gun=[];
 for(const motion of ['QJZ89Idle','QJZ89Aim']){
  await page.locator(`[data-motion="${motion}"]`).click();await page.evaluate(()=>{lab.setPlaying(false);lab.seek(lab.getState().duration*.37);});
  await page.waitForFunction(m=>lab.getWeaponState().motion===m&&Math.abs(lab.getWeaponState().time-lab.getState().time)<.001,motion);await page.waitForTimeout(650);
  const state=await page.evaluate(()=>lab.getWeaponState());assert.equal(state.selectedWeapon,'qjz89');assert(state.visible&&state.fixedEmplacement);assert(state.leftContactErrorM<.002&&state.rightContactErrorM<.002);gun.push(state);
  await page.locator('#stage').screenshot({path:`${out}/${cid}-${motion}.png`});
  for(const side of ['leftHand','rightHand']){await page.locator(`[data-framing="${side}"]`).click();await page.waitForTimeout(700);await page.locator('#stage').screenshot({path:`${out}/${cid}-${motion}-${side}.png`});}
  await page.locator('[data-framing="full"]').click();
 }
 const saved=await page.evaluate(()=>({motion:lab.getState().motion,time:lab.getState().time}));
 await page.locator('[data-subject="tank"]').click();await page.waitForFunction(()=>lab.getState().subject==='tank',null,{timeout:120000});
 const tank=[];
 for(const[name,time]of[['TankIdle',0],['TankTurretAim',1.25],['TankRecoil',.18],['TankMGAim',1.25],['TankTracks',3.7]]){
  await page.locator(`[data-vehicle-motion="${name}"]`).click();await page.evaluate(t=>{lab.setPlaying(false);lab.seek(t);},time);
  await page.waitForFunction(({name,time})=>lab.getTankState()?.motion===name&&Math.abs(lab.getTankState().time-time)<.001,{name,time});
  const state=await page.evaluate(()=>({tank:lab.getTankState(),active:lab.getActiveClip(),characterVisible:[...lab.models.values()].some(m=>m.wrapper.visible),gunVisible:lab.getWeaponState().visible}));
  assert.equal(state.characterVisible,false);assert.equal(state.gunVisible,false);assert.equal(state.tank.driverRequired,false);assert.equal(state.active,name);tank.push(state);
  await page.locator('#stage').screenshot({path:`${out}/${cid}-${name}.png`});
 }
 await page.locator('[data-vehicle-motion="TankRecoil"]').click();await page.evaluate(()=>{lab.seek(.99);lab.setPlaying(true);});await page.waitForFunction(()=>!lab.getState().playing);
 await page.locator('#play-toggle').click();assert(await page.evaluate(()=>lab.getState().playing));await page.evaluate(()=>lab.setPlaying(false));
 await page.locator('[data-vehicle-motion="TankIdle"]').click();await page.evaluate(()=>lab.setPlaying(false));await page.screenshot({path:`${out}/${cid}-tank-desktop.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
 await page.screenshot({path:`${out}/${cid}-tank-mobile.png`,fullPage:true});
 await page.locator('[data-subject="character"]').click();await page.waitForFunction(()=>lab.getState().subject==='character'&&lab.getWeaponState().visible);
 const restored=await page.evaluate(()=>({motion:lab.getState().motion,time:lab.getState().time}));assert.deepEqual(restored,saved);
 await page.screenshot({path:`${out}/${cid}-operator-mobile.png`,fullPage:true});
 await page.locator('[data-weapon="qsz92"]').click();await page.selectOption('#motion-filter','new');await page.locator('[data-motion="PistolShooting"]').click();await page.evaluate(()=>{lab.setPlaying(false);lab.seek(.18);});await page.waitForFunction(()=>lab.getWeaponState().motion==='PistolShooting');assert.equal(await page.evaluate(()=>lab.getWeaponState().selectedWeapon),'qsz92');
 await page.locator('[data-weapon="pf89"]').click();assert.equal(await page.locator('[data-motion]:visible').count(),14);
 await page.locator('[data-weapon="qjz89"]').click();assert.equal(await page.locator('[data-motion]:visible').count(),2);
 await page.evaluate(()=>Promise.all([lab.selectSubject('tank'),lab.selectSubject('character')]));assert.equal(await page.evaluate(()=>lab.getState().subject),'character');
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(warnings.length,0,JSON.stringify(warnings));report[cid]={passed:true,errors,warnings,gun,tank,mobileWidth:390,restored};await page.close();console.log('BROWSER_R43_PASS',cid);
}
fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
