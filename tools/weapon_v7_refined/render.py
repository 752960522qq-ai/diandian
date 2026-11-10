import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'web/motion-labs/verification_weapon_v7/refined'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
mf=args[0] if args else 'render-manifest.json'
for row in json.loads((OUT/mf).read_text()):
 if len(args)>1 and not any(f in row['name'] for f in args[1:]):continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 for suffix in ['.glb','-gun.glb']:bpy.ops.import_scene.gltf(filepath=str(OUT/(row['name']+suffix)))
 for o in bpy.data.objects:
  if o.animation_data:o.animation_data_clear()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False
 scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('QA');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.36,.33,1)
 center=Vector((row['center'][0],-row['center'][2],row['center'][1]))
 for d,p in [((2,-3,4),180),((-3,-1,2),130),((1,3,3),150)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));o=bpy.context.object;o.data.energy=p;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=row.get('scale',.9)
 directions={'front':(0,-1,.1),'right':(-.8,-1,.3),'left':(1,-.3,.15),'top':(.1,-.6,1),'back':(0,1,.15)}
 for angle in row.get('views',['front','left','top']):
  cam.location=center+Vector(directions[angle]).normalized()*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(row['name']+'-'+angle+'.png'));bpy.ops.render.render(write_still=True)
