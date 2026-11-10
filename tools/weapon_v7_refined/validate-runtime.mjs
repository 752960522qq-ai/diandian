import fs from 'node:fs';import * as T from 'three';import {runtime,decode} from './runtime.mjs';
const OUT='web/motion-labs/verification_weapon_v7',report={characters:{},failures:[]};
const unarmed=['Idle','Walk','Run','WalkingBackwards','Talking','HeadStress','SittingCrossLegged','SittingTalking','ClimbingLadder','HangToCrouch','Dying','FlyingBackDeath'];
const legacy=['qbz95','type56_1','qbu85','type97hawk','qcq171'];
const M=w=>w==='none'?unarmed:['qsz92','type54','type64'].includes(w)?['PistolIdle','PistolWalk','RifleRun','PistolAimingIdle','PistolShooting','Reloading']:w==='m870'?['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','ShotgunAimLevel','ShotgunAimUp','ShotgunAimDown','FiringRifle','ShotgunPump','Reloading']:['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(w==='type97hawk'?['ShotgunPump']:[])];
const local=r=>Object.fromEntries([...new Set(r.bones.values())].map(b=>[b.name,[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]]));
const maxDiff=(a,b)=>Math.max(...Object.keys(a).map(k=>Math.max(...a[k].map((x,i)=>Math.abs(x-b[k][i])))));
for(const cid of ['linxu','military','vest']){
 const {model:r}=await runtime(cid),{model:b}=await runtime(cid,process.env.V7_REFERENCE||'../v6_reference'),rows=[];
 let finiteChecks=0;
 for(const w of ['none',...legacy,'qsz92','type54','type64','m870'])for(const m of M(w)){
  const d=r.duration(m,w),bd=b.duration(m,w);let nonArm=0,localLengths=0,unarmedDiff=0,pump=0,visible=true;
  for(let i=0;i<=8;i++){
   const t=d*i/8,st=r.pose(m,t,w);b.pose(m,t,w);const a=local(r),bb=local(b);
   for(const name in a){for(const v of a[name]){finiteChecks++;if(!Number.isFinite(v))report.failures.push({cid,w,m,phase:i/8,error:'Non-finite pose'});}for(const j of [0,1,2,7,8,9])localLengths=Math.max(localLengths,Math.abs(a[name][j]-bb[name][j]));if(!/Shoulder|Arm|Hand/.test(name))for(let j=0;j<10;j++)nonArm=Math.max(nonArm,Math.abs(a[name][j]-bb[name][j]));}
   if(w==='none')unarmedDiff=Math.max(unarmedDiff,maxDiff(a,bb));if(w!=='none')visible&&=st.visible&&st.selectedWeapon===w;
   if(w==='m870')pump=Math.max(pump,Math.abs((st.pumpTravelM||0)-(b.attachment.getState().pumpTravelM||0)));
  }
  r.pose(m,d*.37,w);const snap=local(r),gun=w==='none'?null:r.attachment.weapons.get(w),gp=gun?.position.clone(),gq=gun?.quaternion.clone().normalize();
  for(const [tw,tm]of [['qbz95','RifleIdle'],['qsz92','PistolIdle'],['m870','ShotgunPump'],['none','Walk']])r.pose(tm,r.duration(tm,tw)*.73,tw);
  r.pose(m,d*.37,w);const drift=maxDiff(snap,local(r)),gd=gun?Math.max(gp.distanceTo(gun.position),gq.angleTo(gun.quaternion.clone().normalize())):0;
  const row={weapon:w,motion:m,duration:d,referenceDuration:bd,samples:9,maxNonArmLocalDifference:nonArm,maxLocalTranslationScaleDifference:localLengths,maxUnarmedDifference:unarmedDiff,pumpCurveDifferenceM:pump,visibleCorrect:visible,maxSwitchSeekDrift:drift,maxGunSwitchSeekDrift:gd};rows.push(row);
  if(d!==bd||nonArm>1e-6||localLengths>1e-6||unarmedDiff>1e-6||pump>1e-7||!visible||drift>1e-5||gd>1e-5)report.failures.push({cid,...row});
 }
 report.characters[cid]={rows,finiteChecks};console.log(cid,rows.length,'rows, failures',report.failures.filter(x=>x.cid===cid).length);
}
report.passed=report.failures.length===0;fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/runtime-regression.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
