import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {setup,read} from './validate_pf89.mjs';
const report={};
for (const cid of ['diandian','zhigeng']) {
 const rt=await setup(cid),pack=await read(`${rt.dir}/assets/uploaded_motions.glb`);
 for(const clip of pack.animations)rt.model.actions.set(clip.name,rt.model.mixer.clipAction(clip));
 const meshes=[];rt.model.root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 report[cid]={};
 for (const name of ['Dying','FlyingBackDeath']) {
  const duration=rt.model.actions.get(name).getClip().duration,frames=[];
  for (let i=0;i<=20;i++) {
   rt.pose(name,duration*i/20,'qsz92');let minY=Infinity;
   const p=new THREE.Vector3();
   for(const mesh of meshes)for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex++) {
    mesh.getVertexPosition(vertex,p);mesh.localToWorld(p);minY=Math.min(minY,p.y);
   }
   frames.push({time:duration*i/20,minimumY:minY});
  }
  const minimum=Math.min(...frames.map(f=>f.minimumY));
  assert(minimum>-.004,`${cid} ${name} floor intersection ${minimum}`);
  report[cid][name]={minimumY:minimum,samples:frames.length,frames};
  console.log('GROUND_PASS',cid,name,minimum);
 }
}
fs.writeFileSync('web/motion-labs/verification_r41/ground.json',JSON.stringify(report,null,2)+'\n');
