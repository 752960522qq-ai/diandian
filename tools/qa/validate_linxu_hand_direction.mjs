import fs from 'node:fs';
import * as T from 'three';
import {setupLinxu} from './validate_linxu_motion.mjs';
const report={characters:{},failures:[]};
for(const cid of ['linxu']){
 const m=await setupLinxu(cid),rows=[];
 const p=n=>m.bones.get('mixamorig:RightHand'+n).getWorldPosition(new T.Vector3());
 for(const weapon of ['qbz95','type56_1','qbu85','type97hawk','qcq171']){
  let minAcross=1,minForward=1,minPalm=1,maxIndexErrorM=0;
  for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(weapon==='type97hawk'?['ShotgunPump']:[])])for(let i=0;i<=20;i++){
   const state=m.pose(motion,m.duration(motion,weapon)*i/20,weapon);maxIndexErrorM=Math.max(maxIndexErrorM,state.indexTargetErrorM||0);
   const gun=m.attachment.weapons.get(weapon),inverse=gun.getWorldQuaternion(new T.Quaternion()).invert();
   const across=p('Index1').sub(p('Pinky1')).normalize().applyQuaternion(inverse),forward=p('Middle1').sub(p('')).normalize().applyQuaternion(inverse),palm=new T.Vector3().crossVectors(across,forward).normalize();
   const gripUp=new T.Vector3().fromArray(m.attachment.config.weapons[weapon].right_grip_axis||[0,.9,-.4]).normalize(),inward=new T.Vector3(-1,0,0),towardTrigger=new T.Vector3().crossVectors(inward,gripUp).normalize();
   // Finger roots form an oblique row on the actual rig; compare its transverse component.
   across.addScaledVector(forward,-across.dot(forward)).normalize();
   minAcross=Math.min(minAcross,across.dot(gripUp));minForward=Math.min(minForward,forward.dot(towardTrigger));minPalm=Math.min(minPalm,palm.dot(inward));
  }
  const row={weapon,minIndexToPinkyAlongGrip:minAcross,minWristToKnucklesTowardTrigger:minForward,minPalmFacingGrip:minPalm,maxIndexErrorM};rows.push(row);
  // A 90-degree frame mixup passes contact-anchor tests but fails this test.
  if(minAcross<.97||minForward<.99||minPalm<.99||maxIndexErrorM>.003)report.failures.push({cid,...row});
 }
 report.characters[cid]=rows;
}
fs.writeFileSync('web/motion-labs/verification_linxu/hand-direction-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=report.failures.length?1:0;
