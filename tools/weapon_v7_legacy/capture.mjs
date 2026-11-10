/** Reproduce V6/V7 legacy male idle poses from the production prepareRig path.
 * Usage (repo root): OUTPUT=../terra_scratch/before CAPTURE=1 node tools/weapon_v7_legacy/capture.mjs
 * BASELINE_CONFIG=/absolute/dir containing linxu.json and resistance.json selects frozen V6 mounts.
 * PATCH=/path/patch.json overrides only character.mounts[weapon].motions.RifleIdle in memory.
 * CIDS=linxu,military,vest WEAPONS=qcq171,type97hawk,qbu85,type56_1,qbz95
 * Emits 17 equally spaced full-cycle pose samples, screenshots may render a subset.
 * No production assets are modified. The sampled poses are actual runtime evaluated poses,
 * not continuous collision checks. */
import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {read, decode} from '../qa/validate_pf89.mjs';
import {makeBaker} from '../weapon_v6_full_review/bake_runtime.mjs';
const output=path.resolve(process.env.OUTPUT||'../terra_scratch/current');fs.mkdirSync(output,{recursive:true});
const cids=(process.env.CIDS||'linxu,military,vest').split(','), ws=(process.env.WEAPONS||'qcq171,type97hawk,qbu85,type56_1,qbz95').split(',');
const patch=process.env.PATCH?JSON.parse(fs.readFileSync(process.env.PATCH)):{};
const CAP=process.env.CAPTURE==='1', MOTION=process.env.MOTION||'RifleIdle';
const v=(b)=>b.getWorldPosition(new T.Vector3()); const q=(b)=>b.getWorldQuaternion(new T.Quaternion());
const vecdeg=(a,b)=>T.MathUtils.radToDeg(a.clone().normalize().angleTo(b.clone().normalize()));
const out={version:1,motion:MOTION,notes:'Actual runtime samples. WristLineAngleDeg is forearm-to-middle-finger bone direction, not medical wrist flexion; contact metrics use existing single target point, not mesh intersection.',characters:{}};
for(const cid of cids){
 const site=cid==='linxu'?'linxu':'resistance';const dir=path.resolve(`web/motion-labs/${site}-motion-lab`),file=`${dir}/assets/characters/${cid}/character.glb`;
 const cfg=JSON.parse(fs.readFileSync(process.env.BASELINE_CONFIG?`${process.env.BASELINE_CONFIG}/${site}.json`:`${dir}/assets/weapon_attachment.json`));
 for(const [wid,values] of Object.entries(patch[cid]||{})){Object.assign(cfg.characters[cid].mounts[wid].motions[MOTION],values);}
 const weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${dir}/assets/weapons/${id}.glb`)).scene])));
 const gltf=await read(file),pack=await read(`${dir}/assets/characters/${cid}/motions.glb`),extra=await read(`${dir}/assets/characters/${cid}/weapon_update_v6.glb`),scene=new T.Scene();
 const {prepareRig}=await import(pathToFileURL(`${dir}/rig.js`));const model=prepareRig(gltf,pack,cid,cfg,weapons,scene,extra);scene.updateMatrixWorld(true);
 const {g:cg}=decode(file);model.root.traverse(o=>{if(!o.isMesh)return;const a=gltf.parser.associations.get(o);if(a?.meshes!=null){o.geometry.userData.sourcePrimitive={mesh:a.meshes,primitive:a.primitives};}});
 const char=out.characters[cid]={};
 for(const wid of ws){
   const duration=model.duration(MOTION,wid), times=Array.from({length:17},(_,i)=>duration*i/16);
   const gun=model.attachment.weapons.get(wid), b=CAP?makeBaker(file,model.root,model.wrapper):null,gb=CAP?makeBaker(`${dir}/assets/weapons/${wid}.glb`,gun,gun):null;
   const rows=[];for(const t of times){const state=model.pose(MOTION,t,wid);scene.updateMatrixWorld(true);
    const bone=n=>model.bones.get('mixamorig:'+n), names=['Hips','Spine2','Head','RightShoulder','RightArm','RightForeArm','RightHand','RightHandMiddle1','RightHandMiddle2','LeftArm','LeftForeArm','LeftHand'];
    const xyz=Object.fromEntries(names.map(n=>[n,v(bone(n)).toArray()]));
    const A=v(bone('RightArm')),E=v(bone('RightForeArm')),W=v(bone('RightHand')),M=v(bone('RightHandMiddle1')),M2=v(bone('RightHandMiddle2'));
    rows.push({time:t,phase:t/duration,wristLineAngleDeg:vecdeg(W.clone().sub(E),M.clone().sub(W)),elbowInteriorAngleDeg:vecdeg(A.clone().sub(E),W.clone().sub(E)),rightContactErrorM:state.rightContactErrorM,leftContactErrorM:state.leftContactErrorM,forearmTwistDegrees:state.rightForearmTwistDegrees,upperTwistDegrees:state.rightUpperTwistDegrees,gun:{p:gun.position.toArray(),q:gun.quaternion.toArray()},xyz});
    b?.sample();gb?.sample();
   }
   const label=`${cid}-${wid}`;char[wid]={duration,rows};
   if(CAP){b.write(`${output}/${label}.glb`,times);gb.write(`${output}/${label}-gun.glb`,times);}
   console.log(label,'duration',duration.toFixed(3),'wristLineDeg',Math.min(...rows.map(x=>x.wristLineAngleDeg)).toFixed(1),'..',Math.max(...rows.map(x=>x.wristLineAngleDeg)).toFixed(1),'elbowInterior',Math.min(...rows.map(x=>x.elbowInteriorAngleDeg)).toFixed(1),'..',Math.max(...rows.map(x=>x.elbowInteriorAngleDeg)).toFixed(1));
 }
}
fs.writeFileSync(`${output}/poses.json`,JSON.stringify(out,null,2));
