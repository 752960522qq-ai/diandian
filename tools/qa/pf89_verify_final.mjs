// Independent CPU QA; no production writes. Usage: node tools/qa/pf89_verify_final.mjs output.json. Reads production config unchanged; no candidate overrides.
import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import fs from 'node:fs';
import {setup} from './validate_pf89.mjs';
const carryOnly=process.argv.includes('--carry-only');
const out=process.argv[2]||'work/pf89-r39/final-focused-clearance.json', report={hz:120,torsoHz:120,limits:'Torso ray hits prove segment/surface intersection only, not closed-solid penetration. Upper-arm first 20% excluded to avoid the normal shoulder attachment. Torso signed nearest surface uses torso-weighted triangles only; clothing and open boundaries can make inside signs ambiguous. Arm centerline, not full arm surface. Quaternion steps are local rotations; seam covariance is a shape proxy, not proof of anatomical correctness.',characters:{}};
const rad=T.MathUtils.radToDeg, v=()=>new T.Vector3();
function extreme(obj,key,value,info,min=false){if(Number.isFinite(value)&&(!obj[key]||(min?value<obj[key].value:value>obj[key].value)))obj[key]={value,...info};}
for(const cid of ['diandian','zhigeng']){
 const rt=await setup(cid), a=rt.attachment,b=a.bones, meshes=[], seam={Left:[],Right:[]},torso=[];
 rt.model.root.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m)});
 for(const m of meshes){const g=m.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ps=g.attributes.position;
  for(const side of ['Left','Right']){const hi=m.skeleton.bones.indexOf(b[side+'Hand']),fi=m.skeleton.bones.indexOf(b[side+'ForeArm']);if(hi<0||fi<0)continue;const inv=m.skeleton.boneInverses[hi].clone().multiply(m.bindMatrix);
   for(let i=0;i<ps.count;i++){let hw=0,fw=0;for(let k=0;k<4;k++){const j=si.getComponent(i,k),w=sw.getComponent(i,k);if(j===hi)hw+=w;if(j===fi)fw+=w;}if(hw>=.15&&fw>=.15&&hw+fw>=.9&&v().fromBufferAttribute(ps,i).applyMatrix4(inv).length()<.023)seam[side].push({m,i});}}
  const good=[];for(let i=0;i<ps.count;i++){let w=0;for(let k=0;k<4;k++)if(/(?:Hips|Spine\d*)$/.test(m.skeleton.bones[si.getComponent(i,k)]?.name||''))w+=sw.getComponent(i,k);good[i]=w>=.85;}
  const src=g.index, ids=[];for(let i=0;i<(src?src.count:ps.count);i+=3){const q=[0,1,2].map(k=>src?src.getX(i+k):i+k);if(q.every(j=>good[j]))ids.push(...q);}if(!ids.length)continue;
  const unique=[...new Set(ids)],map=new Map(unique.map((id,i)=>[id,i])),geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(new Float32Array(unique.length*3),3));geom.setIndex(ids.map(i=>map.get(i)));for(let i=0;i<unique.length;i++){const p=m.getVertexPosition(unique[i],v()).applyMatrix4(m.matrixWorld);geom.attributes.position.setXYZ(i,p.x,p.y,p.z);}torso.push({m,unique,geom,bvh:new MeshBVH(geom)});
 }


 const body=[];for(const m of meshes){const g=m.geometry,ix=g.index,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ids=[];for(let i=0;i<ix.count;i+=3){const verts=[0,1,2].map(k=>ix.getX(i+k));if(verts.every(j=>{let w=0;for(let k=0;k<4;k++)if(/Hips|Spine|Neck|Head|hair|Hair|face|Face|Jaw|Eye/.test(m.skeleton.bones[si.getComponent(j,k)]?.name||''))w+=sw.getComponent(j,k);return w>.5;}))ids.push(...verts);}if(!ids.length)continue;const unique=[...new Set(ids)],map=new Map(unique.map((i,j)=>[i,j])),geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(new Float32Array(unique.length*3),3));geom.setIndex(ids.map(i=>map.get(i)));for(let i=0;i<unique.length;i++){const p=m.getVertexPosition(unique[i],v()).applyMatrix4(m.matrixWorld);geom.attributes.position.setXYZ(i,p.x,p.y,p.z);}body.push({m,unique,geom,bvh:new MeshBVH(geom)});}
 rt.pose('RifleIdle',0);const gun=rt.attachment.weapons.get('pf89'),gunInv=gun.matrixWorld.clone().invert(),gp=[],gi=[];gun.traverse(o=>{if(o.isMesh){const start=gp.length/3;for(let i=0;i<o.geometry.attributes.position.count;i++)gp.push(...v().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld).applyMatrix4(gunInv).toArray());for(const i of o.geometry.index.array)gi.push(i+start);}});const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(gp,3));gg.setIndex(gi);const gbvh=new MeshBVH(gg);
 const rows=[],mount=rt.cfg.characters[cid].mounts.pf89;
 {

 const r={sampledFrames:0,crossings:0,gunCrossings:0,minDistance:Infinity,maxLeftError:0,maxRightError:0,maxElbowAngle:0,motions:{}};
 for(const motion of (carryOnly?['RifleIdle','RifleWalk','RifleRun']:['RifleIdle','RifleWalk','RifleRun','RocketRaiseLevel','RocketRaiseUp','RocketRaiseDown','RocketRaiseInfiniteLevel','RocketRaiseInfiniteUp','RocketRaiseInfiniteDown','RocketDraw','RocketFireDown'])){const name=rt.cfg.weapons.pf89.animation_overrides[motion]||motion,dur=rt.model.actions.get(name).getClip().duration,times=motion==='RifleIdle'&&!carryOnly?[0]:Array.from({length:Math.ceil(dur*120)+1},(_,i)=>Math.min(i/120,dur)),mr={crossings:0,gunCrossings:0,minDistance:Infinity,maxElbowAngle:0};
 for(const time of times){r.sampledFrames++;const state=rt.pose(motion,time);for(const m of meshes)m.skeleton.update();if(state.supportWeight===1)r.maxLeftError=Math.max(r.maxLeftError,state.leftContactErrorM||0);if((state.rightSupportWeight??1)===1)r.maxRightError=Math.max(r.maxRightError,state.rightContactErrorM||0);
 const sh=b.LeftArm.getWorldPosition(v()),el=b.LeftForeArm.getWorldPosition(v()),ha=b.LeftHand.getWorldPosition(v()),angle=rad(sh.clone().sub(el).angleTo(ha.clone().sub(el)));r.maxElbowAngle=Math.max(r.maxElbowAngle,angle);mr.maxElbowAngle=Math.max(mr.maxElbowAngle,angle);
 for(const x of [...torso,...body]){for(let i=0;i<x.unique.length;i++){const p=x.m.getVertexPosition(x.unique[i],v()).applyMatrix4(x.m.matrixWorld);x.geom.attributes.position.setXYZ(i,p.x,p.y,p.z);}x.bvh.refit();}
 let count=0;for(const x of body)x.bvh.bvhcast(gbvh,gun.matrixWorld,{intersectsTriangles:(a,b)=>{if(a.intersectsTriangle(b))count++;return false;}});r.gunCrossings+=count;mr.gunCrossings+=count;
 for(const [start,end] of [['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand']]){const p0=b[start].getWorldPosition(v()),p1=b[end].getWorldPosition(v()),rayStart=p0.clone().lerp(p1,start==='LeftArm'?.2:0),dir=p1.clone().sub(rayStart),len=dir.length(),ray=new T.Ray(rayStart,dir.normalize());let hits=0;for(const x of torso)hits+=x.bvh.raycast(ray,T.DoubleSide,1e-5,len-1e-5).length;if(hits){r.crossings++;mr.crossings++;mr.lastCrossing={time,segment:start};}
 for(let i=start==='LeftArm'?12:0;i<=40;i++){const p=p0.clone().lerp(p1,i/40);let d=Infinity;for(const x of torso){const hit=x.bvh.closestPointToPoint(p);d=Math.min(d,hit.distance);}r.minDistance=Math.min(r.minDistance,d);mr.minDistance=Math.min(mr.minDistance,d);}}
 }r.motions[motion]=mr;}
 rows.push(r);console.error(cid,JSON.stringify(r));}
 report.characters[cid]=rows;fs.writeFileSync(out,JSON.stringify(report,null,2));
}
console.log(out);
