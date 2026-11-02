"""Retarget the uploaded Mixamo FBX clips, preserving source torso and arm motion.

Blender 4.3. Call retarget_raw_actions({'Idle': idle_fbx, 'Walk': walk_fbx}, target).
Returns {'Idle': Action, 'Walk': Action}; measured provenance is in
retarget_raw_actions.last_report. No mesh, skin weights or rest bone is edited.
"""
import bpy,math
from mathutils import Matrix,Vector,Quaternion

def _point(arm,name,posed=False):
 b=arm.pose.bones[name] if posed else arm.data.bones[name]
 return arm.matrix_world@(b.head if posed else b.head_local)
def _side_frame(arm):
 x=_point(arm,'mixamorig:LeftUpLeg')-_point(arm,'mixamorig:RightUpLeg');x.z=0;x.normalize();z=Vector((0,0,1))
 return Matrix((x,z.cross(x),z)).transposed().to_quaternion()
def _palm_frame(arm,side):
 prefix='mixamorig:'+side+'Hand';w=_point(arm,prefix);y=(_point(arm,prefix+'Middle1')-w).normalized();x=_point(arm,prefix+'Index1')-_point(arm,prefix+'Pinky1');x=(x-y*x.dot(y)).normalized();z=x.cross(y).normalized()
 return Matrix((x,y,z)).transposed().to_quaternion()
def _leg_length(arm):
 a,b,c=[_point(arm,'mixamorig:Left'+n) for n in ['UpLeg','Leg','Foot']]
 return (b-a).length+(c-b).length

