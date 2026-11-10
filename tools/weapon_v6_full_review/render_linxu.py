"""Actual textured skinned model renders of runtime-baked Linxu animations. QA only."""
import bpy,json,sys,math,time
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'web/motion-labs/verification_weapon_v6_full_review/linxu';ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
manifest=json.loads((O/('manifest-selected.json' if '--selected' in ARGS else 'manifest.json')).read_text());filter_args=[a for a in ARGS if not a.startswith('--')];engine='BLENDER_WORKBENCH' if '--bench' in ARGS else 'CYCLES';continuous='--continuous' in ARGS
for row in manifest['rows']:
 if row['coverage']=='delegated_longgun_run' or (filter_args and row['name'] not in filter_args):continue
 start=time.time();name=row['name'];F=O/('frames-detail' if '--detail'in ARGS else 'frames-full' if '--full'in ARGS else 'frames')/name;F.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=240
 for suffix in ['.glb']+(['-gun.glb'] if row['w']!='none' else []):bpy.ops.import_scene.gltf(filepath=str(O/'baked'/(name+suffix)))
 for o in bpy.data.objects:
  if o.animation_data:
   for t in o.animation_data.nla_tracks:t.mute=True
 scene=bpy.context.scene;scene.render.fps=240;scene.render.engine=engine
 if engine=='CYCLES':scene.cycles.samples=4;scene.cycles.use_denoising=False;scene.render.use_persistent_data=True;scene.cycles.max_bounces=2;scene.render.threads_mode='FIXED';scene.render.threads=2
 else:scene.display.shading.light='STUDIO';scene.display.shading.studio_light='paint.sl';scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('QAWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.30,.32,1);scene.world.color=(.2,.22,.25)
 scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard'
 # Match app's front (+Z Three -> -Y Blender), side (+X), and back (-Z -> +Y).
 bmin,bmax=[Vector((v[0],-v[2],v[1])) for v in (row.get('visualBox',row['box']) if '--full'in ARGS else row['box'])];center=(bmin+bmax)*.5;ext=(bmax-bmin);ortho=max(abs(ext.z)*1.15,abs(ext.x)*1.3,abs(ext.y)*1.3,1.95)
 if row['w']!='none' and '--full' not in ARGS:center=Vector((0,0,1.17));ortho=1.47
 if '--close' in ARGS:center=Vector((row['handCenter'][0],-row['handCenter'][2],row['handCenter'][1]));ortho=.7
 for d,p in [((2,-3,4),190),((-3,-1,2),130),((1,3,3),160)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));o=bpy.context.object;o.data.energy=p;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=ortho
 duration=row['duration'];phases=[0,.125,.25,.375,.5,.625,.75,.875,1]
 sample_fps=48 if duration<.5 else 12
 if continuous:times=[min(duration,i/sample_fps) for i in range(math.ceil(duration*sample_fps)+1)]
 else:times=[duration*p for p in phases]
 custom=next((a.split('=',1)[1]for a in ARGS if a.startswith('--times=')),None)
 if custom:times=[float(t)for t in custom.split(',')]
 metadata=[]
 for angle,d in [('front',(.04,-1,.05)),('side',(1,0,.05)),('back',(0,1,.05))]:
  cam.location=center+Vector(d).normalized()*4;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  for i,t in enumerate(times):
   frame=t*240;scene.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();p=F/(f'{angle}-{i:03d}'+('-continuous' if continuous else '')+('-close' if '--close'in ARGS else '')+'.png');scene.render.filepath=str(p)
   if not p.exists():bpy.ops.render.render(write_still=True)
   metadata.append({'view':angle,'index':i,'time':t,'runtimeFrame240':frame,'image':str(p.relative_to(O))})
 (F/('metadata-continuous.json' if continuous else 'metadata.json')).write_text(json.dumps({'name':name,'renderer':engine,'resolution':[512,512],'renderSamplingHz':sample_fps if continuous else None,'runtimeSamplingHz':240,'cameraOrthoScale':ortho,'frames':metadata},indent=2));print('REVIEW_FINISHED',name,'seconds',round(time.time()-start,2),flush=True)
