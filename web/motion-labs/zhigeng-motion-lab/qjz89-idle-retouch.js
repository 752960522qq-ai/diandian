import * as THREE from 'three';

// Individually authored for zhigeng and QJZ89 idle only.
const correction = {"translation":[-0.014999999664723873,-0.014999999664723873,-0.004999999888241291],"rotation":[0.0,0.0,0.0,1.0],"pivot":"RightHand","boneDeltas":{"mixamorig:LeftArm":[-0.005093753803521395,0.020979152992367744,0.04268262907862663,0.998855471611023],"mixamorig:LeftForeArm":[-0.03522151708602905,-0.004436680115759373,0.030042510479688644,0.9989179968833923],"mixamorig:LeftHand":[0.04923251271247864,0.0021042227745056152,-0.07199043035507202,0.9961873888969421],"mixamorig:RightArm":[-0.0153989028185606,0.0017763676587492228,0.02051134966313839,0.9996694922447205],"mixamorig:RightForeArm":[-0.01674473285675049,-9.925663471221924e-05,0.0017106235027313232,0.9998583793640137],"mixamorig:RightHand":[0.04194328188896179,-0.0011002421379089355,-0.005725935101509094,0.9991030097007751]}};
export function applyZhigengQjzIdle(attachment, motion) {
  if (attachment.characterId !== 'zhigeng' || attachment.selectedWeapon !== 'qjz89' || motion !== 'QJZ89Idle' || !attachment.state.visible) return;
  const gun = attachment.weapons.get('qjz89'), state = attachment.state;
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
