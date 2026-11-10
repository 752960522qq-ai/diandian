import * as THREE from 'three';
// Zhigeng's 97 shotgun pump: late left wrist only, authored for this rig in Blender.
const delta=[-0.017733091488480568,-0.0002955198579002172,-0.06746404618024826,0.9975641369819641], window=[0.34,0.4];
export function applyZhigeng97PumpWrist(attachment,motion,time){
 if(attachment.characterId!=='zhigeng'||attachment.selectedWeapon!=='type97hawk'||motion!=='ShotgunPump'||!attachment.state.visible)return;
 const x=THREE.MathUtils.clamp((time-window[0])/(window[1]-window[0]),0,1),weight=x*x*(3-2*x);if(weight===0)return;
 const state=attachment.state,hand=attachment.model.bones.get('mixamorig:LeftHand');
 const palm=state.leftPalmWorld?hand.worldToLocal(new THREE.Vector3().fromArray(state.leftPalmWorld)):null;
 attachment.saveBone(hand);hand.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(delta).normalize(),weight)).normalize();hand.updateMatrixWorld(true);
 if(palm){state.leftPalmWorld=hand.localToWorld(palm).toArray();if(state.supportTargetWorld&&state.leftContactErrorM!==null)
  state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));}
}
