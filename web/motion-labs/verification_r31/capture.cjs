const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');const path=require('path');
(async()=>{
 const b=await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
 const before=process.argv.includes('--before');
 const samples=[
 ['hanyang-aim','hanyang88','RifleAimingIdle',2.03,'left'],
 ['hanyang-walk','hanyang88','RifleWalk',.23,'left'],
 ['qbz95-idle','qbz95','RifleIdle',3.46,'front'],
 ['qbz95-run','qbz95','RifleRun',.47,'left'],
 ['c96-idle','c96','RifleIdle',5.11,'front'],
 ['qcq171-aim','qcq171','RifleAimingIdle',2.79,'front'],
 ['chest','type97hawk','RifleIdle',4.26,'quarter'],
 ['type56-grip','type56_1','RifleAimingIdle',3.04,'left'],
 ['type97-fire-rest','type97hawk','FiringRifle',0,'left'],
 ['type97-fire-peak','type97hawk','FiringRifle',.0333333,'left'],
 ['type97-pump-start','type97hawk','ShotgunPump',0,'left'],
 ['type97-pump-bent','type97hawk','ShotgunPump',.3,'left'],
 ['type97-pump-end','type97hawk','ShotgunPump',.73333335,'left']];
 for(const char of ['diandian','zhigeng']){
  const page=b.contexts()[0].pages().find(p=>p.url().includes(char==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab'));
  const out=path.join('web/motion-labs/verification_r31',char);fs.mkdirSync(out,{recursive:true});
  if(before) await page.evaluate(async()=>{
    const {a}=qa,base='/work/grip-r31/before/'+a.characterId+'/';
    const [{WeaponAttachment},config]=await Promise.all([import(base+'weapon-attachment.js'),fetch(base+'assets/weapon_attachment.json').then(r=>r.json())]);
    window.qaCaptureRestore={prototype:Object.getPrototypeOf(a),config:a.config};
    a.beforeAnimation();a.chestSkinning.setEnabled(false);a.config=config;a.character=config.characters[a.characterId];Object.setPrototypeOf(a,WeaponAttachment.prototype);
  });
  for(const [name,w,mo,t,angle] of (before?samples.slice(0,8):samples)){
   const r=await page.evaluate(([w,mo,t,angle])=>{
    const {l,T}=qa;poseAt(w,mo,t);l.renderer.setSize(800,800,false);l.camera.aspect=1;l.camera.updateProjectionMatrix();
    const background=l.scene.background;l.scene.background=new T.Color('#282f3b');
    view(angle,[0,1.25,0],1.6);const image=l.renderer.domElement.toDataURL('image/png');l.scene.background=background;
    return {image,metrics:metrics()};
   },[w,mo,t,angle]);
   fs.writeFileSync(path.join(out,(before?'before-':'')+name+'.png'),Buffer.from(r.image.split(',')[1],'base64'));
   fs.writeFileSync(path.join(out,(before?'before-':'')+name+'.json'),JSON.stringify({weapon:w,motion:mo,time:t,view:angle,...r.metrics},null,2)+'\n');
  }
  if(before)await page.evaluate(()=>{const {a}=qa;a.beforeAnimation();a.config=qaCaptureRestore.config;a.character=a.config.characters[a.characterId];Object.setPrototypeOf(a,qaCaptureRestore.prototype);delete window.qaCaptureRestore;});
  console.log(char,before?'before':'after','captures');
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
