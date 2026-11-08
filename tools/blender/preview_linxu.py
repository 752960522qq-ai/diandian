"""Render neutral and deformation checks from the editable Linxu model."""
import bpy,json,math,sys
from mathutils import Vector,Matrix
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=R/'assets/characters/linxu';bpy.ops.wm.open_mainfile(filepath=str(O/'linxu_assembled.blend'))
sc=bpy.context.scene;arm=bpy.data.objects['Linxu_Rig'];sc.world=bpy.data.worlds.new('ReviewWorld');sc.world.color=(.22,.22,.22)
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';sc.camera=cam
for pos,power,size in [((-1,-2,3),140,2),((2,-1,1.8),100,2),((0,2,2),140,2)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,.65))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));floor=bpy.context.object;m=bpy.data.materials.new('ReviewFloor');m.diffuse_color=(.095,.11,.12,1);floor.data.materials.append(m)
sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=False;sc.render.resolution_x=900;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
checks=[('full_front',None,1,(.32,-2,1.05),(0,0,.5),1.13),('head_front',None,1,(0,-.6,.94),(0,.008,.935),.21),('head_side',None,1,(.65,-.15,.97),(0,.008,.935),.23),('head_back',None,1,(.15,.65,.98),(0,.008,.935),.23),('head_turn','turn',21,(0,-.6,.94),(0,.008,.935),.22)]
if '--quick' in sys.argv:checks=checks[:2]
for name,act,frame,position,target,scale in checks:
 for p in arm.pose.bones:p.matrix_basis=Matrix.Identity(4)
 sc.frame_set(frame);
 if act=='turn':
  from mathutils import Quaternion
  pb=arm.pose.bones['mixamorig:Head'];axis=pb.bone.matrix_local.to_quaternion().inverted()@Vector((0,0,1));pb.rotation_quaternion=Quaternion(axis,math.radians(35))
 bpy.context.view_layer.update();cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.filepath=str(O/(name+'.png'));bpy.ops.render.render(write_still=True)
