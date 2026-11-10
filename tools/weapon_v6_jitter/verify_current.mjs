/** Current-site sampling only. No baseline or historical v5 snapshot required.
 * Reuses the unchanged runtime/cyclic algorithms used by the recorded audits.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {runtime,OUT,cyclic} from './runtime.mjs';
const r=await runtime(),rows=[];
for(const weapon of['none','qsz92','type54','type64'])for(const hz of[60,120,240]){
 const motion=weapon==='none'?'Walk':'PistolIdle',c=cyclic(r,motion,weapon,hz,weapon==='none'?3:30);
 rows.push({weapon,motion,hz,duration:c.d,samples:c.samples.length,metrics:c.metrics});
}
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(OUT+'/current-site-validation.json',JSON.stringify({method:'Current production rig/assets, unchanged continuous CPU sampling. No historical baseline or v5 snapshot is loaded; not a browser test.',motionsSHA256:crypto.createHash('sha256').update(fs.readFileSync(r.dir+'/assets/characters/linxu/motions.glb')).digest('hex'),rows},null,2));
console.log('CURRENT SITE CHECKED',rows.length,'cases');
