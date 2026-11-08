import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {setup,read,decode} from './validate_pf89.mjs';
import {installFixedGunMotions} from '../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js';
import {UnmannedTank,tankMotions} from '../../web/motion-labs/type59d-motion-lab/unmanned-tank.js';

const out='web/motion-labs/verification_r44';fs.mkdirSync(out,{recursive:true});
const report={hands:[],dimensions:{},characters:{},regression:{},tank:[]};
for(const file of [
 'assets/characters/diandian_classic/diandian_classic_fixed.glb',
 'web/motion-labs/diandian-classic-motion-lab/assets/diandian_fixed.glb',
 'web/motion-labs/diandian-classic-motion-lab/assets/diandian_before.glb',
]){
 const before=await read('work/r44-baseline/'+file),after=await read(file);
 const oldMixer=new THREE.AnimationMixer(before.scene),newMixer=new THREE.AnimationMixer(after.scene);
 const original=decode('work/r44-baseline/'+file),current=decode(file);
 assert.equal(current.g.asset.extras.hand_scale_baked,.9);
 assert(current.bin.subarray(0,original.bin.length).equals(original.bin),'Original mesh/skin/texture bytes changed');
 let samples=0,maxRatioError=0;
 for(const oldClip of before.animations){
  const newClip=after.animations.find(c=>c.name===oldClip.name);assert(newClip);
  for(const t of [0,oldClip.duration*.37,oldClip.duration]){
   for(const [mixer,clip] of [[oldMixer,oldClip],[newMixer,newClip]]){mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mixer.update(0);}
   before.scene.updateMatrixWorld(true);after.scene.updateMatrixWorld(true);
   for(const side of ['Left','Right']){
    const point=(scene,name)=>scene.getObjectByName('mixamorig'+side+name)?.getWorldPosition(new THREE.Vector3())||scene.getObjectByName('mixamorig:'+side+name).getWorldPosition(new THREE.Vector3());
    const oldLength=point(before.scene,'HandMiddle4').distanceTo(point(before.scene,'Hand'));
    const newLength=point(after.scene,'HandMiddle4').distanceTo(point(after.scene,'Hand'));
    const error=Math.abs(newLength/oldLength-.9);maxRatioError=Math.max(maxRatioError,error);assert(error<2e-5,`${file}/${oldClip.name}: standalone hand scale`);
   }
   samples++;
  }
 }
 report.hands.push({file,clips:before.animations.length,sampledPoses:samples,maxRatioError,sourceOnly:true});
 console.log('R44_SOURCE_HANDS_PASS',file,samples,maxRatioError);
}
const qbu=await read('assets/weapons/qbu10.glb');qbu.scene.updateMatrixWorld(true);
report.dimensions.qbu10Mm=new THREE.Box3().setFromObject(qbu.scene).getSize(new THREE.Vector3()).z*1000;
assert(Math.abs(report.dimensions.qbu10Mm-1150)<.001);
assert(decode('assets/weapons/qbu10.glb').bin.equals(decode('assets/weapons/source/qbu10_source.glb').bin));
const vehicle=await read('assets/vehicles/type59d/type59d.glb');const tank=new UnmannedTank(vehicle,new THREE.Scene());
report.dimensions.type59dMm=tank.bounds.getSize(new THREE.Vector3()).z*1000;assert(Math.abs(report.dimensions.type59dMm-9200)<.001);
for(const motion of tankMotions){tank.setMotion(motion.name);for(let i=0;i<=30;i++){tank.evaluate(motion.duration*i/30);assert(tank.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));}report.tank.push({motion:motion.name,samples:31});}

const snapshot=rt=>[...new Set(rt.model.bones.values())].flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
for(const cid of ['diandian','zhigeng']){
 const rt=await setup(cid);installFixedGunMotions(rt.model);const motions=[];
 for(const [weapon,names] of [['qjz89',['QJZ89Idle','QJZ89Aim']],['qbu10',['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading']]]){
  for(const name of names){
   const duration=rt.model.actions.get(name).getClip().duration;
   const frames=weapon==='qjz89'?Math.ceil(duration*60):60;
   let left=0,right=0,shoulder=0;
   for(let i=0;i<=frames;i++){
    const state=rt.pose(name,duration*i/frames,weapon);assert(state.visible);assert(snapshot(rt).every(Number.isFinite));
    left=Math.max(left,state.leftContactErrorM||0);right=Math.max(right,state.rightContactErrorM||0);shoulder=Math.max(shoulder,state.shoulderContactErrorM||0);
    assert(left<.002&&right<.002,`${cid}/${name}: hand contact`);
    if(weapon==='qjz89'||['RifleAimingIdle','FiringRifle'].includes(name))assert(state.shoulderContactErrorM<.0001,`${cid}/${name}: stock contact`);
   }
   motions.push({weapon,motion:name,samples:frames+1,maxLeftErrorM:left,maxRightErrorM:right,maxShoulderErrorM:shoulder});
  }
 }
 rt.pose('QJZ89Aim',.37,'qjz89');const initial=snapshot(rt);
 for(let i=0;i<6;i++){rt.pose('RifleAimingIdle',.2,'qbu10');rt.pose('RifleIdle',.3,'qbz95');rt.pose('QJZ89Idle',1,'qjz89');}
 rt.pose('QJZ89Aim',.37,'qjz89');const resetDelta=Math.max(...snapshot(rt).map((v,i)=>Math.abs(v-initial[i])));assert(resetDelta<1e-6);
 report.characters[cid]={motions,resetDelta};
 // Published R43 supplies independent original model, configuration and code.
 const old=await setup(cid,{sourceDirectory:`work/r43-publish/${cid}/dist`});
 rt.attachment.lastRifle='qbz95';rt.attachment.lastPistol='qsz92';
 for(const rig of [old,rt])for(const clip of (await read(`${rig.dir}/assets/uploaded_motions.glb`)).animations)rig.model.actions.set(clip.name,rig.model.mixer.clipAction(clip));
 let maxDelta=0,count=0;
 for(const weapon of Object.keys(old.cfg.weapons).filter(w=>w!=='qjz89')){
  for(const motion of ['Idle','RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','PistolIdle','PistolAimingIdle','PistolWalk','PistolShooting','WalkingBackwards']){
   const name=old.cfg.weapons[weapon].animation_overrides?.[motion]||motion;if(!old.model.actions.has(name))continue;
   const duration=old.model.actions.get(name).getClip().duration;
   for(const t of [0,duration*.37,duration]){
    const a=old.pose(motion,t,weapon),b=rt.pose(motion,t,weapon),before=snapshot(old),after=snapshot(rt);
    const delta=Math.max(...before.map((value,index)=>Math.abs(value-after[index])));maxDelta=Math.max(maxDelta,delta);
    assert(delta<1e-5,`${cid}/${weapon}/${motion}: existing pose changed ${delta}`);
    assert.equal(a.visible,b.visible);assert.equal(a.selectedWeapon,b.selectedWeapon);assert.equal(a.actualClip,b.actualClip);
    if(a.visible&&a.weaponPosition)assert(new THREE.Vector3(...a.weaponPosition).distanceTo(new THREE.Vector3(...b.weaponPosition))<1e-5,`${cid}/${weapon}/${motion}: visible weapon position changed`);
    count++;
   }
  }
 }
 report.regression[cid]={existingWeapons:11,sampledPoses:count,maxDelta,baseline:'Published R43'};
 console.log('R44_POSES_AND_REGRESSION_PASS',cid,count,maxDelta);
}
fs.writeFileSync(out+'/runtime.json',JSON.stringify(report,null,2)+'\n');
