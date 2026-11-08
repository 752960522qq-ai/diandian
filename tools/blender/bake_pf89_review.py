"""Bake evaluated PF89 runtime poses to an editable Blender character scene.

blender -b --python tools/blender/bake_pf89_review.py -- poses.json.gz output.blend
Includes paired character/weapon actions; all original meshes remain intact.
"""
import gzip
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

source, target = map(Path, sys.argv[sys.argv.index('--') + 1:])
data = json.loads(gzip.decompress(source.read_bytes()))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = data['fps']
bpy.ops.import_scene.gltf(filepath=data['model'])
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
arm.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
arm.animation_data_create()
convert = Matrix.Rotation(math.pi / 2, 4, 'X')
inverse = convert.inverted()
arm_world = arm.matrix_world.copy()
arm_inverse = arm_world.inverted()
rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
rest_inverse = {n: m.inverted() for n, m in rest.items()}
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=data['weapon'])
added = set(scene.objects) - before
weapon = bpy.data.objects.new('PF89_AnimatedMount', None)
scene.collection.objects.link(weapon)
weapon.rotation_mode = 'QUATERNION'
weapon.animation_data_create()
for ob in added:
    if ob.parent not in added:
        matrix = ob.matrix_world.copy()
        ob.parent = weapon
        ob.matrix_parent_inverse = Matrix.Identity(4)
        ob.matrix_basis = matrix


def matrix(values):
    return Matrix([values[i:i + 4] for i in range(0, 16, 4)]).transposed()


def stash(obj, action, name):
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    track.mute = True


pairs = []
for clip in data['clips']:
    action = bpy.data.actions.new(clip['name'])
    gun_action = bpy.data.actions.new(clip['name'] + '_Weapon')
    action.use_fake_user = gun_action.use_fake_user = True
    arm.animation_data.action = action
    weapon.animation_data.action = gun_action
    previous = {}
    for sample in clip['frames']:
        desired = {n: arm_inverse @ convert @ matrix(v) @ inverse @ arm_world @ rest[n]
                   for n, v in sample['deforms'].items() if n in rest}
        for name, pose in desired.items():
            bone = arm.pose.bones[name]
            parent = bone.parent
            # Solve basis directly; using PoseBone.matrix repeatedly without a
            # dependency-graph update would compound parent scale down the rig.
            basis = rest_inverse[name] @ pose
            if parent:
                basis = rest_inverse[name] @ rest[parent.name] @ desired.get(parent.name, rest[parent.name]).inverted() @ pose
            location, rotation, scale = basis.decompose()
            if name in previous and rotation.dot(previous[name]) < 0:
                rotation.negate()
            previous[name] = rotation.copy()
            bone.rotation_mode = 'QUATERNION'
            bone.location, bone.rotation_quaternion, bone.scale = location, rotation, scale
            for prop in ('location', 'rotation_quaternion', 'scale'):
                bone.keyframe_insert(prop, frame=sample['frame'], group=name)
        weapon.matrix_basis = convert @ matrix(sample['weapon']) @ inverse
        if not sample['visible']:
            weapon.scale = (0, 0, 0)
        for prop in ('location', 'rotation_quaternion', 'scale'):
            weapon.keyframe_insert(prop, frame=sample['frame'])
    for ac in (action, gun_action):
        for curve in ac.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'LINEAR'
    # Visibility is an event, not a shrinking animation.
    for curve in gun_action.fcurves:
        if curve.data_path == 'scale':
            for point in curve.keyframe_points:
                point.interpolation = 'CONSTANT'
    stash(arm, action, clip['name'])
    stash(weapon, gun_action, clip['name'])
    pairs.append((action, gun_action, clip['duration']))
    print('BAKED', data['character'], clip['name'], len(clip['frames']), flush=True)
arm.animation_data.action = weapon.animation_data.action = None
body_sequence = arm.animation_data.nla_tracks.new()
gun_sequence = weapon.animation_data.nla_tracks.new()
body_sequence.name = gun_sequence.name = 'PF89_ReviewSequence'
cursor = 1
for action, gun_action, duration in pairs:
    scene.timeline_markers.new(action.name, frame=cursor)
    for track, ac in ((body_sequence, action), (gun_sequence, gun_action)):
        strip = track.strips.new(ac.name, cursor, ac)
        strip.extrapolation = 'NOTHING'
    cursor += math.ceil(duration * data['fps']) + 12
scene.frame_start, scene.frame_end = 1, cursor - 12
scene.frame_set(1)
bpy.context.view_layer.update()
note = bpy.data.texts.new('PF89_README')
note.write('PF89 900 mm / local review only\n'
           '17 baked actions at 60 fps. Meshes, materials and source rig retained.\n'
           'Character action Rocket* pairs with the mount action Rocket*_Weapon.\n'
           'The default timeline previews all 17 pairs consecutively; named markers locate each action.\n'
           'For individual editing, mute PF89_ReviewSequence and select the matching actions or unmute their tracks.\n'
           'Muted NLA tracks store every individual pair.\n'
           'The web runtime remains the source for continuous IK; this file is an editable bake.\n'
           '14 visible categories; three RaiseInfinite variants retained for editing.\n'
           'R40 restores source Leon high carry hand orientation in idle/walk/run.\n')
scene['PF89_length_mm'] = 900
scene['PF89_revision'] = data.get('revision', 38)
scene['local_only'] = True
scene['animation_pairs'] = json.dumps([{'character': a.name, 'weapon': w.name} for a, w, _ in pairs])
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_distance = 3.2
            area.spaces.active.region_3d.view_location = Vector((0, 0, 1))
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(target.resolve()), compress=True)
