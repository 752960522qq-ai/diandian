"""Resize the normalized PF89 to 900 mm in Blender and export a metre GLB.

blender -b --python tools/blender/resize_pf89.py -- input.glb output.glb output.blend report.json
The input must have muzzle -Z and up +Y in glTF (forward +Y in Blender).
"""
import json
import sys
from pathlib import Path

import bpy


def bounds():
    points = [o.matrix_world @ v.co for o in bpy.context.scene.objects
              if o.type == 'MESH' for v in o.data.vertices]
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    return {'min': low, 'max': high,
            'dimensions_m': [high[i] - low[i] for i in range(3)]}


source, target, blend, report = map(Path, sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'MILLIMETERS'
before = bounds()
factor = .9 / before['dimensions_m'][1]
# Scale the entire hierarchy around the existing origin, including grip/optic.
for ob in scene.objects:
    if ob.parent is None:
        ob.location *= factor
        ob.scale *= factor
bpy.context.view_layer.update()
after = bounds()
assert abs(after['dimensions_m'][1] - .9) < 1e-6
scene['PF89_length_mm'] = 900
scene['PF89_source'] = source.name
for p in (target, blend, report):
    p.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
bpy.ops.export_scene.gltf(filepath=str(target.resolve()), export_format='GLB',
                          export_animations=False, export_extras=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(target.resolve()))
reimport = bounds()
assert abs(reimport['dimensions_m'][1] - .9) < 1e-6
report.write_text(json.dumps({'blender_version': bpy.app.version_string,
    'length_mm': 900, 'uniform_scale': factor, 'before_blender_xyz': before,
    'after_blender_xyz': after, 'reimport_blender_xyz': reimport,
    'gltf_forward': '-Z', 'gltf_up': '+Y'}, indent=2) + '\n')
