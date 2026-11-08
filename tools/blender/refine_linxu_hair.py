"""Refine occluded hair roots against the assembled head; run after assemble_linxu.py."""
import bpy,bmesh,json,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];O=R/'assets/characters/linxu';bpy.ops.wm.open_mainfile(filepath=str(O/'linxu_assembled.blend'))
arm=bpy.data.objects['Linxu_Rig'];body=bpy.data.objects['Linxu_Body_HighPrecisionHead'];hair=bpy.data.objects['Linxu_Hair']
if arm.get('hair_refinement_done'):raise RuntimeError('Regenerate the base assembly before running refinement again.')
for p in arm.pose.bones:p.matrix_basis=Matrix.Identity(4)
body.data.calc_loop_triangles();headtris=[tuple(t.vertices) for t in body.data.loop_triangles if '826f' in body.data.materials[t.material_index].name];hbvh=BVHTree.FromPolygons([v.co for v in body.data.vertices],headtris,all_triangles=True)
bm=bmesh.new();bm.from_mesh(hair.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));roots=next(i for i,m in enumerate(hair.data.materials) if 'Roots' in m.name)
def collision_faces():
 bm.verts.ensure_lookup_table();bm.verts.index_update();faces=[f for f in bm.faces if f.material_index!=roots];tree=BVHTree.FromPolygons([v.co for v in bm.verts],[[v.index for v in f.verts] for f in faces],all_triangles=True);pairs=hbvh.overlap(tree);return set(faces[j] for i,j in pairs),len(pairs)
def area(fs):return sum(f.calc_area() for f in fs)
bad,before=collision_faces();report={'before_intersecting_pairs':before,'before_intersecting_hair_triangles':len(bad),'before_total_hair_area':area([f for f in bm.faces if f.material_index!=roots])}
# Refine only contact triangles, preserving the outer strands and texture UVs.
edges=set(e for f in bad for e in f.edges);bmesh.ops.subdivide_edges(bm,edges=list(edges),cuts=2,use_grid_fill=True);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>3])
bad,_=collision_faces()
for f in bm.faces:
 if f.material_index==roots:continue
 c=f.calc_center_median();hit=hbvh.find_nearest(c)
 if hit and hit[0] is not None and (c-hit[0]).dot(hit[1])<-.0001:bad.add(f)
report['trimmed_root_area']=area(bad);report['trimmed_refined_triangles']=len(bad);bmesh.ops.delete(bm,geom=list(bad),context='FACES')
# Keep the ears clear of the root cap.
ear_cap=[f for f in bm.faces if f.material_index==roots and abs(f.calc_center_median().x)>.038 and f.calc_center_median().z<.947 and f.calc_center_median().y<.049]
bmesh.ops.delete(bm,geom=ear_cap,context='FACES')
capverts=set(v for f in bm.faces if f.material_index==roots for v in f.verts)
for v in capverts:
 if any(e.is_boundary for e in v.link_edges) and v.co.y<.01 and v.co.z>.95:
  target=v.co.copy();target.z=.96+.003*(min(1,abs(v.co.x)/.03)**2);hit=hbvh.find_nearest(target)
  if hit and hit[0] is not None:v.co=hit[0]+hit[1]*.00045
# Hair-root texture follows the dark brown source strands, with fine directional variation.
im=bpy.data.images['Linxu_HairRoots_Color'];w,h=im.size;rng=np.random.default_rng(48);noise=rng.random((h,w))*.22;streak=rng.random(w)*.35;rgb=np.array([.23,.17,.125])[None,None,:]*(.72+noise[:,:,None]+streak[None,:,None]);pixels=np.ones((h,w,4));pixels[:,:,:3]=rgb;im.pixels[:]=pixels.reshape(-1).tolist();im.pack()
# Refine the moved hairline edge so its chords also stay above the scalp.
for iteration in range(4):
 bm.verts.ensure_lookup_table();bm.verts.index_update();capfaces=[f for f in bm.faces if f.material_index==roots]
 cbvh=BVHTree.FromPolygons([v.co for v in bm.verts],[[v.index for v in f.verts] for f in capfaces],all_triangles=True)
 capbad=set(capfaces[j] for i,j in hbvh.overlap(cbvh))
 if not capbad:break
 chosen=set(e for f in capbad for e in f.edges);bmesh.ops.subdivide_edges(bm,edges=list(chosen),cuts=2,use_grid_fill=True);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>3])
 for v in set(v for f in bm.faces if f.material_index==roots for v in f.verts):
  hit=hbvh.find_nearest(v.co)
  if hit and hit[0] is not None:v.co=hit[0]+hit[1]*.00045
report['cap_refinement_passes']=iteration

loose=[v for v in bm.verts if not v.link_faces];bmesh.ops.delete(bm,geom=loose,context='VERTS');bm.normal_update();bm.to_mesh(hair.data);bm.free();hair.data.update()
# The cap and hair use exactly the same rigid Head influence at all vertices.
for v in hair.data.vertices:
 for g in list(v.groups):hair.vertex_groups[g.group].remove([v.index])
hair.vertex_groups['mixamorig:Head'].add(list(range(len(hair.data.vertices))),1,'REPLACE')
arm['hair_refinement_done']=True
bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
for o in [arm,body,hair]:o.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.wm.save_as_mainfile(filepath=str(O/'linxu_assembled.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(O/'linxu_assembled.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_all_influences=False)
report['final_hair_vertices']=len(hair.data.vertices);report['final_hair_triangles']=len(hair.data.polygons)
(O/'hair_refinement_report.json').write_text(json.dumps(report,indent=2)+'\n');print('HAIR_REFINEMENT',json.dumps(report))
