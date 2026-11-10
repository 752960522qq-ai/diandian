import * as THREE from 'three';
// Linxu QCQ171 idle: only the separately reviewed left wrist.
const delta=[0.0034789759665727615,-0.0034010373055934906,0.06958649307489395,0.9975641369819641];
export function applyLinxuQcqLeftWrist(attachment,motion){
 if(attachment.characterId!=='linxu'||attachment.selectedWeapon!=='qcq171'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const bone=attachment.model.bones.get('mixamorig:LeftHand'),state=attachment.state;
 const palm=state.leftPalmWorld?bone.worldToLocal(new THREE.Vector3().fromArray(state.leftPalmWorld)):null;
 attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(delta).normalize(),1)).normalize();bone.updateMatrixWorld(true);
 if(palm){state.leftPalmWorld=bone.localToWorld(palm).toArray();if(state.supportTargetWorld&&state.leftContactErrorM!==null)
  state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));}
}
