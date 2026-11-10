"""Render runtime-baked poses with actual skinned meshes, one or more frames.
Usage: blender -b -t 2 -P tools/weapon_v7_legacy/render.py -- ROOT [cid-weapon ...]
Reads poses.json and {id}.glb/{id}-gun.glb in ROOT; renders stage and close-up front+angled
for exact samples. FPS is set before glTF import. No production assets are changed.
"""
import bpy, json, sys, time, os
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; root=Path(args[0]).resolve(); ids=args[1:];data=json.loads((root/'poses.json').read_text())
if not ids: ids=[f'{c}-{w}' for c,ws in data['characters'].items() for w in ws]
for ident in ids:
 cid,wid=ident.split('-',1); entry=data['characters'][cid][wid]; rows=entry['rows']; out=root/('render-nogun' if os.environ.get('NOGUN')=='1' else 'render')/ident;out.mkdir(parents=True,exist_ok=True);start=time.time()
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=240
 for suffix in (['.glb'] if os.environ.get('NOGUN')=='1' else ['.glb','-gun.glb']): bpy.ops.import_scene.gltf(filepath=str(root/(ident+suffix)))
 for obj in bpy.data.objects:
  if obj.animation_data:
   for track in obj.animation_data.nla_tracks:track.mute=True
 scene=bpy.context.scene;scene.render.fps=240;scene.render.engine='CYCLES';scene.cycles.samples=4;scene.cycles.use_denoising=False;scene.cycles.max_bounces=2;scene.render.use_persistent_data=True;scene.render.threads_mode='FIXED';scene.render.threads=2
 scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.32,.34,1)
 scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard'
 # The center is derived once from runtime right wrist, so frames are comparable.
 def cv(v):return Vector((v[0],-v[2],v[1]))
 center=sum((cv(row['xyz']['RightHand']) for row in rows),Vector())/len(rows); center+=Vector((-.03,0,.035))
 for d,p in [((2,-3,4),190),((-3,-1,2),130),((1,3,3),160)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));obj=bpy.context.object;obj.data.energy=p;obj.data.size=3;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.86
 for angle,d in [('front',(.04,-1,.05)),('angled',(.18,-1,.47)),('side',(1,0,.05))]:
  if angle not in os.environ.get('ANGLES','front,angled,side').split(','): continue
  cam.location=center+Vector(d).normalized()*4;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  # Nine samples include both loop endpoints and original screenshot phases.
  for i in [int(x) for x in os.environ.get("FRAMES","0,2,4,6,8,10,12,14,16").split(",")]:
   t=rows[i]['time']; frame=t*240;scene.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();scene.render.filepath=str(out/f'{angle}-{i:02}.png');
   if not Path(scene.render.filepath).exists(): bpy.ops.render.render(write_still=True)
 print('RENDERED',ident,'seconds',round(time.time()-start,1),flush=True)
