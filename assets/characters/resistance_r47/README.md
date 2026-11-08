# R47: open unequipped shoulders and arms

R47 starts from the final R46 characters and animation libraries. Only the four shoulder/upper-arm quaternion channels in `Idle` and `Walk` change. All other 31 clips, key times, translations, scales, character binaries, and attachment calibration files remain identical to R46.

The animated torso supplies the opening axes. Both clavicles turn backward by 3 degrees around the torso's up axis, without elevating the shoulders. Upper arms abduct an additional 6 degrees in Idle and 8 degrees in Walk; the original male FBX elbow, wrist, finger motion and swing timing are retained. Idle already contained the 3-degree clothing allowance added in R46.

The Node tools use the existing Three.js 0.180 environment and `three-mesh-bvh` 0.9.18. Reproduce from the repository root:

```sh
node tools/gltf/open_resistance_arms_r47.mjs
node tools/qa/validate_resistance_changes_r47.mjs
node tools/qa/validate_resistance_assets_r47.mjs
node tools/qa/validate_resistance_clearance_r47.mjs
node tools/qa/validate_resistance_skinning_r47.mjs
blender -b -t 4 --python tools/blender/preview_resistance_r47.py
blender -b -t 4 --python tools/blender/preview_resistance_r47.py -- --vest
```

The clearance check uses `three-mesh-bvh`, with exact nearest triangle pairs (including edge-to-edge cases) on deformed skin geometry at 60 Hz. It measures left and right hand/finger surfaces against trouser surfaces. Surface regions are selected by their existing hand and lower-body skin influence groups; it does not substitute bone axes or contact anchors for the mesh. The report contains triangle counts, per-frame distances, worst times, preview-scale distances, and intersecting-frame counts for both R46 and R47. The minimum required R47 gap is 12 mm in native units, approximately 21 mm at the website's 1.75 m character height.

`change-validation.json` proves the narrow animation edit. `surface-clearance-validation.json` records the actual surface test, `validation.json` checks bindings and ground clearance, and `skinning-validation.json` protects the repaired vest seam. Blender comparisons are in `work/resistance-r47/*-comparison.png`: front row R46, rear row R47, Idle on the left and Walk on the right. No R46 files are overwritten.

Final minimum distances between the actual hand/finger and trouser surfaces:

| Character | Motion | Left, native mm | Right, native mm | Left / right at 1.75 m preview |
| --- | --- | ---: | ---: | --- |
| military | Idle | 22.43 | 13.32 | 39.25 / 23.30 mm |
| military | Walk | 33.59 | 49.20 | 58.79 / 86.11 mm |
| vest | Idle | 33.88 | 18.45 | 59.29 / 32.28 mm |
| vest | Walk | 37.07 | 54.28 | 64.88 / 94.99 mm |

All 1,128 R47 surface samples have zero intersections. The corresponding R46 baseline has hand/trouser intersections in Idle and several left-hand intersections in Walk.
