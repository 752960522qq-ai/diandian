import * as T from 'three';
import {setup,read,decode} from '../qa/validate_pf89.mjs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
export const motions=w=>w==='m870'?['RifleIdle','RifleWalk','RifleRun','ShotgunAimLevel','ShotgunAimUp','ShotgunAimDown','FiringRifle','ShotgunPump','Reloading']:['PistolIdle','PistolWalk','PistolAimingIdle','PistolShooting'];
export async function runtime(cid,kind='production',options={}){
 const folder=cid==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab';
 const baselineRoot=path.resolve(options.baselineDirectory||process.env.WEAPON_V6_BASELINE_DIR||path.join(ROOT,'../character_adapt_baseline'));
 const v5Root=path.resolve(options.v5Directory||process.env.WEAPON_V6_V5_DIR||path.join(ROOT,'work/weapon-v6-baselines/v5'));
 const sourceDirectory=options.sourceDirectory||path.join(kind==='production'?ROOT:kind==='baseline'?baselineRoot:kind==='v5'?v5Root:path.resolve(options.candidateDirectory||process.env.WEAPON_V6_CANDIDATE_DIR||path.join(ROOT,'work/weapon_v6_two',kind)),kind==='production'||kind==='baseline'||kind==='v5'?'web/motion-labs':'',folder);
 const r=await setup(cid,{sourceDirectory});
 if(kind==='v5'){const{installCompactPistolRun}=await import(pathToFileURL(r.dir+'/compact-pistol-motion.js'));installCompactPistolRun(r.model);}
 if(kind==='candidate_c'){const{installSourcePistolRun}=await import(pathToFileURL(r.dir+'/source-pistol-motion.js'));installSourcePistolRun(r.model);}
 const uploaded=await read(r.dir+'/assets/uploaded_motions.glb');for(const c of uploaded.animations)r.model.actions.set(c.name,r.model.mixer.clipAction(c));
 const{g}=decode(r.file);r.model.root.traverse(o=>{if(!o.isMesh)return;const a=r.gltf.parser.associations.get(o);if(a?.meshes!=null){const mat=g.meshes[a.meshes].primitives[a.primitives].material;if(mat!=null){o.material=o.material.clone();o.material.name=g.materials[mat].name;}o.geometry.userData.sourcePrimitive={mesh:a.meshes,primitive:a.primitives};}});
 const{ChestSkinningRelief}=await import(pathToFileURL(r.dir+'/chest-skinning.js'));
 r.attachment.chestSkinning=new ChestSkinningRelief(r.model.root,r.attachment.character.chest_skinning_relief);
 r.mapWeapon=w=>kind==='baseline'&&w==='m870'?'winchester1897':kind==='baseline'&&w==='type64'?'type54':w;
 r.clip=(w,m)=>r.cfg.weapons[r.mapWeapon(w)].animation_overrides?.[m]||m;
 const pitchParts=m=>{const[motion,p]=m.split('@');return {motion,pitch:Number(p),group:motion==='FiringRifle'?'ShotgunFire':motion==='ShotgunPump'?'ShotgunPump':'ShotgunAim'};};
 r.duration=(w,m)=>{if(m.includes('@')){const{group}=pitchParts(m);return Math.max(...['Level','Up','Down'].map(e=>r.model.actions.get(group+e).getClip().duration));}return r.model.actions.get(r.clip(w,m)).getClip().duration;};
 r.poseAt=(w,m,t)=>{if(m.includes('@')){const{motion,pitch,group}=pitchParts(m),amount=Math.abs(pitch),duration=r.duration(w,m),plan=[{name:group+'Level',weight:1-amount},{name:group+(pitch<0?'Down':'Up'),weight:amount}].filter(p=>p.weight>0);r.attachment.beforeAnimation();r.model.mixer.stopAllAction();r.attachment.setWeapon(r.mapWeapon(w));for(const p of plan){const a=r.model.actions.get(p.name),loop=motion==='RifleAimingIdle';a.reset().setEffectiveWeight(p.weight).setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);a.clampWhenFinished=!loop;a.play();a.time=duration?t/duration*a.getClip().duration:0;}r.model.mixer.update(0);r.scene.updateMatrixWorld(true);r.attachment.update(motion,t,{aimPitch:pitch,activeClips:plan});r.scene.updateMatrixWorld(true);return {...r.attachment.getState(),aimPitch:pitch,activeClips:plan};}r.attachment.beforeAnimation();r.model.mixer.stopAllAction();w=r.mapWeapon(w);r.attachment.setWeapon(w);const name=r.cfg.weapons[w].animation_overrides?.[m]||m;const action=r.model.actions.get(name);if(!action)throw Error(name);action.reset().setEffectiveWeight(1).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=t;r.model.mixer.update(0);r.scene.updateMatrixWorld(true);r.attachment.update(m,t,{activeClips:[{name,weight:1}],aimPitch:m==='ShotgunAimUp'?1:m==='ShotgunAimDown'?-1:0});r.scene.updateMatrixWorld(true);return r.attachment.getState();};return r;
}
