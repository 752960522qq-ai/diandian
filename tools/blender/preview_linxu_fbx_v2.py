"""Render the three FBX replacements on the unchanged Linxu character.
Run after validate_linxu_fbx_v2.mjs; optional -- raw to render uncorrected reference.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/linxu-motion-v2'
variant='raw' if '--' in sys.argv and 'raw' in sys.argv[sys.argv.index('--')+1:] else 'final'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/f'linxu-{variant}-animated.glb'))
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
arm.animation_data_clear();arm.animation_data_create();actions=list(bpy.data.actions)
scene=bpy.context.scene;scene.render.fps=30
bpy.ops.object.camera_add(location=(.65,-2,.9));camera=bpy.context.object
camera.rotation_euler=(Vector((0,.01,.52))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=1.14;scene.camera=camera
for p,power,size in [((-1,-2,3),140,2),((2,-1,1.8),100,2),((0,2,2),140,2)]:
 bpy.ops.object.light_add(type='AREA',location=p);light=bpy.context.object;light.data.energy=power;light.data.size=size;light.rotation_euler=(Vector((0,0,.65))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('MotionReview');scene.world.color=(.22,.22,.22)
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.render.resolution_x=720;scene.render.resolution_y=950;scene.render.resolution_percentage=100
for name in (['Run'] if 'run-only' in sys.argv else ['Idle','Walk','Run']):
 action=next((a for a in actions if a.name==name),None) or next(a for a in actions if a.name.startswith(name+'_'))
 arm.animation_data.action=action
 for fraction in [0,.25,.5,.75]:
  frame=action.frame_range[0]+fraction*(action.frame_range[1]-action.frame_range[0]);scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  scene.render.filepath=str(OUT/f'{variant}-{name}-{round(fraction*100):02d}.png');bpy.ops.render.render(write_still=True)
