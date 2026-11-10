import fs from'node:fs';import crypto from'node:crypto';import {pathToFileURL}from'node:url';import * as THREE from'three';import{runtime}from'./runtime.mjs';
export async function appHarness(cid,kind){
 const r=await runtime(cid,kind),source=fs.readFileSync(r.dir+'/app.js','utf8');
 const fixed=await import(pathToFileURL(r.dir+'/fixed-machine-gun.js'));fixed.installFixedGunMotions(r.model);
 const uploaded=await import(pathToFileURL(r.dir+'/uploaded-motion.js'));
 const rocket=await import(pathToFileURL(r.dir+'/rocket-motion.js'));
 const catalog=await import(pathToFileURL(r.dir+'/motion-catalog.js'));
 if(cid==='zhigeng'){const{PonytailPhysics}=await import(pathToFileURL(r.dir+'/ponytail-physics.js'));r.model.ponytail=new PonytailPhysics(r.model,JSON.parse(fs.readFileSync(r.dir+'/assets/ponytail_physics.json')));}
 const info=JSON.parse(fs.readFileSync(r.dir+'/assets/rig_info.json'));
 const field=source.match(/const shotgunMotions = \[[\s\S]*?\n\];/)[0];
 const shotguns=new Function(field+';return shotgunMotions;')();
 const motionOptions=Object.fromEntries(catalog.selectableMotions(info.motions,shotguns,rocket.rocketMotions,uploaded.uploadedMotions,fixed.fixedGunMotions).map(m=>[m.name,m]));
 const element={style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},querySelector(){return this;},querySelectorAll(){return [];},lastChild:{},innerHTML:'',textContent:''};
 const state={ready:true,playing:true,speed:1,motion:'Idle',motionFilter:'existing',weapon:'qbz95',lastRifleWeapon:'qbz95',lastPistolWeapon:'qsz92',version:'fixed',time:0,duration:0,aimPitch:0,faceValues:{}};
 const noop=()=>{};let elapsed=0;
 const env={THREE,state,motionOptions,weaponConfig:r.cfg,models:new Map([['fixed',r.model]]),scene:r.scene,
  fixedGunMotionNames:fixed.fixedGunMotionNames,uploadedMotionNames:uploaded.uploadedMotionNames,rocketLabels:rocket.rocketLabels,
  $:()=>element,setActive:noop,updateAimControl:noop,updateComparisonAvailability:noop,updateTimeline:noop,refreshMotionLabels:noop,
  displayMotionLabel:n=>n,frameCamera:noop,applyFace:noop,scrubbing:false,clock:{getDelta:()=>elapsed}};
 const names=['optionsFor','shotgunGroup','actionFor','playbackPlan','durationFor','setModelAction','evaluateModel','activeClips','setMotion','selectWeapon','setAimPitch','setPlaying'];
 if(source.includes('function resetPonytails('))names.push('resetPonytails');
 const extracted=names.map(n=>{const m=source.match(new RegExp('function '+n+'\\([^]*?\\n\\}'));if(!m)throw Error('Missing app function '+n);return m[0];});
 const arrows=['usesPitchAim','isShotgun'].map(n=>source.match(new RegExp('const '+n+' = [^\\n]+'))[0]);
 const begin=source.indexOf('  const elapsedDelta = clock.getDelta();',source.indexOf('function render()'));
 const end=source.indexOf('  if (cameraTransition)',begin);
 const frameBody=source.slice(begin,end);
 const compiled=new Function('env',`with(env){${arrows.join('\n')}\n${extracted.join('\n')}\nfunction frame(){${frameBody}}\nreturn {state,selectWeapon,setMotion,setPlaying,setAimPitch,evaluateModel,activeClips,frame,seek(seconds){state.time=THREE.MathUtils.clamp(seconds,0,state.duration);updateTimeline();if(typeof resetPonytails!=='undefined')resetPonytails();}};}`)(env);
 const frame=dt=>{elapsed=dt;compiled.frame();r.scene.updateMatrixWorld(true);r.model.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});};
 function capture(){
  const bones=[...new Set(r.model.bones.values())].flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
  const weights=[],joints=[];r.model.root.traverse(o=>{if(o.isSkinnedMesh){for(const v of o.geometry.attributes.skinWeight.array)weights.push(v);for(const v of o.geometry.attributes.skinIndex.array)joints.push(v);}});
  const selected=r.attachment.selectedWeapon,gun=r.attachment.weapons.get(selected);
  const pumps=[...r.attachment.pumpParts.map(p=>({...p,category:'primary'})),...r.attachment.type97PumpParts.map(p=>({...p,category:'type97'}))].map(({object,rest,category})=>({category,name:object.name,offset:object.position.clone().sub(rest).toArray()}));
  return {bones,weights,joints,selected,visible:[...r.attachment.weapons].filter(([id,o])=>o.visible).map(([id])=>id),matrix:gun?.visible?[...gun.matrixWorld.elements]:[],pumps,state:{motion:state.motion,playing:state.playing,time:state.time,duration:state.duration,aimPitch:state.aimPitch},chest:r.attachment.chestSkinning.enabled};
 }
 const sourceEvidence={path:r.dir+'/app.js',sha256:crypto.createHash('sha256').update(source).digest('hex'),extractedFunctions:names,frameBodySha256:crypto.createHash('sha256').update(frameBody).digest('hex'),scope:'Executes verbatim app state/mixer functions. UI labels, camera and neutral face display are stubbed; this is not a browser test.'};
 return {...compiled,frame,capture,r,sourceEvidence};
}
