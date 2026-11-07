"""Normalize the supplied PF89 GLB axes; keep geometry and embedded textures.

Usage: python tools/gltf/normalize_pf89.py original.glb output.glb
"""
import json
import math
import struct
import sys
from pathlib import Path

source, target = map(Path, sys.argv[1:3])
data = source.read_bytes()
assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 4)[0] == 2
size = struct.unpack_from('<I', data, 12)[0]
document = json.loads(data[20:20 + size])
scene = document['scenes'][document.get('scene', 0)]
node = {'name': 'PF89_WeaponAxes', 'children': scene['nodes'],
        'rotation': [0, -math.sqrt(.5), 0, math.sqrt(.5)],
        'translation': [-.0035, -.24055, 0],
        'extras': {'forward': '-Z', 'up': '+Y',
                   'original_geometry_and_materials_preserved': True}}
scene['nodes'] = [len(document['nodes'])]
document['nodes'].append(node)
payload = json.dumps(document, separators=(',', ':')).encode()
payload += b' ' * (-len(payload) % 4)
tail = data[20 + size:]
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(struct.pack('<4sII', b'glTF', 2, 20 + len(payload) + len(tail))
                   + struct.pack('<I4s', len(payload), b'JSON') + payload + tail)
