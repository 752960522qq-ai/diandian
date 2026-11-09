import fs from 'node:fs';
import * as T from 'three';
import {read} from './validate_pf89.mjs';
import {prepareRig,unarmed,armed} from '../../web/motion-labs/linxu-motion-lab/rig.js';
const dir='web/motion-labs/linxu-motion-lab';
export async function setupLinxu(cid){
 const cfg=JSON.parse(fs.readFileSync(dir+'/assets/weapon_attachment.json'));
 const weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${dir}/assets/weapons/${id}.glb`)).scene])));
 const scene=new T.Scene(),gltf=await read(`${dir}/assets/characters/${cid}/character.glb`),pack=await read(`${dir}/assets/characters/${cid}/motions.glb`);
 return prepareRig(gltf,pack,cid,cfg,weapons,scene);
}
if(process.argv[1]?.endsWith('validate_linxu_motion.mjs')){
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'web/motion-labs/verification_linxu';
const report={characters:{},failures:[]};
for(const cid of ['linxu']){
 const m=await setupLinxu(cid),rows=[];
 for(const wid of ['none','qbz95','type56_1','qbu85','type97hawk','qcq171']){
  const motions=wid==='none'?unarmed:wid==='type97hawk'?[...armed,['ShotgunPump']]:armed;
  for(const [motion] of motions){let left=0,right=0,reload=0,nonfinite=0;const d=m.duration(motion,wid);
   for(let i=0;i<=60;i++){const s=m.pose(motion,d*i/60,wid);left=Math.max(left,s.leftContactErrorM||0);right=Math.max(right,s.rightContactErrorM||0);reload=Math.max(reload,s.reloadClearanceErrorM||0);for(const bone of new Set(m.bones.values()))if(bone.matrixWorld.elements.some(v=>!Number.isFinite(v)))nonfinite++;if(s.visible!==(wid!=='none'))throw Error('Visibility mismatch');}
   rows.push({weapon:wid,motion,duration:d,maxLeftErrorM:left,maxRightErrorM:right,maxReloadClearanceErrorM:reload,nonfinite});
   if(nonfinite||!d||left>.003||right>.003||reload>.003)report.failures.push({cid,...rows.at(-1)});
  }
 }
 m.pose('RifleAimingIdle',.2,'qbz95');const capture=()=>[...new Set(m.bones.values())].flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);const before=capture();
 for(let i=0;i<5;i++){m.pose('ShotgunPump',.3,'type97hawk');m.pose('WalkingBackwards',.3,'none');m.pose('Reloading',.7,'qbu85');}
 m.pose('RifleAimingIdle',.2,'qbz95');const drift=Math.max(...capture().map((v,i)=>Math.abs(v-before[i])));if(drift>1e-5)report.failures.push({cid,drift});
 report.characters[cid]={clips:m.actions.size,sampledFrames:rows.length*61,maxPoseDrift:drift,rows};
}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/attachment-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({characters:Object.fromEntries(Object.entries(report.characters).map(([k,v])=>[k,{clips:v.clips,frames:v.sampledFrames,drift:v.maxPoseDrift}])),failures:report.failures},null,2));
process.exitCode=report.failures.length?1:0;
}
