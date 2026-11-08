// Retain the R41 library; replace only WalkingBackwards arms and PistolShooting.
// node tools/gltf/refine_motion_r42.mjs
import fs from 'node:fs';
import * as THREE from 'three';
import {setup,read,decode,encode} from '../qa/validate_pf89.mjs';

const root=new URL('../../',import.meta.url).pathname;
const destination=root+'assets/animations/motion_lab_r42';
const tuning={diandian:{Left:5,Right:11},zhigeng:{Left:5,Right:10}};
const degrees=10.5;
const duration=1.1666666666666667;
export function recoilAt(t) {
 if(t<=.1||t>=.65)return 0;
 if(t<.18)return THREE.MathUtils.smoothstep(t,.1,.18);
 return 1-THREE.MathUtils.smoothstep(t,.18,.65);
}

for(const cid of ['diandian','zhigeng']) {
 const rt=await setup(cid),model=rt.model;
 const source=`${root}assets/animations/motion_lab_r41/${cid}/uploaded_motions.glb`;
 const pack=await read(source);for(const clip of pack.animations)model.actions.set(clip.name,model.mixer.clipAction(clip));
 const {g,bin}=decode(source);let chunks=[bin],length=bin.length;
 function append(values,type) {
  const width={SCALAR:1,VEC3:3,VEC4:4}[type],bytes=Buffer.alloc(values.length*4);
  values.forEach((v,i)=>bytes.writeFloatLE(v,i*4));
  const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
  const view=g.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length})-1;chunks.push(bytes);length+=bytes.length;
  const count=values.length/width;
  const min=Array.from({length:width},(_,j)=>Math.min(...Array.from({length:count},(_,i)=>values[i*width+j])));
  const max=Array.from({length:width},(_,j)=>Math.max(...Array.from({length:count},(_,i)=>values[i*width+j])));
  return g.accessors.push({bufferView:view,componentType:5126,count,type,min,max})-1;
 }
 function values(accessor) {
  const a=g.accessors[accessor],v=g.bufferViews[a.bufferView],width={SCALAR:1,VEC3:3,VEC4:4}[a.type],start=v.byteOffset+(a.byteOffset||0);
  return Array.from({length:a.count*width},(_,i)=>bin.readFloatLE(start+i*4));
 }
 function rawPose(name,time) {
  rt.attachment.beforeAnimation();model.mixer.stopAllAction();const action=model.actions.get(name);
  action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=time;model.mixer.update(0);rt.scene.updateMatrixWorld(true);
 }
 const bone=n=>model.bones.get('mixamorig:'+n);
 const pos=n=>bone(n).getWorldPosition(new THREE.Vector3());
 function worldTurn(name,axis,radians) {
  const b=bone(name),q=new THREE.Quaternion().setFromAxisAngle(axis,radians).multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).normalize();b.updateMatrixWorld(true);
 }
 const walking=g.animations.find(a=>a.name==='WalkingBackwards');
 for(const side of ['Left','Right']) {
  const channel=walking.channels.find(c=>g.nodes[c.target.node].name===`mixamorig:${side}Arm`&&c.target.path==='rotation');
  const sampler=walking.samplers[channel.sampler],times=values(sampler.input),rotations=[];
  for(const t of times) {
   rawPose('WalkingBackwards',t);
   const axis=pos('LeftArm').sub(pos('RightArm')).normalize().cross(pos('Head').sub(pos('Hips')).normalize()).normalize();
   worldTurn(side+'Arm',axis,THREE.MathUtils.degToRad(tuning[cid][side]*(side==='Left'?1:-1)));
   rotations.push(...bone(side+'Arm').quaternion.toArray());
  }
  sampler.output=append(rotations,'VEC4');
 }
 const shooting=g.animations.find(a=>a.name==='PistolShooting');
 shooting.samplers=[];shooting.channels=[];
 const names=g.nodes.filter(n=>n.name?.startsWith('mixamorig:')).map(n=>n.name);
 // Zhigeng's original aiming pose has a fitted ponytail-root orientation.
 // Retain it so entering/exiting recoil preserves her complete aiming pose.
 if(cid==='zhigeng')names.push('ZG_Ponytail_01');
 const frames=70,times=Array.from({length:frames+1},(_,i)=>i/60),input=append(times,'SCALAR');
 const rotations=Object.fromEntries(names.map(n=>[n,[]])),positions=[];
 for(const t of times) {
  // Original PistolAimingIdle resolves to the model's PistolIdle, not Leon idle.
  rawPose('PistolIdle',0);
  const axis=pos('RightArm').sub(pos('LeftArm')).normalize(),angle=THREE.MathUtils.degToRad(degrees*recoilAt(t));
  for(const side of ['Right','Left']) {
   worldTurn(side+'Arm',axis,angle*.35);
   worldTurn(side+'ForeArm',axis,angle*.65);
  }
  for(const n of names)rotations[n].push(...model.bones.get(n).quaternion.toArray());
  positions.push(...bone('Hips').position.toArray());
 }
 function channel(name,property,data,type) {
  const node=g.nodes.findIndex(n=>n.name===name),sampler=shooting.samplers.length;
  shooting.samplers.push({input,output:append(data,type),interpolation:'LINEAR'});
  shooting.channels.push({sampler,target:{node,path:property}});
 }
 for(const n of names)channel(n,'rotation',rotations[n],'VEC4');
 channel('mixamorig:Hips','translation',positions,'VEC3');
 shooting.extras={source:'Original character PistolIdle (PistolAimingIdle in the preview)',base_sample_seconds:0,recoil_peak_degrees:degrees,recoil_peak_seconds:.18,recoil_end_seconds:.65,duration_seconds:duration,rotation_tracks:names.length};
 walking.extras={...walking.extras,r42_arm_abduction_degrees:tuning[cid]};
 g.buffers=[{byteLength:length}];
 const out=destination+'/'+cid;fs.mkdirSync(out,{recursive:true});const output=out+'/uploaded_motions.glb';
 fs.writeFileSync(output,encode(g,Buffer.concat(chunks)));fs.copyFileSync(output,rt.dir+'/assets/uploaded_motions.glb');
 const report={character:cid,walking:{source:'R41 WalkingBackwards',changed_tracks:['LeftArm.rotation','RightArm.rotation'],outward_degrees:tuning[cid]},shooting:shooting.extras,retained_actions:6};
 fs.writeFileSync(out+'/refinement.json',JSON.stringify(report,null,2)+'\n');
 console.log('R42_EXPORTED',cid,report);
}
const catalog=JSON.parse(fs.readFileSync(root+'assets/animations/motion_lab_r41/catalog.json'));
Object.assign(catalog.find(c=>c.name==='PistolShooting'),{source:'Original PistolAimingIdle + authored recoil',duration});
fs.writeFileSync(destination+'/catalog.json',JSON.stringify(catalog,null,2)+'\n');
