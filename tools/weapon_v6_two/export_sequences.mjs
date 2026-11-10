import fs from 'node:fs';import * as T from 'three';import {runtime} from './runtime.mjs';import {exportPose} from './export_pose_util.mjs';
const out='web/motion-labs/verification_weapon_v6_two/sequences';fs.mkdirSync(out,{recursive:true});const rows=[];
for(const cid of ['diandian','zhigeng']){
 const source=await runtime(cid,'baseline'),c=await runtime(cid,'candidate_c');
 for(const [weapon,motion,phases]of [['m870','Reloading',[0,.25,.5,.75,1]],['m870','ShotgunPump',[0,.25,.375,.5,1]],['qsz92','RifleRun',[0,.25,.5,.75,1]],['qsz92','Reloading',[0,.25,.5,.75,1]]]){
  const kinds=weapon==='m870'?['baseline','candidate_c']:['candidate_c'];
  for(const kind of kinds){const r=kind==='baseline'?source:c;
   for(const phase of phases){const time=r.duration(weapon,motion)*phase;r.poseAt(weapon,motion,time);const name=`${cid}-${weapon}-${motion}-${phase}-${kind}`,prefix=out+'/'+name;exportPose(r.file,r.model.root,r.model.wrapper,prefix+'.glb');const gun=r.attachment.weapons.get(r.mapWeapon(weapon)),visual=kind==='baseline'?gun:gun.children[0],x={position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3()};visual.matrixWorld.decompose(x.position,x.quaternion,x.scale);exportPose(r.dir+'/assets/weapons/'+r.mapWeapon(weapon)+'.glb',gun,x,prefix+'-gun.glb');rows.push({name,cid,weapon,motion,kind,phase,time,center:[0,1.3,0],state:r.attachment.getState()});}
  }
 }
 console.log(cid,'sequences exported');
}
fs.writeFileSync(out+'/manifest.json',JSON.stringify(rows,null,2));
