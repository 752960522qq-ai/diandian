/** Actual production prepareRig skin vs the independently reviewed source candidate. */
import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {runtime} from './validate.mjs';import {candidate} from './candidate.mjs';import {measurePrepare,stats} from '../weapon_v6_shoulder/audit.mjs';
const OUT='web/motion-labs/verification_weapon_v6_three',sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),report={scope:'Production GLB loaded through prepareRig, actual linear skinned vertex positions compared to reviewed source candidate. M870 RifleRun only.',characters:{},failures:[]};
for(const cid of ['linxu','military','vest']){
 const rt=await runtime(cid),c=await candidate(cid),rs={model:rt,restore:()=>{}},cs={model:{bones:c.bones,root:c.gltf.scene,wrapper:c.wrapper},restore:()=>{}};
 for(const r of [rs,cs])r.bindQ=Object.fromEntries(['LeftShoulder','LeftArm'].map(n=>[n,r.model.bones.get('mixamorig:'+n).getWorldQuaternion(new T.Quaternion())]));
 const regions=Object.fromEntries(['shoulder','elbow','wrist'].map(region=>[region,measurePrepare(rs,region)])),vertices=new Map();for(const region of Object.values(regions))for(const {m,ids}of region){if(!vertices.has(m))vertices.set(m,new Set());for(const id of ids)vertices.get(m).add(id);}
 const matches=[...vertices].map(([m,ids])=>({actual:m,reference:c.gltf.scene.getObjectByName(m.name),ids:[...ids]}));let maxSkin=0,maxBone=0,worst=null;const skinStats=[];
 for(let i=0;i<=160;i++){const phase=i/160,t=rt.duration('RifleRun','m870')*phase;rt.pose('RifleRun',t,'m870');c.pose('m870','RifleRun',t);
  for(const {actual:a,reference:b,ids}of matches){a.skeleton.update();b.skeleton.update();for(const id of ids){const av=new T.Vector3().fromBufferAttribute(a.geometry.attributes.position,id),bv=new T.Vector3().fromBufferAttribute(b.geometry.attributes.position,id);a.applyBoneTransform(id,av);b.applyBoneTransform(id,bv);av.applyMatrix4(a.matrixWorld);bv.applyMatrix4(b.matrixWorld);const error=av.distanceTo(bv);if(error>maxSkin){maxSkin=error;worst={phase,mesh:a.name,vertex:id};}}}
  for(const[n,b]of c.bones){const a=rt.bones.get(n);maxBone=Math.max(maxBone,a.getWorldPosition(new T.Vector3()).distanceTo(b.getWorldPosition(new T.Vector3())));}
  skinStats.push({phase,...Object.fromEntries(Object.entries(regions).map(([region,s])=>{const st=stats(rs,s);return[region,{minDet:st.detMin,p10:st.detP10,areaP10:st.areaP10}]}))});
 }
 const pack=`${c.site}/assets/characters/${cid}/weapon_update_v6.glb`;report.characters[cid]={production_pack_sha256:sha(pack),source_candidate_sha256:sha('tools/weapon_v6_three/candidate.mjs'),phases:161,skin_vertices:matches.reduce((n,m)=>n+m.ids.length,0),max_world_skin_error_m:maxSkin,max_world_bone_error_m:maxBone,worst,production_region_minima:Object.fromEntries(['shoulder','elbow','wrist'].map(k=>[k,{minDet:Math.min(...skinStats.map(x=>x[k].minDet)),minP10:Math.min(...skinStats.map(x=>x[k].p10)),minAreaP10:Math.min(...skinStats.map(x=>x[k].areaP10))}]))};
 if(maxSkin>.006||maxBone>.006)report.failures.push({cid,maxSkin,maxBone});console.log(cid,report.characters[cid]);
}
fs.writeFileSync(OUT+'/shoulderfix-production-skin-validation.json',JSON.stringify(report,null,2)+'\n');process.exitCode=report.failures.length?1:0;
