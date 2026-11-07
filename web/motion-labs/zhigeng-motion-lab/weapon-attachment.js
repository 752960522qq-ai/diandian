import * as THREE from 'three';
import { rocketMotions, rocketSupportWeight, rocketCarryOffset } from './rocket-motion.js?v=pf89-r37';
import { ChestSkinningRelief } from './chest-skinning.js?v=grip-r31';
import { refineC96Rotation } from './c96-dynamics.js?v=clothing-r23';
import { prepareC96ReloadPose, applyC96ReloadSupport } from './c96-reload.js?v=clothing-r23';

const RIFLE_MOTIONS = new Set(['RifleIdle', 'RifleWalk', 'RifleAimingIdle', 'FiringRifle', 'RifleRun', 'Reloading']);
const PISTOL_MOTIONS = new Set(['PistolIdle', 'PistolAimingIdle', 'PistolWalk']);
const SHOTGUN_MOTIONS = new Set(['ShotgunAimUp','ShotgunAimDown','ShotgunAimLevel','ShotgunPump']);
const ARMED_MOTIONS = new Set([...RIFLE_MOTIONS, ...PISTOL_MOTIONS, ...SHOTGUN_MOTIONS, ...rocketMotions.map(m => m.name)]);
const vector = value => new THREE.Vector3().fromArray(value);
const quaternion = value => new THREE.Quaternion().fromArray(value).normalize();

/** Call beforeAnimation() before the character mixer, then update() afterwards. */
export class WeaponAttachment {
  constructor(model, config, characterId, weaponScenes, scene = model.wrapper.parent) {
    this.model = model;
    this.config = config;
    this.character = config.characters[characterId];
    this.characterId = characterId;
    this.chestSkinning = new ChestSkinningRelief(model.root, this.character.chest_skinning_relief);
    this.selectedWeapon = 'qbz95';
    this.lastRifle = 'qbz95';
    this.lastPistol = 'qsz92';
    this.motion = 'Idle';
    this.savedPose = new Map();
    this.bindHandQuaternions = new Map();
    model.root.traverse(object => {
      if (!object.isSkinnedMesh) return;
      for (const side of ['Left', 'Right']) for (const part of ['Hand', 'ForeArm']) {
        const bone = model.bones.get('mixamorig:' + side + part);
        const index = object.skeleton.bones.indexOf(bone);
        const parentIndex = object.skeleton.bones.indexOf(bone.parent);
        if (index < 0 || parentIndex < 0 || this.bindHandQuaternions.has(bone)) continue;
        const local = object.skeleton.boneInverses[parentIndex].clone().multiply(object.skeleton.boneInverses[index].clone().invert());
        this.bindHandQuaternions.set(bone, new THREE.Quaternion().setFromRotationMatrix(local).normalize());
      }
    });
    this.weapons = new Map();
    this.bones = {};
    for (const name of ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'Spine2', 'Head']) {
      this.bones[name] = model.bones.get('mixamorig:' + name);
    }
    this.handBaseScales = new Map(['Left', 'Right'].map(side => {
      const bone = this.bones[side + 'Hand'];
      return [bone, bone.scale.clone()];
    }));
    this.appliedHandScale = 1;
    for (const id of Object.keys(config.weapons)) {
      const root = new THREE.Group();
      root.name = 'Equipped_' + id;
      root.add(weaponScenes.get(id).clone(true));
      root.visible = false;
      root.traverse(object => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      scene.add(root);
      this.weapons.set(id, root);
    }
    this.pumpParts = [];
    this.weapons.get('winchester1897')?.traverse(object => {
      if (object.name.replaceAll('_', ' ') === 'm 97 add1') this.pumpParts.push({object, rest: object.position.clone()});
    });
    this.type97PumpParts = [];
    this.weapons.get('type97hawk')?.traverse(object => {
      if (config.weapons.type97hawk.pump_node_names.includes(object.name)) this.type97PumpParts.push({object, rest:object.position.clone()});
    });
    this.state = {visible:false, selectedWeapon:this.selectedWeapon, motion:'Idle', leftContactErrorM:0, rightContactErrorM:0};
  }

