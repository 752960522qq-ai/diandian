import {chromium} from 'playwright';import fs from 'node:fs';
const out='web/motion-labs/verification_weapon_v6_two/browser_sequences';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report=[];
for(const cid of ['diandian','zhigeng']){
 const pages={};const folder=cid==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab';
 for(const kind of ['baseline','candidate_b']){
  const p=await browser.newPage({viewport:{width:1000,height:800}});pages[kind]=p;let errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>window.requestAnimationFrame=()=>0);await p.goto(`http://127.0.0.1:8106/work/weapon_v6_two/${kind}/${folder}/`);
  await p.waitForFunction(()=>(window.diandianLab||window.zhigengLab)?.getState().ready,null,{timeout:120000});await p.evaluate(fs.readFileSync('web/motion-labs/verification_r33/qa-context.js','utf8'));report.push({cid,kind,errors});
 }
 for(const motion of ['Reloading','ShotgunPump'])for(let f=0;f<=4;f++){
  const phase=f/4,base=pages.baseline;const reference=await base.evaluate(({motion,phase})=>{poseAt('winchester1897',motion,0);const duration=qa.l.getState().duration;poseAt('winchester1897',motion,duration*phase);return {duration,center:pos('RightHand').add(pos('LeftHand')).multiplyScalar(.5).toArray()};},{motion,phase});
  for(const [kind,p]of Object.entries(pages)){
   const state=await p.evaluate(({kind,motion,time})=>{poseAt(kind==='baseline'?'winchester1897':'m870',motion,time);return metrics();},{kind,motion,time:reference.duration*phase});report.push({cid,kind,motion,phase,...state});
   for(const angle of (motion==='Reloading'?['full','close']:['close'])){
    await p.evaluate(({angle,center})=>view([1,.1,1],angle==='full'?[0,.92,0]:center,angle==='full'?2.8:1.08),{angle,center:reference.center});await p.locator('#stage').screenshot({path:`${out}/${cid}-${motion}-${f}-${kind}-${angle}.png`});
   }
  }
 }
 for(const p of Object.values(pages))await p.close();console.log(cid,'done');
}
fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();
