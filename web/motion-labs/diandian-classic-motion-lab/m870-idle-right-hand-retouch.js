import * as THREE from 'three';

// Diandian's M870 idle only. Authored in Blender 4.3.2 from this rig's current pose.
// Settle the firing grip lower and bring the index finger toward the trigger area.
const deltas = {"mixamorig:RightArm":[-0.0025404691696166992,-0.0026800334453582764,0.00393068790435791,0.9999854564666748],"mixamorig:RightForeArm":[-0.017471639439463615,-0.00011003015970345587,0.0075233569368720055,0.9998190402984619],"mixamorig:RightHand":[-0.02847445197403431,-0.0008253566920757294,-0.0024164775386452675,0.9995913505554199]};

export function applyDiandianM870RightLower(attachment, motion) {
  if (attachment.characterId !== 'diandian' || attachment.selectedWeapon !== 'm870' || motion !== 'RifleIdle' || !attachment.state.visible) return;
  for (const [name, value] of Object.entries(deltas)) {
    const bone = attachment.model.bones.get(name);
    attachment.saveBone(bone);
    bone.quaternion.multiply(new THREE.Quaternion().fromArray(value).normalize()).normalize();
    bone.updateMatrixWorld(true);
  }
}
