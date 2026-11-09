/** Lossless-buffer neck proportion edit. Original uploaded character is immutable.
 * Run before build_linxu_browser_character.py; curated animation packs stay unchanged.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
const source='assets/characters/linxu_motion/character.glb', output='assets/characters/linxu_motion_v3/character.glb';
const {g,bin:originalBin}=decode(source),bin=Buffer.from(originalBin),model=await read(source);
model.scene.updateMatrixWorld(true);
const bones={};model.scene.traverse(o=>{if(o.isBone)bones[o.userData.name||o.name]=o;});
const head=bones['mixamorig:Head'],neck=bones['mixamorig:Neck'];
const oldHead=head.getWorldPosition(new T.Vector3()),oldNeck=neck.getWorldPosition(new T.Vector3());
const ratio=.82,delta=oldHead.clone().sub(oldNeck).multiplyScalar(ratio-1);
const descendants=new Set();head.traverse(o=>{if(o.isBone)descendants.add(o.userData.name||o.name);});
const hi=g.nodes.findIndex(n=>n.name==='mixamorig:Head');
g.nodes[hi].translation=g.nodes[hi].translation.map(v=>v*ratio);
function accessor(i){const a=g.accessors[i],v=g.bufferViews[a.bufferView];return {a,offset:(v.byteOffset||0)+(a.byteOffset||0),stride:v.byteStride||({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type])*({5126:4,5123:2,5125:4,5121:1}[a.componentType])};}
function get(i,j,n){const{offset,stride}=accessor(i);return Array.from({length:n},(_,k)=>bin.readFloatLE(offset+j*stride+k*4));}
function put(i,j,values){const{offset,stride}=accessor(i);values.forEach((v,k)=>bin.writeFloatLE(v,offset+j*stride+k*4));}
// A C1 neck-only warp leaves the face/hair rigid and everything below the neck fixed.
// The full face primitive begins at y=.875; no head scale or facial-bone change.
const bottom=.835,top=.875,meshReport=[];
for(const mesh of g.meshes)for(const p of mesh.primitives){const ai=p.attributes.POSITION,ni=p.attributes.NORMAL,a=g.accessors[ai];let changed=0,rigid=0;let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.count;i++){const v=new T.Vector3(...get(ai,i,3)),t=T.MathUtils.clamp((v.y-bottom)/(top-bottom),0,1),f=t*t*(3-2*t),df=t>0&&t<1?6*t*(1-t)/(top-bottom):0;
if(f){v.addScaledVector(delta,f);put(ai,i,v.toArray());changed++;if(t===1)rigid++;if(df&&ni!==undefined){const normal=new T.Vector3(...get(ni,i,3));normal.y-=df*delta.dot(normal)/(1+df*delta.y);normal.normalize();put(ni,i,normal.toArray());}}
v.toArray().forEach((x,k)=>{min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);});}a.min=min;a.max=max;meshReport.push({mesh:mesh.name,position_accessor:ai,vertices:a.count,changed,rigid});}
for(const s of g.skins){for(let j=0;j<s.joints.length;j++)if(descendants.has(g.nodes[s.joints[j]].name)){const m=new T.Matrix4().fromArray(get(s.inverseBindMatrices,j,16));m.multiply(new T.Matrix4().makeTranslation(-delta.x,-delta.y,-delta.z));put(s.inverseBindMatrices,j,m.elements);}}
const box=new T.Box3().setFromObject(model.scene),center=box.getCenter(new T.Vector3());
g.asset.extras={...g.asset.extras,preview_normalization:{scale:1.75/(box.max.y-box.min.y),center:center.toArray(),floor:box.min.y},linxu_neck_v4:{source,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),neck_head_length_ratio:ratio,head_rigid_translation_m:delta.toArray(),neck_warp_y_m:[bottom,top],face_scale_unchanged:true,curated_animation_pack:'motions.glb',shoulder_channels_unchanged:true}};
// Do not expose embedded source actions which can contain absolute translation keys.
delete g.animations;
fs.writeFileSync(output,encode(g,bin));
const report={...g.asset.extras.linxu_neck_v4,old_neck_head_m:oldHead.distanceTo(oldNeck),new_neck_head_m:oldHead.distanceTo(oldNeck)*ratio,preview_reduction_mm:delta.length()*g.asset.extras.preview_normalization.scale*1000,normalization:g.asset.extras.preview_normalization,meshes:meshReport};
fs.writeFileSync('assets/characters/linxu_motion_v3/neck_proportion_report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
