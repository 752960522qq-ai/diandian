import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='web/motion-labs/verification_r44';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={characters:{},tank:{}};
try{
 for(const[cid,folder]of[['diandian','diandian-classic-motion-lab'],['zhigeng','zhigeng-motion-lab']]){
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(`http://127.0.0.1:8086/web/motion-labs/${folder}/`);
  await page.waitForFunction(()=>{const lab=window.diandianLab||window.zhigengLab;return lab?.getState().ready&&lab.models.has('before');},null,{timeout:120000});
  await page.evaluate(()=>{window.lab=window.diandianLab||window.zhigengLab;lab.setPlaying(false);});
  assert.equal(await page.locator('[data-subject],#tank-controls').count(),0);
  assert.equal(await page.locator('.vehicle-lab-link').getAttribute('href'),'https://type59d-motion-lab.expert-eagle-6942.chatgpt.site');
  const poses=[];
  for(const[weapon,names]of[['qjz89',['QJZ89Idle','QJZ89Aim']],['qbu10',['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading']]]){
   await page.locator(`[data-weapon="${weapon}"]`).click();
   for(const motion of names){
    await page.locator(`[data-motion="${motion}"]`).click();await page.evaluate(()=>{lab.setPlaying(false);lab.seek(lab.getState().duration*.37);});
    await page.waitForFunction(m=>lab.getWeaponState().motion===m&&Math.abs(lab.getWeaponState().time-lab.getState().time)<.001,motion);
    const state=await page.evaluate(()=>lab.getWeaponState());assert(state.visible);assert.equal(state.selectedWeapon,weapon);assert(state.leftContactErrorM<.002&&state.rightContactErrorM<.002);
    if(weapon==='qjz89'||['RifleAimingIdle','FiringRifle'].includes(motion))assert(state.shoulderContactErrorM<.0001);
    poses.push(state);
    if(['QJZ89Idle','QJZ89Aim','RifleIdle','RifleAimingIdle'].includes(motion)){
     await page.locator('[data-angle="side"]').click();await page.waitForTimeout(700);
     await page.locator('#stage').screenshot({path:`${out}/${cid}-${weapon}-${motion}-side.png`});
     await page.evaluate(()=>{lab.controls.target.set(-.04,1.33,.07);lab.camera.position.set(-1.65,1.52,1.1);lab.controls.update();});
     await page.locator('#stage').screenshot({path:`${out}/${cid}-${weapon}-${motion}-contact.png`});
    }
   }
  }
  await page.locator('[data-weapon="qbu10"]').click();await page.locator('[data-angle="front"]').click();
  assert((await page.locator('#weapon-label').innerText()).includes('1150 mm'));
  await page.waitForTimeout(700);await page.screenshot({path:`${out}/${cid}-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.locator('#reset-camera').click();await page.waitForTimeout(750);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/${cid}-mobile.png`,fullPage:true});
  const scale=await page.evaluate(()=>{const hand=lab.models.get('fixed').bones.get('mixamorig:RightHand');return hand.scale.toArray();});
  assert(Math.abs(scale[0]-(cid==='diandian'?.9:1))<1e-5);
  await page.locator('[data-weapon="pf89"]').click();assert.equal(await page.locator('[data-motion]:visible').count(),14);
  await page.locator('[data-weapon="qsz92"]').click();await page.selectOption('#motion-filter','new');await page.locator('[data-motion="PistolShooting"]').click();
  await page.waitForFunction(()=>lab.getWeaponState().motion==='PistolShooting');
  assert(!requests.some(u=>/type59d|unmanned-tank|\/vehicles\//.test(u)),'Character site requested tank payload');
  assert.deepEqual(errors,[]);report.characters[cid]={passed:true,poses,sourceHandScale:scale,errors,tankRequests:0,modelRequests:requests.filter(u=>u.includes('.glb'))};
  await page.close();console.log('R44_BROWSER_CHARACTER_PASS',cid);
 }
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:8086/web/motion-labs/type59d-motion-lab/');await page.waitForFunction(()=>window.tankLab?.getState().ready,null,{timeout:120000});
 const actions=[];
 for(const[name,time]of[['TankIdle',0],['TankTurretAim',1.25],['TankRecoil',.18],['TankMGAim',1.25],['TankTracks',3.7]]){
  await page.locator(`[data-motion="${name}"]`).click();await page.evaluate(t=>{tankLab.setPlaying(false);tankLab.seek(t);},time);
  await page.waitForFunction(({name,time})=>tankLab.getState().motion===name&&Math.abs(tankLab.getState().time-time)<.001,{name,time});
  const state=await page.evaluate(()=>tankLab.getState());assert.equal(state.driverRequired,false);assert(state.visible);actions.push(state);
  await page.locator('#stage').screenshot({path:`${out}/tank-${name}.png`});
 }
 await page.locator('[data-motion="TankRecoil"]').click();await page.evaluate(()=>{tankLab.seek(.99);tankLab.setPlaying(true);});await page.waitForFunction(()=>!tankLab.getState().playing);
 await page.locator('#play-toggle').click();assert(await page.evaluate(()=>tankLab.getState().playing));
 await page.locator('[data-motion="TankIdle"]').click();await page.screenshot({path:`${out}/tank-desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${out}/tank-mobile.png`,fullPage:true});
 const glbs=requests.filter(u=>u.includes('.glb'));assert.equal(glbs.length,1);assert(glbs[0].includes('type59d.glb'));assert.deepEqual(errors,[]);
 report.tank={passed:true,actions,errors,modelRequests:glbs};await page.close();console.log('R44_BROWSER_TANK_PASS');
 fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
