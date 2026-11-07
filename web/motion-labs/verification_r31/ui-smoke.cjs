const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222'),rows=[];
 for(const [ch,site] of [['diandian','diandian-classic-motion-lab'],['zhigeng','zhigeng-motion-lab']]){
  const p=await b.contexts()[0].newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:8080/web/motion-labs/'+site+'/?r31-ui=1');
  await p.waitForFunction(()=>(window.diandianLab||window.zhigengLab)?.getState().ready,null,{polling:100,timeout:90000});
  await p.evaluate(()=>{const l=window.diandianLab||window.zhigengLab;l.selectWeapon('type97hawk');l.setMotion('FiringRifle');l.setPlaying(true);});
  await p.waitForFunction(()=>!(window.diandianLab||window.zhigengLab).getState().playing,null,{timeout:15000,polling:100});
  const fire=await p.evaluate(()=>(window.diandianLab||window.zhigengLab).getState());
  await p.evaluate(()=>{const l=window.diandianLab||window.zhigengLab;l.setMotion('ShotgunPump');l.setPlaying(true);});
  await p.waitForFunction(()=>!(window.diandianLab||window.zhigengLab).getState().playing,null,{timeout:15000,polling:100});
  const result=await p.evaluate(()=>{const l=window.diandianLab||window.zhigengLab;return {state:l.getState(),attachment:l.models.get('fixed').weaponAttachment.getState(),pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,canvasWidth:l.renderer.domElement.getBoundingClientRect().width};});
  rows.push({character:ch,errors,fire,result,pass:errors.length===0&&fire.time>=fire.duration-.02&&result.state.time>=result.state.duration-.02&&Math.abs(result.attachment.pumpTravelM)<1e-8&&result.pageWidth<=result.viewportWidth});
  await p.close();
 }
 fs.writeFileSync('web/motion-labs/verification_r31/ui-smoke.json',JSON.stringify({passed:rows.every(r=>r.pass),rows},null,2)+'\n');console.log(rows.map(r=>({character:r.character,pass:r.pass,errors:r.errors})));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
