// Reusable R47 -> R48 correction for EMPTY-HANDED Idle only.
// Lift clavicles in the animated torso frame, preserving world arm orientation.
// No bind-pose, mesh, translation, timing, or other-clip edits.
import fs from 'node:fs';
import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
const source='assets/characters/resistance_r47',root='assets/characters/resistance_r48';
const liftDegrees=Number(process.env.IDLE_SHOULDER_LIFT_DEGREES||8);
const report={source,clip:'Idle',liftDegrees,method:'Torso-relative clavicle elevation; compensate upper-arm local rotations to preserve R47 world arm orientations.',characters:{}};
for(const id of ['military','vest']){
 const dir=`${root}/${id}`;fs.mkdirSync(dir,{recursive:true});
 for(const name of ['character.glb','retarget_calibration.json'])fs.copyFileSync(`${source}/${id}/${name}`,`${dir}/${name}`);
 const model=await read(`${dir}/character.glb`),pack=await read(`${source}/${id}/motions.glb`),mixer=new T.AnimationMixer(model.scene),bones={};
 model.scene.traverse(o=>{if(o.isBone)bones[o.userData.name||o.name]=o;});
 const {g,bin:input}=decode(`${source}/${id}/motions.glb`),bin=Buffer.from(input),animation=g.animations.find(a=>a.name==='Idle'),clip=pack.animations.find(c=>c.name==='Idle');
 const action=mixer.clipAction(clip).reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
 const names=['LeftShoulder','RightShoulder','LeftArm','RightArm'].map(n=>'mixamorig:'+n),values=Object.fromEntries(names.map(n=>[n,[]]));
 const times=clip.tracks.find(t=>t.name==='mixamorigLeftShoulder.quaternion').times;
 const metrics={samples:times.length,shoulderLiftNativeM:{min:Infinity,max:-Infinity},maxArmWorldOrientationDeltaDegrees:0};
 for(const time of times){
  action.time=time;mixer.update(0);
  for(const t of clip.tracks){const [n,property]=t.name.split('.');const bone=model.scene.getObjectByName(n);if(bone?.[property]?.fromArray)bone[property].fromArray(t.createInterpolant().evaluate(time));}
  model.scene.updateMatrixWorld(true);
  const position=n=>bones['mixamorig:'+n].getWorldPosition(new T.Vector3());
  const x=position('LeftShoulder').sub(position('RightShoulder')).normalize(),y=position('Neck').sub(position('Hips')).normalize(),z=new T.Vector3().crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
  for(const side of ['Left','Right']){
   const shoulder=bones[`mixamorig:${side}Shoulder`],arm=bones[`mixamorig:${side}Arm`],before=position(side+'Arm'),armWorld=arm.getWorldQuaternion(new T.Quaternion());
   const q=shoulder.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(z,(side==='Left'?1:-1)*liftDegrees*Math.PI/180));
   shoulder.quaternion.copy(shoulder.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q).normalize());model.scene.updateMatrixWorld(true);
   arm.quaternion.copy(arm.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(armWorld).normalize());model.scene.updateMatrixWorld(true);
   const lift=position(side+'Arm').sub(before).dot(y);metrics.shoulderLiftNativeM.min=Math.min(metrics.shoulderLiftNativeM.min,lift);metrics.shoulderLiftNativeM.max=Math.max(metrics.shoulderLiftNativeM.max,lift);
   metrics.maxArmWorldOrientationDeltaDegrees=Math.max(metrics.maxArmWorldOrientationDeltaDegrees,armWorld.angleTo(arm.getWorldQuaternion(new T.Quaternion()))*180/Math.PI);
  }
  for(const n of names){const q=bones[n].quaternion.clone(),a=values[n];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}
 }
 for(const n of names){const channel=animation.channels.find(c=>g.nodes[c.target.node].name===n&&c.target.path==='rotation'),sampler=animation.samplers[channel.sampler],a=g.accessors[sampler.output],view=g.bufferViews[a.bufferView];if(a.type!=='VEC4'||a.componentType!==5126||a.count*4!==values[n].length)throw Error('Unexpected rotation accessor');const offset=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||16;for(let i=0;i<a.count;i++)for(let k=0;k<4;k++)bin.writeFloatLE(values[n][i*4+k],offset+i*stride+k*4);}
 fs.writeFileSync(`${dir}/motions.glb`,encode(g,bin));
 const corrected=(await read(`${dir}/motions.glb`)).animations;let unchanged=0;const changed=[];
 for(const old of pack.animations){const next=corrected.find(c=>c.name===old.name);if(!next||old.duration!==next.duration||old.tracks.length!==next.tracks.length)throw Error('Clip changed structure');let any=false;for(const t of old.tracks){const nt=next.tracks.find(v=>v.name===t.name);if(!nt||t.times.some((v,i)=>v!==nt.times[i]))throw Error('Key times changed');if(t.values.some((v,i)=>v!==nt.values[i])){any=true;if(old.name!=='Idle'||!names.some(n=>t.name===n.replace(':','')+'.quaternion'))throw Error('Unrelated channel changed');changed.push(t.name);}}if(!any)unchanged++;}
 if(unchanged!==32||changed.length!==4)throw Error('Unexpected edit scope');
 report.characters[id]={...metrics,unchangedClips:unchanged,changedTracks:changed,meshRigCalibrationByteIdentical:true};
 // Combine solely for reproducible visual QA, not production delivery.
 for(const version of ['r47','r48']){
  const {g:cg,bin:cb}=decode(`assets/characters/resistance_${version}/${id}/character.glb`),{g:mg,bin:mb}=decode(`assets/characters/resistance_${version}/${id}/motions.glb`),ao=cg.accessors.length,vo=cg.bufferViews.length;
  cg.bufferViews.push(...mg.bufferViews.map(v=>({...v,byteOffset:(v.byteOffset||0)+cb.length})));cg.accessors.push(...mg.accessors.map(a=>({...a,bufferView:a.bufferView+vo})));cg.animations=mg.animations.filter(a=>a.name==='Idle').map(a=>({...a,samplers:a.samplers.map(s=>({...s,input:s.input+ao,output:s.output+ao}))}));cg.buffers=[{byteLength:cb.length+mb.length}];fs.writeFileSync(`work/resistance-r48/${id}-${version}-idle.glb`,encode(cg,Buffer.concat([cb,mb])));
 }
}
fs.writeFileSync(`${root}/idle-report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
