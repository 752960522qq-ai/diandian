# Empty-handed shoulder refinement

The v3 shoulder pass starts from `../linxu_motion_v2/motions.glb` and changes only the Left/Right Shoulder and upper Arm rotation channels in Idle, Walk and Run. The original `../linxu_motion/character.glb` is used without modification. There is no mesh widening, scale, bone-length, skin-weight, root, facial, lower-body or timing change.

The clavicles are raised in each sampled animated torso frame and opened slightly. The upper arms are counter-rotated to preserve their original world orientations, retaining the uploaded gait, elbow articulation and wrist/finger motion. The existing v2 trouser-clearance corrections remain in place.

| Clip | Elevation | Opening | Mean shoulder span before → after | Mean clavicle slope before → after |
| --- | ---: | ---: | ---: | ---: |
| Idle | 8° | 4° | 161.52 → 166.82 mm | −2.20° → +4.34° |
| Walk | 8° | 4° | 156.50 → 168.67 mm | −25.29° → −18.30° |
| Run | 6° | 2° | 174.39 → 178.89 mm | −12.64° → −7.08° |

Measurements are in native model coordinates. Shoulder span means the projected distance between upper-arm joint origins, not a changed mesh or bind-pose width. The walking shoulder line retains source motion rather than being forced horizontal. Run receives a smaller adjustment to retain its forward-moving pose. Upper-arm world orientation error at authored keys is below 0.000024°.

`shoulder_report.json` records original/final slope and span ranges and the exact edited tracks. `shoulder_quality_report.json` samples deformed hand and forearm vertices against trousers at 60 Hz, checks exact loop endpoints, finite matrices, root/translation preservation and the unchanged character hash. This lateral ray test is sampled QA, not an exhaustive proof for all triangles and times.

Reproduce from the repository root:

```sh
node tools/gltf/refine_linxu_shoulders_v3.mjs
node tools/qa/validate_linxu_shoulders_v3.mjs
blender --background --threads 2 --python tools/blender/preview_linxu_shoulders_v3.py -- before
blender --background --threads 2 --python tools/blender/preview_linxu_shoulders_v3.py
```

The Blender script renders actual exported clips, at 0%, 25%, 50% and 75%, using the same camera for both versions. Images are written to `work/linxu-motion-v3/{before,final}-{Idle,Walk,Run}-{00,25,50,75}.png`.

This shoulder-only authoring step must run before any subsequent armed-animation bake. The retained clips are byte-for-byte equivalent at the animation key-value level at the end of this pass; any later weapon edits have their own validation.

Final 60 Hz surface sampling passed with minimum forearm/hand clearances (left/right): Idle 17.24/10.39 mm, Walk 4.27/20.05 mm, Run 4.68/9.60 mm. Tested phase counts are 322, 71 and 39. All three clips have identical loop endpoints, finite transforms and no non-root translation drift.
