"""Keep the added waist bridge inside the jacket during arm motion.

Usage: python fix_waist_bridge_upper_overlap.py SOURCE.glb OUTPUT.glb REPORT.json

Input is the r22 character. This adjusts only the covered upper half of the
Fix18 bridge. Its original 6.5 cm native extension reached the underarm; its
Spine-only cap protruded when the arm-weighted jacket folded inward. Retain the
closed bridge but shorten its upper overlap to 2.0 cm and taper its tip 25%.
Original body/clothing, the exact waist seam and r22 lower repair are unchanged.
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
UPPER_OVERLAP = 0.020
UPPER_TAPER = 0.25


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
        raise ValueError('Expected exactly one Fix18 waist bridge')
    mesh_index, primitive_index, primitive = matches[0]
    if 'Fix23' in primitive.get('extras', {}):
        raise ValueError('Input already repaired; use the preserved r22 source')
    original_positions = accessor(primitive['attributes']['POSITION'])
    indices = accessor(primitive['indices'])
    n = (len(original_positions) - 2) // 9
    if n != 34 or len(original_positions) != 308 or len(indices) != 448 * 3:
        raise ValueError('Expected the r22 308-vertex, 448-triangle bridge')
    positions = original_positions.copy()
    seam = positions[4 * n:5 * n].copy()
    center = seam.mean(axis=0)
    old_upper_offsets = original_positions[8 * n:9 * n, 1] - seam[:, 1]
    if not np.allclose(old_upper_offsets, 0.065, atol=1e-6):
        raise ValueError('Unexpected source upper overlap')
    for layer in range(5, 9):
        fraction = (layer - 4) / 4
        positions[layer * n:(layer + 1) * n] = seam
        positions[layer * n:(layer + 1) * n, 1] += UPPER_OVERLAP * fraction
        for axis in (0, 2):
            positions[layer * n:(layer + 1) * n, axis] = (
                center[axis] + (seam[:, axis] - center[axis]) * (1 - UPPER_TAPER * fraction)
            )
    # Move the existing closed cap with the narrowed upper ring; no new hole.
    positions[9 * n] = positions[8 * n:9 * n].mean(axis=0)
    blob.extend(b'\0' * (-len(blob) % 4))
    offset = len(blob)
    blob.extend(positions.astype('<f4').tobytes())
    view_index = len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset,
                              'byteLength': positions.nbytes, 'target': 34962})
    accessor_index = len(doc['accessors'])
    doc['accessors'].append({'bufferView': view_index, 'componentType': 5126,
                             'count': len(positions), 'type': 'VEC3',
                             'min': positions.min(axis=0).tolist(),
                             'max': positions.max(axis=0).tolist()})
    primitive['attributes']['POSITION'] = accessor_index
    primitive.setdefault('extras', {})['Fix23'] = (
        'Constrain only the added bridge upper overlap to 0.020 native m and '
        '25% inner taper. Original body/clothing, waist seam, lower repair, '
        'weights and closed bridge topology are unchanged.'
    )
    doc['buffers'][0]['byteLength'] = len(blob)
    blob.extend(b'\0' * (-len(blob) % 4))
    encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    encoded += b' ' * (-len(encoded) % 4)
    result = (struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(blob))
              + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
              + struct.pack('<II', len(blob), binary_type) + blob)
    # Verify that only the new bridge POSITION accessor and metadata changed.
    meshes = copy.deepcopy(doc['meshes'])
    meshes[mesh_index]['primitives'][primitive_index] = original_doc['meshes'][mesh_index]['primitives'][primitive_index]
    original_attributes = original_doc['meshes'][mesh_index]['primitives'][primitive_index]['attributes']
    arrays_preserved = {
        key: doc[key][:len(original_doc[key])] == original_doc[key]
        for key in ['nodes', 'skins', 'animations', 'accessors', 'bufferViews',
                    'materials', 'images', 'textures', 'samplers'] if key in original_doc
    }
    invariants = {
        'original_binary_prefix_preserved': bytes(blob[:len(original)]) == original,
        'original_body_and_clothing_primitives_preserved': meshes == original_doc['meshes'],
        'bridge_indices_and_topology_preserved': primitive['indices'] == original_doc['meshes'][mesh_index]['primitives'][primitive_index]['indices'],
        'bridge_all_nonposition_attributes_preserved': all(
            primitive['attributes'][key] == value for key, value in original_attributes.items() if key != 'POSITION'),
        'exact_original_waist_seam_preserved': np.array_equal(positions[4 * n:5 * n], original_positions[4 * n:5 * n]),
        'lower_bridge_and_bottom_cap_preserved': np.array_equal(positions[:5 * n], original_positions[:5 * n]) and np.array_equal(positions[-1], original_positions[-1]),
        'original_json_arrays_preserved': arrays_preserved,
    }
    if not all(value for key, value in invariants.items() if key != 'original_json_arrays_preserved') or not all(arrays_preserved.values()):
        raise AssertionError('Preservation invariant failed')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)
    summary = {
        'source': str(source), 'output': str(output),
        'source_sha256': hashlib.sha256(raw).hexdigest(),
        'output_sha256': hashlib.sha256(result).hexdigest(),
        'bridge_vertices': len(positions), 'bridge_triangles': len(indices) // 3,
        'changed_added_bridge_vertices': int(np.any(positions != original_positions, axis=1).sum()),
        'original_waist_seam_vertices_preserved': n,
        'old_upper_overlap_native_m': 0.065, 'new_upper_overlap_native_m': UPPER_OVERLAP,
        'old_upper_tip_radial_factor': 0.90, 'new_upper_tip_radial_factor': 1 - UPPER_TAPER,
        'invariants': invariants,
        'method': 'Constrain only the covered upper half of the added bridge inside the jacket; retain the cap and all original mesh geometry, skin weights, materials, bones and animations.',
    }
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary))


if __name__ == '__main__':
    repair(*sys.argv[1:4])
