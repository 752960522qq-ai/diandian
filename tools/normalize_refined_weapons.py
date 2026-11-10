#!/usr/bin/env python3
"""Lossless GLB scene wrapper. Binary, meshes, UVs and materials remain byte-for-byte unchanged."""
import json,struct,hashlib,math,shutil,argparse
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('--inputs',type=Path,required=True);A=P.parse_args();ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/weapons';SOURCE=OUT/'source/refined_v2';SOURCE.mkdir(parents=True,exist_ok=True)
# Source GLTF frame is muzzle -X, up +Y. Points authored from rendered silhouette and geometry.
SPECS={
 'qsz92':('QSZ92G',.190,[.32,.27,-.002],[0,-.022,.066],[-.488,.642,-.005],[.045,.43,-.005],.016),
 'type54':('TT33',.195,[.30,.25,0],[0,-.024,.052],[-.488,.602,0],[.075,.405,0],.014),
 'type64':('TYPE64',.155,[.28,.26,0],[0,-.024,.052],[-.488,.605,0],[-.065,.395,0],.0105),
 'm870':('R870',1.0,[.215,.14,0],[0,-.047,.162],[-.489,.190,0],[.115,.119,0],.025),
}
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[20+n:],b
report={'coordinate_system':{'unit':'metre','up':'+Y','forward':'-Z','right':'+X'},'weapons':{}}
for key,(prefix,length,grip,target,muzzle,trigger,radius) in SPECS.items():
 src=next(A.inputs.glob(prefix+'_*.glb'));j,tail,b=read(src);shutil.copyfile(src,SOURCE/src.name)
 # Full hierarchy bounds computed without relying on accessor min/max, including node translations.
 import numpy as np
 blob=tail[8:];pts=[]
 def visit(i,parent):
  n=j['nodes'][i];mat=np.eye(4)
  if 'matrix'in n:mat=np.array(n['matrix']).reshape(4,4).T
  else:
   if 'rotation'in n:
    x,y,z,w=n['rotation'];mat[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
   mat[:3,:3]=mat[:3,:3]@np.diag(n.get('scale',[1,1,1]));mat[:3,3]=n.get('translation',[0,0,0])
  mat=parent@mat
  if 'mesh'in n:
   for prim in j['meshes'][n['mesh']]['primitives']:
    acc=j['accessors'][prim['attributes']['POSITION']];view=j['bufferViews'][acc['bufferView']];arr=np.ndarray((acc['count'],3),dtype='<f4',buffer=blob,offset=view.get('byteOffset',0)+acc.get('byteOffset',0),strides=(view.get('byteStride',12),4));pts.extend((np.c_[arr,np.ones(len(arr))]@mat.T)[:,:3])
  for c in n.get('children',[]):visit(c,mat)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i,np.eye(4))
 pts=np.array(pts);lo=pts.min(0);hi=pts.max(0);scale=length/(hi[0]-lo[0]);rotation=np.array([[0,0,-1],[0,1,0],[1,0,0]]);translation=np.array(target)-scale*rotation@grip
 def point(p):return [round(float(x),8) for x in (scale*rotation@p+translation)]
 roots=j['scenes'][j.get('scene',0)]['nodes'];root=len(j['nodes']);j['nodes'].append({'name':key+'_GameNormalized','children':roots,'rotation':[0,-math.sqrt(.5),0,math.sqrt(.5)],'scale':[scale]*3,'translation':translation.tolist()});j['scenes'][j.get('scene',0)]['nodes']=[root]
 animations=[a.get('name') for a in j.pop('animations',[])];j.setdefault('asset',{}).setdefault('extras',{})['normalization']='Preserved BIN and original mesh/material/UV. Inspection animation excluded from gameplay.'
 payload=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();payload+=b' '*((-len(payload))%4);data=struct.pack('<III',0x46546c67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4e4f534a)+payload+tail;(OUT/(key+'.glb')).write_bytes(data)
 gp=point(grip);tr=point(trigger);tr[0]=.009 if key!='type64' else .007
 entry={'display_name':{'qsz92':'QSZ92G','type54':'54 式（TT33 源）','type64':'64 式','m870':'M870'}[key],'type':'shotgun' if key=='m870' else 'pistol','path':f'res://assets/weapons/{key}.glb','right_grip':gp,'right_palm_surface':[gp[0]+radius,gp[1],gp[2]],'trigger':tr,'muzzle':point(muzzle),'barrel_forward':[0,0,-1],'right_palm_normal':[1,0,0],'right_grip_axis':[0,.95358,-.30114],'left_palm_normal':[-1,0,0],'left_grip':[gp[0]-.038,gp[1]-.01,gp[2]-.008],'left_support_kind':'Support strong hand outside grip; not slide contact.','length_m':length,'source':{'file':src.name,'sha256':hashlib.sha256(b).hexdigest(),'inspection_animations_preserved_in_source':animations},'normalization':{'source_to_game':'game = scale * [-source.z, source.y, source.x] + translation','scale':scale,'translation':translation.tolist(),'source_bounds':[lo.tolist(),hi.tolist()]},'game_dimensions_m':(np.array([hi[2]-lo[2],hi[1]-lo[1],hi[0]-lo[0]])*scale).tolist(),'anchor_method':'Authored from actual source geometry and rendered side view. Grip center is internal, palm contact separate. Not a mechanical reconstruction.','binary_payload_unchanged':read(OUT/(key+'.glb'))[1]==tail,'game_sha256':hashlib.sha256(data).hexdigest()}
 if key=='m870':
  entry.update(left_grip=point([-.17,.120,0]),butt_contact=point([.486,.08,0]),right_grip_axis=[0,.35,-.93675],left_palm_normal=[0,-1,0],left_support_kind='4.4 source mm below measured wooden Pump_shell_visual underside at rest; follows pump stroke.',pump_node_names=['Pump_visual'],pump_node='Pump_visual',pump_axis_local=[1,0,0],pump_axis_game=[0,0,1],pump_travel_m=.075,pump_travel_local_units=.075/scale,pump_sync='Pump_visual.position.x = rest.x + travel_m / normalization.scale. left_grip.z = rest.z + travel_m. Never move Static_visual. No autoplay animation.')
 entry['source']['author'],entry['source']['url'] = {'qsz92':('8sianDude','https://sketchfab.com/3d-models/norinco-qsz-92g-9mm-handgun-9552035434514828b7f57b6738f5fb7a'),'type54':('White-Horse','https://sketchfab.com/3d-models/tt33-tokarev-pistol-e96197a0a9ed46b6aa74757b6ff4c2da'),'type64':('Martini-SF','https://sketchfab.com/3d-models/type-64-compact-pistol-a72b19bcbe2948b18e854818603f6765'),'m870':('tris.blend','https://sketchfab.com/3d-models/remington-870-pbrgr-26e37df4c38c4e8a9da8adeb4b66bff6')}[key]
 entry['source']['license']='CC-BY-NC-4.0' if key=='type64' else 'CC-BY-4.0';entry['source']['restriction']='TYPE64 commercial use requires separate permission; attribution required for all assets. Licenses are inherited from provided source metadata, not independently relicensed.'
 report['weapons'][key]=entry
(OUT/'refined_v2_attachment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
