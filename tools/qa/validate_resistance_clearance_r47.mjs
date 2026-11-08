// Exact deformed triangle-to-triangle distance, including edge-to-edge minima.
// Hand/finger and trouser surface regions are separated by skin influence groups.
import fs from 'node:fs';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {read} from './validate_pf89.mjs';
const report={method:'60Hz deformed hand/finger triangles versus deformed trouser triangles; MeshBVH exact closestPointToGeometry; no bone-axis proxy',characters:{}};
for(const id of ['military','vest']){
 report.characters[id]={};
 for(const version of ['r46','r47']){
  const g=await read(`assets/characters/resistance_${version}/${id}/character.glb`),pack=await read(`assets/characters/resistance_${version}/${id}/motions.glb`),mixer=new T.AnimationMixer(g.scene),parts=[];
  g.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,j=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight,labels=[];
   for(let i=0;i<p.count;i++){const sum={Left:0,Right:0,lower:0,other:0};for(let k=0;k<4;k++){const n=mesh.skeleton.bones[j.getComponent(i,k)]?.name||'',weight=w.getComponent(i,k);const group=/LeftHand/.test(n)?'Left':/RightHand/.test(n)?'Right':/Hips|UpLeg|Leg|Foot|Toe/.test(n)?'lower':'other';sum[group]+=weight;}labels.push(sum.Left>.25&&sum.Left>sum.lower?'Left':sum.Right>.25&&sum.Right>sum.lower?'Right':sum.lower>.45?'lower':'other');}
   const selected={Left:[],Right:[],lower:[]},index=mesh.geometry.index;for(let t=0;t<index.count;t+=3){const tri=[index.getX(t),index.getX(t+1),index.getX(t+2)];for(const label of Object.keys(selected))if(tri.filter(i=>labels[i]===label).length>=2)selected[label].push(...tri);}
   const positions=new T.BufferAttribute(new Float32Array(p.count*3),3),geometries={};positions.array.set(p.array);for(const [label,index]of Object.entries(selected)){const geom=new T.BufferGeometry();geom.setAttribute('position',positions);geom.setIndex(index);geom.boundsTree=new MeshBVH(geom,{targetLeafSize:8});geometries[label]=geom;}const used=[...new Set(Object.values(selected).flat())];parts.push({mesh,positions,geometries,used});
  });
  const rows=[];for(const name of ['Idle','Walk']){
   mixer.stopAllAction();const clip=pack.animations.find(c=>c.name===name),action=mixer.clipAction(clip).reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();const count=Math.round(clip.duration*60),minimum={Left:Infinity,Right:Infinity},at={Left:0,Right:0},intersections={Left:0,Right:0},samples=[];
   for(let i=0;i<=count;i++){const t=clip.duration*i/count;action.time=t;mixer.update(0);g.scene.updateMatrixWorld(true);const distances={Left:Infinity,Right:Infinity};for(const {mesh,positions,geometries,used}of parts){mesh.skeleton.update();for(const vertex of used){const v=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,vertex);mesh.applyBoneTransform(vertex,v);v.applyMatrix4(mesh.matrixWorld);positions.setXYZ(vertex,v.x,v.y,v.z);}for(const geom of Object.values(geometries)){geom.boundsTree.refit();geom.boundingBox=geom.boundsTree.getBoundingBox(new T.Box3());}
     for(const side of ['Left','Right']){const result=geometries.lower.boundsTree.closestPointToGeometry(geometries[side],new T.Matrix4(),{},{});distances[side]=Math.min(distances[side],result.distance);}
    }
    for(const side of ['Left','Right']){if(distances[side]<minimum[side]){minimum[side]=distances[side];at[side]=t;}if(distances[side]<1e-5)intersections[side]++;}samples.push({time:t,...distances});
   }
   rows.push({clip:name,sampled_frames:count+1,minimum_surface_gap_native_m:minimum,minimum_surface_gap_preview_m:Object.fromEntries(Object.entries(minimum).map(([k,v])=>[k,v*1.75])),worst_time_seconds:at,intersecting_surface_frames:intersections,samples});console.log(id,version,name,minimum,intersections);
  }
  report.characters[id][version]={triangle_counts:parts.map(({geometries})=>Object.fromEntries(Object.entries(geometries).map(([k,g])=>[k,g.index.count/3]))),motions:rows};
 }
}
fs.writeFileSync('assets/characters/resistance_r47/surface-clearance-validation.json',JSON.stringify(report,null,2)+'\n');
for(const result of Object.values(report.characters))for(const row of result.r47.motions)for(const d of Object.values(row.minimum_surface_gap_native_m))if(d<.012)throw Error('R47 hand-to-trouser surface clearance is below 12mm native');
