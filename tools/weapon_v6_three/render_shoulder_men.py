import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'web/motion-labs/verification_weapon_v6_three/shoulder-men-candidate'
rows=json.loads((OUT/'render-manifest.json').read_text())
filters=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for row in rows:
 if filters and not any(f in row['name'] for f in filters):continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 for suffix in ['.glb','-gun.glb']:bpy.ops.import_scene.gltf(filepath=str(OUT/(row['name']+suffix)))
 for o in bpy.data.objects:
  if o.animation_data:o.animation_data_clear()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False
 scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('CandidateQA');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.45,.45,1)
 center=Vector((row['center'][0],-row['center'][2],row['center'][1]))
 for d,p in [((2,-3,4),200),((-3,-1,2),150),((1,3,3),170)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));o=bpy.context.object;o.data.energy=p;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.08
 for angle,d in [('front',(0,-1,0)),('left',(1,-.12,0)),('back',(0,1,0))]:
  cam.location=center+Vector(d)*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(row['name']+'-'+angle+'.png'));bpy.ops.render.render(write_still=True)
