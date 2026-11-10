import fs from'node:fs';import * as T from'three';import{runtime}from'./runtime.mjs';
const report={policy:'Compare original tracks and actual runtime pose continuity. Does not use surface collision as acceptance criteria.',characters:{}};
const pose=r=>Object.fromEntries([...new Set(r.model.bones.values())].map(b=>[b.name,{q:b.quaternion.clone().normalize(),p:b.getWorldPosition(new T.Vector3())}]));
for(const cid of ['diandian','zhigeng']){
 const base=await runtime(cid,'baseline'),r=await runtime(cid,'production');base.cfg.weapons.qsz92.compatible_motions=['RifleRun','Reloading'];
 const row={sourceClipDurations:{},originalTrackMismatches:0,runs:[],reloads:[]};
 for(const n of ['RifleRun','Reloading']){const a=base.model.actions.get(n).getClip(),b=r.model.actions.get(n).getClip();row.sourceClipDurations[n]=b.duration;for(const t of a.tracks){const u=b.tracks.find(x=>x.name===t.name);if(!u||['times','values'].some(k=>t[k].length!==u[k].length||t[k].some((x,i)=>x!==u[k][i])))row.originalTrackMismatches++;}}
 for(const w of ['qsz92','type54','type64'])for(const m of ['RifleRun','Reloading']){
  const x={weapon:w,motion:m,sourceClip:r.clip(w,m),duration:r.duration(w,m),sampledFrames:121,selectedWeaponStable:true,finite:true,maxUnchangedBodyDeltaM:0,maxQSZReferenceDeltaM:0,maxLeftWristLocalStepDegrees:0,maxRightWristLocalStepDegrees:0};let prev=null;
  for(let i=0;i<=120;i++){
   const time=x.duration*i/120;base.poseAt('qsz92',m,time);const b=pose(base);r.poseAt(w,m,time);const c=pose(r);x.selectedWeaponStable&&=r.attachment.selectedWeapon===w;
   for(const n in c){const dp=c[n].p.distanceTo(b[n].p);x.finite&&=Number.isFinite(dp)&&Number.isFinite(c[n].q.w);if(!/Shoulder|Arm|ForeArm|Hand/.test(n))x.maxUnchangedBodyDeltaM=Math.max(x.maxUnchangedBodyDeltaM,dp);if(w==='qsz92')x.maxQSZReferenceDeltaM=Math.max(x.maxQSZReferenceDeltaM,dp);}
   if(prev){for(const side of['Left','Right']){const n='mixamorig'+side+'Hand';x['max'+side+'WristLocalStepDegrees']=Math.max(x['max'+side+'WristLocalStepDegrees'],T.MathUtils.radToDeg(prev[n].q.angleTo(c[n].q)));}}
   prev=c;
  }
  const t=x.duration*.37;r.poseAt(w,m,t);const before=pose(r);for(let i=0;i<10;i++){r.poseAt('m870','ShotgunPump',.25);r.poseAt(w,'Reloading',1.4);r.poseAt(w,'RifleRun',.33);}r.poseAt(w,m,t);const after=pose(r);x.repeatSwitchPositionDriftM=Math.max(...Object.keys(before).map(n=>before[n].p.distanceTo(after[n].p)));
  row[m==='RifleRun'?'runs':'reloads'].push(x);
 }
 report.characters[cid]=row;console.log(cid,'D audited');
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/candidate_d_motion_audit.json',JSON.stringify(report,null,2));
