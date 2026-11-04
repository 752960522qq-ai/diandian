"""Cull only the covered front/lower portion of the Fix18 waist bridge.

Usage: python tools/gltf/fix_waist_clothing_overlap.py SOURCE.glb OUTPUT.glb REPORT.json

Fix18's bridge extended 6.5 native cm below the original open waist ring.
Its front Hips-weighted extension rendered over the trousers during a lifted-leg
RifleRun pose. Original body/clothing geometry does not have this defect. This
repair removes redundant covered triangles from that added extension; it retains
the original exposed waist contour, the upper bridge and the rear closure.
All original BIN bytes and existing vertex attributes remain byte-for-byte intact.
"""
import copy
import hashlib
import json
import struct
import sys
from pathlib import Path

import numpy as np

DTYPES = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}
COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def repair(source, output, report):
    source, output, report = map(Path, (source, output, report))
    raw = source.read_bytes()
    json_length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_length])
    original_doc = copy.deepcopy(doc)
    binary_length, binary_type = struct.unpack_from('<II', raw, 20 + json_length)
    original = raw[28 + json_length:28 + json_length + binary_length]
    blob = bytearray(original)

    def accessor(index):
        value = doc['accessors'][index]
        view = doc['bufferViews'][value['bufferView']]
        dtype = np.dtype(DTYPES[value['componentType']])
        count = COMPONENTS[value['type']]
        return np.ndarray(
            (value['count'], count), dtype=dtype, buffer=original,
            offset=view.get('byteOffset', 0) + value.get('byteOffset', 0),
            strides=(view.get('byteStride', dtype.itemsize * count), dtype.itemsize),
        ).copy()

    material = next(i for i, m in enumerate(doc['materials'])
                    if m.get('name') == 'Anatomical_Waist_Continuous_Surface')
    matches = [(mi, pi, p) for mi, mesh in enumerate(doc['meshes'])
               for pi, p in enumerate(mesh['primitives']) if p.get('material') == material]
    if len(matches) != 1:
        raise ValueError('Expected exactly one Fix18 waist bridge primitive')
    mesh_index, primitive_index, primitive = matches[0]
    if 'Fix22' in primitive.get('extras', {}):
        raise ValueError('Input is already repaired; use the preserved Fix18 source')
    positions = accessor(primitive['attributes']['POSITION'])
    triangles = accessor(primitive['indices']).reshape(-1, 3)
    n = (len(positions) - 2) // 9
    if n != 34 or len(positions) != 9 * n + 2 or len(triangles) != 612:
        raise ValueError('Unexpected bridge topology; this repair is specific to Fix18')
    seam = positions[4 * n:5 * n]
    center = seam.mean(axis=0)
    # Character front is positive native Z. This was confirmed with screen rays
    # against the actual protruding triangles, rather than inferred from a view.
    front_cut_z = float(center[2] - 0.010)
    remove = np.array([
        ((np.max(t) < 5 * n or 9 * n + 1 in t)
         and np.mean(positions[t, 1]) < center[1]
         and np.mean(positions[t, 2]) > front_cut_z)
        for t in triangles
    ], dtype=bool)
    retained = triangles[~remove]
    if int(remove.sum()) != 164:
        raise ValueError(f'Unexpected covered-triangle count: {remove.sum()}')
    dtype = np.dtype(DTYPES[doc['accessors'][primitive['indices']]['componentType']])
    indices = retained.astype(dtype).reshape(-1, 1)
    blob.extend(b'\0' * (-len(blob) % 4))
    offset = len(blob)
    blob.extend(indices.tobytes())
    view_index = len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset,
                              'byteLength': indices.nbytes, 'target': 34963})
    accessor_index = len(doc['accessors'])
    doc['accessors'].append({'bufferView': view_index,
                             'componentType': doc['accessors'][primitive['indices']]['componentType'],
                             'count': len(indices), 'type': 'SCALAR'})
    primitive['indices'] = accessor_index
    primitive.setdefault('extras', {})['Fix22'] = (
        'Removed covered front/lower Fix18 bridge triangles; retained original '
        'waist seam, upper bridge and rear closure. No original body/clothing faces changed.'
    )
    doc['buffers'][0]['byteLength'] = len(blob)
    blob.extend(b'\0' * (-len(blob) % 4))
    encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    encoded += b' ' * (-len(encoded) % 4)
    result = (struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(blob))
              + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
              + struct.pack('<II', len(blob), binary_type) + blob)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)
    all_meshes = copy.deepcopy(doc['meshes'])
    all_meshes[mesh_index]['primitives'][primitive_index] = original_doc['meshes'][mesh_index]['primitives'][primitive_index]
    unchanged_arrays = {
        key: doc[key][:len(original_doc[key])] == original_doc[key]
        for key in ['nodes', 'skins', 'animations', 'accessors', 'bufferViews',
                    'materials', 'images', 'textures', 'samplers'] if key in original_doc
    }
    upper = np.array([np.min(t) >= 4 * n and 9 * n + 1 not in t for t in triangles])
    rear = np.array([np.mean(positions[t, 2]) <= front_cut_z for t in triangles])
    invariants = {
        'old_binary_prefix_preserved': bytes(blob[:len(original)]) == original,
        'all_original_mesh_primitives_preserved': all_meshes == original_doc['meshes'],
        'bridge_vertex_attributes_preserved': primitive['attributes'] == original_doc['meshes'][mesh_index]['primitives'][primitive_index]['attributes'],
        'original_seam_positions_weights_and_triangles_above_seam_preserved': not bool(np.any(remove & upper)),
        'rear_bridge_triangles_preserved': not bool(np.any(remove & rear)),
        'original_json_arrays_preserved': unchanged_arrays,
    }
    if not all(v for k, v in invariants.items() if k != 'original_json_arrays_preserved') or not all(unchanged_arrays.values()):
        raise AssertionError('Preservation invariant failed')
    summary = {
        'source': str(source), 'output': str(output),
        'source_sha256': hashlib.sha256(raw).hexdigest(),
        'output_sha256': hashlib.sha256(result).hexdigest(),
        'removed_bridge_triangles': int(remove.sum()),
        'retained_bridge_triangles': len(retained),
        'bridge_vertices_unchanged': len(positions),
        'original_waist_seam_vertices_unchanged': n,
        'front_cut_native_z': front_cut_z,
        'invariants': invariants,
        'method': 'Cull covered front/lower triangles of the appended Fix18 bridge only; no original body/clothing faces, positions, weights, materials, textures, bones or animations modified.',
    }
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary))


if __name__ == '__main__':
    repair(*sys.argv[1:4])
