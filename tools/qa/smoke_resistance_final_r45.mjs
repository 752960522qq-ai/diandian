import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1365,height:960}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
try{await p.goto('http://127.0.0.1:8086/web/motion-labs/resistance-motion-lab/');await p.waitForFunction(()=>resistanceLab.state.ready,null,{timeout:120000});
const rows=[];for(const cid of ['military','vest']){await p.evaluate(cid=>resistanceLab.selectCharacter(cid),cid);await p.selectOption('#weapon','qbu85');await p.locator('[data-motion="RifleWalk"]').click();
rows.push(await p.evaluate(()=>{const l=resistanceLab;l.state.playing=false;let max=0;for(let i=0;i<=24;i++){l.state.time=l.snapshot().duration*i/24;l.pose();max=Math.max(max,l.snapshot().grip.leftContactErrorM);}return {character:l.state.character,max};}));
assert(rows.at(-1).max<.002);await p.evaluate(()=>{resistanceLab.state.time=.65;resistanceLab.pose();resistanceLab.view();});await p.screenshot({path:`web/motion-labs/verification_r45/${cid}-qbu85-walk-final.png`});
await p.selectOption('#weapon','none');await p.locator('[data-motion="FlyingBackDeath"]').click();await p.locator('#seek').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.screenshot({path:`web/motion-labs/verification_r45/${cid}-death-framing.png`});
}
await p.setViewportSize({width:390,height:844});await p.locator('[data-motion="Idle"]').click();await p.locator('[data-view="front"]').click();await p.evaluate(()=>{resistanceLab.state.playing=false;resistanceLab.pose();});await p.screenshot({path:'web/motion-labs/verification_r45/mobile-final.png',fullPage:true});
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
fs.writeFileSync('web/motion-labs/verification_r45/final-smoke.json',JSON.stringify({passed:true,errors,rows,changes:['both QBU85 walk support anchors','trajectory framing']},null,2));console.log('FINAL_SMOKE_PASS',rows);
}finally{await b.close();}
