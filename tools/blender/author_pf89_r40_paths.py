"""Author PF89 R40 raise/draw guides in Blender, using the calibrated chest frame.

blender -b --python tools/blender/author_pf89_r39_paths.py -- references.json paths.json guides.blend
The draw uses an outside-shoulder extraction arc, with shortest-path quaternion
interpolation. Coordinates in JSON remain glTF Y-up; the Blender scene is Z-up.
"""
import json, math, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector

source, target, blend = map(Path, sys.argv[sys.argv.index('--') + 1:])
refs = json.loads(source.read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 60
convert = Matrix.Rotation(math.pi / 2, 4, 'X')
result = {}
for cid, ref in refs.items():
    paths = result[cid] = {}
    p0 = Vector(ref['carry']['position'])
    q0 = Quaternion((ref['carry']['quaternion'][3], *ref['carry']['quaternion'][:3]))
    right, up, front = (Vector(ref['axes'][axis]) for axis in ('right', 'up', 'front'))
    for name in ('level', 'up', 'down', 'draw'):
        guide = bpy.data.objects.new(cid + '_' + name, None)
        scene.collection.objects.link(guide)
        guide.empty_display_type = 'ARROWS'
        guide.empty_display_size = .1
        guide.rotation_mode = 'QUATERNION'
        if name == 'draw':
            start = p0 + right * .12 + up * .15 - front * .32
            control = p0 + right * .18 + up * .20 - front * .06
            end = p0
            first = Quaternion(front, math.radians(15)) @ q0
            last = q0
        else:
            start, end = p0, Vector(ref[name]['position'])
            control = (start + end) * .5
            first = q0
            last = Quaternion((ref[name]['quaternion'][3], *ref[name]['quaternion'][:3]))
        samples = paths[name] = []
        for frame in range(61):
            t = frame / 60
            u = t * t * (3 - 2 * t)
            p = start * (1-u)**2 + control * (2*u*(1-u)) + end * u*u
            if name != 'draw':
                p += right * (.075 * math.sin(math.pi*t))
            q = first.slerp(last, u)
            samples.append({'t': t, 'position': list(p), 'quaternion': [q.x, q.y, q.z, q.w]})
            guide.matrix_world = convert @ Matrix.LocRotScale(p, q, Vector((1,1,1)))
            guide.keyframe_insert('location', frame=frame+1)
            guide.keyframe_insert('rotation_quaternion', frame=frame+1)
        for curve in guide.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'LINEAR'
        guide['reference_frame'] = 'Spine2; metres; glTF coordinates in JSON'
target.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, indent=2) + '\n')
scene.frame_start, scene.frame_end = 1, 61
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()), compress=True)
