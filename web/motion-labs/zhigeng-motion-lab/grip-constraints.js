import * as THREE from "three";
import { calibration } from "./grip-calibration.js?v=contact-r49";

const V = (a) => new THREE.Vector3().fromArray(a);
const Q = (a) => new THREE.Quaternion().fromArray(a).normalize();
const P = (b) => b.getWorldPosition(new THREE.Vector3());
const armName = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand.*)$/;

// The animation is the source on every evaluation, including paused seeks.
// Restore it before solving contact; never solve on last frame's correction.
export function captureGripSource(a) {
  const source = new Map();
  for (const b of new Set(a.model.bones.values())) {
    if (armName.test(b.name.replace(/^mixamorig:?/, "")))
      source.set(b, b.quaternion.clone());
  }
  return source;
}

function placeArm(a, side, target, rotation) {
  const upper = a.bones[side + "Arm"],
    fore = a.bones[side + "ForeArm"],
    hand = a.bones[side + "Hand"];
  for (const b of [upper, fore, hand]) a.saveBone(b);
  if (side === "Left") {
    const reach = P(upper).distanceTo(P(fore)) + P(fore).distanceTo(P(hand));
    const oldMount = a.activeMount;
    a.activeMount = { shoulder_assist_max_degrees: 5 };
    a.assistShoulder(target, reach - 0.001);
    a.activeMount = oldMount;
  }
  const s = P(upper),
    e = P(fore),
    h = P(hand),
    ul = s.distanceTo(e),
    fl = e.distanceTo(h);
  const dir = target.clone().sub(s),
    d = THREE.MathUtils.clamp(
      dir.length(),
      Math.abs(ul - fl) + 1e-5,
      ul + fl - 1e-5,
    );
  dir.normalize();
  const middle = a.model.bones.get("mixamorig:" + side + "HandMiddle1");
  const long = middle.position.clone().normalize().applyQuaternion(rotation);
  const ideal = target.clone().addScaledVector(long, -fl).sub(s);
  ideal.addScaledVector(dir, -ideal.dot(dir));
  const pole = e.clone().sub(s);
  pole.addScaledVector(dir, -pole.dot(dir));
  if (ideal.lengthSq() > 1e-8) pole.normalize().lerp(ideal.normalize(), 0.9);
  if (pole.lengthSq() < 1e-8) pole.set(0, -1, 0).addScaledVector(dir, dir.y);
  pole.normalize();
  const along = (ul * ul - fl * fl + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, ul * ul - along * along));
  const elbow = s
    .clone()
    .addScaledVector(dir, along)
    .addScaledVector(pole, height);
  a.turnToward(upper, e.clone().sub(s), elbow.sub(s));
  const ne = P(fore);
  a.turnToward(fore, P(hand).sub(ne), target.clone().sub(ne));
  a.setWorldQuaternion(hand, rotation);
  // Spread a bounded amount of roll into the forearm. Never inject a 180°
  // reference roll into the upper arm/shoulder to satisfy a palm target.
  const bind = a.bindHandQuaternions.get(hand);
  if (bind) {
    const fq = fore.getWorldQuaternion(new THREE.Quaternion());
    const delta = fq
      .clone()
      .invert()
      .multiply(rotation)
      .multiply(bind.clone().invert());
    const axis = hand.position.clone().normalize();
    let angle =
      2 *
      Math.atan2(
        new THREE.Vector3(delta.x, delta.y, delta.z).dot(axis),
        delta.w,
      );
    angle =
      THREE.MathUtils.euclideanModulo(angle + Math.PI, 2 * Math.PI) - Math.PI;
    angle = THREE.MathUtils.clamp(angle * 0.7, -Math.PI / 3, Math.PI / 3);
    a.setWorldQuaternion(
      fore,
      new THREE.Quaternion()
        .setFromAxisAngle(P(hand).sub(P(fore)).normalize(), angle)
        .multiply(fq),
    );
    a.setWorldQuaternion(hand, rotation);
  }
  return P(hand).distanceTo(target);
}

