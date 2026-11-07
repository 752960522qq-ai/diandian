import * as THREE from 'three';
import { composeUpperBody, isType97UpperTrack } from './type97-motion.js?v=grip-r31';

export const rocketMotions = [
  ['AimUp', '上仰瞄准', true], ['AimDown', '下俯瞄准', true],
  ['FireUp', '上仰发射', false], ['FireDown', '下俯发射', false],
  ['RaiseLevel', '举筒至平视', false], ['RaiseUp', '举筒向上', false], ['RaiseDown', '举筒向下', false],
  ['RaiseInfiniteLevel', '持筒转平视', false], ['RaiseInfiniteUp', '持筒转上瞄', false], ['RaiseInfiniteDown', '持筒转下瞄', false],
  ['Draw', '取出火箭筒', false], ['Discard', '丢弃火箭筒', false]
].map(([suffix, label, loop]) => ({name:'Rocket'+suffix, label, loop, rocket_only:true}));

export const rocketLabels = {RifleIdle:'持筒待机', RifleWalk:'持筒行走', RifleRun:'持筒跑步', RifleAimingIdle:'平视瞄准', FiringRifle:'平视发射'};

export function installRocketMotions(model) {
  const get = name => model.actions.get(name)?.getClip();
  const definitions = [
    ['Idle','RifleIdle',true], ['Walk','RifleWalk',true], ['Run','RifleRun',true],
    ...['Level','Up','Down'].flatMap(side => [['Aim'+side,'RifleAimingIdle',true], ['Fire'+side,'FiringRifle',false], ['Raise'+side,'RifleIdle',false], ['RaiseInfinite'+side,'RifleIdle',false]]),
    ['Draw','RifleIdle',false], ['Discard','RifleIdle',false]
  ];
  const report = [];
  for (const [suffix, baseName, cyclic] of definitions) {
    const base=get(baseName), upper=get('RocketUpper'+suffix);
    if (!base || !upper) throw new Error('Missing PF89 animation: '+suffix);
    // The rifle pelvis, root and leg tracks are copied byte-for-byte, never
    // retimed. Locomotion upper-body cycles follow the existing rifle cadence.
    const duration=cyclic ? base.duration : upper.duration;
    const clip=composeUpperBody('Rocket'+suffix,base,upper,duration);
    const named=(track,bone)=>track.name.replace(/[^A-Za-z0-9]/g,'').endsWith(bone+'quaternion');
    const hips=base.tracks.find(t=>named(t,'Hips'));
    const spine=clip.tracks.find(t=>named(t,'Spine'));
    const ref=upper.userData?.reference_hips;
    if (!hips || !spine || !ref) throw new Error('PF89 pelvis reference missing: '+suffix);
    const reference=new THREE.QuaternionKeyframeTrack('reference',ref.times,ref.quaternions).createInterpolant();
    const baseHip=hips.createInterpolant(), sourceSpine=spine.createInterpolant();
    const times=[],values=[]; const frames=Math.ceil(duration*60);
    for(let i=0;i<=frames;i++){
      const t=duration*i/frames;
      // Keep the rifle pelvis untouched and cancel only its orientation at the
      // waist. This preserves the rocket upper-body aim/carry orientation.
      const q=new THREE.Quaternion().fromArray(baseHip.evaluate(t)).invert()
        .multiply(new THREE.Quaternion().fromArray(reference.evaluate(t/duration*upper.duration)))
        .multiply(new THREE.Quaternion().fromArray(sourceSpine.evaluate(t))).normalize();
      times.push(t);values.push(...q.toArray());
    }
    clip.tracks[clip.tracks.indexOf(spine)]=new THREE.QuaternionKeyframeTrack(spine.name,times,values);
    clip.userData={...clip.userData, sourceGroup:'RE4 w07', upperOnly:true};
    model.actions.set(clip.name,model.mixer.clipAction(clip));
    report.push({name:clip.name,base:baseName,upper:upper.name,duration,sourceDuration:upper.duration,lowerTracks:clip.tracks.filter(t=>!isType97UpperTrack(t)).length,lowerBodyPolicy:'Original rifle hips/root/legs; original key times and values; clamp beyond source end'});
  }
  return report;
}

// A deterministic preview-only release: it can be sought directly and resets
// when switching weapons/actions. It is not original game event timing.
export function rocketSupportWeight(motion,time) {
  if (motion==='RocketDiscard') return 1-THREE.MathUtils.smoothstep(time,0,.10);
  if (motion==='RocketDraw') return THREE.MathUtils.smoothstep(time,.30,.55);
  if (motion.startsWith('RocketRaise') && !motion.includes('Infinite')) return THREE.MathUtils.smoothstep(time,.30,.55);
  return 1;
}

