import * as THREE from 'three';

// Individually authored for diandian and PF89 carry idle only.
const correction = {"translation":[0.01361168548464775,0.0,0.014653395861387253],"rotation":[0.0,2.980232594040899e-08,0.0,1.0],"pivot":"RightHand","boneDeltas":{"mixamorig:LeftArm":[0.0005162953748367727,-0.002364381914958358,0.03444593772292137,0.9994036555290222],"mixamorig:LeftForeArm":[0.0028308408800512552,-0.0005253851995803416,-0.03565208241343498,0.999360203742981],"mixamorig:LeftHand":[-0.016220247372984886,-0.005766205955296755,0.005963004194200039,0.9998340606689453],"mixamorig:RightArm":[0.01544426754117012,-0.0004283712478354573,0.000724544923286885,0.9998804330825806],"mixamorig:RightForeArm":[0.0044998228549957275,0.0002827495336532593,0.02165873348712921,0.9997552633285522],"mixamorig:RightHand":[0.006711214780807495,0.004030942916870117,-0.036752477288246155,0.9992938041687012]}};
export function applyDiandianPf89Carry(attachment, motion) {
  if (attachment.characterId !== 'diandian' || attachment.selectedWeapon !== 'pf89' || motion !== 'RifleIdle' || !attachment.state.visible) return;
  const gun = attachment.weapons.get('pf89'), state = attachment.state;
  const left = attachment.model.bones.get('mixamorig:LeftHand');
  const right = attachment.model.bones.get('mixamorig:RightHand');
  const localPoint = (object, world) => world ? object.worldToLocal(new THREE.Vector3().fromArray(world)) : null;
  const leftPalm = localPoint(left, state.leftPalmWorld), rightPalm = localPoint(right, state.rightPalmWorld);
  const support = localPoint(gun, state.supportTargetWorld), rightTarget = localPoint(gun, state.rightSurfaceTargetWorld);
  const pivot = attachment.model.bones.get('mixamorig:' + correction.pivot).getWorldPosition(new THREE.Vector3());
  const local = new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(correction.rotation).normalize(), 1);
  const original = gun.quaternion.clone(), world = original.clone().multiply(local).multiply(original.clone().invert());
  gun.position.sub(pivot).applyQuaternion(world).add(pivot).addScaledVector(new THREE.Vector3().fromArray(correction.translation), 1);
  gun.quaternion.multiply(local).normalize();gun.updateMatrixWorld(true);
  const depth = bone => {let n = 0; for (let p = bone; p; p = p.parent) n++; return n;};
  const bones = Object.entries(correction.boneDeltas).map(([name,q]) => [attachment.model.bones.get(name),q]);
  bones.sort((a,b) => depth(a[0]) - depth(b[0]));
  for (const [bone,value] of bones) {
    attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(value).normalize(),1)).normalize();bone.updateMatrixWorld(true);
  }
  state.weaponPosition=gun.position.toArray();state.weaponQuaternion=gun.quaternion.toArray();
  if(leftPalm)state.leftPalmWorld=left.localToWorld(leftPalm).toArray();
  if(rightPalm)state.rightPalmWorld=right.localToWorld(rightPalm).toArray();
  if(support)state.supportTargetWorld=gun.localToWorld(support).toArray();
  if(rightTarget)state.rightSurfaceTargetWorld=gun.localToWorld(rightTarget).toArray();
  if(state.leftPalmWorld && state.supportTargetWorld && state.leftContactErrorM !== null)
    state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));
  if(state.rightPalmWorld && state.rightSurfaceTargetWorld && state.rightContactErrorM !== null)
    state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));
}
