import fs from 'node:fs';
import * as T from 'three';
import {read,decode} from './validate_pf89.mjs';
const root='assets/characters/resistance_r45',report={};
for(const id of ['military','vest']){
 const source=await read(`${root}/${id}/source.glb`),fixed=await read(`${root}/${id}/character.glb`),pack=await read(`${root}/${id}/motions.glb`);
 const sm=new T.AnimationMixer(source.scene),fm=new T.AnimationMixer(fixed.scene),meshes=[];fixed.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});let neutralInfluences=0;for(const mesh of meshes){const j=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;for(let i=0;i<j.count;i++)for(let k=0;k<4;k++)if(w.getComponent(i,k)>0&&mesh.skeleton.bones[j.getComponent(i,k)]?.name==='neutral_bone')neutralInfluences++;}
 let originals=[];source.scene.traverse(o=>{if(o.isSkinnedMesh)originals.push(o);});
 const fixes=decode(`${root}/${id}/character.glb`).g.asset.extras.resistance_weight_repairs||[],rows=[];let maxFixedSeam=0,maxOldSeam=0,maxEdgeRatio=0;
 const originalData=decode(`${root}/${id}/source.glb`),fixedData=decode(`${root}/${id}/character.glb`),allowed=new Set();
 for(const fix of fixes){const primitive=originalData.g.meshes[fix.mesh].primitives[fix.primitive];for(const property of ['JOINTS_0','WEIGHTS_0']){const a=originalData.g.accessors[primitive.attributes[property]],view=originalData.g.bufferViews[a.bufferView],width={5121:1,5123:2,5125:4,5126:4}[a.componentType],start=(view.byteOffset||0)+(a.byteOffset||0)+fix.vertex*(view.byteStride||width*4);for(let i=0;i<width*4;i++)allowed.add(start+i);}}
 let changedBytes=0;if(originalData.bin.length!==fixedData.bin.length)throw Error('Unexpected geometry buffer resize');for(let i=0;i<originalData.bin.length;i++)if(originalData.bin[i]!==fixedData.bin[i]){changedBytes++;if(!allowed.has(i))throw Error(`Changed unrelated binary byte ${i}`);}
 function vertex(mesh,i){const v=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);return v.applyMatrix4(mesh.matrixWorld);}
 for(const c of pack.animations){sm.stopAllAction();fm.stopAllAction();const sa=sm.clipAction(c).reset().setLoop(T.LoopOnce,1),fa=fm.clipAction(c).reset().setLoop(T.LoopOnce,1);sa.clampWhenFinished=fa.clampWhenFinished=true;sa.play();fa.play();let seam=0,oldSeam=0,edge=0;
  for(let i=0;i<=60;i++){sa.time=fa.time=c.duration*i/60;sm.update(0);fm.update(0);source.scene.updateMatrixWorld(true);fixed.scene.updateMatrixWorld(true);for(const m of [...meshes,...originals])m.skeleton.update();
   for(const fix of fixes){const m=meshes[fix.mesh],old=originals[fix.mesh],idx=m.geometry.index,p=m.geometry.attributes.position;seam=Math.max(seam,vertex(m,fix.vertex).distanceTo(vertex(m,fix.donor_vertex)));oldSeam=Math.max(oldSeam,vertex(old,fix.vertex).distanceTo(vertex(old,fix.donor_vertex)));
    for(let t=0;t<idx.count;t+=3){const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];if(!tri.includes(fix.vertex))continue;for(const n of tri.filter(n=>n!==fix.vertex)){const base=new T.Vector3().fromBufferAttribute(p,n).distanceTo(new T.Vector3().fromBufferAttribute(p,fix.vertex));if(base>1e-8)edge=Math.max(edge,vertex(m,n).distanceTo(vertex(m,fix.vertex))/base);}}
   }
  }
  rows.push({name:c.name,frames:61,original_max_seam_separation_m:oldSeam,fixed_max_seam_separation_m:seam,fixed_max_neighbor_edge_ratio:edge});maxFixedSeam=Math.max(maxFixedSeam,seam);maxOldSeam=Math.max(maxOldSeam,oldSeam);maxEdgeRatio=Math.max(maxEdgeRatio,edge);
 }
 if(neutralInfluences||maxFixedSeam>1e-7||maxEdgeRatio>1.2)throw Error(`Skinning regression ${id}: ${JSON.stringify({neutralInfluences,maxFixedSeam,maxEdgeRatio})}`);
 report[id]={changed_binary_bytes:changedBytes,unrelated_binary_changes:0,clips:rows.length,sampled_frames:rows.length*61,neutral_bone_weighted_vertices:neutralInfluences,weight_repairs:fixes,max_original_seam_separation_m:maxOldSeam,max_fixed_seam_separation_m:maxFixedSeam,max_fixed_neighbor_edge_ratio:maxEdgeRatio,rows};
}
fs.writeFileSync(`${root}/skinning-validation.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,(k,v)=>k==='rows'?undefined:v,2));
