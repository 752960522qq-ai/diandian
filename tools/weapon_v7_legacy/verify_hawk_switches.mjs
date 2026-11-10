/** Seek and switching stress on production 97: all 7 UI motions at five phases,
 * then return repeatedly to an identical idle sample. This proves deterministic
 * reset, not that the UI blends its hard action switches smoothly. */
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import * as T from'three';import{read}from'../qa/validate_pf89.mjs';
const motions=['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','ShotgunPump'],results={};
for(const cid of ['linxu','military','vest']){
 const site=cid==='linxu'?'linxu':'resistance',dir=path.resolve(`web/motion-labs/${site}-motion-lab`),cfg=JSON.parse(fs.readFileSync(`${dir}/assets/weapon_attachment.json`)),[g,pack,extra]=await Promise.all(['character','motions','weapon_update_v6'].map(x=>read(`${dir}/assets/characters/${cid}/${x}.glb`))),weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${dir}/assets/weapons/${id}.glb`)).scene]))),scene=new T.Scene(),{prepareRig}=await import(pathToFileURL(`${dir}/rig.js`)),m=prepareRig(g,pack,cid,cfg,weapons,scene,extra);scene.updateMatrixWorld(true);
 const snapshot=()=>{const bones={};for(const b of new Set(m.bones.values()))bones[b.name]=[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()];const gun=m.attachment.weapons.get('type97hawk');return{bones,gun:[...gun.position.toArray(),...gun.quaternion.toArray(),...gun.scale.toArray()]};};
 const targetTime=m.duration('RifleIdle','type97hawk')*.5;m.pose('RifleIdle',targetTime,'type97hawk');const reference=snapshot();let drift=0,nonfinite=0,samples=0,maxRight=0,maxLeft=0;
 for(let round=0;round<2;round++)for(const motion of motions)for(const phase of [0,.25,.5,.75,1]){
  const d=m.duration(motion,'type97hawk'),s=m.pose(motion,d*phase,'type97hawk');samples++;for(const bone of new Set(m.bones.values()))for(const n of [...bone.position.toArray(),...bone.quaternion.toArray(),...bone.scale.toArray()])if(!Number.isFinite(n))nonfinite++;if(Number.isFinite(s.rightContactErrorM))maxRight=Math.max(maxRight,s.rightContactErrorM);if(Number.isFinite(s.leftContactErrorM))maxLeft=Math.max(maxLeft,s.leftContactErrorM);
  m.pose('RifleIdle',targetTime,'type97hawk');const now=snapshot();for(const [name,values] of Object.entries(reference.bones))for(let i=0;i<values.length;i++)drift=Math.max(drift,Math.abs(values[i]-now.bones[name][i]));for(let i=0;i<reference.gun.length;i++)drift=Math.max(drift,Math.abs(reference.gun[i]-now.gun[i]));
 }
 results[cid]={samples,nonfinite,maxReturnComponentDrift:drift,maxRightPalmErrorM:maxRight,maxLeftPalmErrorM:maxLeft};
}
console.log(JSON.stringify(results,null,2));fs.writeFileSync(process.env.OUTPUT||'../terra_scratch/hawk-switches-final.json',JSON.stringify(results,null,2));if(Object.values(results).some(x=>x.nonfinite||x.maxReturnComponentDrift>1e-7))process.exitCode=1;
