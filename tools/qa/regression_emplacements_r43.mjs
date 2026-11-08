// Compare the existing character/weapon behavior against the published R42 source.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL}from'node:url';import *as T from'three';
import{setup,read}from'./validate_pf89.mjs';
const report={baseline:'Published R42 Sites source',characters:{}};
for(const cid of ['diandian','zhigeng']){
 const baselineDir=path.resolve(`work/r42-publish/${cid}/dist`);assert(fs.existsSync(baselineDir),'Retain the published R42 source for regression');
 const old=await setup(cid),current=await setup(cid),cfg=JSON.parse(fs.readFileSync(baselineDir+'/assets/weapon_attachment.json'));
 const cleaned=structuredClone(current.cfg);delete cleaned.revision;delete cleaned.weapons.qjz89;for(const character of Object.values(cleaned.characters))delete character.mounts.qjz89;
 const baselineCfg=structuredClone(cfg);delete baselineCfg.revision;assert.deepEqual(cleaned,baselineCfg);
 const weaponScenes=new Map();for(const id of Object.keys(cfg.weapons))weaponScenes.set(id,(await read(`${baselineDir}/assets/weapons/${id}.glb`)).scene);
 const {WeaponAttachment}=await import(pathToFileURL(baselineDir+'/weapon-attachment.js'));old.attachment.dispose();
 const attachment=new WeaponAttachment(old.model,cfg,cid,weaponScenes,old.scene);
 old.pose=(motion,time,weapon)=>{attachment.beforeAnimation();old.model.mixer.stopAllAction();attachment.setWeapon(weapon);const name=cfg.weapons[weapon].animation_overrides?.[motion]||motion,action=old.model.actions.get(name);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=time;old.model.mixer.update(0);old.scene.updateMatrixWorld(true);attachment.update(motion,time,{activeClips:[{name,weight:1}]});old.scene.updateMatrixWorld(true);return attachment.getState();};
 for(const rt of [old,current])for(const clip of (await read(`${rt.dir}/assets/uploaded_motions.glb`)).animations)rt.model.actions.set(clip.name,rt.model.mixer.clipAction(clip));
 const snapshot=rt=>[...new Set(rt.model.bones.values())].flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
 let count=0,maxDelta=0;
 for(const weapon of Object.keys(cfg.weapons))for(const motion of ['Idle','RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','PistolIdle','PistolAimingIdle','PistolWalk','PistolShooting','WalkingBackwards']){
  const name=cfg.weapons[weapon].animation_overrides?.[motion]||motion;if(!old.model.actions.has(name))continue;
  const duration=old.model.actions.get(name).getClip().duration;
  for(const time of [0,duration*.37,duration]){
   const beforeState=old.pose(motion,time,weapon),afterState=current.pose(motion,time,weapon),a=snapshot(old),b=snapshot(current);
   const error=Math.max(...a.map((v,i)=>Math.abs(v-b[i])));assert(error<1e-10,`${cid}/${weapon}/${motion}/${time} pose drift ${error}`);maxDelta=Math.max(maxDelta,error);assert.deepEqual(afterState,beforeState);count++;
  }
 }
 report.characters[cid]={weapons:Object.keys(cfg.weapons).length,sampledPoses:count,maxDelta,configurationUnchanged:true};console.log('R43_REGRESSION_PASS',cid,count,maxDelta);
}
fs.writeFileSync('web/motion-labs/verification_r43/regression.json',JSON.stringify(report,null,2)+'\n');
