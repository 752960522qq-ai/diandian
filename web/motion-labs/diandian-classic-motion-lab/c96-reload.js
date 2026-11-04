import * as THREE from 'three';

// The supplied C96 is a fixed-magazine Red 9 with a wooden shoulder stock.
// Its receiver, magazine and bolt are a single static mesh. The action uses
// the visible top-loading area; it never animates an invented detachable part.
const clamp01 = x => THREE.MathUtils.clamp(x, 0, 1);
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const range = (x, a, b) => smooth((x - a) / (b - a));
const v = x => new THREE.Vector3().fromArray(x);
const q = x => new THREE.Quaternion().fromArray(x).normalize();
function bodyFrame(a) {
  const right = a.bones.RightArm.getWorldPosition(new THREE.Vector3()).sub(a.bones.LeftArm.getWorldPosition(new THREE.Vector3())).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  right.y = 0; right.normalize();
  const front = new THREE.Vector3().crossVectors(up, right).normalize();
  up.crossVectors(right, front).normalize();
  return {right, up, front};
}
function phase(a, time) {
  const action = a.model.actions?.get('Reloading');
  return clamp01(time / (action?.getClip().duration || 3.3));
}

// Call after initial placement and body offset, before gun.updateMatrixWorld and
// the firing-hand IK. Mutates the shared gunRotation used by the rest of update.
export function prepareC96ReloadPose(a, gun, gunRotation, mount, time) {
  const u = phase(a, time);
  const presentation = range(u, .06, .23) * (1 - range(u, .73, .9));
  const {right, up, front} = bodyFrame(a);
  const data = a.config.weapons.c96;
  const grip = v(mount.right_grip || data.right_grip).multiplyScalar(mount.model_scale ?? 1);
  const oldContact = grip.clone().applyQuaternion(gunRotation).add(gun.position);
  const sourceForward = v(data.barrel_forward || [0, 0, -1]).applyQuaternion(gunRotation);
  const horizontal = sourceForward.clone().addScaledVector(up, -sourceForward.dot(up));
  if (horizontal.lengthSq() < .01) horizontal.copy(front);
  horizontal.normalize();
  // Keep the receiver at chest level, presented toward the supporting hand.
  const forward = horizontal.multiplyScalar(Math.cos(THREE.MathUtils.degToRad(28))).addScaledVector(up, Math.sin(THREE.MathUtils.degToRad(28)));
  const gunRight = new THREE.Vector3().crossVectors(forward, up).normalize();
  const gunUp = new THREE.Vector3().crossVectors(gunRight, forward).normalize();
  const presented = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(gunRight, gunUp, forward.clone().negate()));
  presented.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(10)));
  gunRotation.slerp(presented, presentation).normalize();
  oldContact.addScaledVector(right, .015 * presentation).addScaledVector(up, -.075 * presentation).addScaledVector(front, .04 * presentation);
  gun.quaternion.copy(gunRotation);
  gun.position.copy(oldContact).sub(grip.applyQuaternion(gunRotation));
  a.state.c96ReloadPhase = u;
}

