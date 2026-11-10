/** Isolated two-character shoulder candidate. Does not modify production or original sources. */
import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {candidate,exportPose} from './candidate.mjs';import {runtime} from './validate.mjs';
import {measurePrepare,stats} from '../weapon_v6_shoulder/audit.mjs';
const OUT='web/motion-labs/verification_weapon_v6_three/shoulder-men-candidate';fs.mkdirSync(OUT,{recursive:true});
const policy={left_hand_quaternion_weapon:null,support_forearm_twist_weight:0,support_upper_arm_twist_weight:0};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const motions=w=>w==='m870'?['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','ShotgunAimLevel','ShotgunAimUp','ShotgunAimDown','FiringRifle','ShotgunPump','Reloading']:['PistolIdle','PistolWalk','RifleRun','PistolAimingIdle','PistolShooting','Reloading'];
const poseState=c=>Object.fromEntries([...c.bones].map(([n,b])=>[n,[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]]));
const report={scope:'Isolated candidate only: original source M97 RifleRun left wrist remains natural, extra forearm and upper arm axial twist disabled. No production files changed.',policy,characters:{},render_rows:[]};
for(const cid of ['military','vest']){
 const c=await candidate(cid),rt=await runtime(cid),mount=c.src.cfg.characters.diandian.mounts.winchester1897,original=structuredClone(mount.motions.RifleRun);
 const variants={production:{model:rt,restore:()=>{}},candidate:{model:{bones:c.bones,root:c.gltf.scene,wrapper:c.wrapper},restore:()=>{}}};
 const specifications={};for(const [k,r]of Object.entries(variants)){r.bindQ=Object.fromEntries(['LeftShoulder','LeftArm'].map(n=>[n,r.model.bones.get('mixamorig:'+n).getWorldQuaternion(new T.Quaternion())]));specifications[k]=Object.fromEntries(['shoulder','elbow','wrist'].map(n=>[n,measurePrepare(r,n)]));}
 const sourceFiles=[c.file,`${c.site}/assets/characters/${cid}/motions.glb`,`${c.site}/assets/characters/${cid}/weapon_update_v6.glb`,`${c.site}/assets/weapon_attachment.json`,'assets/weapons/m870.glb','tools/weapon_v6_three/candidate.mjs'];
 const result={source_sha256:Object.fromEntries(sourceFiles.map(f=>[f,sha(f)])),regions:Object.fromEntries(Object.entries(specifications).map(([k,s])=>[k,Object.fromEntries(Object.entries(s).map(([region,ss])=>[region,ss.map(x=>({mesh:x.m.name,vertices:x.ids.length,triangles:x.tris.length,rest_bounds: ['x','y','z'].map((_,i)=>[Math.min(...x.rest.map(p=>p[i])),Math.max(...x.rest.map(p=>p[i]))])}))]))])),duration:c.duration('m870','RifleRun'),variants:{},scope_check:{}};
 const originalOther=new Map();for(const w of ['m870','type54','type64','qsz92'])for(const m of motions(w)){if(w==='m870'&&m==='RifleRun')continue;for(const p of [0,.37,.73,1]){c.pose(w,m,c.duration(w,m)*p);originalOther.set(`${w}/${m}/${p}`,poseState(c));}}
 mount.motions.RifleRun={...original,...policy};
 let maxOther=0;for(const w of ['m870','type54','type64','qsz92'])for(const m of motions(w)){if(w==='m870'&&m==='RifleRun')continue;for(const p of [0,.37,.73,1]){c.pose(w,m,c.duration(w,m)*p);const now=poseState(c),old=originalOther.get(`${w}/${m}/${p}`);for(const n of Object.keys(old))for(let i=0;i<old[n].length;i++)maxOther=Math.max(maxOther,Math.abs(old[n][i]-now[n][i]));}}
 result.scope_check={other_new_actions:27,phases_per_action:4,max_local_component_difference:maxOther,old_weapon_changes:'none; production runtime, configs, and files remain untouched'};
 for(const [mode,r]of Object.entries(variants)){
  const rows=[];for(let i=0;i<=160;i++){const phase=i/160,t=result.duration*phase;if(mode==='production')rt.pose('RifleRun',t,'m870');else c.pose('m870','RifleRun',t);rows.push({phase,t,...Object.fromEntries(Object.entries(specifications[mode]).map(([region,s])=>[region,stats(r,s)]))});}
  result.variants[mode]={summary:Object.fromEntries(['shoulder','elbow','wrist'].map(region=>[region,{minDet:Math.min(...rows.map(x=>x[region].detMin)),minP10:Math.min(...rows.map(x=>x[region].detP10)),minAreaP10:Math.min(...rows.map(x=>x[region].areaP10)),maxLowDetFraction:Math.max(...rows.map(x=>x[region].lowDetFraction))}])),rows};
 }
 for(const phase of [0,.15,.5,.65,.85]){
  rt.pose('RifleRun',result.duration*phase,'m870');const ls=rt.bones.get('mixamorig:LeftShoulder').getWorldPosition(new T.Vector3()),rs=rt.bones.get('mixamorig:RightShoulder').getWorldPosition(new T.Vector3()),center=ls.clone().add(rs).multiplyScalar(.5).add(new T.Vector3(0,-.14,-.02)).toArray();
  for(const mode of ['production','candidate']){if(mode==='candidate')c.pose('m870','RifleRun',result.duration*phase);const root=mode==='production'?rt.root:c.gltf.scene,wrapper=mode==='production'?rt.wrapper:c.wrapper,gun=mode==='production'?rt.attachment.weapons.get('m870'):c.gunScenes.get('m870'),name=`${cid}-${mode}-p${phase}`;exportPose(c.file,root,wrapper,`${OUT}/${name}.glb`);exportPose('assets/weapons/m870.glb',gun,gun,`${OUT}/${name}-gun.glb`);report.render_rows.push({cid,mode,phase,name,center,views:['front','left','back'],time:result.duration*phase});}
 }
 result.source_sha256_still_match=Object.entries(result.source_sha256).every(([f,h])=>sha(f)===h);report.characters[cid]=result;console.log(cid,JSON.stringify({production:result.variants.production.summary,candidate:result.variants.candidate.summary,scope:result.scope_check}));
}
fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(OUT+'/render-manifest.json',JSON.stringify(report.render_rows,null,2)+'\n');
