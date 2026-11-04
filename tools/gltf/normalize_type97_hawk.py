"""Normalize supplied Hawk model axes without resizing or re-encoding meshes/textures.

Usage: python normalize_type97.py SOURCE.glb OUTPUT.glb [REPORT.json]
Weapon axes are +X right, +Y up, -Z muzzle. Pump moves along weapon +Z.
"""
import sys,json,struct,math,hashlib
from pathlib import Path
src=Path(sys.argv[1]);dst=Path(sys.argv[2]);raw=src.read_bytes();assert raw[:4]==b'glTF'
jlen,jtyp=struct.unpack_from('<II',raw,12);doc=json.loads(raw[20:20+jlen]);boff=20+jlen;blen,btyp=struct.unpack_from('<II',raw,boff);binary=raw[boff+8:boff+8+blen]
root=doc['scenes'][doc.get('scene',0)]['nodes'][0];node=doc['nodes'][root];assert node['name']=='ParentNode'
pump=next(i for i,n in enumerate(doc['nodes']) if n.get('name')=='tripo_part_0')
node['children'].remove(pump);group=len(doc['nodes']);doc['nodes'].append({'name':'Type97_Pump_Group','children':[pump],'extras':{'role':'mechanical_pump_foreend','source_node':'tripo_part_0','animation_axis_in_weapon_space':[0,0,1],'suggested_visual_stroke_m':.055}});node['children'].append(group)
doc['nodes'][pump]['name']='Type97_Pump_Foreend';node['name']='Type97_Hawk_Axes';node['rotation']=[0,-math.sqrt(.5),0,math.sqrt(.5)];node['translation']=[.001,-.242,0]
node['extras']={'axis_policy':'Original metre-scale retained; source -X forward mapped to weapon -Z; source Y up retained; origin on barrel axis source [0,.242,.001].','source_sha256':hashlib.sha256(raw).hexdigest()}
js=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);bb=binary+b'\0'*((-len(binary))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(bb))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(bb),0x004e4942)+bb;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out)
bounds=[]
for part in doc['nodes']:
 if 'mesh' not in part:continue
 for primitive in doc['meshes'][part['mesh']]['primitives']:
  accessor=doc['accessors'][primitive['attributes']['POSITION']];translation=part.get('translation',[0,0,0]);bounds.append(([accessor['min'][i]+translation[i] for i in range(3)],[accessor['max'][i]+translation[i] for i in range(3)]))
lo=[min(x[0][i] for x in bounds) for i in range(3)];hi=[max(x[1][i] for x in bounds) for i in range(3)];dims=[hi[i]-lo[i] for i in range(3)]
report={'source':str(src),'source_sha256':hashlib.sha256(raw).hexdigest(),'output':str(dst),'output_sha256':hashlib.sha256(out).hexdigest(),'original_binary_bytes_preserved':bb[:len(binary)]==binary,'mesh_count':len(doc['meshes']),'material_count':len(doc['materials']),'source_animation_count':len(doc.get('animations',[])),'source_bounds_m':{'min':lo,'max':hi},'source_dimensions_m':dims,'normalized_bounds_m':{'min':[.001-hi[2],lo[1]-.242,lo[0]],'max':[.001-lo[2],hi[1]-.242,hi[0]]},'normalized_dimensions_m':[dims[2],dims[1],dims[0]],'units_policy':'Source metre scale retained, no asserted real-world datasheet dimensions.','axes':{'right':[1,0,0],'up':[0,1,0],'forward':[0,0,-1]},'normalization_root':'Type97_Hawk_Axes','pump':{'group_name':'Type97_Pump_Group','foreend_mesh_name':'Type97_Pump_Foreend','original_mesh_name':'tripo_part_0','weapon_axis':[0,0,1],'parent_local_axis':[1,0,0],'suggested_visual_travel_m':.055,'validation':'Source side silhouette compared at 0/35/55/85 mm; 55 mm remains before main receiver front, 85 mm starts receiver overlap. Fixed guide/tube remains stationary. No new mechanical detail invented.'},'attachment_targets_weapon_m':{'right_grip':[0,-.122,.205],'right_palm_surface':[.024,-.122,.205],'left_grip':[-.018,-.069,-.275],'left_pump_center':[0,-.039,-.276],'trigger':[.011,-.072,.126],'butt_contact':[0,-.138,.489],'muzzle':[0,0,-.489],'barrel_forward':[0,0,-1],'right_grip_axis':[0,.98,-.2],'right_palm_normal':[1,0,0],'left_palm_normal':[0,-1,0]},'target_notes':'Targets sampled from actual component locations/silhouettes. Palm surfaces need per-character IK fit/visual review; center/proxy points are not claims of exact glove contact.'}
if len(sys.argv)>3:Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k in ['output','output_sha256','original_binary_bytes_preserved','mesh_count','normalized_dimensions_m','pump']},indent=2))
