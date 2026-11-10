import fs from 'node:fs';import * as T from 'three';
import {candidate} from '../weapon_v6_three/candidate.mjs';import {runtime} from './runtime.mjs';import {configureShotgunSource,applyShotgunFit,SHOULDER_MOTIONS} from './shotgun-policy.mjs';import {measurePrepare,stats} from '../weapon_v6_shoulder/audit.mjs';
const out='web/motion-labs/verification_weapon_v7/refined',report={comparison:'Source candidate versus V6 interpolated playback. Small source/bake interpolation deviations are reported, not changes to body tracks; final pack bitwise scope is validated separately.',characters:{},failures:[]};
const P=b=>b.getWorldPosition(new T.Vector3()),Q=b=>b.getWorldQuaternion(new T.Quaternion()).normalize();
for(const cid of ['linxu','military','vest']){
 const {model:rt}=await runtime(cid,'../v6_reference'),c=await candidate(cid),orig=structuredClone(c.src.cfg.characters.diandian.mounts.winchester1897.re4_mount),base={model:rt,restore:()=>{}},fixed={model:{root:c.gltf.scene,wrapper:c.wrapper,bones:c.bones},restore:()=>{}};
 for(const r of [base,fixed])r.bindQ=Object.fromEntries(['LeftShoulder','LeftArm'].map(n=>[n,Q(r.model.bones.get('mixamorig:'+n))]));
 const specs=Object.fromEntries(['base','fixed'].map((n,i)=>[n,Object.fromEntries(['shoulder','elbow','wrist'].map(region=>[region,measurePrepare([base,fixed][i],region)]))]));
 const rows=[];
 for(const m of [...SHOULDER_MOTIONS]){
  const samples=[];let maxShift=0,maxUnrelated=0,maxReach=0,maxGunAngle=0,maxLocalStep=0,prev=null;
  for(let i=0;i<=60;i++){
   const time=c.duration('m870',m)*i/60;rt.pose(m,time,'m870');configureShotgunSource(c,'m870',m,orig);c.pose('m870',m,time);const gun=c.gunScenes.get('m870'),fit=applyShotgunFit({bones:c.bones,gun,cid,weapon:'m870',motion:m});c.scene.updateMatrixWorld(true);maxReach=Math.max(maxReach,fit.maxWristReachErrorM);
   for(const[n,b]of c.bones){const a=rt.bones.get(n);if(!a)continue;if(/(?:Arm|ForeArm|Hand)/.test(n))maxShift=Math.max(maxShift,P(b).distanceTo(P(a)));else maxUnrelated=Math.max(maxUnrelated,b.position.distanceTo(a.position),Q(b).angleTo(Q(a)));}
   maxGunAngle=Math.max(maxGunAngle,gun.quaternion.clone().normalize().angleTo(rt.attachment.weapons.get('m870').quaternion.clone().normalize()));const current=Object.fromEntries(['LeftArm','LeftForeArm','LeftHand'].map(n=>[n,c.bones.get('mixamorig:'+n).quaternion.clone().normalize()]));if(prev)for(const n in prev)maxLocalStep=Math.max(maxLocalStep,prev[n].angleTo(current[n]));prev=current;
   const small=(r,ss)=>Object.fromEntries(Object.entries(ss).map(([reg,s])=>{const q=stats(r,s);return[reg,{detP10:q.detP10,detMin:q.detMin,areaP10:q.areaP10,lowDetFraction:q.lowDetFraction}]}));
   samples.push({phase:i/60,time,base:small(base,specs.base),fixed:small(fixed,specs.fixed)});
  }
  const summary={motion:m,samples:samples.length,duration:c.duration('m870',m),maxArmPointShiftM:maxShift,maxUnrelatedBoneComponentDifference:maxUnrelated,maxWristReachErrorM:maxReach,maxGunAngularChangeDeg:maxGunAngle*180/Math.PI,maxAdjacentLeftBoneRotationDeg:maxLocalStep*180/Math.PI,regions:Object.fromEntries(['shoulder','elbow','wrist'].map(reg=>[reg,Object.fromEntries(['base','fixed'].map(mode=>[mode,{worstDetP10:Math.min(...samples.map(s=>s[mode][reg].detP10)),worstAreaP10:Math.min(...samples.map(s=>s[mode][reg].areaP10)),maxLowDetFraction:Math.max(...samples.map(s=>s[mode][reg].lowDetFraction))}]))])),series:samples};
  rows.push(summary);console.log(cid,m,JSON.stringify({...summary,series:undefined}));if(maxReach>.001||maxGunAngle>.005||maxLocalStep>1.5)report.failures.push({cid,m,maxReach,maxGunAngle,maxLocalStep});
 }
 report.characters[cid]=rows;
}
fs.writeFileSync(out+'/shotgun-audit.json',JSON.stringify(report,null,2));if(report.failures.length)process.exitCode=1;
