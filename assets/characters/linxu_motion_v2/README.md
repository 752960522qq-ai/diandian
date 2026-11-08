# Linxu: uploaded Idle, Walk and Run replacements

This version replaces only three clips in the previous Linxu motion pack. It uses the existing `../linxu_motion/character.glb` unchanged; no mesh, skeleton, skin weight, material, texture or weapon calibration is modified. The FBX meshes are not imported into the delivered character.

| Final clip | Uploaded FBX | Source frames at 30 fps | Duration | Source horizontal travel |
| --- | --- | ---: | ---: | ---: |
| Idle | Orc Idle.fbx | 1–161 | 5.3333 s | effectively zero |
| Walk | Standard Walk.fbx | 1–36 | 1.1667 s | 1.824736 m forward |
| Run | Running.fbx | 1–20 | 0.6333 s | 3.748498 m forward |

All three uploads have 65 Mixamo body bones. Blender samples them at 60 Hz, including intermediate FBX poses. Complete anatomical frames map them to Linxu's 65 body bones within the unchanged 312-joint character. Original target bone lengths and local scales are retained; facial bones are untouched.

Walk and Run are made stationary by subtracting their linear net horizontal travel. Vertical bounce and horizontal motion within each stride remain. The source-to-target leg-length ratio is 0.48956887; the removed net forward travel in Linxu's native model coordinates is 0.893334 m for Walk and 1.835148 m for Run. Timing, forward lean, shoulder motion and the character of Orc Idle remain from the new uploads.

## Observed corrections

Initial surface inspection found fingers entering the trouser mesh by approximately 12–20 mm in native model coordinates. The final clips use small outward upper-arm rotations: 5° on each arm in Idle and Walk, and 3.5° on the left arm in Run. Run's right arm does not need correction. Elbow, wrist and finger articulation remains from the uploads. The new Run has a natural shoulder line, so the previous Run's shoulder-lifting procedure is not applied.

Only positive Hips lift fits the shoe soles to the ground. The maximum native lift is 4.80 mm for Idle, 17.62 mm for Walk and 18.36 mm for Run. A circular neighboring-frame envelope keeps the correction continuous across the loop. Airborne running phases remain airborne. Near-identical source endpoints (at most 0.0098° rotational discrepancy and under 1 micrometre root discrepancy) are snapped exactly to the first frame; no phase or duration is removed.

## Validation

`quality_report.json` checks the three replacements at 60 Hz and samples up to 192 vertices per hand against the corresponding animated trouser/leg surface. It also checks finite transforms, bone-length preservation, exact loop endpoints, original model hash, and every old clip's key times and values.

| Clip | Minimum left hand clearance | Minimum right hand clearance | Lowest sampled model point |
| --- | ---: | ---: | ---: |
| Idle | 13.55 mm | 6.28 mm | +1.58 mm |
| Walk | 8.98 mm | 18.87 mm | +1.50 mm |
| Run | 2.62 mm | 3.55 mm | +1.50 mm |

These measurements use native model coordinates before display scaling. Surface sampling and rendered review are quality checks, not an exhaustive proof for every mesh triangle at every time.

The pack has **34 clips**: 33 playable motions and the unchanged `RifleRun_Before` comparison. The old `Run_Before` is removed because it referred to the superseded upload. Exactly 31 retained clips are identical to v1, including all weapon and other base motions. No FaceTest or new facial expression is added.

## Reproduce

From the repository root, with Blender, Node and the repository's dependencies:

```sh
blender --background --threads 2 --python tools/blender/sample_linxu_fbx_v2.py
node tools/gltf/retarget_linxu_fbx_v2.mjs
node tools/qa/validate_linxu_fbx_v2.mjs
blender --background --threads 2 --python tools/blender/preview_linxu_fbx_v2.py
```

The source files and their hashes are recorded in `provenance.json`. `retarget_report.json` contains scale, travel, endpoint and correction details. `manifest.json` identifies the final assets and validation results.

Blender review images are `work/linxu-motion-v2/final-{Idle,Walk,Run}-{00,25,50,75}.png`. Each uses the same camera and four phases of the cycle. The retarget script also writes an uncorrected diagnostic pack to `work/linxu-motion-v2/motions-raw.glb`; the validator assembles both variants with the unchanged character. To render the diagnostic pack, add `-- raw` to the Blender preview command.
