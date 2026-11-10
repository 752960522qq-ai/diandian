"""Render real baseline/candidate mesh animation with a fixed camera, not AI imagery."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'web/motion-labs/verification_weapon_v6_jitter';F=O/'walk-render-frames';F.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=24
for kind,x in [('original',-.62),('candidate',.62)]:
 old=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(O/('walk-candidate-render-baked.glb' if kind=='candidate' else 'walk-original-animated.glb')))
 new=set(bpy.data.objects)-old
 for o in new:
  if o.parent is None:o.location.x+=x
 arms=[o for o in new if o.type=='ARMATURE']
 for a in arms:
  for tr in a.animation_data.nla_tracks if a.animation_data else []:tr.mute=True
# Blender glTF import assigns the single named action automatically. Preserve it.
sc.world=bpy.data.worlds.new('ReviewWorld');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.27,.30,1)
mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.13,.16,.18,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));bpy.context.object.data.materials.append(mat)
for p,e in [((1,-4,5),450),((-4,-2,3),350),((0,3,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=e;l.data.size=4;l.rotation_euler=(Vector((0,0,.9))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.5,-5,1.5));cam=bpy.context.object;target=Vector((0,0,.86));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.65;sc.camera=cam
sc.render.engine='CYCLES';sc.cycles.samples=3;sc.cycles.use_denoising=False;sc.render.resolution_x=900;sc.render.resolution_y=670;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='Standard'
# The original cycle is 28 frames at 24fps. Render once, repeat the verified identical cycle three times in packaging.
rows=[];validate_only='--validate-only' in sys.argv
for i in range(28):
 t=i/24;sc.frame_set(i);bpy.context.view_layer.update();sc.render.filepath=str(F/f'{i:03}.png')
 if not validate_only:bpy.ops.render.render(write_still=True)
 poses=[]
 for a in bpy.data.objects:
  if a.type=='ARMATURE':
   p=a.matrix_world @ a.pose.bones['mixamorig:Hips'].head
   poses.append({'armature':a.name,'hipsWorldBlender':list(p),'action':a.animation_data.action.name if a.animation_data and a.animation_data.action else None})
 rows.append({'frame':i,'time':t,'poses':poses})
(O/('walk-render-pose-validation.json' if validate_only else 'walk-render-metadata.json')).write_text(json.dumps({'method':'Blender Cycles real mesh render, fixed camera, left original / right candidate sigma1. Three cycles are the same verified periodic motion repeated.','fps':24,'camera':list(cam.location),'frames':rows,'armatures':[{'name':a.name,'action':a.animation_data.action.name if a.animation_data and a.animation_data.action else None}for a in bpy.data.objects if a.type=='ARMATURE']},indent=2))
