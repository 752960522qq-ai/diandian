// Second pass: actual skinned-vertex penetration, consensus ray parity, bounded joint relaxation.
import fs from 'node:fs';import * as T from 'three';import {setupLinxu}from '../qa/validate_linxu_motion.mjs';import{gunGeometry,nearest,handVertices,vertexGun}from '../qa/linxu_surface_geometry_v4.mjs';
const file='web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json',cfg=JSON.parse(fs.readFileSync(file)),rt=await setupLinxu('linxu'),vertices=handVertices(rt.root),deg=T.MathUtils.radToDeg;
const dirs=[[1,.123,.317],[.219,1,.431],[.183,.367,1]].map(a=>new T.Vector3(...a).normalize()).flatMap(a=>[a,a.clone().negate()]);
function signed(g,p){const n=nearest(g,p);if(n.signed>=0)return n.signed;let odd=0;for(const d of dirs){const hits=g.bvh.raycast(new T.Ray(p,d),T.DoubleSide).map(h=>h.distance).filter(v=>v>1e-7).sort((a,b)=>a-b);let count=0,last=-1;for(const v of hits)if(v-last>1e-6){count++;last=v;}odd+=count%2;}return odd>=5?-n.distance:n.distance;}
function angle(c,j){return deg(c[j].getWorldPosition(new T.Vector3()).sub(c[j-1].getWorldPosition(new T.Vector3())).angleTo(c[j+1].getWorldPosition(new T.Vector3()).sub(c[j].getWorldPosition(new T.Vector3()))));}
const report=[];
for(const w of Object.keys(cfg.weapons)){
 rt.pose('RifleAimingIdle',.37,w);const gun=rt.attachment.weapons.get(w),g=gunGeometry(gun);for(const side of ['Right','Left'])for(const digit of ['Thumb','Index','Middle','Ring','Pinky']){
  const samples=vertices.filter(v=>v.side===side&&v.digit===digit),c=[1,2,3,4].map(j=>rt.bones.get(`mixamorig:${side}Hand${digit}${j}`)),start=c.slice(0,3).map(b=>b.quaternion.clone()),tip=c[3].getWorldPosition(new T.Vector3());
  function cost(){let sum=0,max=0;for(const v of samples){const d=signed(g,vertexGun(v,gun));if(d<-.00035){const e=((d+.00035)*1000)**2;sum+=e;max=Math.max(max,e);}}let val=sum/samples.length*15+max*15+c[3].getWorldPosition(new T.Vector3()).distanceToSquared(tip)*1e6*.04;for(let j=0;j<3;j++)val+=(deg(c[j].quaternion.angleTo(start[j]))**2)*.002;for(let j=1;j<3;j++)val+=Math.max(0,angle(c,j)-(digit==='Thumb'?70:j===1?100:70))**2*50;return {val,maxDepth:Math.sqrt(max)+.35};}
  const before=cost();if(before.maxDepth<.9)continue;let best=before.val;
  for(const ds of [15,8,4,2,1])for(let iter=0;iter<4;iter++)for(let j=0;j<3;j++){
   const old=c[j].quaternion.clone(),bestq=old.clone();let val=best;
   let axes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];if(j>0&&digit!=='Thumb'){const a=c[j].getWorldPosition(new T.Vector3()).sub(c[j-1].getWorldPosition(new T.Vector3())),b=c[j+1].getWorldPosition(new T.Vector3()).sub(c[j].getWorldPosition(new T.Vector3()));axes=[new T.Vector3().crossVectors(a,b).normalize().applyQuaternion(c[j].parent.getWorldQuaternion(new T.Quaternion()).invert())];}
   for(const axis of axes)for(const sign of [-1,1]){c[j].quaternion.copy(new T.Quaternion().setFromAxisAngle(axis,T.MathUtils.degToRad(sign*ds)).multiply(old));c[j].updateMatrixWorld(true);if(deg(c[j].quaternion.angleTo(start[j]))>45)continue;const v=cost().val;if(v<val){val=v;bestq.copy(c[j].quaternion);}}
   c[j].quaternion.copy(bestq);c[j].updateMatrixWorld(true);best=val;
  }
  const after=cost();for(const mount of [cfg.characters.linxu.mounts[w],...Object.values(cfg.characters.linxu.mounts[w].motions)])if(mount.reference_grip)for(let j=0;j<3;j++){const key=`mixamorig:${side}Hand${digit}${j+1}`;mount.reference_grip.tracks[key]={times:[0],values:c[j].quaternion.toArray()};}
  report.push({weapon:w,side,digit,before,after,pip:angle(c,1),dip:angle(c,2)});console.log(w,side,digit,before.maxDepth,after.maxDepth);
 }
}
fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');fs.writeFileSync('work/linxu-motion-v4/contact-relax-report.json',JSON.stringify(report,null,2)+'\n');
