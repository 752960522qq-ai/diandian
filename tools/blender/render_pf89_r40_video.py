"""Actual R40 Blender animation frames. Does not alter saved character files."""
import bpy,math,sys,json,time
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=Path(args[0]);cid=args[1];out.mkdir(parents=True,exist_ok=True)
s=bpy.context.scene;arm=next(o for o in s.objects if o.type=='ARMATURE');gun=bpy.data.objects['PF89_AnimatedMount']
for ob in (arm,gun):
 for tr in ob.animation_data.nla_tracks:tr.mute=True
s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=False;s.cycles.max_bounces=3;s.cycles.diffuse_bounces=2;s.cycles.glossy_bounces=2;s.cycles.transparent_max_bounces=4
s.render.use_persistent_data=True;s.render.threads_mode='FIXED';s.render.threads=4
s.render.resolution_x=640;s.render.resolution_y=560;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
s.world=bpy.data.worlds.new('VideoWorld');s.world.color=(.18,.18,.18)
for loc,power,size in [((3,-4,5),900,4),((-3,-1,3),700,3),((0,3,4),1000,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
# All source action pairs are loaded from the saved, validated final R40 file.
shots=[('RocketIdle',32,5,6.6,(2,-3,2.1),(0,0,1.2),1.95,'idle'),('RocketRun',32,0,1.6,(2,-3,2.1),(0,0,1.2),1.95,'run'),('RocketIdle',24,5,6.2,(1.2,-.7,1.9),(-.06,-.10,1.42),.78,'carry_close'),('RocketDraw',24,0,.5666667,(2,3,2.7),(0,0,1.25),2.2,'draw'),('RocketRaiseLevel',24,0,.85,(2,-3,2.1),(0,0,1.2),1.95,'raise'),('RocketAimLevel',24,1.8,3,(1.2,-.7,1.9),(-.06,-.10,1.42),.78,'aim')]
rows=[];index=0;start=time.time()
for action,count,t0,t1,loc,target,scale,label in shots:
 arm.animation_data.action=bpy.data.actions[action];gun.animation_data.action=bpy.data.actions[action+'_Weapon']
 duration=(arm.animation_data.action.frame_range.y-1)/60
 for i in range(count):
  t=t0+(t1-t0)*i/max(count-1,1)
  if label=='run':t=t%duration
  frame=1+t*60;s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update()
  cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
  s.render.filepath=str(out/f'{index:04d}.png');bpy.ops.render.render(write_still=True)
  rows.append({'output_frame':index,'character':cid,'action':action,'source_time_s':t,'label':label});index+=1
  print('VIDEO_PROGRESS',cid,index,160,round(time.time()-start,1),flush=True)
(out/'frames.json').write_text(json.dumps({'fps':20,'width':640,'height':560,'source_blend':bpy.data.filepath,'frames':rows},indent=2))
print('VIDEO_COMPLETE',cid,index,round(time.time()-start,1),flush=True)