function comfortableRotation(a, side, target, base, gun, offset) {
  const shoulder = P(a.bones[side + "Arm"]),
    elbow = P(a.bones[side + "ForeArm"]),
    hand = P(a.bones[side + "Hand"]);
  const ul = shoulder.distanceTo(elbow),
    fl = elbow.distanceTo(hand);
  const middle = a.model.bones.get("mixamorig:" + side + "HandMiddle1");
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(gun.quaternion);
  const rotation = (angle) =>
    new THREE.Quaternion().setFromAxisAngle(axis, angle).multiply(base);
  const cost = (angle) => {
    const q = rotation(angle),
      w = target.clone().sub(offset.clone().applyQuaternion(q));
    const dir = w.clone().sub(shoulder),
      d = THREE.MathUtils.clamp(
        dir.length(),
        Math.abs(ul - fl) + 1e-5,
        ul + fl - 1e-5,
      );
    dir.normalize();
    const long = middle.position.clone().normalize().applyQuaternion(q);
    const bend = w.clone().addScaledVector(long, -fl).sub(shoulder);
    bend.addScaledVector(dir, -bend.dot(dir)).normalize();
    const along = (ul * ul - fl * fl + d * d) / (2 * d),
      height = Math.sqrt(Math.max(0, ul * ul - along * along));
    const e = shoulder
      .clone()
      .addScaledVector(dir, along)
      .addScaledVector(bend, height);
    const flex = w.sub(e).angleTo(long);
    return flex * flex + angle * angle * 0.12;
  };
  let lo = -Math.PI / 6,
    hi = Math.PI / 6;
  for (let i = 0; i < 16; i++) {
    const x = lo + (hi - lo) / 3,
      y = hi - (hi - lo) / 3;
    if (cost(x) < cost(y)) hi = y;
    else lo = x;
  }
  return rotation((lo + hi) / 2);
}

function gripFingers(a, side, measured, pistol, weight = 1) {
  for (const [name, f] of Object.entries(measured.fingers)) {
    const b = a.model.bones.get("mixamorig:" + name);
    if (!b) continue;
    const digit = name.match(/Hand(\w+)[123]$/)[1],
      j = +name.at(-1) - 1;
    const angles =
      side === "Right"
        ? digit === "Thumb"
          ? [12, 25, 20]
          : digit === "Index"
            ? [7, 22, 20]
            : [40, 45, 25]
        : digit === "Thumb"
          ? [pistol ? 8 : -20, 28, 25]
          : pistol
            ? [45, 40, 30]
            : [65, 15, 35];
    const desired = Q(f.rest).multiply(
      new THREE.Quaternion().setFromAxisAngle(
        V(f.curlAxis),
        THREE.MathUtils.degToRad(angles[j]),
      ),
    );
    a.saveBone(b);
    b.quaternion.slerp(desired, weight).normalize();
    b.updateMatrixWorld(true);
  }
}

