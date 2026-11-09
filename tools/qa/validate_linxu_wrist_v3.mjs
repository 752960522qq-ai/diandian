import fs from 'node:fs';import * as T from 'three';import {setupLinxu} from './validate_linxu_motion.mjs';
let rows=[];
for(const cid of ['linxu']){const m=await setupLinxu(cid);for(const w of Object.keys(m.attachment.config.weapons))for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading',...(w==='type97hawk'?['ShotgunPump']:[])]){
 let r={cid,w,motion,right:0,left:0,rt:0,lt:0};for(let i=0;i<=60;i++){const t=m.duration(motion,w)*i/60;m.pose(motion,t,w);for(const side of ['Right','Left']){const p=n=>m.bones.get('mixamorig:'+side+n).getWorldPosition(new T.Vector3()),a=T.MathUtils.radToDeg(p('Hand').sub(p('ForeArm')).angleTo(p('HandMiddle1').sub(p('Hand'))));if(a>r[side.toLowerCase()]){r[side.toLowerCase()]=a;r[side==='Right'?'rt':'lt']=t;}}}rows.push(r);
}}
fs.writeFileSync('web/motion-labs/verification_linxu_v3/wrist-scan.json',JSON.stringify(rows,null,2));console.log(rows.filter(r=>r.right>65||r.left>65));
