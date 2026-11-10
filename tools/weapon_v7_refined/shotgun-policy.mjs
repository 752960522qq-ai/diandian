import * as T from 'three';
import {repositionWrist} from './pose-utils.mjs';
export const SHOULDER_MOTIONS=new Set(['RifleAimingIdle','ShotgunAimLevel','ShotgunAimUp','ShotgunAimDown','FiringRifle','ShotgunPump']);
export const SHOTGUN_SHIFT_M={linxu:.035,military:.035,vest:.035};
export function configureShotgunSource(c,weapon,motion,originalMount){
 c.src.cfg.characters.diandian.mounts.winchester1897.re4_mount={...originalMount};
 if(weapon==='m870'&&SHOULDER_MOTIONS.has(motion))Object.assign(c.src.cfg.characters.diandian.mounts.winchester1897.re4_mount,{support_forearm_twist_weight:0,support_upper_arm_twist_weight:0});
}
export function applyShotgunFit({bones,gun,cid,weapon,motion}){
 if(weapon!=='m870'||!SHOULDER_MOTIONS.has(motion))return {active:false};
 // Lower the original gun/hand trajectory 35 mm, retaining its pitch, recoil,
 // pump phase and all body tracks. Two-bone swing retains the source elbow plane
 // and each hand's world orientation; no axial wrist/finger contact forcing.
 const delta=new T.Vector3(0,-SHOTGUN_SHIFT_M[cid],0),errors=[];
 for(const side of ['Right','Left']){
  const hand=bones.get('mixamorig:'+side+'Hand'),target=hand.getWorldPosition(new T.Vector3()).add(delta);
  errors.push(repositionWrist(bones,side,target));
 }
 gun.position.add(delta);gun.updateMatrixWorld(true);
 return {active:true,dropM:-delta.y,maxWristReachErrorM:Math.max(...errors)};
}
