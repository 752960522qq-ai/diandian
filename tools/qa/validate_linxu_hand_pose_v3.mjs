// Validate executed runtime wrist/finger rotations, not just payload samples.
import fs from 'node:fs';import * as T from 'three';
import {setup}from './validate_pf89.mjs';import{setupLinxu}from './validate_linxu_motion.mjs';
const src=await setup('diandian'),dst=await setupLinxu('linxu'),cal=JSON.parse(fs.readFileSync('assets/characters/linxu_motion/retarget_calibration.json'));
const Q=a=>new T.Quaternion().fromArray(a),rows=[];let failures=[];
for(const weapon of Object.keys(dst.attachment.config.weapons))for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(weapon==='type97hawk'?['ShotgunPump']:[])]){
 const row={weapon,motion,samples:121,maxRightHandDegrees:0,maxLeftHandDegrees:0,maxRightFingerDegrees:0,maxLeftFingerDegrees:0,leftReleased:motion==='Reloading'};
 for(let i=0;i<=120;i++){
  const time=dst.duration(motion,weapon)*i/120;src.pose(motion,time,weapon);dst.pose(motion,time,weapon);
  const si=src.attachment.weapons.get(weapon).getWorldQuaternion(new T.Quaternion()).invert(),di=dst.attachment.weapons.get(weapon).getWorldQuaternion(new T.Quaternion()).invert();
  for(const side of ['Right','Left']){
   if(side==='Left'&&row.leftReleased)continue;
   const hand='mixamorig:'+side+'Hand',keys=[hand,...['Thumb','Index','Middle','Ring','Pinky'].flatMap(d=>[1,2,3].map(j=>hand+d+j))];
   for(const n of keys){const a=src.model.bones.get(n),b=dst.bones.get(n),c=Q(cal.bones[n].source_to_target_local_rotation);let expected,actual;
    if(n===hand){expected=si.clone().multiply(a.getWorldQuaternion(new T.Quaternion())).multiply(c.invert());actual=di.clone().multiply(b.getWorldQuaternion(new T.Quaternion()));}
    else{const pn=a.parent.userData.name||a.parent.name;expected=Q(cal.bones[pn].source_to_target_local_rotation).multiply(a.quaternion).multiply(c.invert());actual=b.quaternion;}
    const k=`max${side}${n===hand?'Hand':'Finger'}Degrees`;row[k]=Math.max(row[k],T.MathUtils.radToDeg(expected.angleTo(actual)));
   }
  }
 }
 // Key reduction was verified at 60Hz; 121 uniform phase samples may fall
 // between those keys. Permit 1 degree, rather than confusing sample tolerance with continuous bound.
 if(Object.entries(row).some(([k,v])=>k.startsWith('max')&&v>1))failures.push(row);
 rows.push(row);
}
const report={rows,failures,limitations:['Source-matched rotations do not prove exact fingertip-to-trigger contact or continuous mesh collision freedom.','Released reload left hand retains original arm animation; it is not forcibly locked to the gun.']};
fs.writeFileSync('web/motion-labs/verification_linxu_v3/hand-pose-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,failures,maxDegrees:Math.max(...rows.flatMap(r=>Object.entries(r).filter(([k])=>k.startsWith('max')).map(([,v])=>v)))},null,2));process.exitCode=failures.length?1:0;
