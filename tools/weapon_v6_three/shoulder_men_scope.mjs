/** Exact source-to-source isolation proof for the two isolated M870 Run candidates. */
import fs from 'node:fs';import * as T from 'three';import {candidate} from './candidate.mjs';
const OUT='web/motion-labs/verification_weapon_v6_three/shoulder-men-candidate',report={};
function snapshot(c){return{bones:Object.fromEntries([...c.bones].map(([n,b])=>[n,{p:b.position.clone(),q:b.quaternion.clone().normalize(),s:b.scale.clone(),world:b.getWorldPosition(new T.Vector3())}])),gunP:c.gunScenes.get('m870').position.clone(),gunQ:c.gunScenes.get('m870').quaternion.clone().normalize()};}
for(const cid of ['military','vest']){
 const c=await candidate(cid),m=c.src.cfg.characters.diandian.mounts.winchester1897,original=structuredClone(m.motions.RifleRun),rows={samples:161,max_local_position_delta:0,max_local_scale_delta:0,max_unrelated_local_quaternion_delta_deg:0,max_gun_position_delta_m:0,max_gun_quaternion_delta_deg:0,max_world_joint_position_delta_m:{},changed_rotation_bones:[]},changed=new Set();
 for(let i=0;i<=160;i++){
  const t=c.duration('m870','RifleRun')*i/160;m.motions.RifleRun=original;c.pose('m870','RifleRun',t);const a=snapshot(c);
  m.motions.RifleRun={...original,left_hand_quaternion_weapon:null,support_forearm_twist_weight:0,support_upper_arm_twist_weight:0};c.pose('m870','RifleRun',t);const b=snapshot(c);
  rows.max_gun_position_delta_m=Math.max(rows.max_gun_position_delta_m,a.gunP.distanceTo(b.gunP));rows.max_gun_quaternion_delta_deg=Math.max(rows.max_gun_quaternion_delta_deg,T.MathUtils.radToDeg(a.gunQ.angleTo(b.gunQ)));
  for(const n of Object.keys(a.bones)){const x=a.bones[n],y=b.bones[n],angle=T.MathUtils.radToDeg(x.q.angleTo(y.q));rows.max_local_position_delta=Math.max(rows.max_local_position_delta,x.p.distanceTo(y.p));rows.max_local_scale_delta=Math.max(rows.max_local_scale_delta,x.s.distanceTo(y.s));if(angle>1e-4)changed.add(n);if(!/Left(Arm|ForeArm|Hand)/.test(n))rows.max_unrelated_local_quaternion_delta_deg=Math.max(rows.max_unrelated_local_quaternion_delta_deg,angle);if(/Left(Shoulder|Arm|ForeArm|Hand)$/.test(n))rows.max_world_joint_position_delta_m[n]=Math.max(rows.max_world_joint_position_delta_m[n]||0,x.world.distanceTo(y.world));}
 }
 rows.changed_rotation_bones=[...changed];report[cid]=rows;console.log(cid,rows);
}
fs.writeFileSync(OUT+'/scope.json',JSON.stringify(report,null,2)+'\n');
