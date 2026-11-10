import * as THREE from 'three';
// Military resistance Type 56 idle: one left-wrist adjustment.
const delta=[-0.0008250585524365306,-0.000675547809805721,0.06974828243255615,0.9975640773773193];
export function applyMilitary56Idle(attachment,motion){
 if(attachment.characterId!=='military'||attachment.selectedWeapon!=='type56_1'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const bone=attachment.model.bones.get('mixamorig:LeftHand'),state=attachment.state;
 const palm=state.leftPalmWorld?bone.worldToLocal(new THREE.Vector3().fromArray(state.leftPalmWorld)):null;
 attachment.saveBone(bone);
 bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(delta).normalize(),1)).normalize();
 bone.updateMatrixWorld(true);
 if(palm){state.leftPalmWorld=bone.localToWorld(palm).toArray();if(state.supportTargetWorld&&state.leftContactErrorM!==null)
  state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));}
}
