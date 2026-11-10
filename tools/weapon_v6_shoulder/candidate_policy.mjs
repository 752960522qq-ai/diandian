/**
 * Linxu M870 running only: keep the authored RifleRun support wrist orientation
 * and its normal analytic reach, instead of imposing the old M97 grip-frame
 * orientation and redistributing that mismatch into humeral/forearm axial roll.
 * This deliberately accepts the original motion's small contact imperfections.
 * No mesh, bind pose, weights, bone lengths, shoulder, body or timing edits.
 * Call once on the source returned by tools/weapon_v6_three/candidate.mjs,
 * before sampling; this module does not modify production files.
 */
export function applyLinxuM870RunPolicy(candidate) {
  if (candidate.cid !== 'linxu') return false;
  const mount = candidate.src.cfg.characters.diandian.mounts.winchester1897;
  Object.assign(mount.motions.RifleRun, {
    left_hand_quaternion_weapon: null,
    support_forearm_twist_weight: 0,
    support_upper_arm_twist_weight: 0,
  });
  return true;
}