// Solve the supporting hand on a deterministic timeline. The source torso,
// feet and weight shift keep playing, while the hand reaches the actual receiver.
// Return true only when handled. Call instead of the normal support-hand block.
export function applyC96ReloadSupport(a, gun, gunRotation, mount, time, leftOffset) {
  const u = phase(a, time);
  const data = a.config.weapons.c96;
  const {right, up, front} = bodyFrame(a);
  // This source clip starts and finishes in the raised aiming stance.
  const ready = a.mountFor('c96', 'RifleAimingIdle');
  const supportLocal = v(ready.left_grip || data.left_grip);
  const supportRotation = gunRotation.clone().multiply(q(ready.left_hand_quaternion_weapon));
  const handForward = a.model.bones.get('mixamorig:LeftHandMiddle1').position.clone().normalize();
  const handAcross = a.model.bones.get('mixamorig:LeftHandIndex1').position.clone().sub(a.model.bones.get('mixamorig:LeftHandPinky1').position);
  handAcross.addScaledVector(handForward, -handAcross.dot(handForward)).normalize();
  const handNormal = new THREE.Vector3().crossVectors(handAcross, handForward).normalize();
  const targetForward = new THREE.Vector3(0, -.15, -1).normalize();
  const targetAcross = new THREE.Vector3(1, 0, 0);
  const targetNormal = new THREE.Vector3().crossVectors(targetAcross, targetForward).normalize();
  const feedLocal = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(targetAcross, targetForward, targetNormal).multiply(new THREE.Matrix4().makeBasis(handAcross, handForward, handNormal).invert()));
  const feedRotation = gunRotation.clone().multiply(feedLocal);
  // At the belt, keep the fingers down and the palm toward the body instead
  // of inheriting the source rifle reload's turned-over hand.
  const retrieveForward = up.clone().multiplyScalar(-.94).addScaledVector(front, .34).normalize();
  const retrieveAcross = front.clone().addScaledVector(retrieveForward, -front.dot(retrieveForward)).normalize();
  const retrieveNormal = new THREE.Vector3().crossVectors(retrieveAcross, retrieveForward).normalize();
  const retrieveRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(retrieveAcross, retrieveForward, retrieveNormal).multiply(new THREE.Matrix4().makeBasis(handAcross, handForward, handNormal).invert()));
  const belt = a.model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3())
    .addScaledVector(right, -.16).addScaledVector(up, .06).addScaledVector(front, .12);
  const local = xyz => gun.localToWorld(v(xyz));
  const support = gun.localToWorld(supportLocal.clone());
  // Palm centers, in calibrated gun metres. The pressing thumb/fingertips sit
  // below the palm at the top-loading port around [0, .02, .025].
  const keys = [
    {t:0, p:support, q:supportRotation},
    {t:.09, p:local(supportLocal.clone().add(v([-.035,-.04,.015])).toArray()), q:supportRotation},
    {t:.26, p:belt, q:retrieveRotation},
    {t:.34, p:belt.clone().addScaledVector(up,.02), q:retrieveRotation},
    {t:.48, p:local([-.045,.135,.025]), q:feedRotation},
    {t:.55, p:local([-.015,.085,.025]), q:feedRotation},
    {t:.64, p:local([-.015,.052,.025]), q:feedRotation},
    {t:.7, p:local([-.025,.1,.025]), q:feedRotation},
    {t:.79, p:local([-.075,.015,-.01]), q:feedRotation},
    {t:.9, p:support, q:supportRotation},
    {t:1, p:support, q:supportRotation}
  ];
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1].t) i++;
  const alpha = smooth((u - keys[i].t) / (keys[i + 1].t - keys[i].t));
  const target = keys[i].p.clone().lerp(keys[i+1].p, alpha);
  const rotation = keys[i].q.clone().slerp(keys[i+1].q, alpha).normalize();
  const wristTravel = 1;
  const sourceArm = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand'].map(name => [a.bones[name], a.bones[name].quaternion.clone()]);
  const solve = () => {
    for (const [bone, source] of sourceArm) bone.quaternion.copy(source);
    a.bones.LeftShoulder.updateMatrixWorld(true);
    a.state.shoulderAssistDegrees = 0;
    const wrist = target.clone().sub(leftOffset.clone().applyQuaternion(rotation));
    a.solveArm('Left', wrist, rotation, 1, -2, .7, 0, .35, 0, 0);
  };
  solve();
  // Let the wrist follow the forearm instead of turning through a folded
  // pose between two grip orientations. Keep the calibrated palm target
  // fixed and solve from the original animation on every iteration.
  for (let iteration = 0; iteration < 8 && wristTravel > 0; iteration++) {
    const wrist = a.bones.LeftHand.getWorldPosition(new THREE.Vector3());
    const forearmLine = wrist.sub(a.bones.LeftForeArm.getWorldPosition(new THREE.Vector3())).normalize();
    const palmLine = handForward.clone().applyQuaternion(rotation).normalize();
    const bend = palmLine.angleTo(forearmLine);
    const limit = THREE.MathUtils.degToRad(35);
    if (bend <= limit) break;
    const correction = new THREE.Quaternion().setFromUnitVectors(palmLine, forearmLine);
    correction.slerpQuaternions(new THREE.Quaternion(), correction.clone(), (bend - limit) / bend * wristTravel);
    rotation.premultiply(correction).normalize();
    solve();
  }
  const supportWeight = 1 - range(u, .05, .16) + range(u, .82, .94);
  fitC96SupportFingers(a, ready, gunRotation, supportWeight);
  const actual = leftOffset.clone().applyQuaternion(a.bones.LeftHand.getWorldQuaternion(new THREE.Quaternion())).add(a.bones.LeftHand.getWorldPosition(new THREE.Vector3()));
  a.state.c96ReloadPalmTargetWorld = target.toArray();
  a.state.c96ReloadPalmErrorM = actual.distanceTo(target);
  a.state.c96ReloadStage = u < .12 ? 'release' : u < .39 ? 'retrieve' : u < .55 ? 'present' : u < .66 ? 'press' : u < .8 ? 'withdraw' : 'support';
  return true;
}

function fitC96SupportFingers(a, mount, gunRotation, weight) {
  if (weight <= 0) return;
  const fingers = new Set();
  for (const [digit, directions] of Object.entries(mount.support_finger_directions_weapon || {})) {
    for (let joint = 1; joint <= 3; joint++) {
      if (!directions[joint - 1]) continue;
      const bone = a.model.bones.get(`mixamorig:LeftHand${digit}${joint}`);
      const child = a.model.bones.get(`mixamorig:LeftHand${digit}${joint + 1}`);
      a.saveBone(bone); fingers.add(bone);
      const current = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
      const desired = v(directions[joint - 1]).applyQuaternion(gunRotation);
      const angle = current.angleTo(desired);
      const limit = THREE.MathUtils.degToRad(mount.support_finger_max_swing_degrees?.[digit]?.[joint - 1] ?? 180);
      const swing = new THREE.Quaternion().setFromUnitVectors(current.normalize(), desired.normalize());
      if (angle > limit) swing.slerpQuaternions(new THREE.Quaternion(), swing.clone(), limit / angle);
      a.setWorldQuaternion(bone, swing.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
    }
  }
  a.blendFromSource(fingers, weight * (mount.support_finger_pose_weight ?? .75));
  a.bones.LeftHand.updateMatrixWorld(true);
}
