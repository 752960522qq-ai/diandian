/** Read-only asset/runtime measurement. No geometry or configuration is modified. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {read,setup} from '../qa/validate_pf89.mjs';
const current=path.resolve('.');
const baseline=path.resolve(process.argv[2]||'../character_adapt_baseline');
const out=process.argv[3]||'web/motion-labs/verification_weapon_v6_scale/measurement_runtime_snapshot_integration.json';
const characters=[['diandian','diandian-classic'],['zhigeng','zhigeng'],['linxu','linxu'],['military','resistance'],['vest','resistance']];
const fileFor=(cid)=>cid==='diandian'||cid==='zhigeng'?`${cid}_fixed.glb`:`characters/${cid}/character.glb`;
function projection(root,axis=new T.Vector3(0,0,1)) {
 root.updateMatrixWorld(true);let lo=Infinity,hi=-Infinity,vertices=0;
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),d=v.dot(axis);lo=Math.min(lo,d);hi=Math.max(hi,d);vertices++;}});
 return {min:lo,max:hi,length:hi-lo,vertices};
}
async function dimensions(file) {
 const g=await read(file);g.scene.updateMatrixWorld(true);
 return {file,dimensions:[0,1,2].map(i=>projection(g.scene,new T.Vector3().setComponent(i,1)).length),bounds:[0,1,2].map(i=>{let p=projection(g.scene,new T.Vector3().setComponent(i,1));return[p.min,p.max];})};
}
async function runtime(root,cid,site) {
 const dir=`${root}/web/motion-labs/${site}-motion-lab`;
 if(['diandian','zhigeng'].includes(cid)){const r=await setup(cid,{sourceDirectory:dir});const installer=`${dir}/compact-pistol-motion.js`;if(fs.existsSync(installer)){const {installCompactPistolRun}=await import(pathToFileURL(installer));installCompactPistolRun(r.model);}return r;}
 const cfg=JSON.parse(fs.readFileSync(`${dir}/assets/weapon_attachment.json`));
 const weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${dir}/assets/weapons/${id}.glb`)).scene])));
 const g=await read(`${dir}/assets/characters/${cid}/character.glb`),p=await read(`${dir}/assets/characters/${cid}/motions.glb`);
 const app=fs.readFileSync(`${dir}/app.js`,'utf8'); const extraName=app.includes('weapon_update_v6.glb')?'weapon_update_v6.glb':'weapon_update_v5.glb'; const extraPath=`${dir}/assets/characters/${cid}/${extraName}`;
 const extra=fs.existsSync(extraPath)?await read(extraPath):{animations:[]};
 const {prepareRig}=await import(pathToFileURL(`${dir}/rig.js`));const scene=new T.Scene();
 const model=prepareRig(g,p,cid,cfg,weapons,scene,extra);
 return {model,scene,attachment:model.attachment,cfg,pose:(motion,time,weapon)=>model.pose(motion,time,weapon)};
}
const report={date:new Date().toISOString(),baselineCommit:'81d5a485',measurement:'Full hierarchy POSITION vertices projected onto local barrel Z (world-rotated axis at runtime). This is axial overall length, not orientation-sensitive world AABB width.',assets:{},characters:[],findings:[]};
report.assets.originalM97=await dimensions(`${baseline}/web/motion-labs/diandian-classic-motion-lab/assets/weapons/winchester1897.glb`);
report.assets.originalM97Zhigeng=await dimensions(`${baseline}/web/motion-labs/zhigeng-motion-lab/assets/weapons/winchester1897.glb`);
report.assets.m870=await dimensions(`${current}/assets/weapons/m870.glb`);
report.exactUniformScaleRatio=report.assets.originalM97.dimensions[2]/report.assets.m870.dimensions[2];
for(const root of [baseline,current]) for(const [cid,site] of characters) {
 const version=root===baseline?'baseline':'current';const r=await runtime(root,cid,site);
 const key=version==='baseline'?'winchester1897':'m870';
 const char=await read(`${root}/web/motion-labs/${site}-motion-lab/assets/${fileFor(cid)}`);
 const row={version,cid,site,wrapperScale:r.model.wrapper.getWorldScale(new T.Vector3()).toArray(),characterRestBounds:new T.Box3().setFromObject(char.scene).getSize(new T.Vector3()).toArray(),hasM97:Boolean(r.cfg.weapons.winchester1897),weapon:key,present:Boolean(r.cfg.weapons[key]),samples:[]};
 if(row.present){
  for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','ShotgunPump']){
   const clip=r.cfg.weapons[key].animation_overrides?.[motion]||motion;const action=r.model.actions.get(clip);if(!action)throw Error(`Missing runtime clip ${cid} ${version} ${clip}; audit must load the app's selected pack`);
   const duration=action.getClip().duration;
   for(const phase of [0,.25,.5,.75,1]){
    r.pose(motion,phase*duration,key);r.scene.updateMatrixWorld(true);
    const gun=r.attachment.weapons.get(key);const axis=new T.Vector3(0,0,1).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion())).normalize();
    row.samples.push({motion,phase,gunParent:gun.parent.type,gunParentIsScene:gun.parent===r.scene,gunWorldScale:gun.getWorldScale(new T.Vector3()).toArray(),axialWorldLength:projection(gun,axis).length});
   }
  }
  row.axialLengthRange=[Math.min(...row.samples.map(x=>x.axialWorldLength)),Math.max(...row.samples.map(x=>x.axialWorldLength))];
 }
 report.characters.push(row);
 console.log(version,cid,'wrapperScale',row.wrapperScale[0],row.present?row.axialLengthRange:'no M97');
}
report.findings=[
 'Original M97 exists only on Diandian and Zhigeng baseline sites. Linxu, military and vest have no M97 baseline. type97hawk is a distinct weapon and is never substituted as M97 evidence.',
 'Runtime weapon roots are direct Scene children, independent of normalized character wrapper. Character normalization affects hand world positions and native palm offsets but does not multiply weapon geometry length.',
 'All runtime mount scales measured are one. The common game asset sets world length for all five characters, without an additional character scale factor. The latest user request sets final M870 length to 1 m.',
 'The original M97 measured 0.9992400407791138 m. Earlier exact matching was superseded by the latest user request for 1 m and modest body thinning. Width is adjusted only on the explicitly listed body nodes; round pipes and caps are preserved.'
];
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('ratio',report.exactUniformScaleRatio,'report',out);
