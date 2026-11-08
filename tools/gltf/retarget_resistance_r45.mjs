/** Retarget the existing motion lab clips to the uploaded resistance rigs.
 * node tools/gltf/retarget_resistance_r45.mjs [military-source] [vest-source]
 * Default inputs are preserved source.glb files, so regeneration needs no uploads.
 * Meshes, inverse bind matrices, materials, original rig scales are preserved.
 */
import fs from 'node:fs';
import {prepareResistanceCharacter} from './repair_resistance_weights_r45.mjs';
import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
import {installType97Motions} from '../../web/motion-labs/diandian-classic-motion-lab/type97-motion.js';
const output='assets/characters/resistance_r45', sourceDir='web/motion-labs/diandian-classic-motion-lab/assets';
const sources={military:process.argv[2]||`${output}/military/source.glb`,vest:process.argv[3]||`${output}/vest/source.glb`};
const basic=['Idle','Walk','Run','Talking','HeadStress'];
const uploaded=['Dying','FlyingBackDeath','SittingTalking','SittingCrossLegged','ClimbingLadder','HangToCrouch','WalkingBackwards'];
const rifle=['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading'];
const nonGround=new Set(['SittingTalking','SittingCrossLegged','ClimbingLadder','HangToCrouch']);
const source=await read(`${sourceDir}/diandian_fixed.glb`);
const sourceMixer=new T.AnimationMixer(source.scene),actions=new Map();
for(const clip of source.animations)actions.set(clip.name,sourceMixer.clipAction(clip));
for(const file of ['motion_additions.glb','uploaded_motions.glb','re4_shotgun_animations.glb']){
 for(const clip of (await read(`${sourceDir}/${file}`)).animations)actions.set(clip.name,sourceMixer.clipAction(clip));
}
installType97Motions({mixer:sourceMixer,actions});
const names=[...basic,...uploaded,...rifle,...[...actions.keys()].filter(n=>n.startsWith('Shotgun')), 'Type97Fire','Type97Pump'];
function rig(scene){const result={};scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isBone)result[o.userData.name||o.name]=o;});return result;}
const sr=rig(source.scene),v=new T.Vector3();
function rest(r){return Object.fromEntries(Object.entries(r).map(([n,b])=>[n,{p:b.getWorldPosition(new T.Vector3()),q:b.getWorldQuaternion(new T.Quaternion()),ws:b.getWorldScale(new T.Vector3()),local:b.quaternion.clone(),t:b.position.clone(),s:b.scale.clone()}]));}
const ss=rest(sr),hip='mixamorig:Hips';
function length(r){return r['mixamorig:LeftUpLeg'].p.distanceTo(r['mixamorig:LeftLeg'].p)+r['mixamorig:LeftLeg'].p.distanceTo(r['mixamorig:LeftFoot'].p);}
function palm(r,s){const p=r[`mixamorig:${s}Hand`].p, y=r[`mixamorig:${s}HandMiddle1`].p.clone().sub(p).normalize(),x=r[`mixamorig:${s}HandIndex1`].p.clone().sub(r[`mixamorig:${s}HandPinky1`].p);x.addScaledVector(y,-x.dot(y)).normalize();const z=new T.Vector3().crossVectors(x,y).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));}
function endpoint(n,r){const suffix=n.replace('mixamorig:','');const explicit={Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head'};if(explicit[suffix])return 'mixamorig:'+explicit[suffix];for(const side of ['Left','Right']){for(const [a,b] of [['Shoulder','Arm'],['Arm','ForeArm'],['ForeArm','Hand'],['UpLeg','Leg'],['Leg','Foot'],['Foot','ToeBase'],['ToeBase','Toe_End']])if(suffix===side+a)return 'mixamorig:'+side+b;}const m=n.match(/(Hand(?:Thumb|Index|Middle|Ring|Pinky))([123])$/);if(m)return n.slice(0,-1)+(+m[2]+1);return null;}
const report={version:'R45',sourceRig:'diandian_fixed.glb',method:'world-space bone direction and palm-frame calibration; target local bone lengths/scales retained; root trajectory scaled by leg length',fps:30,characters:{}};
for(const [id,file] of Object.entries(sources)){
 const dir=`${output}/${id}`;fs.mkdirSync(dir,{recursive:true});if(file!==`${dir}/source.glb`)fs.copyFileSync(file,`${dir}/source.glb`);
 const weightRepairs=prepareResistanceCharacter(file,`${dir}/character.glb`);
 const target=await read(`${dir}/character.glb`),tr=rig(target.scene),ts=rest(tr),ratio=length(ts)/length(ss),box=new T.Box3().setFromObject(target.scene);
 const mapped=Object.keys(tr).filter(n=>ss[n]);mapped.sort((a,b)=>{const depth=n=>{let d=0;for(let p=tr[n].parent;p;p=p.parent)d++;return d;};return depth(a)-depth(b);});
 const calibrations={};for(const n of mapped){const end=endpoint(n,ts);let q=new T.Quaternion();if(end&&ss[end]&&ts[end])q.setFromUnitVectors(ts[end].p.clone().sub(ts[n].p).normalize(),ss[end].p.clone().sub(ss[n].p).normalize());if(n==='mixamorig:LeftHand'||n==='mixamorig:RightHand'){const side=n.includes('Left')?'Left':'Right';q=palm(ss,side).multiply(palm(ts,side).invert());}calibrations[n]=q;}
 const calibrationReport={character:id,source_character:'diandian',formula:'targetAnimatedWorldQ = sourceAnimatedWorldQ * inverse(sourceRestWorldQ) * directionCalibrationQ * targetRestWorldQ',source_preview_scale:source.parser.json.asset.extras?.preview_normalization?.scale??1.75/1.0130003152585192,target_preview_scale:1.75/(box.max.y-box.min.y),bones:{},palms:{}};
 for(const n of mapped){const sourceWorldScale=ss[n].ws,targetWorldScale=ts[n].ws,neutral=calibrations[n].clone().multiply(ts[n].q);calibrationReport.bones[n]={source_rest_world_position:ss[n].p.toArray(),target_rest_world_position:ts[n].p.toArray(),source_rest_world_quaternion:ss[n].q.toArray(),target_rest_world_quaternion:ts[n].q.toArray(),source_world_scale:sourceWorldScale.toArray(),target_world_scale:targetWorldScale.toArray(),source_local_scale:ss[n].s.toArray(),target_local_scale:ts[n].s.toArray(),direction_calibration_quaternion:calibrations[n].toArray(),source_to_target_local_rotation:neutral.invert().multiply(ss[n].q).toArray()};}
 for(const side of ['Left','Right']){const n='mixamorig:'+side+'Hand',center=r=>['Index1','Middle1','Ring1'].reduce((a,f)=>a.add(r[n+f].p),new T.Vector3()).multiplyScalar(1/3).lerp(r[n].p,.35);calibrationReport.palms[side]={definition:'65% mean(Index1, Middle1, Ring1) + 35% wrist',source_local_center:center(ss).applyMatrix4(new T.Matrix4().compose(ss[n].p,ss[n].q,ss[n].ws).invert()).toArray(),target_local_center:center(ts).applyMatrix4(new T.Matrix4().compose(ts[n].p,ts[n].q,ts[n].ws).invert()).toArray(),source_world_frame:palm(ss,side).toArray(),target_world_frame:palm(ts,side).toArray()};}
 fs.writeFileSync(`${dir}/retarget_calibration.json`,JSON.stringify(calibrationReport,null,2)+'\n');
 const {g:original,bin}=decode(`${dir}/character.glb`);original.asset.extras={...original.asset.extras,resistance_r45:{native_height_m:box.max.y-box.min.y,preview_height_m:1.75,animations:'motions.glb',original_hand_scale_preserved:true}};
 fs.writeFileSync(`${dir}/character.glb`,encode(original,bin));
 const g=structuredClone(original);for(const k of ['meshes','skins','images','materials','textures','samplers','extensionsUsed','extensionsRequired'])delete g[k];for(const node of g.nodes){delete node.mesh;delete node.skin;delete node.weights;delete node.extensions;}g.animations=[];g.accessors=[];g.bufferViews=[];const chunks=[];let size=0;
 function append(values,type){const a=new Float32Array(values),b=Buffer.from(a.buffer),view=g.bufferViews.push({buffer:0,byteOffset:size,byteLength:b.length})-1;chunks.push(b);size+=b.length;const ac={bufferView:view,componentType:5126,count:a.length/({SCALAR:1,VEC3:3,VEC4:4}[type]),type};if(type==='SCALAR'){ac.min=[0];ac.max=[values.at(-1)];}return g.accessors.push(ac)-1;}
 const meshSamples=[];target.scene.traverse(o=>{if(o.isSkinnedMesh){const p=o.geometry.attributes.position;const ids=[];for(let i=0;i<p.count;i++){const sk=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;let low=false;for(let j=0;j<4;j++){const bone=o.skeleton.bones[sk.getComponent(i,j)]?.name||'';if(sw.getComponent(i,j)>.15&&/Foot|Toe/.test(bone))low=true;}if(low||i%Math.max(1,Math.floor(p.count/1600))===0)ids.push(i);}meshSamples.push({mesh:o,ids});}});
 function minimum(full=false){let min=Infinity;for(const {mesh,ids}of meshSamples){mesh.skeleton.update();for(const i of (full?Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i):ids)){v.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);v.applyMatrix4(mesh.matrixWorld);min=Math.min(min,v.y);}}return min;}
 const summaries=[];
 for(const name of names){
  sourceMixer.stopAllAction();const action=actions.get(name),clip=action.getClip(),frames=Math.ceil(clip.duration*30),times=Array.from({length:frames+1},(_,i)=>clip.duration*i/frames),rotations=Object.fromEntries(mapped.map(n=>[n,[]])),translations=[],rawFloor=[],prev={};action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(const t of times){
   action.time=t;sourceMixer.update(0);source.scene.updateMatrixWorld(true);
   const desired={};for(const n of mapped){const dq=sr[n].getWorldQuaternion(new T.Quaternion()).multiply(ss[n].q.clone().invert()).multiply(calibrations[n]).multiply(ts[n].q);desired[n]=dq;const p=tr[n].parent;const pq=p?.isBone&&desired[p.userData.name||p.name]?desired[p.userData.name||p.name]:p?.getWorldQuaternion(new T.Quaternion())||new T.Quaternion();const q=pq.clone().invert().multiply(dq).normalize();if(prev[n]&&q.dot(prev[n])<0)q.set(-q.x,-q.y,-q.z,-q.w);prev[n]=q.clone();tr[n].quaternion.copy(q);rotations[n].push(...q.toArray());}
   const hp=sr[hip].getWorldPosition(new T.Vector3()).sub(ss[hip].p).multiplyScalar(ratio).add(ts[hip].p);tr[hip].parent.worldToLocal(hp);tr[hip].position.copy(hp);target.scene.updateMatrixWorld(true);translations.push(hp.clone());rawFloor.push(nonGround.has(name)?0:Math.max(0,box.min.y-minimum(name==='Dying'||name==='FlyingBackDeath')+.0026));
  }
  // Three-frame upper envelope prevents floor correction discontinuities.
  const lift=rawFloor.map((x,i)=>Math.max(x,...rawFloor.slice(Math.max(0,i-3),Math.min(rawFloor.length,i+4)).map((y,j)=>y-.004*Math.abs(Math.max(0,i-3)+j-i))));
  const rootInv=tr[hip].parent.matrixWorld.clone().invert();const zero=new T.Vector3().applyMatrix4(rootInv);for(let i=0;i<translations.length;i++)translations[i].add(new T.Vector3(0,lift[i],0).applyMatrix4(rootInv).sub(zero));
  const input=append(times,'SCALAR'),a={name,samplers:[],channels:[],extras:{source_clip:name,retarget:'resistance_r45',sample_rate:30,root_leg_ratio:ratio,source_duration:clip.duration}};
  function channel(n,path,values,type){const sampler=a.samplers.push({input,output:append(values,type),interpolation:'LINEAR'})-1;a.channels.push({sampler,target:{node:g.nodes.findIndex(o=>o.name===n),path}});}
  for(const n of mapped)channel(n,'rotation',rotations[n],'VEC4');channel(hip,'translation',translations.flatMap(t=>t.toArray()),'VEC3');g.animations.push(a);
  summaries.push({name,duration:clip.duration,frames:frames+1,tracks:a.channels.length,max_floor_lift_m:Math.max(...lift)});console.log(id,name,frames+1,'lift',Math.max(...lift).toFixed(4));
 }
 g.buffers=[{byteLength:size}];fs.writeFileSync(`${dir}/motions.glb`,encode(g,Buffer.concat(chunks)));
 report.characters[id]={original:file,source_bytes:fs.statSync(file).size,weight_repairs:weightRepairs,joints:original.skins[0].joints.length,mapped_bones:mapped.length,unmapped_bones:Object.keys(tr).filter(n=>!mapped.includes(n)),bounds_m:{min:box.min.toArray(),max:box.max.toArray()},preview_scale:1.75/(box.max.y-box.min.y),leg_length_ratio:ratio,motions:summaries};
}
fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
