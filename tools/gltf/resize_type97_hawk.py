"""Resize the normalized Type97 GLB: total length 0.8m, width 90% after uniform resize.
Usage: python tools/gltf/resize_type97_hawk.py NORMALIZED.glb OUTPUT.glb REPORT.json
Preserves all geometry/image BIN bytes; applies a weapon-space parent transform.
"""
from pathlib import Path
import sys,struct,json,math,hashlib
import numpy as np
src,dst,rep=map(Path,sys.argv[1:4]);raw=src.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);off=20+n;blen,btype=struct.unpack_from('<II',raw,off);binary=raw[off+8:off+8+blen]
ctype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
def positions(index):
 a=d['accessors'][index];b=d['bufferViews'][a['bufferView']];dt=np.dtype(ctype[a['componentType']]);return np.ndarray((a['count'],3),dtype=dt,buffer=binary,offset=b.get('byteOffset',0)+a.get('byteOffset',0),strides=(b.get('byteStride',dt.itemsize*3),dt.itemsize))
def mat(node):
 if 'matrix' in node:return np.array(node['matrix']).reshape(4,4).T
 x,y,z,w=node.get('rotation',[0,0,0,1]);q=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]);m=np.eye(4);m[:3,:3]=q@np.diag(node.get('scale',[1,1,1]));m[:3,3]=node.get('translation',[0,0,0]);return m
parents={c:i for i,n in enumerate(d['nodes']) for c in n.get('children',[])}
def world(i):return (world(parents[i]) if i in parents else np.eye(4))@mat(d['nodes'][i])
points=[]
for i,node in enumerate(d['nodes']):
 if 'mesh' not in node:continue
 for p in d['meshes'][node['mesh']]['primitives']:
  vs=positions(p['attributes']['POSITION']);points.append((world(i)@np.column_stack((vs,np.ones(len(vs)))).T).T[:,:3])
v=np.concatenate(points);lo=v.min(0);hi=v.max(0);dims=hi-lo;s=.8/dims[2];scale=[s*.9,s,s]
roots=d['scenes'][d.get('scene',0)]['nodes'];i=len(d['nodes']);d['nodes'].append({'name':'Type97_800mm_Width90','scale':scale,'children':roots,'extras':{'length_m':.8,'width_multiplier_after_uniform_resize':.9,'source_sha256':hashlib.sha256(raw).hexdigest()}});d['scenes'][d.get('scene',0)]['nodes']=[i]
j=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);out=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),btype)+binary;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out)
result={'source':str(src),'output':str(dst),'source_sha256':hashlib.sha256(raw).hexdigest(),'output_sha256':hashlib.sha256(out).hexdigest(),'before_dimensions_m':dims.tolist(),'scale_xyz':scale,'uniform_scale':s,'after_dimensions_m':(dims*np.array(scale)).tolist(),'length_m':.8,'width_multiplier_after_uniform_resize':.9,'binary_bytes_preserved':True}
rep.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
