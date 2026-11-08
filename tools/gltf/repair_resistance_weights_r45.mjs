// Repair an unbound seam vertex by restoring skin weights from its coincident
// bound twin. Geometry, UVs and all valid influences remain byte-identical.
import fs from 'node:fs';
import {decode,encode} from '../qa/validate_pf89.mjs';
export function prepareResistanceCharacter(source,destination){
 const {g,bin:sourceBin}=decode(source),bin=Buffer.from(sourceBin),repairs=[];
 const bytes={5121:1,5123:2,5125:4,5126:4};
 const get=(index,vertex,component)=>{const a=g.accessors[index],v=g.bufferViews[a.bufferView],size=bytes[a.componentType],width={VEC3:3,VEC4:4}[a.type],offset=(v.byteOffset||0)+(a.byteOffset||0)+vertex*(v.byteStride||size*width)+component*size;return {offset,size,value:a.componentType===5126?bin.readFloatLE(offset):a.componentType===5121?bin.readUInt8(offset):a.componentType===5123?bin.readUInt16LE(offset):bin.readUInt32LE(offset)};};
 for(const node of g.nodes){if(node.mesh===undefined||node.skin===undefined)continue;const skin=g.skins[node.skin],neutral=skin.joints.findIndex(i=>g.nodes[i].name==='neutral_bone');if(neutral<0)continue;
  for(const [primitiveIndex,p]of g.meshes[node.mesh].primitives.entries()){
   const {POSITION:pos,JOINTS_0:joint,WEIGHTS_0:weight}=p.attributes,count=g.accessors[pos].count;
   const bound=i=>[0,1,2,3].every(k=>get(joint,i,k).value!==neutral||get(weight,i,k).value===0);
   for(let i=0;i<count;i++){if(bound(i))continue;let donor=-1;
    for(let j=0;j<count;j++){if(j===i||!bound(j))continue;if([0,1,2].every(k=>Math.abs(get(pos,i,k).value-get(pos,j,k).value)<1e-7)){donor=j;break;}}
    if(donor<0)throw Error(`Unbound vertex ${i} has no coincident bound twin; manual review required`);
    for(const accessor of [joint,weight])for(let k=0;k<4;k++){const src=get(accessor,donor,k),dst=get(accessor,i,k);bin.copy(bin,dst.offset,src.offset,src.offset+src.size);}
    repairs.push({mesh:node.mesh,primitive:primitiveIndex,vertex:i,donor_vertex:donor,method:'copy skin joints/weights from coincident bound seam twin',position_native:[0,1,2].map(k=>get(pos,i,k).value)});
   }
  }
 }
 g.asset.extras={...g.asset.extras,resistance_weight_repairs:repairs};fs.writeFileSync(destination,encode(g,bin));return repairs;
}
