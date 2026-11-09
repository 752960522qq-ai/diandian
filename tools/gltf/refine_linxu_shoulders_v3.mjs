/** Lift only empty-handed clavicles, counter-rotate upper arms to retain gait.
 * Run from repository root. Never modifies source, mesh, bind pose or scale. */
import fs from 'node:fs';
import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
const source='assets/characters/linxu_motion_v2',root='assets/characters/linxu_motion_v3';
fs.mkdirSync(root,{recursive:true});fs.mkdirSync('work/linxu-motion-v3',{recursive:true});
const model=await read('assets/characters/linxu_motion/character.glb'),pack=await read(source+'/motions.glb'),bones={};
model.scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});
const rest=new Map(Object.values(bones).map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}]));
const {g,bin:input}=decode(source+'/motions.glb'),bin=Buffer.from(input);
const report={source:source+'/motions.glb',method:'Animated torso-relative clavicle elevation with exact world upper-arm orientation compensation. Bone lengths, mesh, scales, original timing and gait unchanged.',clips:{}};
const names=['LeftShoulder','RightShoulder','LeftArm','RightArm'].map(n=>'mixamorig'+n);
for(const name of ['Idle','Walk','Run']){
 const clip=pack.animations.find(c=>c.name===name),animation=g.animations.find(a=>a.name===name),times=clip.tracks.find(t=>t.name===names[0]+'.quaternion').times,values=Object.fromEntries(names.map(n=>[n,[]]));
 const degrees={Idle:8,Walk:8,Run:6}[name],openDegrees={Idle:4,Walk:4,Run:2}[name],metrics={liftDegrees:degrees,openDegrees,samples:times.length,duration:clip.duration,minShoulderLiftM:Infinity,maxShoulderLiftM:-Infinity,maxArmWorldOrientationDeltaDegrees:0,before:{width:[],slope:[]},after:{width:[],slope:[]}};
 const pos=n=>bones['mixamorig'+n].getWorldPosition(new T.Vector3());
 for(const time of times){
  for(const[b,r]of rest){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}
  for(const t of clip.tracks){const[n,p]=t.name.split('.');bones[n]?.[p]?.fromArray(t.createInterpolant().evaluate(time));}
  model.scene.updateMatrixWorld(true);
  const x=pos('LeftShoulder').sub(pos('RightShoulder')).normalize(),y=pos('Neck').sub(pos('Hips')).normalize(),z=new T.Vector3().crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
  const measure=key=>{metrics[key].width.push(pos('LeftArm').sub(pos('RightArm')).dot(x));for(const side of ['Left','Right']){const v=pos(side+'Arm').sub(pos(side+'Shoulder'));metrics[key].slope.push(Math.asin(T.MathUtils.clamp(v.dot(y)/v.length(),-1,1))*180/Math.PI);}};
  measure('before');
  for(const side of ['Left','Right']){
   const shoulder=bones['mixamorig'+side+'Shoulder'],arm=bones['mixamorig'+side+'Arm'],before=pos(side+'Arm'),world=arm.getWorldQuaternion(new T.Quaternion());
   const q=shoulder.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(z,(side==='Left'?1:-1)*degrees*Math.PI/180)).premultiply(new T.Quaternion().setFromAxisAngle(y,(side==='Left'?-1:1)*openDegrees*Math.PI/180));
   shoulder.quaternion.copy(shoulder.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q).normalize());model.scene.updateMatrixWorld(true);
   arm.quaternion.copy(arm.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world).normalize());model.scene.updateMatrixWorld(true);
   const lift=pos(side+'Arm').sub(before).dot(y);metrics.minShoulderLiftM=Math.min(metrics.minShoulderLiftM,lift);metrics.maxShoulderLiftM=Math.max(metrics.maxShoulderLiftM,lift);metrics.maxArmWorldOrientationDeltaDegrees=Math.max(metrics.maxArmWorldOrientationDeltaDegrees,world.clone().normalize().angleTo(arm.getWorldQuaternion(new T.Quaternion()).normalize())*180/Math.PI);
  }
  measure('after');
  for(const n of names){const q=bones[n].quaternion.clone(),a=values[n];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}
 }
 for(const key of ['before','after'])for(const field of ['width','slope']){const a=metrics[key][field];metrics[key][field]={min:Math.min(...a),max:Math.max(...a),mean:a.reduce((a,b)=>a+b,0)/a.length};}
 for(const n of names){const ch=animation.channels.find(c=>g.nodes[c.target.node].name.replaceAll(':','')===n&&c.target.path==='rotation'),a=g.accessors[animation.samplers[ch.sampler].output],v=g.bufferViews[a.bufferView];if(a.count*4!==values[n].length)throw Error('Sample mismatch');for(let i=0;i<a.count;i++)for(let k=0;k<4;k++)bin.writeFloatLE(values[n][i*4+k],(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||16)+k*4);}
 report.clips[name]=metrics;
}
fs.writeFileSync(root+'/motions.glb',encode(g,bin));
const after=(await read(root+'/motions.glb')).animations;report.changedTracks={};report.unchangedClips=[];
for(const c of pack.animations){const n=after.find(a=>a.name===c.name);if(c.duration!==n.duration||c.tracks.length!==n.tracks.length)throw Error('Structure changed');const changed=[];for(const t of c.tracks){const nt=n.tracks.find(t2=>t2.name===t.name);if(t.times.some((v,i)=>v!==nt.times[i]))throw Error('Timing changed');if(t.values.some((v,i)=>v!==nt.values[i])){if(!report.clips[c.name]||!names.some(n=>t.name===n+'.quaternion'))throw Error('Unrelated track changed');changed.push(t.name);}}if(changed.length)report.changedTracks[c.name]=changed;else report.unchangedClips.push(c.name);}
fs.writeFileSync(root+'/shoulder_report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
