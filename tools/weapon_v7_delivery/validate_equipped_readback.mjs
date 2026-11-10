/** Independently decode the all-equipped GLB and compare it with final runtime poses. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {runtime,decode} from '../weapon_v7_refined/runtime.mjs';
const output='web/motion-labs/verification_weapon_v7/equipped-readback.json';
const report={scope:'Independent raw GLTF accessor interpolation and reconstructed skinned bone hierarchy against final prepareRig().pose(). Exact and between-sample checks, including hand-local gun tracks and pump.',limits:{exactAngleDeg:.1,exactPositionM:.0001,interpolatedAngleDeg:1,interpolatedPositionM:.002},characters:{},failures:[]};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const P=b=>b.getWorldPosition(new T.Vector3());
const Q=b=>b.getWorldQuaternion(new T.Quaternion()).normalize();
const angle=(a,b)=>a.clone().normalize().angleTo(b.clone().normalize())*180/Math.PI;
function values(g,bin,id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type],offset=(v.byteOffset||0)+(a.byteOffset||0);if(a.componentType!==5126||a.sparse)throw Error('Unsupported channel');return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>bin.readFloatLE(offset+i*(v.byteStride||n*4)+k*4)));}
function sample(times,rows,t,quat=false){let lo=0,hi=times.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(times[mid]<=t)lo=mid;else hi=mid-1;}const j=Math.min(lo+1,times.length-1),u=j===lo?0:Math.max(0,Math.min(1,(t-times[lo])/(times[j]-times[lo])));if(quat)return new T.Quaternion().fromArray(rows[lo]).normalize().slerp(new T.Quaternion().fromArray(rows[j]).normalize(),u).toArray();return rows[lo].map((x,k)=>x+(rows[j][k]-x)*u);}
const reshape=(a,n)=>Array.from({length:a.length/n},(_,i)=>a.slice(i*n,i*n+n));
for(const cid of (process.argv[2]||'linxu,military,vest').split(',')){
 const folder=`assets/characters/weapon_update_v7/${cid}`,file=folder+'/equipped_all_motions.glb',{g,bin}=decode(file),transforms=JSON.parse(fs.readFileSync(folder+'/equipped_all_weapon_transforms.json')).tracks,{model:r}=await runtime(cid),{model:b}=await runtime(cid),rows=[];
 for(const anim of g.animations){
  const {weapon:w,motion:m}=anim.extras,channels=anim.channels.map(c=>{const s=anim.samplers[c.sampler];if(s.interpolation!=='LINEAR')throw Error('Unexpected interpolation');return{name:g.nodes[c.target.node].name,path:c.target.path,times:values(g,bin,s.input).map(a=>a[0]),values:values(g,bin,s.output)};}),times=channels[0].times,d=r.duration(m,w),gt=transforms[anim.name],gp=reshape(gt.positions,3),gq=reshape(gt.rotations,4),pump=gt.pump.map(x=>[x]);
  const metrics={exact:{angleDeg:0,bonePositionM:0,gunPositionM:0,gunAngleDeg:0,pumpM:0},interpolated:{angleDeg:0,bonePositionM:0,gunPositionM:0,gunAngleDeg:0,pumpM:0}};
  const checks=[...new Set([0,.2,.5,.8,1].map(p=>times[Math.round((times.length-1)*p)]))].map(time=>({mode:'exact',time}));
  checks.push(...[.1234567,.3712345,.7312345,.9512345].map(p=>({mode:'interpolated',time:d*p})));
  for(const {mode,time}of checks){
   const state=r.pose(m,time,w);b.pose(m,time,w);
   for(const c of channels){const bone=b.bones.get(c.name);if(!bone)throw Error('Missing '+c.name);const a=sample(c.times,c.values,time,c.path==='rotation');if(c.path==='rotation')bone.quaternion.fromArray(a);else if(c.path==='translation')bone.position.fromArray(a);else throw Error('Unexpected target '+c.path);}
   b.root.updateMatrixWorld(true);
   const mm=metrics[mode];for(const c of channels){const orig=r.bones.get(c.name),baked=b.bones.get(c.name);mm.angleDeg=Math.max(mm.angleDeg,angle(orig.quaternion,baked.quaternion));mm.bonePositionM=Math.max(mm.bonePositionM,P(orig).distanceTo(P(baked)));}
   const hand=b.bones.get('mixamorig:RightHand'),p=hand.localToWorld(new T.Vector3().fromArray(sample(gt.times,gp,time))),q=Q(hand).multiply(new T.Quaternion().fromArray(sample(gt.times,gq,time,true))).normalize(),gun=r.attachment.weapons.get(w);
   mm.gunPositionM=Math.max(mm.gunPositionM,p.distanceTo(P(gun)));mm.gunAngleDeg=Math.max(mm.gunAngleDeg,angle(q,Q(gun)));mm.pumpM=Math.max(mm.pumpM,Math.abs(sample(gt.times,pump,time)[0]-(state.pumpTravelM||0)));
  }
  const row={clip:anim.name,weapon:w,motion:m,duration:d,frames:times.length,samples:checks.length,metrics};rows.push(row);
  for(const mode of ['exact','interpolated']){const mm=metrics[mode],position=mode==='exact'?report.limits.exactPositionM:report.limits.interpolatedPositionM,ang=mode==='exact'?report.limits.exactAngleDeg:report.limits.interpolatedAngleDeg;if(!Object.values(mm).every(Number.isFinite)||mm.angleDeg>ang||mm.gunAngleDeg>ang||mm.bonePositionM>position||mm.gunPositionM>position||mm.pumpM>position)report.failures.push({cid,mode,...row});}
 }
 report.characters[cid]={pack_sha256:sha(file),tracks_sha256:sha(folder+'/equipped_all_weapon_transforms.json'),rows};console.log(cid,rows.length,'clips',report.failures.filter(x=>x.cid===cid).length,'failures');
}
report.passed=report.failures.length===0;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
