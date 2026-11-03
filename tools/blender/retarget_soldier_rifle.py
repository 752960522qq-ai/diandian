"""Bake Human Soldier female Rifle clips onto the existing character skeletons.

Blender 4.3: blender -b -t 2 --python tools/blender/retarget_soldier_rifle.py --
  --source-dir /path/to/extracted/fbx --output-dir assets/animations/hanyang_rifle
Only skeletons and three animation tracks are exported; canonical models are untouched.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
CLIPS = {
    'HanyangAim': 'HumanF@Rifle_Aim01.fbx',
    'HanyangFire': 'HumanF@Rifle_Aim01_Shoot01.fbx',
    'HanyangReload': 'HumanF@Rifle_Reload01.fbx',
}
TARGETS = {
    'diandian': ROOT/'assets/characters/diandian_classic/diandian_classic_fixed.glb',
    'zhigeng': ROOT/'assets/characters/zhigeng/zhigeng_character_animated.glb',
}


def point(arm, name, posed=False, tail=False):
    bone = arm.pose.bones[name] if posed else arm.data.bones[name]
    value = bone.tail if posed and tail else bone.head if posed else bone.tail_local if tail else bone.head_local
    return arm.matrix_world @ value


def anatomical_frame(arm, left, right, hips, head):
    x = (point(arm, left)-point(arm, right)).normalized()
    z = point(arm, head)-point(arm, hips)
    z = (z-x*z.dot(x)).normalized()
    y = z.cross(x).normalized()
    return Matrix((x, y, z)).transposed().to_quaternion()


def palm_frame(arm, hand, index, middle, pinky):
    y = (point(arm, middle)-point(arm, hand)).normalized()
    x = point(arm, index)-point(arm, pinky)
    x = (x-y*x.dot(y)).normalized()
    return Matrix((x, y, x.cross(y).normalized())).transposed().to_quaternion()


def leg_length(arm, names):
    a, b, c = [point(arm, name) for name in names]
    return (b-a).length+(c-b).length


def bone_mapping():
    mapped = {'Hips': 'B-hips', 'Spine': 'B-spine', 'Spine1': 'B-spine', 'Spine2': 'B-chest', 'Neck': 'B-neck', 'Head': 'B-head'}
    endpoints = {'Spine': ('Spine1', 'B-chest'), 'Spine1': ('Spine2', 'B-chest'), 'Spine2': ('Neck', 'B-neck'), 'Neck': ('Head', 'B-head')}
    fingers = {'Thumb': 'thumb', 'Index': 'indexFinger', 'Middle': 'middleFinger', 'Ring': 'ringFinger', 'Pinky': 'pinky'}
    for side, suffix in [('Left', 'L'), ('Right', 'R')]:
        for target, source in [('Shoulder', 'shoulder'), ('Arm', 'upperArm'), ('ForeArm', 'forearm'), ('Hand', 'hand'), ('UpLeg', 'thigh'), ('Leg', 'shin'), ('Foot', 'foot'), ('ToeBase', 'toe')]:
            mapped[side+target] = 'B-'+source+'.'+suffix
        for a, b in [('Shoulder','Arm'),('Arm','ForeArm'),('ForeArm','Hand'),('UpLeg','Leg'),('Leg','Foot'),('Foot','ToeBase')]:
            endpoints[side+a] = (side+b, mapped[side+b])
        for finger, source in fingers.items():
            for joint in [1, 2, 3]:
                n = side+'Hand'+finger+str(joint)
                mapped[n] = f'B-{source}{joint:02d}.{suffix}'
                endpoints[n] = (side+'Hand'+finger+str(joint+1), f'B-{source}{joint+1:02d}.{suffix}' if joint < 3 else None)
    return {'mixamorig:'+n:s for n,s in mapped.items()}, {'mixamorig:'+n:('mixamorig:'+t,s) for n,(t,s) in endpoints.items()}


def read_support_finger_pose(path):
    before, before_actions = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, automatic_bone_orientation=False)
    added = set(bpy.data.objects)-before
    armature = next(obj for obj in added if obj.type == 'ARMATURE')
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    pose = {f'B-{digit}{joint:02d}.L':armature.pose.bones[f'B-{digit}{joint:02d}.L'].rotation_quaternion.copy() for digit in ['indexFinger','middleFinger','ringFinger','pinky'] for joint in [1,2,3]}
    for obj in added:
        bpy.data.objects.remove(obj,do_unlink=True)
    for action in set(bpy.data.actions)-before_actions:
        bpy.data.actions.remove(action)
    return pose


def set_source_frame(scene, source, frame, root_rotation, root_scale):
    scene.frame_set(math.floor(frame),subframe=frame%1)
    root = source.pose.bones['B-root']
    # FBX B-root keys repeat a static 100x / -90 degree export conversion.
    # Remove that conversion before comparing animated and rest bone frames.
    root.rotation_quaternion = root_rotation.inverted()@root.rotation_quaternion
    root.scale = Vector([root.scale[i]/root_scale[i] for i in range(3)])
    bpy.context.view_layer.update()


def bake_clip(target, name, path, support_fingers):
    scene = bpy.context.scene
    before = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, automatic_bone_orientation=False)
    added = set(bpy.data.objects)-before
    source = next(o for o in added if o.type == 'ARMATURE')
    source_action = source.animation_data.action
    source_fps = scene.render.fps/scene.render.fps_base
    start, end = map(float, source_action.frame_range)
    duration = (end-start)/source_fps
    count = round(duration*30)
    scene.frame_set(math.floor(start),subframe=start%1)
    bpy.context.view_layer.update()
    root = source.pose.bones['B-root']
    root_rotation, root_scale = root.rotation_quaternion.copy(), root.scale.copy()
    mapping, endpoints = bone_mapping()
    names = sorted(mapping, key=lambda n: len(target.data.bones[n].parent_recursive))
    alignment = anatomical_frame(target, 'mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg', 'mixamorig:Hips', 'mixamorig:Head') @ anatomical_frame(source, 'B-thigh.L', 'B-thigh.R', 'B-hips', 'B-head').inverted()
    ratio = leg_length(target, ['mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot'])/leg_length(source,['B-thigh.L','B-shin.L','B-foot.L'])
    source_rest = {n:(source.matrix_world@b.matrix_local).to_quaternion() for n,b in source.data.bones.items()}
    target_rest = {n:(target.matrix_world@target.data.bones[n].matrix_local).to_quaternion() for n in names}
    local_rest = {n:(target.data.bones[n].parent.matrix_local.inverted()@target.data.bones[n].matrix_local).to_quaternion() if target.data.bones[n].parent else target.data.bones[n].matrix_local.to_quaternion() for n in names}
    calibration = {n:Quaternion() for n in names}
    for n,(target_end, source_end) in endpoints.items():
        td = (point(target,target_end)-point(target,n)).normalized()
        sd = (point(source,source_end)-point(source,mapping[n])).normalized() if source_end else (point(source,mapping[n],tail=True)-point(source,mapping[n])).normalized()
        if n == 'mixamorig:Spine1':
            sd = (sd+(point(source,'B-neck')-point(source,'B-chest')).normalized()).normalized()
        calibration[n] = td.rotation_difference(alignment@sd)
    for side,suffix in [('Left','L'),('Right','R')]:
        tp = 'mixamorig:'+side+'Hand'
        calibration[tp] = alignment@palm_frame(source,f'B-hand.{suffix}',f'B-indexFinger01.{suffix}',f'B-middleFinger01.{suffix}',f'B-pinky01.{suffix}')@palm_frame(target,tp,tp+'Index1',tp+'Middle1',tp+'Pinky1').inverted()
    hips = target.pose.bones['mixamorig:Hips']
    root_inverse = (target.matrix_world.to_3x3()@hips.bone.matrix_local.to_3x3()).inverted()
    set_source_frame(scene,source,start,root_rotation,root_scale)
    first = point(source,'B-hips',True)
    set_source_frame(scene,source,end,root_rotation,root_scale)
    travel = alignment@(point(source,'B-hips',True)-first)
    travel.z = 0
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    target.animation_data.action = action
    for bone in target.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = 'QUATERNION'
    previous = {}
    translations = []
    socket_samples = []
    for frame in range(count+1):
        source_frame = start+frame/30*source_fps
        set_source_frame(scene,source,source_frame,root_rotation,root_scale)
        if name in ['HanyangAim','HanyangFire']:
            for bone, grip in support_fingers.items():
                source.pose.bones[bone].rotation_quaternion = source.pose.bones[bone].rotation_quaternion.slerp(grip,0.35)
            bpy.context.view_layer.update()
        source_pose = {n:(source.matrix_world@source.pose.bones[n].matrix).to_quaternion() for n in source_rest}
        socket_samples.append({'time':frame/30, **{label:{'position_m':list(point(source,bone,True)),'quaternion_xyzw':[*source_pose[bone][1:],source_pose[bone][0]]} for label,bone in [('right_hand','B-hand.R'),('right_socket','B-handProp.R'),('left_hand','B-hand.L'),('left_socket','B-handProp.L')]}})
        source_deltas = {n:alignment@(source_pose[n]@source_rest[n].inverted())@alignment.inverted() for n in source_rest}
        desired = {}
        for n in names:
            delta = source_deltas[mapping[n]]
            if n == 'mixamorig:Spine1':
                delta = source_deltas['B-spine'].slerp(source_deltas['B-chest'],0.5)
            desired[n] = delta@calibration[n]@target_rest[n]
            bone = target.pose.bones[n]
            parent = desired[bone.parent.name] if bone.parent else target.matrix_world.to_quaternion()
            q = (local_rest[n].inverted()@parent.inverted()@desired[n]).normalized()
            if n in previous and q.dot(previous[n]) < 0:
                q.negate()
            previous[n] = q.copy()
            bone.rotation_quaternion = q
            bone.keyframe_insert('rotation_quaternion',frame=frame,group=n)
        translation = ((alignment@(point(source,'B-hips',True)-first))-travel*frame/count)*ratio
        hips.location = root_inverse@translation
        hips.keyframe_insert('location',frame=frame,group=hips.name)
        translations.append(list(translation))
    for curve in action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    action['motion_source'] = path.name
    action['loop'] = name != 'HanyangReload'
    for obj in added:
        bpy.data.objects.remove(obj,do_unlink=True)
    for old in set(bpy.data.actions)-before_actions:
        if old != action:
            bpy.data.actions.remove(old)
    return {'source_file':path.name,'duration_seconds':duration,'fps':30,'sample_count':count+1,'mapped_bones':len(names),'leg_scale':ratio,'pelvis_translation_range':[[min(v[i] for v in translations),max(v[i] for v in translations)] for i in range(3)],'loop':name!='HanyangReload','left_support_finger_grip_blend':0.35 if name!='HanyangReload' else 0.0,'source_root_export_scale_removed':list(root_scale),'source_root_export_rotation_removed_xyzw':[*root_rotation[1:],root_rotation[0]],'body_alignment_xyzw':[*alignment[1:],alignment[0]],'source_socket_samples':socket_samples}


def retarget_character(character, source_dir, out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.render.fps_base = 1
    bpy.ops.import_scene.gltf(filepath=str(TARGETS[character]))
    target = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    target.animation_data_clear()
    target.animation_data_create()
    for old in list(bpy.data.actions):
        bpy.data.actions.remove(old)
    for obj in list(bpy.data.objects):
        if obj != target:
            bpy.data.objects.remove(obj,do_unlink=True)
    support_fingers = read_support_finger_pose(source_dir/'Human@ObjectGripHands01.fbx')
    report = {name:bake_clip(target,name,source_dir/filename,support_fingers) for name,filename in CLIPS.items()}
    scene.frame_start = 0
    scene.frame_end = max(round(a.frame_range[1]) for a in bpy.data.actions)
    target.animation_data.action = bpy.data.actions['HanyangAim']
    scene.frame_set(0)
    bpy.context.view_layer.update()
    scene.render.fps = 30
    scene.render.fps_base = 1
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    output = out_dir/(character+'_rifle.glb')
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_single_armature=True,export_skins=False,export_extras=True)
    return {'target':str(TARGETS[character].relative_to(ROOT)),'output':str(output.relative_to(ROOT)),'skeleton_bones':len(target.data.bones),'clips':report}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir',type=Path,required=True)
    parser.add_argument('--output-dir',type=Path,default=ROOT/'assets/animations/hanyang_rifle')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.output_dir.mkdir(parents=True,exist_ok=True)
    report = {name:retarget_character(name,args.source_dir,args.output_dir) for name in TARGETS}
    report['retarget_policy'] = 'World-space source rotations; anatomical frame, limb directions and palm-axis calibration; spine-to-chest rotation distributed over three target spine bones. Original face, mesh, skin and rest transforms are preserved. Finger joints 1-3 use source directions; terminal joints retain their local rest transforms. Remove linear horizontal root travel, retain pelvis sway and height.'
    work = ROOT.parent/'work/hanyang_rifle'
    work.mkdir(exist_ok=True)
    (work/'source_sockets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    for character in TARGETS:
        for clip in report[character]['clips'].values():
            clip.pop('source_socket_samples')
    (args.output_dir/'retarget_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('SOLDIER_RIFLE_EXPORTED',json.dumps({name:{'output':report[name]['output'],'durations':{clip:data['duration_seconds'] for clip,data in report[name]['clips'].items()}} for name in TARGETS}))


if __name__ == '__main__':
    main()
