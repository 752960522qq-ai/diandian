"""Append a skinned lower-torso bridge to the original open waist boundary.
Original GLB node/skin/animation and all old BIN bytes remain unchanged.
Usage: python fix_waist.py <character.glb> <boundary.json> <report.json>
Boundary json is a measured closed physical edge ring exported by Blender,
with Blender world coordinates and original skin weights (see waist_topology2.py).
"""
import json,struct,sys,shutil,hashlib,io
from PIL import Image
from pathlib import Path
import numpy as np
TYPES={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};COMPS={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def main(p,boundary,report):
 p=Path(p);Path(report).parent.mkdir(parents=True,exist_ok=True);backup=Path(report).parent/(p.stem+'.pre_fix18.glb')
 if not backup.exists():
  current=p.read_bytes();current_jl=struct.unpack_from('<I',current,12)[0];current_doc=json.loads(current[20:20+current_jl])
  if any(m.get('name')=='Anatomical_Waist_Continuous_Surface' for m in current_doc.get('materials',[])):
   result={'file':str(p),'status':'already_fixed','sha256':hashlib.sha256(current).hexdigest()};Path(report).write_text(json.dumps(result,indent=2));print(json.dumps(result));return
  shutil.copy2(p,backup)
 raw=backup.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);original_doc=json.loads(raw[20:20+jl]);bl=struct.unpack_from('<I',raw,20+jl)[0];original=raw[28+jl:28+jl+bl];blob=bytearray(original)
 def acc(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dt=np.dtype(TYPES[a['componentType']]);n=COMPS[a['type']];return np.ndarray((a['count'],n),dtype=dt,buffer=original,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
 def append(a,typ,ctype=5126,target=34962):
  nonlocal blob
  a=np.array(a,dtype=TYPES[ctype]);blob.extend(b'\0'*(-len(blob)%4));off=len(blob);blob.extend(a.tobytes());vi=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':a.nbytes,'target':target});out={'bufferView':vi,'componentType':ctype,'count':len(a),'type':typ}
  if typ=='VEC3':out.update(min=a.min(0).tolist(),max=a.max(0).tolist())
  ai=len(d['accessors']);d['accessors'].append(out);return ai
 rings=json.load(open(boundary));ring=next(r for r in rings if r['count']>=19 and r['lo'][0]<-.05 and r['hi'][0]>.05 and .60<r['mean'][2]<.69)
 b=np.array([v['pos'] for v in ring['vertices']]);target=b[:,[0,2,1]]*np.array([1,1,-1])
 # Main body node is untransformed and exported positions are glTF Y up.
 node=next(n for n in d['nodes'] if 'mesh'in n and 'Body'in n.get('name',''));mesh=d['meshes'][node['mesh']];best=None
 for prim in mesh['primitives']:
  pos=acc(prim['attributes']['POSITION']);ids=np.array([np.argmin(np.einsum('ij,ij->i',pos-t,pos-t))for t in target]);dist=np.linalg.norm(pos[ids]-target,axis=1)
  if best is None or max(dist)<best[0]:best=(max(dist),prim,pos,ids)
 error,pr,pos,ids=best
 if error>2e-5:raise ValueError(f'Boundary coordinate mismatch {error}')
 # Sort the convex physical ring around its center and retain edge orientation.
 center=target.mean(0);order=np.argsort(np.arctan2(target[:,2]-center[2],target[:,0]-center[0]));ids=ids[order];base=pos[ids].copy();n=len(ids)
 joints=acc(pr['attributes']['JOINTS_0'])[ids];weights=acc(pr['attributes']['WEIGHTS_0'])[ids];uv=acc(pr['attributes']['TEXCOORD_0'])[ids]
 skin=d['skins'][node['skin']];jn=[d['nodes'][i]['name']for i in skin['joints']];spine=next(i for i,n in enumerate(jn)if n.replace(':','')=='mixamorigSpine');spine1=next(i for i,n in enumerate(jn)if n.replace(':','')=='mixamorigSpine1');hips=next(i for i,n in enumerate(jn)if n.replace(':','')=='mixamorigHips')
 # Sample the existing waist edge atlas rather than stretching its fragmented
 # UV islands vertically. Smooth neighboring samples for continuous skin tone.
 mat=d['materials'][pr['material']];tex=mat['pbrMetallicRoughness']['baseColorTexture']['index'];image=d['images'][d['textures'][tex]['source']];bv=d['bufferViews'][image['bufferView']];im=np.asarray(Image.open(io.BytesIO(original[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB'))/255
 edge_colors=np.array([im[min(int(t[1]*im.shape[0]),im.shape[0]-1),min(int(t[0]*im.shape[1]),im.shape[1]-1)] for t in uv]);smooth=sum(np.roll(edge_colors,k,axis=0)for k in [-2,-1,0,1,2])/5
 colors=[];positions=[];normal=[];uvs=[];js=[];ws=[];indices=[]
 # The middle ring duplicates the original open body contour and weights.
 # Extend 6.5cm into the shirt and 6.5cm into the trousers, tapering 10%.
 for layer in range(9):
  signed=(layer-4)/4;t=abs(signed)
  for k,p0 in enumerate(base):
   p1=p0.copy();p1[0]=center[0]+(p0[0]-center[0])*(1-.10*t);p1[2]=center[2]+(p0[2]-center[2])*(1-.10*t);p1[1]+=.065*signed
   col=smooth[k]*(1-.5*t)+np.median(edge_colors,axis=0)*(.5*t)
   colors.append(np.where(col<=.04045,col/12.92,((col+.055)/1.055)**2.4))
   positions.append(p1);r=p0-center;r[1]=0;r/=np.linalg.norm(r);normal.append(r);uvs.append(uv[k])
   if layer==4:js.append(joints[k]);ws.append(weights[k]);continue
   mapped={int(j):float(w)*(1-t)for j,w in zip(joints[k],weights[k])if w>0}
   if signed>0:mapped[spine]=mapped.get(spine,0)+t*(1-.35*t);mapped[spine1]=mapped.get(spine1,0)+t*.35*t
   else:mapped[hips]=mapped.get(hips,0)+t
   pairs=sorted(mapped.items(),key=lambda p:p[1],reverse=True)[:4];total=sum(w for j,w in pairs);js.append([j for j,w in pairs]+[0]*(4-len(pairs)));ws.append([w/total for j,w in pairs]+[0]*(4-len(pairs)))
  if layer:
   for k in range(n):
    j=(k+1)%n;a=(layer-1)*n+k;b=(layer-1)*n+j;c=layer*n+k;e=layer*n+j
    # Ordered ring is clockwise when viewed from +Y; outward winding.
    indices.extend([a,c,b,b,c,e])
 # Close the upper surface within the jacket; this is part of the body,
 # rather than an open decorative sleeve.
 center_id=len(positions);positions.append(np.mean(positions[-n:],axis=0));normal.append([0,1,0]);uvs.append(uv.mean(0));colors.append(np.mean(colors[-n:],axis=0));js.append([spine,spine1,0,0]);ws.append([.65,.35,0,0])
 for k in range(n):indices.extend([center_id,8*n+(k+1)%n,8*n+k])
 bottom_id=len(positions);positions.append(np.mean(positions[:n],axis=0));normal.append([0,-1,0]);uvs.append(uv.mean(0));colors.append(np.mean(colors[:n],axis=0));js.append([hips,0,0,0]);ws.append([1,0,0,0])
 for k in range(n):indices.extend([bottom_id,k,(k+1)%n])
 # The new material samples and smoothly blends the original waist texels.
 bridge_material=len(d['materials']);d['materials'].append({'name':'Anatomical_Waist_Continuous_Surface','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.85},'doubleSided':False})
 new={'attributes':{'COLOR_0':append(colors,'VEC3'),'POSITION' :append(positions,'VEC3'),'NORMAL':append(normal,'VEC3'),'TEXCOORD_0':append(uvs,'VEC2'),'JOINTS_0':append(js,'VEC4',5123),'WEIGHTS_0':append(ws,'VEC4')},'indices':append(np.array(indices).reshape(-1,1),'SCALAR',5123,34963),'material':bridge_material,'mode':4,'extras':{'purpose':'Anatomical waist bridge closing original open lower-torso edge; Fix18'}}
 mesh['primitives'].append(new);d['buffers'][0]['byteLength']=len(blob);blob.extend(b'\0'*(-len(blob)%4));j=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*(-len(j)%4);out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob;p.write_bytes(out)
 r={'file':str(p),'original_sha256':hashlib.sha256(raw).hexdigest(),'fixed_sha256':hashlib.sha256(out).hexdigest(),'original_bin_prefix_preserved':bytes(blob[:len(original)])==original,'existing_nodes_preserved':True,'existing_animations_preserved':True,'waist_boundary_vertices':n,'boundary_match_error_m':float(error),'new_vertices':len(positions),'new_triangles':len(indices)//3,'seam_max_position_error_m':float(np.max(np.abs(np.array(positions[4*n:5*n])-base))),'seam_weights_copied':True,'repair_strategy':'Original open waist boundary is the middle ring of a closed anatomical abdomen, extending into both jacket and trousers','original_json_arrays_preserved':{k:d[k][:len(original_doc[k])]==original_doc[k] for k in ['nodes','skins','animations','accessors','bufferViews','materials','images','textures','samplers'] if k in original_doc},'new_upper_overlap_native_m':.065,'new_lower_overlap_native_m':.065};json.dump(r,open(report,'w'),indent=2);print(json.dumps(r))
if __name__=='__main__':main(*sys.argv[1:])
