"""Compare saved Blender joints to independent Three.js world-space anchors.

blender -b file.blend --python tools/blender/validate_pf89_bake.py -- poses.json.gz report.json
"""
import gzip
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

source, report = map(Path, sys.argv[sys.argv.index('--') + 1:])
data = json.loads(gzip.decompress(source.read_bytes()))
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
weapon = bpy.data.objects['PF89_AnimatedMount']
convert = Matrix.Rotation(math.pi / 2, 4, 'X')
for obj in (arm, weapon):
    for track in obj.animation_data.nla_tracks:
        track.mute = True
rows = []
for clip in data['clips']:
    arm.animation_data.action = bpy.data.actions[clip['name']]
    weapon.animation_data.action = bpy.data.actions[clip['name'] + '_Weapon']
    frames = clip['frames']
    for sample in frames:
        frame = sample['frame']
        bpy.context.scene.frame_set(int(frame), subframe=frame - int(frame))
        bpy.context.view_layer.update()
        errors = {name: (arm.matrix_world @ arm.pose.bones[name].head - convert @ Vector(expected)).length
                  for name, expected in sample['anchors'].items()}
        assert max(errors.values()) < .001, (clip['name'], frame, errors)
        rows.append({'action': clip['name'], 'frame': frame, 'max_joint_error_m': max(errors.values())})
result = {'blender': bpy.app.version_string, 'character': data['character'],
          'actions': len(data['clips']), 'frames_checked': len(rows), 'sampling': 'every exported 60 Hz sample, all actions',
          'max_joint_error_m': max(r['max_joint_error_m'] for r in rows), 'samples': rows}
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'samples'}))
