import bpy,sys,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
weapon=args[0] if args else 'qbz95'; motion=args[1] if len(args)>1 else 'RifleAimingIdle';cid=args[2] if len(args)>2 else 'linxu';angle=args[3] if len(args)>3 else 'right'
root=Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
variants=[('diandian','reference'),(cid,'before'),(cid,'after')]
if len(args)>4:variants=[(c,v) for c,v in variants if v==args[4]]
for i,(c,v) in enumerate(variants):
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
 for suffix in ['', '-gun']:
  before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(root/f'work/linxu-motion-v3/poses/{c}-{weapon}-{motion}-{v}{suffix}.glb'));added=set(bpy.data.objects)-before
  for o in added:
   if o.parent not in added:o.location.x+=0
 target=Vector((0,-.04,1.30));pos=target+Vector((-.95,-1.2,.25)) if angle=='right' else target+Vector((1,-1.05,.25))
 if angle=='detail':
  arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');hands=[arm.matrix_world @ b.matrix.translation for b in arm.pose.bones if b.name.endswith(('RightHand','LeftHand'))];target=(hands[0]+hands[1])*.5;pos=target+Vector((-.7,-.9,.25))
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(target-pos).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.43 if angle=='detail' else .95;s.camera=cam
 for loc,power,size in [((0,-3,5),800,4),((4,1,4),500,3),((-3,2,3),400,3)]:
  if True:
   bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 if not s.world:s.world=bpy.data.worlds.new('World')
 s.world.color=(.25,.25,.25);s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False;s.render.resolution_x=650;s.render.resolution_y=650;s.render.resolution_percentage=100
 s.render.filepath=str(root/f'work/linxu-motion-v3/{cid}-{weapon}-{motion}-{v}-{angle}.png');bpy.ops.render.render(write_still=True)
