# Linxu motion assets

`character.glb` is an exact copy of the user's `Linxu_assembled_animated.glb`. Its mesh, 312-joint skeleton, skin weights, materials, and textures are unchanged. The viewer must select clips from `motions.glb`; animations embedded in the original character are not the final library.

The final library contains 33 usable clips plus `Run_Before` and `RifleRun_Before` for inspection. `Idle` and `Walk` come from the current resistance R47 military motions, including the existing open-shoulder and arm-clearance adjustments, and are retargeted to Linxu's proportions. A smooth Walk root-height adjustment fits Linxu's own shoe soles to the floor. The uploaded Idle and Walk are not used.

`Run` uses the uploaded run timing with a collar correction. The other clips use the resistance motion library, retargeted with complete anatomical frames and preserved Linxu bone lengths. `Talking` is the conversational hand gesture. `HeadStress` is a head-turn/check motion in both the resistance library and the upload; it is **not** a hands-on-head pose. `FaceTest` is excluded. No new facial expressions were created.

## Running shoulders

Only the two shoulder rotation tracks change in `Run` and `RifleRun`; every other track, including stride, upper-arm, forearm, and hand keys, retains its input values. The shoulder correction restores the collar's natural height relative to the animated torso while retaining a small dynamic envelope and the source horizontal direction. This avoids treating world height as shoulder elevation when the torso leans. The original durations and uncorrected comparison clips are retained.

Measurements below are in the uploaded model's native coordinates, before the viewer's display scale. Height is the arm/shoulder joint relative to Spine2, projected onto the animated torso-up direction. Samples cover the full cycles at 60 Hz.

| Motion | Side | Minimum before | Minimum after | Correction angle range |
| --- | --- | ---: | ---: | ---: |
| Run | Left | 10.1 mm | 44.9 mm | 11.1–30.4° |
| Run | Right | 18.3 mm | 43.4 mm | 4.7–20.7° |
| RifleRun | Left | 32.5 mm | 46.5 mm | 2.8–11.2° |
| RifleRun | Right | 63.6 mm | 52.6 mm | 8.2–13.2° |

The bind-pose reference is approximately 48.5 mm. RifleRun's right shoulder was high rather than low; the correction brings both sides toward the natural collar line. `shoulder_validation.json` contains every sample.

## Reproduce

Run from the repository root with its Node dependencies and Blender installed:

```sh
node tools/gltf/retarget_linxu_base.mjs
node tools/gltf/finalize_linxu_motions.mjs
node tools/qa/validate_linxu_motion_assets.mjs
blender --background --python tools/blender/preview_linxu_running.py
```

The base retarget script also produces `retarget_calibration.json` for the five weapons' hand adaptation. `motions_base.glb` is an intermediate, not the final library. `hand_surface_calibration.json` belongs to the separate viewer/weapon adaptation work.

Validation samples nine phases of each of the 35 clips for finite skeleton transforms, bone-length preservation, and model floor bounds. Seated/climbing actions and comparison clips are excluded from the floor pass/fail rule. It also verifies exact original character bytes, absence of FaceTest, running-track preservation, and original Run_Before identity. These structural checks are supplemented by rendered shoulder comparisons and the viewer's weapon checks; they are not an exhaustive mesh-collision proof.

The Blender command imports the assembled final animation pack and renders `Run_Before.png`, `Run.png`, `RifleRun_Before.png`, and `RifleRun.png` under `work/linxu-motion/`. The reviewed renders use the same mid-cycle phase and camera. `motion_report.json` records final asset hashes and summary results; `asset_validation.json` contains detailed clip results.
