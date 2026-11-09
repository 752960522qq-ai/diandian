import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';
export function gunGeometry(gun){
 const xyz=[];gun.updateMatrixWorld(true);const inv=gun.matrixWorld.clone().invert();
 gun.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,ix=g.index,m=inv.clone().multiply(o.matrixWorld);for(let i=0;i<(ix?.count||p.count);i++){const a=new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(m);xyz.push(a.x,a.y,a.z);}});
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 const bvh=new MeshBVH(geometry,{maxLeafSize:12});return {geometry,bvh};
}
export function nearest(g,p){const out={};g.bvh.closestPointToPoint(p,out);const a=g.geometry.attributes.position,ix=g.geometry.index,i=out.faceIndex*3;const t=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,ix?ix.getX(i+j):i+j)));const normal=t.getNormal(new T.Vector3());return {...out,signed:p.clone().sub(out.point).dot(normal)<0?-out.distance:out.distance,normal};}
export function handVertices(root){const out=[];root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const a=mesh.geometry.attributes;for(let i=0;i<a.position.count;i++){const w={};for(let j=0;j<4;j++){const name=mesh.skeleton.bones[a.skinIndex.getComponent(i,j)].name,weight=a.skinWeight.getComponent(i,j);const match=name.match(/(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)?/);if(match)w[match[1]+':'+(match[2]||'Palm')]=(w[match[1]+':'+(match[2]||'Palm')]||0)+weight;}const sorted=Object.entries(w).sort((a,b)=>b[1]-a[1]);if(!sorted.length||sorted[0][1]<.35)continue;const [side,digit]=sorted[0][0].split(':');out.push({mesh,i,side,digit,weight:sorted[0][1]});}});return out;}
export function vertexGun(v,gun){return v.mesh.getVertexPosition(v.i,new T.Vector3()).applyMatrix4(v.mesh.matrixWorld).applyMatrix4(gun.matrixWorld.clone().invert());}
