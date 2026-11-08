# Resistance character assets (R45)

Two uploaded characters, retained at their authored 1 m height. The web preview uses 1.75 m height. All body and finger bones retain their original `mixamorig:*` names; the vest's extra `neutral_bone` stays in its original pose and has no skinned vertices after repair.

Each character directory contains:

- `source.glb`: byte-identical uploaded model; no animations.
- `character.glb`: same geometry, materials, and rest rig, with preview metadata. The vest repairs one unbound seam vertex (939) by copying the weights of its exactly coincident twin (935).
- `motions.glb`: 33 animations on the target rig (animation-only GLB).
- `retarget_calibration.json`: source and target rest transforms, palm anchors, and attachment-coordinate conversion quaternions.

The library contains 12 unequipped actions (`Idle`, `Walk`, `Run`, `Talking`, `HeadStress`, `Dying`, `FlyingBackDeath`, `SittingTalking`, `SittingCrossLegged`, `ClimbingLadder`, `HangToCrouch`, `WalkingBackwards`), six rifle actions, the 13 existing shotgun source actions, and the derived `Type97Fire` / `Type97Pump` actions. It deliberately excludes pistol actions. The two Type97 composites are created from the original source rig before retargeting.

Retargeting uses animated world rotation deltas, calibrates bone segment and palm directions, preserves target bone lengths and original hand scales, and scales pelvis travel by leg-length ratio. Standing and death actions have sampled skinned-mesh ground correction. Climbing, hanging and seated actions keep their original trajectory/height. Ground correction is not applied to those four action families.

To reproduce, run from the repository root:

```sh
node tools/gltf/retarget_resistance_r45.mjs
node tools/qa/validate_resistance_assets_r45.mjs
node tools/qa/validate_resistance_skinning_r45.mjs
blender -b -t 4 --python tools/blender/preview_resistance_r45.py
```

The first script can accept two alternate source GLB paths as arguments. It defaults to the retained originals. The QA script creates full animated GLBs under the ignored `work/resistance-r45` directory for Blender import checks; the delivered website should load `character.glb` and `motions.glb` separately.

`report.json` records provenance, bounds, action counts and floor lift. `validation.json` records clip binding and deformed-mesh tests over 505 sampled poses per character. `skinning-validation.json` checks all 33 actions at 61 times each: repaired seam vertices remain exactly coincident, neighboring edges do not stretch, and no vertices remain attached to `neutral_bone`. `blender-validation.json` records Blender import and six rendered representative poses. Weapon grip/contact QA belongs to the website integration, which applies the new per-character attachment calibration.
