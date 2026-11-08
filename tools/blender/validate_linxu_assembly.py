"""Check the authored shared neck seams and neutral source-head proportions."""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
R=Path(__file__).resolve().parents[2];O=R/'assets/characters/linxu';bpy.ops.wm.open_mainfile(filepath=str(O/'linxu_assembled.blend'))
body=bpy.data.objects['Linxu_Body_HighPrecisionHead'];arm=bpy.data.objects['Linxu_Rig'];config=json.loads((O/'assembly_report.json').read_text());bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table();kd=KDTree(len(bm.verts))
for i,v in enumerate(bm.verts):kd.insert(v.co,i)
kd.balance();rows=[]
for p in config['neck_seam_positions']:
 _,i,d=kd.find(Vector(p));v=bm.verts[i];rows.append({'distance':d,'open_edges':sum(e.is_boundary for e in v.link_edges)})
report={'neck_seam_points':len(rows),'neck_max_position_error_m':max(r['distance']for r in rows),'neck_open_edges':sum(r['open_edges']for r in rows),'bones':len(arm.data.bones),'actions':len(bpy.data.actions),'body_rest_matrix_max_difference':config['body_rest_matrix_max_difference']};bm.free()
# Verify all retained high-head surface coordinates against a uniform transform of the source.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(O/'source/linxu head.glb.glb'));src=next(o for o in set(bpy.data.objects)-before if o.type=='MESH');points=[src.matrix_world@v.co*config['head_uniform_scale']+Vector(config['head_translation']) for v in src.data.vertices];kd=KDTree(len(points))
for i,p in enumerate(points):kd.insert(p,i)
kd.balance();region=body.data.attributes['linxu_region'];errors=[kd.find(v.co)[2] for i,v in enumerate(body.data.vertices) if region.data[i].value==1]
report['retained_head_vertices']=len(errors);report['uniform_head_max_vertex_error_m']=max(errors);report['passed']=report['neck_open_edges']==0 and report['neck_max_position_error_m']<1e-6 and max(errors)<.00002 and report['body_rest_matrix_max_difference']==0 and report['bones']==312 and report['actions']==0
(O/'assembly_validation.json').write_text(json.dumps(report,indent=2)+'\n');print('ASSEMBLY_VALIDATION',json.dumps(report));assert report['passed']
