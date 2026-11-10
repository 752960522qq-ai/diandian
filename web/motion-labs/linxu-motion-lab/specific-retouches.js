import * as THREE from 'three';

// Authored separately for Linxu's two reported stock-to-shoulder poses.
const adjustments = {"qbz95-FiringRifle":{"translation":[0.015359999611973763,-0.018379999324679375,-0.007160000037401915],"boneDeltas":{"mixamorig:LeftArm":[0.031322840601205826,0.00016084314847830683,0.0398176945745945,0.9987159967422485],"mixamorig:LeftForeArm":[-0.03779632970690727,-0.010895161889493465,-0.05404263734817505,0.9977635741233826],"mixamorig:LeftHand":[0.005535066593438387,-0.009268448688089848,-0.013012217357754707,0.9998570680618286],"mixamorig:RightArm":[0.0066014910116791725,-0.007514328695833683,0.02629305049777031,0.999604344367981],"mixamorig:RightForeArm":[0.04761744290590286,0.006475926376879215,-0.0011561663122847676,0.9988440275192261],"mixamorig:RightHand":[-0.02680904045701027,0.015070559456944466,-0.02677995339035988,0.9991681575775146]}},"type97hawk-ShotgunPump":{"translation":[0.00506999995559454,-0.007590000052005053,0.004900000058114529],"boneDeltas":{"mixamorig:LeftArm":[0.0010516195325180888,-0.0002909302420448512,0.0033906246535480022,0.9999936819076538],"mixamorig:LeftForeArm":[0.015031784772872925,0.0029308274388313293,0.004372656345367432,0.999873161315918],"mixamorig:LeftHand":[-0.0064101070165634155,0.01400025188922882,0.011334583163261414,0.9998172521591187],"mixamorig:RightArm":[0.0015726238489151,-0.00266912579536438,-0.0019070208072662354,0.9999933838844299],"mixamorig:RightForeArm":[0.0024993279948830605,0.0039191716350615025,0.019268184900283813,0.9998036026954651],"mixamorig:RightHand":[0.004935354460030794,0.013164104893803596,-0.01613125391304493,0.9997710585594177]}}};

export function applyLinxuStockCorrections(attachment, motion) {
  if (attachment.characterId !== 'linxu' || !attachment.state.visible) return;
  const correction = adjustments[`${attachment.selectedWeapon}-${motion}`];
  if (!correction) return;
  const gun = attachment.weapons.get(attachment.selectedWeapon);
  const state = attachment.state;
  const left = attachment.model.bones.get('mixamorig:LeftHand');
  const right = attachment.model.bones.get('mixamorig:RightHand');
  // Keep the diagnostic contact points in sync with the exact adjusted pose.
  const localPoint = (object, world) => world ? object.worldToLocal(new THREE.Vector3().fromArray(world)) : null;
  const leftPalm = localPoint(left, state.leftPalmWorld);
  const rightPalm = localPoint(right, state.rightPalmWorld);
  const support = localPoint(gun, state.supportTargetWorld);
  const rightTarget = localPoint(gun, state.rightSurfaceTargetWorld);

  gun.position.add(new THREE.Vector3().fromArray(correction.translation));
  gun.updateMatrixWorld(true);
  const depth = bone => { let n = 0; for (let p = bone; p; p = p.parent) n++; return n; };
  const bones = Object.entries(correction.boneDeltas).map(([name,q]) => [attachment.model.bones.get(name),q]);
  bones.sort((a,b) => depth(a[0]) - depth(b[0]));
  for (const [bone, value] of bones) {
    attachment.saveBone(bone);
    bone.quaternion.multiply(new THREE.Quaternion().fromArray(value).normalize()).normalize();
    bone.updateMatrixWorld(true);
  }
  state.weaponPosition = gun.position.toArray();
  state.weaponQuaternion = gun.quaternion.toArray();
  if (leftPalm) state.leftPalmWorld = left.localToWorld(leftPalm).toArray();
  if (rightPalm) state.rightPalmWorld = right.localToWorld(rightPalm).toArray();
  if (support) state.supportTargetWorld = gun.localToWorld(support).toArray();
  if (rightTarget) state.rightSurfaceTargetWorld = gun.localToWorld(rightTarget).toArray();
  if (state.leftPalmWorld && state.supportTargetWorld && state.leftContactErrorM !== null)
    state.leftContactErrorM = new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));
  if (state.rightPalmWorld && state.rightSurfaceTargetWorld && state.rightContactErrorM !== null)
    state.rightContactErrorM = new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));
}
