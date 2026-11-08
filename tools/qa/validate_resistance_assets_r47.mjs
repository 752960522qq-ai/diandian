import fs from 'node:fs';
import * as T from 'three';
import {read,decode,encode} from './validate_pf89.mjs';
const root='assets/characters/resistance_r47',report={characters:{}};
fs.mkdirSync('work/resistance-r47',{recursive:true});
for(const id of ['military','vest']){
 const {g,bin}=decode(`${root}/${id}/character.glb`),{g:mg,bin:mb}=decode(`${root}/${id}/motions.glb`);
 const target=await read(`${root}/${id}/character.glb`),motions=await read(`${root}/${id}/motions.glb`),mix=new T.AnimationMixer(target.scene),bones={};target.scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});
 const lengths=new Map(Object.values(bones).map(b=>[b,b.position.length()]));let unresolved=0,nonFinite=0,maxLengthDrift=0,minFloor=Infinity,samples=0;const detail=[];
 for(const c of motions.animations){for(const t of c.tracks){const b=T.PropertyBinding.parseTrackName(t.name);if(!target.scene.getObjectByName(b.nodeName))unresolved++;if(!Array.from(t.values).every(Number.isFinite))nonFinite++;}mix.stopAllAction();const a=mix.clipAction(c).reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();let floor=Infinity;const clearance={Left:Infinity,Right:Infinity};const checkClearance=['Idle','Walk','Run','WalkingBackwards'].includes(c.name),steps=checkClearance?60:8;
  for(let i=0;i<=steps;i++){a.time=c.duration*i/steps;mix.update(0);target.scene.updateMatrixWorld(true);for(const [b,l]of lengths)if(!b.name.includes('Hips'))maxLengthDrift=Math.max(maxLengthDrift,Math.abs(l-b.position.length()));target.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});const box=new T.Box3().setFromObject(target.scene);floor=Math.min(floor,box.min.y);samples++;
   if(checkClearance)for(const side of ['Left','Right']){const pos=suffix=>target.scene.getObjectByName('mixamorig'+side+suffix).getWorldPosition(new T.Vector3());const palm=pos('HandMiddle1').lerp(pos('Hand'),.35);for(const [start,end]of [['UpLeg','Leg'],['Leg','Foot']])clearance[side]=Math.min(clearance[side],new T.Line3(pos(start),pos(end)).closestPointToPoint(palm,true,new T.Vector3()).distanceTo(palm));}}
  detail.push({name:c.name,duration:c.duration,tracks:c.tracks.length,min_sampled_floor_m:floor,...(checkClearance?{minimum_palm_to_leg_axis_m:clearance}:{})});if(!['ClimbingLadder','HangToCrouch','SittingCrossLegged','SittingTalking'].includes(c.name))minFloor=Math.min(minFloor,floor);
 }
 if(unresolved||nonFinite||maxLengthDrift>1e-6||motions.animations.length!==33||minFloor<-.001)throw Error(`Validation failed ${id}`);
 const ao=g.accessors.length,vo=g.bufferViews.length;g.bufferViews.push(...mg.bufferViews.map(v=>({...v,byteOffset:(v.byteOffset||0)+bin.length})));g.accessors.push(...mg.accessors.map(a=>({...a,bufferView:a.bufferView+vo})));g.animations=mg.animations.map(a=>({...a,samplers:a.samplers.map(s=>({...s,input:s.input+ao,output:s.output+ao}))}));g.buffers=[{byteLength:bin.length+mb.length}];fs.writeFileSync(`work/resistance-r47/${id}-animated.glb`,encode(g,Buffer.concat([bin,mb])));
 report.characters[id]={clips:motions.animations.length,samples,unresolved_tracks:unresolved,non_finite_tracks:nonFinite,max_nonroot_local_length_drift:maxLengthDrift,minimum_grounded_clip_sample_m:minFloor,detail};
}
fs.writeFileSync(`${root}/validation.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.characters,(k,v)=>k==='detail'?undefined:v,2));
