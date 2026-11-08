import * as THREE from 'three';
import { WeaponAttachment } from './weapon-attachment.js?v=linxu-v2';

export const unarmed = [
  ['Idle','待机'],['Walk','行走'],['Run','奔跑'],['WalkingBackwards','倒退行走'],
  ['Talking','交谈'],['HeadStress','转头'],['SittingCrossLegged','二郎腿坐姿'],
  ['SittingTalking','坐姿交谈'],['ClimbingLadder','攀爬梯子'],['HangToCrouch','悬挂翻越'],
  ['Dying','倒地死亡'],['FlyingBackDeath','后飞死亡']
];
export const armed = [['RifleIdle','持枪待机'],['RifleWalk','持枪行走'],['RifleRun','持枪奔跑'],['RifleAimingIdle','瞄准'],['FiringRifle','射击'],['Reloading','换弹']];
export const oneShots = new Set(['Dying','FlyingBackDeath','HangToCrouch','SittingTalking','Reloading','ShotgunPump']);
export function prepareRig(gltf, pack, cid, config, weapons, scene) {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(gltf.scene), center = box.getCenter(new THREE.Vector3());
  const scale = 1.75 / (box.max.y - box.min.y);
  wrapper.scale.setScalar(scale); wrapper.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
  wrapper.add(gltf.scene); scene.add(wrapper);
  const bones = new Map();
  gltf.scene.traverse(o => {
    if(o.isMesh) {o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}
    if(o.isBone) {bones.set(o.name,o);bones.set(o.userData.name||o.name,o);bones.set('mixamorig:'+o.name.replace(/^mixamorig:?/,''),o);}
  });
  const mixer = new THREE.AnimationMixer(gltf.scene), actions = new Map();
  // The curated pack is authoritative: uploaded Idle/Walk and expression tests
  // must never leak back into the visible action set.
  for(const clip of pack.animations) actions.set(clip.name,mixer.clipAction(clip));
  const model={root:gltf.scene,wrapper,bones,mixer,actions,cid};
  model.attachment=new WeaponAttachment(model,config,cid,weapons,scene);
  model.pose=(motion,time=0,weapon='none',compareRun=false)=>{
    model.attachment.beforeAnimation();mixer.stopAllAction();
    model.attachment.setWeapon(weapon==='none'?'qbz95':weapon);
    const name=compareRun&&['Run','RifleRun'].includes(motion)&&actions.has(motion+'_Before')?motion+'_Before':config.weapons[weapon]?.animation_overrides?.[motion]||motion;
    const action=actions.get(name);if(!action)throw Error('缺少动作 '+name);
    action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=time;
    mixer.update(0);wrapper.updateMatrixWorld(true);
    model.attachment.update(motion,time,{activeClips:[{name,weight:1}]});
    scene.updateMatrixWorld(true);
    return model.attachment.getState();
  };
  model.duration=(motion,weapon)=>actions.get(config.weapons[weapon]?.animation_overrides?.[motion]||motion)?.getClip().duration||0;
  return model;
}