  beforeAnimation() {
    for (const [bone, sourceQuaternion] of this.savedPose) bone.quaternion.copy(sourceQuaternion);
    this.savedPose.clear();
    if (this.appliedHandScale !== 1) {
      for (const [bone, scale] of this.handBaseScales) bone.scale.copy(scale);
    }
    this.model.root.updateMatrixWorld(true);
  }

  applyHandScale() {
    const factor = this.character.hand_scale ?? 1;
    if (factor !== 1 || this.appliedHandScale !== 1) {
      // Reset from the captured rest scale so paused frames and seeks never compound.
      for (const [bone, scale] of this.handBaseScales) bone.scale.copy(scale).multiplyScalar(factor);
      this.model.root.updateMatrixWorld(true);
    }
    this.appliedHandScale = factor;
    return factor;
  }

  saveBone(bone) {
    if (!this.savedPose.has(bone)) this.savedPose.set(bone, bone.quaternion.clone());
  }

  setWeapon(id) {
    this.selectedWeapon = id;
    if (this.config.weapons[id].type === 'pistol') { this.lastPistol = id; return 'PistolIdle'; }
    this.lastRifle = id;
    return RIFLE_MOTIONS.has(this.motion) ? this.motion : 'RifleIdle';
  }

  mountFor(id, motion) {
    const mounts = this.character.mounts;
    const base = mounts[id] || mounts[this.config.weapons[id].type] || {};
    const clip = this.config.weapons[id].animation_overrides?.[motion];
    return {...base, ...(mounts[motion] || {}), ...(base.motions?.[motion] || {}), ...(clip ? base.motions?.[clip] || {} : {})};
  }

