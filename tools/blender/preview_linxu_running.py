"""Pose before/after from the final asset using Blender, for shoulder review."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2];bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(R/'work/linxu-motion/linxu-final-animated.glb'));arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');arm.animation_data_clear();arm.animation_data_create();acts=list(bpy.data.actions)
bpy.ops.object.camera_add(location=(.65,-2,.9));cam=bpy.context.object;cam.rotation_euler=(Vector((0,.01,.72))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.78;sc.camera=cam
for pos,power,size in [((-1,-2,3),140,2),((2,-1,1.8),100,2),((0,2,2),140,2)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,.65))-l.location).to_track_quat('-Z','Y').to_euler()
sc.world=bpy.data.worlds.new('ReviewWorld');sc.world.color=(.22,.22,.22);sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=False;sc.render.resolution_x=850;sc.render.resolution_y=950;sc.render.resolution_percentage=100
for name in ['Run_Before','Run','RifleRun_Before','RifleRun']:
 action=next((a for a in acts if a.name==name),None) or next(a for a in acts if a.name.startswith(name+'_') and ('Before' in a.name)==('Before'in name));arm.animation_data.action=action;sc.frame_set(round(action.frame_range[1]*.5));bpy.context.view_layer.update();sc.render.filepath=str(R/f'work/linxu-motion/{name}.png');bpy.ops.render.render(write_still=True)
