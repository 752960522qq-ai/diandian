import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from 'three';import {MeshBVH} from 'three-mesh-bvh';
import {setup} from './validate_pf89.mjs';
import {installFixedGunMotions} from '../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js';
const samples=[];
for(const character of ['diandian','zhigeng']){
 const r=await setup(character);installFixedGunMotions(r.model);
 const meshes=[];r.model.root.traverse(mesh=>{if(mesh.isSkinnedMesh&&mesh.geometry.index)meshes.push(mesh);});
 for(const [weapon,motions,parts,region] of [
  ['qjz89',['QJZ89Idle','QJZ89Aim'],['Base2_tripo_part_1','Base2_tripo_part_3','Base2_tripo_part_7'],/UpLeg|Leg|Foot|Toe/],
  ['qbu10',['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading'],['tripo_part_2'],/Spine|Hips|Arm|ForeArm|UpLeg|Leg|Foot|Toe/],
 ])for(const motion of motions){
  const duration=r.model.actions.get(motion).getClip().duration;
  for(const fraction of [.37,.75]){
   r.pose(motion,duration*fraction,weapon);const positions=[],indices=[];
   for(const mesh of meshes){
    const {skinIndex,skinWeight}=mesh.geometry.attributes,selected=new Set();
    if(!skinIndex||!skinWeight)continue;
    for(let i=0;i<skinIndex.count;i++){let weight=0;for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[skinIndex.getComponent(i,k)];if(region.test(bone?.name||''))weight+=skinWeight.getComponent(i,k);}if(weight>.8)selected.add(i);}
    const map=new Map();
    for(let i=0;i<mesh.geometry.index.count;i+=3){const tri=[0,1,2].map(k=>mesh.geometry.index.getX(i+k));if(!tri.every(v=>selected.has(v)))continue;
     for(const v of tri){if(!map.has(v)){map.set(v,positions.length/3);positions.push(...mesh.getVertexPosition(v,new T.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());}indices.push(map.get(v));}
    }
   }
   const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(positions,3));body.setIndex(indices);const tree=new MeshBVH(body),intersections={};
   for(const name of parts){const part=r.attachment.weapons.get(weapon).getObjectByName(name);assert(part);const geometry=part.geometry.clone().applyMatrix4(part.matrixWorld);let count=0;
    tree.bvhcast(new MeshBVH(geometry),new T.Matrix4(),{intersectsTriangles:(a,b)=>{if(a.intersectsTriangle(b))count++;return false;}});geometry.dispose();intersections[name]=count;
   }
   body.dispose();samples.push({character,weapon,motion,fraction,intersections});
  }
 }
}
const failed=samples.filter(s=>Object.values(s.intersections).some(n=>n>0));
fs.writeFileSync('web/motion-labs/verification_r44/clearance.json',JSON.stringify({passed:failed.length===0,scope:'Tripod vs legs; QBU bipod vs torso, arms and legs. Hands excluded at intentional grip contacts.',samples},null,2)+'\n');
console.log(JSON.stringify({poses:samples.length,failures:failed}));assert.equal(failed.length,0,'Support intersections');
