// Normalize the uploaded visual asset while preserving all geometry/texture bytes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as THREE from 'three';
import { decode, encode, read } from '../qa/validate_pf89.mjs';

const source = 'assets/weapons/source/qbu10_source.glb';
const output = 'assets/weapons/qbu10.glb';
// User's R44 correction: QBU-10 full length is 1150 mm.
const targetLengthM = 1.15;
const input = await read(source);
input.scene.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(input.scene);
const origin = bounds.getCenter(new THREE.Vector3());
const scale = targetLengthM / (bounds.max.x - bounds.min.x);
const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
const translation = origin.clone().multiplyScalar(-scale).applyQuaternion(rotation);
const transformPoint = p => new THREE.Vector3(...p).sub(origin).multiplyScalar(scale).applyQuaternion(rotation).toArray();
const transformDirection = p => new THREE.Vector3(...p).applyQuaternion(rotation).normalize().toArray();

// Locations identified in Blender side/top views, with palm/stock surfaces
// confirmed by ray intersection against the original GLB triangles.
const sourceAnchors = {
  right_grip: [.22, .125, .0001910868704925875],
  right_palm_surface: [.22, .125, -.012744026593410868],
  left_grip: [.013214099666346676, .19154998100959347, -.009211300347891188],
  trigger: [.17, .156, -.01],
  butt_contact: [.481877747013027, .19, 0],
  shoulder: [.481877747013027, .19, 0],
  muzzle: [bounds.min.x, .23, 0],
};
const anchors = Object.fromEntries(Object.entries(sourceAnchors).map(([name, p]) => [name, transformPoint(p)]));
const directions = {
  barrel_forward: [0, 0, -1],
  right_grip_axis: transformDirection([-.045, .095, 0]),
  right_palm_normal: [1, 0, 0],
  left_palm_normal: [0, -1, 0],
};
const { g, bin } = decode(source);
const scene = g.scenes[g.scene || 0];
const root = g.nodes.length;
g.nodes.push({
  name: 'QBU10_ProjectRoot', children: scene.nodes,
  translation: translation.toArray(), rotation: rotation.toArray(), scale: [scale, scale, scale],
});
scene.nodes = [root];
g.asset.extras = {
  ...g.asset.extras,
  project_asset_id: 'qbu10', role: 'rifle', full_length_m: targetLengthM,
  dimension_source: 'User-specified total gun length: 1150 mm.',
  axes: 'Y up, -Z muzzle forward; bounding-box-centered origin, same convention as QBU85.',
  anchors, directions,
};
fs.writeFileSync(output, encode(g, bin));
const normalized = await read(output);
normalized.scene.updateMatrixWorld(true);
const finalBounds = new THREE.Box3().setFromObject(normalized.scene);
const finalSize = finalBounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(finalSize.z - targetLengthM) < 1e-8, 'QBU-10 full length');
assert.ok(decode(output).bin.equals(bin), 'Original geometry, material images and other binary data must remain unchanged');
const report = {
  source, output, uploaded_filename: 'QBU-10.glb',
  source_sha256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  output_sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
  source_bytes: fs.statSync(source).size, output_bytes: fs.statSync(output).size,
  dimensions_policy: g.asset.extras.dimension_source,
  target_full_length_mm: targetLengthM * 1000,
  source_bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  source_origin: origin.toArray(), scale, rotation: rotation.toArray(), translation: translation.toArray(),
  normalized_bounds: { min: finalBounds.min.toArray(), max: finalBounds.max.toArray(), size: finalSize.toArray() },
  source_anchors: sourceAnchors, anchors, directions,
  mesh_count: g.meshes.length, material_count: g.materials?.length || 0,
  image_count: g.images?.length || 0, source_animations: g.animations?.map(a => a.name) || [],
  preserved_binary: true,
  anchor_evidence: 'Blender orthographic side/top inspection; stock, right palm and left palm locations intersect original surface triangles.',
  left_support_kind: 'underside of rear handguard, immediately ahead of magazine; measured surface and standing rifle reach validated',
  limitations: ['Open bipod retained exactly as uploaded; shoulder and arm placement are handled by the character attachment layer.'],
};
fs.writeFileSync(output.replace('.glb', '_report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('QBU10_R44_PREPARED', JSON.stringify({ size: finalSize.toArray(), anchors, directions }));
