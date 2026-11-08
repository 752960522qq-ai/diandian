import fs from 'node:fs';
import * as T from 'three';
import {read} from './validate_pf89.mjs';
const report={};
for(const id of ['military','vest']){
 const g=await read(`assets/characters/resistance_r46/${id}/character.glb`),pack=await read(`assets/characters/resistance_r46/${id}/motions.glb`),mixer=new T.AnimationMixer(g.scene),bones={},rest={};g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isBone){bones[o.name]=o;rest[o.name]=o.getWorldQuaternion(new T.Quaternion());}});const rows=[];
 for(const clip of pack.animations.filter(c=>['RifleAimingIdle','FiringRifle','Type97Fire','Type97Pump'].includes(c.name)||/^Shotgun(Aim|Fire|Pump|Cycle)/.test(c.name))){
  mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();const maxima={Neck:[0,0,0],Head:[0,0,0]};
  for(let i=0;i<=60;i++){action.time=clip.duration*i/60;mixer.update(0);g.scene.updateMatrixWorld(true);for(const suffix of ['Neck','Head']){const n='mixamorig'+suffix,q=bones[n].getWorldQuaternion(new T.Quaternion()).multiply(rest[n].clone().invert()),e=new T.Euler().setFromQuaternion(q,'YXZ');for(const [k,key]of ['x','y','z'].entries())maxima[suffix][k]=Math.max(maxima[suffix][k],Math.abs(e[key]*180/Math.PI));}}
  for(const suffix of ['Neck','Head']){const limits=suffix==='Neck'?[15,30,6]:[10,25,8];if(maxima[suffix].some((v,i)=>v>limits[i]+.2))throw Error(`Aim head limit failed ${id} ${clip.name} ${suffix}`);}
  rows.push({clip:clip.name,sampled_frames:61,max_abs_pitch_yaw_roll_degrees:maxima});
 }
 report[id]={clips:rows.length,sampled_frames:rows.length*61,rows};
}
fs.writeFileSync('assets/characters/resistance_r46/head-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([id,v])=>[id,{clips:v.clips,frames:v.sampled_frames}]))));
