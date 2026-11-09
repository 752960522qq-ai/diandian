# V4 neck proportion refinement

The original `../linxu_motion/character.glb` and V3 `motions.glb` stay untouched. The new local `character.glb` is the authoritative character for subsequent equipped-animation bakes and the web export.

The Neck-to-Head offset is shortened by 18%, from 53.105 mm to 43.546 mm in native coordinates. This is a 16.52 mm segment reduction at the original website preview scale. Only the Head local translation changes. Neck, clavicles, spine, arms, lower body and all facial-bone local transforms are unchanged.

The head, face and hair vertices are translated rigidly, not scaled. A smooth cubic transition over native y=0.835–0.875 m shortens the neck surface; everything below that interval is untouched. The transition also updates its surface normals using the inverse-transpose deformation Jacobian. Head-descendant inverse bind matrices receive the matching translation. Skin indices, weights, topology, UVs, textures, materials and morph targets are preserved. The original model has a separate head mesh and neck bridge; this edit preserves those authored structures rather than remeshing them.

`preview_normalization` records the original scale, center and floor. The browser rig respects it, preventing automatic height normalization from enlarging the torso after the neck edit. The original V3 base motion pack and its shoulder animation channels remain unchanged. Equipped poses have separate grip/upper-body corrections, documented in the V4 verification report; this statement does not mean their final shoulder rotations are identical to V3.

## Reproduction order

1. `node tools/gltf/shorten_linxu_neck_v4.mjs`
2. `python tools/gltf/build_linxu_browser_character.py`
3. Rebuild equipped actions using this directory's character, not the original upload. Any baked Head translation must use the shortened offset. A stale equipped pack silently restores the old neck length.
4. `node tools/qa/validate_linxu_neck_v4.mjs`
5. `blender --background --threads 2 --python tools/blender/preview_linxu_neck_v4.py -- before`
6. Repeat step 5 with `-- after`.

The renderer merges the real exported character with unchanged curated clips. It renders Idle, Walk, Run and HeadStress at 25% phase in front, three-quarter and side views, using identical cameras. Outputs are in `work/linxu-neck-v4`. Review composites are in `web/motion-labs/verification_linxu_v4/neck`.

The validator checks every curated and equipped action at 13 phases, rejects stale head/neck translation tracks, verifies zero change in non-head bone world matrices and sampled below-neck vertices, and checks face/hair vertices relative to the Head bone. This is sampled numerical and visual QA, not an exhaustive continuous collision guarantee.
