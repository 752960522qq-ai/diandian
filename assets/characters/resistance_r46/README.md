# Resistance character animation correction (R46)

The two R45 characters are retained, including the repaired vest seam skin weights. Model geometry, textures, bone lengths, original bone scales, and rest rig are unchanged. Original models remain in `assets/characters/resistance_r45/*/source.glb`.

`Idle` and `Walk` come directly from the user's new `male_Idle.fbx` and `male Walking.fbx`. Byte-identical uploads are archived under `assets/animations/resistance_r46/sources/`; `provenance.json` records their SHA256, bone counts, duration and sampling interval. Blender imports the FBX files and samples world transforms before retargeting. Walking is displayed in place by removing only linear horizontal root travel. Idle adds 3 degrees of upper-arm clearance to account for the target clothing thickness.

The R45 direction-only correction determined bone swing but left roll dependent on unrelated source/target rest rotations. Independently aligning short spine/clavicle segments also copied the source character's neutral posture into bodies with different proportions. R46 uses a full frame made from segment direction and an anatomical forward/up/palm reference. Torso, clavicle, neck and head use the common body frame, retaining the target's neutral rest shape while transferring motion. Finger frames use the palm normal. Target lengths, local scale and skin bind matrices stay intact. The other 31 clips retain their names, duration and source performances, including both Type97 composites. Aimed rifle/shotgun motions apply smooth head/neck limits to remove the inherited extreme head dip and sideways tilt: neck pitch/yaw/roll limits are 15/30/6 degrees and head limits are 10/25/8 degrees. These corrections affect only neck/head rotation tracks; body, arm and hand tracks remain unchanged.

Each character directory provides `character.glb`, `motions.glb` (33 clips), and `retarget_calibration.json`. The calibration file retains `bones[name].source_to_target_local_rotation` and `palms[side].target_local_center` for weapon adaptation. `anatomical_frame_calibration_quaternion` replaces R45's single-direction calibration field. This mapping refers to the legacy source rig used by rifle/shotgun motions; the uploaded Idle/Walk are already baked onto the target rig.

Reproduction from the repository root:

```sh
blender -b -t 2 --python tools/blender/sample_resistance_male_r46.py
node tools/gltf/retarget_resistance_r46.mjs
node tools/qa/validate_resistance_assets_r46.mjs
node tools/qa/validate_resistance_skinning_r46.mjs
node tools/qa/validate_resistance_uploaded_r46.mjs
node tools/qa/validate_resistance_head_r46.mjs
blender -b -t 4 --python tools/blender/preview_resistance_r46.py
blender -b -t 4 --python tools/blender/preview_resistance_r46.py -- --vest
```

Preview options `--extras` and `--deaths` inspect other basic and death poses. Images are written to ignored `work/resistance-r46/`; the front row is R45 and rear row is R46, with actions ordered as recorded in the preview script. These are visual checks of representative poses; website weapon contact is validated separately by the integration task.

Validation reports cover clip/track binding, deformed-mesh ground clearance, fixed bone lengths, the previously repaired vest seam across all 33 motions, uploaded-source provenance, and loop continuity. No original R45 files are overwritten.
