import fs from 'node:fs';import * as T from 'three';import{setupLinxu}from '../qa/validate_linxu_motion.mjs';import{gunGeometry,handVertices,vertexGun}from '../qa/linxu_surface_geometry_v4.mjs';
const file='web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json',cfg=JSON.parse(fs.readFileSync(file)),rt=await setupLinxu('linxu'),verts=handVertices(rt.root).filter(v=>v.side==='Left'),rows=[];
// The released hand must clear with its forearm, not only its fingertips.
const seen = new Set(verts.map(v=>v.mesh.uuid+':'+v.i));
rt.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const a=mesh.geometry.attributes;for(let i=0;i<a.position.count;i++){if(seen.has(mesh.uuid+':'+i))continue;let weight=0;for(let j=0;j<4;j++)if(/Left(ForeArm|Arm)$/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i,j)].name))weight+=a.skinWeight.getComponent(i,j);if(weight>.35)verts.push({mesh,i,side:'Left',digit:'Arm'});}});
for(const w of ['qbz95','type56_1','qbu85','type97hawk','qcq171']){
 const mount=rt.attachment.character.mounts[w].motions.Reloading;delete mount.reload_support_shift_weapon_m;delete mount.reload_clearance_track;
 rt.pose('Reloading',0,w);const gun=rt.attachment.weapons.get(w),g=gunGeometry(gun);g.geometry.computeBoundingBox();const bb=g.geometry.boundingBox,frames=Math.ceil(rt.duration('Reloading',w)*30),times=[],delta=[];
 for(let i=0;i<=frames;i++){const t=rt.duration('Reloading',w)*i/frames;times.push(t);let shift=0;for(let pass=0;pass<5;pass++){mount.reload_support_shift_weapon_m=[-shift,0,0];rt.pose('Reloading',t,w);let needed=0;
  for(const v of verts){const p=vertexGun(v,gun);if(p.y<bb.min.y||p.y>bb.max.y||p.z<bb.min.z||p.z>bb.max.z||p.x<bb.min.x-.002)continue;
   const origin=p.clone();origin.x=bb.min.x-.02;const hit=g.bvh.raycastFirst(new T.Ray(origin,new T.Vector3(1,0,0)),T.DoubleSide);if(hit&&p.x>=hit.point.x-.0015&&p.x<bb.max.x+.035)needed=Math.max(needed,p.x-hit.point.x+.002);
  }
  if(needed<.0002)break;shift=Math.min(.24,shift+needed);}
  delta.push(shift);
 }
 // Symmetric max-envelope gives clearance between sampled source keys. It
 // starts moving aside before contact and keeps the hand released throughout.
 const smooth=delta.map((d,i)=>Math.max(...delta.slice(Math.max(0,i-2),Math.min(delta.length,i+3))));
 const target=cfg.characters.linxu.mounts[w].motions.Reloading;delete target.reload_support_shift_weapon_m;target.reload_clearance_track={times,values:smooth.flatMap(x=>[-x,0,0]),rate:30};
 rows.push({weapon:w,samples:times.length,maxSideShiftM:Math.max(...smooth)});console.log(rows.at(-1));
}
fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');fs.writeFileSync('work/linxu-motion-v4/reload-clearance-report.json',JSON.stringify(rows,null,2)+'\n');