export function applyGripConstraints(a, source, motion, time, animation = {}) {
  if (!a.state.visible) return;
  const id = a.selectedWeapon,
    cal = calibration[a.characterId],
    profile = cal?.weapons[id];
  if (!profile || motion === "Reloading") return;
  const data = a.config.weapons[id],
    pistol = data.type === "pistol",
    rocket = id === "pf89",
    fixed = id === "qjz89";
  // Preserve the authored releases during draw/discard/reload.
  if (
    rocket &&
    ![
      "RifleIdle",
      "RifleWalk",
      "RifleRun",
      "RifleAimingIdle",
      "FiringRifle",
    ].includes(motion)
  )
    return;
  const gun = a.weapons.get(id),
    oldQ = gun.quaternion.clone();
  const oldRotations = Object.fromEntries(
    ["Left", "Right"].map((s) => [
      s,
      oldQ
        .clone()
        .invert()
        .multiply(
          a.bones[s + "Hand"].getWorldQuaternion(new THREE.Quaternion()),
        ),
    ]),
  );
  for (const [b, q] of source) {
    a.saveBone(b);
    b.quaternion.copy(q);
  }
  a.model.root.updateMatrixWorld(true);
  const rightAxis = P(a.bones.RightArm).sub(P(a.bones.LeftArm)).normalize();
  const up = P(a.bones.Head).sub(P(a.bones.Spine2)).normalize();
  const front = new THREE.Vector3().crossVectors(up, rightAxis).normalize();
  const shouldered =
    !pistol &&
    !rocket &&
    !fixed &&
    [
      "RifleAimingIdle",
      "FiringRifle",
      "ShotgunPump",
      "ShotgunAimLevel",
      "ShotgunAimUp",
      "ShotgunAimDown",
    ].includes(motion);
  const carry =
    !pistol &&
    !rocket &&
    !fixed &&
    ["RifleIdle", "RifleWalk", "RifleRun"].includes(motion);
  const right = V(profile.right),
    left = V(profile.left),
    scale = gun.scale.x;
  const aim = id === "m870" ? THREE.MathUtils.clamp(
    animation.aimPitch ?? (motion === "ShotgunAimUp" ? 1 : motion === "ShotgunAimDown" ? -1 : 0),
    -1, 1,
  ) : 0;
  if (shouldered || carry) {
    const anchor = gun.localToWorld(right.clone());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(gun.quaternion);
    // Shotgun pitch labels are measured against the world horizon. Using
    // the leaning torso as vertical would add its angle a second time.
    const vertical = id === "m870" && shouldered ? new THREE.Vector3(0, 1, 0) : up;
    const pitch = Math.asin(THREE.MathUtils.clamp(forward.dot(vertical), -1, 1));
    // Keep the existing continuous shotgun aim control and its calibrated
    // endpoints. Only suppress the unwanted roll/overshoot around that aim.
    const endpoint =
      aim < 0
        ? Math.abs(data.re4_shotgun?.aim_pitch_min_deg ?? 45)
        : (data.re4_shotgun?.aim_pitch_max_deg ?? 45);
    const requestedPitch = THREE.MathUtils.degToRad(aim * endpoint);
    const limited = carry
      ? THREE.MathUtils.clamp(pitch, -0.7, -0.12)
      : THREE.MathUtils.clamp(
          pitch,
          requestedPitch - 0.12,
          requestedPitch + 0.18,
        );
    forward.addScaledVector(vertical, -forward.dot(vertical));
    if (forward.lengthSq() < 0.01) forward.copy(front);
    forward
      .normalize()
      .multiplyScalar(Math.cos(limited))
      .addScaledVector(vertical, Math.sin(limited));
    const x = new THREE.Vector3().crossVectors(forward, vertical).normalize(),
      y = new THREE.Vector3().crossVectors(x, forward).normalize();
    gun.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, forward.clone().negate()),
    );
    gun.position
      .copy(anchor)
      .sub(right.clone().multiplyScalar(scale).applyQuaternion(gun.quaternion));
    if (shouldered) {
      const pocket = P(a.bones.RightArm)
        .addScaledVector(rightAxis, -0.018)
        .addScaledVector(up, -0.025)
        .addScaledVector(front, 0.055);
      gun.position
        .copy(pocket)
        .sub(
          V(profile.butt).multiplyScalar(scale).applyQuaternion(gun.quaternion),
        );
      a.state.shoulderTargetWorld = pocket.toArray();
    }
  }
  if (rocket)
    gun.position.addScaledVector(rightAxis, -0.065).addScaledVector(up, -0.025);
  if (fixed) gun.position.addScaledVector(up, -0.09);
  gun.updateMatrixWorld(true);
  const pump = a.state.pumpTravelM || 0;
  left.z += pump;
  // Move along the wooden pump, toward its rear, at extreme vertical aim.
  // The supporting arm must stay within reach while the butt stays seated.
  if (id === "m870" && shouldered)
    left.z += 0.065 * Math.abs(aim);
  if (pistol) {
    left.set(-0.031, right.y - 0.012, right.z + 0.012);
  }
  if (rocket) {
    left.copy(V(a.mountFor(id, motion).left_grip || data.left_grip));
    right.copy(V(data.right_grip));
  }
  // Carry and pistol poses have no stock anchor. Project the weapon as a
  // rigid object into both arm reach volumes instead of stretching a wrist
  // or silently leaving the supporting hand behind the fore-end.
  if (!shouldered) {
    const origin = gun.position.clone();
    for (let pass = 0; pass < 8; pass++)
      for (const side of ["Right", "Left"]) {
        const hand = a.bones[side + "Hand"],
          upper = a.bones[side + "Arm"],
          fore = a.bones[side + "ForeArm"];
        const target = gun.localToWorld(
          (side === "Right" ? right : left).clone(),
        );
        const offset = V(cal.hands[side].contact).multiply(
          hand.getWorldScale(new THREE.Vector3()),
        );
        let rotation = gun.quaternion
          .clone()
          .multiply(
            rocket
              ? oldRotations[side]
              : Q(profile[side.toLowerCase() + "Rotation"]),
          );
        if (!rocket)
          rotation = comfortableRotation(
            a,
            side,
            target,
            rotation,
            gun,
            offset,
          );
        const wrist = target.sub(offset.applyQuaternion(rotation)),
          s = P(upper),
          reach = P(fore).distanceTo(s) + P(hand).distanceTo(P(fore)) - 0.008;
        const delta = wrist.sub(s),
          excess = delta.length() - reach;
        if (excess > 0) {
          gun.position.addScaledVector(delta.normalize(), -excess);
          gun.updateMatrixWorld(true);
        }
      }
    a.state.reachFitTranslationM = gun.position.distanceTo(origin);
  }
  for (const side of ["Right", "Left"]) {
    const lower = side.toLowerCase(),
      hand = a.bones[side + "Hand"],
      target = gun.localToWorld((side === "Right" ? right : left).clone());
    const local = rocket ? oldRotations[side] : Q(profile[lower + "Rotation"]);
    let rotation = gun.quaternion.clone().multiply(local);
    const offset = V(cal.hands[side].contact).multiply(
      hand.getWorldScale(new THREE.Vector3()),
    );
    if (!rocket)
      rotation = comfortableRotation(a, side, target, rotation, gun, offset);
    const wrist = target.clone().sub(offset.clone().applyQuaternion(rotation));
    const reach = placeArm(a, side, wrist, rotation);
    gripFingers(a, side, cal.hands[side], pistol);
    const marker = cal.markers[side],
      mesh = a.model.root.getObjectByName(marker.mesh);
    const skinPoint = () => {
      const p = new THREE.Vector3();
      for (let i = 0; i < 3; i++)
        p.addScaledVector(
          mesh.getVertexPosition(marker.vertices[i], new THREE.Vector3()),
          marker.barycentric[i],
        );
      return mesh.localToWorld(p);
    };
    // Follow the actual skinned palm triangle, including thumb influences.
    // A hand-bone-local point alone is not a skin contact measurement.
    const correction = target.clone().sub(skinPoint());
    if (correction.length() < 0.02) {
      const corrected = P(hand).add(correction);
      for (const part of ["Arm", "ForeArm", "Hand"]) {
        const b = a.bones[side + part];
        b.quaternion.copy(source.get(b));
      }
      a.model.root.updateMatrixWorld(true);
      placeArm(a, side, corrected, rotation);
    }
    const actual = skinPoint();
    a.state[lower + "ContactErrorM"] = actual.distanceTo(target);
    a.state[lower + "PalmWorld"] = actual.toArray();
    a.state[lower + "SurfaceTargetWorld"] = target.toArray();
    a.state[lower + "ReachErrorM"] = reach;
    const mid = a.model.bones.get("mixamorig:" + side + "HandMiddle1");
    a.state[lower + "WristBendDegrees"] = THREE.MathUtils.radToDeg(
      P(hand)
        .sub(P(a.bones[side + "ForeArm"]))
        .angleTo(P(mid).sub(P(hand))),
    );
  }
  a.state.supportTargetWorld = a.state.leftSurfaceTargetWorld;
  if (shouldered)
    a.state.shoulderContactErrorM = gun
      .localToWorld(V(profile.butt))
      .distanceTo(V(a.state.shoulderTargetWorld));
  else {
    delete a.state.shoulderContactErrorM;
    delete a.state.shoulderTargetWorld;
  }
  a.state.gripRevision = "contact-r49";
  a.state.weaponPosition = gun.position.toArray();
  a.state.weaponQuaternion = gun.quaternion.toArray();
  a.state.barrelPitchDegrees = THREE.MathUtils.radToDeg(
    Math.asin(
      THREE.MathUtils.clamp(
        new THREE.Vector3(0, 0, -1).applyQuaternion(gun.quaternion).y,
        -1,
        1,
      ),
    ),
  );
}
