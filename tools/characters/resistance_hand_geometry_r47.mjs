import * as T from 'three';
import {read} from '../qa/validate_pf89.mjs';
const V=a=>new T.Vector3().fromArray(a),Q=a=>new T.Quaternion().fromArray(a).normalize();
function frame(long,normal){const y=long.clone().normalize(),z=normal.clone().addScaledVector(y,-normal.dot(y)).normalize(),x=new T.Vector3().crossVectors(y,z).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));}
export async function measureHands(file){
 const root=(await read(file)).scene;root.updateMatrixWorld(true);const bones={};root.traverse(o=>{if(o.isBone)bones[o.userData.name||o.name]=o;if(o.isMesh)o.material=new T.MeshBasicMaterial({side:T.DoubleSide});});
 const result={};for(const side of ['Right','Left']){
  const get=n=>bones['mixamorig:'+side+'Hand'+n],hand=get(''),p=hand.getWorldPosition(new T.Vector3()),long=get('Middle1').getWorldPosition(new T.Vector3()).sub(p).normalize();
  const across=get('Index1').getWorldPosition(new T.Vector3()).sub(get('Pinky1').getWorldPosition(new T.Vector3())).normalize(),normal=new T.Vector3().crossVectors(across,long).normalize(),f=frame(long,normal),inward=normal.clone().multiplyScalar(side==='Right'?1:-1);
  const center=['Index1','Middle1','Ring1'].reduce((v,n)=>v.add(get(n).getWorldPosition(new T.Vector3())),new T.Vector3()).multiplyScalar(1/3).lerp(p,.35);
  const ray=new T.Raycaster(center.clone().addScaledVector(inward,.06),inward.clone().negate());const hits=ray.intersectObject(root,true).filter(h=>h.point.distanceTo(center)<.035);
  if(!hits.length)throw Error('No palm surface '+side);
  const contact=hits[0].point.clone();
  const handQ=hand.getWorldQuaternion(new T.Quaternion()),fingers={};
  for(const digit of ['Thumb','Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++){
   const b=get(digit+j),child=get(digit+(j+1));const axis=new T.Vector3().crossVectors(child.position.clone().normalize(),inward.clone().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert())).normalize();
   fingers[side+'Hand'+digit+j]={rest:b.quaternion.toArray(),curlAxis:axis.toArray()};
  }
  result[side]={contact:hand.worldToLocal(contact).toArray(),center:hand.worldToLocal(center).toArray(),surfaceOffsetM:hits[0].point.distanceTo(center.clone().applyMatrix4(hand.matrixWorld)),frame:f.toArray(),restWorld:handQ.toArray(),fingers};
 }
 return result;
}
function fingerPose(hand,side){
 const result={};for(const [n,b]of Object.entries(hand.fingers)){
  const digit=n.match(/Hand(\w+)[123]$/)[1],j=+n.at(-1)-1;
  const angles=side==='Left'?(digit==='Thumb'?[5,25,25]:[25,60,40]):(digit==='Thumb'?[12,25,20]:digit==='Index'?[5,15,15]:[50,65,40]);
  result[n]=Q(b.rest).multiply(new T.Quaternion().setFromAxisAngle(V(b.curlAxis),T.MathUtils.degToRad(angles[j]))).toArray();
 }return result;
}
export async function calibrateGrips(char,weapons,hands,weaponDir){
 for(const [id,data]of Object.entries(weapons)){
  const gun=(await read(`${weaponDir}/${id}.glb`)).scene;gun.updateMatrixWorld(true);gun.traverse(o=>{if(o.isMesh)o.material=new T.MeshBasicMaterial({side:T.DoubleSide});});const ray=new T.Raycaster();
  const leftZ=id==='qbu85'?.06:data.left_grip[2],leftX=id==='qbu85'?-.005:0;
  ray.set(new T.Vector3(leftX,-.35,leftZ),new T.Vector3(0,1,0));const underside=ray.intersectObject(gun,true)[0];if(!underside)throw Error('No handguard surface '+id);
  const leftGrip=underside.point.clone().add(new T.Vector3(0,-.0015,0)).toArray();
  const rightYZ=id==='qbu85'?[-.075,.37]:[data.right_grip[1],data.right_grip[2]];
  ray.set(new T.Vector3(.3,...rightYZ),new T.Vector3(-1,0,0));const grip=ray.intersectObject(gun,true)[0];if(!grip)throw Error('No pistol grip surface '+id);
  const rightGrip=grip.point.clone().add(new T.Vector3(.0015,0,0)).toArray();
  const thumbTargets={};
  for(const [side,y,z] of [['Left',underside.point.y+.025,leftZ-.028],['Right',rightYZ[0]+.025,rightYZ[1]-.012]]) {
   ray.set(new T.Vector3(-.3,y,z),new T.Vector3(1,0,0));
   const hit=ray.intersectObject(gun,true)[0];
   if(hit)thumbTargets[side]=hit.point.clone().add(new T.Vector3(-.005,0,0)).toArray();
  }
  const gripUp=V(data.right_grip_axis||[0,.9,-.4]).normalize();
  const palmInward=new T.Vector3(-1,0,0);
  // Index-to-pinky runs along the grip. Wrist-to-knuckles crosses it toward
  // the trigger: these are perpendicular anatomical directions, not the same axis.
  const fingerForward=new T.Vector3().crossVectors(palmInward,gripUp).normalize();
  const rq=frame(fingerForward,palmInward).multiply(Q(hands.Right.frame).invert()).multiply(Q(hands.Right.restWorld));
  const lq=frame(new T.Vector3(1,0,0),new T.Vector3(0,-1,0)).multiply(Q(hands.Left.frame).invert()).multiply(Q(hands.Left.restWorld));
  const base=char.mounts[id];
  for(const m of [base,...Object.values(base.motions)]){
   if(m.right_hand_quaternion_offset)m.quaternion_xyzw=Q(m.right_hand_quaternion_offset).multiply(Q(m.quaternion_xyzw)).toArray();
   delete m.right_hand_quaternion_offset;
   for(const k of Object.keys(m))if(/finger_|twist_|elbow_|right_hand_shift|weapon_offset/.test(k))delete m[k];
   m.right_grip=rightGrip;m.right_palm_target_weapon=rightGrip;m.left_grip=leftGrip;
   m.right_hand_quaternion_weapon=rq.toArray();m.left_hand_quaternion_weapon=lq.toArray();
   m.right_finger_local_quaternions=fingerPose(hands.Right,'Right');m.support_finger_local_quaternions=fingerPose(hands.Left,'Left');
   m.right_index_target_weapon=V(data.trigger).add(new T.Vector3(.008,.005,0)).toArray();
   m.right_finger_pose_weight=1;m.support_finger_pose_weight=1;m.trigger_finger_ik=false;
   m.right_thumb_target_weapon=thumbTargets.Right;m.left_thumb_target_weapon=thumbTargets.Left;
   m.right_forearm_twist_weight=.55;m.right_upper_arm_twist_weight=.12;
   m.support_forearm_twist_weight=.55;m.support_upper_arm_twist_weight=.12;
   m.support_elbow_from_hand_weight=.25;m.support_elbow_outward_weight=.15;
  }
  char.mounts[id].measured_surfaces={rightGrip,leftGrip,right_skin_gap_m:.0015,left_skin_gap_m:.0015};
  for(const motion of ['RifleIdle','RifleWalk','RifleRun']) {
   // Clear the male rigs' rigid chest pouches while preserving the authored
   // carry motion. Both arms follow the same physical weapon displacement.
   base.motions[motion].weapon_offset_body_m=[0,0,id==='qbu85'?.11:.075];
  }
  if(id==='qbu85') {
   // Correct palm orientation puts the wrist behind the grip. Pitch the
   // long rifle upward in carry so its fore-end stays within both arms' reach.
   for(const [motion,pitch] of [['RifleIdle',20],['RifleWalk',40]]) {
    const mount=base.motions[motion];
    mount.quaternion_xyzw=Q(mount.quaternion_xyzw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.degToRad(pitch))).toArray();
    mount.weapon_offset_body_m=[0,.03,.095];
   }
  }
  if(id==='qcq171')base.motions.RifleWalk.weapon_offset_body_m=[0,0,.165];
  if(id==='type56_1')base.motions.RifleWalk.weapon_offset_body_m=[0,0,.09];
 }
}
