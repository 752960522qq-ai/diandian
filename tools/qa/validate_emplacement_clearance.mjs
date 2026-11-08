import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { setup } from './validate_pf89.mjs';
import { handLegSource } from './measure_hand_leg_clearance.mjs';
import { installFixedGunMotions } from '../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js';

// Sample the skinned lower body against all three transformed tripod legs.
// This is a limited intersection check, not an exhaustive collision guarantee.
const report = [];
for (const character of ['diandian', 'zhigeng']) {
  const rig = await setup(character);
  installFixedGunMotions(rig.model);
  const source = handLegSource(rig.model.root);
  for (const [motion, time] of [['QJZ89Idle', 0], ['QJZ89Idle', 4.2], ['QJZ89Aim', 0], ['QJZ89Aim', 1.55]]) {
    rig.pose(motion, time, 'qjz89');
    const positions = [], indices = [];
    for (const { mesh, lower } of source) {
      const vertices = new Map();
      for (const index of lower) {
        if (!vertices.has(index)) {
          vertices.set(index, positions.length / 3);
          positions.push(...mesh.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());
        }
        indices.push(vertices.get(index));
      }
    }
    const lowerBody = new THREE.BufferGeometry();
    lowerBody.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lowerBody.setIndex(indices);
    const tree = new MeshBVH(lowerBody), intersections = {};
    for (const part of ['Base2_tripo_part_1', 'Base2_tripo_part_3', 'Base2_tripo_part_7']) {
      const leg = rig.attachment.weapons.get('qjz89').getObjectByName(part);
      const geometry = leg.geometry.clone().applyMatrix4(leg.matrixWorld);
      let count = 0;
      tree.bvhcast(new MeshBVH(geometry), new THREE.Matrix4(), {
        intersectsTriangles: (a, b) => { if (a.intersectsTriangle(b)) count++; return false; },
      });
      geometry.dispose();
      intersections[part] = count;
      assert.equal(count, 0, `${character} ${motion} ${time}s: ${part} intersects lower body`);
    }
    lowerBody.dispose();
    report.push({ character, motion, time, intersections });
  }
}
const output = new URL('../../web/motion-labs/verification_r43/clearance.json', import.meta.url);
await fs.writeFile(output, JSON.stringify({ passed: true, samples: report }, null, 2) + '\n');
console.log(`CLEARANCE_R43_PASS ${report.length} poses, three tripod legs each`);
