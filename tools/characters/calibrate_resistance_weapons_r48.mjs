/** Reconstruct the final Diandian grip, including its runtime finger articulation.
 * Run from repository root: node tools/characters/calibrate_resistance_weapons_r48.mjs
 * Does not overwrite the deployed attachment config. Native bone lengths/scales remain unchanged.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import { setup, read } from '../qa/validate_pf89.mjs';
import { sampleReferenceQuaternion, sampleReferenceVector, applyReferenceGrip } from '../../web/motion-labs/resistance-motion-lab/reference-grip.js';
const baseline='assets/characters/resistance_r47/weapon_attachment.json';
const out=JSON.parse(fs.readFileSync(baseline)),source=await setup('diandian');
const hz=30,toleranceDegrees=.25,Q=a=>new T.Quaternion().fromArray(a).normalize();
const calibrations=Object.fromEntries(Object.keys(out.characters).map(cid=>[cid,JSON.parse(fs.readFileSync(`assets/characters/resistance_r47/${cid}/retarget_calibration.json`))]));
const allSamples={version:1,source:'Final runtime Diandian poses',sampleRate:hz,adaptiveRefinementRate:60,keyReductionToleranceDegrees:toleranceDegrees,characters:{}};
const report={source:'web/motion-labs/diandian-classic-motion-lab',sampleRate:hz,verificationRate:60,keyReductionToleranceDegrees:toleranceDegrees,rows:[]};
const targetLandmarks={};
for(const cid of Object.keys(out.characters)){
 const root=(await read(`assets/characters/resistance_r47/${cid}/character.glb`)).scene;root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root),bones={};root.traverse(b=>{if(b.isBone)bones[b.userData.name||b.name]=b;});
 targetLandmarks[cid]={target_middle_native:bones['mixamorig:LeftHand'].worldToLocal(bones['mixamorig:LeftHandMiddle1'].getWorldPosition(new T.Vector3())).toArray(),preview_scale:1.75/(box.max.y-box.min.y)};
}
function sourceMiddle(){const gun=source.attachment.weapons.get(source.attachment.selectedWeapon),p=gun.worldToLocal(source.model.bones.get('mixamorig:LeftHandMiddle1').getWorldPosition(new T.Vector3()));p.z-=source.attachment.getState().pumpTravelM||0;return p;}
function reduceVectors(times,vs){
 const tolerance=.00025;if(vs.every(v=>v.distanceTo(vs[0])<=tolerance))return {times:[0],values:vs[0].toArray()};
 const keep=new Set([0,times.length-1]);
 function split(a,b){let max=tolerance,index=-1;for(let i=a+1;i<b;i++){const err=vs[a].clone().lerp(vs[b],(times[i]-times[a])/(times[b]-times[a])).distanceTo(vs[i]);if(err>max){max=err;index=i;}}if(index>=0){keep.add(index);split(a,index);split(index,b);}}
 split(0,times.length-1);const ix=[...keep].sort((a,b)=>a-b);return {times:ix.map(i=>times[i]),values:ix.flatMap(i=>vs[i].toArray())};
}
const sourceFiles=['web/motion-labs/diandian-classic-motion-lab/assets/diandian_fixed.glb','web/motion-labs/diandian-classic-motion-lab/assets/weapon_attachment.json','web/motion-labs/diandian-classic-motion-lab/weapon-attachment.js',baseline,...Object.keys(out.characters).flatMap(cid=>[`assets/characters/resistance_r47/${cid}/retarget_calibration.json`,`assets/characters/resistance_r47/${cid}/character.glb`])];
report.sourceHashes=Object.fromEntries(sourceFiles.map(path=>[path,createHash('sha256').update(fs.readFileSync(path)).digest('hex')]));
const names=['Right','Left'].flatMap(side=>[`${side}Hand`,...['Thumb','Index','Middle','Ring','Pinky'].flatMap(d=>[1,2,3].map(j=>`mixamorig:${side}Hand${d}${j}`))]);
function capture(cid){
 const cal=calibrations[cid],inv=source.attachment.weapons.get(source.attachment.selectedWeapon).getWorldQuaternion(new T.Quaternion()).invert(),values={};
 for(const key of names){const name=key.startsWith('mixamorig:')?key:'mixamorig:'+key,bone=source.model.bones.get(name),c=Q(cal.bones[name].source_to_target_local_rotation);
  if(key.endsWith('Hand'))values[key]=inv.clone().multiply(bone.getWorldQuaternion(new T.Quaternion())).multiply(c.invert()).normalize();
  else {const parentName=bone.parent.userData.name||bone.parent.name,cp=Q(cal.bones[parentName].source_to_target_local_rotation);values[key]=cp.multiply(bone.quaternion).multiply(c.invert()).normalize();}
 }return values;
}
function reduce(times,qs){
 const error=(a,b)=>T.MathUtils.radToDeg(a.angleTo(b));
 if(qs.every(q=>error(qs[0],q)<=toleranceDegrees))return {times:[0],values:qs[0].toArray()};
 const keep=new Set([0,times.length-1]);
 function split(a,b){let max=toleranceDegrees,index=-1;for(let i=a+1;i<b;i++){const q=qs[a].clone().slerp(qs[b],(times[i]-times[a])/(times[b]-times[a])),e=error(q,qs[i]);if(e>max){max=e;index=i;}}if(index>=0){keep.add(index);split(a,index);split(index,b);}}
 split(0,times.length-1);const indices=[...keep].sort((a,b)=>a-b);return {times:indices.map(i=>times[i]),values:indices.flatMap(i=>qs[i].toArray())};
}
const payloads={};
for(const wid of Object.keys(out.weapons)){
 const sourceMotions=['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(wid==='type97hawk'?['ShotgunPump']:[])];
 for(const motion of sourceMotions){
  const actual=source.cfg.weapons[wid].animation_overrides?.[motion]||motion,duration=source.model.actions.get(actual).getClip().duration;
  const frames=Math.ceil(duration*hz),times=Array.from({length:frames+1},(_,i)=>duration*i/frames);
  const sampled=Object.fromEntries(Object.keys(out.characters).map(cid=>[cid,Object.fromEntries(names.map(n=>[n,[]]))]));
  const middleSamples=[];
  for(const time of times){source.pose(motion,time,wid);middleSamples.push(sourceMiddle());for(const cid of Object.keys(out.characters))for(const [name,q]of Object.entries(capture(cid)))sampled[cid][name].push(q);}
  for(const cid of Object.keys(out.characters)){
   const payload={duration,left_middle_reference:{...targetLandmarks[cid],track:reduceVectors(times,middleSamples),pump_travel_removed:true},tracks:Object.fromEntries(names.map(name=>[name,reduce(times,sampled[cid][name])]))};
   (payloads[cid]??={})[wid]??={};payloads[cid][wid][motion]=payload;
  }
  const rows=Object.fromEntries(Object.keys(out.characters).map(cid=>[cid,{cid,weapon:wid,motion,duration,maxHandErrorDegrees:0,maxFingerErrorDegrees:0,keys:Object.values(payloads[cid][wid][motion].tracks).reduce((n,t)=>n+t.times.length,0),unreducedKeys:names.length*times.length}]));
  const verifyFrames=Math.ceil(duration*60),verifyTimes=Array.from({length:verifyFrames+1},(_,i)=>duration*i/verifyFrames);
  const verified=Object.fromEntries(Object.keys(out.characters).map(cid=>[cid,Object.fromEntries(names.map(n=>[n,[]]))]));
  const middleVerified=[];
  for(let i=0;i<=verifyFrames;i++){const time=duration*i/verifyFrames;source.pose(motion,time,wid);middleVerified.push(sourceMiddle());for(const cid of Object.keys(out.characters)){const expected=capture(cid),row=rows[cid];for(const name of names){verified[cid][name].push(expected[name]);const err=T.MathUtils.radToDeg(sampleReferenceQuaternion(payloads[cid][wid][motion].tracks[name],time).angleTo(expected[name]));const key=name.endsWith('Hand')?'maxHandErrorDegrees':'maxFingerErrorDegrees';row[key]=Math.max(row[key],err);}}}
  for(const cid of Object.keys(out.characters)){
   const row=rows[cid],payload=payloads[cid][wid][motion];row.initial30HzHandErrorDegrees=row.maxHandErrorDegrees;row.initial30HzFingerErrorDegrees=row.maxFingerErrorDegrees;row.refined60HzTracks=0;
   for(const name of names){const expected=verified[cid][name],max=Math.max(...verifyTimes.map((time,i)=>T.MathUtils.radToDeg(sampleReferenceQuaternion(payload.tracks[name],time).angleTo(expected[i]))));
    if(max>toleranceDegrees+1e-6){payload.tracks[name]=reduce(verifyTimes,expected);row.refined60HzTracks++;}
   }
   row.maxHandErrorDegrees=0;row.maxFingerErrorDegrees=0;
   for(const name of names)for(let i=0;i<verifyTimes.length;i++){const error=T.MathUtils.radToDeg(sampleReferenceQuaternion(payload.tracks[name],verifyTimes[i]).angleTo(verified[cid][name][i])),key=name.endsWith('Hand')?'maxHandErrorDegrees':'maxFingerErrorDegrees';row[key]=Math.max(row[key],error);}
   const landmark=payload.left_middle_reference;
   row.initial30HzMiddleErrorM=Math.max(...verifyTimes.map((time,i)=>sampleReferenceVector(landmark.track,time).distanceTo(middleVerified[i])));
   if(row.initial30HzMiddleErrorM>.00025)landmark.track=reduceVectors(verifyTimes,middleVerified);
   row.maxMiddleErrorM=Math.max(...verifyTimes.map((time,i)=>sampleReferenceVector(landmark.track,time).distanceTo(middleVerified[i])));
   row.middleKeys=landmark.track.times.length;
   row.keys=Object.values(payload.tracks).reduce((n,t)=>n+t.times.length,0);
  }
  report.rows.push(...Object.values(rows));console.log(wid,motion,JSON.stringify(Object.values(rows).map(r=>({cid:r.cid,hand:r.maxHandErrorDegrees,finger:r.maxFingerErrorDegrees,keys:r.keys}))));
 }
}
for(const [cid,char]of Object.entries(out.characters))for(const [wid,base]of Object.entries(char.mounts))for(const [motion,m]of [['RifleIdle',base],...Object.entries(base.motions)]){
 const sourceMotion=motion==='Type97Fire'?'FiringRifle':motion==='Type97Pump'?'ShotgunPump':motion,payload=payloads[cid][wid][sourceMotion];if(!payload)continue;
 m.reference_grip=payload;applyReferenceGrip(m,payload.duration*.37);
 for(const key of ['right_thumb_target_weapon','left_thumb_target_weapon','right_index_target_weapon','right_finger_directions_weapon','support_finger_directions_weapon','right_finger_quaternion_offsets','support_finger_quaternion_offsets'])delete m[key];
}
out.revision='R48 source-reference grip rotation and finger tracks';
allSamples.characters=payloads;
report.maxMiddleErrorM=Math.max(...report.rows.map(r=>r.maxMiddleErrorM));
report.maxHandErrorDegrees=Math.max(...report.rows.map(r=>r.maxHandErrorDegrees));report.maxFingerErrorDegrees=Math.max(...report.rows.map(r=>r.maxFingerErrorDegrees));
fs.mkdirSync('work/r48',{recursive:true});fs.writeFileSync('work/r48/generated_weapon_attachment.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync('web/motion-labs/resistance-motion-lab/assets/reference_grip_samples.json',JSON.stringify(allSamples)+'\n');
fs.writeFileSync('work/r48/reference-grip-reconstruction.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({maxHandErrorDegrees:report.maxHandErrorDegrees,maxFingerErrorDegrees:report.maxFingerErrorDegrees}));
