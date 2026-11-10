"""Blender evidence render: fixed orthographic cameras, matched axial center, source geometry."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
BASELINE=ROOT.parent/'character_adapt_baseline'
OUT=ROOT/'web/motion-labs/verification_weapon_v6_scale'
assets={'M97':BASELINE/'web/motion-labs/diandian-classic-motion-lab/assets/weapons/winchester1897.glb','M870_v6':ROOT/'assets/weapons/m870.glb'}
rows=[]
for name,file in assets.items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(file))
 for o in bpy.data.objects:
  if o.animation_data:o.animation_data_clear()
 bpy.context.view_layer.update()
 points=[o.matrix_world@Vector(v) for o in bpy.data.objects if o.type=='MESH' for v in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 # Center each bounding box. Same dimensional axes, orthographic magnification and camera.
 center=(lo+hi)/2
 for o in list(bpy.context.scene.objects):
  if o.parent is None:o.location-=center
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False
 scene.render.resolution_x=1400;scene.render.resolution_y=360;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
 scene.world=bpy.data.worlds.new('Neutral');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 for pos,energy,size in [((2,-1,2),150,3),((-2,1,1),100,3)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=1.15
 views={'side':((1,0,0),(0,1,0),(0,0,1)),'top':((0,0,1),(0,1,0),(-1,0,0))}
 for view,(back,right,up) in views.items():
  camera.location=Vector(back)*3;camera.rotation_euler=Matrix((Vector(right),Vector(up),Vector(back))).transposed().to_quaternion().to_euler()
  scene.render.filepath=str(OUT/f'{name}-{view}.png');bpy.ops.render.render(write_still=True)
  rows.append({'asset':name,'view':view,'dimensions_blender_xyz':list(hi-lo),'axial_center_alignment':True,'ortho_scale':1.15,'resolution':[1400,360],'camera_right':right,'camera_up':up,'camera_back':back})
(OUT/'render_settings.json').write_text(json.dumps(rows,indent=2)+'\n')
