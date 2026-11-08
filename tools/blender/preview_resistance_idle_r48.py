"""Render actual R47/R48 empty-handed Idle skins side-by-side in Blender.
Run node tools/gltf/lift_resistance_idle_r48.mjs first. Left=R47, right=R48.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/resistance-r48';OUT.mkdir(parents=True,exist_ok=True)
cid=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'military'
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.render.fps=30
for i,version in enumerate(['r47','r48']):
 prev=set(bpy.data.objects);old=set(bpy.data.actions)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'{cid}-{version}-idle.glb'))
 added=set(bpy.data.objects)-prev;acts=set(bpy.data.actions)-old
 arm=next(o for o in added if o.type=='ARMATURE');action=next(iter(acts))
 arm.animation_data_clear();arm.animation_data_create();arm.animation_data.action=action
 s.frame_set(9);bpy.context.view_layer.update();held={b.name:b.matrix_basis.copy() for b in arm.pose.bones};arm.animation_data_clear()
 for bone in arm.pose.bones:bone.matrix_basis=held[bone.name]
 root=bpy.data.objects.new(version,None);s.collection.objects.link(root)
 for o in added:
  if o.parent not in added:o.parent=root
 root.location.x=(i-.5)*.65
 bpy.context.view_layer.update()
s.world=bpy.data.worlds.new('World');s.world.color=(.32,.32,.32)
s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False;s.cycles.max_bounces=3;s.render.threads_mode='FIXED';s.render.threads=4
s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100
for loc,power,size in [((0,-3,4),450,4),((3,1,3),300,3),((-3,2,2),250,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,.6))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.38
for name,loc in [('front',(0,-4,1.2)),('quarter',(1.3,-4,1.2)),('back',(0,4,1.2))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.73))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/f'{cid}-idle-{name}.png');bpy.ops.render.render(write_still=True)
