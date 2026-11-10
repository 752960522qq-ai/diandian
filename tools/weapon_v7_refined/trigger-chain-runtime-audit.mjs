/** Read-only post-bake audit: final site runtime versus frozen V6. */
import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {runtime} from './runtime.mjs';import {makeChain,getTriggerSurface} from './trigger-chain-geometry.mjs';
const expected=JSON.parse(fs.readFileSync('tools/weapon_v7_refined/trigger-chain-targets.json')).characters,output='web/motion-labs/verification_weapon_v7/refined/trigger-chain-runtime-audit.json';
const P=b=>b.getWorldPosition(new T.Vector3()),Q=b=>b.getWorldQuaternion(new T.Quaternion()).normalize(),deg=a=>a*180/Math.PI;const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
let report={description:'25 playback samples per motion; pad is a 5 mm geometric proxy, not a measured skin penetration depth.',characters:{},failures:[]};
for(const cid of ['linxu','military','vest']){
 const v7=await runtime(cid),v6=await runtime(cid,'../v6_reference'),r=v7.model,b=v6.model,rows=[],rev=v7.extra.parser.json.asset.extras?.natural_weapon_v7?.revision,filename=v7.site+`/assets/characters/${cid}/weapon_update_v7.glb`;
 if(rev!=='male-pose-v7')report.failures.push({cid,error:'runtime did not select V7'});
 for(const w of ['qsz92','type54','type64'])for(const m of ['PistolAimingIdle','PistolShooting']){
  const d=r.duration(m,w),row={weapon:w,motion:m,samples:25,duration:d,maxGoalAngleDeg:0,minPadProxyErrorMm:Infinity,maxPadProxyErrorMm:0,maxGunPositionDiffMm:0,maxGunAngleDiffDeg:0,maxWristDisplacementErrorMm:0,maxWristAngleDiffDeg:0,maxFingerStepDeg:0,maxV6FingerStepDeg:0,maxSeekSwitchAngleDeg:0,maxSeekSwitchGunPositionMm:0,finite:true};let prev=null,prev6=null;
  for(let i=0;i<=24;i++){
   let t=d*i/24,st=r.pose(m,t,w);b.pose(m,t,w);if(!st.visible||!st.naturalReference||st.actualClip!==v7.cfg.weapons[w].animation_overrides[m])row.finite=false;
   const gun=r.attachment.weapons.get(w),basegun=b.attachment.weapons.get(w),hand=r.bones.get('mixamorig:RightHand'),bh=b.bones.get('mixamorig:RightHand'),gq=Q(gun),goal=expected[cid][w];
   row.maxGunPositionDiffMm=Math.max(row.maxGunPositionDiffMm,P(gun).distanceTo(P(basegun))*1000);row.maxGunAngleDiffDeg=Math.max(row.maxGunAngleDiffDeg,deg(gq.angleTo(Q(basegun))));
   let offset=(cid==='military'&&w==='qsz92')?new T.Vector3(0,0,-.004).applyQuaternion(gq):new T.Vector3();row.maxWristDisplacementErrorMm=Math.max(row.maxWristDisplacementErrorMm,P(hand).sub(P(bh)).distanceTo(offset)*1000);row.maxWristAngleDiffDeg=Math.max(row.maxWristAngleDiffDeg,deg(Q(hand).angleTo(Q(bh))));
   let qs=[],bs=[];for(let j=1;j<=3;j++){let name='mixamorig:RightHandIndex'+j,q=r.bones.get(name).quaternion.clone().normalize(),q6=b.bones.get(name).quaternion.clone().normalize();if(![...q.toArray(),...q6.toArray()].every(Number.isFinite))row.finite=false;row.maxGoalAngleDeg=Math.max(row.maxGoalAngleDeg,deg(q.angleTo(new T.Quaternion().fromArray(goal.quaternions[j-1]).normalize())));qs.push(q);bs.push(q6);}if(prev)for(let j=0;j<3;j++){row.maxFingerStepDeg=Math.max(row.maxFingerStepDeg,deg(qs[j].angleTo(prev[j])));row.maxV6FingerStepDeg=Math.max(row.maxV6FingerStepDeg,deg(bs[j].angleTo(prev6[j])));}prev=qs;prev6=bs;
   let chain=makeChain(r.bones,cid,gun),pts=chain.points(),surf=getTriggerSurface(gun,w);if(!surf){row.finite=false;continue;}let proxy=pts[2].clone().lerp(pts[3],.65).addScaledVector(chain.padNormal(),.005),e=proxy.distanceTo(surf)*1000;row.minPadProxyErrorMm=Math.min(row.minPadProxyErrorMm,e);row.maxPadProxyErrorMm=Math.max(row.maxPadProxyErrorMm,e);
  }
  r.pose(m,d*.37,w);const name=i=>'mixamorig:RightHandIndex'+i,qs=[1,2,3].map(i=>r.bones.get(name(i)).quaternion.clone().normalize()),gun=r.attachment.weapons.get(w),gp=P(gun);
  for(const [ww,mm]of [['m870','ShotgunPump'],['qsz92','PistolIdle'],['none','Walk']])r.pose(mm,r.duration(mm,ww)*.51,ww);r.pose(m,d*.37,w);for(let i=1;i<=3;i++)row.maxSeekSwitchAngleDeg=Math.max(row.maxSeekSwitchAngleDeg,deg(qs[i-1].angleTo(r.bones.get(name(i)).quaternion.clone().normalize())));row.maxSeekSwitchGunPositionMm=gp.distanceTo(P(gun))*1000;
  if(!row.finite||row.maxGoalAngleDeg>.02||row.maxPadProxyErrorMm>1.2||row.maxGunPositionDiffMm>.1||row.maxGunAngleDiffDeg>.01||row.maxWristDisplacementErrorMm>.1||row.maxWristAngleDiffDeg>.01||row.maxSeekSwitchAngleDeg>.01||row.maxSeekSwitchGunPositionMm>.01)report.failures.push({cid,...row});rows.push(row);
 }
 report.characters[cid]={siteGlbSha256:sha(filename),rows};console.log(cid,rows.length,'actions','failures',report.failures.filter(x=>x.cid===cid).length);
}
report.passed=!report.failures.length;fs.writeFileSync(output,JSON.stringify(report,null,2));console.log('SUMMARY',report.passed?'PASS':'FAIL',report.failures.length);if(!report.passed)process.exitCode=1;
