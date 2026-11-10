import bpy,json,sys,math,time
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'web/motion-labs/verification_weapon_v6_shoulder'
manifest=json.loads((OUT/'continuous-manifest.json').read_text())
for row in manifest['rows']:
 name=row['name'];F=OUT/'frames'/name;F.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=240
 for suffix in ['.glb','-gun.glb']:bpy.ops.import_scene.gltf(filepath=str(OUT/'baked'/(name+suffix)))
 for o in bpy.data.objects:
  if o.animation_data:
   for t in o.animation_data.nla_tracks:t.mute=True
 scene=bpy.context.scene;scene.render.fps=240;scene.render.engine='CYCLES';scene.cycles.samples=4;scene.cycles.use_denoising=False;scene.cycles.max_bounces=2;scene.render.use_persistent_data=True;scene.render.threads_mode='FIXED';scene.render.threads=2
 scene.world=bpy.data.worlds.new('QAWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.4,.4,1)
 scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 center=Vector((.10,-.20,1.28))
 for d,p in [((2,-3,4),200),((-3,-1,2),150),((1,3,3),170)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));o=bpy.context.object;o.data.energy=p;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.98
 times=[row['duration']*i/40 for i in range(41)]
 metadata=[]
 for angle,d in [('front',(0,-1,0)),('left',(1,-.12,0)),('back',(0,1,0))]:
  cam.location=center+Vector(d).normalized()*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  for i,t in enumerate(times):
   frame=t*240;scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();p=F/f'{angle}-{i:03d}.png';scene.render.filepath=str(p)
   if not p.exists():bpy.ops.render.render(write_still=True)
   metadata.append({'view':angle,'index':i,'time':t,'phase':i/40,'runtimeFrame240':frame,'image':str(p.relative_to(OUT))})
 (F/'metadata.json').write_text(json.dumps({'name':name,'renderer':'Cycles','runtimeSamplingHz':240,'renderFramesPerCycle':41,'frames':metadata},indent=2));print('CONTINUOUS_FINISHED',name,flush=True)
