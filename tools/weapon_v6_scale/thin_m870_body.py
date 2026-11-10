#!/usr/bin/env python3
"""Final user-requested game M870: 1 m long, 12% thinner cosmetic body, circular tubes preserved.
The supplied refined source is never modified. GLB binary payload is never modified.
"""
import argparse,copy,hashlib,json,math,struct
from pathlib import Path
import numpy as np
P=argparse.ArgumentParser(description=__doc__)
P.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2],help='Repository/package root with assets and four website folders')
P.add_argument('--source',type=Path,help='Optional exact refined R870 GLB; SHA must match metadata')
P.add_argument('--metadata',type=Path,help='Optional common refined_v2_attachment.json')
P.add_argument('--out',type=Path,help='Optional QA output directory')
A=P.parse_args();ROOT=A.root.resolve();OUT=A.out.resolve() if A.out else ROOT/'web/motion-labs/verification_weapon_v6_scale'
WIDTH=.88;LENGTH=1.0
SCALED=('Pump_visual','Buttpad_visual','Receiver_visual','Stock_visual','Trigger_guard_visual','Underside_detail_visual','Upper_rail_visual')
PRESERVED=('Barrel_visual','Exposed_tube_visual','Front_cap_visual','Under_pump_tube_visual')
SITES=('diandian-classic','zhigeng','linxu','resistance')
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0]
 return json.loads(b[20:20+n]),b[20+n:]
def encode(j,tail):
 q=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();q+=b' '*((-len(q))%4)
 return struct.pack('<III',0x46546c67,2,20+len(q)+len(tail))+struct.pack('<II',len(q),0x4e4f534a)+q+tail
def sha(b):return hashlib.sha256(b).hexdigest()
def bounds(j,tail):
 blob=tail[8:];points=[];parts={}
 def visit(i,parent):
  n=j['nodes'][i];m=np.eye(4)
  if 'matrix'in n:m=np.array(n['matrix']).reshape(4,4).T
  else:
   if 'rotation'in n:
    x,y,z,w=n['rotation'];m[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
   m[:3,:3]=m[:3,:3]@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0])
  m=parent@m
  if 'mesh'in n:
   p=[]
   for prim in j['meshes'][n['mesh']]['primitives']:
    a=j['accessors'][prim['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']];arr=np.ndarray((a['count'],3),dtype='<f4',buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4));p.extend((np.c_[arr,np.ones(len(arr))]@m.T)[:,:3])
   p=np.array(p);points.extend(p);parts[n['name']]={'bounds':[p.min(0).tolist(),p.max(0).tolist()],'dimensions':(p.max(0)-p.min(0)).tolist()}
  for c in n.get('children',[]):visit(c,m)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i,np.eye(4))
 p=np.array(points);return p.min(0),p.max(0),parts
cfgpath=A.metadata.resolve() if A.metadata else ROOT/'assets/weapons/refined_v2_attachment.json';cfg=json.loads(cfgpath.read_text());before=copy.deepcopy(cfg);entry=cfg['weapons']['m870']
src=A.source.resolve() if A.source else ROOT/'assets/weapons/source/refined_v2'/entry['source']['file'];source_bytes=src.read_bytes();assert sha(source_bytes)==entry['source']['sha256']
sj,tail=read(src);lo,hi,_=bounds(sj,tail);scale=LENGTH/(hi[0]-lo[0]);rot=np.array([[0,0,-1],[0,1,0],[1,0,0]]);pivot=np.array([0,-.047,.162]);translation=pivot-scale*rot@np.array([.215,.14,0])
def point(p):return (scale*rot@np.array(p)+translation).tolist()
j=copy.deepcopy(sj);roots=j['scenes'][j.get('scene',0)]['nodes'];nroot=len(j['nodes']);j['nodes'].append({'name':'m870_GameNormalized','children':roots,'rotation':[0,-math.sqrt(.5),0,math.sqrt(.5)],'scale':[scale]*3,'translation':translation.tolist()});j['scenes'][j.get('scene',0)]['nodes']=[nroot]
j.pop('animations',None);j.setdefault('asset',{}).setdefault('extras',{})['normalization']='Original BIN, mesh definitions, UVs and materials preserved. Game-only body nodes use source Z width scale 0.88; barrel and round tubes/caps unchanged. Inspection animation excluded from gameplay.'
OUT.mkdir(parents=True,exist_ok=True)
# An unthinned, normalized 1 m comparison is QA evidence, not a shipping asset.
(OUT/'M870_before_thinning.glb').write_bytes(encode(j,tail))
for n in j['nodes']:
 if n.get('name')in SCALED:
  s=n.get('scale',[1,1,1]);n['scale']=[s[0],s[1],s[2]*WIDTH]
final_lo,final_hi,parts=bounds(j,tail);data=encode(j,tail)
(ROOT/'assets/weapons/m870.glb').write_bytes(data)
for site in SITES:(ROOT/f'web/motion-labs/{site}-motion-lab/assets/weapons/m870.glb').write_bytes(data)
entry.update(right_grip=pivot.tolist(),right_palm_surface=[.025*WIDTH,-.047,.162],trigger=point([.115,.119,0]),muzzle=point([-.489,.190,0]),left_grip=point([-.17,.120,0]),butt_contact=point([.486,.08,0]),length_m=LENGTH,game_dimensions_m=(final_hi-final_lo).tolist(),normalization={'source_to_game':'game = scale * [-source.z, source.y, source.x] + translation; source nodes listed in width_adjustment first scale local Z only','scale':scale,'translation':translation.tolist(),'source_bounds':[lo.tolist(),hi.tolist()]},pump_travel_m=.075,pump_travel_local_units=.075/scale,game_sha256=sha(data))
entry['trigger'][0]=.009*WIDTH
entry.pop('length_match',None)
entry['width_adjustment']={'revision':'v6_user_requested_1m_thinner_body','final_axial_length_m':LENGTH,'game_axis':'X','source_node_local_axis':'Z','body_width_scale':WIDTH,'scaled_nodes':list(SCALED),'pump_child_nodes_follow_parent':['Pump_detail_A_visual','Pump_detail_B_visual','Pump_shell_visual'],'circular_parts_preserved':list(PRESERVED),'source_file_unchanged':True,'binary_payload_unchanged':True,'source_mesh_definitions_unchanged':True,'original_M97_axial_length_m_for_reference_only':.9992400407791138,'policy':'Latest user request sets total length to 1 m and authorizes modest body-width compression. Do not use the earlier exact M97 match as the final target.'}
assert all(cfg['weapons'][k]==before['weapons'][k] for k in cfg['weapons'] if k!='m870')
cfgpath.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n')
assert src.read_bytes()==source_bytes
report={'length_target_m':LENGTH,'body_width_scale':WIDTH,'bounds': [final_lo.tolist(),final_hi.tolist()],'dimensions':(final_hi-final_lo).tolist(),'game_sha256':sha(data),'source_sha256':sha(source_bytes),'changed_source_nodes':list(SCALED),'preserved_round_nodes':list(PRESERVED),'parts':parts,'final_m870_metadata':entry}
(OUT/'final_thinning_application.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'dimensions':report['dimensions'],'scaled_nodes':SCALED,'source_preserved':True,'pump_travel_m':.075,'pump_travel_local_units':.075/scale,'sha256':sha(data)},ensure_ascii=False,indent=2))
