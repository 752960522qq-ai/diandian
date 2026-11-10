import * as THREE from 'three';

// Individually authored for zhigeng and PF89 carry idle only.
const correction = {"translation":[0.014972846955060959,0.0,0.016118740662932396],"rotation":[0.0,0.0,0.0,1.0],"pivot":"RightHand","boneDeltas":{"mixamorig:LeftArm":[0.0025710470508784056,-0.002552718622609973,0.037065982818603516,0.999306321144104],"mixamorig:LeftForeArm":[0.00260239839553833,-0.0024512112140655518,-0.041108135133981705,0.9991483092308044],"mixamorig:LeftHand":[-0.017481854185461998,-0.00535541819408536,0.009621216915547848,0.9997866153717041],"mixamorig:RightArm":[0.012349577620625496,-0.0006184280500747263,-0.01271902211010456,0.9998427033424377],"mixamorig:RightForeArm":[0.024907588958740234,0.00029772520065307617,0.008233077824115753,0.9996558427810669],"mixamorig:RightHand":[-0.03493987396359444,0.006378927268087864,-0.025895673781633377,0.9990334510803223]}};
export function applyZhigengPf89Carry(attachment, motion) {
  if (attachment.characterId !== 'zhigeng' || attachment.selectedWeapon !== 'pf89' || motion !== 'RifleIdle' || !attachment.state.visible) return;
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
