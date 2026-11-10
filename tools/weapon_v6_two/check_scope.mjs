import fs from 'node:fs';import crypto from'node:crypto';import {runtime}from'./runtime.mjs';
const report={scope:'Final production versus original baseline',characters:{}};const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const cid of ['diandian','zhigeng']){
 const b=await runtime(cid,'baseline'),c=await runtime(cid,'production');const exempt=new Set(['qsz92','type54','type64','m870','winchester1897']);const row={unchangedWeapons:{},characterGlbIdentical:hash(b.file)===hash(c.file),bodyMotionPackHashesIdentical:[]};
 for(const f of ['motion_additions.glb','leon_pistol_animations.glb','re4_shotgun_animations.glb','re4_rocket_upper.glb','uploaded_motions.glb'])row.bodyMotionPackHashesIdentical.push({file:f,equal:hash(b.dir+'/assets/'+f)===hash(c.dir+'/assets/'+f)});
 for(const id of Object.keys(b.cfg.weapons).filter(id=>!exempt.has(id))){const r={geometryIdentical:hash(b.dir+'/assets/weapons/'+id+'.glb')===hash(c.dir+'/assets/weapons/'+id+'.glb'),dataIdentical:JSON.stringify(b.cfg.weapons[id])===JSON.stringify(c.cfg.weapons[id]),mountIdentical:JSON.stringify(b.cfg.characters[cid].mounts[id])===JSON.stringify(c.cfg.characters[cid].mounts[id]),sampledFrames:0,maxNumericDrift:0};
  if(id!=='qjz89')for(const m of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading']){if(!b.model.actions.has(b.clip(id,m)))continue;for(const phase of [0,.2,.6]){let all=[];for(const rt of[b,c]){rt.poseAt(id,m,Math.min(phase,rt.duration(id,m)));all.push([...new Set(rt.model.bones.values())].flatMap(n=>[...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]).concat(rt.attachment.weapons.get(id).matrixWorld.elements));}r.sampledFrames++;for(let i=0;i<all[0].length;i++)r.maxNumericDrift=Math.max(r.maxNumericDrift,Math.abs(all[0][i]-all[1][i]));}}
  row.unchangedWeapons[id]=r;
 }report.characters[cid]=row;console.log(cid,'scope checked');
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/final_scope.json',JSON.stringify(report,null,2));
