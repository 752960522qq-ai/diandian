/** Read-only source/pose equivalence proof. Optional reference site is supplied explicitly. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {runtime,siteDirectory} from '../weapon_v6_jitter/runtime.mjs';
const O='web/motion-labs/verification_weapon_v6_full_review/linxu';
const refArg=process.argv.find(x=>x.startsWith('--reference='))?.slice(12);
const target=process.env.WEAPON_V6_SITE||'current',a=await runtime(target);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['app.js','rig.js','weapon-attachment.js','natural-weapon.js','chest-skinning.js','assets/weapon_attachment.json','assets/characters/linxu/character.glb','assets/characters/linxu/motions.glb','assets/characters/linxu/weapon_update_v6.glb',...Object.keys(a.cfg.weapons).map(w=>'assets/weapons/'+w+'.glb')];
const fingerprints=dir=>Object.fromEntries(names.filter(n=>fs.existsSync(path.join(dir,n))).map(n=>[n,sha(fs.readFileSync(path.join(dir,n)))]));
const result={schema:1,checkedAt:new Date().toISOString(),target:'linxu-motion-lab',targetFiles:fingerprints(a.dir),referenceProvided:!!refArg,rows:[],notes:['M870 RifleRun and old longgun Run/Before are excluded from this 65-state render set.','240 Hz matrix equivalence is a reuse check, not a substitute for pixel review.']};
if(refArg){
 const b=await runtime(refArg);result.referenceFiles=fingerprints(b.dir);result.referenceLabel='reviewed pre-shoulder-fix source';
 const objects=r=>{let list=[r.model.wrapper];r.model.root.traverse(o=>list.push(o));return list;};
 const ao=objects(a),bo=objects(b);if(ao.length!==bo.length)throw Error('Character hierarchy size changed');
 const rows=JSON.parse(fs.readFileSync(O+'/manifest.json')).rows.filter(r=>r.coverage!=='delegated_longgun_run');
 for(const row of rows){let maxMatrixDelta=0,count=0;const d=a.duration(row.m,row.w);if(d!==b.duration(row.m,row.w))throw Error('Duration changed '+row.name);a.restore();b.restore();
 const ag=row.w==='none'?[]:[],bg=[];if(row.w!=='none'){a.model.attachment.weapons.get(row.w).traverse(o=>ag.push(o));b.model.attachment.weapons.get(row.w).traverse(o=>bg.push(o));if(ag.length!==bg.length)throw Error('Gun hierarchy changed');}
 for(let i=0;i<=Math.ceil(d*240);i++){const t=Math.min(d,i/240);a.pose(row.m,t,row.w);b.pose(row.m,t,row.w);for(const[x,y]of [[ao,bo],[ag,bg]])for(let k=0;k<x.length;k++){if(x[k].name!==y[k].name)throw Error('Object order mismatch '+x[k].name);for(let j=0;j<16;j++)maxMatrixDelta=Math.max(maxMatrixDelta,Math.abs(x[k].matrixWorld.elements[j]-y[k].matrixWorld.elements[j]));}count++;}
 result.rows.push({name:row.name,samples:count,maxMatrixDelta});console.log(row.name,count,maxMatrixDelta);
 }
 result.maxMatrixDelta=Math.max(...result.rows.map(r=>r.maxMatrixDelta));result.totalSamples=result.rows.reduce((s,r)=>s+r.samples,0);
 result.meshFilesUnchanged=Object.keys(result.referenceFiles).filter(n=>n.includes('/weapons/')||n.endsWith('/character.glb')).every(n=>result.referenceFiles[n]===result.targetFiles[n]);
 result.changedSourceFiles=names.filter(n=>result.referenceFiles[n]!==result.targetFiles[n]);result.reusable=result.rows.length===65&&result.maxMatrixDelta<1e-9&&result.meshFilesUnchanged;
}
fs.writeFileSync(O+'/render-reuse-proof.json',JSON.stringify(result,null,2));
