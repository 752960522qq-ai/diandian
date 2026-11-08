import fs from 'node:fs';import * as T from 'three';import {setupResistance} from './validate_resistance_r48.mjs';
const cfg=JSON.parse(fs.readFileSync('web/motion-labs/resistance-motion-lab/assets/weapon_attachment.json'));
const {rest_offset}=JSON.parse(fs.readFileSync('web/motion-labs/verification_r48/qcq171-run-contact-calibration.json'));
const baseline=structuredClone(cfg);baseline.characters.military.mounts.qcq171.motions.RifleRun.right_contact_offset_native=rest_offset;
const report={rows:[],failures:[],scope:{unchangedCharacter:'vest',changedCharacter:'military',changedWeapon:'qcq171',changedMotion:'RifleRun'}};
for(const cid of ['military','vest']){
 const before=await setupResistance(cid),after=await setupResistance(cid);before.attachment.config=baseline;before.attachment.character=baseline.characters[cid];
 const meshes=[];after.root.traverse(o=>{if(o.isSkinnedMesh){o.material=new T.MeshBasicMaterial({side:T.DoubleSide});meshes.push(o);}});
 const ray=new T.Raycaster(),fingerWeight=(mesh,i)=>{let v=0;for(let j=0;j<4;j++)if(/RightHand(?:Thumb\d+)?$/.test(mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i,j)].name))v+=mesh.geometry.attributes.skinWeight.getComponent(i,j);return v;};
 let unaffected=0,maxUnaffected=0,maxWeaponDifference=0,maxLeftArmDifference=0,maxRightHandRotationDifference=0;
 for(const wid of Object.keys(cfg.weapons))for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(wid==='type97hawk'?['ShotgunPump']:[])])for(const f of [0,.37,1]){
  const t=after.duration(motion,wid)*f;before.pose(motion,t,wid);after.pose(motion,t,wid);const changed=cid==='military'&&wid==='qcq171'&&motion==='RifleRun';
  for(const b of new Set(after.bones.values())){const old=before.bones.get(b.name);let err=Math.max(...b.matrixWorld.elements.map((v,i)=>Math.abs(v-old.matrixWorld.elements[i])));if(!changed)maxUnaffected=Math.max(maxUnaffected,err);else if(/Left(?:Shoulder|Arm|ForeArm|Hand)/.test(b.name))maxLeftArmDifference=Math.max(maxLeftArmDifference,err);}
  if(!changed)unaffected++;else{const a=after.attachment.weapons.get(wid),b=before.attachment.weapons.get(wid);maxWeaponDifference=Math.max(maxWeaponDifference,...a.matrixWorld.elements.map((v,i)=>Math.abs(v-b.matrixWorld.elements[i])));maxRightHandRotationDifference=Math.max(maxRightHandRotationDifference,T.MathUtils.radToDeg(after.bones.get('mixamorig:RightHand').getWorldQuaternion(new T.Quaternion()).normalize().angleTo(before.bones.get('mixamorig:RightHand').getWorldQuaternion(new T.Quaternion()).normalize())));}
 }
 report[cid]={unaffectedPoses:unaffected,maxUnaffectedMatrixDifference:maxUnaffected,maxWeaponDifference,maxLeftArmDifference,maxRightHandRotationDifference};if(maxUnaffected>1e-12||maxWeaponDifference>1e-12||maxLeftArmDifference>1e-12||maxRightHandRotationDifference>.00001)report.failures.push({cid,reason:'Scope drift'});
 if(cid!=='military')continue;
 let maxPalmGap=0,maxPenetration=0,misses=0,maxAnchorError=0;
 for(let i=0;i<=120;i++){
 const time=after.duration('RifleRun','qcq171')*i/120,state=after.pose('RifleRun',time,'qcq171'),gun=after.attachment.weapons.get('qcq171'),target=new T.Vector3().fromArray(state.rightSurfaceTargetWorld),inward=new T.Vector3(-1,0,0).applyQuaternion(gun.quaternion);
 for(const mesh of meshes){mesh.computeBoundingBox();mesh.computeBoundingSphere();}gun.traverse(o=>{if(o.isMesh)o.material=new T.MeshBasicMaterial({side:T.DoubleSide});});
 ray.set(target.clone().addScaledVector(inward,.035),inward.clone().negate());ray.far=.08;
 const hit=ray.intersectObjects(meshes,false).find(h=>h.face&&[h.face.a,h.face.b,h.face.c].every(v=>fingerWeight(h.object,v)>.9));
 if(!hit){misses++;continue;}const skinAlong=hit.point.clone().sub(target).dot(inward);ray.set(target.clone().addScaledVector(inward,-.1),inward);ray.far=.2;const gunHit=ray.intersectObject(gun,true)[0];if(!gunHit){misses++;continue;}const gunAlong=gunHit.point.clone().sub(target).dot(inward);maxPalmGap=Math.max(maxPalmGap,gunAlong-skinAlong);maxPenetration=Math.max(maxPenetration,skinAlong-gunAlong);maxAnchorError=Math.max(maxAnchorError,state.rightContactErrorM);report.rows.push({time,skinDistanceFromTargetM:skinAlong,gunDistanceFromTargetM:gunAlong,clearanceM:gunAlong-skinAlong});
 }
 report.surface={samples:121,misses,maxSurfaceGapM:maxPalmGap,maxMeasuredPenetrationM:maxPenetration,maxAnchorErrorM:maxAnchorError};if(misses||maxPenetration>.002||maxPalmGap>.004)report.failures.push({reason:'Contact surface outside 2mm penetration /4mm gap tolerance'});
}
fs.writeFileSync('web/motion-labs/verification_r48/qcq171-run-contact-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:report.rows.length},null,2));if(report.failures.length)process.exitCode=1;
