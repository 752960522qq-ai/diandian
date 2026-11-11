import * as THREE from 'three';

// Individually authored for zhigeng and QJZ89 idle only.
const correction = {"translation":[-0.014999999664723873,-0.014999999664723873,-0.004999999888241291],"rotation":[0.0,0.0,0.0,1.0],"pivot":"RightHand","boneDeltas":{"mixamorig:LeftArm":[0.016824694350361824,0.02968931943178177,0.11699409037828445,0.9925462603569031],"mixamorig:LeftForeArm":[-0.11789657920598984,-0.021212341263890266,0.03800073266029358,0.992071807384491],"mixamorig:LeftHand":[0.12869268655776978,-0.049350932240486145,-0.16588200628757477,0.9764660596847534],"mixamorig:RightArm":[-0.0153989028185606,0.0017763676587492228,0.02051134966313839,0.9996694922447205],"mixamorig:RightForeArm":[-0.01674473285675049,-9.925663471221924e-05,0.0017106235027313232,0.9998583793640137],"mixamorig:RightHand":[0.04194328188896179,-0.0011002421379089355,-0.005725935101509094,0.9991030097007751],"mixamorig:LeftHandIndex1":[-0.06439034640789032,-0.010230514220893383,-0.0037037143483757973,0.9978655576705933],"mixamorig:LeftHandIndex2":[-0.06465838104486465,-0.002988368971273303,-0.008940348401665688,0.9978629350662231],"mixamorig:LeftHandIndex3":[-0.0644235759973526,8.821489609545097e-05,-0.010955099016427994,0.9978625178337097],"mixamorig:LeftHandMiddle1":[-0.03363039344549179,-0.024509137496352196,-0.017724160104990005,0.9989765882492065],"mixamorig:LeftHandMiddle2":[-0.04045484587550163,-0.0058006043545901775,-0.03327343985438347,0.9986103773117065],"mixamorig:LeftHandMiddle3":[-0.04905456677079201,-4.44948673248291e-05,-0.04323906823992729,0.9978597164154053],"mixamorig:LeftHandThumb1":[-0.021942734718322754,-0.0009139776229858398,-0.01887117326259613,0.9995806813240051],"mixamorig:LeftHandThumb2":[-0.024078810587525368,0.002134055597707629,-0.036245983093976974,0.9990506172180176],"mixamorig:LeftHandThumb3":[-0.022698746994137764,5.780161154689267e-05,-0.03715360537171364,0.9990517497062683]}};
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
