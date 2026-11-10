import fs from 'node:fs';import * as T from 'three';import {runtime,motions} from './runtime.mjs';
const report={policy:'Differences measured from actual equipped baseline runtime, matching normalized times. Baseline type64 reference is type54.',characters:{}};
function pose(r){const out={};for(const b of new Set(r.model.bones.values()))out[b.name]={q:b.quaternion.clone().normalize(),p:b.getWorldPosition(new T.Vector3())};return out;}
function group(n){return /Hand(?:Thumb|Index|Middle|Ring|Pinky)/.test(n)?'fingers':/Hand/.test(n)?'wrists':/Shoulder|Arm|ForeArm/.test(n)?'arms':/Spine|Neck|Head/.test(n)?'torsoHead':'lowerBody';}
for(const cid of ['diandian','zhigeng']){
 const base=await runtime(cid,'baseline'),v5=await runtime(cid,'v5'),cand=await runtime(cid,'candidate_a');const rows=[];
 for(const w of ['qsz92','type54','type64','m870'])for(const m of motions(w)){
  const row={weapon:w,motion:m,originalClip:base.clip(w,m),v5Clip:v5.clip(w,m),candidateClip:cand.clip(w,m),duration:base.duration(w,m),comparisons:{}};
  for(const r of [v5,cand]){
   const key=r===v5?'v5':'candidate_a',groups={};let worst=null;
   for(let f=0;f<=20;f++){
    const phase=f/20;base.poseAt(w,m,phase*base.duration(w,m));const a=pose(base);r.poseAt(w,m,phase*r.duration(w,m));const b=pose(r);
    for(const n of Object.keys(a)){const angle=T.MathUtils.radToDeg(a[n].q.angleTo(b[n].q)),distance=a[n].p.distanceTo(b[n].p),k=group(n),s=groups[k]||={count:0,maxDegrees:0,sumSquareDegrees:0,maxPositionM:0};s.count++;s.maxDegrees=Math.max(s.maxDegrees,angle);s.sumSquareDegrees+=angle*angle;s.maxPositionM=Math.max(s.maxPositionM,distance);if(!worst||angle>worst.degrees)worst={bone:n,phase,degrees:angle};}
   }
   for(const s of Object.values(groups)){s.rmsDegrees=Math.sqrt(s.sumSquareDegrees/s.count);delete s.sumSquareDegrees;}row.comparisons[key]={groups,worst};
  }
  rows.push(row);
 }
 report.characters[cid]=rows;console.log(cid,'done',rows.length);
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/baseline_v5_candidate_a_pose_comparison.json',JSON.stringify(report,null,2));