export function rocketCarryWeight(motion,time) {
  if (["RifleIdle","RifleWalk","RifleRun"].includes(motion)) return 1;
  if (motion.startsWith("RocketRaise")) return 1-THREE.MathUtils.smoothstep(time,.25,.65);
  if (motion === "RocketDraw") return THREE.MathUtils.smoothstep(time,.35,.55);
  return 0;
}

// The guide curves are authored in Blender in the chest frame, so the tube
// sweeps outside the body while the original torso and leg animation continues.
export function applyRocketPosePath(attachment, gun, gunRotation, motion, time, mount) {
  if ((!motion.startsWith('RocketRaise') && motion !== 'RocketDraw') || !mount.raise_paths) return;
  const side = motion.endsWith('Up') ? 'up' : motion.endsWith('Down') ? 'down' : 'level';
  const path = mount.raise_paths[side];
  const drawing = motion === 'RocketDraw';
  const u = drawing ? 0 : THREE.MathUtils.clamp(time / .85, 0, 1);
  const f = u * (path.length - 1), i = Math.floor(f), j = Math.min(i + 1, path.length - 1);
  const p = new THREE.Vector3().fromArray(path[i].position).lerp(new THREE.Vector3().fromArray(path[j].position), f-i);
  const q = new THREE.Quaternion().fromArray(path[i].quaternion).slerp(new THREE.Quaternion().fromArray(path[j].quaternion), f-i);
  const chest = attachment.bones.Spine2, rotation = chest.getWorldQuaternion(new THREE.Quaternion());
  gun.position.copy(p.applyQuaternion(rotation).add(chest.getWorldPosition(new THREE.Vector3())));
  const right = attachment.bones.RightArm.getWorldPosition(new THREE.Vector3()).sub(attachment.bones.LeftArm.getWorldPosition(new THREE.Vector3())).normalize();
  gun.position.addScaledVector(right, .075 * Math.sin(Math.PI*u));
  if (drawing) {
    gun.position.addScaledVector(right, .05 * (1-THREE.MathUtils.smoothstep(time,.35,.55)));
    const up = attachment.bones.Spine2.getWorldPosition(new THREE.Vector3()).sub(attachment.model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3())).normalize();
    gun.position.addScaledVector(up, -.06 * (1-THREE.MathUtils.smoothstep(time,0,.55)));
  }
  gunRotation.copy(rotation.multiply(q)).normalize();
  gun.quaternion.copy(gunRotation);
}

// Keep a little elbow bend through the rifle gait. Lift the carried tube when
// the lower-body cycle would put the support wrist outside the arm's reach.
export function fitRocketCarryReach(attachment, gun, gunRotation, mount, motion, handScale) {
  if (!['RifleIdle','RifleWalk','RifleRun','RocketDraw'].includes(motion)) return;
  if ((mount.support_pose_weight ?? 1) <= 0) return;
  const bones = attachment.bones;
  const shoulder = bones.LeftArm.getWorldPosition(new THREE.Vector3());
  const elbow = bones.LeftForeArm.getWorldPosition(new THREE.Vector3());
  const hand = bones.LeftHand.getWorldPosition(new THREE.Vector3());
  const reach = .94 * (shoulder.distanceTo(elbow) + elbow.distanceTo(hand));
  const rotation = gunRotation.clone().multiply(new THREE.Quaternion().fromArray(mount.left_hand_quaternion_weapon));
  const scale = attachment.model.wrapper.getWorldScale(new THREE.Vector3()).x * handScale;
  const wrist = new THREE.Vector3().fromArray(mount.left_grip).applyQuaternion(gunRotation).add(gun.position)
    .sub(new THREE.Vector3().fromArray(mount.left_palm_offset_native).multiplyScalar(scale).applyQuaternion(rotation));
  const delta = wrist.sub(shoulder), excess = delta.lengthSq() - reach*reach;
  if (excess <= 0) return;
  const up = bones.Spine2.getWorldPosition(new THREE.Vector3()).sub(attachment.model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3())).normalize();
  const vertical = delta.dot(up), discriminant = vertical*vertical-excess;
  if (vertical < 0 && discriminant >= 0) {
    const lift = Math.min(.12, -vertical-Math.sqrt(discriminant));
    gun.position.addScaledVector(up,lift * THREE.MathUtils.smoothstep(mount.support_pose_weight ?? 1,0,1));
    attachment.state.carryLiftM = lift;
  }
}
