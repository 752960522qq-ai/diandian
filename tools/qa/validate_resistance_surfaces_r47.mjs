import fs from 'node:fs';
import * as T from 'three';
import {setupResistance} from './validate_resistance_r47.mjs';
const result={characters:{},failures:[]},V=a=>new T.Vector3().fromArray(a),ray=new T.Raycaster();
function influence(mesh,i,pattern){let w=0;for(let j=0;j<4;j++)if(pattern.test(mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i,j)].name))w+=mesh.geometry.attributes.skinWeight.getComponent(i,j);return w;}
function makeTorso(root){const parts=[];root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,ix=g.index,indices=[];for(let i=0;i<(ix?.count||g.attributes.position.count);i+=3){const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);if(ids.every(v=>influence(mesh,v,/Spine|Hips/)>.65))indices.push(...ids);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(g.attributes.position.count*3),3));geo.setIndex(indices);parts.push({source:mesh,torso:new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}))});});return parts;}
function updateTorso(parts){for(const{source,torso}of parts){for(let i=0;i<source.geometry.attributes.position.count;i++){const p=source.getVertexPosition(i,new T.Vector3()).applyMatrix4(source.matrixWorld);torso.geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);}torso.geometry.computeBoundingSphere();}}
for(const cid of ['military','vest']){
 const m=await setupResistance(cid),meshes=[],torso=makeTorso(m.root);m.root.traverse(o=>{if(o.isSkinnedMesh){o.material=new T.MeshBasicMaterial({side:T.DoubleSide});meshes.push(o);}});
 const rows=[];for(const weapon of ['qbz95','type56_1','qbu85','type97hawk','qcq171'])for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle',...(weapon==='type97hawk'?['ShotgunPump']:[])]){
  let maxGap=0,maxIntrusion=0,minTorso=Infinity,misses=0;
  for(const fraction of [0,.23,.47,.71,.97]){
   const state=m.pose(motion,m.duration(motion,weapon)*fraction,weapon),gun=m.attachment.weapons.get(weapon);for(const mesh of meshes){mesh.computeBoundingSphere();mesh.computeBoundingBox();}
   for(const side of ['Right','Left']){
    const target=V(side==='Right'?state.rightSurfaceTargetWorld:state.supportTargetWorld),inward=(side==='Right'?new T.Vector3(-1,0,0):new T.Vector3(0,1,0)).applyQuaternion(gun.quaternion);
    ray.set(target.clone().addScaledVector(inward,.035),inward.clone().negate());ray.far=.08;
    const hits=ray.intersectObjects(meshes,false).filter(h=>h.face&&[h.face.a,h.face.b,h.face.c].some(i=>influence(h.object,i,new RegExp(side+'Hand'))>.35));
    if(!hits.length){misses++;continue;}
    const delta=target.clone().sub(hits[0].point).dot(inward);maxGap=Math.max(maxGap,delta);maxIntrusion=Math.max(maxIntrusion,-delta);
   }
   if(['RifleIdle','RifleWalk','RifleRun'].includes(motion)){
    updateTorso(torso);const pos=s=>m.bones.get('mixamorig:'+s).getWorldPosition(new T.Vector3());const up=pos('Spine2').sub(pos('Hips')).normalize(),right=pos('RightArm').sub(pos('LeftArm')).normalize(),front=new T.Vector3().crossVectors(up,right).normalize();
    for(const side of ['Left','Right'])for(const f of [.65,1]){
     const p=pos(side+'ForeArm').lerp(pos(side+'Hand'),f);ray.set(p.clone().addScaledVector(front,.5),front.clone().negate());ray.far=.7;const hit=ray.intersectObjects(torso.map(p=>p.torso),false)[0];if(hit)minTorso=Math.min(minTorso,p.clone().sub(hit.point).dot(front));
    }
   }
  }
  const row={weapon,motion,maxPalmSurfaceGapM:maxGap,maxPalmSurfaceIntrusionM:maxIntrusion,handRayMisses:misses,minForearmToTorsoFrontM:Number.isFinite(minTorso)?minTorso:null};rows.push(row);
  if(misses||maxGap>.012||maxIntrusion>.01||minTorso<-.005)result.failures.push({cid,...row});
 }
 result.characters[cid]=rows;console.log('SURFACE_SCAN',cid);
}
fs.writeFileSync('web/motion-labs/verification_r47/surface-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.failures,null,2));process.exitCode=result.failures.length?1:0;
