import fs from'node:fs';import * as T from'three';import{runtime}from'./runtime.mjs';import{exportPose}from'./export_pose_util.mjs';
const out='web/motion-labs/verification_weapon_v6_two/d_run_review';fs.mkdirSync(out,{recursive:true});const rows=[];
for(const cid of ['diandian','zhigeng']){
 const source=await runtime(cid,'baseline'),d=await runtime(cid,'candidate_d');source.cfg.weapons.qsz92.compatible_motions=['RifleRun','Reloading'];
 for(const weapon of ['qsz92','type54','type64'])for(const kind of (weapon==='qsz92'?['baseline','candidate_d']:['candidate_d'])){
  const r=kind==='baseline'?source:d;for(let i=0;i<=8;i++){const phase=i/8,time=r.duration(weapon,'RifleRun')*phase;r.poseAt(weapon,'RifleRun',time);const name=`${cid}-${weapon}-RifleRun-${phase}-${kind}`,prefix=out+'/'+name;exportPose(r.file,r.model.root,r.model.wrapper,prefix+'.glb');const gun=r.attachment.weapons.get(weapon),visual=kind==='baseline'?gun:gun.children[0],x={position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3()};visual.matrixWorld.decompose(x.position,x.quaternion,x.scale);exportPose(r.dir+'/assets/weapons/'+weapon+'.glb',gun,x,prefix+'-gun.glb');rows.push({name,cid,weapon,motion:'RifleRun',kind,phase,time,center:[0,1.2,0],state:r.attachment.getState(),referenceNotes:kind==='baseline'?'Original QSZ92 entry forced compatible with RifleRun in memory only. All original source clips/mounts unchanged.':'Original RifleRun + original QSZ92 RifleRun hand-to-gun calibration, no new tracks or retiming.'});}
 }
 console.log(cid,'D run9 phases exported');
}
fs.writeFileSync(out+'/manifest.json',JSON.stringify(rows,null,2));
