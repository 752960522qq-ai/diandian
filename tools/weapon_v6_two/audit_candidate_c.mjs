import fs from 'node:fs';import * as T from 'three';import {runtime,motions} from './runtime.mjs';
const out={policy:'Natural-motion audit only. Surface intersection is not a pass/fail target.',rows:[],sourcePistolComposition:[]};
const pose=r=>Object.fromEntries([...new Set(r.model.bones.values())].map(b=>[b.name,{q:b.quaternion.clone().normalize(),wq:b.getWorldQuaternion(new T.Quaternion()).normalize(),p:b.getWorldPosition(new T.Vector3())}]));
for(const cid of ['diandian','zhigeng']){
 const b=await runtime(cid,'baseline'),c=await runtime(cid,'candidate_c');
 const body=c.model.actions.get('RifleRun').getClip(),run=c.model.actions.get('SourcePistolRun').getClip();let bodyMismatch=0;
 for(const t of body.tracks.filter(t=>!/Shoulder|Arm|ForeArm|Hand/.test(t.name))){const a=run.tracks.find(v=>v.name===t.name);if(!a||['times','values'].some(k=>t[k].length!==a[k].length||t[k].some((v,i)=>v!==a[k][i])))bodyMismatch++;}
 out.sourcePistolComposition.push({cid,sourceBody:'RifleRun',sourceArms:'LeonPistolWalk',unchangedBodyTrackMismatches:bodyMismatch,runDuration:run.duration,sourceRunDuration:body.duration});
 for(const w of ['qsz92','type54','type64','m870'])for(const m of motions(w)){
  const row={cid,weapon:w,motion:m,sourceClip:b.clip(w,m),candidateClip:c.clip(w,m),frames:61,maxUnchangedBodyPositionM:0,maxUnchangedBodyLocalDegrees:0,maxRightHandPositionM:0,maxLeftHandPositionM:0,maxLeftHandWorldDegrees:0,maxLeftArmLocalDegrees:0,finite:true};
  for(let i=0;i<=60;i++){
   b.poseAt(w,m,b.duration(w,m)*i/60);const a=pose(b);c.poseAt(w,m,c.duration(w,m)*i/60);const z=pose(c);
   for(const n of Object.keys(a)){const p=a[n].p.distanceTo(z[n].p),deg=T.MathUtils.radToDeg(a[n].q.angleTo(z[n].q));row.finite&&=Number.isFinite(p)&&Number.isFinite(deg);
    if(!/Left(?:Arm|ForeArm|Hand)/.test(n)){row.maxUnchangedBodyPositionM=Math.max(row.maxUnchangedBodyPositionM,p);row.maxUnchangedBodyLocalDegrees=Math.max(row.maxUnchangedBodyLocalDegrees,deg);}
    if(n==='mixamorigRightHand'){row.maxRightHandPositionM=Math.max(row.maxRightHandPositionM,p);}
    if(/Left(?:Arm|ForeArm|Hand)$/.test(n))row.maxLeftArmLocalDegrees=Math.max(row.maxLeftArmLocalDegrees,deg);
    if(n==='mixamorigLeftHand'){row.maxLeftHandPositionM=Math.max(row.maxLeftHandPositionM,p);row.maxLeftHandWorldDegrees=Math.max(row.maxLeftHandWorldDegrees,T.MathUtils.radToDeg(a[n].wq.angleTo(z[n].wq)));}
   }
  }out.rows.push(row);
 }
 for(const w of ['qsz92','type54','type64'])for(const m of ['RifleRun','Reloading']){const t=c.duration(w,m)*.5;c.poseAt(w,m,t);const before=pose(c);for(let k=0;k<8;k++){c.poseAt('m870','ShotgunPump',.25);c.poseAt(w,'Reloading',c.duration(w,'Reloading')*.75);c.poseAt(w,'RifleRun',c.duration(w,'RifleRun')*.3);}c.poseAt(w,m,t);const after=pose(c);let drift=0;for(const n of Object.keys(before))drift=Math.max(drift,before[n].p.distanceTo(after[n].p));out.rows.push({cid,weapon:w,motion:m,selectedWeapon:c.attachment.selectedWeapon,clip:c.clip(w,m),duration:c.duration(w,m),repeatSwitchWorldDriftM:drift});}
 console.log(cid,'audited');
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/candidate_c_motion_audit.json',JSON.stringify(out,null,2));
