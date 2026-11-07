"""Author shoulder-relative PF89 raise paths from calibrated hold poses.

Run Blender with -- references.json paths.json guides.blend.
References use Three/glTF Y-up; the saved guide scene uses Blender Z-up.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

source, target, blend = map(Path, sys.argv[sys.argv.index('--') + 1:])
references = json.loads(source.read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 60
scene.unit_settings.system = 'METRIC'
convert = Matrix.Rotation(math.pi / 2, 4, 'X')
out = {}
for character, poses in references.items():
    out[character] = {}
    for aim in ('level', 'up', 'down'):
        start, end = poses['carry'], poses[aim]
        p0, p1 = Vector(start['position']), Vector(end['position'])
        q0 = Quaternion((start['quaternion'][3], *start['quaternion'][:3]))
        q1 = Quaternion((end['quaternion'][3], *end['quaternion'][:3]))
        guide = bpy.data.objects.new(character + '_raise_' + aim, None)
        scene.collection.objects.link(guide)
        guide.empty_display_type = 'ARROWS'
        guide.empty_display_size = .15
        guide.rotation_mode = 'QUATERNION'
        samples = []
        for frame in range(61):
            u = frame / 60
            weight = u * u * (3 - 2 * u)
            p = p0.lerp(p1, weight)
            q = q0.slerp(q1, weight)
            samples.append({'t': u, 'position': list(p),
                            'quaternion': [q.x, q.y, q.z, q.w]})
            guide.matrix_world = convert @ Matrix.LocRotScale(p, q, Vector((1, 1, 1)))
            guide.keyframe_insert('location', frame=frame + 1)
            guide.keyframe_insert('rotation_quaternion', frame=frame + 1)
        out[character][aim] = samples
        guide['reference_frame'] = 'Spine2; metre offsets; source glTF axes'
        for curve in guide.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'LINEAR'
target.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(out, indent=2) + '\n')
scene.frame_start, scene.frame_end = 1, 61
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()), compress=True)
