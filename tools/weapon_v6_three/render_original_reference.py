import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'web/motion-labs/verification_weapon_v6_three';POSE=OUT/'original-reference-poses'
rows=json.loads((POSE/'manifest.json').read_text())
fil=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
full='--full' in fil
fil=[f for f in fil if f!='--full']
for row in rows:
 if fil and not any(f in row['name'] for f in fil):continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 for suffix in ['.glb','-gun.glb']:bpy.ops.import_scene.gltf(filepath=str(POSE/(row['name']+suffix)))
 for o in bpy.data.objects:
  if o.animation_data:o.animation_data_clear()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=4;scene.cycles.use_denoising=False
 scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.3,.3,1)
 center=Vector((0,0,.9)) if full else Vector((row['center'][0],-row['center'][2],row['center'][1]))
 for d,p in [((2,-3,4),180),((-3,-1,2),130),((1,3,3),150)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(d));o=bpy.context.object;o.data.energy=p;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.1 if full else .64
 for angle,d in [('right',(1,-.5,.15)),('left',(-1,-.5,.15)),('top',(.1,0,1))]:
  cam.location=center+Vector(d).normalized()*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(row['name']+'-'+angle+('-full' if full else '')+'.png'));bpy.ops.render.render(write_still=True)
