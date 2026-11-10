/** Derive V7 from the verified V6 pack. Non-arm animation buffers stay byte-for-byte intact. */
import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {candidate} from '../weapon_v6_three/candidate.mjs';import {decode,encode} from './runtime.mjs';
import {configureShotgunSource,applyShotgunFit} from './shotgun-policy.mjs';
import {applyFingerPolicy} from './finger-policy.mjs';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function floats(g,bin,id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0),size={SCALAR:1,VEC3:3,VEC4:4}[a.type];if(a.componentType!==5126||v.byteStride)throw Error('Unsupported animation accessor');return {a,offset,size,values:Array.from({length:a.count*size},(_,i)=>bin.readFloatLE(offset+i*4))};}
for(const cid of (process.argv[2]||'linxu,military,vest').split(',')){
 const src=`assets/characters/weapon_update_v6/${cid}`,dest=`assets/characters/weapon_update_v7/${cid}`,input=src+'/motions.glb',c=await candidate(cid),originalMount=structuredClone(c.src.cfg.characters.diandian.mounts.winchester1897.re4_mount),decoded=decode(input),g=decoded.g,bin=Buffer.from(decoded.bin),transforms=JSON.parse(fs.readFileSync(src+'/equipped_weapon_transforms.json')),rows=[];
 fs.mkdirSync(dest,{recursive:true});
 for(const anim of g.animations){
  const {weapon,motion}=anim.extras,name=anim.name,times=floats(g,bin,anim.samplers[0].input).values;
  if(Math.abs(c.duration(weapon,motion)-times.at(-1))>1e-6)throw Error('Source timing changed: '+name);
  const channels=anim.channels.filter(ch=>ch.target.path==='rotation'&&/(?:Arm|ForeArm|Hand)/.test(g.nodes[ch.target.node].name)).map(ch=>({ch,node:g.nodes[ch.target.node].name,out:floats(g,bin,anim.samplers[ch.sampler].output),values:[],maxAngle:0}));
  const gt={...transforms.tracks[name],positions:[],rotations:[]};let maxGunPosition=0,maxGunAngle=0,maxReach=0,activeSamples=0;
  for(let i=0;i<times.length;i++){
   const time=times[i];configureShotgunSource(c,weapon,motion,originalMount);c.pose(weapon,motion,time);
   const gun=c.gunScenes.get(weapon),fit=applyShotgunFit({bones:c.bones,gun,cid,weapon,motion,time,duration:times.at(-1)});
   const handPolicy=applyFingerPolicy({bones:c.bones,gun,cid,weapon,motion,time,duration:times.at(-1)});
   c.scene.updateMatrixWorld(true);if(fit.active||handPolicy?.active)activeSamples++;maxReach=Math.max(maxReach,fit.maxWristReachErrorM||0,handPolicy?.reachErrorM||0);
   for(const row of channels){const q=c.bones.get(row.node).quaternion.clone().normalize(),old=new T.Quaternion().fromArray(row.out.values,i*4).normalize();row.maxAngle=Math.max(row.maxAngle,q.angleTo(old));if(q.dot(old)<0)q.set(-q.x,-q.y,-q.z,-q.w);row.values.push(...q.toArray());}
   const hand=c.bones.get('mixamorig:RightHand'),p=hand.worldToLocal(gun.getWorldPosition(new T.Vector3())),q=hand.getWorldQuaternion(new T.Quaternion()).invert().multiply(gun.getWorldQuaternion(new T.Quaternion())).normalize(),oldp=new T.Vector3().fromArray(transforms.tracks[name].positions,i*3),oldq=new T.Quaternion().fromArray(transforms.tracks[name].rotations,i*4).normalize();maxGunPosition=Math.max(maxGunPosition,p.distanceTo(oldp));maxGunAngle=Math.max(maxGunAngle,q.angleTo(oldq));if(q.dot(oldq)<0)q.set(-q.x,-q.y,-q.z,-q.w);gt.positions.push(...p.toArray());gt.rotations.push(...q.toArray());
  }
  const changed=channels.filter(r=>r.maxAngle>1e-5);for(const r of changed)for(let i=0;i<r.values.length;i++)bin.writeFloatLE(r.values[i],r.out.offset+i*4);
  const gunChanged=maxGunPosition>1e-6||maxGunAngle>1e-5;if(gunChanged)transforms.tracks[name]=gt;
  const row={weapon,motion,clip:name,duration:times.at(-1),samples:times.length,activeSamples,changedBoneTracks:changed.map(r=>({bone:r.node,maxAngularChangeDeg:r.maxAngle*180/Math.PI})),gunTrackChanged:gunChanged,maxGunLocalPositionChangeM:maxGunPosition,maxGunLocalAngularChangeDeg:maxGunAngle*180/Math.PI,maxWristReachErrorM:maxReach};rows.push(row);anim.extras.v7_correction={changed_bones:changed.map(r=>r.node),gun_track_changed:gunChanged};console.log(cid,name,'changed',changed.length,'gun',gunChanged);
 }
 const provenance={revision:'male-pose-v7',base_v6_sha256:sha(input),source_commit:'95bab506c0e01e04c7818f7e0f5001ad3a105c14',original_source_equivalence:'Relevant original source motion/config hashes match V6 recorded 81d5a485 sources.',generator_sha256:sha('tools/weapon_v7_refined/build.mjs'),policies:Object.fromEntries(['shotgun-policy.mjs','finger-policy.mjs','pose-utils.mjs'].map(f=>[f,sha('tools/weapon_v7_refined/'+f)])),scope:'Only arm/forearm/hand/finger quaternion output buffers and matching gun-hand transforms may change; body, head, neck, shoulder, legs, timing and animation identity preserved.'};
 g.asset.extras={...g.asset.extras,natural_weapon_v7:provenance};const data=encode(g,bin);fs.writeFileSync(dest+'/motions.glb',data);fs.writeFileSync(dest+'/equipped_motions.glb',data);fs.writeFileSync(dest+'/equipped_weapon_transforms.json',JSON.stringify(transforms));fs.writeFileSync(dest+'/report.json',JSON.stringify({character:cid,...provenance,rows},null,2)+'\n');fs.writeFileSync(`${c.site}/assets/characters/${cid}/weapon_update_v7.glb`,data);
 // Reload immediately before the field-level patch so parallel legacy fixes survive.
 const cfgPath=`${c.site}/assets/weapon_attachment.json`,cfg=JSON.parse(fs.readFileSync(cfgPath));for(const w of ['qsz92','type54','type64','m870']){const names=Object.values(cfg.weapons[w].animation_overrides);cfg.characters[cid].mounts[w].natural_motion_tracks=Object.fromEntries(names.map(n=>[n,transforms.tracks[n]]));cfg.characters[cid].mounts[w].revision='male-pose-v7';}
 fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2)+'\n');
}
