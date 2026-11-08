"""Blender import and pose preview; first run tools/qa/validate_resistance_assets_r45.mjs."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.render.fps=30
summary=[]
deaths='--deaths' in sys.argv
extras='--extras' in sys.argv
pose_names=['Dying','FlyingBackDeath'] if deaths else ['Talking','HeadStress','SittingCrossLegged','SittingTalking','ClimbingLadder','HangToCrouch'] if extras else ['Idle','Walk','Run','WalkingBackwards','RifleAimingIdle']
cid='vest' if '--vest' in sys.argv else 'military'
for row,version in enumerate(['r45','r46']):
 for col,name in enumerate(pose_names):
  prev=set(bpy.data.objects);old=set(bpy.data.actions)
  bpy.ops.import_scene.gltf(filepath=str(ROOT/f'work/resistance-{version}/{cid}-animated.glb'))
  added=set(bpy.data.objects)-prev;acts=set(bpy.data.actions)-old
  arm=next(o for o in added if o.type=='ARMATURE')
  action=next(a for a in acts if a.name.startswith(name+'_'))
  arm.animation_data_clear();arm.animation_data_create();arm.animation_data.action=action
  sample_frame=round(action.frame_range[1]) if deaths else round(action.frame_range[1]*.5) if extras else 9
  sc.frame_set(sample_frame)
  bpy.context.view_layer.update()
  held={b.name:b.matrix_basis.copy() for b in arm.pose.bones}
  arm.animation_data_clear()
  for bone in arm.pose.bones:bone.matrix_basis=held[bone.name]
  roots=[o for o in added if o.parent not in added]
  for obj in roots:obj.location.x+=(col-(len(pose_names)-1)/2)*1.2;obj.location.y+=row*1.4
  summary.append(dict(character=cid,version=version,motion=name,sample_time_seconds=sample_frame/30,bones=len(arm.data.bones),actions=len(acts)))
sc.frame_set(9)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object
mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.12,.14,.17,1);floor.data.materials.append(mat)
bpy.ops.object.camera_add(location=(3,-6,3.4));cam=bpy.context.object;cam.rotation_euler=(Vector((0,.65,.48))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=7.0;sc.camera=cam
for loc,power,size in [((0,-3,5),1400,5),((4,1,4),900,4),((-3,2,3),700,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,.5,.5))-o.location).to_track_quat('-Z','Y').to_euler()
sc.world=bpy.data.worlds.new('World');sc.world.color=(.3,.3,.3);sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=False;sc.render.resolution_x=2200;sc.render.resolution_y=1100;sc.render.resolution_percentage=100
sc.render.filepath=str(ROOT/(f'work/resistance-r46/{cid}-'+('deaths.png' if deaths else 'extras.png' if extras else 'comparison.png')));bpy.ops.render.render(write_still=True)
(ROOT/('assets/characters/resistance_r46/blender-deaths-validation.json' if deaths else 'assets/characters/resistance_r46/blender-validation.json')).write_text(json.dumps({'blender_version':bpy.app.version_string,'preview':f'work/resistance-r46/{cid}-'+('deaths.png' if deaths else 'extras.png' if extras else 'comparison.png'),'poses':summary},indent=2)+'\n')
