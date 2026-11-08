import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';

export function handLegSource(root) {
 const result=[];
 root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const g=mesh.geometry,skin=g.attributes.skinIndex,weight=g.attributes.skinWeight;
  const lower=[],hands={Left:[],Right:[]},isLower=new Set();
  for(let i=0;i<skin.count;i++) {
   let leg=0,l=0,r=0;
   for(let j=0;j<4;j++) {
    const n=mesh.skeleton.bones[skin.getComponent(i,j)].name,w=weight.getComponent(i,j);
    if(/Hips|UpLeg|Leg|Foot|Toe/.test(n))leg+=w;
    if(/LeftHand/.test(n))l+=w;if(/RightHand/.test(n))r+=w;
   }
   if(leg>.65)isLower.add(i);
   if(l>.35)hands.Left.push(i);if(r>.35)hands.Right.push(i);
  }
  for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));if(ids.every(v=>isLower.has(v)))lower.push(...ids);}
  const handTriangles={Left:[],Right:[]};
  for(const side of ['Left','Right']) {
   const selected=new Set(hands[side]);
   for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));if(ids.every(v=>selected.has(v)))handTriangles[side].push(...ids);}
  }
  if(lower.length||hands.Left.length||hands.Right.length)result.push({mesh,lower,hands,handTriangles});
 });
 return result;
}

export function measureHandLeg(source,stride=8,checkTriangles=false) {
 const positions=[],indices=[];
 const vertex=(mesh,i)=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
 for(const {mesh,lower} of source){const map=new Map();for(const i of lower){if(!map.has(i)){map.set(i,positions.length/3);positions.push(...vertex(mesh,i).toArray());}indices.push(map.get(i));}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 const bvh=new MeshBVH(geometry,{targetLeafSize:8}),tri=new THREE.Triangle(),normal=new THREE.Vector3();
 const result={};
 for(const side of ['Left','Right']) {
  let minimum=Infinity,inside=0,samples=0,deepest=0;
  for(const {mesh,hands} of source)for(let j=0;j<hands[side].length;j+=stride) {
   const point=vertex(mesh,hands[side][j]),hit=bvh.closestPointToPoint(point,{},0,.35);
   if(!hit)continue;
   const index=geometry.index,attribute=geometry.attributes.position;
   tri.setFromAttributeAndIndices(attribute,index.getX(hit.faceIndex*3),index.getX(hit.faceIndex*3+1),index.getX(hit.faceIndex*3+2));tri.getNormal(normal);
   let interior=false;
   if(point.clone().sub(hit.point).dot(normal)<0) {
    // Clothing boundaries and pouches have open edges: an inward nearest-face
    // normal alone is not evidence that a point is inside the leg surface.
    let votes=0;
    for(const direction of [[1,.13,.23],[-.7,.16,.72],[.17,.04,-1]]) {
     const hits=bvh.raycast(new THREE.Ray(point,new THREE.Vector3(...direction).normalize()),THREE.DoubleSide).sort((a,b)=>a.distance-b.distance);
     const unique=hits.filter((h,i)=>i===0||Math.abs(h.distance-hits[i-1].distance)>1e-5);
     if(unique.length%2)votes++;
    }
    interior=votes>=2;
   }
   const signed=interior?-hit.distance:hit.distance;
   minimum=Math.min(minimum,signed);if(signed<-.001)inside++;deepest=Math.min(deepest,signed);samples++;
  }
  result[side]={minimumSignedGapM:minimum,insideSamples:inside,samples,deepestM:deepest};
  if(checkTriangles) {
   const vertices=[],faces=[];
   for(const {mesh,handTriangles} of source){const map=new Map();for(const i of handTriangles[side]){if(!map.has(i)){map.set(i,vertices.length/3);vertices.push(...vertex(mesh,i).toArray());}faces.push(map.get(i));}}
   const handGeometry=new THREE.BufferGeometry();handGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));handGeometry.setIndex(faces);
   const handBVH=new MeshBVH(handGeometry,{targetLeafSize:8});let intersections=0;
   bvh.bvhcast(handBVH,new THREE.Matrix4(),{intersectsTriangles:(a,b)=>{if(a.intersectsTriangle(b))intersections++;return false;}});
   result[side].triangleIntersections=intersections;handGeometry.dispose();
  }
 }
 geometry.dispose();return result;
}
