"""Final width and pump QA. Same camera per view for each variant; no geometry edits."""
import argparse,bpy,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
P=argparse.ArgumentParser();P.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);P.add_argument('--baseline-root',type=Path);P.add_argument('--out',type=Path);A=P.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=A.root.resolve();OUT=A.out.resolve() if A.out else ROOT/'web/motion-labs/verification_weapon_v6_scale';BASELINE=A.baseline_root.resolve() if A.baseline_root else ROOT.parent/'character_adapt_baseline'
variants=[('M97_reference',BASELINE/'web/motion-labs/diandian-classic-motion-lab/assets/weapons/winchester1897.glb',0),('M870_before_thinning',OUT/'M870_before_thinning.glb',0),('M870_final',ROOT/'assets/weapons/m870.glb',0),('M870_final_pump_max',ROOT/'assets/weapons/m870.glb',.07335981801152229)]
rows=[]
for name,file,pump_delta in variants:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(file))
 for o in bpy.data.objects:
  if o.animation_data:o.animation_data_clear()
 if pump_delta:bpy.data.objects['Pump_visual'].location.x+=pump_delta
 bpy.context.view_layer.update()
 # Fixed camera target in game coordinates transformed by Blender GLTF import: (x,-z,y).
 # Keep the exact same target and magnification, including pump fully retracted.
 target=Vector((0,.05780697931212589,-.083379838258692))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 scene.world=bpy.data.worlds.new('Neutral');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 for pos,energy,size in [((2,-1,2),150,3),((-2,1,1),100,3)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
 views={'side':((1,0,0),(0,1,0),(0,0,1),1.15,(1400,360)), 'top':((0,0,1),(0,1,0),(-1,0,0),1.15,(1400,360)), 'front':((0,1,0),(-1,0,0),(0,0,1),.28,(600,600))}
 for view,(back,right,up,ortho,res) in views.items():
  camera.location=target+Vector(back)*3;camera.rotation_euler=Matrix((Vector(right),Vector(up),Vector(back))).transposed().to_quaternion().to_euler();camera.data.ortho_scale=ortho
  scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(OUT/f'{name}-{view}.png');bpy.ops.render.render(write_still=True)
  rows.append({'variant':name,'view':view,'target_blender_xyz':list(target),'ortho_scale':ortho,'resolution':res,'pump_source_delta':pump_delta})
 # Close three-quarter view of the pump/cap and receiver junction; identical in all variants.
 target=Vector((0,.24,-.036));camera.location=target+Vector((.8,1,.5)).normalized()*3;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=.53
 scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.filepath=str(OUT/f'{name}-pump-junction.png');bpy.ops.render.render(write_still=True)
(OUT/'final_render_settings.json').write_text(json.dumps(rows,indent=2)+'\n')
