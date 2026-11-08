import * as THREE from 'three';
// Eight standalone FBX uploads. The handgun locomotion ZIP is intentionally excluded.
export const uploadedMotions = [
  {
    "name": "Dying",
    "label": "倒地死亡",
    "source": "Dying1.fbx",
    "loop": false,
    "root_policy": "trajectory",
    "category": "general"
  },
  {
    "name": "FlyingBackDeath",
    "label": "后飞死亡",
    "source": "Flying Back Death.fbx",
    "loop": false,
    "root_policy": "trajectory",
    "category": "general"
  },
  {
    "name": "PistolShooting",
    "label": "手枪射击",
    "source": "原手枪瞄准姿势 + 后坐上扬",
    "loop": false,
    "root_policy": "stationary",
    "category": "pistol"
  },
  {
    "name": "SittingTalking",
    "label": "二郎腿交谈",
    "source": "二郎腿Sitting Talking.fbx",
    "loop": false,
    "root_policy": "stationary",
    "category": "general"
  },
  {
    "name": "SittingCrossLegged",
    "label": "二郎腿坐姿",
    "source": "二郎腿Sitting.fbx",
    "loop": true,
    "root_policy": "stationary",
    "category": "general"
  },
  {
    "name": "ClimbingLadder",
    "label": "攀爬梯子",
    "source": "Climbing Ladder.fbx",
    "loop": true,
    "root_policy": "climb_in_place",
    "category": "general"
  },
  {
    "name": "HangToCrouch",
    "label": "悬挂翻上蹲伏",
    "source": "Braced Hang To Crouch.fbx",
    "loop": false,
    "root_policy": "trajectory",
    "category": "general"
  },
  {
    "name": "WalkingBackwards",
    "label": "倒退行走",
    "source": "Walking Backwards.fbx",
    "loop": true,
    "root_policy": "in_place",
    "category": "general"
  }
];
export const uploadedMotionNames = new Set(uploadedMotions.map(m => m.name));

export function measureUploadedMotions(model) {
  const result = new Map();
  const bones = [...new Set(model.bones.values())];
  for (const motion of uploadedMotions) {
    const action = model.actions.get(motion.name);
    if (!action) throw new Error(`Missing uploaded animation: ${motion.name}`);
    model.mixer.stopAllAction();
    action.reset().setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    const box = new THREE.Box3();
    for (let i = 0; i <= 24; i++) {
      action.time = action.getClip().duration * i / 24;
      model.mixer.update(0); model.wrapper.updateMatrixWorld(true);
      for (const bone of bones) box.expandByPoint(bone.getWorldPosition(new THREE.Vector3()));
    }
    result.set(motion.name, box.expandByScalar(.16));
  }
  model.mixer.stopAllAction();
  return result;
}

// A neutral stool makes the seated poses readable without importing props
// into the character asset. It is visible only for the two seated clips.
export function createMotionContext(model, scene) {
  const stool = new THREE.Group(); stool.name = 'SeatedMotionStool'; stool.visible = false;
  const material = new THREE.MeshStandardMaterial({color:0x68717b, roughness:.8});
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.44,.045,.42),material);
  seat.castShadow = seat.receiveShadow = true; stool.add(seat);
  const legs = Array.from({length:4}, () => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.035,1,.035),material);
    leg.castShadow = leg.receiveShadow = true; stool.add(leg); return leg;
  });
  scene.add(stool);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
  ledge.name = 'MantleReferencePlatform'; ledge.visible = false;
  ledge.castShadow = ledge.receiveShadow = true; scene.add(ledge);
  // Measure the end pose once, without applying the weapon solver. The platform
  // is a visual reference for the source mantle, not a gameplay collider.
  const mantle = model.actions.get('HangToCrouch');
  model.mixer.stopAllAction(); mantle.reset().setLoop(THREE.LoopOnce,1); mantle.clampWhenFinished=true; mantle.play();
  mantle.time=mantle.getClip().duration;model.mixer.update(0);model.wrapper.updateMatrixWorld(true);
  const left=model.bones.get('mixamorig:LeftFoot').getWorldPosition(new THREE.Vector3());
  const right=model.bones.get('mixamorig:RightFoot').getWorldPosition(new THREE.Vector3());
  const middle=left.clone().add(right).multiplyScalar(.5);
  const height=Math.max(.1,Math.min(left.y,right.y)-.085);
  ledge.scale.set(.95,height,.95);ledge.position.set(middle.x,height/2,middle.z+.15);
  model.mixer.stopAllAction();
  return {setMotion(name) {
    ledge.visible = name === 'HangToCrouch';
    stool.visible = name === 'SittingTalking' || name === 'SittingCrossLegged';
    if (!stool.visible) return;
    const hips = model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3());
    const height = Math.max(.15, hips.y - .105);
    seat.position.set(hips.x,height,hips.z);
    legs.forEach((leg,i) => {leg.scale.y=height;leg.position.set(hips.x+(i%2 ? .17 : -.17),height/2,hips.z+(i<2 ? .15 : -.15));});
  }};
}
