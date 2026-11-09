// Bake final site solves to a separate, reusable skeleton animation pack.
// Run only after finalizing the site's V3 attachment configuration.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {setupLinxu} from '../qa/validate_linxu_motion.mjs';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
import {armed} from '../../web/motion-labs/linxu-motion-lab/rig.js';
const root='assets/characters/linxu_motion_v3',site='web/motion-labs/linxu-motion-lab',fps=30;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHashes=Object.fromEntries(['assets/weapon_attachment.json','weapon-attachment.js','reference-grip.js','rig.js'].map(p=>[p,sha(`${site}/${p}`)]));
const names={qbz95:'QBZ95',type56_1:'Type56_1',qbu85:'QBU85',type97hawk:'Type97Hawk',qcq171:'QCQ171'};
const report={fps,firingFps:240,pumpFps:240,sourceHashes,characters:{},limitations:['30 Hz samples (240 Hz for FiringRifle; 240 Hz for ShotgunPump) use linear interpolation between keys. Browser runtime remains authoritative for exact continuous-time constraints.','Weapon geometry is separate; companion JSON stores gun-root and moving pump-part transforms.','No Godot scene/controller integration is performed by this export.']};
for(const cid of ['linxu']){
 const rt=await setupLinxu(cid),{g}=decode(`${root}/motions.glb`);
 for(const k of ['meshes','skins','images','materials','textures','samplers','extensionsUsed','extensionsRequired'])delete g[k];
 for(const node of g.nodes){delete node.mesh;delete node.skin;delete node.weights;delete node.extensions;}
 g.animations=[];g.accessors=[];g.bufferViews=[];g.asset.extras={linxu_v3_equipped_bake:{fps,character:cid,sourceHashes}};
 const mapping=g.nodes.map((n,i)=>({name:n.name,index:i,bone:rt.bones.get(n.name)})).filter(n=>n.bone);
 const chunks=[];let length=0;
 function append(values,type){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));const view=g.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length})-1;chunks.push(b);length+=b.length;const a={bufferView:view,componentType:5126,count:values.length/({SCALAR:1,VEC3:3,VEC4:4}[type]),type};if(type==='SCALAR'){a.min=[values[0]];a.max=[values.at(-1)];}return g.accessors.push(a)-1;}
 const inputHashes=Object.fromEntries(['character.glb','motions.glb'].map(p=>[p,sha(p==='character.glb'?'assets/characters/linxu_motion/character.glb':`${root}/${p}`)]));
 const manifest={character:cid,inputHashes,coordinateConvention:'glTF right-handed Y-up; root transforms relative to the unnormalized character scene (not 1.75m website wrapper); quaternions [x,y,z,w].',sourceHashes,characterModel:'../linxu_motion/character.glb',motionPack:'equipped_motions.glb',weaponAssetsRoot:'../../weapons',clips:[]};
 for(const [wid,prefix]of Object.entries(names))for(const motion of [...armed.map(a=>a[0]),...(wid==='type97hawk'?['ShotgunPump']:[])]){
  const clipFps=motion==='ShotgunPump'?240:motion==='FiringRifle'?240:fps,duration=rt.duration(motion,wid),steps=Math.ceil(duration*clipFps),times=Array.from({length:steps+1},(_,i)=>duration*i/steps),tracks=mapping.map(n=>({...n,translation:[],rotation:[],scale:[]})),frames=[];
  for(const t of times){const state=rt.pose(motion,t,wid);
   if(rt.attachment.chestSkinning.vertexCount)throw Error('Runtime skin-weight changes require a separate mesh export strategy');
   for(const n of tracks){n.translation.push(...n.bone.position.toArray());n.scale.push(...n.bone.scale.toArray());const q=n.bone.quaternion.clone().normalize();if(n.rotation.length&&q.dot(new T.Quaternion().fromArray(n.rotation,n.rotation.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);n.rotation.push(...q.toArray());}
   const gun=rt.attachment.weapons.get(wid),matrix=rt.wrapper.matrixWorld.clone().invert().multiply(gun.matrixWorld),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();matrix.decompose(p,q,s);
   const pump=wid==='type97hawk'?rt.attachment.type97PumpParts:[];
   const childPath=o=>{const path=[];while(o!==gun&&o.parent){path.unshift({name:o.userData.name||o.name,childIndex:o.parent.children.indexOf(o)});o=o.parent;}return path;};
   frames.push({time:t,visible:state.visible,position:p.toArray(),rotation:q.toArray(),scale:s.toArray(),pumpTravelM:state.pumpTravelM||0,...(pump.length?{movingParts:pump.map(({object})=>({path:childPath(object),position:object.position.toArray(),rotation:object.quaternion.toArray(),scale:object.scale.toArray()}))}:{})});
  }
  const input=append(times,'SCALAR'),animation={name:`${prefix}_${motion}`,samplers:[],channels:[],extras:{weapon:wid,motion,frame_rate:clipFps,duration,weapon_transform_file:'equipped_weapon_transforms.json'}};
  const constantTime=append([0],'SCALAR');
  for(const n of tracks)for(const [path,type]of [['translation','VEC3'],['rotation','VEC4'],['scale','VEC3']]){const width=type==='VEC4'?4:3,constant=n[path].every((v,i)=>Math.abs(v-n[path][i%width])<1e-12);const sampler=animation.samplers.push({input:constant?constantTime:input,output:append(constant?n[path].slice(0,width):n[path],type),interpolation:'LINEAR'})-1;animation.channels.push({sampler,target:{node:n.index,path}});}
  g.animations.push(animation);manifest.clips.push({name:animation.name,weapon:wid,weaponModel:`${site}/assets/weapons/${wid}.glb`,motion,fps:clipFps,duration,frames});
 }
 g.buffers=[{byteLength:length}];fs.writeFileSync(`${root}/equipped_motions.glb`,encode(g,Buffer.concat(chunks)));fs.writeFileSync(`${root}/equipped_weapon_transforms.json`,JSON.stringify(manifest)+'\n');
 // Reload exported bytes and verify both key samples and between-key error.
 const model=await read('assets/characters/linxu_motion/character.glb'),pack=await read(`${root}/equipped_motions.glb`),mixer=new T.AnimationMixer(model.scene);
 const rows=[];
 for(const entry of manifest.clips){const clip=pack.animations.find(a=>a.name===entry.name);mixer.stopAllAction();const action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();let maxKeyLocal=0,maxMidpointBoneM=0;
  for(let i=0;i<entry.frames.length;i++){
   const t=entry.frames[i].time;rt.pose(entry.motion,t,entry.weapon);action.time=t;mixer.update(0);model.scene.updateMatrixWorld(true);
   for(const {bone}of mapping){const other=model.scene.getObjectByName(bone.name);for(const prop of ['position','quaternion','scale']){const a=bone[prop].toArray(),b=other[prop].toArray();if(prop==='quaternion'&&a.reduce((v,x,k)=>v+x*b[k],0)<0)b.forEach((x,k)=>b[k]=-x);a.forEach((v,k)=>maxKeyLocal=Math.max(maxKeyLocal,Math.abs(v-b[k])));}}
   if(i+1<entry.frames.length){const mid=(t+entry.frames[i+1].time)/2;rt.pose(entry.motion,mid,entry.weapon);action.time=mid;mixer.update(0);model.scene.updateMatrixWorld(true);const inv=rt.wrapper.matrixWorld.clone().invert();for(const {bone}of mapping){const p=bone.getWorldPosition(new T.Vector3()).applyMatrix4(inv),b=model.scene.getObjectByName(bone.name).getWorldPosition(new T.Vector3());maxMidpointBoneM=Math.max(maxMidpointBoneM,p.distanceTo(b));}}
  }
  if(maxKeyLocal>1e-4)throw Error(`Reloaded bake mismatch ${cid} ${entry.name}: ${maxKeyLocal}`);
  rows.push({clip:entry.name,samples:entry.frames.length,maxKeyLocalTransformError:maxKeyLocal,maxMidpointBonePositionErrorNativeM:maxMidpointBoneM});
 }
 report.characters[cid]={inputHashes,clips:rows.length,bones:mapping.length,totalSamples:rows.reduce((n,r)=>n+r.samples,0),runtimeSkinWeightVertices:rt.attachment.chestSkinning.vertexCount,rows};console.log('BAKED',cid,JSON.stringify({...report.characters[cid],rows:undefined}));
}
for(const [p,hash]of Object.entries(sourceHashes))if(sha(`${site}/${p}`)!==hash)throw Error(`Source changed during bake: ${p}`);
fs.writeFileSync(`${root}/equipped-bake-report.json`,JSON.stringify(report,null,2)+'\n');