def retarget_raw_actions(source_fbx_paths,target_armature):
 target=target_armature;scene=bpy.context.scene;target.animation_data_create()
 for track in target.animation_data.nla_tracks:track.mute=True
 actions={};report={}
 for clip_name,path in source_fbx_paths.items():
  before=set(bpy.data.objects);before_actions=set(bpy.data.actions)
  bpy.ops.import_scene.fbx(filepath=str(path),use_anim=True,automatic_bone_orientation=False)
  bpy.context.view_layer.update();added=set(bpy.data.objects)-before;source=next(o for o in added if o.type=='ARMATURE');source_action=source.animation_data.action
  source_fps=scene.render.fps/scene.render.fps_base;start,end=map(float,source_action.frame_range);duration=(end-start)/source_fps;count=round(duration*30)
  mapped=[b.name for b in target.data.bones if b.name.startswith('mixamorig:') and b.name in source.data.bones]
  alignment=_side_frame(target)@_side_frame(source).inverted();ratio=_leg_length(target)/_leg_length(source)
  source_rest={n:(source.matrix_world@source.data.bones[n].matrix_local).to_quaternion() for n in mapped}
  target_rest={n:(target.matrix_world@target.data.bones[n].matrix_local).to_quaternion() for n in mapped}
  calibration={n:Quaternion() for n in mapped}
  endpoint={}
  for side in ['Left','Right']:
   prefix='mixamorig:'+side
   for a,b in [('Shoulder','Arm'),('Arm','ForeArm'),('ForeArm','Hand'),('UpLeg','Leg'),('Leg','Foot')]:endpoint[prefix+a]=prefix+b
   for finger in ['Thumb','Index','Middle','Ring','Pinky']:
    for joint in [1,2,3]:endpoint[prefix+'Hand'+finger+str(joint)]=prefix+'Hand'+finger+str(joint+1)
  # Neck rest directions match anatomically; compensate the small neck axis difference only.
  endpoint['mixamorig:Neck']='mixamorig:Head'
  for n,e in endpoint.items():
   t=(_point(target,e)-_point(target,n)).normalized();s=alignment@(_point(source,e)-_point(source,n)).normalized();calibration[n]=t.rotation_difference(s)
  for side in ['Left','Right']:
   calibration['mixamorig:'+side+'Hand']=alignment@_palm_frame(source,side)@_palm_frame(target,side).inverted()
  local_rest={n:(target.data.bones[n].parent.matrix_local.inverted()@target.data.bones[n].matrix_local).to_quaternion() if target.data.bones[n].parent else target.data.bones[n].matrix_local.to_quaternion() for n in mapped}
  hips=target.pose.bones['mixamorig:Hips'];root_inverse=(target.matrix_world.to_3x3()@hips.bone.matrix_local.to_3x3()).inverted()
  source.animation_data.action=source_action;scene.frame_set(math.floor(start),subframe=start%1);bpy.context.view_layer.update();first=_point(source,'mixamorig:Hips',True)
  scene.frame_set(math.floor(end),subframe=end%1);bpy.context.view_layer.update();last=_point(source,'mixamorig:Hips',True);trajectory=last-first;trajectory.z=0
  action=bpy.data.actions.new(clip_name+'_RAW');action.use_fake_user=True;target.animation_data.action=action
  for p in target.pose.bones:p.matrix_basis=Matrix.Identity(4);p.rotation_mode='QUATERNION'
  previous={};root_points=[];chest_rot=[]
  for frame in range(count+1):
   source_frame=start+frame/30*source_fps;scene.frame_set(math.floor(source_frame),subframe=source_frame%1);bpy.context.view_layer.update();desired={}
   for n in mapped:
    source_pose=(source.matrix_world@source.pose.bones[n].matrix).to_quaternion();delta_world=alignment@(source_pose@source_rest[n].inverted())@alignment.inverted();desired[n]=delta_world@calibration[n]@target_rest[n]
    pb=target.pose.bones[n];parent=desired[pb.parent.name] if pb.parent else target.matrix_world.to_quaternion();q=(local_rest[n].inverted()@parent.inverted()@desired[n]).normalized()
    if 'Hand' in n and n.endswith('4'):q=Quaternion()
    if n in previous and q.dot(previous[n])<0:q.negate()
    previous[n]=q.copy();pb.rotation_quaternion=q;pb.location=Vector((0,0,0));pb.scale=Vector((1,1,1));pb.keyframe_insert('rotation_quaternion',frame=frame,group=n)
   source_position=_point(source,'mixamorig:Hips',True);world_translation=alignment@((source_position-first)-trajectory*(frame/count))*ratio;hips.location=root_inverse@world_translation;hips.keyframe_insert('location',frame=frame,group=hips.name);root_points.append(list(world_translation));chest_rot.append(tuple((desired['mixamorig:Spine2']@target_rest['mixamorig:Spine2'].inverted()).to_euler('XYZ')))
  for fc in action.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
  action['motion_source']='user uploaded '+str(path).split('/')[-1];action['source_fps']=source_fps;action['source_duration_seconds']=duration;action['retarget_fps']=30;action['root_motion_policy']='Remove linear horizontal travel, retain original pelvis lateral/fore-aft sway and vertical motion'
  report[clip_name]={'source_path':str(path),'source_fps':source_fps,'source_frame_range':[start,end],'duration_seconds':duration,'target_fps':30,'baked_samples':count+1,'mapped_body_bones':len(mapped),'translation_leg_ratio':ratio,'removed_horizontal_travel_source_m':list(trajectory),'pelvis_translation_range_m':[[min(p[a] for p in root_points),max(p[a] for p in root_points)] for a in range(3)],'chest_world_rotation_range_deg':[math.degrees(max(p[a] for p in chest_rot)-min(p[a] for p in chest_rot)) for a in range(3)],'body_motion_preserved':'Original source hips rotation, spine, clavicle, arms and hand motion baked without rigid body stabilization.'}
  print('RAW_RETARGET',clip_name,report[clip_name],flush=True)
  actions[clip_name]=action
  for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
  for a in set(bpy.data.actions)-before_actions:
   if a!=action:bpy.data.actions.remove(a)
 scene.render.fps=30;scene.render.fps_base=1;scene.frame_start=0;scene.frame_end=max(round(a.frame_range[1]) for a in actions.values());target.animation_data.action=next(iter(actions.values()));scene.frame_set(0);bpy.context.view_layer.update();retarget_raw_actions.last_report=report
 return actions
