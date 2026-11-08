import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {setup,read,decode} from './validate_pf89.mjs';
import {fixedGunMotions,installFixedGunMotions} from '../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js';
import {UnmannedTank,tankMotions} from '../../web/motion-labs/diandian-classic-motion-lab/unmanned-tank.js';

const report={characters:{},dimensions:{}};
const gun=await read('assets/weapons/qjz89.glb');gun.scene.updateMatrixWorld(true);
const stock=new T.Box3().setFromObject(gun.scene.getObjectByName('Base2_tripo_part_16'),true);
const muzzle=new T.Box3().setFromObject(gun.scene.getObjectByName('Base2_tripo_part_22'),true);
report.dimensions.qjz89GunBodyMm=(stock.max.z-muzzle.min.z)*1000;assert(Math.abs(report.dimensions.qjz89GunBodyMm-1640)<.01);
const tankGltf=await read('assets/vehicles/type59d/type59d.glb'),tank=new UnmannedTank(tankGltf,new T.Scene());
report.dimensions.type59dTotalMm=(tank.bounds.max.z-tank.bounds.min.z)*1000;assert(Math.abs(report.dimensions.type59dTotalMm-9200)<.01);
for(const [source,normalized]of [['assets/weapons/source/qjz89_source.glb','assets/weapons/qjz89.glb'],['assets/vehicles/type59d/source/59d_rigged_v3.glb','assets/vehicles/type59d/type59d.glb']])assert(decode(source).bin.equals(decode(normalized).bin),'Uploaded mesh/rig binary must remain intact');
report.tank=[];
const tankSnapshot=()=>tank.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
for(const motion of tankMotions){tank.setMotion(motion.name);let finite=true;for(let i=0;i<=60;i++){tank.evaluate(motion.duration*i/60);finite&&=tankSnapshot().every(Number.isFinite);}assert(finite);tank.evaluate(motion.duration*.37);const before=tankSnapshot();tank.setMotion('TankRecoil');tank.evaluate(.5);tank.setMotion(motion.name);tank.evaluate(motion.duration*.37);const after=tankSnapshot();const drift=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));assert(drift<1e-7);report.tank.push({motion:motion.name,sourceClips:motion.clips,samples:61,resetDrift:drift});}

for(const cid of ['diandian','zhigeng']){
 const rt=await setup(cid);installFixedGunMotions(rt.model);const bones=[...new Set(rt.model.bones.values())];
 const snapshot=()=>bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
 const motions=[];
 for(const motion of fixedGunMotions){
  const duration=rt.model.actions.get(motion.name).getClip().duration,count=Math.ceil(duration*60);let left=0,right=0,stationary=0;const position=rt.cfg.characters[cid].mounts.qjz89.fixed_position_m;
  for(let i=0;i<=count;i++){
   const s=rt.pose(motion.name,duration*i/count,'qjz89');assert(s.visible&&s.fixedEmplacement);assert(snapshot().every(Number.isFinite));
   left=Math.max(left,s.leftContactErrorM);right=Math.max(right,s.rightContactErrorM);stationary=Math.max(stationary,...s.weaponPosition.map((v,j)=>Math.abs(v-position[j])));
  }
  assert(left<.002&&right<.002,`${cid} ${motion.name} ${left}/${right}`);assert.equal(stationary,0);
  rt.pose(motion.name,duration*.37,'qjz89');const before=snapshot();rt.pose('RifleAimingIdle',.2,'pf89');rt.pose('PistolIdle',.4,'qsz92');rt.pose(motion.name,duration*.37,'qjz89');const after=snapshot();const drift=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));assert(drift<1e-6);
  motions.push({name:motion.name,samples:count+1,maxLeftContactErrorM:left,maxRightContactErrorM:right,fixedMountDriftM:stationary,resetDrift:drift});
 }
 const baked=await read(`assets/animations/emplacements_r43/${cid}/uploaded_motions.glb`);let maxBakedBoneError=0;
 for(const clip of baked.animations){
  const runtime=rt.model.actions.get(clip.name);rt.model.actions.set('Baked'+clip.name,rt.model.mixer.clipAction(clip));
  for(const fraction of [0,.25,.5,.75,1]){
   const time=clip.duration*fraction;rt.model.actions.set(clip.name,runtime);rt.pose(clip.name,time,'qjz89');
   for(const track of clip.tracks){const dot=track.name.lastIndexOf('.'),node=rt.model.root.getObjectByName(track.name.slice(0,dot)),property=track.name.slice(dot+1),expected=Array.from(track.createInterpolant().evaluate(time)),actual=node[property].toArray();let error=Math.max(...expected.map((v,i)=>Math.abs(v-actual[i])));if(property==='quaternion')error=Math.min(error,Math.max(...expected.map((v,i)=>Math.abs(v+actual[i]))));maxBakedBoneError=Math.max(maxBakedBoneError,error);}
  }
 }
 assert(maxBakedBoneError<.001,`${cid} bake interpolation ${maxBakedBoneError}`);
 report.characters[cid]={motions,maxBakedBoneError};console.log('R43_RUNTIME_PASS',cid,JSON.stringify(motions));
}
fs.mkdirSync('web/motion-labs/verification_r43',{recursive:true});fs.writeFileSync('web/motion-labs/verification_r43/runtime.json',JSON.stringify(report,null,2)+'\n');console.log('DIMENSIONS',report.dimensions);
