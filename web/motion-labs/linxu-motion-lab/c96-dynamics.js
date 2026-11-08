import * as THREE from 'three';

// Torso heading frame: anatomical right projected onto the ground plane.
// Preserve turning with the body, while the arms can absorb vertical torso sway.
// Recomputed each frame; there is no history or pose drift.
export function c96BodyQuaternion(attachment) {
  const p = name => attachment.bones[name].getWorldPosition(new THREE.Vector3());
  const right = p('RightArm').sub(p('LeftArm'));
  right.y = 0;
  right.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const back = new THREE.Vector3().crossVectors(right, up).normalize();
  up.crossVectors(back, right).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back)).normalize();
}

const smootherstep = value => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

// Call immediately after source gunRotation is composed and before shoulder contact.
// It only changes the gun orientation. The existing IK then follows both grips.
export function refineC96Rotation(attachment, rotation, motion, time) {
  if (attachment.selectedWeapon !== 'c96') return rotation;
  const config = attachment.character.mounts.c96.motion_refinement;
  if (!config) return rotation;
  if (motion === 'RifleRun' && config.run_reference_body_xyzw) {
    const reference = c96BodyQuaternion(attachment).multiply(new THREE.Quaternion().fromArray(config.run_reference_body_xyzw).normalize());
    rotation.slerp(reference, THREE.MathUtils.clamp(config.run_stabilization ?? .35, 0, 1)).normalize();
  }
  if (motion === 'FiringRifle') {
    const duration = config.fire_duration_s ?? 0.26666666666666666;
    const peak = config.fire_peak_s ?? .05;
    const t = THREE.MathUtils.clamp(time, 0, duration);
    // Both intervals meet with zero first and second derivatives at the peak.
    // The same C2 endpoint conditions hold at the start and end of the loop.
    const envelope = t <= peak ? smootherstep(t / peak) : 1 - smootherstep((t - peak) / (duration - peak));
    rotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(config.fire_recoil_degrees ?? 1.8) * envelope)).normalize();
  }
  return rotation;
}
