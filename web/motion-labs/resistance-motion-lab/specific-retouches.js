import * as THREE from 'three';

// Blender-authored for military resistance, QSZ92 pistol firing only.
const deltas = {"mixamorig:LeftArm":[-0.015820303931832314,0.009995686821639538,-0.03988556191325188,0.9990290403366089],"mixamorig:LeftForeArm":[-0.030076321214437485,-0.004235058557242155,0.0056007676757872105,0.9995230436325073],"mixamorig:LeftHand":[0.05132468044757843,0.009293047711253166,0.032999202609062195,0.9980934858322144]};
export function applyMilitaryPistolFiring(attachment, motion) {
  if (attachment.characterId !== 'military' || attachment.selectedWeapon !== 'qsz92' || motion !== 'PistolShooting' || !attachment.state.visible) return;
  const hand = attachment.model.bones.get('mixamorig:LeftHand');
  const palm = attachment.state.leftPalmWorld ? hand.worldToLocal(new THREE.Vector3().fromArray(attachment.state.leftPalmWorld)) : null;
  for (const name of ['mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand']) {
    const bone = attachment.model.bones.get(name);
    attachment.saveBone(bone);
    bone.quaternion.multiply(new THREE.Quaternion().fromArray(deltas[name]).normalize()).normalize();
    bone.updateMatrixWorld(true);
  }
  if (palm) {
    attachment.state.leftPalmWorld = hand.localToWorld(palm).toArray();
    if (attachment.state.supportTargetWorld && attachment.state.leftContactErrorM !== null)
      attachment.state.leftContactErrorM = new THREE.Vector3().fromArray(attachment.state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(attachment.state.supportTargetWorld));
  }
}