  setWorldQuaternion(bone, desired) {
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(desired)).normalize();
    bone.updateMatrixWorld(true);
  }

  turnToward(bone, from, to) {
    const swing = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    this.setWorldQuaternion(bone, swing.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
  }

  blendFromSource(bones, weight) {
    for (const bone of bones) {
      const solved = bone.quaternion.clone();
      bone.quaternion.slerpQuaternions(this.savedPose.get(bone), solved, weight).normalize();
    }
  }

  assistShoulder(target, reachLength) {
    const shoulder = this.bones.LeftArm.getWorldPosition(new THREE.Vector3());
    if (shoulder.distanceTo(target) <= reachLength) return;
    const clavicle = this.bones.LeftShoulder;
    const center = clavicle.getWorldPosition(new THREE.Vector3());
    const toShoulder = shoulder.sub(center);
    const toTarget = target.clone().sub(center);
    const radius = toShoulder.length(), distance = toTarget.length();
    const angle = toShoulder.angleTo(toTarget);
    const requiredAngle = Math.acos(THREE.MathUtils.clamp((distance * distance + radius * radius - reachLength * reachLength) / (2 * distance * radius), -1, 1));
    const turn = Math.min(Math.max(0, angle - requiredAngle), THREE.MathUtils.degToRad(this.character.shoulder_assist_max_degrees ?? 8));
    if (turn === 0) return;
    this.saveBone(clavicle);
    const swing = new THREE.Quaternion().setFromUnitVectors(toShoulder.clone().normalize(), toTarget.clone().normalize());
    swing.slerp(new THREE.Quaternion(), 1 - turn / angle);
    this.turnToward(clavicle, toShoulder, toShoulder.clone().applyQuaternion(swing));
    this.state.shoulderAssistDegrees = THREE.MathUtils.radToDeg(turn);
  }

  solveLeftArm(target, handRotation, weight, twistWeight = 0, twistReference = 0, upperTwistWeight = .75, elbowHandWeight = 0, elbowOutwardWeight = 0, upperTwistReference = 0) {
    this.solveArm('Left', target, handRotation, weight, null, twistWeight, twistReference, upperTwistWeight, elbowHandWeight, elbowOutwardWeight, upperTwistReference);
  }

  solveArm(side, target, handRotation, weight = 1, elbowLift = null, twistWeight = 0, twistReference = 0, upperTwistWeight = .75, elbowHandWeight = 0, elbowOutwardWeight = 0, upperTwistReference = 0, elbowOffsetBody = null, elbowHintWorld = null) {
    const upper = this.bones[side + 'Arm'];
    const fore = this.bones[side + 'ForeArm'];
    const hand = this.bones[side + 'Hand'];
    for (const bone of [upper, fore, hand]) this.saveBone(bone);
    const originalShoulder = upper.getWorldPosition(new THREE.Vector3());
    const originalElbow = fore.getWorldPosition(new THREE.Vector3());
    const originalWrist = hand.getWorldPosition(new THREE.Vector3());
    if (side === 'Left') this.assistShoulder(target, originalShoulder.distanceTo(originalElbow) + originalElbow.distanceTo(originalWrist) - .0001);
    const shoulder = upper.getWorldPosition(new THREE.Vector3());
    const elbow = fore.getWorldPosition(new THREE.Vector3());
    const wrist = hand.getWorldPosition(new THREE.Vector3());
    const upperLength = shoulder.distanceTo(elbow);
    const lowerLength = elbow.distanceTo(wrist);
    const reach = target.clone().sub(shoulder);
    const distance = THREE.MathUtils.clamp(reach.length(), Math.abs(upperLength - lowerLength) + .0001, upperLength + lowerLength - .0001);
    const direction = reach.normalize();
    // A stock grip needs the firing elbow raised, rather than a folded wrist.
    const bend = elbow.clone().sub(shoulder);
    if (elbowLift !== null) {
      const across = this.bones.LeftArm.getWorldPosition(new THREE.Vector3()).sub(this.bones.RightArm.getWorldPosition(new THREE.Vector3())).normalize();
      const up = this.bones.Head.getWorldPosition(new THREE.Vector3()).sub(this.bones.Spine2.getWorldPosition(new THREE.Vector3())).normalize();
      bend.copy(across).multiplyScalar(side === 'Right' ? -1 : 1).addScaledVector(up, elbowLift);
    }
    // A weapon-local hint keeps the elbow on the clear side of an open stock
    // throughout the cycle; the analytic solve still preserves both bone lengths.
    if (elbowHintWorld) bend.copy(elbowHintWorld).sub(shoulder);
    if (elbowHandWeight > 0) {
      const middle = this.model.bones.get('mixamorig:' + side + 'HandMiddle1');
      const handLine = middle.position.clone().normalize().applyQuaternion(handRotation);
      const idealBend = target.clone().addScaledVector(handLine, -lowerLength).sub(shoulder);
      bend.lerp(idealBend, elbowHandWeight);
    }
    if (elbowOffsetBody) {
      // Small anatomical elbow offsets clear stocks/magazines without moving the grip.
      const right = this.bones.RightArm.getWorldPosition(new THREE.Vector3()).sub(this.bones.LeftArm.getWorldPosition(new THREE.Vector3())).normalize();
      const up = this.bones.Spine2.getWorldPosition(new THREE.Vector3()).sub(this.model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3())).normalize();
      const front = new THREE.Vector3().crossVectors(up, right).normalize();
      const factor = bend.length() / upperLength;
      bend.addScaledVector(right, elbowOffsetBody[0] * factor).addScaledVector(up, elbowOffsetBody[1] * factor).addScaledVector(front, elbowOffsetBody[2] * factor);
    }
    bend.addScaledVector(direction, -bend.dot(direction));
    if (bend.lengthSq() < .000001) {
      bend.set(1, 0, 0).applyQuaternion(this.model.root.getWorldQuaternion(new THREE.Quaternion()));
      bend.addScaledVector(direction, -bend.dot(direction));
    }
    bend.normalize();
    if (elbowOutwardWeight > 0) {
      const outward = this.bones[side + 'Arm'].getWorldPosition(new THREE.Vector3()).sub(this.bones[(side === 'Left' ? 'Right' : 'Left') + 'Arm'].getWorldPosition(new THREE.Vector3())).normalize();
      const up = this.bones.Spine2.getWorldPosition(new THREE.Vector3()).sub(this.model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3())).normalize();
      outward.addScaledVector(up, -0.15);
      outward.addScaledVector(direction, -outward.dot(direction)).normalize();
      bend.lerp(outward, THREE.MathUtils.clamp(elbowOutwardWeight, 0, 1)).normalize();
    }
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(upperLength * upperLength - along * along, 0));
    const desiredElbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, height);
    this.turnToward(upper, elbow.clone().sub(shoulder), desiredElbow.sub(shoulder));
    const newElbow = fore.getWorldPosition(new THREE.Vector3());
    const newWrist = hand.getWorldPosition(new THREE.Vector3());
    this.turnToward(fore, newWrist.sub(newElbow), target.clone().sub(newElbow));
    this.setWorldQuaternion(hand, handRotation);
    this.blendFromSource([upper, fore, hand], weight);
    upper.updateMatrixWorld(true);
    if (twistWeight > 0) {
      this.state[side.toLowerCase() + 'ForearmTwistDegrees'] = this.distributeAxialTwist(fore, hand, hand.getWorldQuaternion(new THREE.Quaternion()), twistWeight, twistReference);
      const foreRotation = fore.getWorldQuaternion(new THREE.Quaternion());
      this.state[side.toLowerCase() + 'UpperTwistDegrees'] = this.distributeAxialTwist(upper, fore, foreRotation, upperTwistWeight, upperTwistReference);
    }
  }

  distributeAxialTwist(parent, child, childRotation, weight, referenceDegrees = 0) {
    if (weight <= 0 || !this.bindHandQuaternions.has(child)) return 0;
    const parentRotation = parent.getWorldQuaternion(new THREE.Quaternion());
    const local = parentRotation.clone().invert().multiply(childRotation);
    const delta = local.multiply(this.bindHandQuaternions.get(child).clone().invert()).normalize();
    const axisLocal = child.position.clone().normalize();
    const projection = new THREE.Vector3(delta.x, delta.y, delta.z).dot(axisLocal);
    let angle = 2 * Math.atan2(projection, delta.w);
    const reference = THREE.MathUtils.degToRad(referenceDegrees);
    angle = reference + THREE.MathUtils.euclideanModulo(angle - reference + Math.PI, 2 * Math.PI) - Math.PI;
    const axisWorld = child.getWorldPosition(new THREE.Vector3()).sub(parent.getWorldPosition(new THREE.Vector3())).normalize();
    const twist = new THREE.Quaternion().setFromAxisAngle(axisWorld, angle * THREE.MathUtils.clamp(weight, 0, 1));
    this.setWorldQuaternion(parent, twist.multiply(parentRotation));
    this.setWorldQuaternion(child, childRotation);
    return THREE.MathUtils.radToDeg(angle);
  }

  fitRightFingers(mount, gunRotation) {
    const fingers = new Set();
    for (const [name, offset] of Object.entries(mount.right_finger_quaternion_offsets || {})) {
      const bone = this.model.bones.get(name.includes(':') ? name : 'mixamorig:' + name);
      this.saveBone(bone);
      fingers.add(bone);
      bone.quaternion.multiply(quaternion(offset)).normalize();
      bone.updateMatrixWorld(true);
    }
    for (const [digit, directions] of Object.entries(mount.right_finger_directions_weapon || {})) {
      for (let joint = 1; joint <= 3; joint++) {
        if (!directions[joint - 1]) continue;
        const bone = this.model.bones.get(`mixamorig:RightHand${digit}${joint}`);
        const child = this.model.bones.get(`mixamorig:RightHand${digit}${joint + 1}`);
        this.saveBone(bone);
        fingers.add(bone);
        const current = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
        const desired = vector(directions[joint - 1]).applyQuaternion(gunRotation);
        const thumbLimit = digit === 'Thumb' ? mount.right_thumb_max_swing_degrees?.[joint - 1] : null;
        if (thumbLimit != null) {
          // Keep the source thumb's axial orientation and limit the correction at each knuckle.
          // Independent unrestricted world directions previously folded the MCP joint by about 90 degrees.
          const angle = current.angleTo(desired);
          const limit = THREE.MathUtils.degToRad(thumbLimit);
          const swing = new THREE.Quaternion().setFromUnitVectors(current.normalize(), desired.normalize());
          if (angle > limit) swing.slerpQuaternions(new THREE.Quaternion(), swing.clone(), limit / angle);
          this.setWorldQuaternion(bone, swing.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
        } else {
          this.turnToward(bone, current, desired);
        }
      }
    }
    this.blendFromSource(fingers, mount.right_finger_pose_weight ?? this.character.finger_pose_weight ?? .6);
    this.bones.RightHand.updateMatrixWorld(true);
  }

  fitTriggerFinger(target, weight) {
    const bones = [1, 2, 3, 4].map(joint => this.model.bones.get(`mixamorig:RightHandIndex${joint}`));
    const points = bones.map(bone => bone.getWorldPosition(new THREE.Vector3()));
    const root = points[0].clone();
    const lengths = points.slice(0, 3).map((point, index) => point.distanceTo(points[index + 1]));
    for (let iteration = 0; iteration < 8; iteration++) {
      points[3].copy(target);
      for (let i = 2; i >= 0; i--) points[i].sub(points[i + 1]).normalize().multiplyScalar(lengths[i]).add(points[i + 1]);
      points[0].copy(root);
      for (let i = 0; i < 3; i++) points[i + 1].sub(points[i]).normalize().multiplyScalar(lengths[i]).add(points[i]);
      if (points[3].distanceTo(target) < .0005) break;
    }
    for (let i = 0; i < 3; i++) {
      this.saveBone(bones[i]);
      const current = bones[i + 1].getWorldPosition(new THREE.Vector3()).sub(bones[i].getWorldPosition(new THREE.Vector3()));
      this.turnToward(bones[i], current, points[i + 1].clone().sub(points[i]));
    }
    this.blendFromSource(bones.slice(0, 3), weight);
    bones[0].updateMatrixWorld(true);
    this.state.triggerContactErrorM = bones[3].getWorldPosition(new THREE.Vector3()).distanceTo(target);
  }

  update(motion, time = 0, animation = {}) {
    for (const part of [...this.pumpParts, ...this.type97PumpParts]) part.object.position.copy(part.rest);
    const handScale = this.applyHandScale();
    this.motion = motion;
    if (PISTOL_MOTIONS.has(motion) && this.config.weapons[this.selectedWeapon].type !== 'pistol') this.selectedWeapon = this.lastPistol;
    else if (RIFLE_MOTIONS.has(motion) && this.config.weapons[this.selectedWeapon].type === 'pistol' && !this.config.weapons[this.selectedWeapon].compatible_motions?.includes(motion)) this.selectedWeapon = this.lastRifle;
    const visible = this.model.wrapper.visible && ARMED_MOTIONS.has(motion) && !(this.selectedWeapon === 'pf89' && motion === 'RocketDiscard' && time >= .34);
    for (const [id, root] of this.weapons) root.visible = visible && id === this.selectedWeapon;
    this.state = {visible, selectedWeapon:this.selectedWeapon, motion, time, actualClip:this.config.weapons[this.selectedWeapon].animation_overrides?.[motion] || motion, handScale, leftContactErrorM:0, rightContactErrorM:0, shoulderAssistDegrees:0, triggerContactErrorM:null};
    this.chestSkinning.setEnabled(visible && ['RifleIdle', 'RifleWalk'].includes(motion) && !['pistol','rocket'].includes(this.config.weapons[this.selectedWeapon].type));
    this.state.chestReliefActive = this.chestSkinning.enabled;
    if (!visible) return;

    const id = this.selectedWeapon;
    const data = this.config.weapons[id];
    const mount = this.mountFor(id, motion);
    if (id === 'pf89') {
      mount.support_pose_weight = rocketSupportWeight(motion,time);
      mount.release_support_hand = mount.support_pose_weight === 0;
      mount.weapon_offset_body_m = [.015,0,rocketCarryOffset(motion,time)];
      this.state.supportWeight = mount.support_pose_weight;
    }
    // The authored shotgun clips have their own hand-to-gun calibration.
    const actualClip = animation.activeClips?.find(c => c.weight > 0)?.name || this.state.actualClip;
    if (id === 'winchester1897' && actualClip?.startsWith('Shotgun')) {
      Object.assign(mount, this.character.mounts[id].re4_mount);
      mount.release_support_hand = actualClip === 'ShotgunReload';
    }
    const re4 = mount.re4_shotgun === true;
    const hand = this.bones.RightHand;
    const scale = this.model.wrapper.getWorldScale(new THREE.Vector3()).x;
    if (mount.right_hand_quaternion_offset) {
      this.saveBone(hand);
      hand.quaternion.multiply(quaternion(mount.right_hand_quaternion_offset)).normalize();
      hand.updateMatrixWorld(true);
    }
    const handRotation = hand.getWorldQuaternion(new THREE.Quaternion());
    const rightOffset = vector(mount.palm_offset_native || this.character.palm_offset_native);
    const rightPalm = rightOffset.multiplyScalar(scale * handScale).applyQuaternion(handRotation).add(hand.getWorldPosition(new THREE.Vector3()));
    const gunRotation = handRotation.clone().multiply(quaternion(mount.quaternion_xyzw)).normalize();
    refineC96Rotation(this, gunRotation, motion, time);
    const gun = this.weapons.get(id);
    const modelScale = mount.model_scale ?? 1;
    gun.scale.setScalar(modelScale);
    gun.quaternion.copy(gunRotation);
    gun.position.copy(rightPalm).sub(vector(mount.right_grip || data.right_grip).multiplyScalar(modelScale).applyQuaternion(gunRotation));
    if (mount.shoulder_contact === true) {
      // Stock stays in the shoulder pocket throughout breathing and recoil.
      const shoulder = this.bones.RightArm.getWorldPosition(new THREE.Vector3());
      const across = this.bones.LeftArm.getWorldPosition(new THREE.Vector3()).sub(shoulder).normalize();
      const up = this.bones.Head.getWorldPosition(new THREE.Vector3()).sub(this.bones.Spine2.getWorldPosition(new THREE.Vector3())).normalize();
      const front = new THREE.Vector3().crossVectors(across, up).normalize();
      const pocket = shoulder.addScaledVector(across, mount.shoulder_pocket_inward_m ?? 0).addScaledVector(up, mount.shoulder_pocket_drop_m ?? -.025).addScaledVector(front, mount.shoulder_pocket_forward_m ?? .055);
      gun.position.copy(pocket).sub(vector(data.butt_contact).multiplyScalar(modelScale).applyQuaternion(gunRotation));
      this.state.shoulderTargetWorld = pocket.toArray();
    }
    if (mount.weapon_offset_body_m) {
      const displacement = vector(mount.weapon_offset_body_m);
      const right = this.bones.RightArm.getWorldPosition(new THREE.Vector3()).sub(this.bones.LeftArm.getWorldPosition(new THREE.Vector3())).normalize();
      const up = this.bones.Head.getWorldPosition(new THREE.Vector3()).sub(this.bones.Spine2.getWorldPosition(new THREE.Vector3())).normalize();
      const front = new THREE.Vector3().crossVectors(up, right).normalize();
      gun.position.addScaledVector(right, displacement.x).addScaledVector(up, displacement.y).addScaledVector(front, displacement.z);
    }
    if (mount.weapon_offset_weapon_m) gun.position.add(vector(mount.weapon_offset_weapon_m).multiplyScalar(modelScale).applyQuaternion(gunRotation));
    if (id === 'c96' && motion === 'Reloading') prepareC96ReloadPose(this, gun, gunRotation, mount, time);
    gun.updateMatrixWorld(true);
    if (mount.right_hand_quaternion_weapon || mount.right_hand_shift_weapon_m) {
      const calibrated = !!mount.right_hand_quaternion_weapon;
      const rotation = calibrated ? gunRotation.clone().multiply(quaternion(mount.right_hand_quaternion_weapon)) : handRotation.clone();
      const offset = vector(calibrated ? mount.right_contact_offset_native : (mount.palm_offset_native || this.character.palm_offset_native)).multiplyScalar(scale * handScale);
      const contact = gun.localToWorld(vector(calibrated ? (mount.right_palm_target_weapon || data.right_palm_surface) : (mount.right_grip || data.right_grip)));
      if (mount.right_hand_shift_weapon_m) contact.add(vector(mount.right_hand_shift_weapon_m).multiplyScalar(modelScale).applyQuaternion(gunRotation));
      const wristTarget = contact.clone().sub(offset.clone().applyQuaternion(rotation));
      const elbowHint = mount.right_elbow_hint_weapon_m
        ? wristTarget.clone().add(vector(mount.right_elbow_hint_weapon_m).multiplyScalar(modelScale).applyQuaternion(gunRotation))
        : null;
      this.solveArm('Right', wristTarget, rotation, 1,
        mount.right_elbow_lift_ratio ?? null, mount.right_forearm_twist_weight ?? 0,
        mount.right_forearm_twist_reference_degrees ?? 0, mount.right_upper_arm_twist_weight ?? .75,
        mount.right_elbow_from_hand_weight ?? 0, mount.right_elbow_outward_weight ?? 0, 0, mount.right_elbow_offset_body_m, elbowHint);
      const actual = offset.applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).add(hand.getWorldPosition(new THREE.Vector3()));
      this.state.rightContactErrorM = actual.distanceTo(contact);
      this.state.rightPalmWorld = actual.toArray();
      this.state.rightSurfaceTargetWorld = contact.toArray();
      if (this.state.shoulderTargetWorld) this.state.shoulderContactErrorM = gun.localToWorld(vector(data.butt_contact)).distanceTo(vector(this.state.shoulderTargetWorld));
    } else {
      this.state.rightContactErrorM = gun.localToWorld(vector(mount.right_grip || data.right_grip)).distanceTo(rightPalm);
      this.state.rightPalmWorld = rightPalm.toArray();
    }
    this.fitRightFingers(mount, gunRotation);

    const leftOffset = vector(mount.left_palm_offset_native || this.character.left_palm_offset_native).multiplyScalar(scale * handScale);
    let pumpTravel = 0;
    const pump = data.re4_shotgun || data.pump_motion;
    if ((re4 || data.hybrid_upper_actions) && motion === 'ShotgunPump' && pump?.pump_times) {
      const times = pump.pump_times;
      const sample = side => {
        const values = pump.pump_travel_m[side];
        if (time <= times[0]) return values[0];
        for (let i = 1; i < times.length; i++) if (time <= times[i]) return THREE.MathUtils.lerp(values[i-1], values[i], (time-times[i-1])/(times[i]-times[i-1]));
        return values.at(-1);
      };
      const pitch = THREE.MathUtils.clamp(animation.aimPitch || 0, -1, 1);
      pumpTravel = data.hybrid_upper_actions ? sample('Level') : THREE.MathUtils.lerp(sample('Level'), sample(pitch < 0 ? 'Down' : 'Up'), Math.abs(pitch));
    }
    for (const part of (id === 'type97hawk' ? this.type97PumpParts : this.pumpParts)) {
      // The imported model has rotated ancestors; convert gun +Z into the pump parent's frame.
      const origin = part.object.parent.worldToLocal(gun.localToWorld(new THREE.Vector3()));
      const shifted = part.object.parent.worldToLocal(gun.localToWorld(new THREE.Vector3(0, 0, pumpTravel)));
      part.object.position.copy(part.rest).add(shifted.sub(origin));
      part.object.updateMatrixWorld(true);
    }
    this.state.pumpTravelM = pumpTravel;
    const supportLocal = vector(mount.left_grip || data.left_grip);
    supportLocal.z += pumpTravel;
    const supportTarget = gun.localToWorld(supportLocal);
    if (id === 'c96' && motion === 'Reloading') {
      applyC96ReloadSupport(this, gun, gunRotation, mount, time, leftOffset);
    } else if (motion !== 'Reloading' && !mount.release_support_hand) {
      const leftRotation = mount.left_hand_quaternion_weapon
        ? gunRotation.clone().multiply(quaternion(mount.left_hand_quaternion_weapon)).normalize()
        : this.bones.LeftHand.getWorldQuaternion(new THREE.Quaternion());
      const wristTarget = supportTarget.clone().sub(leftOffset.clone().applyQuaternion(leftRotation));
      this.solveLeftArm(wristTarget, leftRotation, mount.support_pose_weight ?? this.character.support_pose_weight ?? .85, mount.support_forearm_twist_weight ?? 0, mount.support_forearm_twist_reference_degrees ?? 0, mount.support_upper_arm_twist_weight ?? .75, mount.support_elbow_from_hand_weight ?? 0, mount.support_elbow_outward_weight ?? 0, mount.support_upper_arm_twist_reference_degrees ?? 0);
      const supportFingers = new Set();
      for (const [name, offset] of Object.entries(mount.support_finger_quaternion_offsets || {})) {
        const bone = this.model.bones.get(name.includes(':') ? name : 'mixamorig:' + name);
        this.saveBone(bone);
        supportFingers.add(bone);
        bone.quaternion.multiply(quaternion(offset)).normalize();
        bone.updateMatrixWorld(true);
      }
      for (const [digit, directions] of Object.entries(mount.support_finger_directions_weapon || {})) {
        for (let joint = 1; joint <= 3; joint++) {
          if (!directions[joint - 1]) continue;
          const bone = this.model.bones.get(`mixamorig:LeftHand${digit}${joint}`);
          const child = this.model.bones.get(`mixamorig:LeftHand${digit}${joint + 1}`);
          this.saveBone(bone);
          supportFingers.add(bone);
          const current = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
          const desired = vector(directions[joint - 1]).applyQuaternion(gunRotation);
          const limitDegrees = mount.support_finger_max_swing_degrees?.[digit]?.[joint - 1];
          if (limitDegrees != null) {
            // Preserve the source joint's axial orientation, with a bounded swing.
            const angle = current.angleTo(desired);
            const limit = THREE.MathUtils.degToRad(limitDegrees);
            const swing = new THREE.Quaternion().setFromUnitVectors(current.normalize(), desired.normalize());
            if (angle > limit) swing.slerpQuaternions(new THREE.Quaternion(), swing.clone(), limit / angle);
            this.setWorldQuaternion(bone, swing.multiply(bone.getWorldQuaternion(new THREE.Quaternion())));
          } else {
            this.turnToward(bone, current, desired);
          }
        }
      }
      this.blendFromSource(supportFingers, mount.support_finger_pose_weight ?? this.character.finger_pose_weight ?? .6);
      this.bones.LeftHand.updateMatrixWorld(true);
    }
    const leftHand = this.bones.LeftHand;
    const leftPalm = leftOffset.applyQuaternion(leftHand.getWorldQuaternion(new THREE.Quaternion())).add(leftHand.getWorldPosition(new THREE.Vector3()));
    if ((['FiringRifle', 'PistolIdle', 'PistolAimingIdle'].includes(motion) || (id === 'pf89' && motion.startsWith('RocketFire'))) && mount.trigger_finger_ik === true && data.trigger) {
      const trigger = gun.localToWorld(vector(data.trigger).add(new THREE.Vector3(.004, 0, 0)));
      this.fitTriggerFinger(trigger, mount.right_finger_pose_weight ?? this.character.finger_pose_weight ?? .6);
    }
    this.state.leftContactErrorM = motion === 'Reloading' || mount.release_support_hand ? null : leftPalm.distanceTo(supportTarget);
    this.state.leftPalmWorld = leftPalm.toArray();
    this.state.supportTargetWorld = supportTarget.toArray();
    const barrel = vector(data.barrel_forward || [0,0,-1]).applyQuaternion(gunRotation);
    this.state.barrelPitchDegrees = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(barrel.y,-1,1)));
    this.state.re4Shotgun = re4;
    this.state.modelScale = modelScale;
    this.state.weaponPosition = gun.position.toArray();
    this.state.weaponQuaternion = gun.quaternion.toArray();
  }

  getState() { return {...this.state}; }

  dispose() {
    this.chestSkinning.setEnabled(false);
    this.beforeAnimation();
    for (const root of this.weapons.values()) root.removeFromParent();
    this.weapons.clear();
  }
}
